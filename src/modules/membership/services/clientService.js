// services/clientService.js
import { MembershipModel } from "../models/membershipModel.js";

export const ClientService = {
  async createClient(clientData) {
    const { fullName, email, phone } = clientData;
    
    // The model now expects camelCase properties
    const result = await MembershipModel.createClient({
      fullName,
      email,
      phone,
    });
    
    // The model now returns an object with `clientId`
    const { clientId } = result;
    if (!clientId) throw new Error("Could not get client ID from model");
    
    return { clientId };
  }
};