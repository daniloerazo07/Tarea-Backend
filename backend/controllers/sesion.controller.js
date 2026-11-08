module.exports = async function iniciarSesion(req, res) {
  await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  const usuario = { id: 1, nombre: 'Estudiante', rol: 'cliente' };
  req.session.usuario = usuario;
  await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  const sessionToken = req.app.locals.crearTokenSesion?.(req.sessionID);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ status: 'ok', data: usuario, ...(sessionToken ? { sessionToken } : {}) });
};
