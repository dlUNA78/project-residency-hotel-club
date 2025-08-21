// membershipController.js
export function renderMembershipHome(req, res) {
    try {
        // Aquí puedes obtener datos si es necesario
        res.render('membershipHome', {
            title: 'Gestión de Membresías',
            user: req.user // Pasa información del usuario a la vista
        });
    } catch (error) {
        console.error('Error rendering membership home:', error);
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Error al cargar la página de membresías'
        });
    }
}

