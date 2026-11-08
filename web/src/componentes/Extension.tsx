// Piezas de la extensión de Chrome dentro de la página: el botón para instalarla, la franja del modo reporte en
// Grabar y el panel «Consola y red» del video (CANDADOS C-EXTENSION y C-REPORTE-ERROR).
import { useEffect, useMemo, useRef, useState } from 'react';
import { ErrorApi, pedir } from '../logica/api';
import { useIdioma } from '../logica/idioma';
import { esFallo, filaActual, filas, type Registros } from '../logica/registros';
import { hablarConExtension } from '../logica/reporte';
import { ENLACE_EXTENSION, GUIA_EXTENSION, TEXTOS_EXTENSION } from '../logica/textosExtension';
import { formatoTiempo } from '../logica/tiempo';
import { alClicEnlace } from '../logica/ruta';

function useT() {
  const { idioma } = useIdioma();
  return TEXTOS_EXTENSION[idioma];
}

/** «Instala la extensión de Chrome»: descarga el paquete y lleva a la guía para instalarla. */
export function BotonExtension() {
  const t = useT();
  return (
    <p className="extension-boton">
      <a className="boton secundario chico" href={ENLACE_EXTENSION} download>
        🧩 {t.instalar}
      </a>{' '}
      <a className="enlace" href={GUIA_EXTENSION} onClick={alClicEnlace}>
        {t.instalarAyuda}
      </a>
    </p>
  );
}

/** Franja discreta arriba de Grabar cuando la extensión abrió el modo reporte. */
export function AvisoReporte({ ext }: { ext: string }) {
  const t = useT();
  const [pagina, setPagina] = useState<{ url: string; titulo: string } | null | 'sin'>(null);
  useEffect(() => {
    let vivo = true;
    void hablarConExtension(ext, { tipo: 'hola' }, 3000).then((r) => {
      if (!vivo) return;
      const p = r?.reporte as { url: string; titulo: string } | null | undefined;
      setPagina(r ? (p ?? null) : 'sin');
    });
    return () => {
      vivo = false;
    };
  }, [ext]);
  return (
    <div className="franja-reporte" role="status" data-testid="franja-reporte">
      <strong>🐞 {t.reporteTitulo}</strong>{' '}
      {pagina === 'sin' ? (
        <>
          {t.reporteSinExtension}{' '}
          <a className="enlace" href={GUIA_EXTENSION} onClick={alClicEnlace}>
            {t.instalar}
          </a>
        </>
      ) : pagina ? (
        <>
          {t.reporteListo} <span className="franja-reporte-pagina">{pagina.titulo || pagina.url}</span>.{' '}
          {t.reporteConsejo}
        </>
      ) : (
        <>
          {t.reporteSinPagina} {t.reporteConsejo}
        </>
      )}
    </div>
  );
}

type DatosRegistros = Registros & { pagina: { url: string; titulo: string }; navegador: string };

/** Los registros del video (o null si no tiene, o si quien mira no puede verlos). */
export function useRegistros(id: string) {
  const [r, setR] = useState<DatosRegistros | null>(null);
  useEffect(() => {
    let vivo = true;
    setR(null);
    pedir<DatosRegistros>(`/datos/videos/${id}/registros`)
      .then((d) => vivo && setR(d))
      .catch((e: unknown) => {
        // Sin registros (o sin permiso) = sin pestaña. Cualquier otro error queda en la consola, no se esconde.
        if (!(e instanceof ErrorApi && (e.codigo === 'sin_registros' || e.codigo === 'no_existe')))
          console.error('registros', e);
      });
    return () => {
      vivo = false;
    };
  }, [id]);
  return r;
}

export function PestanaRegistros({ activa, elegir }: { activa: boolean; elegir: () => void }) {
  const t = useT();
  return (
    <button type="button" role="tab" aria-selected={activa} onClick={elegir}>
      {t.pestana}
    </button>
  );
}

type Filtro = 'todo' | 'consola' | 'red' | 'fallos';

