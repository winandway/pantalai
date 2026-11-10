// @vitest-environment jsdom
// CANDADO C-CAMARA-FOTO (regla global): TODA casilla para subir una imagen ofrece «Subir desde archivos» y «Tomar
// foto», con UNA sola pieza (SubirImagen). Esta prueba revisa todas las pantallas: si aparece una casilla de imagen
// suelta (un <input type="file"> que acepta imágenes fuera de SubirImagen), se pone en rojo.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SubirImagen } from '../web/src/componentes/SubirImagen';
import {
  ACEPTA_IMAGEN,
  errorDeCamara,
  esCelular,
  imagenAceptable,
  medidaAchicada,
} from '../web/src/logica/imagen';

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const r = join(dir, n);
    return statSync(r).isDirectory() ? archivos(r) : /\.tsx?$/.test(n) ? [r] : [];
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CANDADO C-CAMARA-FOTO: toda casilla de imagen tiene cámara', () => {
  it('no hay casillas de imagen sueltas: todas pasan por SubirImagen', () => {
    const sueltas: string[] = [];
    for (const f of archivos('web/src')) {
      if (f.endsWith(join('componentes', 'SubirImagen.tsx')) || f.endsWith(join('logica', 'imagen.ts')))
        continue;
      const texto = readFileSync(f, 'utf8');
      // Cada <input …> con type="file": si acepta imágenes (o no dice qué acepta), está mal fuera de SubirImagen.
      for (const m of texto.matchAll(/<input\b[^>]*?type=["']file["'][^>]*?>/gs)) {
        const acepta = /accept=(?:"([^"]*)"|\{([^}]*)\})/.exec(m[0]);
        const valor = acepta ? (acepta[1] ?? acepta[2] ?? '') : '';
        if (!acepta || /image|IMAGEN/i.test(valor)) sueltas.push(`${f}: ${m[0].slice(0, 80)}`);
      }
      if (/ACEPTA_IMAGEN/.test(texto)) sueltas.push(`${f}: usa ACEPTA_IMAGEN sin SubirImagen`);
    }
    expect(sueltas).toEqual([]);
  });

  it('SubirImagen muestra los dos botones y su casilla acepta solo imágenes', () => {
    const { container } = render(<SubirImagen alElegir={() => undefined} />);
    expect(screen.getByRole('button', { name: /Upload from files/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Take photo/ })).toBeTruthy();
    const entradas = container.querySelectorAll('input[type=file]');
    expect(entradas).toHaveLength(2);
    entradas.forEach((e) => expect(e.getAttribute('accept')).toBe(ACEPTA_IMAGEN));
    // La segunda abre la cámara trasera en el celular.
    expect(entradas[1]!.getAttribute('capture')).toBe('environment');
  });

  it('en la computadora abre la ventanita de la cámara; sin permiso lo dice en palabras', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockRejectedValue(Object.assign(new Error('no'), { name: 'NotAllowedError' })),
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<SubirImagen alElegir={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Take photo/ }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/did not let us use the camera/),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    // Y sigue ahí «Subir desde archivos»: nunca queda una ventana en blanco.
    expect(screen.getByRole('button', { name: /Upload from files/ })).toBeTruthy();
  });

  it('un archivo que no es imagen se rechaza con un mensaje claro', async () => {
    const elegir = vi.fn();
    const { container } = render(<SubirImagen alElegir={elegir} />);
    const entrada = container.querySelector('input[type=file]')!;
    fireEvent.change(entrada, {
      target: { files: [new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })] },
    });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/PNG, JPG or WebP/));
    expect(elegir).not.toHaveBeenCalled();
  });

  it('lo puro: tipos, peso, medida, celular y errores de cámara', () => {
    expect(imagenAceptable({ type: 'image/png', size: 10 })).toBeNull();
    expect(imagenAceptable({ type: 'image/gif', size: 10 })).toBe('tipo');
    expect(imagenAceptable({ type: 'image/jpeg', size: 16_000_000 })).toBe('pesada');
    expect(medidaAchicada(2000, 1000, 512)).toEqual({ ancho: 512, alto: 256 });
    expect(medidaAchicada(100, 50, 512)).toEqual({ ancho: 100, alto: 50 });
    expect(esCelular('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', true)).toBe(true);
    expect(esCelular('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', false)).toBe(false);
    expect(esCelular('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', true)).toBe(true); // iPad
    expect(errorDeCamara({ name: 'NotFoundError' })).toBe('sin_camara');
    expect(errorDeCamara({ name: 'NotReadableError' })).toBe('ocupada');
    expect(errorDeCamara(new Error('x'))).toBe('otro');
  });
});
