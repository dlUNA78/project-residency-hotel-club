// Importación de dependencias
import express from 'express';
import Handlebars from 'handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import {app} from './src/config/app.js'
import homeRoutes from './src/modules/login/routers/homeRoutes.js'
import passwordRecoveryRoutes from './src/modules/login/routers/passwordRecoveryRoutes.js';
import {routerMember} from './src/modules/membership/routes/membershipRoutes.js';
//import {routerRoom} from './src/modules/rooms/routes/RouteRooms.js';

// Configuración de variables para __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Registrar el helper "eq"
Handlebars.registerHelper('eq', (a, b) => a === b);

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para procesar datos enviados en el cuerpo de la solicitud
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(session({
  secret: 'las_mujeres_me_dan_miedo',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}))


app.use('/password-reset', passwordRecoveryRoutes);
app.use('/memberships', routerMember); 

app.use(homeRoutes);
//app.use(routerRoom);




// Iniciar el servidor
app.listen(app.get('port'),() => {
  console.log(`Servidor corriendo en el puerto: http://localhost:${app.get('port')}`);
});
