import express from 'express';
import { roleMiddleware, authMiddleware } from '../middlewares/accessDenied.js';
import { loginUser } from '../controllers/authControllerUsers.js';

const router = express.Router();

// Login page - ruta específica
router.get('/login', (req, res) => res.render('login', { title: 'Inicio' }));

// Handle login
router.post('/login', loginUser);

// Ruta raíz - redirige según autenticación
router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/home');
  }
  res.redirect('/login');
});

// Protected home page
router.get('/home', authMiddleware, (req, res) => {
  const user = req.session.user;
  if (!user?.username || !user?.role) return res.redirect('/login');
  res.render('home', { title: 'Home', ...user });
});

// Logout
router.get('/logout', (req, res) =>
  req.session.destroy(err =>
    err
      ? res.status(500).send('Error al cerrar sesión')
      : res.redirect('/')
  )
);

// Admin panel
router.get('/admin', roleMiddleware('SuperUsuario'), (req, res) =>
  res.render('admin', { title: 'Panel de Administración' })
);

// 404 handler - SOLO para rutas dentro de este router
router.use((req, res) => res.status(404).render('error404', { title: 'Página no encontrada' }));

export default router;
