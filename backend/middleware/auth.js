// Protege rutas que requieren un chofer logueado.
// Si no hay sesión activa, corta la petición con 401 antes de tocar la DB.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.chofer) {
    return res.status(401).json({ error: 'No autenticado. Iniciá sesión nuevamente.' });
  }
  next();
}

module.exports = { requireAuth };
