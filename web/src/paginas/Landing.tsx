// Página por búsqueda (SEO): «grabador de pantalla gratis», «grabar pantalla y cámara», «videos de reacción»,
// «videos verticales». Mismo texto que lee Google (servidor/seo.ts), en el idioma de la dirección.
import { useEffect } from 'react';
import { useIdioma } from '../logica/idioma';
import { alClicEnlace } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { GUIAS } from './guias';
import { LANDINGS, type Landing } from './landings';

/** Captura real del programa para cada página (las mismas de Docs). */
const CAPTURA: Record<string, string> = {
  'screen-recorder': 'grabar',
  'record-screen-and-camera': 'lapices',
  'reaction-video-maker': 'estudio-escenario',
  'vertical-video-recorder': 'estudio-vertical',
};

export function PaginaLanding({ landing }: { landing: Landing }) {
  const { idioma, enlace } = useIdioma();
  const { usuario } = useSesion();
  const t = landing[idioma];
  const es = idioma === 'es';

  useEffect(() => {
    document.title = t.titulo;
  }, [t.titulo]);

  const destino = usuario ? landing.destino : '/signup';
  const guias = landing.guias.map((s) => GUIAS.find((g) => g.slug === s)).filter((g) => g !== undefined);
  const captura = CAPTURA[landing.slug];

  return (
    <div className="landing">
      <section className="landing-hero">
        <div>
          <span className="portada-etiqueta">
            {landing.icono} {es ? 'Gratis · sin instalar' : 'Free · nothing to install'}
          </span>
          <h1>{t.h1}</h1>
          <p className="landing-intro">{t.intro}</p>
          <div className="fila-botones izquierda">
            <a className="boton grande grabar-boton" href={destino} onClick={alClicEnlace}>
              <span className="punto-rojo" aria-hidden="true" /> {t.cta}
            </a>
          </div>
        </div>
        {captura && (
          <figure className="landing-captura">
            <img src={`/capturas/${captura}-${idioma}.webp`} alt={t.h1} loading="eager" />
          </figure>
        )}
      </section>

      <section className="landing-secciones">
        {t.secciones.map((s) => (
          <article key={s.h2} className="tarjeta">
            <h2>{s.h2}</h2>
            <p>{s.texto}</p>
          </article>
        ))}
      </section>

      <section className="landing-pasos">
        <h2>{es ? 'Cómo se hace' : 'How it works'}</h2>
        <ol>
          {t.pasos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </section>

      <section className="landing-preguntas">
        <h2>{es ? 'Preguntas frecuentes' : 'Frequently asked questions'}</h2>
        {t.preguntas.map((q) => (
          <details key={q.p}>
            <summary>{q.p}</summary>
            <p>{q.r}</p>
          </details>
        ))}
      </section>

      {guias.length > 0 && (
        <section className="landing-guias">
          <h2>{es ? 'Guías relacionadas' : 'Related guides'}</h2>
          <ul>
            {guias.map((g) => (
              <li key={g.slug}>
                <a href={enlace(`/docs/${g.slug}`)} onClick={alClicEnlace}>
                  {g.icono} {g[idioma].titulo}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="landing-otras">
        <h2>{es ? 'También con Pantalay' : 'Also with Pantalay'}</h2>
        <ul>
          {LANDINGS.filter((l) => l.slug !== landing.slug).map((l) => (
            <li key={l.slug}>
              <a href={enlace(`/${l.slug}`)} onClick={alClicEnlace}>
                {l.icono} {l[idioma].h1}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="portada-final">
        <h2>{t.cta}</h2>
        <a className="boton grande grabar-boton" href={destino} onClick={alClicEnlace}>
          <span className="punto-rojo" aria-hidden="true" /> {t.cta}
        </a>
      </section>
    </div>
  );
}
