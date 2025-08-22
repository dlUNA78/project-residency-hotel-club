import express from 'express';
import { renderMembershipHome, renderMembershipList, renderMembershipCreate } from '../controllers/membershipController.js';
import { authMiddleware, roleMiddleware } from '../../login/middlewares/accessDenied.js';

const routerMember = express.Router();

// Primero autenticación (todos deben estar logueados)
routerMember.use(authMiddleware);

// Rutas accesibles a TODOS los roles autenticados
routerMember.get('/', renderMembershipHome);
routerMember.get('/membershipList', renderMembershipList);
routerMember.get('/create', renderMembershipCreate);
// Rutas SOLO para Administrador
routerMember.get('/edit/:id', roleMiddleware('Administrador'), (req, res) => {
  res.send('Vista para editar membresías (solo admin)');
});

routerMember.get('/delete/:id', roleMiddleware('Administrador'), (req, res) => {
  res.send('Vista para eliminar membresías (solo admin)');
});

routerMember.get('/reports', roleMiddleware('Administrador'), (req, res) => {
  res.send('Vista para reportes de membresías (solo admin)');
});



export { routerMember };






