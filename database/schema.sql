-- ============================================================
-- Base de datos: liquidacion_choferes
-- Cambios respecto al esquema original (confirmados con el cliente):
--   1) inicio_sesion.contraseña: varchar(30) -> varchar(255)
--      Motivo: se va a guardar un hash bcrypt (~60 caracteres),
--      nunca la contraseña en texto plano.
--   2) Se agrega un índice (id_chofer, fecha) en viajes.
--      Motivo: las consultas de listado/historial siempre filtran
--      por chofer + período (mes/año), y este índice acelera esas
--      consultas. No cambia la estructura ni el comportamiento.
-- ============================================================

CREATE DATABASE IF NOT EXISTS liquidacion_choferes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE liquidacion_choferes;

CREATE TABLE inicio_sesion (
  id_usuario INT AUTO_INCREMENT,
  usuario VARCHAR(30) NOT NULL UNIQUE,
  contraseña VARCHAR(255) NOT NULL, -- hash bcrypt, no texto plano
  PRIMARY KEY (id_usuario)
);

CREATE TABLE choferes (
  id_chofer INT AUTO_INCREMENT,
  id_usuario INT,
  nombre_completo VARCHAR(50) NOT NULL UNIQUE,
  legajo VARCHAR(20) NOT NULL UNIQUE,
  empresa VARCHAR(30) NOT NULL DEFAULT 'Tienda León',
  PRIMARY KEY (id_chofer),
  FOREIGN KEY (id_usuario) REFERENCES inicio_sesion (id_usuario)
);

CREATE TABLE viajes (
  id_viaje INT AUTO_INCREMENT,
  id_chofer INT,
  fecha DATE DEFAULT (CURRENT_DATE()),
  hoja_ida VARCHAR(20) NOT NULL,
  hoja_vuelta VARCHAR(20) NOT NULL,
  kms INT NOT NULL CHECK (kms <= 5000),
  pax_ida INT DEFAULT 0,
  pax_vuelta INT DEFAULT 0,
  unidad VARCHAR(10) NOT NULL,
  obs VARCHAR(100),
  PRIMARY KEY (id_viaje),
  FOREIGN KEY (id_chofer) REFERENCES choferes (id_chofer),
  INDEX idx_chofer_fecha (id_chofer, fecha)
);
