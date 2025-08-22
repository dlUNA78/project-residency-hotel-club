import { MembershipModel } from '../models/modelMembership.js';
// Controlador para la vista principal
export const renderMembershipHome = (req, res) => {
    const userRole = req.session.user?.role || 'Recepcionista';
    const isAdmin = userRole === 'Administrador'; 
  
    res.render('membershipHome', {
      title: 'Área de Membresías',
      isAdmin,
      userRole,
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
      userRole,
      tiposMembresia,
      precioFamiliar
    });
  };

  //Controladores para enviar datos para CRUD de membresía
export const MembershipController = {
  // Listar membresías
  async list(req, res) {
    try {
      const memberships = await MembershipModel.getAll();
      res.render('membership/list', { memberships });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error al obtener las membresías");
    }
  },

  // Creacion de membresias y de clientes

  //Primero se creara el cliente
  async createClient(req, res) {
    try {
      const { name, phone, email } = req.body;
      const client = await MembershipModel.createClient({ name, phone, email });
      res.json(client);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al crear el cliente" });
    }
  },

  //Segundo se creara la membresia
  async createMembership(req, res) {
    try {
      const { id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, precio_final } = req.body;
      const membership = await MembershipModel.create({ id_cliente, id_tipo_membresia, fecha_inicio, fecha_fin, precio_final });
      res.json(membership);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error al crear la membresía" });
    }
  },
  //Renderizar los tipos de membresia
  async renderCreate(req, res) {
    try {
      const tiposMembresia = await MembershipModel.getTiposMembresia();
      const precioFamiliar = await MembershipModel.getPrecioFamiliar();
      res.render("membershipCreate", { tiposMembresia, precioFamiliar });
    } catch (error) {
      console.error("Error al cargar tipos de membresía:", error);
      res.status(500).send("Error al cargar tipos de membresía");
    }
  }

  // 

 



};


 

  
  
  
  



