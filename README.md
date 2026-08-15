# Liquidación de Choferes — Tienda León

Sistema web para que cada chofer cargue sus viajes (kilómetros, hojas
de ruta, pasajeros) en lugar de anotarlos a mano, con el total de kms
del mes calculado automáticamente.

## 1. Requisitos

- Node.js instalado (v18 o superior).
- Tu base de datos MySQL ya creada en MySQL Workbench, con el esquema
  original (`inicio_sesion`, `choferes`, `viajes`).

## 2. Preparar la base de datos

Como tu base ya está creada con el esquema original, **no ejecutes
`database/schema.sql`** (recrearía las tablas desde cero). En cambio:

1. Abrí `database/migracion_v1.sql` en Workbench, conectado a tu base.
2. Ejecutalo una sola vez. Esto:
   - Amplía la columna `contraseña` a `varchar(255)` para poder
     guardar un hash bcrypt en vez de texto plano.
   - Agrega un índice en `viajes (id_chofer, fecha)` para que el
     listado por período sea más rápido.
3. (Opcional, para probar) Ejecutá `database/seed_ejemplo.sql` para
   crear un chofer de prueba:
   - Usuario: `jperez`
   - Contraseña: `chofer123`

### Dar de alta choferes reales

Como las contraseñas se guardan hasheadas, no se pueden insertar a
mano como texto plano. Generá el hash con:

```bash
cd backend
node generar_hash.js "laContraseñaDelChofer"
```

Eso imprime un texto como `$2b$10$...`. Copiá ese valor en la columna
`contraseña` al insertar el chofer en `inicio_sesion`, y después el
registro correspondiente en `choferes` con su `id_usuario`.

## 3. Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
```

Editá `.env` con los datos reales de tu servidor MySQL:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=nombre_de_tu_base
SESSION_SECRET=una_clave_larga_y_aleatoria
PORT=3000
```

## 4. Levantar el sistema

```bash
cd backend
node server.js
```

Abrí el navegador en **http://localhost:3000**. Vas a ver la pantalla
de login; desde ahí entrás al panel principal.

## 5. Qué incluye el sistema

La pantalla principal está organizada en 4 pestañas:

- **📋 Cargar viaje**: resumen de kms del período (RF-07) + alta de
  viajes (RF-04), con validación de campos obligatorios y de kms
  (entero entre 1 y 5000).
- **📊 Historial**: tabla de viajes del período con edición y
  eliminación (RF-05/RF-06, con confirmación antes de aplicar el
  cambio o el borrado) + Panel anual con KPIs y gráfico de kms por mes.
- **📄 Informe final**: previsualización de la liquidación mensual
  (RF-09) y descarga en Excel (RF-10), con el nombre de archivo
  `Liquidacion_(nombre)_(año)-(mes).xlsx` que define el caso de uso.
- **⚙️ Configuración**: borrado masivo de todos los viajes de un
  período (mes/año), con confirmación previa.

Además:
- **Login** (RF-01/02/03): valida usuario y contraseña (hasheada con
  bcrypt) y carga automáticamente nombre, legajo y empresa del chofer
  en la sesión.

## 6. Pendiente para una próxima etapa (no incluido todavía)

- **Períodos cerrados**: RF-05 pide que no se pueda editar un viaje
  que pertenezca a una liquidación ya cerrada. Hoy la base de datos
  no tiene ninguna tabla ni columna que registre ese estado, así que
  por ahora se puede editar/eliminar/exportar cualquier viaje propio.
  Cuando se defina cómo se va a marcar un período como "cerrado", hay
  que agregar esa lógica acá.
- **Roles de RR.HH. / contable** para revisar y cerrar liquidaciones.

## 7. Estructura del proyecto

```
backend/    → API Node.js/Express (login, sesión, CRUD de viajes)
frontend/   → HTML/CSS/JS servido por el mismo backend
database/   → migracion_v1.sql (aplicar), schema.sql (referencia
              completa, no ejecutar sobre tu base existente),
              seed_ejemplo.sql (chofer de prueba)
```
