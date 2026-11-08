// @vitest-environment jsdom
// CANDADOS C-EXTENSION y C-REPORTE-ERROR: quién puede hablar con la extensión, el modo reporte en Grabar (tramos,
// pedirle lo recogido y subirlo) y el panel «Consola y red» del video.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { origenPermitido } from '../extension/src/mensajes';
import {
  AvisoReporte,
  BotonExtension,
  PanelRegistros,
  resumirNavegador,
} from '../web/src/componentes/Extension';
import {
  RelojReporte,
  enviarRegistros,
  hablarConExtension,
  leerModoReporte,
} from '../web/src/logica/reporte';
import manifiesto from '../extension/manifest.json';

const EXT = 'abcdefghijklmnopabcdefghijklmnop';

afterEach(() => {
  cleanup();
  delete (globalThis as { chrome?: unknown }).chrome;
  vi.unstubAllGlobals();
});

/** Una extensión de mentira que responde a la página. */
function extensionFalsa(responder: (m: { tipo: string }) => unknown) {
  const sendMessage = vi.fn((_id: string, m: { tipo: string }, cb: (r: unknown) => void) =>
    setTimeout(() => cb(responder(m)), 0),
  );
  (globalThis as { chrome?: unknown }).chrome = { runtime: { sendMessage } };
  return sendMessage;
}

describe('quién puede hablar con la extensión', () => {
  it('solo Pantalay; la computadora local SOLO en la compilación de pruebas', () => {
    expect(origenPermitido('https://pantalay.com')).toBe(true);
    expect(origenPermitido('https://www.pantalay.com/record')).toBe(true);
    expect(origenPermitido('https://pantalai.sitios.dev')).toBe(true);
    expect(origenPermitido('http://127.0.0.1:8791')).toBe(false);
    expect(origenPermitido('http://localhost:5173')).toBe(false);
    expect(origenPermitido('http://127.0.0.1:8791', true)).toBe(true);
    expect(origenPermitido('http://localhost:5173', true)).toBe(true);
    expect(origenPermitido('http://pantalay.com')).toBe(false);
    expect(origenPermitido('https://pantalay.com.evil.com')).toBe(false);
    expect(origenPermitido('https://evilpantalay.com')).toBe(false);
    expect(origenPermitido(undefined)).toBe(false);
    expect(origenPermitido('basura')).toBe(false);
  });

  it('el manifiesto pide solo lo justo y deja hablar solo a esos orígenes', () => {
    expect([...manifiesto.permissions].sort()).toEqual(['activeTab', 'scripting', 'storage']);
    expect(manifiesto).not.toHaveProperty('host_permissions');
    expect(manifiesto).not.toHaveProperty('content_scripts');
    // El manifiesto fuente trae localhost para la compilación de pruebas; la publicada lo quita (scripts/extension.mjs).
    for (const m of manifiesto.externally_connectable.matches)
      expect(origenPermitido(m.replace('/*', ''), true)).toBe(true);
    expect(manifiesto.manifest_version).toBe(3);
  });
});

