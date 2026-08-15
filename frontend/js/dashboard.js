// Panel principal del chofer.
// Maneja: verificación de sesión, selector de período, alta/edición/
// eliminación de viajes y el cálculo/render del total de kms.

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const elementos = {
  usuarioNombre: document.getElementById('usuario-nombre'),
  usuarioLegajo: document.getElementById('usuario-legajo'),
  botonSalir: document.getElementById('boton-salir'),

  selectMes: document.getElementById('select-mes'),
  selectAnio: document.getElementById('select-anio'),
  totalKms: document.getElementById('total-kms'),
  totalViajes: document.getElementById('total-viajes'),

  form: document.getElementById('form-viaje'),
  viajeFecha: document.getElementById('viaje-fecha'),
  viajeUnidad: document.getElementById('viaje-unidad'),
  viajeHojaIda: document.getElementById('viaje-hoja-ida'),
  viajeHojaVuelta: document.getElementById('viaje-hoja-vuelta'),
  viajeKms: document.getElementById('viaje-kms'),
  viajePaxIda: document.getElementById('viaje-pax-ida'),
  viajePaxVuelta: document.getElementById('viaje-pax-vuelta'),
  viajeObs: document.getElementById('viaje-obs'),
  viajeMensajeError: document.getElementById('viaje-mensaje-error'),
  botonGuardarViaje: document.getElementById('boton-guardar-viaje'),
  botonLimpiar: document.getElementById('boton-limpiar'),

  historialVacio: document.getElementById('historial-vacio'),
  historialMensajeError: document.getElementById('historial-mensaje-error'),
  tabla: document.getElementById('tabla-viajes'),
  tablaCuerpo: document.getElementById('tabla-viajes-cuerpo'),

  selectAnioPanel: document.getElementById('select-anio-panel'),
  kpiKmsAnio: document.getElementById('kpi-kms-anio'),
  kpiPromedioMensual: document.getElementById('kpi-promedio-mensual'),
  kpiMesPico: document.getElementById('kpi-mes-pico'),
  canvasPanel: document.getElementById('grafico-kms-mensual'),

  modalConfirmar: document.getElementById('modal-confirmar'),
  modalConfirmarTitulo: document.getElementById('modal-confirmar-titulo'),
  modalConfirmarTexto: document.getElementById('modal-confirmar-texto'),
  botonCancelarConfirmar: document.getElementById('boton-cancelar-confirmar'),
  botonAceptarConfirmar: document.getElementById('boton-aceptar-confirmar'),

  botonesPestana: document.querySelectorAll('.pestanas__boton'),
  contenidosPestana: document.querySelectorAll('[data-pestana-contenido]'),

  selectMesInforme: document.getElementById('select-mes-informe'),
  selectAnioInforme: document.getElementById('select-anio-informe'),
  informeVacio: document.getElementById('informe-vacio'),
  tablaInforme: document.getElementById('tabla-informe'),
  tablaInformeCuerpo: document.getElementById('tabla-informe-cuerpo'),
  informeTotalKms: document.getElementById('informe-total-kms'),
  botonActualizarVista: document.getElementById('boton-actualizar-vista'),
  botonDescargarExcel: document.getElementById('boton-descargar-excel'),

  selectMesConfig: document.getElementById('select-mes-config'),
  selectAnioConfig: document.getElementById('select-anio-config'),
  configMensaje: document.getElementById('config-mensaje'),
  botonBorrarMes: document.getElementById('boton-borrar-mes')
};

let accionConfirmada = null; // callback pendiente del modal genérico

// ---------- Sesión ----------

async function cargarSesion() {
  try {
    const respuesta = await fetch('/api/auth/me');
    if (!respuesta.ok) {
      window.location.href = 'index.html';
      return;
    }
    const datos = await respuesta.json();
    elementos.usuarioNombre.textContent = datos.chofer.nombre_completo;
    elementos.usuarioLegajo.textContent = `Legajo ${datos.chofer.legajo}`;
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    window.location.href = 'index.html';
  }
}

elementos.botonSalir.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = 'index.html';
  }
});

// ---------- Selector de período ----------

