// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  borrarBorradoresDeCuenta,
  llaveBorrador,
  sinSensibles,
  useBorrador,
} from '../web/src/logica/borrador';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('CANDADO useBorrador: ningún formulario pierde lo escrito', () => {
  it('guarda solo y lo devuelve al volver', () => {
    vi.useFakeTimers();
    const llave = llaveBorrador('registro', null);
    const a = renderHook(() => useBorrador(llave, { nombre: '', correo: '' }));
    act(() => a.result.current.cambiar('nombre', 'Ana'));
    act(() => vi.advanceTimersByTime(600));
    a.unmount();
    const b = renderHook(() => useBorrador(llave, { nombre: '', correo: '' }));
    expect(b.result.current.valor.nombre).toBe('Ana');
    expect(b.result.current.recuperado).toBe(true);
    act(() => b.result.current.empezarDeNuevo());
    expect(b.result.current.valor.nombre).toBe('');
    expect(localStorage.getItem(llave)).toBeNull();
  });

  it('nunca guarda contraseñas ni datos de tarjeta', () => {
    expect(
      sinSensibles({ nombre: 'a', clave: 'x', password: 'y', tarjeta: '4242', cvv: '1', pin: '9' }),
    ).toEqual({ nombre: 'a' });
  });

  it('cada cuenta tiene su borrador y al salir se borran los suyos', () => {
    localStorage.setItem(llaveBorrador('x', 'u1'), '{"a":1}');
    localStorage.setItem(llaveBorrador('x', 'u2'), '{"a":2}');
    borrarBorradoresDeCuenta('u1');
    expect(localStorage.getItem(llaveBorrador('x', 'u1'))).toBeNull();
    expect(localStorage.getItem(llaveBorrador('x', 'u2'))).not.toBeNull();
  });

  it('limpiar borra el borrador tras guardar con éxito', () => {
    const llave = llaveBorrador('c', 'u');
    localStorage.setItem(llave, '{"nombre":"A"}');
    const h = renderHook(() => useBorrador(llave, { nombre: '' }));
    act(() => h.result.current.limpiar());
    expect(localStorage.getItem(llave)).toBeNull();
  });

  it('después de guardar y vaciar el formulario no queda un borrador vacío', () => {
    vi.useFakeTimers();
    const llave = llaveBorrador('comentario', 'u');
    const h = renderHook(() => useBorrador(llave, { texto: '' }));
    act(() => h.result.current.cambiar('texto', 'Hola'));
    act(() => vi.advanceTimersByTime(600));
    expect(localStorage.getItem(llave)).not.toBeNull();
    act(() => {
      h.result.current.limpiar();
      h.result.current.setValor({ texto: '' });
    });
    act(() => vi.advanceTimersByTime(600));
    expect(localStorage.getItem(llave)).toBeNull();
  });

  it('si la cuenta llega después, trae el borrador de esa cuenta y no lo mezcla con el anónimo', () => {
    vi.useFakeTimers();
    localStorage.setItem(llaveBorrador('f', 'u1'), '{"nombre":"De u1"}');
    const h = renderHook(({ llave }) => useBorrador(llave, { nombre: '' }), {
      initialProps: { llave: llaveBorrador('f', null) },
    });
    h.rerender({ llave: llaveBorrador('f', 'u1') });
    expect(h.result.current.valor.nombre).toBe('De u1');
    act(() => vi.advanceTimersByTime(600));
    expect(localStorage.getItem(llaveBorrador('f', null))).toBeNull();
  });
});
