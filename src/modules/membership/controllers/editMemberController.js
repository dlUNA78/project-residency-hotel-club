import { MembershipModel } from "../models/membershipModel.js";
import { updateMembershipById } from "../models/modelEdit.js";

export const editMemberController = {
  // Editar membresia - GET
  async editMembership(req, res) {
    try {
      const { id } = req.params;
      const membresia = await MembershipModel.getMembresiaById(id);
      if (!membresia)
        return res.status(404).json({ error: "Membresía no encontrada" });
      
      res.render('editMembership', { membership: membresia });
    } catch (err) {
      console.error("Error obteniendo membresía:", err);
      res.status(500).json({ error: "Error del servidor" });
    }
  },

  // Actualizar membresia - POST
  async updateMembership(req, res) {
    try {
      const { id } = req.params;
      const {
        nombre_completo,
        telefono,
        correo,
        estado,
        fecha_inicio,
        fecha_fin,
        precio_final,
        integrantes
      } = req.body;

      // Obtener información completa de la membresía para saber el tipo
      const membresia = await MembershipModel.getMembresiaById(id);
      if (!membresia) {
        return res.redirect("/memberships?error=Membresía no encontrada");
      }

      const tipo = membresia.tipo || 'Individual';

      // Datos para actualizar (campos de cliente y membresía)
      const membershipData = {
        nombre_completo,
        telefono,
        correo,
        estado,
        fecha_inicio,
        fecha_fin,
        precio_final: parseFloat(precio_final)
      };

      // Datos completos para el modelo
      const updateData = {
        membershipData,
        tipo: tipo,
        integrantes: integrantes || []
      };

      const result = await updateMembershipById(id, updateData);

      res.redirect("/memberships/listMembership?success=Membresía actualizada correctamente");
      console.log(result);
    } catch (error) {
      console.error("Error updating membership:", error);
      res.redirect("/memberships/listMembership?error=Error al actualizar la membresía");
    }
  },
  async deleteMembership(req, res) {
    try {
        const { id } = req.params;
        
        // Lógica para eliminar la membresía
        const result = await MembershipModel.deleteMembershipById(id);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Membresía no encontrada' });
        }
        
        res.json({ success: true, message: 'Membresía eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting membership:', error);
        res.status(500).json({ error: 'Error al eliminar la membresía' });
    }
},

async renewMembership(req, res) {
    try {
      const { id } = req.params; // id_activa de la membresía a renovar
      const {
        id_cliente,
        nombre_completo,
        telefono,
        correo,
        id_tipo_membresia,
        fecha_inicio,
        fecha_fin,
        id_metodo_pago,
      } = req.body;

      // 1. Actualizar datos del cliente
      await MembershipModel.updateClient({
        id_cliente,
        nombre_completo,
        telefono,
        correo,
      });

      // 2. Desactivar la membresía antigua
      await MembershipModel.updateEstadoMembresia(id, 'Vencida');

      // 3. Crear el nuevo contrato de membresía
      const id_membresia = await MembershipModel.createMembershipContract({
        id_cliente,
        id_tipo_membresia,
        fecha_inicio,
        fecha_fin,
      });

      // 4. Activar la nueva membresía
      const tipoMembresia = await MembershipModel.getTipoMembresiaById(id_tipo_membresia);
      const precio_final = tipoMembresia.precio;

      const id_activa_nueva = await MembershipModel.activateMembership({
        id_cliente,
        id_membresia,
        fecha_inicio,
        fecha_fin,
        precio_final,
      });

      // 5. Registrar el pago
      await MembershipModel.recordPayment({
        id_activa: id_activa_nueva,
        id_metodo_pago,
        monto: precio_final,
      });

      res.redirect("/memberships/listMembership?success=Membresía renovada correctamente");
    } catch (error) {
      console.error("Error renewing membership:", error);
      res.redirect("/memberships/listMembership?error=Error al renovar la membresía");
    }
  }
};