function inicializarSelectorPeriodo() {
  const hoy = new Date();

  NOMBRES_MES.forEach((nombre, indice) => {
    const opcion = document.createElement('option');
    opcion.value = indice + 1;
    opcion.textContent = nombre;
    elementos.selectMes.appendChild(opcion);
  });
  elementos.selectMes.value = hoy.getMonth() + 1;

  const anioActual = hoy.getFullYear();
  for (let anio = anioActual; anio >= anioActual - 3; anio--) {
    const opcion = document.createElement('option');
    opcion.value = anio;
    opcion.textContent = anio;
    elementos.selectAnio.appendChild(opcion);
  }
  elementos.selectAnio.value = anioActual;

  elementos.selectMes.addEventListener('change', cargarViajes);
  elementos.selectAnio.addEventListener('change', cargarViajes);
}

// ---------- Carga y render del historial ----------

async function cargarViajes() {
  const mes = elementos.selectMes.value;
  const anio = elementos.selectAnio.value;

  try {
    const respuesta = await fetch(`/api/viajes?mes=${mes}&anio=${anio}`);

    if (respuesta.status === 401) {
      window.location.href = 'index.html';
      return;
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error('Error al obtener viajes:', datos.error);
      return;
    }

    elementos.totalKms.textContent = datos.total_kms.toLocaleString('es-AR');
    elementos.totalViajes.textContent = datos.cantidad_viajes;

    renderizarTabla(datos.viajes);
  } catch (error) {
    console.error('Error de red al obtener viajes:', error);
  }
}

let idViajeEnEdicion = null;

function renderizarTabla(viajes) {
  window.__viajesDelPeriodo = viajes;
  elementos.tablaCuerpo.innerHTML = '';

  if (viajes.length === 0) {
    elementos.tabla.hidden = true;
    elementos.historialVacio.hidden = false;
    return;
  }

  elementos.historialVacio.hidden = true;
  elementos.tabla.hidden = false;

  viajes.forEach((viaje) => {
    const fila = document.createElement('tr');
    fila.dataset.id = viaje.id_viaje;

    if (viaje.id_viaje === idViajeEnEdicion) {
      fila.classList.add('fila-en-edicion');
      fila.innerHTML = filaEdicionHtml(viaje);
    } else {
      fila.innerHTML = filaLecturaHtml(viaje);
    }

    elementos.tablaCuerpo.appendChild(fila);
  });
}

function filaLecturaHtml(viaje) {
  return `
    <td data-etiqueta="Fecha">${formatearFecha(viaje.fecha)}</td>
    <td data-etiqueta="Unidad">${escaparHtml(viaje.unidad)}</td>
    <td data-etiqueta="Hoja ida">${escaparHtml(viaje.hoja_ida)}</td>
    <td data-etiqueta="Hoja vuelta">${escaparHtml(viaje.hoja_vuelta)}</td>
    <td data-etiqueta="Kms" class="celda-kms">${viaje.kms}</td>
    <td data-etiqueta="Pax (i/v)">${viaje.pax_ida} / ${viaje.pax_vuelta}</td>
    <td data-etiqueta="Observaciones" class="celda-obs">${viaje.obs ? escaparHtml(viaje.obs) : '—'}</td>
    <td data-etiqueta="Acciones" class="celda-acciones">
      <div class="tabla__acciones">
        <button type="button" class="boton--icono" title="Editar" data-accion="editar" data-id="${viaje.id_viaje}" ><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#E2A33B"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg></button>
        <button type="button" class="boton--icono" title="Eliminar" data-accion="eliminar" data-id="${viaje.id_viaje}"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#E2A33B"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg></button>
      </div>
    </td>
  `;
}

