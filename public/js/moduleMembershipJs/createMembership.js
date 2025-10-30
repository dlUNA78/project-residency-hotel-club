
import Validator from './validator.js';

document.addEventListener('DOMContentLoaded', () => {
    // Configuración de validación para el formulario de búsqueda de cliente
    const busquedaClienteForm = document.getElementById('busquedaClienteForm');
    const busquedaClienteValidator = new Validator({
        'cliente_id': {
            rules: 'required|numeric',
            messages: {
                required: 'El ID del cliente es obligatorio.',
                numeric: 'El ID debe ser un número.'
            }
        }
    });
    busquedaClienteValidator.init(busquedaClienteForm);

    // Configuración de validación para el formulario de creación de membresía
    const createMembershipForm = document.getElementById('createMembershipForm');
    const createMembershipValidator = new Validator({
        'tipo_membresia': {
            rules: 'required',
            messages: {
                required: 'Debe seleccionar un tipo de membresía.'
            }
        },
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
        // Validar integrantes solo si la membresía es familiar
        'integrante_1_nombre': {
            rules: 'required_if:tipo_membresia,2', // 2 es el ID para Familiar
            messages: {
                required_if: 'El nombre del integrante es obligatorio para membresías familiares.'
            }
        },
        'integrante_1_parentesco': {
            rules: 'required_if:tipo_membresia,2',
             messages: {
                required_if: 'El parentesco es obligatorio.'
            }
        },
        'integrante_2_nombre': {
            rules: 'required_if:tipo_membresia,2',
             messages: {
                required_if: 'El nombre del integrante es obligatorio para membresías familiares.'
            }
        },
        'integrante_2_parentesco': {
            rules: 'required_if:tipo_membresia,2',
             messages: {
                required_if: 'El parentesco es obligatorio.'
            }
        },
        'integrante_3_nombre': {
            rules: 'required_if:tipo_membresia,2',
             messages: {
                required_if: 'El nombre del integrante es obligatorio para membresías familiares.'
            }
        },
        'integrante_3_parentesco': {
            rules: 'required_if:tipo_membresia,2',
             messages: {
                required_if: 'El parentesco es obligatorio.'
            }
        }
    });
    createMembershipValidator.init(createMembershipForm);

    // Lógica para mostrar/ocultar campos de integrantes
    const tipoMembresiaSelect = document.getElementById('tipo_membresia');
    const integrantesContainer = document.getElementById('integrantes_container');

    tipoMembresiaSelect.addEventListener('change', (e) => {
        if (e.target.value === '2') { // ID para tipo 'Familiar'
            integrantesContainer.style.display = 'block';
        } else {
            integrantesContainer.style.display = 'none';
        }
    });

    // Disparar el evento change al cargar la página para establecer el estado inicial correcto
    tipoMembresiaSelect.dispatchEvent(new Event('change'));
});

// Exponer funciones al scope global para que los botones puedan llamarlas
window.confirmarCliente = async () => {
    const form = document.getElementById('busquedaClienteForm');
    const validator = form.validator;

    if (!validator.validateForm()) {
        Swal.fire('Error', 'Por favor, corrija los errores en el formulario.', 'error');
        return;
    }

    const clienteId = document.getElementById('cliente_id').value;

    try {
        const response = await fetch(`/membership/api/get-client/${clienteId}`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById('nombre_cliente').textContent = data.nombre_completo;
            document.getElementById('id_cliente_hidden').value = data.id_cliente;
            document.getElementById('paso1').style.display = 'none';
            document.getElementById('paso2').style.display = 'block';
        } else {
            Swal.fire('Cliente no encontrado', data.error || 'No se encontró un cliente con ese ID.', 'warning');
        }
    } catch (error) {
        console.error('Error al buscar cliente:', error);
        Swal.fire('Error de red', 'No se pudo conectar con el servidor.', 'error');
    }
};

window.confirmarMembresia = () => {
    const form = document.getElementById('createMembershipForm');
    const validator = form.validator;

    if (validator.validateForm()) {
        Swal.fire({
            title: '¿Confirmar Creación?',
            text: 'Se creará una nueva membresía para el cliente seleccionado.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, crear',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                form.submit();
            }
        });
    } else {
         Swal.fire('Error de Validación', 'Por favor, complete todos los campos requeridos correctamente.', 'error');
    }
};
