import express from 'express';
import { renderMembershipHome, renderMembershipList} from '../controllers/membershipController.js';
import { authMiddleware, roleMiddleware } from '../../login/middlewares/accessDenied.js';
import { MembershipController } from '../controllers/membershipController.js';


const routerMember = express.Router();

// Primero autenticación (todos deben estar logueados)
routerMember.use(authMiddleware);

// Rutas accesibles a TODOS los roles autenticados
routerMember.get('/', renderMembershipHome);
routerMember.get('/listMembership', renderMembershipList);

// Ruta para crear membresía que carga los tipos de membresía
routerMember.get('/createMembership', MembershipController.renderCreate);



//post
routerMember.post("/createClient", MembershipController.createClient);
routerMember.post("/createMembership", MembershipController.createMembership);

export { routerMember };
