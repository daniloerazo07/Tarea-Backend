import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL, ApiSession, apiInterceptor } from './api-config';
import { SesionService } from './sesion.service';

describe('API externa desde GitHub Pages', () => {
  let http: HttpClient;
  let testing: HttpTestingController;
  let session: ApiSession;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([apiInterceptor])),
      provideHttpClientTesting(),
      { provide: API_BASE_URL, useValue: 'https://api.example.test/api' },
    ] });
    http = TestBed.inject(HttpClient);
    testing = TestBed.inject(HttpTestingController);
    session = TestBed.inject(ApiSession);
  });
  afterEach(() => testing.verify());

  it('inicia sesión y envía el token sólo al backend configurado', () => {
    TestBed.inject(SesionService).iniciar().subscribe();
    const login = testing.expectOne('https://api.example.test/api/sesion');
    expect(login.request.headers.has('Authorization')).toBeFalse();
    login.flush({ status: 'ok', data: { id: 1, nombre: 'Estudiante', rol: 'cliente' }, sessionToken: 'token-de-prueba' });
    http.post('/api/pedidos', { items: [1] }).subscribe();
    const order = testing.expectOne('https://api.example.test/api/pedidos');
    expect(order.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(order.request.withCredentials).toBeFalse();
    order.flush({ status: 'ok' });
    http.get('https://otro.example/recurso').subscribe();
    const external = testing.expectOne('https://otro.example/recurso');
    expect(external.request.headers.has('Authorization')).toBeFalse();
    external.flush({});
  });

  it('elimina el token ante 401 sin repetir el pedido', () => {
    session.token = 'sesion-expirada';
    http.post('/api/pedidos', { items: [1] }).subscribe({ error: () => {} });
    testing.expectOne('https://api.example.test/api/pedidos').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.token).toBeNull();
    testing.expectNone('https://api.example.test/api/pedidos');
  });
});
