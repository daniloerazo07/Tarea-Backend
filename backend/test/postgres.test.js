const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { Pool } = require('pg');
const crearPedidosPostgresModel = require('../models/pedidos-postgres.model');
const { createApp } = require('../app');

test('PostgreSQL conserva pedidos, IDs únicos y datos al reiniciar la API', {
  skip: !process.env.TEST_DATABASE_URL && 'Requiere TEST_DATABASE_URL; GitHub Actions usa PostgreSQL 17 aislado.',
}, async t => {
  const connectionString = process.env.TEST_DATABASE_URL;
  const schema = 'prueba_' + randomBytes(8).toString('hex');
  const admin = new Pool({ connectionString });
  let pool;
  let server;
  let origin;
  t.after(async () => {
    if (server?.listening) {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
    await pool?.end();
    // Identificador exclusivo generado arriba; sólo elimina el esquema de esta prueba.
    assert.match(schema, /^prueba_[a-f0-9]{16}$/);
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  async function start() {
    const model = crearPedidosPostgresModel(pool);
    await model.inicializar();
    server = createApp({ pedidosModel: model }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  async function login() {
    const response = await fetch(origin + '/api/sesion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 200);
    return response.headers.get('set-cookie').split(';')[0];
  }
  async function send(cookie, items = [1]) {
    const response = await fetch(origin + '/api/pedidos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ items }),
    });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  }
  await start();
  const cookie = await login();
  const first = await send(cookie, [1, 1]);
  const { rows: [saved] } = await pool.query('SELECT * FROM pedidos WHERE id = $1', [first.orderId]);
  assert.deepEqual(saved.items, [1, 1]);
  assert.equal(saved.usuario_id, 1);
  assert.equal(saved.fecha.toISOString(), first.fecha);
  const concurrent = await Promise.all(Array.from({ length: 20 }, () => send(cookie)));
  assert.equal(new Set(concurrent.map(order => order.orderId)).size, 20);
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await start();
  const restarted = await send(await login());
  assert.ok(restarted.orderId > Math.max(...concurrent.map(order => order.orderId)));
  assert.equal(Number((await pool.query('SELECT COUNT(*) FROM pedidos')).rows[0].count), 22);
});
