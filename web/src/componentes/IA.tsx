// Piezas de IA en la página del video: el aviso de progreso, las tareas y el botón «Generar».
import { useEffect, useRef, useState } from 'react';
import { archivoVideo } from '../logica/api';
import { useIdioma, type ClaveTexto } from '../logica/idioma';
import {
  documentoATexto,
  generar,
  leerIA,
  procesar,
  PLANTILLAS,
  type Documento,
  type EstadoIA,
  type Fase,
  type Plantilla,
} from '../logica/ia';
import { formatoTiempo } from '../logica/tiempo';
import { useAviso } from './Aviso';
import { Modal } from './Modal';

function textoErrorIA(t: (c: ClaveTexto) => string, codigo: string): string {
  const clave = `iaError.${codigo}` as ClaveTexto;
  try {
    const v = t(clave);
    return v ?? t('iaError.otro');
  } catch {
    return t('iaError.otro');
  }
}

/**
 * Aviso de la IA para el dueño. Si el video todavía no pasó por la IA, arranca solo.
 * Nunca bloquea el video: si falla, se ve el motivo y el botón para intentar otra vez.
 */
export function AvisoIA({
  id,
  idioma,
  alTerminar,
}: {
  id: string;
  idioma: 'en' | 'es';
  alTerminar: (ia: EstadoIA, recien: boolean) => void;
}) {
  const { t } = useIdioma();
  const [ia, setIa] = useState<EstadoIA | null>(null);
  const [fase, setFase] = useState<Fase | null>(null);
  const [error, setError] = useState('');
  const [hecho, setHecho] = useState(false);
  const arrancado = useRef(false);

  async function correr(base: EstadoIA | null = ia) {
    if (arrancado.current) return;
    arrancado.current = true;
    setError('');
    try {
      await procesar(id, idioma, setFase, { cerebro: base?.cerebro ?? false });
      const nuevo = await leerIA(id);
      setIa(nuevo);
      setHecho(true);
      alTerminar(nuevo, true);
    } catch (e) {
      const codigo = (e as { codigo?: string }).codigo ?? 'otro';
      setError(textoErrorIA(t, codigo));
    } finally {
      setFase(null);
      arrancado.current = false;
    }
  }

  useEffect(() => {
    let vivo = true;
    leerIA(id)
      .then((r) => {
        if (!vivo) return;
        setIa(r);
        alTerminar(r, false);
        if (r.oido && r.estado === 'pendiente') void correr(r);
        else if (r.estado === 'error') setError(textoErrorIA(t, r.error || 'otro'));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
    // Solo al abrir el video.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!ia || !ia.oido) return null;
  if (fase) {
    const texto =
      fase.fase === 'audio'
        ? t('iaAudio')
        : fase.fase === 'oido'
          ? `${t('iaOido')} ${Math.round(fase.avance * 100)} %`
          : t('iaCerebro');
    const avance = fase.fase === 'audio' ? 0.05 : fase.fase === 'oido' ? 0.1 + fase.avance * 0.7 : 0.9;
    return (
      <div className="aviso-ia" role="status">
        <span>
          ✨ {t('iaTrabajando')} · {texto}
        </span>
        <div className="progreso">
          <div style={{ width: `${Math.round(avance * 100)}%` }} />
        </div>
      </div>
    );
  }
  if (hecho)
    return (
      <div className="aviso-ia exito" role="status">
        ✨ {t('iaListo')}
      </div>
    );
  if (error)
    return (
      <div className="aviso-ia alerta" role="status">
        <span>{error}</span>
        <button type="button" className="boton secundario chico" onClick={() => void correr()}>
          {t('iaReintentar')}
        </button>
      </div>
    );
  if (ia.estado !== 'listo' && !(ia.estado === 'transcrito' && !ia.cerebro))
    return (
      <div className="aviso-ia">
        <button type="button" className="boton secundario chico" onClick={() => void correr()}>
          ✨ {t('iaProcesar')}
        </button>
      </div>
    );
  return null;
}

export function Tareas({ tareas }: { tareas: string[] }) {
  const { t } = useIdioma();
  const avisar = useAviso();
  if (!tareas.length) return null;
  return (
    <>
      <h2>
        {t('tareas')}{' '}
        <button
          type="button"
          className="enlace chico"
          onClick={() =>
            void navigator.clipboard
              .writeText(tareas.map((x) => `- ${x}`).join('\n'))
              .then(() => avisar(t('copiado')))
          }
        >
          {t('copiar')}
        </button>
      </h2>
      <ul className="tareas">
        {tareas.map((x) => (
          <li key={x}>☐ {x}</li>
        ))}
      </ul>
    </>
  );
}

/** Foto del video en un segundo, para ilustrar cada paso del documento. */
async function fotograma(id: string, segundos: number[]): Promise<Record<number, string>> {
  const v = document.createElement('video');
  v.muted = true;
  v.preload = 'auto';
  v.src = archivoVideo(id);
  await new Promise((ok, mal) => {
    v.onloadedmetadata = ok;
    v.onerror = mal;
  });
  const c = document.createElement('canvas');
  const salida: Record<number, string> = {};
  for (const s of segundos) {
    await new Promise((ok) => {
      v.onseeked = ok;
      v.currentTime = Math.min(
        s + 0.5,
        Math.max(0, (Number.isFinite(v.duration) ? v.duration : s + 1) - 0.1),
      );
    });
    c.width = 640;
    c.height = Math.round((640 * (v.videoHeight || 360)) / (v.videoWidth || 640));
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    salida[s] = c.toDataURL('image/jpeg', 0.75);
  }
  v.removeAttribute('src');
  return salida;
}

function escapar(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function Generar({
  id,
  enlace,
  ir,
  cerrar,
}: {
  id: string;
  enlace: string;
  ir: (s: number) => void;
  cerrar: () => void;
}) {
  const { t } = useIdioma();
  const avisar = useAviso();
  const [plantilla, setPlantilla] = useState<Plantilla>('procedimiento');
  const [doc, setDoc] = useState<Documento | null>(null);
  const [fotos, setFotos] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function crear() {
    setCargando(true);
    setError('');
    setDoc(null);
    setFotos({});
    try {
      const d = await generar(id, plantilla);
      setDoc(d);
      if (plantilla !== 'mensaje' && d.pasos.length)
        void fotograma(id, [...new Set(d.pasos.map((p) => p.segundo))])
          .then(setFotos)
          .catch(() => undefined);
    } catch (e) {
      setError(textoErrorIA(t, (e as { codigo?: string }).codigo ?? 'otro'));
    } finally {
      setCargando(false);
    }
  }

  function descargar() {
    if (!doc) return;
    const html = `<!doctype html><meta charset="utf-8"><title>${escapar(doc.titulo)}</title>
<body style="font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;line-height:1.55;color:#16181d">
<h1>${escapar(doc.titulo)}</h1><p>${escapar(doc.introduccion)}</p><ol>
${doc.pasos
  .map(
    (p) =>
      `<li style="margin-bottom:18px"><p>${escapar(p.texto)} <a href="${enlace}?t=${p.segundo}">${formatoTiempo(p.segundo)}</a></p>${
        fotos[p.segundo]
          ? `<img src="${fotos[p.segundo]}" style="width:100%;border:1px solid #e2e4e9;border-radius:8px">`
          : ''
      }</li>`,
  )
  .join('\n')}
</ol><p>${escapar(doc.cierre)}</p><p style="color:#6b7280;font-size:13px">PANTALAI · <a href="${enlace}">${enlace}</a></p></body>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.titulo.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 60) || 'pantalai'}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <Modal titulo={t('generarTitulo')} cerrar={cerrar} ancho={720}>
      <div className="fila-campos">
        <div className="campo">
          <label htmlFor="plantilla">{t('plantilla')}</label>
          <select
            id="plantilla"
            value={plantilla}
            onChange={(e) => setPlantilla(e.target.value as Plantilla)}
          >
            {PLANTILLAS.map((p) => (
              <option key={p} value={p}>
                {t(`plantilla.${p}` as ClaveTexto)}
              </option>
            ))}
          </select>
        </div>
        <div className="campo campo-boton">
          <button type="button" className="boton ancho" disabled={cargando} onClick={() => void crear()}>
            ✨ {cargando ? t('generando') : t('generar')}
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {doc && (
        <article className="documento">
          <h3>{doc.titulo}</h3>
          <p>{doc.introduccion}</p>
          <ol>
            {doc.pasos.map((p, i) => (
              <li key={i}>
                <p>
                  {p.texto}{' '}
                  <button type="button" className="minuto enlace" onClick={() => (ir(p.segundo), cerrar())}>
                    {formatoTiempo(p.segundo)}
                  </button>
                </p>
                {fotos[p.segundo] && <img src={fotos[p.segundo]} alt="" />}
              </li>
            ))}
          </ol>
          {doc.cierre && <p>{doc.cierre}</p>}
          <div className="fila-botones izquierda">
            <button
              type="button"
              className="boton secundario chico"
              onClick={() =>
                void navigator.clipboard
                  .writeText(documentoATexto(doc, formatoTiempo))
                  .then(() => avisar(t('copiado')))
              }
            >
              {t('copiarTexto')}
            </button>
            {plantilla !== 'mensaje' && (
              <button type="button" className="boton secundario chico" onClick={descargar}>
                {t('descargarDocumento')}
              </button>
            )}
          </div>
        </article>
      )}
    </Modal>
  );
}
