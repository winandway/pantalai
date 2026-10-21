// Prepara la copia MP4 cuando el dueño abre su video (una sola vez). Si el navegador no puede, no pasa nada:
// el video sigue funcionando en WebM y se puede intentar desde otra computadora.
import { useEffect, useRef, useState } from 'react';
import { pedir } from '../logica/api';
import { useIdioma } from '../logica/idioma';
import { prepararMp4, puedeConvertir } from '../logica/mp4';

export function PreparadorMp4({ id, alTerminar }: { id: string; alTerminar: () => void }) {
  const { t } = useIdioma();
  const [avance, setAvance] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const corriendo = useRef(false);

  async function correr() {
    if (corriendo.current) return;
    corriendo.current = true;
    setError(false);
    try {
      if (!(await puedeConvertir())) return;
      setAvance(0);
      await prepararMp4(id, setAvance);
      alTerminar();
    } catch (e) {
      console.error('mp4', e);
      // Que el error llegue al servidor: si no, se queda en este navegador y nadie lo puede arreglar.
      void pedir('/datos/errores', {
        method: 'POST',
        json: {
          donde: 'mp4',
          video_id: id,
          mensaje: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        },
      }).catch(() => undefined);
      setError(true);
    } finally {
      setAvance(null);
      corriendo.current = false;
    }
  }

  useEffect(() => {
    void correr();
    // Solo una vez por video.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (avance !== null)
    return (
      <div className="aviso-ia" role="status">
        <span>
          🎬 {t('mp4Preparando')} {Math.round(avance * 100)} %
        </span>
        <div className="progreso">
          <div style={{ width: `${Math.round(avance * 100)}%` }} />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="aviso-ia alerta" role="status">
        <span>{t('mp4Error')}</span>
        <button type="button" className="boton secundario chico" onClick={() => void correr()}>
          {t('reintentar')}
        </button>
      </div>
    );
  return null;
}
