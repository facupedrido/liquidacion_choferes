-- ============================================================
-- Datos de ejemplo para poder probar el login.
-- Usuario: jperez   /   Contraseña: chofer123
--
-- El hash de abajo corresponde a "chofer123" generado con bcrypt
-- (10 rounds). NUNCA se guarda la contraseña en texto plano.
-- Para dar de alta choferes reales, generar el hash con el mismo
-- método (ver backend/generar_hash.js) y reemplazar acá.
-- ============================================================

INSERT INTO inicio_sesion (usuario, contraseña)
VALUES ('jperez', '$2b$10$JeX8wbcqG4EXTk58VqkufO0ctSDexoJLwMXcqh2NnpU5OKXkDuk0O');

INSERT INTO choferes (id_usuario, nombre_completo, legajo, empresa)
VALUES (LAST_INSERT_ID(), 'Juan Pérez', 'LEG-001', 'Tienda León');
