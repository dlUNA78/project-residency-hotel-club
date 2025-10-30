
import Validator from './validator.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el validador para el formulario de renovación
    const renewalForm = document.getElementById('renewalForm');
    if (renewalForm) {
        const renewalValidator = new Validator({
            'fecha_inicio': {
                rules: 'required|date',
                messages: {
                    required: 'La fecha de inicio es obligatoria.'
                }
            },
            'fecha_fin': {
                rules: 'required|date',
                messages: {
                    required: 'La fecha de fin es obligatoria.'
                }
            },
            'tipo_membresia': {
                rules: 'required',
                messages: {
                    required: 'El tipo de membresía es obligatorio.'
                }
            }
        });
        renewalValidator.init(renewalForm);
    }

    // --- Lógica de filtrado de entrada en tiempo real ---

    // Función genérica para filtrar la entrada de un campo
    const setInputFilter = (textbox, inputFilter) => {
        ["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(event => {
            textbox.addEventListener(event, function() {
                if (inputFilter(this.value)) {
                    this.oldValue = this.value;
                    this.oldSelectionStart = this.selectionStart;
                    this.oldSelectionEnd = this.selectionEnd;
                } else if (this.hasOwnProperty("oldValue")) {
                    this.value = this.oldValue;
                    this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
                } else {
                    this.value = "";
                }
            });
        });
    };

    // Aplicar filtros a los campos de integrantes (si existen)
    // Esto asegura que el código no falle si los campos no están en la página.
    for (let i = 1; i <= 3; i++) {
        const nombreInput = document.getElementById(`integrante_${i}_nombre`);
        const parentescoInput = document.getElementById(`integrante_${i}_parentesco`);

        if (nombreInput) {
            // Permitir solo letras y espacios
            setInputFilter(nombreInput, (value) => /^[a-zA-Z\s]*$/.test(value));
        }
        if (parentescoInput) {
             // Permitir solo letras
            setInputFilter(parentescoInput, (value) => /^[a-zA-Z]*$/.test(value));
        }
    }

    // Lógica para mostrar/ocultar campos de integrantes
    const tipoMembresiaSelect = document.getElementById('tipo_membresia');
    const integrantesContainer = document.getElementById('integrantes_container');

    if (tipoMembresiaSelect && integrantesContainer) {
        tipoMembresiaSelect.addEventListener('change', (e) => {
            // El valor '2' corresponde al ID del tipo de membresía "Familiar"
            if (e.target.value === '2') {
                integrantesContainer.style.display = 'block';
            } else {
                integrantesContainer.style.display = 'none';
            }
        });
        // Disparar el evento al cargar para asegurar el estado inicial correcto
        tipoMembresiaSelect.dispatchEvent(new Event('change'));
    }
});

// Exponer la función de confirmación al scope global
window.confirmarRenovacion = () => {
    const form = document.getElementById('renewalForm');
    const validator = form.validator; // Acceder a la instancia del validador

    if (validator && validator.validateForm()) {
        Swal.fire({
            title: '¿Confirmar Renovación?',
            text: "Se creará un nuevo período de membresía.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, renovar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                form.submit();
            }
        });
    } else {
        Swal.fire(
            'Error de Validación',
            'Por favor, complete todos los campos requeridos correctamente.',
            'error'
        );
    }
};
