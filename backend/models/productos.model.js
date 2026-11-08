const { readFile } = require('node:fs/promises');

module.exports = function crearProductosModel(filePath) {
  return {
    async listar() {
      const productos = JSON.parse(await readFile(filePath, 'utf8'));
      if (!Array.isArray(productos) || !productos.every(p =>
        Number.isSafeInteger(p.id) && p.id > 0 && typeof p.nombre === 'string' &&
        Number.isFinite(p.precio) && p.precio >= 0 && typeof p.categoria === 'string')) {
        throw new Error('El archivo del catálogo no contiene productos válidos.');
      }
      return productos;
    },
  };
};
