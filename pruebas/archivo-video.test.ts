import { describe, expect, it } from 'vitest';
import { archivoDeVideoValido, MAXIMO_BYTES, tituloDeArchivo } from '../web/src/logica/archivoVideo';

describe('CANDADO C-SUBIR-VIDEO: qué archivos se pueden subir', () => {
  it('solo MP4 o WebM, no vacíos ni de más de 5 GB', () => {
    expect(archivoDeVideoValido({ type: 'video/mp4', size: 10 })).toBeNull();
    expect(archivoDeVideoValido({ type: 'video/webm;codecs=vp9', size: 10 })).toBeNull();
    expect(archivoDeVideoValido({ type: 'video/quicktime', size: 10 })).toBe('archivoNoVideo');
    expect(archivoDeVideoValido({ type: 'image/png', size: 10 })).toBe('archivoNoVideo');
    expect(archivoDeVideoValido({ type: 'video/mp4', size: 0 })).toBe('archivoGrande');
    expect(archivoDeVideoValido({ type: 'video/mp4', size: MAXIMO_BYTES + 1 })).toBe('archivoGrande');
  });

  it('el título sale del nombre del archivo', () => {
    expect(tituloDeArchivo('Demo_del_producto.mp4')).toBe('Demo del producto');
    expect(tituloDeArchivo('reunión  semanal.webm')).toBe('reunión semanal');
    expect(tituloDeArchivo('a'.repeat(300) + '.mp4')).toHaveLength(200);
  });
});
