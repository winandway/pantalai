// Botón Descargar. En el celular, «Descargar» manda el archivo a la carpeta Archivos y la persona no lo encuentra.
// Por eso en el celular se usa el menú de compartir del sistema, que trae «Guardar video» → queda en Fotos.
// Ese menú solo se abre con un toque, así que va en dos pasos: preparar (bajar el MP4) y guardar.
import { useState } from 'react';
import { archivoVideo } from '../logica/api';
import { useIdioma } from '../logica/idioma';

export function esCelular(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
  );
}

function puedeCompartirArchivos(): boolean {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([new Uint8Array(1)], 'x.mp4', { type: 'video/mp4' })] })
    );
  } catch {
    return false;
  }
}

export function BotonDescargar({ id, titulo, tieneMp4 }: { id: string; titulo: string; tieneMp4: boolean }) {
  const { t } = useIdioma();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const enlace = `${archivoVideo(id)}?descargar=1`;
  const nombre = `${
    titulo
      .replace(/[^\p{L}\p{N} _-]/gu, '')
      .trim()
      .slice(0, 60) || 'pantalay'
  }.mp4`;

  if (!(esCelular() && tieneMp4 && puedeCompartirArchivos())) {
    return (
      <a className="boton secundario" href={enlace} title={tieneMp4 ? 'MP4' : 'WebM'}>
        ⬇ {tieneMp4 ? t('descargarMp4') : t('descargar')}
      </a>
    );
  }
  if (archivo)
    return (
      <button
        type="button"
        className="boton"
        onClick={() => void navigator.share({ files: [archivo], title: titulo }).catch(() => undefined)}
      >
        📲 {t('guardarEnFotos')}
      </button>
    );
  return (
    <button
      type="button"
      className="boton secundario"
      disabled={cargando}
      onClick={async () => {
        setCargando(true);
        try {
          const b = await (
            await fetch(`${archivoVideo(id)}?formato=mp4`, { credentials: 'same-origin' })
          ).blob();
          setArchivo(new File([b], nombre, { type: 'video/mp4' }));
        } finally {
          setCargando(false);
        }
      }}
    >
      ⬇ {cargando ? t('preparandoDescarga') : t('descargarMp4')}
    </button>
  );
}
