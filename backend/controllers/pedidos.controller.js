module.exports = (productos, pedidos) => async (req, res) => {
  const catalogo = await productos.listar();
  const ids = new Set(catalogo.map(producto => producto.id));
  if (req.body.items.some(id => !ids.has(id))) {
    return res.status(400).json({ status: 'error', message: 'Algún producto del pedido no existe.' });
  }
  const pedido = await pedidos.crear(req.session.usuario.id, req.body.items);
  res.status(201).json({
    status: 'ok',
    data: { orderId: pedido.id, fecha: pedido.fecha, estado: pedido.estado },
  });
};
