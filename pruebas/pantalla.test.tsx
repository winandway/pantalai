// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProveedorAviso, useAviso } from '../web/src/componentes/Aviso';
import { Encabezado, Pie } from '../web/src/componentes/Marco';
import { Confirmar } from '../web/src/componentes/Modal';
import { Reproductor } from '../web/src/componentes/Reproductor';
import { ErrorApi, pedir, visitante, type Video } from '../web/src/logica/api';
import { ContextoIdioma, TEXTOS } from '../web/src/logica/idioma';
import { navegar } from '../web/src/logica/ruta';
import { ContextoSesion } from '../web/src/logica/sesion';

const video: Video = {
  id: 'v1',
  titulo: 'Demo',
  descripcion: '',
  estado: 'listo',
  tipo: 'video/webm',
  bytes: 10,
  duracion: 120,
  ancho: 1280,
  alto: 720,
  privacidad: 'enlace',
  carpeta_id: null,
  archivado: false,
  tiene_miniatura: false,
  idioma: 'en',
  transcripcion: [{ inicio: 0, fin: 2, texto: 'Hello.' }],
  capitulos: [
    { segundo: 0, titulo: 'Intro' },
    { segundo: 60, titulo: 'Middle' },
  ],
  cortes: [{ inicio: 10, fin: 20 }],
  recorte_inicio: 0,
  recorte_fin: 0,
  superposiciones: [
    { tipo: 'texto', inicio: 0, fin: 5, x: 10, y: 10, ancho: 20, alto: 10, texto: 'Look here' },
  ],
  cta_texto: 'Book a demo',
  cta_url: 'https://example.com',
  permitir_descarga: true,
  permitir_comentarios: true,
  creado: 0,
  actualizado: 0,
  autor: 'Ana',
  es_dueno: false,
};

const idioma = { idioma: 'en' as const, t: (c: keyof typeof TEXTOS.en) => TEXTOS.en[c], cambiar: vi.fn() };

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:vtt');
  URL.revokeObjectURL = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(async () => undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('reproductor', () => {
  it('muestra capítulos en la barra, el texto encima, el botón y los atajos', () => {
    const cta = vi.fn();
    const teatro = vi.fn();
    render(
      <ContextoIdioma.Provider value={idioma}>
        <Reproductor
          video={video}
          alCta={cta}
          cambiarTeatro={teatro}
          reacciones={[{ emoji: '🔥', segundo: 0 }]}
        />
      </ContextoIdioma.Provider>,
    );
    expect(document.querySelectorAll('.tramo')).toHaveLength(2);
    expect(document.querySelectorAll('.tramo-oculto')).toHaveLength(1);
    expect(screen.getByText('Look here')).toBeTruthy();
    fireEvent.click(screen.getByText('Book a demo'));
    expect(cta).toHaveBeenCalled();
    // Duración final descuenta el corte de 10 s.
    expect(document.querySelector('.tiempo')!.textContent).toContain('1:50');
    const v = document.querySelector('video')!;
    Object.defineProperty(v, 'paused', { value: true, configurable: true });
    fireEvent.keyDown(document, { key: 'k' });
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 't' });
    expect(teatro).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 's' });
    expect(screen.getByRole('button', { name: 'Speed' }).textContent).not.toBe('1×');
    fireEvent.click(screen.getByRole('button', { name: 'Speed' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: '2×' }));
    expect(screen.getByRole('button', { name: 'Speed' }).textContent).toBe('2×');
    fireEvent.click(screen.getByRole('button', { name: 'Captions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forward 5 seconds' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back 5 seconds' }));
  });

  it('salta los cortes al reproducir', () => {
    render(
      <ContextoIdioma.Provider value={idioma}>
        <Reproductor video={video} />
      </ContextoIdioma.Provider>,
    );
    const v = document.querySelector('video')!;
    v.currentTime = 12;
    fireEvent.timeUpdate(v);
    expect(v.currentTime).toBe(20);
  });
});

describe('marco', () => {
  it('encabezado sin sesión ofrece entrar; con sesión, grabar y salir', () => {
    const salir = vi.fn(async () => undefined);
    const { rerender } = render(
      <ContextoIdioma.Provider value={idioma}>
        <ContextoSesion.Provider value={{ usuario: null, cargando: false, setUsuario: vi.fn(), salir }}>
          <Encabezado />
          <Pie />
        </ContextoSesion.Provider>
      </ContextoIdioma.Provider>,
    );
    expect(screen.getByText('Log in')).toBeTruthy();
    expect(screen.getByText('Windoce LLC').getAttribute('href')).toBe('https://windoce.com');
    expect(screen.getByText('Windoce LLC').getAttribute('target')).toBe('_blank');
    rerender(
      <ContextoIdioma.Provider value={idioma}>
        <ContextoSesion.Provider
          value={{
            usuario: { id: 'u', nombre: 'Ana', correo: 'a@example.com' },
            cargando: false,
            setUsuario: vi.fn(),
            salir,
          }}
        >
          <Encabezado />
        </ContextoSesion.Provider>
      </ContextoIdioma.Provider>,
    );
    fireEvent.click(screen.getByText('Ana'));
    fireEvent.click(screen.getByText('Log out'));
    expect(salir).toHaveBeenCalled();
  });

  it('confirmar pide antes de borrar', () => {
    const si = vi.fn();
    const no = vi.fn();
    render(<Confirmar texto="¿Seguro?" si={si} no={no} etiquetaSi="Delete" etiquetaNo="Cancel" />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(no).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
    expect(si).toHaveBeenCalled();
  });

  it('el aviso se muestra y se va solo', () => {
    vi.useFakeTimers();
    function Boton() {
      const avisar = useAviso();
      return <button onClick={() => avisar('Copied')}>x</button>;
    }
    render(
      <ProveedorAviso>
        <Boton />
      </ProveedorAviso>,
    );
    fireEvent.click(screen.getByText('x'));
    expect(screen.getByRole('status').textContent).toBe('Copied');
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('status').textContent).toBe('');
    vi.useRealTimers();
  });
});

describe('api y rutas', () => {
  it('manda la cabecera propia en escrituras y traduce errores', async () => {
    const f = vi.fn(async (_u: string, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('x-pantalai')).toBe('1');
      return new Response(JSON.stringify({ error: 'credenciales' }), { status: 401 });
    });
    vi.stubGlobal('fetch', f);
    await expect(pedir('/datos/entrar', { method: 'POST', json: {} })).rejects.toMatchObject({
      codigo: 'credenciales',
      estado: 401,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('red'))),
    );
    await expect(pedir('/datos/yo')).rejects.toBeInstanceOf(ErrorApi);
    vi.unstubAllGlobals();
  });

  it('el visitante anónimo es estable', () => {
    const a = visitante();
    expect(a).toMatch(/^[a-z0-9]{12}$/);
    expect(visitante()).toBe(a);
  });

  it('navegar cambia la dirección sin recargar', () => {
    navegar('/docs');
    expect(location.pathname).toBe('/docs');
    navegar('/library', true);
    expect(location.pathname).toBe('/library');
  });
});
