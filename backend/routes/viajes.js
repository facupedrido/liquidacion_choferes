const express = require('express');
const ExcelJS = require('exceljs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const NOMBRES_MES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Todas las rutas de este archivo requieren estar logueado.
router.use(requireAuth);

// Valida los datos de un viaje según RF-04 y las reglas de la
// entrevista: todos los campos son obligatorios excepto pasajeros
// y observaciones. Replica en el backend la regla del CHECK de la
// base de datos (kms <= 5000) para poder devolver un mensaje claro
// antes de que MySQL rechace la consulta.
function validarViaje(data) {
  const errores = [];
  const { fecha, hoja_ida, hoja_vuelta, kms, unidad } = data;

  if (!fecha) errores.push('La fecha es obligatoria.');
  if (!hoja_ida || !String(hoja_ida).trim()) errores.push('La hoja de ruta de ida es obligatoria.');
  if (!hoja_vuelta || !String(hoja_vuelta).trim()) errores.push('La hoja de ruta de vuelta es obligatoria.');
  if (!unidad || !String(unidad).trim()) errores.push('La unidad es obligatoria.');

  const kmsNum = Number(kms);
  if (kms === undefined || kms === null || kms === '' || Number.isNaN(kmsNum)) {
    errores.push('Los kilómetros son obligatorios y deben ser un número.');
  } else if (!Number.isInteger(kmsNum) || kmsNum <= 0 || kmsNum > 5000) {
    errores.push('Los kilómetros deben ser un número entero entre 1 y 5000.');
  }

  return errores;
}

// GET /api/viajes?mes=&anio=
// RF-07 (total de kms del mes) + RF-08 (historial filtrable por período).
// Si no se pasan mes/año, usa el mes y año actuales.
router.get('/', async (req, res) => {
  const idChofer = req.session.chofer.id_chofer;
  const hoy = new Date();
  const mes = parseInt(req.query.mes, 10) || (hoy.getMonth() + 1);
  const anio = parseInt(req.query.anio, 10) || hoy.getFullYear();

  try {
    const [viajes] = await pool.query(
      `SELECT id_viaje, fecha, hoja_ida, hoja_vuelta, kms, pax_ida, pax_vuelta, unidad, obs
       FROM viajes
       WHERE id_chofer = ? AND MONTH(fecha) = ? AND YEAR(fecha) = ?
       ORDER BY fecha ASC, id_viaje ASC`,
      [idChofer, mes, anio]
    );

    const totalKms = viajes.reduce((acumulado, viaje) => acumulado + viaje.kms, 0);

    res.json({
      periodo: { mes, anio },
      total_kms: totalKms,
      cantidad_viajes: viajes.length,
      viajes
    });
  } catch (err) {
    console.error('Error al listar viajes:', err);
    res.status(500).json({ error: 'Error interno al obtener los viajes.' });
  }
});

// GET /api/viajes/resumen?anio=
// Alimenta el Panel anual: total de kms y cantidad de viajes por cada
// uno de los 12 meses del año, para graficar. Se declara antes de las
// rutas con :id para que Express no confunda "resumen" con un id.
router.get('/resumen', async (req, res) => {
  const idChofer = req.session.chofer.id_chofer;
  const anio = parseInt(req.query.anio, 10) || new Date().getFullYear();

  try {
    const [filas] = await pool.query(
      `SELECT MONTH(fecha) AS mes, SUM(kms) AS total_kms, COUNT(*) AS cantidad_viajes
       FROM viajes
       WHERE id_chofer = ? AND YEAR(fecha) = ?
       GROUP BY MONTH(fecha)`,
      [idChofer, anio]
    );

    // Completamos los 12 meses (incluso los que no tienen viajes) para
    // que el gráfico siempre tenga las mismas 12 barras.
    const meses = Array.from({ length: 12 }, (_, i) => ({
      mes: i + 1,
      total_kms: 0,
      cantidad_viajes: 0
    }));

    filas.forEach((fila) => {
      meses[fila.mes - 1].total_kms = Number(fila.total_kms) || 0;
      meses[fila.mes - 1].cantidad_viajes = fila.cantidad_viajes;
    });

    res.json({ anio, meses });
  } catch (err) {
    console.error('Error al generar resumen anual:', err);
    res.status(500).json({ error: 'Error interno al generar el resumen anual.' });
  }
});

// GET /api/viajes/exportar?mes=&anio=
// RF-09 (previsualización) + RF-10 (exportación a Excel) + caso de uso
// "Exportación a Excel". La previsualización en pantalla reutiliza el
// mismo GET /api/viajes de arriba; esta ruta genera el archivo final.
router.get('/exportar', async (req, res) => {
  const idChofer = req.session.chofer.id_chofer;
  const { nombre_completo, legajo, empresa } = req.session.chofer;
  const hoy = new Date();
  const mes = parseInt(req.query.mes, 10) || (hoy.getMonth() + 1);
  const anio = parseInt(req.query.anio, 10) || hoy.getFullYear();

  try {
    const [viajes] = await pool.query(
      `SELECT fecha, hoja_ida, hoja_vuelta, kms, pax_ida, pax_vuelta, unidad, obs
       FROM viajes
       WHERE id_chofer = ? AND MONTH(fecha) = ? AND YEAR(fecha) = ?
       ORDER BY fecha ASC`,
      [idChofer, mes, anio]
    );

    const libro = new ExcelJS.Workbook();
    libro.creator = 'Liquidación de Choferes — Tienda León';
    libro.created = new Date();

    const hoja = libro.addWorksheet('Liquidación', {
      views: [{ state: 'frozen', ySplit: 5 }] // el encabezado queda fijo al scrollear
    });

    // Misma paleta que css/style.css (:root), para que el Excel se vea
    // igual que la previsualización "hoja-excel" del dashboard.
    const COLOR_ASFALTO = 'FF1C2023';
    const COLOR_AMBAR = 'FFE2A33B';
    const COLOR_AMBAR_OSCURO = 'FFB87F22';
    const COLOR_BORDE = 'FFDADCD7';
    const COLOR_TEXTO_SUAVE = 'FF6B7280';
    const COLOR_PAPEL = 'FFFFFFFF';
    const COLOR_ZEBRA = 'FFFDF9F1'; // ámbar al 7% de opacidad sobre blanco
    const FUENTE_DISPLAY = 'Space Grotesk';
    const FUENTE_MONO = 'JetBrains Mono';

    const BORDE_FINO = { style: 'thin', color: { argb: COLOR_BORDE } };
    const bordeCompleto = { top: BORDE_FINO, left: BORDE_FINO, bottom: BORDE_FINO, right: BORDE_FINO };

    // Fila 1: título, igual que .hoja-excel__cabecera (fondo ámbar, texto asfalto)
    hoja.mergeCells('A1:H1');
    const celdaTitulo = hoja.getCell('A1');
    celdaTitulo.value = 'LIQUIDACIÓN DE VIAJES';
    celdaTitulo.font = { name: FUENTE_DISPLAY, bold: true, size: 14, color: { argb: COLOR_ASFALTO } };
    celdaTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_AMBAR } };
    celdaTitulo.alignment = { vertical: 'middle', horizontal: 'center' };
    hoja.getRow(1).height = 28;

    // Fila 2: metadatos del chofer, igual que .hoja-excel__meta (itálica, gris, centrada)
    hoja.mergeCells('A2:H2');
    const celdaMeta = hoja.getCell('A2');
    celdaMeta.value = `Chofer: ${nombre_completo} · Legajo ${legajo} — Período: ${NOMBRES_MES_ES[mes - 1]} de ${anio}`;
    celdaMeta.font = { italic: true, color: { argb: COLOR_TEXTO_SUAVE } };
    celdaMeta.alignment = { vertical: 'middle', horizontal: 'center' };
    celdaMeta.border = { bottom: BORDE_FINO };
    hoja.getRow(2).height = 20;

    // Fila 3: resumen (cantidad de viajes / total de kms), igual que
    // .hoja-excel__resumen (fondo ámbar muy tenue, valores en mono)
    let totalKmsPrevio = 0;
    viajes.forEach((v) => { totalKmsPrevio += v.kms; });

    hoja.mergeCells('A3:D3');
    const celdaResumenViajes = hoja.getCell('A3');
    celdaResumenViajes.value = `Cantidad de viajes: ${viajes.length}`;
    celdaResumenViajes.font = { name: FUENTE_MONO, bold: true, color: { argb: COLOR_ASFALTO } };
    celdaResumenViajes.alignment = { vertical: 'middle', horizontal: 'center' };

    hoja.mergeCells('E3:H3');
    const celdaResumenKms = hoja.getCell('E3');
    celdaResumenKms.value = `Total de kms: ${totalKmsPrevio}`;
    celdaResumenKms.font = { name: FUENTE_MONO, bold: true, color: { argb: COLOR_ASFALTO } };
    celdaResumenKms.alignment = { vertical: 'middle', horizontal: 'center' };

    hoja.getRow(3).height = 22;
    ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3'].forEach((ref) => {
      const celda = hoja.getCell(ref);
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA } };
      celda.border = { bottom: BORDE_FINO };
    });

    hoja.addRow([]);
    hoja.getRow(4).height = 6;

    // Fila 5: encabezado de la tabla, igual que .tabla--excel th
    // (fondo ámbar, texto asfalto, borde inferior ámbar oscuro)
    const filaCabecera = hoja.addRow([
      'Fecha', 'Hoja de ruta ida', 'Hoja de ruta vuelta', 'Kms',
      'Pax ida', 'Pax vuelta', 'Unidad', 'Observaciones'
    ]);
    filaCabecera.eachCell((celda) => {
      celda.font = { bold: true, color: { argb: COLOR_ASFALTO } };
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_AMBAR } };
      celda.border = { ...bordeCompleto, bottom: { style: 'thin', color: { argb: COLOR_AMBAR_OSCURO } } };
      celda.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    filaCabecera.height = 20;

    // Filas de datos: zebra ámbar tenue, igual que
    // .tabla--excel tbody tr:nth-child(even), y la columna de Kms en
    // ámbar oscuro igual que .tabla--excel td.celda-kms
    let totalKms = 0;
    viajes.forEach((viaje, indice) => {
      totalKms += viaje.kms;
      const fila = hoja.addRow([
        new Date(viaje.fecha).toISOString().substring(0, 10),
        viaje.hoja_ida,
        viaje.hoja_vuelta,
        viaje.kms,
        viaje.pax_ida,
        viaje.pax_vuelta,
        viaje.unidad,
        viaje.obs || ''
      ]);

      const esFilaPar = indice % 2 === 1;
      fila.eachCell((celda, numeroColumna) => {
        celda.border = bordeCompleto;
        if (esFilaPar) {
          celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ZEBRA } };
        }
        // Fecha y Unidad centradas; Kms/Pax alineados a la derecha
        // como números (Kms en ámbar oscuro, como en la previsualización);
        // Observaciones con ajuste de línea.
        if (numeroColumna === 1 || numeroColumna === 7) {
          celda.alignment = { horizontal: 'center' };
        } else if (numeroColumna === 4) {
          celda.font = { name: FUENTE_MONO, color: { argb: COLOR_AMBAR_OSCURO } };
          celda.alignment = { horizontal: 'right' };
          celda.numFmt = '#,##0';
        } else if ([5, 6].includes(numeroColumna)) {
          celda.font = { name: FUENTE_MONO };
          celda.alignment = { horizontal: 'right' };
          celda.numFmt = '#,##0';
        } else if (numeroColumna === 8) {
          celda.alignment = { wrapText: true };
        }
      });
    });

    if (viajes.length > 0) {
      hoja.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + viajes.length, column: 8 } };
    }

    hoja.addRow([]);
    const filaTotal = hoja.addRow(['', '', '', 'Total kms:', totalKms]);
    filaTotal.font = { bold: true, color: { argb: COLOR_ASFALTO } };
    filaTotal.getCell(4).alignment = { horizontal: 'right' };
    filaTotal.getCell(5).alignment = { horizontal: 'right' };
    filaTotal.getCell(5).font = { name: FUENTE_MONO, bold: true, color: { argb: COLOR_AMBAR_OSCURO } };
    filaTotal.getCell(5).numFmt = '#,##0';
    filaTotal.eachCell((celda) => {
      celda.border = { top: { style: 'double', color: { argb: COLOR_ASFALTO } } };
    });

    hoja.columns = [
      { width: 13 }, { width: 18 }, { width: 18 }, { width: 10 },
      { width: 10 }, { width: 12 }, { width: 12 }, { width: 32 }
    ];

    // Mismo formato de nombre de archivo que define el caso de uso
    // "Exportación a Excel": Liquidación_(nombre)_(año)-(mes).xlsx
    const nombreArchivo = `Liquidacion_${nombre_completo.replace(/\s+/g, '_')}_${anio}-${String(mes).padStart(2, '0')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

    await libro.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error al exportar el Excel:', err);
    res.status(500).json({ error: 'Error interno al generar el Excel.' });
  }
});

// DELETE /api/viajes/periodo?mes=&anio=
// Sección "Configuración": elimina de una sola vez todos los viajes
// propios de un período. Se declara antes de DELETE /:id para que
// Express no interprete "periodo" como un id numérico.
router.delete('/periodo', async (req, res) => {
  const idChofer = req.session.chofer.id_chofer;
  const mes = parseInt(req.query.mes, 10);
  const anio = parseInt(req.query.anio, 10);

  if (!mes || !anio) {
    return res.status(400).json({ error: 'Tenés que indicar mes y año.' });
  }

  try {
    const [resultado] = await pool.query(
      'DELETE FROM viajes WHERE id_chofer = ? AND MONTH(fecha) = ? AND YEAR(fecha) = ?',
      [idChofer, mes, anio]
    );

    res.json({ ok: true, eliminados: resultado.affectedRows });
  } catch (err) {
    console.error('Error al eliminar los viajes del período:', err);
    res.status(500).json({ error: 'Error interno al eliminar los viajes del período.' });
  }
});

// POST /api/viajes
// RF-04 + caso de uso "Registro de viajes".
router.post('/', async (req, res) => {
  const errores = validarViaje(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ error: errores.join(' ') });
  }

  const idChofer = req.session.chofer.id_chofer;
  const { fecha, hoja_ida, hoja_vuelta, kms, pax_ida, pax_vuelta, unidad, obs } = req.body;

  try {
    const [resultado] = await pool.query(
      `INSERT INTO viajes (id_chofer, fecha, hoja_ida, hoja_vuelta, kms, pax_ida, pax_vuelta, unidad, obs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idChofer,
        fecha,
        String(hoja_ida).trim(),
        String(hoja_vuelta).trim(),
        kms,
        pax_ida || 0,
        pax_vuelta || 0,
        String(unidad).trim(),
        obs ? String(obs).trim() : null
      ]
    );

    res.status(201).json({ ok: true, id_viaje: resultado.insertId });
  } catch (err) {
    console.error('Error al crear viaje:', err);
    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return res.status(400).json({ error: 'Los kilómetros no pueden superar 5000.' });
    }
    res.status(500).json({ error: 'Error interno al guardar el viaje.' });
  }
});

