// Login: envía las credenciales al backend y, si son válidas,
// redirige al dashboard. El servidor guarda la sesión en una cookie
// httpOnly, así que acá no manejamos tokens ni localStorage.

const formulario = document.getElementById('form-login');
const mensajeError = document.getElementById('mensaje-error');
const botonIngresar = document.getElementById('boton-ingresar');

function mostrarError(texto) {
  mensajeError.textContent = texto;
  mensajeError.hidden = false;
}

function ocultarError() {
  mensajeError.hidden = true;
  mensajeError.textContent = '';
}

async function verificarSesionExistente() {
  try {
    const respuesta = await fetch('/api/auth/me');
    if (respuesta.ok) {
      window.location.href = 'dashboard.html';
    }
  } catch {
    // Si falla la verificación, simplemente dejamos al usuario en el login.
  }
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  ocultarError();

  const usuario = document.getElementById('usuario').value.trim();
  const contrasena = document.getElementById('contrasena').value;

  if (!usuario || !contrasena) {
    mostrarError('Completá usuario y contraseña.');
    return;
  }

  botonIngresar.disabled = true;
  botonIngresar.textContent = 'Ingresando…';

  try {
    const respuesta = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contrasena })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarError(datos.error || 'No se pudo iniciar sesión.');
      return;
    }

    window.location.href = 'dashboard.html';
  } catch (error) {
    console.error('Error de red al iniciar sesión:', error);
    mostrarError('No se pudo conectar con el servidor. Probá de nuevo.');
  } finally {
    botonIngresar.disabled = false;
    botonIngresar.textContent = 'Ingresar';
  }
});

verificarSesionExistente();
