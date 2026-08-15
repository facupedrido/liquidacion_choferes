require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const viajesRoutes = require('./routes/viajes');

const app = express();

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'cambiar_este_secreto_en_produccion',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,          // el JS del navegador no puede leer la cookie (mitiga XSS)
    maxAge: 1000 * 60 * 60 * 8 // la sesión dura 8 horas
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/viajes', viajesRoutes);

// Sirve el frontend estático (index.html, dashboard.html, css, js).
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
