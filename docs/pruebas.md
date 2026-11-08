# Informe de verificación

## Publicación comprobada — 8 de noviembre de 2026, 12:33 (Ecuador)

- Sitio: https://daniloerazo07.github.io/Tarea-Backend/
- API: https://tarea-backend-api-daniloerazo07.onrender.com/api
- [Actions de publicación](https://github.com/daniloerazo07/Tarea-Backend/actions/runs/42505314251): `build` y `deploy` completados correctamente.
- Verificación HTTP pública: página, JavaScript, CSS y configuración de API con `200`; base `/Tarea-Backend/` y dirección real de Render correctas.
- API real: health y catálogo `200`, preflight CORS `204`, sesión `200` y pedido de prueba `201`, identificador `1`. No se guardaron tokens en la evidencia.
- Alcance: pruebas automatizadas en Actions y verificación HTTP de los servicios publicados. No se afirma haber completado un recorrido visual automatizado del navegador.
- Evidencia: [evidencia-despliegue.json](evidencia-despliegue.json).

## Preparación de GitHub Pages y API externa — 8 de noviembre de 2026

- Compilación de producción actual: aprobada, 275.37 kB iniciales.
- Angular: **15 aprobadas**; incluye conexión a la API externa, token de sesión y limpieza ante `401`.
- Express con archivos JSON aislados: **17 aprobadas**; incluye CORS del dominio de Pages, preflight y sesión Bearer sin cookies de terceros.
- PostgreSQL: integración aprobada en GitHub Actions con PostgreSQL 17 real. Verifica guardado, 20 pedidos simultáneos y conservación de datos al reiniciar Express. Requiere `TEST_DATABASE_URL`; se omite en el equipo local porque no hay una base de prueba configurada.
- [Primera ejecución de Actions](https://github.com/daniloerazo07/Tarea-Backend/actions/runs/42504226893): completada correctamente, incluida instalación desde ambos lockfiles, API con PostgreSQL, Angular y compilación para `/Tarea-Backend/`.
- Los YAML del workflow y del Blueprint de Render se validaron sintácticamente.
- La publicación espera una API externa real y la variable `API_BASE_URL`; no se ha sustituido Express por una simulación del navegador.

El registro siguiente corresponde a la comprobación local previa a esta ampliación.

Última verificación ejecutada el **8 de noviembre de 2026 a las 12:05**, hora de Ecuador (America/Guayaquil). Compilación de producción aprobada, 13 pruebas Angular y 13 pruebas Express aprobadas e integración HTTP por Live Server aprobada. Las fechas ISO de la API usan UTC: `2026-11-08T17:05:13.515Z` corresponde a las 12:05 del 8 de noviembre en Ecuador.

## Entorno y compilación

| Elemento | Resultado comprobado |
| --- | --- |
| Node.js | 22.23.4 portátil en `.tools` |
| npm | 10.9.9 |
| Angular CLI | 19.2.27 |
| Angular framework | 19.2.25 |
| TypeScript | 5.7.3 |
| RxJS | 7.8.2 |
| Build | `ng build --configuration production`, aprobado sin errores |
| Salida | `dist/programa/browser/index.html` |
| Tamaño inicial | 272.25 kB, transferencia estimada 75.99 kB |
| Frontend | Extensión Live Server de VS Code, `http://127.0.0.1:5500/` |
| API | Proceso separado, `http://127.0.0.1:3000` |

La compilación requirió ejecutarse fuera del aislamiento de la herramienta porque esbuild no podía recorrer los directorios superiores de la ruta del workspace. No se cambiaron las políticas de seguridad del equipo.

## Pruebas automatizadas de Angular

**13 de 13 aprobadas**, con Karma y ChromeHeadless 157 en Windows. Archivo: `src/app/features/productos/productos.component.spec.ts`.

Estas pruebas renderizan el componente Angular con sus servicios reales y sustituyen HTTP con `HttpTestingController`. Permiten comprobar carga y errores de forma controlada sin alterar los datos de la aplicación.

1. Carga desde `ngOnInit`, mensaje de carga y tarjeta con datos.
2. Carrito con productos sin sesión: no se emite el POST.
3. Sesión válida con carrito vacío: no se emite el POST.
4. Clic en la tarjeta, cantidades y total, cuerpo `{ items: [1, 1] }`, bloqueo del carrito y del segundo envío, respuesta `201`, carrito vacío y confirmación con ID.
5. Respuesta `200` en vez de `201`: conserva el carrito.
6. Respuesta `201` sin identificador: conserva el carrito.
7. Respuesta `201` con identificador cero: conserva el carrito.
8. `401`: invalida sesión, conserva carrito, permite iniciar sesión y reenviar.
9. `403`: muestra acceso denegado y conserva sesión y carrito.
10. Error de red al enviar: conserva carrito y no reintenta automáticamente.
11. `500`: muestra el mensaje de la API y conserva carrito.
12. Catálogo vacío: muestra falta de datos.
13. Error de red al cargar: muestra error y permite reintentar.

## Pruebas de integración de Express

**13 de 13 aprobadas**, con `node --test`, servidores HTTP reales en puertos temporales y archivos JSON aislados. Archivo: `backend/test/api.test.js`.

1. Catálogo público: `GET 200` y contrato JSON correcto.
2. Sesión de prueba, atributos de cookie y `POST 201`; el ID y la fecha devueltos corresponden al registro guardado; se conservan IDs de producto repetidos.
3. Pedido válido sin cookie: `401`, sin guardar.
4. Cuerpos inválidos: `400` antes de auth, sin guardar.
5. JSON mal formado: `400` y API disponible después del error.
6. Producto inexistente: `400`, sin guardar.
7. Sesión controlada con rol `visitante`: `403`, sin guardar. El rol se cambia únicamente en el MemoryStore del test; no existe un endpoint para alterar roles.
8. Ruta inexistente: `404` con error JSON.
9. Veinte envíos simultáneos: veinte pedidos guardados, IDs únicos y ningún temporal sobrante.
10. Reinicio de Express: conserva pedidos, rechaza la cookie previa con `401` y continúa los IDs después de iniciar otra sesión.
11. Catálogo vacío: `200` con lista vacía.
12. Error de lectura: `500` sin filtrar rutas internas y recuperación posterior.
13. Error al acceder al archivo de pedidos: no confirma `201` y la cola acepta solicitudes después de recuperar el archivo.

## Integración por el proxy real de Live Server

Comprobada con solicitudes HTTP a **http://127.0.0.1:5500/**, con la extensión Live Server de VS Code iniciada y Express ejecutándose por separado. La evidencia está en [evidencia-http.json](evidencia-http.json).

| Caso | Resultado |
| --- | --- |
| Entrada compilada | HTTP `200`; título CaféCat y referencias a los bundles de producción |
| JavaScript compilado | HTTP `200` para `polyfills-5CFQRCPP.js` y `main-C6I43J66.js` |
| `GET /api/productos` | `200`, Café con precio 10.5 y categoría Bebidas |
| `POST /api/sesion` | `200`; cookie con `Path=/api`, `HttpOnly` y `SameSite=Lax` |
| `POST /api/pedidos` con cookie | `201`; `data.orderId = 3` en la última ejecución |
| Archivo de pedidos | Registro `id = 3`, `usuarioId = 1`, `items = [1]`, estado `creado` y misma fecha que la respuesta |
| POST sin sesión | `401` JSON |
| JSON mal formado | `400` JSON |
| Ruta inexistente | `404` JSON; el fallback de la SPA no intercepta la API |
| Prefijo del proxy | Logs de Express con `/api/productos`, `/api/sesion` y `/api/pedidos`, sin duplicar `/api` |

## Alcance de la verificación visual

Se inició Live Server desde VS Code y se observó una ventana de Edge titulada **CaféCat - Carrito de compras**. Después, la herramienta de control del equipo detuvo la interacción porque no pudo determinar la URL actual del navegador con suficiente confianza para aplicar su política de navegación.

Por eso **no se afirma haber completado manualmente el recorrido visual en Edge**, haber inspeccionado sus DevTools ni haber probado en esa pestaña un reinicio de Express. El estado y renderizado de Angular se verificaron en ChromeHeadless; la cookie, los códigos, el proxy y la persistencia se verificaron por HTTP real. La expiración tras un reinicio se comprobó en la integración de Express y el manejo visual de `401` en las pruebas Angular.

Para completar la comprobación manual: abre `http://127.0.0.1:5500/`, inicia sesión, agrega Café y envía. En DevTools comprueba `GET 200`, la cookie y `POST 201`; el carrito debe quedar vacío y mostrar el nuevo ID. Después, con otro producto en el carrito, reinicia Express y envía: debe aparecer el mensaje de sesión expirada conservando el carrito.

## Repetir las pruebas

Desde `PROGRAMA`:

```powershell
.\scripts\npm-local.cmd test
.\scripts\npm-local.cmd run test:api
```

Los diagnósticos de los errores provocados son esperados; el resultado final debe indicar **13 SUCCESS** en Angular y **13 pass / 0 fail** en Express. Los tests de API no modifican los pedidos de la aplicación.

Con Express y Live Server activos, `scripts\npm-local.cmd run test:proxy` comprueba el proxy real y actualiza `docs/evidencia-http.json`. Esta última comprobación sí crea un pedido de demostración en `backend/data/pedidos.json`.
