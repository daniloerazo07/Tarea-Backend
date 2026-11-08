import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { PedidoCreado } from '../models/pedido';
import { ApiRespuesta } from '../models/api';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  constructor(private http: HttpClient) {}

  crearPedido(items: number[]) {
    return this.http.post<ApiRespuesta<PedidoCreado>>('/api/pedidos', { items }, {
      observe: 'response',
    }).pipe(map(respuesta => {
      const data = respuesta.body?.data;
      if (respuesta.status !== 201 || respuesta.body?.status !== 'ok' ||
          !data || !Number.isSafeInteger(data.orderId) || data.orderId <= 0) {
        throw new Error('La API no confirmó la creación del pedido. El carrito se conserva.');
      }
      return data;
    }));
  }
}
