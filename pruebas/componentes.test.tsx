// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CampoClave } from '../web/src/componentes/CampoClave';
import { MenuPuntos } from '../web/src/componentes/MenuPuntos';
import { SelectorIdioma } from '../web/src/componentes/SelectorIdioma';
import { haceCuanto, textoError, TEXTOS } from '../web/src/logica/idioma';
import { posicionBurbuja, tipoDeGrabacion } from '../web/src/logica/grabadora';

describe('CANDADO selector de idioma estilo Amazon', () => {
  it('botón con bandera y código; ventanita con radios; España para el español', () => {
    const cambiar = vi.fn();
    render(<SelectorIdioma idioma="en" cambiar={cambiar} />);
    const boton = screen.getByRole('button', { name: 'Change language' });
    expect(boton.textContent).toContain('🇺🇸');
    expect(boton.textContent).toContain('EN');
    fireEvent.click(boton);
    expect(screen.getByText('Change language')).toBeTruthy();
    const es = screen.getByLabelText(/español - ES/);
    expect(es.closest('label')!.textContent).toContain('🇪🇸');
    expect(document.body.textContent).not.toContain('🇲🇽');
    fireEvent.click(es);
    expect(cambiar).toHaveBeenCalledWith('es');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('se cierra con Escape', () => {
    render(<SelectorIdioma idioma="es" cambiar={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar idioma' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CANDADO contraseña con ojito', () => {
  it('arranca oculta y el ojito la muestra', () => {
    render(<CampoClave etiqueta="Password" valor="secreta" cambiar={() => undefined} />);
    const campo = screen.getByLabelText('Password') as HTMLInputElement;
    expect(campo.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(campo.type).toBe('text');
  });
});

describe('CANDADO borrar dentro de los tres puntos', () => {
  it('la acción de borrar no está a la vista hasta abrir el menú', () => {
    const borrar = vi.fn();
    render(<MenuPuntos opciones={[{ etiqueta: 'Delete', accion: borrar, peligro: true }]} />);
    expect(screen.queryByText('Delete')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByText('Delete'));
    expect(borrar).toHaveBeenCalled();
  });
});

describe('idioma y grabadora', () => {
  it('los dos idiomas tienen los mismos textos', () => {
    expect(Object.keys(TEXTOS.es).sort()).toEqual(Object.keys(TEXTOS.en).sort());
    for (const v of Object.values(TEXTOS.es)) expect(v.trim()).not.toBe('');
  });

  it('traduce errores y tiempos', () => {
    const t = (c: keyof typeof TEXTOS.en) => TEXTOS.es[c];
    expect(textoError(t, 'credenciales')).toContain('no coinciden');
    expect(textoError(t, 'raro')).toBe(TEXTOS.es['error.servidor']);
    expect(haceCuanto(0, 'en', 3 * 86400 * 1000)).toBe('3 days ago');
  });

  it('elige el mejor formato y ubica la burbuja en su esquina', () => {
    expect(tipoDeGrabacion((t) => t === 'video/webm;codecs=vp8,opus')).toBe('video/webm;codecs=vp8,opus');
    expect(tipoDeGrabacion(() => false)).toBe('video/webm');
    const b = posicionBurbuja(1920, 1080, { burbujaTamano: 'mediano', esquina: 'abajo-der' });
    expect(b.x + b.lado).toBeLessThan(1920);
    expect(b.y + b.lado).toBeLessThan(1080);
    expect(b.x).toBeGreaterThan(1000);
  });
});