// Fila en modo edición: cada celda se reemplaza por su input
// correspondiente, editando directo sobre la tabla (sin ir al
// formulario de arriba).
function filaEdicionHtml(viaje) {
  return `
    <td data-etiqueta="Fecha"><input type="date" class="input-fila" data-campo="fecha" value="${viaje.fecha.substring(0, 10)}"></td>
    <td data-etiqueta="Unidad"><input type="text" class="input-fila" data-campo="unidad" value="${escaparAtributo(viaje.unidad)}"></td>
    <td data-etiqueta="Hoja ida"><input type="text" class="input-fila" data-campo="hoja_ida" value="${escaparAtributo(viaje.hoja_ida)}"></td>
    <td data-etiqueta="Hoja vuelta"><input type="text" class="input-fila" data-campo="hoja_vuelta" value="${escaparAtributo(viaje.hoja_vuelta)}"></td>
    <td data-etiqueta="Kms"><input type="number" class="input-fila input-fila--corta" data-campo="kms" min="1" max="5000" step="1" value="${viaje.kms}"></td>
    <td data-etiqueta="Pax (i/v)">
      <div class="input-fila-par">
        <input type="number" class="input-fila input-fila--corta" data-campo="pax_ida" min="0" step="1" value="${viaje.pax_ida}">
        <input type="number" class="input-fila input-fila--corta" data-campo="pax_vuelta" min="0" step="1" value="${viaje.pax_vuelta}">
      </div>
    </td>
    <td data-etiqueta="Observaciones"><input type="text" class="input-fila" data-campo="obs" maxlength="100" value="${escaparAtributo(viaje.obs || '')}"></td>
    <td data-etiqueta="Acciones" class="celda-acciones">
      <div class="tabla__acciones">
        <button type="button" class="boton--icono" title="Guardar" data-accion="guardar-edicion" data-id="${viaje.id_viaje}"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#E2A33B"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg></button>
        <button type="button" class="boton--icono" title="Cancelar" data-accion="cancelar-edicion" data-id="${viaje.id_viaje}"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#E2A33B"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></button>
      </div>
    </td>
  `;
}
function formatearFecha(fechaISO) {
  const [anio, mes, dia] = fechaISO.substring(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function escaparAtributo(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML.replace(/"/g, '&quot;');
}

function datosDeFilaEdicion(fila) {
  const datos = {};
  fila.querySelectorAll('[data-campo]').forEach((input) => {
    datos[input.dataset.campo] = input.value.trim();
  });
  return datos;
}

// Delegación de eventos para los botones de cada fila (lectura y edición)
elementos.tablaCuerpo.addEventListener('click', (evento) => {
  const boton = evento.target.closest('button[data-accion]');
  if (!boton) return;

  const idViaje = Number(boton.dataset.id);
  const accion = boton.dataset.accion;

  if (accion === 'editar') {
    ocultarErrorHistorial();
    idViajeEnEdicion = idViaje;
    renderizarTabla(window.__viajesDelPeriodo || []);
  } else if (accion === 'cancelar-edicion') {
    idViajeEnEdicion = null;
    renderizarTabla(window.__viajesDelPeriodo || []);
  } else if (accion === 'guardar-edicion') {
    const fila = boton.closest('tr');
    const datos = datosDeFilaEdicion(fila);
    pedirConfirmacion(
      'Guardar cambios',
      '¿Confirmás los cambios sobre este viaje?',
      () => guardarEdicionFila(idViaje, datos)
    );
  } else if (accion === 'eliminar') {
    pedirConfirmacion(
      'Eliminar viaje',
      '¿Seguro que querés eliminar este viaje? Esta acción no se puede deshacer.',
      () => eliminarViaje(idViaje)
    );
  }
});

function mostrarErrorHistorial(texto) {
  elementos.historialMensajeError.textContent = texto;
  elementos.historialMensajeError.hidden = false;
}

function ocultarErrorHistorial() {
  elementos.historialMensajeError.hidden = true;
}

async function guardarEdicionFila(idViaje, datos) {
  const resultado = await enviarViaje(idViaje, datos);

  if (resultado.error) {
    mostrarErrorHistorial(resultado.error);
    return;
  }

  idViajeEnEdicion = null;
  await cargarViajes();
  await cargarPanelAnual();
}

// ---------- Alta de viajes ----------

function fechaDeHoyISO() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function limpiarFormulario() {
  elementos.form.reset();
  elementos.viajeFecha.value = fechaDeHoyISO();
  elementos.viajePaxIda.value = 0;
  elementos.viajePaxVuelta.value = 0;
  ocultarErrorViaje();
}

function mostrarErrorViaje(texto) {
  elementos.viajeMensajeError.textContent = texto;
  elementos.viajeMensajeError.hidden = false;
}

function ocultarErrorViaje() {
  elementos.viajeMensajeError.hidden = true;
  elementos.viajeMensajeError.textContent = '';
}

function datosDelFormulario() {
  return {
    fecha: elementos.viajeFecha.value,
    unidad: elementos.viajeUnidad.value.trim(),
    hoja_ida: elementos.viajeHojaIda.value.trim(),
    hoja_vuelta: elementos.viajeHojaVuelta.value.trim(),
    kms: elementos.viajeKms.value,
    pax_ida: elementos.viajePaxIda.value || 0,
    pax_vuelta: elementos.viajePaxVuelta.value || 0,
    obs: elementos.viajeObs.value.trim()
  };
}

elementos.botonLimpiar.addEventListener('click', limpiarFormulario);

elementos.form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarErrorViaje();

  elementos.botonGuardarViaje.disabled = true;
  const resultado = await enviarViaje(null, datosDelFormulario());
  elementos.botonGuardarViaje.disabled = false;

  if (resultado.error) {
    mostrarErrorViaje(resultado.error);
    return;
  }

  limpiarFormulario();
  await cargarViajes();
  await cargarPanelAnual();
});

// Único punto de contacto con la API para crear (idViaje=null) o
// modificar (idViaje presente) un viaje. Lo usan tanto el formulario
// de alta como la edición inline de la tabla.
async function enviarViaje(idViaje, datos) {
  const esEdicion = Boolean(idViaje);
  const url = esEdicion ? `/api/viajes/${idViaje}` : '/api/viajes';
  const metodo = esEdicion ? 'PUT' : 'POST';

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    if (respuesta.status === 401) {
      window.location.href = 'index.html';
      return { error: null };
    }

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      return { error: resultado.error || 'No se pudo guardar el viaje.' };
    }

    return { error: null };
  } catch (error) {
    console.error('Error de red al guardar el viaje:', error);
    return { error: 'No se pudo conectar con el servidor. Probá de nuevo.' };
  }
}