describe('modo reporte en Grabar', () => {
  it('lee el parámetro y valida el id de la extensión', () => {
    expect(leerModoReporte('?reporte=1&ext=' + EXT)).toEqual({ ext: EXT });
    expect(leerModoReporte('?reporte=1&ext=NOVALE')).toEqual({ ext: '' });
    expect(leerModoReporte('?reporte=0')).toBeNull();
    expect(leerModoReporte('')).toBeNull();
  });

  it('el reloj anota los tramos y salta las pausas', () => {
    const r = new RelojReporte();
    r.empezar(1000);
    r.pausar(4000);
    r.pausar(4500); // dos veces no rompe
    r.continuar(3, 9000);
    r.continuar(3, 9500); // sin pausa no abre otro tramo
    expect(r.tramos).toEqual([
      { desde: 1000, hasta: 4000, video: 0 },
      { desde: 9000, hasta: null, video: 3 },
    ]);
  });

  it('sin extensión no se cuelga', async () => {
    expect(await hablarConExtension(EXT, { tipo: 'hola' })).toBeUndefined();
    expect(await enviarRegistros(EXT, 'v1', [])).toEqual({ ok: false, motivo: 'sin_extension' });
  });

  it('pide lo recogido, lo alinea y lo sube al video', async () => {
    const enviado = extensionFalsa(() => ({
      consola: [{ t: 3000, nivel: 'error', texto: 'falló' }],
      red: [{ t: 2500, metodo: 'get', url: 'https://a.com/x?token=1', estado: 404, ms: 9, tipo: 'fetch' }],
      pagina: { url: 'https://a.com/', titulo: 'A' },
      navegador: 'Chrome/142',
    }));
    const pedido = vi.fn(async () => new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', pedido);
    const r = await enviarRegistros(EXT, 'v1', [{ desde: 1000, hasta: null, video: 0 }]);
    expect(r).toEqual({ ok: true, consola: 1, red: 1 });
    expect(enviado.mock.calls[0]![1]).toEqual({ tipo: 'tomar' });
    const [ruta, init] = pedido.mock.calls[0] as unknown as [string, RequestInit];
    expect(ruta).toBe('/datos/videos/v1/registros');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({
      consola: [{ s: 2, nivel: 'error', texto: 'falló' }],
      red: [
        { s: 1.5, metodo: 'GET', url: 'https://a.com/x?token=[hidden]', estado: 404, ms: 9, tipo: 'fetch' },
      ],
      pagina: { url: 'https://a.com/', titulo: 'A' },
      navegador: 'Chrome/142',
    });
  });

  it('si la extensión dice que no hay reporte, no sube nada', async () => {
    extensionFalsa(() => ({ error: 'sin_reporte' }));
    const pedido = vi.fn();
    vi.stubGlobal('fetch', pedido);
    expect(await enviarRegistros(EXT, 'v1', [])).toEqual({ ok: false, motivo: 'sin_reporte' });
    expect(pedido).not.toHaveBeenCalled();
  });

  it('la franja dice de qué página es el reporte, o cómo instalar la extensión', async () => {
    extensionFalsa(() => ({ version: 1, reporte: { url: 'https://a.com/', titulo: 'Tienda' } }));
    const { unmount } = render(<AvisoReporte ext={EXT} />);
    await waitFor(() => expect(screen.getByTestId('franja-reporte').textContent).toContain('Tienda'));
    unmount();
    delete (globalThis as { chrome?: unknown }).chrome;
    render(<AvisoReporte ext={EXT} />);
    await waitFor(() =>
      expect(screen.getByTestId('franja-reporte').textContent).toContain('install the Pantalay'),
    );
  });

  it('el botón descarga la extensión', () => {
    render(<BotonExtension />);
    const a = screen.getByRole('link', { name: /Get the Chrome extension/ });
    expect(a.getAttribute('href')).toBe('/pantalay-extension.zip');
  });
});

describe('panel «Consola y red»', () => {
  const datos = {
    consola: [
      { s: 0, nivel: 'log' as const, texto: 'arranque', antes: true },
      { s: 4, nivel: 'error' as const, texto: 'TypeError: boom' },
    ],
    red: [{ s: 2, metodo: 'POST', url: 'https://a.com/pagar', estado: 500, ms: 80, tipo: 'fetch' }],
    pagina: { url: 'https://a.com/', titulo: 'Tienda' },
    navegador: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/142.0.0.0 Safari/537.36',
  };

  it('muestra todo en orden, filtra y lleva el video al segundo de la fila', () => {
    Element.prototype.scrollTo = () => undefined;
    const ir = vi.fn();
    render(<PanelRegistros datos={datos} ahora={2.5} ir={ir} />);
    const filas = () => [...document.querySelectorAll('.registro')];
    expect(filas().map((f) => f.textContent)).toEqual([
      expect.stringContaining('arranque'),
      expect.stringContaining('/pagar'),
      expect.stringContaining('boom'),
    ]);
    expect(filas()[1]!.className).toContain('actual');
    expect(filas()[1]!.className).toContain('fallo');
    expect(screen.getByText(/Chrome 142 · macOS/)).toBeTruthy();
    fireEvent.click(filas()[2]!);
    expect(ir).toHaveBeenCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: /Errors 2/ }));
    expect(filas()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Network 1/ }));
    expect(filas()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Console 2/ }));
    expect(filas()).toHaveLength(2);
  });

  it('resume el navegador', () => {
    expect(resumirNavegador('Mozilla/5.0 (Windows NT 10.0) Edg/141.0')).toBe('Edge 141 · Windows');
    expect(resumirNavegador('algo raro')).toBe('algo raro');
  });
});
