// Controlador para la vista principal
export const renderMembershipHome = (req, res) => {
    const userRole = req.session.user?.role || 'Recepcionista';
    const isAdmin = userRole === 'Administrador'; // 🚨 Debe coincidir EXACTO con lo que guarda tu sesión
  
    res.render('membershipHome', {
      title: 'Área de Membresías',
      isAdmin,
      userRole
    });
  };
  
  // Controlador para listar membresías
  export const renderMembershipList = (req, res) => {
    res.render('membershipList', {
      title: 'Lista de Membresías'
    });
  };

  //Controlador para crear membresía
  export const renderMembershipCreate = (req, res) => {
    res.render('membershipCreate', {
      title: 'Crear Membresía'
    });
  };
  
  
  
  