async function eliminarViaje(idViaje) {
  try {
    const respuesta = await fetch(`/api/viajes/${idViaje}`, { method: 'DELETE' });

    if (respuesta.status === 401) {
      window.location.href = 'index.html';
      return;
    }

    if (!respuesta.ok) {
      const resultado = await respuesta.json();
      console.error('Error al eliminar viaje:', resultado.error);
      return;
    }

    await cargarViajes();
    await cargarPanelAnual();
  } catch (error) {
    console.error('Error de red al eliminar el viaje:', error);
  }
}

// ---------- Panel anual (KPIs + gráfico) ----------

let graficoKmsMensual = null;

function inicializarSelectorAnioPanel() {
  const anioActual = new Date().getFullYear();
  for (let anio = anioActual; anio >= anioActual - 3; anio--) {
    const opcion = document.createElement('option');
    opcion.value = anio;
    opcion.textContent = anio;
    elementos.selectAnioPanel.appendChild(opcion);
  }
  elementos.selectAnioPanel.value = anioActual;
  elementos.selectAnioPanel.addEventListener('change', cargarPanelAnual);
}

async function cargarPanelAnual() {
  const anio = elementos.selectAnioPanel.value;

  try {
    const respuesta = await fetch(`/api/viajes/resumen?anio=${anio}`);

    if (respuesta.status === 401) {
      window.location.href = 'index.html';
      return;
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error('Error al obtener el resumen anual:', datos.error);
      return;
    }

    renderizarKpis(datos.meses);
    renderizarGraficoMensual(datos.meses);
  } catch (error) {
    console.error('Error de red al obtener el resumen anual:', error);
  }
}

function renderizarKpis(meses) {
  const totalAnio = meses.reduce((acumulado, m) => acumulado + m.total_kms, 0);
  const mesesConDatos = meses.filter((m) => m.total_kms > 0).length;
  const promedio = mesesConDatos > 0 ? Math.round(totalAnio / mesesConDatos) : 0;

  const mesPico = meses.reduce((max, m) => (m.total_kms > max.total_kms ? m : max), meses[0]);

  elementos.kpiKmsAnio.textContent = `${totalAnio.toLocaleString('es-AR')} km`;
  elementos.kpiPromedioMensual.textContent = `${promedio.toLocaleString('es-AR')} km`;
  elementos.kpiMesPico.textContent = mesPico.total_kms > 0
    ? `${NOMBRES_MES[mesPico.mes - 1]} (${mesPico.total_kms.toLocaleString('es-AR')} km)`
    : '—';
}

