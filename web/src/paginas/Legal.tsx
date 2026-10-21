// Términos, privacidad, uso aceptable y cookies: cada uno con su dirección fija, en el idioma elegido.
// El servidor también los escribe en el HTML para que Google y las IAs los lean sin JavaScript.
import { useEffect } from 'react';
import { useIdioma } from '../logica/idioma';
import { alClicEnlace } from '../logica/ruta';
import { ACTUALIZADO, LEGALES, type Legal as TipoLegal } from './legales';

export function Legal({ legal }: { legal: TipoLegal }) {
  const { idioma, t } = useIdioma();
  const texto = legal[idioma];
  useEffect(() => {
    document.title = `${texto.titulo} · Pantalay`;
  }, [texto]);
  const fecha = new Date(`${ACTUALIZADO}T12:00:00Z`).toLocaleDateString(idioma, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <div className="docs legal">
      <aside className="docs-lateral">
        <nav aria-label={t('cta.legal')}>
          <p className="lateral-titulo">⚖️ {t('cta.legal')}</p>
          {LEGALES.map((l) => (
            <a
              key={l.slug}
              href={`/${l.slug}`}
              onClick={alClicEnlace}
              className={l.slug === legal.slug ? 'activo' : ''}
              aria-current={l.slug === legal.slug ? 'page' : undefined}
            >
              {l[idioma].titulo}
            </a>
          ))}
        </nav>
        <nav>
          <a href="/docs" onClick={alClicEnlace}>
            📚 Docs
          </a>
        </nav>
      </aside>
      <article className="docs-contenido">
        <h1>{texto.titulo}</h1>
        <p className="ayuda">
          {t('legal.actualizado')}: {fecha}
        </p>
        <p className="docs-resumen">{texto.resumen}</p>
        {texto.secciones.map((s) => (
          <section key={s.titulo}>
            <h2>{s.titulo}</h2>
            {s.parrafos.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
