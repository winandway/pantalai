/* global document, location, navigator */
// Página «Sin conexión» de la app instalable (C-PWA): en español si el teléfono está en español.
document.getElementById('b').addEventListener('click', () => location.reload());
if ((navigator.language || '').toLowerCase().startsWith('es')) {
  document.documentElement.lang = 'es';
  document.title = 'Sin conexión · Pantalay';
  document.getElementById('t').textContent = 'No tienes conexión';
  document.getElementById('p').textContent =
    'Pantalay necesita internet. Tus grabaciones en curso siguen guardadas en este dispositivo.';
  document.getElementById('b').textContent = 'Intentar otra vez';
}
