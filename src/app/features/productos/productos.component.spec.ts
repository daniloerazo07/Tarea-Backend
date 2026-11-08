import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ProductosComponent } from './productos.component';
import { CarritoStore } from '../../services/carrito.store';

describe('Flujo del carrito de la figura 20', () => {
  const producto = { id: 1, nombre: 'Café', precio: 10.5, categoria: 'Bebidas' };
  const usuario = { id: 1, nombre: 'Estudiante', rol: 'cliente' };
  let http: HttpTestingController;
  let store: CarritoStore;
  let fixture: ComponentFixture<ProductosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(CarritoStore);
    fixture = TestBed.createComponent(ProductosComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function catalogo(productos = [producto]) {
    http.expectOne('/api/productos').flush({ status: 'ok', data: productos });
    fixture.detectChanges();
  }

  function login() {
    store.iniciarSesion();
    const request = http.expectOne('/api/sesion');
    expect(request.request.body).toEqual({});
    request.flush({ status: 'ok', data: usuario });
  }

  function text() {
    fixture.detectChanges();
    return fixture.nativeElement.textContent as string;
  }

  it('carga desde ngOnInit, muestra carga y renderiza la tarjeta con datos', () => {
    expect(text()).toContain('Cargando productos');
    catalogo();
    expect(text()).toContain('Listado de productos');
    expect(text()).toContain('Café');
    expect(text()).toContain('Agregar al carrito');
  });

  it('no emite POST sin sesión aunque tenga productos', () => {
    catalogo();
    store.agregar(producto);
    store.enviarPedido();
    expect(text()).toContain('Inicia sesión de prueba antes');
    http.expectNone('/api/pedidos');
  });

  it('no emite POST con sesión y carrito vacío', () => {
    catalogo();
    login();
    store.enviarPedido();
    expect(text()).toContain('El carrito está vacío. Agrega un producto.');
    http.expectNone('/api/pedidos');
  });

  it('clic en tarjeta agrega unidades, envía IDs repetidos y limpia sólo después de 201', async () => {
    catalogo();
    const boton = fixture.nativeElement.querySelector('app-producto-card button') as HTMLButtonElement;
    boton.click();
    boton.click();
    expect((await firstValueFrom(store.vista$)).total).toBe(21);
    login();
    store.enviarPedido();
    const request = http.expectOne('/api/pedidos');
    expect(request.request.body).toEqual({ items: [1, 1] });
    expect((await firstValueFrom(store.vista$)).cantidad).toBe(2);
    expect(text()).toContain('Enviando pedido');
    expect(boton.disabled).toBeTrue();
    store.agregar(producto);
    store.enviarPedido();
    http.expectNone('/api/pedidos');
    request.flush({ status: 'ok', data: { orderId: 7, fecha: '2026-01-01T00:00:00.000Z', estado: 'creado' } }, { status: 201, statusText: 'Created' });
    expect((await firstValueFrom(store.vista$)).cantidad).toBe(0);
    expect(text()).toContain('Pedido creado. ID: 7');
    expect(text()).toContain('El carrito está vacío.');
  });

  for (const caso of [
    { status: 200, body: { status: 'ok', data: { orderId: 1 } } },
    { status: 201, body: { status: 'ok', data: {} } },
    { status: 201, body: { status: 'ok', data: { orderId: 0 } } },
  ]) {
    it(`conserva carrito sin confirmación válida (${caso.status}, ${JSON.stringify(caso.body)})`, async () => {
      catalogo(); login(); store.agregar(producto); store.enviarPedido();
      http.expectOne('/api/pedidos').flush(caso.body, { status: caso.status, statusText: 'OK' });
      const vm = await firstValueFrom(store.vista$);
      expect(vm.cantidad).toBe(1);
      expect(vm.enviandoPedido).toBeFalse();
      expect(text()).toContain('La API no confirmó');
    });
  }

  it('401 invalida sesión y conserva carrito para iniciar y reenviar', async () => {
    catalogo(); login(); store.agregar(producto); store.enviarPedido();
    http.expectOne('/api/pedidos').flush({ status: 'error', message: 'Sin sesión' }, { status: 401, statusText: 'Unauthorized' });
    const vm = await firstValueFrom(store.vista$);
    expect(vm.usuario).toBeNull();
    expect(vm.cantidad).toBe(1);
    expect(text()).toContain('La sesión expiró');
    expect(text()).toContain('Iniciar sesión de prueba');
    login(); store.enviarPedido();
    http.expectOne('/api/pedidos').flush({ status: 'ok', data: { orderId: 2 } }, { status: 201, statusText: 'Created' });
    expect((await firstValueFrom(store.vista$)).cantidad).toBe(0);
  });

  it('403 refleja denegación y conserva carrito y sesión', async () => {
    catalogo(); login(); store.agregar(producto); store.enviarPedido();
    http.expectOne('/api/pedidos').flush({ status: 'error', message: 'Sin permiso' }, { status: 403, statusText: 'Forbidden' });
    const vm = await firstValueFrom(store.vista$);
    expect(vm.usuario).toEqual(usuario);
    expect(vm.cantidad).toBe(1);
    expect(text()).toContain('Acceso denegado');
  });

  it('error de red conserva carrito y no reintenta el POST automáticamente', async () => {
    catalogo(); login(); store.agregar(producto); store.enviarPedido();
    http.expectOne('/api/pedidos').error(new ProgressEvent('error'));
    http.expectNone('/api/pedidos');
    expect((await firstValueFrom(store.vista$)).cantidad).toBe(1);
    expect(text()).toContain('Error de red');
  });

  it('500 muestra el mensaje de la API y conserva carrito', async () => {
    catalogo(); login(); store.agregar(producto); store.enviarPedido();
    http.expectOne('/api/pedidos').flush({ status: 'error', message: 'Error interno del servidor' }, { status: 500, statusText: 'Internal Server Error' });
    expect((await firstValueFrom(store.vista$)).cantidad).toBe(1);
    expect(text()).toContain('Error interno del servidor');
  });

  it('catálogo vacío refleja falta de datos', () => {
    catalogo([]);
    expect(text()).toContain('No hay productos disponibles.');
  });

  it('fallo de catálogo muestra error de red y permite reintentar', () => {
    http.expectOne('/api/productos').error(new ProgressEvent('error'));
    expect(text()).toContain('Error de red');
    expect(text()).not.toContain('Cargando productos');
    fixture.componentInstance.cargarProductos();
    catalogo();
    expect(text()).toContain('Café');
    expect(text()).not.toContain('Error de red');
  });
});
