// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BarraLapices, CapaDibujo, useLapices, type EstadoLapices } from '../web/src/componentes/Lapices';
import { Pizarra } from '../web/src/logica/dibujo';
import type { Grabadora } from '../web/src/logica/grabadora';

function grabadoraFalsa(completa = true) {
  return {
    current: {
      pizarra: new Pizarra(),
      congelar: false,
      pantallaCompleta: () => completa,
    } as unknown as Grabadora,
  };
}
const BASE: EstadoLapices = {
  activo: true,
  herramienta: 'lapiz',
  color: '#ff3b30',
  grosor: 'medio',
  desvanecer: false,
  congelar: true,
};

afterEach(cleanup);

describe('CANDADO C-LAPICES en pantalla', () => {
  it('la barra cambia herramienta, color y grosor, deshace y borra', () => {
    const g = grabadoraFalsa();
    const cambios: Partial<EstadoLapices>[] = [];
    render(<BarraLapices l={BASE} cambiar={(x) => cambios.push(x)} grabadora={g} pantallaCompleta />);
    fireEvent.click(screen.getByRole('button', { name: 'Arrow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thick' }));
    fireEvent.click(screen.getByLabelText('Fade after 3 s'));
    fireEvent.click(screen.getByLabelText('Freeze screen while drawing'));
    expect(cambios).toEqual([
      { herramienta: 'flecha' },
      { color: '#0a84ff' },
      { grosor: 'grueso' },
      { desvanecer: true },
      { congelar: false },
    ]);
    g.current.pizarra.empezar('lapiz', '#ff3b30', 'fino', [0, 0]);
    g.current.pizarra.empezar('lapiz', '#ff3b30', 'fino', [0, 0]);
    fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
    expect(g.current.pizarra.trazos).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(g.current.pizarra.trazos).toHaveLength(0);
  });

  it('sin pantalla completa no ofrece congelar; apagada no se ve', () => {
    const g = grabadoraFalsa(false);
    const { rerender } = render(
      <BarraLapices l={BASE} cambiar={() => undefined} grabadora={g} pantallaCompleta={false} />,
    );
    expect(screen.queryByLabelText('Freeze screen while drawing')).toBeNull();
    rerender(
      <BarraLapices
        l={{ ...BASE, activo: false }}
        cambiar={() => undefined}
        grabadora={g}
        pantallaCompleta={false}
      />,
    );
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('la capa convierte el puntero en un trazo', () => {
    const g = grabadoraFalsa();
    const video = { current: null };
    render(<CapaDibujo l={BASE} grabadora={g} video={video} />);
    const capa = screen.getByTestId('capa-dibujo');
    capa.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
    capa.setPointerCapture = () => undefined;
    capa.hasPointerCapture = () => true;
    fireEvent.pointerDown(capa, { clientX: 20, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(capa, { clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(capa, { pointerId: 1 });
    const t = g.current.pizarra.trazos[0]!;
    expect(t.puntos).toEqual([
      [0.1, 0.1],
      [0.5, 0.5],
    ]);
    expect(t.fin).not.toBeNull();
  });

  it('el estado pasa «desvanecer» y «congelar» a la grabadora', () => {
    const g = grabadoraFalsa();
    const { result } = renderHook(() => useLapices(g, 'grabando'));
    act(() => result.current.cambiar({ activo: true, desvanecer: true }));
    expect(g.current.pizarra.desvanecer).toBe(true);
    expect(g.current.congelar).toBe(true);
    act(() => result.current.cambiar({ activo: false }));
    expect(g.current.congelar).toBe(false);
  });
});
