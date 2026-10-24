// «Para YouTube»: tres títulos para elegir, la descripción armada, las palabras clave y los hashtags, cada parte con
// su botón de copiar y uno para copiar todo. Qué se pone y por qué: docs/YOUTUBE-POSICIONAMIENTO-2026.md.
import { useState } from 'react';
import { ErrorApi, pedir, type Video } from '../logica/api';
import { textoError, useIdioma } from '../logica/idioma';
import {
  descripcionYoutube,
  largoEtiquetas,
  MAX_ETIQUETAS,
  type EstiloTitulo,
  type KitYoutube,
} from '../logica/youtube';
import { useAviso } from './Aviso';

function Copiar({ texto, etiqueta }: { texto: string; etiqueta?: string }) {
  const { t } = useIdioma();
  const avisar = useAviso();
  return (
    <button
      type="button"
      className="boton secundario chico"
      onClick={() =>
        void navigator.clipboard.writeText(texto).then(
          () => avisar(t('copiado')),
          () => avisar(textoError(t, 'servidor')),
        )
      }
    >
      ⧉ {etiqueta ?? t('copiar')}
    </button>
  );
}

const NOMBRE_ESTILO: Record<EstiloTitulo, 'ytDescriptivo' | 'ytDirecto' | 'ytImpactante'> = {
  descriptivo: 'ytDescriptivo',
  directo: 'ytDirecto',
  impactante: 'ytImpactante',
};

export function ParaYoutube({
  video,
  kit,
  cambiar,
}: {
  video: Video;
  kit: KitYoutube | null | undefined;
  cambiar: (k: KitYoutube) => void;
}) {
  const { t } = useIdioma();
  const avisar = useAviso();
  const [escribiendo, setEscribiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function escribir() {
    setEscribiendo(true);
    setError(null);
    try {
      const r = await pedir<{ youtube: KitYoutube }>(`/datos/videos/${video.id}/ia/youtube`, {
        method: 'POST',
      });
      cambiar(r.youtube);
      avisar(t('ytListo'));
    } catch (e) {
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    } finally {
      setEscribiendo(false);
    }
  }

  const descripcion = kit
    ? descripcionYoutube({
        gancho: kit.gancho,
        resumen: video.descripcion,
        capitulos: video.capitulos,
        duracion: video.duracion,
        hashtags: kit.hashtags,
        idioma: video.idioma,
      })
    : '';
  const etiquetas = kit ? kit.etiquetas.join(', ') : '';
  const todo = kit
    ? [
        `${t('ytTitulos')}\n${kit.titulos.map((x) => `- ${x.texto}`).join('\n')}`,
        `${t('ytDescripcion')}\n${descripcion}`,
        `${t('ytEtiquetas')}\n${etiquetas}`,
      ].join('\n\n')
    : '';

  return (
    <section className="video-resumen para-youtube" aria-labelledby="yt-titulo">
      <div className="yt-cabeza">
        <h2 id="yt-titulo">
          <span className="yt-logo" aria-hidden="true">
            ▶
          </span>{' '}
          {t('ytTitulo')}
        </h2>
        <div className="fila-botones">
          {kit && <Copiar texto={todo} etiqueta={t('ytCopiarTodo')} />}
          <button
            type="button"
            className="enlace chico"
            disabled={escribiendo}
            onClick={() => void escribir()}
          >
            {escribiendo ? t('ytEscribiendo') : kit ? t('ytOtraVez') : t('ytCrear')}
          </button>
        </div>
      </div>
      <p className="ayuda">{t('ytAyuda')}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {kit && (
        <>
          <h3>{t('ytTitulos')}</h3>
          <ul className="yt-titulos">
            {kit.titulos.map((x) => (
              <li key={x.estilo}>
                <span className="yt-estilo">{t(NOMBRE_ESTILO[x.estilo])}</span>
                <span className="yt-texto">{x.texto}</span>
                <span className="yt-largo">{x.texto.length}/100</span>
                <Copiar texto={x.texto} />
              </li>
            ))}
          </ul>

          <div className="yt-fila">
            <h3>{t('ytDescripcion')}</h3>
            <Copiar texto={descripcion} />
          </div>
          <pre className="yt-caja">{descripcion}</pre>

          <div className="yt-fila">
            <h3>{t('ytEtiquetas')}</h3>
            <Copiar texto={etiquetas} />
          </div>
          <p className="ayuda">
            {t('ytEtiquetasAyuda')} {largoEtiquetas(kit.etiquetas)}/{MAX_ETIQUETAS} · {kit.etiquetas.length}
          </p>
          <div className="yt-caja yt-etiquetas">
            {kit.etiquetas.map((e) => (
              <span key={e}>{e}</span>
            ))}
          </div>

          {kit.hashtags.length > 0 && (
            <>
              <div className="yt-fila">
                <h3>{t('ytHashtags')}</h3>
                <Copiar texto={kit.hashtags.join(' ')} />
              </div>
              <p className="yt-hashtags">{kit.hashtags.join(' ')}</p>
            </>
          )}
        </>
      )}
    </section>
  );
}
