const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const session = require('express-session');
const { createApp } = require('../app');

const producto = { id: 1, nombre: 'Café', precio: 10.5, categoria: 'Bebidas' };

async function fixture(t, options = {}) {
  const base = path.resolve(__dirname, '../../tmp/api-tests');
  await fs.mkdir(base, { recursive: true });
  const directory = await fs.mkdtemp(path.join(base, 'caso-'));
  await fs.writeFile(path.join(directory, 'productos.json'), JSON.stringify([producto]));
  await fs.writeFile(path.join(directory, 'pedidos.json'), '[]');
  let server;
  let origin;
  let store;
  function start() {
    store = new session.MemoryStore();
    server = createApp({ dataDirectory: directory, sessionStore: store, ...options }).listen(0, '127.0.0.1');
    return new Promise(resolve => server.once('listening', () => {
      origin = `http://127.0.0.1:${server.address().port}`;
      resolve();
    }));
  }
  async function stop() {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  await start();
  t.after(async () => {
    await stop();
    // Sólo se elimina el directorio temporal exclusivo creado por esta prueba.
    assert.ok(path.resolve(directory).startsWith(base + path.sep));
    await fs.rm(directory, { recursive: true, force: true });
  });
  async function request(route, { body, cookie, method = body === undefined ? 'GET' : 'POST', raw } = {}) {
    const response = await fetch(origin + route, {
      method,
      headers: { ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  async function login() {
    const response = await request('/api/sesion', { body: {} });
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { status: 'ok', data: { id: 1, nombre: 'Estudiante', rol: 'cliente' } });
    assert.match(response.cookie, /HttpOnly/);
    assert.match(response.cookie, /Path=\/api/);
    assert.match(response.cookie, /SameSite=Lax/);
    return response.cookie.split(';')[0];
  }
  return {
    get origin() { return origin; },
    directory, request, login,
    pedidos: async () => JSON.parse(await fs.readFile(path.join(directory, 'pedidos.json'), 'utf8')),
    restart: async () => { await stop(); await start(); },
    denyRole: async () => {
      const sessions = await new Promise((resolve, reject) => store.all((err, data) => err ? reject(err) : resolve(data)));
      const [id, value] = Object.entries(sessions)[0];
      value.usuario.rol = 'visitante';
      await new Promise((resolve, reject) => store.set(id, value, err => err ? reject(err) : resolve()));
    },
  };
}

test('GET público devuelve catálogo, contrato JSON y 200', async t => {
  const f = await fixture(t);
  assert.deepEqual(await f.request('/api/productos'), {
    status: 200, data: { status: 'ok', data: [producto] }, cookie: null,
  });
});

test('sesión, POST 201 y registro guardado coinciden; preserva IDs repetidos', async t => {
  const f = await fixture(t);
  const cookie = await f.login();
  const response = await f.request('/api/pedidos', { body: { items: [1, 1] }, cookie });
  assert.equal(response.status, 201);
  assert.equal(response.data.status, 'ok');
  assert.equal(response.data.data.orderId, 1);
  const [pedido] = await f.pedidos();
  assert.deepEqual(pedido, { id: 1, fecha: response.data.data.fecha, estado: 'creado', usuarioId: 1, items: [1, 1] });
  assert.equal(new Date(pedido.fecha).toISOString(), pedido.fecha);
});

test('POST válido sin cookie devuelve 401 y no guarda', async t => {
  const f = await fixture(t);
  const response = await f.request('/api/pedidos', { body: { items: [1] } });
  assert.equal(response.status, 401);
  assert.equal(response.data.status, 'error');
  assert.deepEqual(await f.pedidos(), []);
});

test('valida el cuerpo antes de auth: cuerpos inválidos producen 400', async t => {
  const f = await fixture(t);
  for (const body of [{}, { items: [] }, { items: [0] }, { items: [-1] }, { items: [1.1] }, { items: ['1'] }, { items: null }, { items: [1], usuarioId: 9 }, []]) {
    const response = await f.request('/api/pedidos', { body });
    assert.equal(response.status, 400);
    assert.equal(response.data.status, 'error');
    assert.equal(typeof response.data.message, 'string');
  }
  assert.deepEqual(await f.pedidos(), []);
});

test('JSON mal formado produce 400; la API continúa disponible', async t => {
  const f = await fixture(t);
  const response = await f.request('/api/pedidos', { method: 'POST', raw: '{"items":' });
  assert.equal(response.status, 400);
  assert.equal(response.data.status, 'error');
  assert.equal((await f.request('/api/productos')).status, 200);
});

test('producto inexistente produce 400 y no guarda', async t => {
  const f = await fixture(t);
  const cookie = await f.login();
  assert.equal((await f.request('/api/pedidos', { body: { items: [999] }, cookie })).status, 400);
  assert.deepEqual(await f.pedidos(), []);
});

test('sesión controlada sin permiso produce 403 y no guarda', async t => {
  const f = await fixture(t);
  const cookie = await f.login();
  await f.denyRole();
  const response = await f.request('/api/pedidos', { body: { items: [1] }, cookie });
  assert.equal(response.status, 403);
  assert.equal(response.data.status, 'error');
  assert.deepEqual(await f.pedidos(), []);
});

test('rutas inexistentes producen 404 JSON', async t => {
  const f = await fixture(t);
  const response = await f.request('/api/no-existe');
  assert.equal(response.status, 404);
  assert.equal(response.data.status, 'error');
});

test('20 envíos simultáneos guardan todos los pedidos con IDs únicos', async t => {
  const f = await fixture(t);
  const cookie = await f.login();
  const responses = await Promise.all(Array.from({ length: 20 }, () => f.request('/api/pedidos', { body: { items: [1] }, cookie })));
  assert.ok(responses.every(response => response.status === 201));
  assert.equal(new Set(responses.map(response => response.data.data.orderId)).size, 20);
  assert.deepEqual((await f.pedidos()).map(pedido => pedido.id), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.ok((await fs.readdir(f.directory)).every(name => !name.endsWith('.tmp')));
});

test('reinicio conserva pedidos, expira cookie previa y continúa los IDs', async t => {
  const f = await fixture(t);
  const cookie = await f.login();
  await f.request('/api/pedidos', { body: { items: [1] }, cookie });
  await f.restart();
  assert.equal((await f.pedidos()).length, 1);
  assert.equal((await f.request('/api/pedidos', { body: { items: [1] }, cookie })).status, 401);
  const nuevaCookie = await f.login();
  const response = await f.request('/api/pedidos', { body: { items: [1] }, cookie: nuevaCookie });
  assert.equal(response.data.data.orderId, 2);
});

test('catálogo vacío es una respuesta 200 con lista vacía', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.directory, 'productos.json'), '[]');
  const response = await f.request('/api/productos');
  assert.equal(response.status, 200);
  assert.deepEqual(response.data.data, []);
});

test('fallo de lectura devuelve 500 JSON sin filtrar rutas y permite recuperarse', async t => {
  const f = await fixture(t);
  const archivo = path.join(f.directory, 'productos.json');
  await fs.rename(archivo, archivo + '.backup');
  const response = await f.request('/api/productos');
  assert.deepEqual(response.data, { status: 'error', message: 'Error interno del servidor' });
  assert.equal(response.status, 500);
  await fs.rename(archivo + '.backup', archivo);
  assert.equal((await f.request('/api/productos')).status, 200);
});

test('fallo de acceso a pedidos no confirma 201 y la cola se recupera', async t => {
  const f = await fixture(t);
  const cookie = await f.login();
  const archivo = path.join(f.directory, 'pedidos.json');
  const original = await fs.readFile(archivo);
  await fs.rename(archivo, archivo + '.backup');
  await fs.mkdir(archivo);
  const failed = await f.request('/api/pedidos', { body: { items: [1] }, cookie });
  assert.equal(failed.status, 500);
  await fs.rmdir(archivo);
  await fs.writeFile(archivo, original);
  const response = await f.request('/api/pedidos', { body: { items: [1] }, cookie });
  assert.equal(response.status, 201);
  assert.equal(response.data.data.orderId, 1);
});

const pagesOrigin = 'https://daniloerazo07.github.io';

test('health y CORS admiten únicamente el origen configurado de Pages', async t => {
  const f = await fixture(t, { allowedOrigin: pagesOrigin });
  const response = await fetch(f.origin + '/api/health', { headers: { Origin: pagesOrigin } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('access-control-allow-origin'), pagesOrigin);
  assert.match(response.headers.get('vary'), /Origin/);
  const denied = await fetch(f.origin + '/api/productos', { headers: { Origin: 'https://otro.example' } });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('preflight permite Content-Type y Authorization para el POST desde Pages', async t => {
  const f = await fixture(t, { allowedOrigin: pagesOrigin });
  const response = await fetch(f.origin + '/api/pedidos', {
    method: 'OPTIONS',
    headers: { Origin: pagesOrigin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), pagesOrigin);
  assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
});

test('sesión Bearer desde Pages crea un pedido sin cookies de terceros', async t => {
  const f = await fixture(t, { allowedOrigin: pagesOrigin, secureCookies: true });
  const login = await fetch(f.origin + '/api/sesion', {
    method: 'POST', headers: { Origin: pagesOrigin, 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(login.status, 200);
  assert.equal(login.headers.get('cache-control'), 'no-store');
  const { sessionToken } = await login.json();
  assert.equal(typeof sessionToken, 'string');
  const pedido = await fetch(f.origin + '/api/pedidos', {
    method: 'POST', headers: { Origin: pagesOrigin, 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ items: [1, 1] }),
  });
  assert.equal(pedido.status, 201);
  assert.deepEqual((await f.pedidos())[0].items, [1, 1]);
});

test('token Bearer alterado no autentica ni guarda pedidos', async t => {
  const f = await fixture(t, { allowedOrigin: pagesOrigin });
  const login = await f.request('/api/sesion', { body: {} });
  const token = login.data.sessionToken;
  const response = await fetch(f.origin + '/api/pedidos', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}` },
    body: JSON.stringify({ items: [1] }),
  });
  assert.equal(response.status, 401);
  assert.deepEqual(await f.pedidos(), []);
});
