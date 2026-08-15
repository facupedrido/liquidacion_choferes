// Alterna entre tema claro y oscuro, y guarda la preferencia en el
// navegador (localStorage) para que se mantenga entre visitas.
// El <script> inline en el <head> de cada página ya aplicó el tema
// guardado antes de pintar, así que acá solo conectamos el botón.

function inicializarBotonTema() {
  const boton = document.getElementById('boton-tema');
  if (!boton) return;

  function actualizarIcono() {
    const temaActual = document.documentElement.getAttribute('data-tema');
    boton.textContent = temaActual === 'oscuro' ? '☀️' : '🌙';
  }

  actualizarIcono();

  boton.addEventListener('click', () => {
    const temaActual = document.documentElement.getAttribute('data-tema');
    const nuevoTema = temaActual === 'oscuro' ? 'claro' : 'oscuro';
    document.documentElement.setAttribute('data-tema', nuevoTema);
    localStorage.setItem('tema', nuevoTema);
    actualizarIcono();

    // El gráfico del Panel anual usa colores fijos calculados al
    // dibujarse; si existe, lo volvemos a pintar para que tome los
    // colores del tema nuevo.
    if (typeof cargarPanelAnual === 'function') {
      cargarPanelAnual();
    }
  });
}

inicializarBotonTema();
