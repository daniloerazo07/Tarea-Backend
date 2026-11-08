module.exports = function crearPedidosPostgresModel(pool) {
  return {
    async inicializar() {
      await pool.query(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        estado TEXT NOT NULL DEFAULT 'creado',
        usuario_id INTEGER NOT NULL,
        items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array')
      )`);
    },
    async crear(usuarioId, items) {
      const { rows: [row] } = await pool.query(
        'INSERT INTO pedidos (usuario_id, items) VALUES ($1, $2::jsonb) RETURNING *',
        [usuarioId, JSON.stringify(items)],
      );
      return {
        id: row.id, fecha: row.fecha.toISOString(), estado: row.estado,
        usuarioId: row.usuario_id, items: row.items,
      };
    },
  };
};
