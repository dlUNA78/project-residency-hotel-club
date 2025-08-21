import express from 'express';
import { renderMembershipHome } from '../controllers/membershipController.js';
import { authMiddleware, roleMiddleware } from '../../login/middlewares/accessDenied.js';

const routerMember = express.Router();

// Aplicar middlewares a todas las rutas de membresías
routerMember.use(authMiddleware);
routerMember.use(roleMiddleware('Administrador'));

// Ruta principal de membresías
routerMember.get('/', renderMembershipHome);

export { routerMember };

