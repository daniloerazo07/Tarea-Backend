import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Producto } from '../../models/producto';

@Component({
  selector: 'app-producto-card',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <article>
      <h2>{{ producto.nombre }}</h2>
      <p>Categoría: {{ producto.categoria }}</p>
      <p>Precio: {{ producto.precio | currency:'USD':'symbol':'1.2-2' }}</p>
      <button type="button" [disabled]="bloqueado" (click)="agregar.emit(producto)">Agregar al carrito</button>
    </article>
  `,
  styles: [`article { border: 1px solid; padding: 1rem; margin: 1rem 0; }`],
})
export class ProductoCardComponent {
  @Input({ required: true }) producto!: Producto;
  @Input() bloqueado = false;
  @Output() agregar = new EventEmitter<Producto>();
}
