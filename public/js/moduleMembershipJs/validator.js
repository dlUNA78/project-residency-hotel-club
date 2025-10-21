/**
 * Módulo Validator que encapsula la lógica de validación de formularios.
 * Está diseñado para ser reutilizable en cualquier formulario de la aplicación.
 * Sigue un patrón de módulo simple.
 */
const Validator = {
    rules: {
        nombre_completo: {
            regex: /^[A-Za-záéíóúÁÉÍÓÚñÑ\s]*$/,
            filter: /[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g,
            message: 'El nombre solo debe contener letras y espacios.'
        },
        'integrantes[]': {
            regex: /^[A-Za-záéíóúÁÉÍÓÚñÑ\s]*$/,
            filter: /[^A-Za-záéíóúÁÉÍÓÚñÑ\s]/g,
            message: 'El nombre del integrante solo debe contener letras y espacios.'
        },
        telefono: {
            regex: /^\d{0,10}$/,
            filter: /[^0-9]/g,
            maxLength: 10,
            message: 'El teléfono debe contener 10 dígitos.'
        },
        correo: {
            regex: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
            message: 'Por favor, introduce un correo electrónico válido.'
        },
        fecha_inicio: {
            validator: (value) => value !== '',
            message: 'La fecha de inicio es obligatoria.'
        },
        metodo_pago: {
            validator: (value) => value !== '',
            message: 'Debes seleccionar un método de pago.'
        },
        id_tipo_membresia: { // Actualizado para coincidir con el 'name' del select
            validator: (value) => value !== '',
            message: 'Debes seleccionar un tipo de membresía.'
        }
    },

    /**
     * Valida todos los campos de un formulario basándose en el objeto `rules`.
     * Muestra u oculta mensajes de error directamente en el DOM.
     * @param {HTMLFormElement} form - El formulario a validar.
     * @returns {boolean} - True si el formulario es válido, de lo contrario false.
     */
    validateForm: function (form) {
        let isFormValid = true;
        
        // 1. Limpieza: Antes de validar, oculta todos los mensajes de error existentes
        // y elimina los estilos de borde rojo para empezar desde un estado limpio.
        form.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));
        form.querySelectorAll('input, select').forEach(el => el.classList.remove('border-red-500'));

        for (const fieldName in this.rules) {
            // Buscamos por 'name' en lugar de id
            const input = form.querySelector(`[name="${fieldName}"]`);
            if (!input) continue;

            const rule = this.rules[fieldName];
            const value = input.value.trim();
            let isFieldValid = false;

            // 3. Aplicación de la regla: Determina si la regla es una expresión regular (regex)
            // o una función de validación personalizada y la ejecuta.
            if (rule.regex) {
                isFieldValid = rule.regex.test(value);
            } else if (rule.validator) {
                isFieldValid = rule.validator(value);
            }
            
            // 4. Manejo de errores: Si el campo no es válido, busca el elemento de error
            // asociado (que se asume es el siguiente hermano del input), le pone el mensaje
            // de la regla, lo hace visible y añade un borde rojo al input.
            // También marca el formulario como inválido.
            if (!isFieldValid) {
                const errorContainer = input.nextElementSibling;
                if (errorContainer && errorContainer.classList.contains('error-message')) {
                    errorContainer.textContent = rule.message;
                    errorContainer.classList.remove('hidden');
                    input.classList.add('border-red-500');
                }
                isFormValid = false;
            }
        }
        // 5. Retorno: Devuelve el estado final de la validación del formulario.
        return isFormValid;
    },

    /**
     * Inicializa la validación en tiempo real para un formulario.
     * Añade listeners a los eventos 'input' de los campos con reglas definidas.
     * @param {HTMLFormElement} form - El formulario para el cual activar la validación en tiempo real.
     */
    initRealTimeValidation: function(form) {
        for (const fieldName in this.rules) {
            const inputs = form.querySelectorAll(`[name="${fieldName}"]`);
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    this.validateField(input, this.rules[fieldName]);
                });
            });
        }
    },

    /**
     * Valida un campo individual y muestra u oculta el mensaje de error.
     * @param {HTMLElement} input - El campo del formulario a validar.
     * @param {object} rule - La regla de validación a aplicar.
     */
    validateField: function(input, rule) {
        let value = input.value;
        let isFieldValid = true;

        // Filtrado en tiempo real
        if (rule.filter) {
            const originalValue = value;
            value = value.replace(rule.filter, '');
            if (originalValue !== value) {
                input.value = value;
            }
        }

        // Limitar longitud
        if (rule.maxLength && value.length > rule.maxLength) {
            value = value.slice(0, rule.maxLength);
            input.value = value;
        }

        // Validación de formato
        if (rule.regex) {
            isFieldValid = rule.regex.test(value) || value === '';
        } else if (rule.validator) {
            isFieldValid = rule.validator(value);
        }

        const errorContainer = input.nextElementSibling;
        if (errorContainer && errorContainer.classList.contains('error-message')) {
            if (!isFieldValid) {
                errorContainer.textContent = rule.message;
                errorContainer.classList.remove('hidden');
                input.classList.add('border-red-500');
            } else {
                errorContainer.classList.add('hidden');
                input.classList.remove('border-red-500');
            }
        }
    }
};