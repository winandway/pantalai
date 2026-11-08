// La ventanita de la extensión: encender y apagar el dibujo y el cursor en la pestaña, y grabar un reporte de error.
import { ORIGEN_PANTALAY, type EstadoCapa, type MensajeInterno, type RespuestaCapa } from './mensajes';

const t = (k: string) => chrome.i18n.getMessage(k) || k;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

document.documentElement.lang = chrome.i18n.getUILanguage().startsWith('es') ? 'es' : 'en';
document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
  el.textContent = t(el.dataset.i18n!);
});

const enviar = (m: MensajeInterno) => chrome.runtime.sendMessage(m);

function pintar(r: RespuestaCapa) {
  const bloqueada = 'error' in r;
  $('no-permitida').hidden = !bloqueada;
  for (const que of ['dibujo', 'cursor'] as const) {
    const b = $<HTMLButtonElement>(que);
    b.disabled = bloqueada;
    const on = !bloqueada && (r as EstadoCapa)[que];
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.estado')!.textContent = bloqueada ? '' : t(on ? 'encendido' : 'apagado');
  }
  $<HTMLButtonElement>('reporte').disabled = bloqueada;
}

void enviar({ tipo: 'estado' }).then((r) => pintar(r as RespuestaCapa));
for (const que of ['dibujo', 'cursor'] as const) {
  $('' + que).addEventListener('click', () => {
    void enviar({ tipo: 'alternar', que }).then((r) => {
      pintar(r as RespuestaCapa);
      // Al encender el dibujo, la ventanita se cierra para que se pueda dibujar de una.
      if (que === 'dibujo' && !('error' in (r as RespuestaCapa)) && (r as EstadoCapa).dibujo) window.close();
    });
  });
}
$('reporte').addEventListener('click', () => {
  void enviar({ tipo: 'reporte' }).then(() => window.close());
});
$('abrir').addEventListener('click', () => {
  window.open(`${ORIGEN_PANTALAY}/record`, '_blank', 'noopener');
  window.close();
});
