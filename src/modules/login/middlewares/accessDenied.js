/**
 * Middleware de autenticación para verificar si un usuario está autenticado.
 *
 * Este middleware verifica si existe un usuario en la sesión actual. Si el usuario
 * está autenticado, permite continuar con el siguiente controlador. De lo contrario,
 * responde con un estado 401 y renderiza una vista de acceso restringido.
 */
export const authMiddleware = (req, res, next) => {
  const isAuthenticated = req.session?.user; // Verifica si hay un usuario en la sesión
  if (isAuthenticated) {
    console.log(`Usuario autenticado: ${req.session.user.username}`);
    req.user = req.session.user;
    next(); // Continúa con el controlador si está autenticado
  } else {
    console.log("Usuario no autenticado.");
    // Si la petición es para una API, responde con JSON.
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ error: "Acceso no autorizado. Por favor, inicie sesión." });
    }
    // Si no, renderiza la página de acceso restringido.
    res.status(401).render("authMiddleware", {
      title: "Acceso Restringido",
      redirectUrl: "/", // Ruta a la que se redirigirá después de 5 segundos
    });
  }
};

/**
 * Middleware para verificar roles de usuario.
 *
 * @param {string} requiredRole - Rol requerido para acceder a la ruta ("Usuario" o "Administrador").
 */
export const roleMiddleware = (requiredRole) => (req, res, next) => {
  // Si no hay usuario en sesión → no está autenticado
  if (!req.session.user) {
    console.log("Usuario no autenticado. Redirigiendo al login.");
    return res.redirect("/"); // 👈 aquí redirige en vez de mostrar otra vista que cause loop
  }

  const { role } = req.session.user;

  // Si el rol no coincide
  if (role !== requiredRole) {
    console.log(`Acceso denegado para usuario con rol: ${role}`);
    return res
      .status(403)
      .render("authMiddleware", { title: "Acceso denegado" });
  }

  // Si pasa todo, sigue a la ruta
  next();
};
