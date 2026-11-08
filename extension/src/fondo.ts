// Fondo de la extensión (service worker): enciende la capa de dibujo y el énfasis del cursor en la pestaña, arranca
// el reporte de error y le entrega a Pantalay lo que se recogió. CANDADOS C-EXTENSION y C-REPORTE-ERROR.
import { limpiarRegistros, limpiarTexto, limpiarUrl } from '../../web/src/logica/registros';
import {
  ORIGEN_PANTALAY,
  origenPermitido,
  type Capa,
  type MensajeExterno,
  type MensajeInterno,
  type RespuestaCapa,
} from './mensajes';

type Reporte = { tabId: number; url: string; titulo: string; inicio: number };

async function pestanaActiva(): Promise<chrome.tabs.Tab | undefined> {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t;
}

/** Pone la capa en la pestaña (una sola vez) y la enciende o apaga. En chrome:// o la tienda, Chrome no deja. */
async function capa(tabId: number, que: Capa | 'estado'): Promise<RespuestaCapa> {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['capa.js'] });
    const [r] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (q: string) => {
        const w = window as unknown as { __pantalayCapa?: { alternar(q: string): unknown } };
        return w.__pantalayCapa?.alternar(q);
      },
      args: [que],
    });
    return (r?.result as RespuestaCapa | undefined) ?? { error: 'no_permitida' };
  } catch {
    return { error: 'no_permitida' };
  }
}

/** Empieza a recoger consola y red en la pestaña y abre Pantalay para grabar en modo reporte. */
async function empezarReporte(tabId: number, origen = ORIGEN_PANTALAY): Promise<{ ok: boolean }> {
  if (!origenPermitido(origen)) return { ok: false };
  const tab = await chrome.tabs.get(tabId);
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['espia.js'], world: 'MAIN' });
  } catch {
    return { ok: false };
  }
  const reporte: Reporte = {
    tabId,
    url: tab.url ?? '',
    titulo: tab.title ?? '',
    inicio: Date.now(),
  };
  await chrome.storage.session.set({ reporte });
  await chrome.tabs.create({
    url: `${origen}/record?reporte=1&ext=${chrome.runtime.id}`,
    openerTabId: tabId,
  });
  return { ok: true };
}

async function reporteGuardado(): Promise<Reporte | null> {
  const r = (await chrome.storage.session.get('reporte')).reporte as Reporte | undefined;
  return r ?? null;
}

/** Lo recogido en la pestaña del reporte, limpio y con tope. Después se olvida el reporte. */
async function tomar() {
  const r = await reporteGuardado();
  if (!r) return { error: 'sin_reporte' };
  let crudo: unknown;
  try {
    const [x] = await chrome.scripting.executeScript({
      target: { tabId: r.tabId },
      world: 'MAIN',
      func: () => {
        const w = window as unknown as { __pantalayEspia?: { tomar(): unknown } };
        return w.__pantalayEspia?.tomar() ?? null;
      },
    });
    crudo = x?.result ?? null;
  } catch {
    crudo = null;
  }
  await chrome.storage.session.remove('reporte');
  if (!crudo) return { error: 'pestana_cerrada' };
  return {
    ...limpiarRegistros(crudo as { consola?: unknown; red?: unknown }),
    pagina: { url: limpiarUrl(r.url), titulo: limpiarTexto(r.titulo).slice(0, 300) },
    navegador: navigator.userAgent.slice(0, 300),
  };
}

chrome.runtime.onMessage.addListener((mensaje, _remitente, responder) => {
  const m = mensaje as MensajeInterno;
  void (async () => {
    const tab = await pestanaActiva();
    if (!tab?.id) return responder({ error: 'no_permitida' });
    if (m.tipo === 'estado') return responder(await capa(tab.id, 'estado'));
    if (m.tipo === 'alternar') return responder(await capa(tab.id, m.que));
    if (m.tipo === 'reporte') return responder(await empezarReporte(tab.id, m.origen));
    responder({ error: 'desconocido' });
  })();
  return true;
});

chrome.commands.onCommand.addListener((comando, tab) => {
  void (async () => {
    const id = tab?.id ?? (await pestanaActiva())?.id;
    if (!id) return;
    await capa(id, comando === 'alternar-cursor' ? 'cursor' : 'dibujo');
  })();
});

// La página de Pantalay pregunta si hay un reporte en curso y, al terminar de grabar, se lleva lo recogido.
chrome.runtime.onMessageExternal.addListener((mensaje, remitente, responder) => {
  if (!origenPermitido(remitente.origin ?? remitente.url)) return false;
  const m = mensaje as MensajeExterno;
  void (async () => {
    if (m?.tipo === 'hola') {
      const r = await reporteGuardado();
      return responder({
        version: 1,
        reporte: r ? { url: limpiarUrl(r.url), titulo: limpiarTexto(r.titulo).slice(0, 300) } : null,
      });
    }
    if (m?.tipo === 'tomar') return responder(await tomar());
    responder({ error: 'desconocido' });
  })();
  return true;
});

// Para las pruebas de punta a punta (Playwright no puede tocar la ventanita ni los atajos de Chrome): las mismas
// funciones que usan la ventanita y los atajos.
(globalThis as unknown as { pantalay: unknown }).pantalay = { capa, empezarReporte };
