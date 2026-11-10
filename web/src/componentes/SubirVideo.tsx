// «Subir un video»: un archivo MP4 o WebM de la computadora se vuelve un video de Pantalay, con su enlace.
// Usa la misma subida por partes y con reintentos que las grabaciones (subirGrabacion).
import { useRef, useState } from 'react';
import { ErrorApi } from '../logica/api';
import { textoError, useIdioma } from '../logica/idioma';
import { navegar } from '../logica/ruta';
import {
  archivoDeVideoValido,
  duracionDeArchivo,
  medidasDeArchivo,
  tituloDeArchivo,
} from '../logica/archivoVideo';
import { subirGrabacion } from '../logica/subida';

export function SubirVideo() {
  const { t, idioma } = useIdioma();
  const entrada = useRef<HTMLInputElement>(null);
  const [avance, setAvance] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function elegido(archivo: File | undefined) {
    if (!archivo) return;
    setError('');
    const motivo = archivoDeVideoValido(archivo);
    if (motivo) return setError(t(motivo));
    setAvance(0);
    try {
      const [duracion, medidas] = await Promise.all([duracionDeArchivo(archivo), medidasDeArchivo(archivo)]);
      const id = await subirGrabacion(
        archivo,
        duracion,
        idioma,
        (s, total) => setAvance(Math.round((s / Math.max(1, total)) * 100)),
        undefined,
        tituloDeArchivo(archivo.name),
        medidas,
      );
      navegar(`/v/${id}`);
    } catch (e) {
      console.error('subir video', e);
      setError(e instanceof ErrorApi ? textoError(t, e.codigo) : t('fallaSubida'));
    } finally {
      setAvance(null);
      if (entrada.current) entrada.current.value = '';
    }
  }

  return (
    <>
      <button
        type="button"
        className="boton secundario ancho"
        disabled={avance !== null}
        onClick={() => entrada.current?.click()}
      >
        {avance === null ? `⬆ ${t('subirVideo')}` : `${t('subiendoVideo')} ${avance}%`}
      </button>
      <input
        ref={entrada}
        type="file"
        accept="video/mp4,video/webm"
        hidden
        aria-label={t('subirVideo')}
        onChange={(e) => void elegido(e.target.files?.[0])}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
