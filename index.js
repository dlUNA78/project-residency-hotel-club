// Importación de dependencias
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import { app } from "./src/config/app.js";
import { routerGlobal } from "./src/router/routerGlobal.js";
import routerLogin from "./src/modules/login/routers/routerLogin.js";
import { routerRoom } from "./src/modules/rooms/routes/RouteRooms.js";

// Configuración de variables para __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Middleware para procesar datos enviados en el cuerpo de la solicitud
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(
  session({
    secret: "las_mujeres_me_dan_miedo",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Register all application routes
app.use(routerGlobal);

// The login and room routers are already included in routerGlobal,
// so these lines might be redundant, but we'll keep them for safety.
app.use(routerLogin);
app.use(routerRoom);

// Start the server
app.listen(app.get("port"), () => {
  console.log(`Server running on port: http://localhost:${app.get("port")}`);
});
