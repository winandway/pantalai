// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { precio, Precios, TARJETAS } from '../web/src/paginas/Precios';

afterEach(cleanup);

describe('CANDADO C-PLANES: página de precios', () => {
  it('precio de fundador a la mitad del de lista, en mensual y anual', () => {
    for (const p of TARJETAS)
      if (p.lista && p.fundador) {
        expect(p.fundador[0]).toBe(p.lista[0] / 2);
        expect(p.fundador[1]).toBe(p.lista[1] / 2);
      }
    expect(precio(7.5, 'en')).toBe('$7.50');
    expect(precio(9, 'en')).toBe('$9');
  });

  it('sin cobro encendido, los planes pagos dicen «Coming soon» y no se pueden comprar; la página lleva noindex', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"sin_sesion"}', { status: 401 })),
    );
    render(<Precios />);
    expect(screen.getByText('$7.50')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Monthly'));
    expect(screen.getByText('$9')).toBeTruthy();
    expect(screen.getByText('$12')).toBeTruthy();
    const botones = screen.getAllByRole('button', { name: 'Coming soon' });
    expect(botones).toHaveLength(2);
    for (const b of botones) expect((b as HTMLButtonElement).disabled).toBe(true);
    expect(document.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex');
    vi.unstubAllGlobals();
  });
});
