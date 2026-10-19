// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvisoIA, Generar, Tareas } from '../web/src/componentes/IA';
import { ProveedorAviso } from '../web/src/componentes/Aviso';
import { ContextoIdioma, TEXTOS } from '../web/src/logica/idioma';
import { ahorro, documentoATexto } from '../web/src/logica/ia';

const idioma = { idioma: 'es' as const, t: (c: keyof typeof TEXTOS.en) => TEXTOS.es[c], cambiar: vi.fn() };
const envolver = (n: React.ReactNode) =>
  render(
    <ContextoIdioma.Provider value={idioma}>
      <ProveedorAviso>{n}</ProveedorAviso>
    </ContextoIdioma.Provider>,
  );
const ia = (estado: string, extra = {}) => ({
  ia: { oido: true, cerebro: true, estado, error: '', tareas: [], muletillas: [], palabras: 0, ...extra },
});

afterEach(() => vi.unstubAllGlobals());

describe('pantallas de IA', () => {
  it('muestra el error con su motivo y el botón para intentar otra vez', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(ia('error', { error: 'tope_mes' }))),
    );
    const fin = vi.fn();
    envolver(<AvisoIA id="v1" idioma="es" alTerminar={fin} />);
    expect(await screen.findByText(/presupuesto de IA de este mes/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Intentar otra vez con IA' })).toBeTruthy();
    expect(fin).toHaveBeenCalledWith(expect.objectContaining({ estado: 'error' }), false);
  });

  it('no muestra nada si la IA está apagada o ya terminó', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ia: { ...ia('listo').ia, oido: false } })),
    );
    const { container } = envolver(<AvisoIA id="v1" idioma="es" alTerminar={() => undefined} />);
    await waitFor(() => expect(container.querySelector('.aviso-ia')).toBeNull());
  });

  it('ofrece procesar un video que quedó a medias', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(ia('transcrito'))),
    );
    envolver(<AvisoIA id="v1" idioma="es" alTerminar={() => undefined} />);
    expect(await screen.findByRole('button', { name: /Procesar con IA/ })).toBeTruthy();
  });

  it('sin cerebro, transcribe solo y lo dice con su propio mensaje', async () => {
    const f = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith('/ia'))
        return Response.json({
          ia: { ...ia(f.mock.calls.length > 1 ? 'transcrito' : 'pendiente').ia, cerebro: false },
        });
      if (u.includes('/media/')) return new Response(new ArrayBuffer(8));
      return Response.json({ ok: true, idioma: 'es', palabras: 1 });
    });
    vi.stubGlobal('fetch', f);
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = async () => ({ duration: 1 });
        close = async () => undefined;
      },
    );
    vi.stubGlobal(
      'OfflineAudioContext',
      class {
        destination = {};
        createBufferSource = () => ({ connect: () => undefined, start: () => undefined, buffer: null });
        startRendering = async () => ({ getChannelData: () => new Float32Array(16000) });
      },
    );
    envolver(<AvisoIA id="v1" idioma="es" alTerminar={() => undefined} />);
    expect(await screen.findByText(/La IA transcribió tu video/)).toBeTruthy();
    expect(f.mock.calls.some(([u]) => String(u).includes('analizar'))).toBe(false);
  });

  it('tareas con copiar', () => {
    envolver(<Tareas tareas={['Revisar el teléfono']} />);
    expect(screen.getByText(/Revisar el teléfono/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeTruthy();
  });

  it('generar un documento y mostrarlo con sus minutos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          documento: {
            titulo: 'Alta',
            introduccion: 'Intro',
            pasos: [{ segundo: 42, texto: 'Abre Clientes' }],
            cierre: 'Fin',
          },
        }),
      ),
    );
    const ir = vi.fn();
    const cerrar = vi.fn();
    envolver(<Generar id="v1" enlace="https://x/v/v1" ir={ir} cerrar={cerrar} />);
    fireEvent.change(screen.getByLabelText('Plantilla'), { target: { value: 'mensaje' } });
    fireEvent.click(screen.getByRole('button', { name: /Generar/ }));
    expect(await screen.findByText('Abre Clientes')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '0:42' }));
    expect(ir).toHaveBeenCalledWith(42);
    expect(cerrar).toHaveBeenCalled();
  });

  it('texto del documento y ahorro de muletillas', () => {
    expect(
      documentoATexto(
        { titulo: 'T', introduccion: 'I', pasos: [{ segundo: 5, texto: 'Paso' }], cierre: 'C' },
        (s) => `${s}s`,
      ),
    ).toBe('T\n\nI\n\n1. Paso (5s)\n\nC');
    expect(
      ahorro([
        { inicio: 1, fin: 1.6, palabra: 'eh' },
        { inicio: 3, fin: 3.5, palabra: 'mmm' },
      ]),
    ).toBe(1);
  });
});
