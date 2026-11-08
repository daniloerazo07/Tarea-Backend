module.exports = function errorHandler(err, req, res, next) {
  console.error(`${new Date().toISOString()} Error en ${req.method} ${req.path}:`, err);
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'error', message: 'El cuerpo contiene JSON mal formado.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(400).json({ status: 'error', message: 'El cuerpo JSON es demasiado grande.' });
  }
  res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
};
