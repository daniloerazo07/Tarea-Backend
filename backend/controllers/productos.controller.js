module.exports = productos => async (req, res) => {
  const data = await productos.listar();
  res.status(200).json({ status: 'ok', data });
};
