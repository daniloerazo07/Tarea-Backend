# PROGRAMA - Carrito de compras de Semana 10

Práctica de CaféCat con Angular 19 Standalone y una API de Node.js 22 y Express 5. El catálogo, la sesión de prueba y el carrito se muestran en una sola vista con controles nativos. En local, el frontend se sirve **compilado con Live Server de VS Code** y Express atiende la API en otro proceso. Para internet, GitHub Pages sirve Angular y un servicio externo ejecuta Express con PostgreSQL.

## Publicación en GitHub Pages y Render

Repositorio: [daniloerazo07/Tarea-Backend](https://github.com/daniloerazo07/Tarea-Backend).

Dirección de Pages configurada: **https://daniloerazo07.github.io/Tarea-Backend/**. El workflow `.github/workflows/pages.yml` ejecuta las pruebas de Angular, Express y PostgreSQL 17 antes de desplegar. La publicación necesita la URL real del backend en la variable de repositorio `API_BASE_URL` (por ejemplo, `https://nombre-real.onrender.com/api`). Sin esa variable las pruebas se ejecutan y la publicación espera; no se publica una aplicación apuntando a una API inexistente.

1. Con una cuenta de Render, abre [el Blueprint de este repositorio](https://dashboard.render.com/select-repo?type=blueprint&repo=https://github.com/daniloerazo07/Tarea-Backend). `render.yaml` define la API Express y una base PostgreSQL, ambos con plan **Free**.
2. Espera a que la API responda `200` en su ruta `/api/health` y comprueba `/api/productos`.
3. Guarda su URL HTTPS, terminada en `/api`, como variable `API_BASE_URL` en **Settings → Secrets and variables → Actions → Variables** del repositorio. Esta URL es pública; no es un secreto.
4. En **Settings → Pages**, elige **GitHub Actions** como origen. Ejecuta **Pruebas y GitHub Pages** desde Actions o sube otro commit a `main`.

La compilación de Pages usa `/Tarea-Backend/` como base, rutas con hash y `app-config.json` para la API externa. El token de sesión permanece sólo en memoria y se envía como Bearer a la API configurada; así el carrito no depende de cookies de terceros. CORS admite únicamente `https://daniloerazo07.github.io`. La sesión de prueba sigue siendo una identidad de demostración, no un sistema de cuentas para producción.

**Límites del plan gratuito:** Render suspende el servicio tras 15 minutos sin actividad, y la primera solicitud posterior puede tardar aproximadamente un minuto. Su PostgreSQL gratuito expira a los 30 días. Los pedidos en PostgreSQL sobreviven a reinicios y despliegues de Express mientras esa base exista. No se debe usar el JSON del disco efímero de Render para conservar pedidos. Consulta [los límites oficiales](https://render.com/docs/free) antes de usarlo fuera de esta práctica.

En local se mantiene el almacenamiento JSON original. Con `DATABASE_URL`, Express usa PostgreSQL; sin ella usa `backend/data/pedidos.json`. Las variables del backend están documentadas en `backend/.env.example`. No subas credenciales ni archivos `.env`.

Para reproducir sólo la compilación de Pages:

```powershell
$env:API_BASE_URL = 'https://nombre-real.onrender.com/api'
.\scripts\npm-local.cmd run build:pages
```

No se versionan `node_modules`, `.tools`, compilaciones, cachés ni registros temporales. Los dos `package-lock.json` permiten reinstalar las dependencias con `npm ci`.

## Arranque en este equipo

Abre esta carpeta `PROGRAMA` en VS Code. Ya están instaladas las dependencias y existe una compilación en `dist/programa/browser`.

1. Inicia Express en una terminal situada en `PROGRAMA`:

   ```powershell
   .\scripts\npm-local.cmd start
   ```

2. Compila Angular después de cambiar TypeScript o sus plantillas:

   ```powershell
   .\scripts\npm-local.cmd run build -- --configuration production
   ```

3. Pulsa **Go Live** de la extensión **Live Server (ritwickdey.LiveServer)**. También puedes abrir `dist/programa/browser/index.html` con **Open with Live Server**. La carpeta raíz y el proxy están en `.vscode/settings.json`.

4. Abre **http://127.0.0.1:5500/**. Si el puerto está ocupado, usa el puerto que informe la extensión.

El lanzador `npm-local.cmd` utiliza Node.js 22 portátil de `.tools` en este equipo; si no está esa carpeta, utiliza Node del `PATH`. Evita el bloqueo de los lanzadores `npm.ps1` sin cambiar políticas de PowerShell. También están disponibles las tareas **Angular: compilar producción** y **Express: iniciar API** de VS Code.

Con Node.js 22 instalado en el `PATH`, los comandos habituales son:

```powershell
npm.cmd ci
Set-Location backend
npm.cmd ci
npm.cmd start
```

En una segunda terminal, situada en `PROGRAMA`:

```powershell
npx.cmd ng build --configuration production
```

Para reinstalar usando el runtime portátil, ejecuta `scripts\npm-local.cmd ci` desde la raíz y `..\scripts\npm-local.cmd ci` desde `backend`. Cada proyecto tiene su propio `package-lock.json`.

## Uso del carrito

1. Comprueba que aparece **Listado de productos**, con Café, categoría Bebidas y precio $10.50.
2. Pulsa **Iniciar sesión de prueba**: la identidad la fija Express como Estudiante, rol cliente.
3. Pulsa **Agregar al carrito**. Cada clic agrega una unidad; dos clics envían `{ "items": [1, 1] }`.
4. Pulsa **Enviar pedido**. Sólo después de confirmar HTTP `201` y `data.orderId` se vacía el carrito y aparece **Pedido creado. ID: …**.

Sin sesión o con el carrito vacío, la SPA muestra un mensaje sin enviar el POST. Durante el envío bloquea otro pedido y las modificaciones del carrito. Si hay un error, conserva los productos. Ante `401` vuelve a ofrecer iniciar sesión; ante `403` muestra acceso denegado. No hay reintentos automáticos de pedidos.

Los pedidos se guardan en `backend/data/pedidos.json`. El archivo se creó con `[]` y contiene pedidos de demostración de la verificación; el último se describe en `docs/evidencia-http.json`. No lo borres al reiniciar Express. Las sesiones son de demostración, permanecen en memoria y expiran al reiniciar la API. El catálogo, el carrito y el usuario del frontend permanecen en memoria durante la vida de la pestaña; al recargar se reinician.

## Estructura

```text
src/
  app/
    features/productos/    Vista contenedora y tarjeta con input/evento
    models/                Producto, Usuario, Pedido y respuestas de API
    services/              Clientes HTTP y CarritoStore con RxJS
    app.component.ts       RouterOutlet
    app.routes.ts
  app.config.ts            provideRouter y provideHttpClient
  main.ts                  bootstrapApplication
backend/
  app.js
  routes/
  controllers/
  models/
  middlewares/
  data/
  test/
docs/
  carrito-angular-semana-10.md
  diagramas.md
  pruebas.md
  evidencia-http.json
```

`ProductosService.listar()` contiene el único acceso a `GET /api/productos`. El componente lo inyecta por constructor, se suscribe desde `ngOnInit` y pasa los productos recibidos al estado compartido. `SesionService` inicia la sesión y `PedidosService.crearPedido(items)` verifica la respuesta completa con `observe: 'response'`. `CarritoStore` deriva cantidades y total; la vista usa `AsyncPipe`, `*ngIf` y `*ngFor`. Las tarjetas reciben `Producto` mediante `@Input` y notifican la acción con `@Output`.

En Express, el POST sigue **logger → validación → auth → controlador**. Los modelos usan `node:fs/promises` y rutas relativas a los archivos del backend. La cola de pedidos abarca lectura, asignación de ID y escritura, con un temporal en la misma carpeta y reemplazo del JSON. El controlador responde `201` después del guardado. La cola está diseñada para un único proceso local de Express.

## API

| Método y ruta | Cuerpo | Respuesta |
| --- | --- | --- |
| `GET /api/productos` | Sin cuerpo | `200`, `{ status: 'ok', data: Producto[] }` |
| `POST /api/sesion` | `{}` | `200`, usuario de prueba y cookie de sesión |
| `POST /api/pedidos` | `{ items: number[] }` | `201`, `{ status: 'ok', data: { orderId, fecha, estado } }` |

Los errores devuelven `{ status: 'error', message }`: `400` por cuerpo o producto inválido, `401` por falta de sesión, `403` por rol sin permiso, `404` por ruta inexistente y `500` por fallo interno. Los diagnósticos internos aparecen en la terminal.

El navegador usa rutas relativas `/api`, que Live Server reenvía a `http://127.0.0.1:3000/api` con un único prefijo. La cookie usa `HttpOnly`, `SameSite=Lax`, `Path=/api` y HTTP local. No se requiere CORS.

## Verificación

```powershell
.\scripts\npm-local.cmd test
.\scripts\npm-local.cmd run test:api
```

Las pruebas Angular se ejecutan con Karma y ChromeHeadless. Si Chrome no está en la ruta habitual, define `CHROME_BIN` con la ubicación de su ejecutable antes de ejecutarlas.

Con Express y Live Server activos, `scripts\npm-local.cmd run test:proxy` repite la integración HTTP del proxy y actualiza la evidencia. **Crea un pedido de demostración en el archivo real de pedidos.**

Consulta [el informe de pruebas](docs/pruebas.md) para los resultados ejecutados, los alcances de las comprobaciones y la limitación de verificación visual. Los tests de API usan directorios temporales exclusivos y no modifican los pedidos de la aplicación.

## Materiales y referencias

La guía original se conserva en `docs/carrito-angular-semana-10.md`. Los PDF originales permanecen en `docs`: Semana 10 (58 páginas), profundización de Clase 9 (5 páginas) y el recurso adicional de Clase 10 (5 páginas). No había una implementación previa de CaféCat ni CSS que reutilizar. [Los nueve diagramas Mermaid](docs/diagramas.md) preservan participantes, flechas, rótulos y entidades de la guía, incluidos los ER separados de ambos PDF.

Se aplicaron las figuras 9, 10 y 16 a 20 de Semana 10, la sección Angular Standalone de las páginas 38 a 43 y las capas, almacenamiento JSON y middleware de Clase 9. La sesión de un clic y el contrato concreto de pedidos siguen las decisiones de la guía de la práctica.

Referencias técnicas consultadas: [Angular 19 CLI](https://v19.angular.dev/cli/new), [compatibilidad de Angular](https://angular.dev/reference/versions), [sesiones de Express](https://expressjs.com/en/resources/middleware/session/) y [configuración de Live Server](https://github.com/ritwickdey/vscode-live-server/blob/master/docs/settings.md).