// PUT /api/viajes/:id
// RF-05 + caso de uso "Modificación de registros".
// Nota: por ahora no existe en la base un concepto de "período
// cerrado", así que se permite editar cualquier viaje propio.
// Cuando se agregue esa tabla, acá va la validación de estado.
router.put('/:id', async (req, res) => {
  const errores = validarViaje(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ error: errores.join(' ') });
  }

  const idChofer = req.session.chofer.id_chofer;
  const idViaje = parseInt(req.params.id, 10);

  if (Number.isNaN(idViaje)) {
    return res.status(400).json({ error: 'Id de viaje inválido.' });
  }

  const { fecha, hoja_ida, hoja_vuelta, kms, pax_ida, pax_vuelta, unidad, obs } = req.body;

  try {
    const [viajeExistente] = await pool.query(
      'SELECT id_chofer FROM viajes WHERE id_viaje = ?',
      [idViaje]
    );

    if (viajeExistente.length === 0) {
      return res.status(404).json({ error: 'El viaje no existe.' });
    }

    if (viajeExistente[0].id_chofer !== idChofer) {
      return res.status(403).json({ error: 'No tenés permiso para modificar este viaje.' });
    }

    await pool.query(
      `UPDATE viajes
       SET fecha = ?, hoja_ida = ?, hoja_vuelta = ?, kms = ?, pax_ida = ?, pax_vuelta = ?, unidad = ?, obs = ?
       WHERE id_viaje = ?`,
      [
        fecha,
        String(hoja_ida).trim(),
        String(hoja_vuelta).trim(),
        kms,
        pax_ida || 0,
        pax_vuelta || 0,
        String(unidad).trim(),
        obs ? String(obs).trim() : null,
        idViaje
      ]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al modificar viaje:', err);
    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return res.status(400).json({ error: 'Los kilómetros no pueden superar 5000.' });
    }
    res.status(500).json({ error: 'Error interno al modificar el viaje.' });
  }
});

// DELETE /api/viajes/:id
// RF-06 + caso de uso "Eliminación de registros".
router.delete('/:id', async (req, res) => {
  const idChofer = req.session.chofer.id_chofer;
  const idViaje = parseInt(req.params.id, 10);

  if (Number.isNaN(idViaje)) {
    return res.status(400).json({ error: 'Id de viaje inválido.' });
  }

  try {
    const [viajeExistente] = await pool.query(
      'SELECT id_chofer FROM viajes WHERE id_viaje = ?',
      [idViaje]
    );

    if (viajeExistente.length === 0) {
      return res.status(404).json({ error: 'El viaje no existe.' });
    }

    if (viajeExistente[0].id_chofer !== idChofer) {
      return res.status(403).json({ error: 'No tenés permiso para eliminar este viaje.' });
    }

    await pool.query('DELETE FROM viajes WHERE id_viaje = ?', [idViaje]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar viaje:', err);
    res.status(500).json({ error: 'Error interno al eliminar el viaje.' });
  }
});

module.exports = router;
