import express from "express";
import routerLogin from "../modules/login/routers/routerLogin.js";
import { membershipApiRoutes, membershipViewRoutes } from "../modules/membership/routes/index.js";
import { routerRoom } from "../modules/rooms/routes/RouteRooms.js";
const routerGlobal = express.Router();

// Here all module routers will be imported
routerGlobal.use(routerLogin);
routerGlobal.use("/memberships", membershipViewRoutes);
routerGlobal.use("/api/memberships", membershipApiRoutes);
routerGlobal.use(routerRoom);
// Import the others here please...

// Middleware to handle 404 errors (operates after module routes)
routerGlobal.use((req, res) => {
  res.status(404).render("error404", {
    layout: "main",
    title: "Page Not Found",
    message: "The route you are trying to access does not exist.",
    url: req.originalUrl,
    showFooter: true,
  });
});

// Middleware to handle 500 errors (receives 4 parameters)
routerGlobal.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === "development";

  // Log the full stack trace for debugging
  console.error(err.stack);

  res.status(500).render("error500", {
    layout: "main",
    title: "500 Internal Server Error",
    message: "Internal Server Error",
    errorMessage: isDev ? err.message : null,
    stack: isDev ? err.stack : null,
    showFooter: true,
  });
});

export { routerGlobal };
