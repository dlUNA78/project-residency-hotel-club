document.addEventListener('DOMContentLoaded', function() {
    const tipoMembresiaSelect = document.getElementById('id_tipo_membresia');
    const fechaInicioInput = document.getElementById('fecha_inicio');
    const fechaFinInput = document.getElementById('fecha_fin');

    // Función para llamar a la API y actualizar la fecha de fin
    async function updateCalculatedDetails() {
        const id_tipo_membresia = tipoMembresiaSelect.value;
        const fecha_inicio = fechaInicioInput.value;

        // Solo proceder si tenemos los datos necesarios
        if (!id_tipo_membresia || !fecha_inicio) {
            return;
        }

        try {
            const resp = await fetch('/memberships/api/calculate-details', {
                method: 'POST',
                body: JSON.stringify({ id_tipo_membresia, fecha_inicio, descuento: 0 }), // El descuento no es relevante para la fecha
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            });

            const data = await resp.json();

            if (!resp.ok) {
                throw new Error(data.error || 'Error del servidor al calcular la fecha de fin.');
            }

            // Actualizar el campo de fecha de fin con la respuesta del servidor
            fechaFinInput.value = data.fecha_fin;

        } catch (err) {
            console.error('Error al calcular detalles de la membresía:', err);
            // Opcional: mostrar un mensaje de error al usuario
        }
    }

    // Añadir listeners para los eventos de cambio
    if (tipoMembresiaSelect) {
        tipoMembresiaSelect.addEventListener('change', updateCalculatedDetails);
    }
    if (fechaInicioInput) {
        fechaInicioInput.addEventListener('change', updateCalculatedDetails);
    }

    // Ejecutar el cálculo inicial al cargar la página
    updateCalculatedDetails();
});