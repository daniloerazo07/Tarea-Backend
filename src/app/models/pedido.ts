export interface Pedido {
  id: number;
  fecha: string;
  estado: string;
  usuarioId: number;
  items: number[];
}

export interface PedidoCreado {
  orderId: number;
  fecha: string;
  estado: string;
}
