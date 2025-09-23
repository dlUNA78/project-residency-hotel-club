// src/middlewares/auth/roleHandler.js

// Define role constants for consistency
const ROLES = {
  ADMIN: 'Administrador',
  RECEPTIONIST: 'Recepcionista',
};

/**
 * Middleware to check user role and set local variables for views.
 * This makes `userRole` and `isAdmin` available in all Handlebars templates.
 */
export const setRoleLocals = (req, res, next) => {
  // Default to Receptionist if no user or role is in the session
  const userRole = req.session?.user?.role || ROLES.RECEPTIONIST;

  res.locals.userRole = userRole;
  res.locals.isAdmin = userRole === ROLES.ADMIN;

  next();
};

/**
 * Middleware to protect routes that require admin privileges.
 */
export const requireAdmin = (req, res, next) => {
  // `res.locals.isAdmin` is set by the `setRoleLocals` middleware,
  // which should be run before this one.
  if (!res.locals.isAdmin) {
    // You can customize this response as needed
    return res.status(403).render('error', {
        message: 'Access Denied',
        error: {
            status: '403 Forbidden',
            stack: 'You do not have permission to access this resource.'
        }
    });
  }
  next();
};

export { ROLES };
