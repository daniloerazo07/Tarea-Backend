const { readFile, writeFile, rename, rm } = require('node:fs/promises');
const { randomBytes } = require('node:crypto');

module.exports = function crearPedidosModel(filePath) {
  let cola = Promise.resolve();
  return {
    crear(usuarioId, items) {
      // La cola abarca lectura, asignación de ID y escritura dentro de este proceso.
      const operacion = cola.then(async () => {
        const pedidos = JSON.parse(await readFile(filePath, 'utf8'));
        if (!Array.isArray(pedidos) || !pedidos.every(p => Number.isSafeInteger(p.id) && p.id > 0)) {
          throw new Error('El archivo de pedidos no contiene una lista válida.');
        }
        const id = pedidos.reduce((max, p) => Math.max(max, p.id), 0) + 1;
        if (!Number.isSafeInteger(id)) throw new Error('Se agotaron los identificadores de pedidos.');
        const pedido = { id, fecha: new Date().toISOString(), estado: 'creado', usuarioId, items: [...items] };
        const temporal = `${filePath}.${randomBytes(8).toString('hex')}.tmp`;
        try {
          await writeFile(temporal, JSON.stringify([...pedidos, pedido], null, 2) + '\n', { flag: 'wx' });
          await rename(temporal, filePath);
        } catch (error) {
          await rm(temporal, { force: true }).catch(() => {});
          throw error;
        }
        return pedido;
      });
      // Un fallo se entrega al controlador sin bloquear las operaciones posteriores.
      cola = operacion.catch(() => {});
      return operacion;
    },
  };
};
