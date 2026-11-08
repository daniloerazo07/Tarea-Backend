import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const origin = 'http://127.0.0.1:5500';
const frontend = await fetch(origin);
assert.equal(frontend.status, 200);
const html = await frontend.text();
assert.match(html, /CaféCat - Carrito de compras/);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
assert.ok(scripts.some(script => script.startsWith('main-')));
for (const script of scripts) assert.equal((await fetch(`${origin}/${script}`)).status, 200);

const catalogo = await fetch(`${origin}/api/productos`);
assert.equal(catalogo.status, 200);
assert.deepEqual(await catalogo.json(), { status: 'ok', data: [{ id: 1, nombre: 'Café', precio: 10.5, categoria: 'Bebidas' }] });

const sinSesion = await fetch(`${origin}/api/pedidos`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [1] }),
});
assert.equal(sinSesion.status, 401);
assert.equal((await sinSesion.json()).status, 'error');

const sesion = await fetch(`${origin}/api/sesion`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});
assert.equal(sesion.status, 200);
const usuario = await sesion.json();
assert.equal(usuario.data.nombre, 'Estudiante');
const cookie = sesion.headers.get('set-cookie');
assert.match(cookie, /Path=\/api/);
assert.match(cookie, /HttpOnly/);
assert.match(cookie, /SameSite=Lax/);

const creado = await fetch(`${origin}/api/pedidos`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie.split(';')[0] },
  body: JSON.stringify({ items: [1] }),
});
assert.equal(creado.status, 201);
const respuesta = await creado.json();
assert.ok(Number.isInteger(respuesta.data.orderId));
const guardados = JSON.parse(await fs.readFile('backend/data/pedidos.json', 'utf8'));
const guardado = guardados.find(pedido => pedido.id === respuesta.data.orderId);
assert.deepEqual(guardado.items, [1]);
assert.equal(guardado.usuarioId, 1);
assert.equal(guardado.fecha, respuesta.data.fecha);

const invalido = await fetch(`${origin}/api/pedidos`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
});
assert.equal(invalido.status, 400);
assert.equal((await invalido.json()).status, 'error');
const desconocida = await fetch(`${origin}/api/no-existe`);
assert.equal(desconocida.status, 404);
assert.equal((await desconocida.json()).status, 'error');

const evidencia = {
  verificadoEn: new Date().toISOString(), origen: origin,
  comprobacion: 'HTTP contra la extensión Live Server de VS Code y Express; sin automatización visual del navegador',
  frontend: { status: frontend.status, scripts },
  catalogo: { ruta: '/api/productos', status: catalogo.status },
  sesion: { ruta: '/api/sesion', status: sesion.status, cookie: { path: '/api', httpOnly: true, sameSite: 'lax' } },
  pedido: { ruta: '/api/pedidos', status: creado.status, respuesta, guardado },
  errores: { sinSesion: sinSesion.status, jsonMalFormado: invalido.status, rutaInexistente: desconocida.status },
};
await fs.writeFile('docs/evidencia-http.json', JSON.stringify(evidencia, null, 2) + '\n');
console.log(JSON.stringify(evidencia, null, 2));
