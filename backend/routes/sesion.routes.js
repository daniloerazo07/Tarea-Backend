const { Router } = require('express');
const iniciarSesion = require('../controllers/sesion.controller');
const router = Router();
router.post('/sesion', iniciarSesion);
module.exports = router;
