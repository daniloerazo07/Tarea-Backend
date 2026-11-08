module.exports = function auth(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ status: 'error', message: 'Debes iniciar sesión de prueba.' });
  }
  if (req.session.usuario.rol !== 'cliente') {
    return res.status(403).json({ status: 'error', message: 'No tienes permiso para crear pedidos.' });
  }
  next();
};
