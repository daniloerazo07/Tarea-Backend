import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { AppComponent } from './app/app.component';
import { API_BASE_URL } from './app/services/api-config';

async function start() {
  const response = await fetch(new URL('app-config.json', document.baseURI), { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo cargar la configuración de la aplicación.');
  const config = await response.json();
  if (typeof config.apiBaseUrl !== 'string' ||
      !(/^https:\/\/[^\s]+\/api$/.test(config.apiBaseUrl) || config.apiBaseUrl === '/api')) {
    throw new Error('La dirección del servicio de pedidos no es válida.');
  }
  await bootstrapApplication(AppComponent, {
    ...appConfig,
    providers: [...appConfig.providers, { provide: API_BASE_URL, useValue: config.apiBaseUrl }],
  });
}

start().catch(error => {
  console.error(error);
  const root = document.querySelector('app-root');
  if (root) root.textContent = 'No se pudo iniciar CaféCat. Recarga la página para volver a intentarlo.';
});
