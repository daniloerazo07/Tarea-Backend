const { Router } = require('express');
const validacion = require('../middlewares/validacion');
const auth = require('../middlewares/auth');
const crear = require('../controllers/pedidos.controller');
module.exports = (productos, pedidos) => {
  const router = Router();
  router.post('/pedidos', validacion, auth, crear(productos, pedidos));
  return router;
};
