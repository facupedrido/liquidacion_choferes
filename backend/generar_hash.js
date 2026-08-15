// Utilidad para generar el hash de una contraseña antes de insertar
// un chofer nuevo directamente en la base de datos (por ejemplo,
// desde MySQL Workbench).
//
// Uso:
//   node generar_hash.js "laContraseñaDelChofer"
//
// El script imprime el hash que hay que pegar en la columna
// `contraseña` de la tabla `inicio_sesion`.

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Uso: node generar_hash.js "contraseña"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
