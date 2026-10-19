// Docs estilo Wikipedia: cada guía es su propia página con enlace fijo, la barra lateral nunca se pierde
// y hay buscador con ⌘K.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIdioma } from '../logica/idioma';
import { alClicEnlace } from '../logica/ruta';
import { GUIAS, SECCIONES, type Guia } from './guias';

export function Docs({ slug }: { slug: string }) {
  const { t, idioma } = useIdioma();
  const [q, setQ] = useState('');
  const buscador = useRef<HTMLInputElement>(null);
  const guia = GUIAS.find((g) => g.slug === slug);

  useEffect(() => {
    document.title = guia ? `${guia[idioma].titulo} · PANTALAI Docs` : 'PANTALAI Docs';
  }, [guia, idioma]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        buscador.current?.focus();
      }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, []);

  const resultados = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return GUIAS;
    return GUIAS.filter((g) =>
      [g[idioma].titulo, g[idioma].resumen, ...g[idioma].cuerpo].join(' ').toLowerCase().includes(n),
    );
  }, [q, idioma]);

  const porSeccion = (lista: Guia[]) =>
    (Object.keys(SECCIONES) as Guia['seccion'][])
      .map((s) => ({ s, guias: lista.filter((g) => g.seccion === s) }))
      .filter((x) => x.guias.length);

  return (
    <div className="docs">
      <aside className="docs-lateral">
        <a href="/docs" onClick={alClicEnlace} className={`docs-inicio ${!slug ? 'activo' : ''}`}>
          📘 {t('docsTitulo')}
        </a>
        <input
          ref={buscador}
          type="search"
          className="buscador chico"
          placeholder={`${t('docsBuscar')} ⌘K`}
          aria-label={t('docsBuscar')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {porSeccion(resultados).map(({ s, guias }) => (
          <nav key={s}>
            <p className="lateral-titulo">
              {SECCIONES[s].icono} {SECCIONES[s][idioma]}
            </p>
            {guias.map((g) => (
              <a
                key={g.slug}
                href={`/docs/${g.slug}`}
                onClick={alClicEnlace}
                className={g.slug === slug ? 'activo' : ''}
              >
                {g.icono} {g[idioma].titulo}
              </a>
            ))}
          </nav>
        ))}
      </aside>
      <article className="docs-contenido">
        {guia ? (
          <>
            <a href="/docs" onClick={alClicEnlace} className="enlace docs-volver">
              {t('docsVolver')}
            </a>
            <p className="ayuda">
              {SECCIONES[guia.seccion].icono} {SECCIONES[guia.seccion][idioma]}
            </p>
            <h1>{guia[idioma].titulo}</h1>
            <p className="docs-resumen">{guia[idioma].resumen}</p>
            {guia.imagen && (
              <figure className="docs-captura">
                <img
                  src={`/capturas/${guia.imagen}-${idioma}.webp`}
                  alt={guia[idioma].titulo}
                  onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
                />
              </figure>
            )}
            {guia[idioma].cuerpo.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </>
        ) : slug ? (
          <p className="vacio">{t('noEncontrado')}</p>
        ) : (
          <>
            <h1>{t('docsTitulo')}</h1>
            <input
              type="search"
              className="buscador grande"
              placeholder={`${t('docsBuscar')} ⌘K`}
              aria-label={t('docsBuscar')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {porSeccion(resultados).map(({ s, guias }) => (
              <section key={s} className="docs-seccion">
                <h2>
                  {SECCIONES[s].icono} {SECCIONES[s][idioma]}
                </h2>
                <div className="docs-tarjetas">
                  {guias.map((g) => (
                    <a
                      key={g.slug}
                      href={`/docs/${g.slug}`}
                      onClick={alClicEnlace}
                      className="tarjeta docs-tarjeta"
                    >
                      <strong>
                        {g.icono} {g[idioma].titulo}
                      </strong>
                      <span>{g[idioma].resumen}</span>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </article>
    </div>
  );
}
