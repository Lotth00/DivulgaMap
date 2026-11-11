// Id inteiro positivo dentro do limite do Postgres, ou null
function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

module.exports = idValido;
