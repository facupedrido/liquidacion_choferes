// Conexión a la base de datos MySQL usando un pool de conexiones.
// Usar un pool (en vez de una conexión única) permite atender varias
// peticiones simultáneas sin abrir/cerrar conexión en cada consulta.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
