// Controlador para la vista principal
export const renderMembershipHome = (req, res) => {
    const userRole = req.session.user?.role || 'Recepcionista';
    const isAdmin = userRole === 'Administrador'; 
  
    res.render('membershipHome', {
      title: 'Área de Membresías',
      isAdmin,
      userRole
    });
  };
  
  // Controlador para listar membresías
  export const renderMembershipList = (req, res) => {
    const userRole = req.session.user?.role || 'Recepcionista';
    const isAdmin = userRole === 'Administrador'; 

    res.render('membershipList', {
      title: 'Lista de Membresías',
      isAdmin,
      userRole
    });
  };

  //Controlador para crear membresía
  export const renderMembershipCreate = (req, res) => {
    const userRole = req.session.user?.role || 'Recepcionista';
    const isAdmin = userRole === 'Administrador'; 
    res.render('membershipCreate', {
      title: 'Crear Membresía',
      isAdmin,
      userRole
    });
  };
  
  
  
  



