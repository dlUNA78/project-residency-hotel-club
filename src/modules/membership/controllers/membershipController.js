import { MembershipModel } from "../models/membershipModel.js";

// Controlador para renderizar la vista principal
export const renderMembershipHome = (req, res) => {
  const userRole = req.session.user?.role || "Recepcionista";
  const isAdmin = userRole === "Administrador";

  res.render("membershipHome", {
    title: "Área de Membresías",
    isAdmin,
    userRole,
  });
};

// Controlador para renderizar la vista de listar membresías
export const renderMembershipList = (req, res) => {
  const userRole = req.session.user?.role || "Recepcionista";
  const isAdmin = userRole === "Administrador";

  res.render("membershipList", {
    title: "Lista de Membresías",
    isAdmin,
    userRole,
    apiBase: "/memberships",
    apiIntegrantes: "/memberships/:id_activa/integrantes",
  });
};

//Controlador para renderizar la vista de crear membresía
export const renderMembershipCreate = async (req, res) => {
  try {
    const userRole = req.session.user?.role || "Recepcionista";
    const isAdmin = userRole === "Administrador";

    // Obtener los datos necesarios
    const membershipTypes = await MembershipModel.getMembershipTypes();
    const paymentMethods = await MembershipModel.getPaymentMethods();

    res.render("membershipCreate", {
      title: "Crear Membresía",
      isAdmin,
      userRole,
      membershipTypes,
      paymentMethods,
    });
  } catch (error) {
    console.error("Error al cargar la página de creación de membresía:", error);
    res.status(500).send("Error al cargar la página");
  }
};

export const renderRenewMembership = async (req, res) => {
  try {
    const userRole = req.session.user?.role || "Recepcionista";
    const isAdmin = userRole === "Administrador";
    const { id } = req.params;

    // Obtener los datos de la membresía
    const membresia = await MembershipModel.getMembresiaById(id);
    if (!membresia) {
      return res.status(404).send("Membresía no encontrada");
    }

    // Obtener los tipos de membresía para el select
    const membershipTypes = await MembershipModel.getMembershipTypes();
    const paymentMethods = await MembershipModel.getPaymentMethods();


    res.render("renewalMembership", {
      title: "Renovar Membresía",
      isAdmin,
      userRole,
      membership: membresia,
      membershipTypes,
      paymentMethods,
      helpers: {
        formatDate: (date) => {
          if (!date) return '';
          const d = new Date(date);
          return d.toISOString().split('T')[0];
        },
        eq: (a, b) => a === b,
        now: () => new Date(),
        json: (context) => JSON.stringify(context),
      }
    });
  } catch (error) {
    console.error("Error al cargar la página de renovación de membresía:", error);
    res.status(500).send("Error al cargar la página");
  }
}

export const renderEditMembership = async (req, res) => {
  try {
    const userRole = req.session.user?.role || "Recepcionista";
    const isAdmin = userRole === "Administrador";
    const { id } = req.params;

    // Obtener los datos de la membresía
    const membresia = await MembershipModel.getMembresiaById(id);
    if (!membresia) {
      return res.status(404).send("Membresía no encontrada");
    }

    // Obtener los tipos de membresía para el select
    const membershipTypes = await MembershipModel.getMembershipTypes();

    res.render("editMembership", {
      title: "Editar Membresía",
      isAdmin,
      userRole,
      membership: membresia,
      membershipTypes,
      helpers: {
        formatDate: (date) => {
          if (!date) return '';
          const d = new Date(date);
          return d.toISOString().split('T')[0];
        },
        eq: (a, b) => a === b
      }
    });
  } catch (error) {
    console.error("Error al cargar la página de edición de membresía:", error);
    res.status(500).send("Error al cargar la página");
  }
};


