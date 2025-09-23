// services/clientService.js
import { MembershipModel } from "../models/membership.model.js";

export const ClientService = {
  /**
   * Creates a new client by calling the model.
   * @param {object} clientData - The client data.
   * @param {string} clientData.fullName - The client's full name.
   * @param {string} clientData.email - The client's email.
   * @param {string} clientData.phone - The client's phone number.
   * @returns {Promise<{clientId: number}>} The created client's ID.
   */
  async createClient(clientData) {
    const { fullName, email, phone } = clientData;

    // The model is now refactored to accept English properties directly.
    const result = await MembershipModel.createClient({
      fullName,
      email,
      phone,
    });

    if (!result?.clientId) {
      throw new Error("Could not retrieve the client ID after creation.");
    }

    return result;
  }
};