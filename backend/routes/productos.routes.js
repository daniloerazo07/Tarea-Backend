const { Router } = require('express');
const listar = require('../controllers/productos.controller');
module.exports = productos => {
  const router = Router();
  router.get('/productos', listar(productos));
  return router;
};
