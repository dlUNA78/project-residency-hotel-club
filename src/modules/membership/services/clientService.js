// services/clientService.js
import { MembershipModel } from "../models/modelMembership.js";

export const ClientService = {
  async createClient(clientData) {
    const { nombre_completo, correo, telefono } = clientData;

    const result = await MembershipModel.createClient({
      nombre_completo,
      correo,
      telefono,
    });

    const id_cliente = result.id_cliente || result.insertId;
    if (!id_cliente) throw new Error("No se pudo obtener el ID del cliente");

    return { id_cliente };
  }
};