/** Consola y red alineadas con el minuto del video: tocar una fila lleva el video a ese segundo. */
export function PanelRegistros({
  datos,
  ahora,
  ir,
}: {
  datos: DatosRegistros;
  ahora: number;
  ir: (s: number) => void;
}) {
  const t = useT();
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const todas = useMemo(() => filas(datos), [datos]);
  const lista = useMemo(
    () =>
      todas.filter((f) => (filtro === 'todo' ? true : filtro === 'fallos' ? esFallo(f) : f.clase === filtro)),
    [todas, filtro],
  );
  const actual = filaActual(lista, ahora);
  const caja = useRef<HTMLDivElement>(null);
  // Como la transcripción: sigue el momento moviendo SOLO su propia lista, nunca la página (C-VIDEO-A-LA-VISTA).
  useEffect(() => {
    const c = caja.current;
    const fila = c?.querySelector<HTMLElement>('.actual');
    if (!c || !fila || c.scrollHeight <= c.clientHeight) return;
    c.scrollTo({ top: fila.offsetTop - c.offsetTop - c.clientHeight / 3, behavior: 'smooth' });
  }, [actual]);
  const fallos = todas.filter(esFallo).length;
  return (
    <div className="panel-registros" data-testid="panel-registros">
      <div className="registros-cabecera">
        {datos.pagina.url && (
          <p className="ayuda" title={datos.pagina.url}>
            {t.pagina}: {datos.pagina.titulo || datos.pagina.url}
          </p>
        )}
        {datos.navegador && (
          <p className="ayuda" title={datos.navegador}>
            {t.navegador}: {resumirNavegador(datos.navegador)}
          </p>
        )}
      </div>
      <div className="registros-filtros" role="group">
        {(
          [
            ['todo', `${t.todo} ${todas.length}`],
            ['consola', `${t.consola} ${datos.consola.length}`],
            ['red', `${t.red} ${datos.red.length}`],
            ['fallos', `${t.fallos} ${fallos}`],
          ] as const
        ).map(([f, etiqueta]) => (
          <button
            key={f}
            type="button"
            className={`boton chico ${filtro === f ? '' : 'secundario'}`}
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
          >
            {etiqueta}
          </button>
        ))}
      </div>
      <div className="registros-lista" ref={caja}>
        {!lista.length && <p className="vacio">{t.sinFilas}</p>}
        {lista.map((f, i) => (
          <button
            key={i}
            type="button"
            title={t.ir}
            className={`registro ${f.clase} ${esFallo(f) ? 'fallo' : ''} ${f.clase === 'consola' ? f.nivel : ''} ${i === actual ? 'actual' : ''}`}
            onClick={() => ir(f.s)}
          >
            <span className="minuto">{f.antes ? '—' : formatoTiempo(f.s)}</span>
            {f.clase === 'consola' ? (
              <span className="registro-texto">
                <span className="registro-etiqueta">{f.nivel === 'excepcion' ? 'error' : f.nivel}</span>{' '}
                {f.texto}
                {f.antes && <em className="registro-antes"> · {t.antes}</em>}
              </span>
            ) : (
              <span className="registro-texto">
                <span className="registro-etiqueta">{f.metodo}</span>{' '}
                <span className="registro-estado">{f.estado || '✕'}</span> {f.url}{' '}
                <span className="registro-ms">
                  {f.ms} ms · {f.tipo}
                </span>
                {f.antes && <em className="registro-antes"> · {t.antes}</em>}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/** «Chrome 142 · macOS» a partir del texto largo del navegador. */
export function resumirNavegador(ua: string): string {
  const v = /(Edg|OPR|Chrome|Firefox|Version)\/(\d+)/.exec(ua);
  const nombre = v
    ? (({ Edg: 'Edge', OPR: 'Opera', Version: 'Safari' } as Record<string, string>)[v[1]!] ?? v[1])
    : '';
  const so = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /CrOS/.test(ua)
          ? 'ChromeOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  const r = [nombre && v ? `${nombre} ${v[2]}` : '', so].filter(Boolean).join(' · ');
  return r || ua.slice(0, 60);
}
