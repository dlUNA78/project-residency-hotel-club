import express from 'express';
import exphbs from 'express-handlebars';
import { config } from '../config/configuration.js';
import path from 'path';

export const app = express();

// Configuración de Handlebars
app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main', // layout principal
  partialsDir: path.join('./src/views/partials'), // partials globales
  layoutsDir: path.join('./src/views/layouts'), // layouts globales
  helpers: {
    eq: (a, b) => a === b
  }
}));

app.set('view engine', 'hbs');

// Múltiples carpetas de vistas: global + módulos
app.set('views', [
  path.join('./src/views'),            // vistas globales
  path.join('./src/modules/login/views'),
  //path.join('./src/modules/rooms/views'),
  path.join('./src/modules/membership/views')
]);

  app.set("port", config.app.port);
  app.set("database",config.mysql.database);
