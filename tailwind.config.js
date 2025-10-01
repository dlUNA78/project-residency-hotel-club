/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.hbs",                  // Las vistas generales
    "./src/modules/**/views/**/*.hbs",       // Todas las vistas dentro de módulos
    "./public/js/**/*.js",                   // Escanear archivos JS en busca de clases
    "./index.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
