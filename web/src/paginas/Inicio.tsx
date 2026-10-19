import { useEffect } from 'react';
import { useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';

const FUNCIONES: Record<'en' | 'es', [string, string][]> = {
  en: [
    [
      'Screen + camera',
      'Record your screen with your face in a bubble, just the screen, or just the camera. Up to 4K.',
    ],
    [
      'Instant link',
      'Your video uploads while you record. The moment you stop, the link is on your clipboard.',
    ],
    [
      'Live transcript & captions',
      'Every word becomes text as you speak. Viewers get captions and a searchable transcript.',
    ],
    [
      'Edit without starting over',
      'Trim, cut by transcript, remove silences, add text, arrows, boxes and blur.',
    ],
    [
      'Comments & reactions',
      'Viewers react and comment at the exact second. You see everything in one place.',
    ],
    ['Viewer insights', 'Views, average watch time, completion rate and button clicks for every video.'],
  ],
  es: [
    [
      'Pantalla + cámara',
      'Graba tu pantalla con tu cara en una burbuja, solo la pantalla o solo la cámara. Hasta 4K.',
    ],
    ['Enlace al instante', 'El video se sube mientras grabas. Al terminar, el enlace ya está copiado.'],
    [
      'Transcripción y subtítulos en vivo',
      'Cada palabra se vuelve texto mientras hablas. Quien lo vea tiene subtítulos y transcripción para buscar.',
    ],
    [
      'Edita sin volver a grabar',
      'Recorta, corta con la transcripción, quita silencios, agrega textos, flechas, recuadros y difuminado.',
    ],
    [
      'Comentarios y reacciones',
      'Quien lo ve reacciona y comenta en el segundo exacto. Tú lo ves todo en un solo lugar.',
    ],
    [
      'Estadísticas',
      'Vistas, tiempo promedio, cuántos lo vieron completo y clics en tu botón, video por video.',
    ],
  ],
};

export function Inicio() {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  useEffect(() => {
    if (!cargando && usuario) navegar('/library', true);
  }, [usuario, cargando]);
  return (
    <div className="portada">
      <section className="portada-hero">
        <h1>{t('lema')}</h1>
        <p className="portada-sub">{t('sublema')}</p>
        <div className="fila-botones izquierda">
          <a className="boton grande" href="/signup" onClick={alClicEnlace}>
            <span className="punto-rojo" aria-hidden="true" /> {t('empezar')}
          </a>
          <a className="boton secundario grande" href="/docs" onClick={alClicEnlace}>
            {t('docs')}
          </a>
        </div>
        <p className="ayuda">{t('limiteSinLimite')}</p>
        <figure className="portada-captura">
          <img
            src={`/capturas/video-${idioma}.webp`}
            alt=""
            onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
          />
        </figure>
      </section>
      <section className="portada-funciones">
        {FUNCIONES[idioma].map(([titulo, texto]) => (
          <article key={titulo} className="tarjeta">
            <h2>{titulo}</h2>
            <p>{texto}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
