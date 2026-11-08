const express = require('express');
const session = require('express-session');
const { randomBytes, createHmac } = require('node:crypto');
const path = require('node:path');
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const productosRoutes = require('./routes/productos.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const sesionRoutes = require('./routes/sesion.routes');
const crearProductosModel = require('./models/productos.model');
const crearPedidosModel = require('./models/pedidos.model');

function createApp({
  dataDirectory = path.join(__dirname, 'data'), sessionStore,
  sessionSecret = randomBytes(32).toString('hex'), allowedOrigin = '', secureCookies = false, pedidosModel,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(logger);
  if (secureCookies) app.set('trust proxy', 1);
  if (allowedOrigin) {
    app.use('/api', (req, res, next) => {
      res.vary('Origin');
      if (req.headers.origin && req.headers.origin !== allowedOrigin) {
        return res.status(403).json({ status: 'error', message: 'Origen no permitido.' });
      }
      if (req.headers.origin === allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      // La misma sesión firmada admite Bearer en Pages, sin depender de cookies de terceros.
      const token = req.headers.authorization?.match(/^Bearer (s:[A-Za-z0-9_-]+\.[A-Za-z0-9+/]+)$/)?.[1];
      if (token) req.headers.cookie = `connect.sid=${encodeURIComponent(token)}`;
      next();
    });
    app.locals.crearTokenSesion = id => {
      const firma = createHmac('sha256', sessionSecret).update(id).digest('base64').replace(/=+$/, '');
      return `s:${id}.${firma}`;
    };
  }
  app.use(express.json({ limit: '100kb' }));
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { httpOnly: true, sameSite: 'lax', path: '/api', secure: secureCookies, maxAge: 3600000 },
  }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  const productos = crearProductosModel(path.join(dataDirectory, 'productos.json'));
  const pedidos = pedidosModel || crearPedidosModel(path.join(dataDirectory, 'pedidos.json'));
  app.use('/api', productosRoutes(productos));
  app.use('/api', pedidosRoutes(productos, pedidos));
  app.use('/api', sesionRoutes);
  app.use((req, res) => {
    res.status(404).json({ status: 'error', message: 'Ruta de API no encontrada' });
  });
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  iniciar().catch(error => {
    console.error('No se pudo iniciar la API:', error.message);
    process.exitCode = 1;
  });
}

async function iniciar() {
  let pool;
  let pedidosModel;
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const crearPedidosPostgresModel = require('./models/pedidos-postgres.model');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.on('error', error => console.error('Error de conexión con la base de datos:', error.message));
    pedidosModel = crearPedidosPostgresModel(pool);
    try {
      await pedidosModel.inicializar();
    } catch (error) {
      await pool.end();
      throw error;
    }
  }
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = createApp({
    dataDirectory: process.env.DATA_DIRECTORY || path.join(__dirname, 'data'),
    sessionSecret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
    allowedOrigin: process.env.FRONTEND_ORIGIN || '',
    secureCookies: process.env.NODE_ENV === 'production',
    pedidosModel,
  }).listen(port, host, () => {
    console.log(`API disponible en http://${host}:${port}`);
  });
  server.on('error', error => {
    console.error('No se pudo iniciar la API:', error);
    pool?.end();
    process.exitCode = 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => server.close(async () => {
      await pool?.end();
      process.exit(0);
    }));
  }
}

module.exports = { createApp };
