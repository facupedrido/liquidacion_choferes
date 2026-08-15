const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();

// POST /api/auth/login
// RF-02 / RF-03 y caso de uso "Inicio de sesión":
// valida credenciales y, si son correctas, carga automáticamente
// legajo, nombre y apellido del chofer en la sesión activa.
router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT i.id_usuario, i.contraseña, c.id_chofer, c.nombre_completo, c.legajo, c.empresa
       FROM inicio_sesion i
       JOIN choferes c ON c.id_usuario = i.id_usuario
       WHERE i.usuario = ?`,
      [usuario]
    );

    // Mensaje genérico a propósito: no revelamos si falló el usuario
    // o la contraseña, para no darle pistas a un atacante.
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const usuarioDB = rows[0];
    const passwordValida = await bcrypt.compare(contrasena, usuarioDB.contraseña);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    req.session.chofer = {
      id_chofer: usuarioDB.id_chofer,
      id_usuario: usuarioDB.id_usuario,
      nombre_completo: usuarioDB.nombre_completo,
      legajo: usuarioDB.legajo,
      empresa: usuarioDB.empresa
    };

    res.json({ chofer: req.session.chofer });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
});

// GET /api/auth/me
// Le permite al frontend (dashboard.html) recuperar los datos del
// chofer logueado al recargar la página, sin pedirlos de nuevo.
router.get('/me', (req, res) => {
  if (!req.session || !req.session.chofer) {
    return res.status(401).json({ error: 'No autenticado.' });
  }
  res.json({ chofer: req.session.chofer });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión.' });
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

module.exports = router;
