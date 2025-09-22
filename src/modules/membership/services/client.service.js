import { ClientModel } from "../models/client.model.js";

export class ClientService {
  /**
   * Creates a new client.
   * @param {object} clientData - The data for the new client.
   * @param {string} clientData.fullName - The client's full name.
   * @param {string} clientData.email - The client's email address.
   * @param {string} clientData.phone - The client's phone number.
   * @returns {Promise<{clientId: number}>} An object containing the new client's ID.
   */
  static async create(clientData) {
    const { fullName, email, phone } = clientData;

    const clientId = await ClientModel.create({
      fullName,
      email,
      phone,
    });

    if (!clientId) {
      throw new Error("Failed to get a valid client ID.");
    }

    return { clientId };
  }
}