function renderizarGraficoMensual(meses) {
  const etiquetas = meses.map((m) => NOMBRES_MES[m.mes - 1].substring(0, 3));
  const valores = meses.map((m) => m.total_kms);

  const estilos = getComputedStyle(document.documentElement);
  const colorTexto = estilos.getPropertyValue('--color-texto-suave').trim();
  const colorGrilla = estilos.getPropertyValue('--color-borde').trim();
  const colorBarra = estilos.getPropertyValue('--color-ambar').trim();

  // Si ya había un gráfico dibujado (por ej. al cambiar de año o de
  // tema), lo destruimos antes de crear uno nuevo para no duplicar
  // canvases.
  if (graficoKmsMensual) {
    graficoKmsMensual.destroy();
  }

  graficoKmsMensual = new Chart(elementos.canvasPanel, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [{
        label: 'Kms por mes',
        data: valores,
        backgroundColor: colorBarra,
        borderRadius: 4,
        maxBarThickness: 34
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: colorTexto },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: colorTexto },
          grid: { color: colorGrilla }
        }
      }
    }
  });
}

// ---------- Modal de confirmación genérico ----------

function pedirConfirmacion(titulo, texto, callback) {
  elementos.modalConfirmarTitulo.textContent = titulo;
  elementos.modalConfirmarTexto.textContent = texto;
  accionConfirmada = callback;
  elementos.modalConfirmar.hidden = false;
}

function cerrarModalConfirmacion() {
  elementos.modalConfirmar.hidden = true;
  accionConfirmada = null;
}

elementos.botonCancelarConfirmar.addEventListener('click', cerrarModalConfirmacion);

elementos.botonAceptarConfirmar.addEventListener('click', () => {
  const callback = accionConfirmada;
  cerrarModalConfirmacion();
  if (callback) callback();
});

// ---------- Navegación por pestañas ----------

function cambiarPestana(nombrePestana) {
  elementos.botonesPestana.forEach((boton) => {
    const activo = boton.dataset.pestana === nombrePestana;
    boton.setAttribute('aria-selected', activo ? 'true' : 'false');
  });

  elementos.contenidosPestana.forEach((contenido) => {
    contenido.hidden = contenido.dataset.pestanaContenido !== nombrePestana;
  });
}

function inicializarPestanas() {
  elementos.botonesPestana.forEach((boton) => {
    boton.addEventListener('click', () => cambiarPestana(boton.dataset.pestana));
  });
  cambiarPestana('cargar');
}

// ---------- Informe final: previsualización y exportación ----------

function inicializarSelectorPeriodoInforme() {
  const hoy = new Date();

  NOMBRES_MES.forEach((nombre, indice) => {
    const opcion = document.createElement('option');
    opcion.value = indice + 1;
    opcion.textContent = nombre;
    elementos.selectMesInforme.appendChild(opcion);
  });
  elementos.selectMesInforme.value = hoy.getMonth() + 1;

  const anioActual = hoy.getFullYear();
  for (let anio = anioActual; anio >= anioActual - 3; anio--) {
    const opcion = document.createElement('option');
    opcion.value = anio;
    opcion.textContent = anio;
    elementos.selectAnioInforme.appendChild(opcion);
  }
  elementos.selectAnioInforme.value = anioActual;

  elementos.selectMesInforme.addEventListener('change', cargarInforme);
  elementos.selectAnioInforme.addEventListener('change', cargarInforme);
  elementos.botonActualizarVista.addEventListener('click', cargarInforme);
}

// RF-09: previsualizar la liquidación mensual antes de exportarla.
async function cargarInforme() {
  const mes = elementos.selectMesInforme.value;
  const anio = elementos.selectAnioInforme.value;

  try {
    const respuesta = await fetch(`/api/viajes?mes=${mes}&anio=${anio}`);

    if (respuesta.status === 401) {
      window.location.href = 'index.html';
      return;
    }

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error('Error al obtener la previsualización:', datos.error);
      return;
    }

    elementos.informeTotalKms.textContent = `${datos.total_kms.toLocaleString('es-AR')} km`;
    renderizarTablaInforme(datos.viajes);
  } catch (error) {
    console.error('Error de red al obtener la previsualización:', error);
  }
}

