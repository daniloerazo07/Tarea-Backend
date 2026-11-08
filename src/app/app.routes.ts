import { Routes } from '@angular/router';
import { ProductosComponent } from './features/productos/productos.component';

export const routes: Routes = [
  { path: '', component: ProductosComponent },
  { path: '**', redirectTo: '' },
];
