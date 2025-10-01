# Análisis de Violaciones del Patrón MVC en el Módulo de Membresías

Este documento detalla las áreas del código en el módulo de membresías que no siguen adecuadamente el patrón de diseño Modelo-Vista-Controlador (MVC). El objetivo es identificar los puntos a refactorizar para mejorar la separación de responsabilidades, la mantenibilidad y la escalabilidad del sistema.

## 1. Controladores que Acceden Directamente al Modelo

La violación más recurrente es la comunicación directa entre los controladores y el modelo de datos, saltándose la capa de servicio. Esto acopla la lógica de la aplicación directamente a la estructura de la base de datos y duplica el código de acceso a datos.

### Archivos Afectados:
- `src/modules/membership/controllers/membershipController.js`
- `src/modules/membership/controllers/createMemberController.js`
- `src/modules/membership/controllers/listMemberController.js`

### Ejemplos Concretos:

**a) `membershipController.js`**

En las funciones que renderizan vistas, se llama directamente al `MembershipModel` para obtener datos que la vista necesita.

```javascript
// src/modules/membership/controllers/membershipController.js

// ...

export const renderMembershipCreate = async (req, res) => {
  try {
    // ...
    // VIOLACIÓN: El controlador no debería llamar al modelo directamente.
    const tiposMembresia = await MembershipModel.getTiposMembresia();
    const tiposPago = await MembershipModel.getMetodosPago();

    res.render("membershipCreate", {
      // ...
      tiposMembresia,
      tiposPago,
    });
  } catch (error) {
    // ...
  }
};

export const renderRenewMembership = async (req, res) => {
  try {
    // ...
    // VIOLACIÓN: Llamada directa al modelo.
    const membresia = await MembershipModel.getMembresiaById(id);
    // ...
  } catch (error) {
    // ...
  }
};
```

**Corrección Sugerida:** Crear métodos en `membershipService.js` que encapsulen estas llamadas y sean consumidos por el controlador.

**b) `createMemberController.js`**

Este controlador también realiza llamadas directas al modelo para obtener información o servir archivos.

```javascript
// src/modules/membership/controllers/createMemberController.js

// ...

const MembershipController = {
  // ...
  async serveQRCode(req, res) {
    try {
      const { id_activa } = req.params;
      // VIOLACIÓN: El controlador no debería interactuar con el modelo.
      const membresia = await MembershipModel.getMembresiaById(id_activa);
      // ...
    } catch (error) {
      // ...
    }
  },

  async getTipoMembresiaById(req, res) {
    try {
      // VIOLACIÓN: Llamada directa al modelo.
      const tipo = await MembershipModel.getTipoMembresiaById(id);
      // ...
    } catch (err) {
      // ...
    }
  },
};
```

**Corrección Sugerida:** La lógica para obtener datos de la membresía o su QR debería estar en `membershipService.js`.

## 2. Lógica de Negocio y de Sistema en los Controladores

Los controladores contienen lógica que no es de su competencia, como la manipulación de archivos del sistema (`fs`) o la orquestación de múltiples pasos de negocio.

### Archivos Afectados:
- `src/modules/membership/controllers/createMemberController.js`

### Ejemplo Concreto:

```javascript
// src/modules/membership/controllers/createMemberController.js

// ...
import fs from "fs";
import path from "path";

// ...

const MembershipController = {
  // ...
  async serveQRCode(req, res) {
    try {
      // ...
      // VIOLACIÓN: Lógica de manejo de archivos en el controlador.
      const qrFullPath = path.join(process.cwd(), "public", membresia.qr_path);

      if (!fs.existsSync(qrFullPath)) {
        return res.status(404).json({ error: "Archivo QR no encontrado" });
      }

      res.sendFile(qrFullPath);
    } catch (error) {
      // ...
    }
  },
};
```

**Corrección Sugerida:** Esta lógica debería abstraerse en un `fileService` o una utilidad específica, que a su vez sería llamada por el `membershipService`. El controlador solo debería invocar al servicio.

## 3. Lógica de Utilidad dentro de la Capa de Servicios

La capa de servicios contiene funciones que son de propósito general y no están directamente relacionadas con la lógica de negocio de las membresías.

### Archivos Afectados:
- `src/modules/membership/services/membershipService.js`

### Ejemplo Concreto:

```javascript
// src/modules/membership/services/membershipService.js

export const MembershipService = {
  // ...

  // VIOLACIÓN: Esta es una función de utilidad, no de negocio.
  convertirNumeroALetras(numero) {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    // ...
    return resultado + ' pesos';
  }
};
```

**Corrección Sugerida:** Mover la función `convertirNumeroALetras` a un archivo de utilidades, por ejemplo, `src/helpers/formatters.js`, para que pueda ser reutilizada en otras partes de la aplicación.

## 4. Desorganización en Rutas y Controladores

Las responsabilidades de un solo recurso (`membresías`) están dispersas en múltiples archivos de controladores, lo que dificulta su seguimiento y mantenimiento.

### Archivos Afectados:
- `src/modules/membership/routes/membership.Routes.js`
- `createMemberController.js`, `deleteMemberController.js`, `editMemberController.js`, `listMemberController.js`, `membershipController.js`

### Observaciones:
- Un solo flujo, como la creación de una membresía, involucra a `membershipController.js` (para renderizar la vista) y a `createMemberController.js` (para procesar el formulario).
- Las rutas mezclan la renderización de vistas con endpoints de API (`/api/qr/:id_activa`).

**Corrección Sugerida:**
1.  **Consolidar Controladores:** Unificar la lógica de los controladores de membresías en un número menor de archivos, idealmente agrupados por funcionalidad (ej. `membership.controller.js` para vistas y `membership.api.controller.js` para la API).
2.  **Separar Rutas:** Mantener una estricta separación entre las rutas que sirven vistas (`membership.routes.js`) y las que exponen una API (`membership.api.routes.js`).

## Conclusión

Para alinear el módulo de membresías con el patrón MVC, se recomienda:
1.  **Refactorizar los controladores** para que deleguen toda la lógica de negocio y acceso a datos a la capa de servicio.
2.  **Completar la capa de servicio** para que sea el único punto de contacto con los modelos de datos.
3.  **Mover la lógica de bajo nivel** (manipulación de archivos, formateo) a módulos de utilidades.
4.  **Reorganizar y consolidar** las rutas y controladores para una mayor claridad y cohesión.