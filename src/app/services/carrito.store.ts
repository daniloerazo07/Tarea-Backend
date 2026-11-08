import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, finalize, map } from 'rxjs';
import { Producto } from '../models/producto';
import { Usuario } from '../models/usuario';
import { SesionService } from './sesion.service';
import { PedidosService } from './pedidos.service';

interface EstadoCarrito {
  productos: Producto[];
  items: number[];
  usuario: Usuario | null;
  cargandoProductos: boolean;
  iniciandoSesion: boolean;
  enviandoPedido: boolean;
  errorCatalogo: string;
  error: string;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class CarritoStore {
  private readonly estado = new BehaviorSubject<EstadoCarrito>({
    productos: [], items: [], usuario: null,
    cargandoProductos: false, iniciandoSesion: false, enviandoPedido: false,
    errorCatalogo: '', error: '', mensaje: '',
  });

  // Cantidades y total se derivan del estado, sin mantener otra copia del carrito.
  readonly vista$ = this.estado.pipe(map(estado => {
    const lineas = estado.productos.flatMap(producto => {
      const cantidad = estado.items.filter(id => id === producto.id).length;
      return cantidad ? [{ producto, cantidad, subtotal: producto.precio * cantidad }] : [];
    });
    return {
      ...estado, lineas,
      cantidad: estado.items.length,
      total: lineas.reduce((total, linea) => total + linea.subtotal, 0),
    };
  }));

  constructor(
    private sesionSrv: SesionService,
    private Repo: PedidosService,
  ) {}

  iniciarCargaProductos(): boolean {
    if (this.estado.value.cargandoProductos || this.estado.value.enviandoPedido) return false;
    this.actualizar({ cargandoProductos: true, errorCatalogo: '' });
    return true;
  }

  recibirProductos(productos: Producto[]) {
    this.actualizar({ productos });
  }

  finalizarCargaProductos() {
    this.actualizar({ cargandoProductos: false });
  }

  errorProductos(error: unknown) {
    this.actualizar({ errorCatalogo: this.mensajeError(error) });
  }

  agregar(producto: Producto) {
    const estado = this.estado.value;
    if (estado.enviandoPedido || !estado.productos.some(p => p.id === producto.id)) return;
    this.actualizar({ items: [...estado.items, producto.id], error: '', mensaje: '' });
  }

  iniciarSesion() {
    if (this.estado.value.iniciandoSesion || this.estado.value.enviandoPedido) return;
    this.actualizar({ iniciandoSesion: true, error: '', mensaje: '' });
    this.sesionSrv.iniciar().pipe(
      finalize(() => this.actualizar({ iniciandoSesion: false }))
    ).subscribe({
      next: usuario => this.actualizar({ usuario }),
      error: error => this.actualizar({ error: this.mensajeError(error) }),
    });
  }

  enviarPedido() {
    const estado = this.estado.value;
    if (estado.enviandoPedido || estado.iniciandoSesion) return;
    // Figura 20: validar sesión y carrito antes de invocar Repo.crearPedido(items).
    if (!estado.usuario) {
      this.actualizar({ error: 'Inicia sesión de prueba antes de enviar el pedido.', mensaje: '' });
      return;
    }
    if (!estado.items.length) {
      this.actualizar({ error: 'El carrito está vacío. Agrega un producto.', mensaje: '' });
      return;
    }
    this.actualizar({ enviandoPedido: true, error: '', mensaje: '' });
    this.Repo.crearPedido([...estado.items]).pipe(
      finalize(() => this.actualizar({ enviandoPedido: false }))
    ).subscribe({
      next: pedido => this.actualizar({ items: [], mensaje: `Pedido creado. ID: ${pedido.orderId}` }),
      error: error => this.actualizar({ error: this.mensajeError(error) }),
    });
  }

  private actualizar(cambios: Partial<EstadoCarrito>) {
    this.estado.next({ ...this.estado.value, ...cambios });
  }

  private mensajeError(error: unknown): string {
    console.error('Diagnóstico de la API del carrito:', error);
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Error de red. Comprueba que Express esté disponible y vuelve a intentarlo.';
      if (error.status === 401) {
        this.actualizar({ usuario: null });
        return 'La sesión expiró. Inicia sesión de prueba de nuevo. El carrito se conserva.';
      }
      if (error.status === 403) return 'Acceso denegado. No tienes permiso para crear pedidos. El carrito se conserva.';
      if (typeof error.error?.message === 'string') return error.error.message;
      return 'No se pudo completar la solicitud. Vuelve a intentarlo.';
    }
    return error instanceof Error ? error.message : 'No se pudo completar la solicitud.';
  }
}
