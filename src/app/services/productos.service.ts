import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { Producto } from '../models/producto';
import { ApiRespuesta } from '../models/api';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<ApiRespuesta<Producto[]>>('/api/productos').pipe(
      map(respuesta => respuesta.data)
    );
  }
}
