import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CarritoStore } from '../../services/carrito.store';
import { ProductosService } from '../../services/productos.service';
import { ProductoCardComponent } from './producto-card.component';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ProductoCardComponent],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent implements OnInit {
  titulo = 'Listado de productos';
  private readonly destroyRef = inject(DestroyRef);

  constructor(private productosSrv: ProductosService, public carrito: CarritoStore) {}

  ngOnInit() {
    this.cargarProductos();
  }

  cargarProductos() {
    if (!this.carrito.iniciarCargaProductos()) return;
    this.productosSrv.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.carrito.finalizarCargaProductos()),
    ).subscribe({
      next: productos => this.carrito.recibirProductos(productos),
      error: error => this.carrito.errorProductos(error),
    });
  }
  // AsyncPipe libera la suscripción de larga duración al destruir la vista.
}