function renderizarTablaInforme(viajes) {
  elementos.tablaInformeCuerpo.innerHTML = '';

  if (viajes.length === 0) {
    elementos.tablaInforme.hidden = true;
    elementos.informeVacio.hidden = false;
    return;
  }

  elementos.informeVacio.hidden = true;
  elementos.tablaInforme.hidden = false;

  viajes.forEach((viaje) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td data-etiqueta="Fecha">${formatearFecha(viaje.fecha)}</td>
      <td data-etiqueta="Unidad">${escaparHtml(viaje.unidad)}</td>
      <td data-etiqueta="Hoja ida">${escaparHtml(viaje.hoja_ida)}</td>
      <td data-etiqueta="Hoja vuelta">${escaparHtml(viaje.hoja_vuelta)}</td>
      <td data-etiqueta="Kms" class="celda-kms">${viaje.kms}</td>
      <td data-etiqueta="Pax (i/v)">${viaje.pax_ida} / ${viaje.pax_vuelta}</td>
      <td data-etiqueta="Observaciones" class="celda-obs">${viaje.obs ? escaparHtml(viaje.obs) : '—'}</td>
    `;
    elementos.tablaInformeCuerpo.appendChild(fila);
  });
}

// RF-10: descargar el Excel. Como es un archivo binario (no JSON), no
// usamos fetch: dejamos que el navegador navegue directo a la URL,
// que ya viaja con la cookie de sesión porque es el mismo origen.
elementos.botonDescargarExcel.addEventListener('click', () => {
  const mes = elementos.selectMesInforme.value;
  const anio = elementos.selectAnioInforme.value;
  window.location.href = `/api/viajes/exportar?mes=${mes}&anio=${anio}`;
});

// ---------- Configuración: borrado masivo por período ----------

function inicializarSelectorPeriodoConfig() {
  const hoy = new Date();

  NOMBRES_MES.forEach((nombre, indice) => {
    const opcion = document.createElement('option');
    opcion.value = indice + 1;
    opcion.textContent = nombre;
    elementos.selectMesConfig.appendChild(opcion);
  });
  elementos.selectMesConfig.value = hoy.getMonth() + 1;

  const anioActual = hoy.getFullYear();
  for (let anio = anioActual; anio >= anioActual - 3; anio--) {
    const opcion = document.createElement('option');
    opcion.value = anio;
    opcion.textContent = anio;
    elementos.selectAnioConfig.appendChild(opcion);
  }
  elementos.selectAnioConfig.value = anioActual;
}

function mostrarMensajeConfig(texto) {
  elementos.configMensaje.textContent = texto;
  elementos.configMensaje.hidden = false;
}

elementos.botonBorrarMes.addEventListener('click', () => {
  elementos.configMensaje.hidden = true;

  const mes = elementos.selectMesConfig.value;
  const anio = elementos.selectAnioConfig.value;
  const nombreMes = NOMBRES_MES[mes - 1];

  pedirConfirmacion(
    'Borrar mes seleccionado',
    `¿Seguro que querés eliminar TODOS los viajes de ${nombreMes} de ${anio}? Esta acción no se puede deshacer.`,
    () => borrarViajesDelPeriodo(mes, anio)
  );
});

async function borrarViajesDelPeriodo(mes, anio) {
  try {
    const respuesta = await fetch(`/api/viajes/periodo?mes=${mes}&anio=${anio}`, { method: 'DELETE' });

    if (respuesta.status === 401) {
      window.location.href = 'index.html';
      return;
    }

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      mostrarMensajeConfig(resultado.error || 'No se pudo eliminar el período.');
      return;
    }

    mostrarMensajeConfig(`Se eliminaron ${resultado.eliminados} viaje(s) correctamente.`);
    elementos.configMensaje.classList.add('mensaje-error--exito');

    // El período borrado puede coincidir con lo que se está mostrando
    // en las otras pestañas, así que refrescamos todo.
    await cargarViajes();
    await cargarPanelAnual();
  } catch (error) {
    console.error('Error de red al eliminar el período:', error);
    mostrarMensajeConfig('No se pudo conectar con el servidor. Probá de nuevo.');
  }
}

// ---------- Inicialización ----------

async function inicializar() {
  await cargarSesion();
  inicializarPestanas();
  inicializarSelectorPeriodo();
  inicializarSelectorAnioPanel();
  inicializarSelectorPeriodoInforme();
  inicializarSelectorPeriodoConfig();
  elementos.viajeFecha.value = fechaDeHoyISO();
  await cargarViajes();
  await cargarPanelAnual();
  await cargarInforme();
}

inicializar();
