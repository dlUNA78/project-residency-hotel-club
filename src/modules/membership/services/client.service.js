import { ClientModel } from "../models/client.model.js";

export class ClientService {
  /**
   * Orquesta la creación de un nuevo cliente.
   * @param {object} clientData - Datos del cliente.
   * @returns {Promise<{clientId: number}>} El ID del nuevo cliente.
   */
  static async create(clientData) {
    const { fullName, email, phone } = clientData;

    const clientId = await ClientModel.create({
      fullName,
      email,
      phone,
    });

    if (!clientId) {
      throw new Error("No se pudo obtener un ID de cliente válido.");
    }

    return { clientId };
  }
}
