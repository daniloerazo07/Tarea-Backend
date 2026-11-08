import { spawnSync } from 'node:child_process';
import { copyFile, writeFile } from 'node:fs/promises';

const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/+$/, '');
if (!apiBaseUrl) throw new Error('Configura la variable API_BASE_URL con la URL HTTPS real del backend, terminada en /api.');
const api = new URL(apiBaseUrl);
if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash || api.pathname !== '/api') {
  throw new Error('API_BASE_URL debe ser una URL HTTPS sin credenciales, terminada en /api.');
}
const result = spawnSync(process.execPath, [
  'node_modules/@angular/cli/bin/ng.js', 'build', '--configuration', 'production', '--base-href', '/Tarea-Backend/',
  '--output-path', 'dist/pages',
], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const output = 'dist/pages/browser';
await writeFile(`${output}/app-config.json`, JSON.stringify({ apiBaseUrl }, null, 2) + '\n');
await writeFile(`${output}/.nojekyll`, '');
await copyFile(`${output}/index.html`, `${output}/404.html`);
console.log(`GitHub Pages preparado para usar ${apiBaseUrl}`);
