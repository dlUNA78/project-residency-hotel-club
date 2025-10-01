import { modelList } from "../models/modelList.js";

const listMembershipController = {
  async renderMembershipList(req, res) {
    try {
      const userRole = req.session.user?.role || "Recepcionista";
      const isAdmin = userRole === "Administrador";

      const { filter, search, type, status } = req.query;

      let membresias = [];
      let estadisticas = {};

      estadisticas = await modelList.getEstadisticasMembresias();

      if (search) {
        membresias = await modelList.buscarMembresias(search);
      } else if (type) {
        membresias = await modelList.getMembresiasPorTipo(type);
      } else if (status) {
        membresias = await modelList.getMembresiasPorEstado(status);
      } else {
        membresias = await modelList.getMembresiasActivas();
      }

      const membresiasFormateadas = membresias.map((membresia) => {
        const diasRestantes = membresia.dias_restantes;

        let estadoReal = "Activa";
        if (diasRestantes <= 0) {
          estadoReal = "Vencida";
        } else if (diasRestantes <= 7) {
          estadoReal = "Por_Vencer";
        }

        return {
          id: membresia.id_activa,
          id_activa: membresia.id_activa,
          fullName: membresia.nombre_completo,
          phone: membresia.telefono,
          email: membresia.correo,
          type: membresia.tipo,
          startDate: membresia.fecha_inicio,
          endDate: membresia.fecha_fin,
          status: membresia.estado,
          daysUntilExpiry: diasRestantes,
          members: membresia.total_integrantes + 1,
          amount: membresia.precio_final,
          isFamily: membresia.tipo === "Familiar",
          isActive: diasRestantes > 0,
          isExpired: diasRestantes <= 0,
          statusType: estadoReal,
          integrantes: membresia.integrantes || [],
        };
      });

      console.log(membresiasFormateadas);
      res.render("membershipList", {
        title: "Lista de Membresías",
        isAdmin,
        userRole,
        memberships: membresiasFormateadas,
        estadisticas,
        currentFilter: filter || "all",
        currentSearch: search || "",
        currentType: type || "",
        currentStatus: status || "",
        helpers: {
          eq: (a, b) => a === b,
        }
      });
    } catch (error) {
      console.error("Error al renderizar lista de membresías:", error);

      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res.status(500).json({
          success: false,
          message: "Error al cargar la lista de membresías",
          error:
            process.env.NODE_ENV === "development"
              ? error.message
              : "Error interno del servidor",
        });
      }

      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 min-h-screen flex items-center justify-center">
          <div class="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
            <div class="text-center">
              <div class="bg-red-100 p-3 rounded-full inline-flex items-center justify-center mb-4">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
              </div>
              <h1 class="text-2xl font-bold text-gray-800 mb-2">Error</h1>
              <p class="text-gray-600 mb-6">Error al cargar la lista de membresías</p>
              <a href="/memberships" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                <i class="fas fa-arrow-left mr-2"></i>Volver a Membresías
              </a>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  },

  async getMembresiasAPI(req, res) {
    try {
      const { filter, search, type, status } = req.query;

      let membresias = [];

      if (search) {
        membresias = await modelList.buscarMembresias(search);
      } else if (type) {
        membresias = await modelList.getMembresiasPorTipo(type);
      } else if (status) {
        membresias = await modelList.getMembresiasPorEstado(status);
      } else {
        membresias = await modelList.getMembresiasActivas();
      }

      const membresiasFormateadas = membresias.map((membresia) => {
        const formatDate = (dateString) => {
          if (!dateString) return "";
          const date = new Date(dateString);
          return date.toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        };

        const diasRestantes = membresia.dias_restantes;
        let estadoReal = "Activa";
        if (diasRestantes <= 0) {
          estadoReal = "Vencida";
        } else if (diasRestantes <= 7) {
          estadoReal = "Por_Vencer";
        }

        return {
          id: membresia.id_activa,
          id_activa: membresia.id_activa,
          fullName: membresia.nombre_completo,
          phone: membresia.telefono,
          email: membresia.correo,
          type: membresia.tipo,
          startDate: formatDate(membresia.fecha_inicio),
          endDate: formatDate(membresia.fecha_fin),
          status: membresia.estado,
          daysUntilExpiry: diasRestantes,
          members: membresia.total_integrantes + 1,
          amount: membresia.precio_final,
          isFamily: membresia.tipo === "Familiar",
          isActive: diasRestantes > 0,
          isExpired: diasRestantes <= 0,
          statusType: estadoReal,
          integrantes: membresia.integrantes || [],
        };
      });

      res.json({
        success: true,
        data: membresiasFormateadas,
        total: membresiasFormateadas.length,
      });
    } catch (error) {
      console.error("Error en API de membresías:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener las membresías",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Error interno del servidor",
      });
    }
  },

  async getEstadisticasAPI(req, res) {
    try {
      const estadisticas = await modelList.getEstadisticasMembresias();
      res.json({
        success: true,
        data: estadisticas,
      });
    } catch (error) {
      console.error("Error en API de estadísticas:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener las estadísticas",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Error interno del servidor",
      });
    }
  },
  async getIntegrantesAPI(req, res) {
    try {
      const { id_activa } = req.params;

      if (!id_activa) {
        return res.status(400).json({
          error: "El parámetro id_activa es requerido",
        });
      }

      const integrantes = await modelList.getIntegrantesByMembresia(id_activa);
      res.json(integrantes);
    } catch (error) {
      console.error("Error al obtener integrantes:", error);
      res.status(500).json({
        error: "Error interno del servidor al obtener integrantes",
      });
    }
  },

  async getMembershipDetailsAPI(req, res) {
    try {
      const { id } = req.params;
      const userRole = req.session.user?.role || "Recepcionista";
      const isAdmin = userRole === "Administrador";

      if (!id) {
        return res.status(400).json({
          error: "El parámetro id es requerido",
        });
      }

      const details = await modelList.getMembresiaDetalles(id);

      if (!details) {
        return res.status(404).json({
          error: "Membresía no encontrada",
        });
      }

      res.json({
        ...details,
        isAdmin,
      });
    } catch (error) {
      console.error("Error al obtener los detalles de la membresía:", error);
      res.status(500).json({
        error: "Error interno del servidor al obtener los detalles de la membresía",
      });
    }
  },
};

export { listMembershipController };
