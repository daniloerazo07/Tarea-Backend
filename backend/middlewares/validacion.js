module.exports = function validacion(req, res, next) {
  const body = req.body;
  if (!req.is('application/json') || !body || Array.isArray(body) ||
      Object.keys(body).length !== 1 || !Array.isArray(body.items) ||
      body.items.length === 0 || !body.items.every(id => Number.isSafeInteger(id) && id > 0)) {
    return res.status(400).json({
      status: 'error',
      message: 'El cuerpo debe contener items con al menos un ID entero positivo.',
    });
  }
  next();
};
