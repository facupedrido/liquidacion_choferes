-- ============================================================
-- Migración v1 — aplicar sobre la base ya creada en MySQL Workbench
-- (esquema original: contraseña varchar(30), sin índice extra)
--
-- Ejecutar este script UNA sola vez, conectado a la base correcta:
--   USE tu_base_de_datos;   (reemplazá por el nombre real)
--
-- No borra ni modifica los datos existentes en las tablas.
-- ============================================================

-- 1) Ampliar la columna de contraseña para poder guardar un hash
--    bcrypt (~60 caracteres) en vez de texto plano.
--    Si ya tenías contraseñas en texto plano cargadas, después de
--    este ALTER hay que regenerarlas (ver seed_ejemplo.sql para el
--    formato del hash).
ALTER TABLE inicio_sesion
  MODIFY COLUMN contraseña VARCHAR(255) NOT NULL;

-- 2) Índice para acelerar las consultas de listado/historial de
--    viajes, que siempre filtran por chofer + período (mes/año).
--    IF NOT EXISTS no está soportado para índices en todas las
--    versiones de MySQL; si ya existe, este comando fallará con un
--    error de duplicado, lo cual es seguro ignorar.
ALTER TABLE viajes
  ADD INDEX idx_chofer_fecha (id_chofer, fecha);
