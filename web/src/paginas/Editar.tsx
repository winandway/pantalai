// Editor del video. Todo es «no destructivo»: se guarda qué partes saltar y qué mostrar encima,
// y el reproductor lo aplica. El archivo original nunca se toca, así que todo se puede deshacer.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAviso } from '../componentes/Aviso';
import { MenuPuntos } from '../componentes/MenuPuntos';
import { Reproductor, type ManejoReproductor } from '../componentes/Reproductor';
import { ErrorApi, archivoVideo, pedir, type Superposicion, type Video } from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import { textoError, useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { ahorro, leerIA, type EstadoIA } from '../logica/ia';
import {
  capitulosAutomaticos,
  detectarSilencios,
  duracionVisible,
  formatoTiempo,
  tituloAutomatico,
  tramosOcultos,
  unirTramos,
  volumenPorVentana,
  type Capitulo,
  type Tramo,
} from '../logica/tiempo';

type Borrador = {
  titulo: string;
  descripcion: string;
  recorte_inicio: number;
  recorte_fin: number;
  cortes: Tramo[];
  capitulos: Capitulo[];
  superposiciones: Superposicion[];
  cta_texto: string;
  cta_url: string;
};

export function Editar({ id }: { id: string }) {
  const { t } = useIdioma();
  const { usuario, cargando } = useSesion();
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!cargando && !usuario) navegar(`/login?volver=/v/${id}/edit`, true);
  }, [cargando, usuario, id]);
  useEffect(() => {
    pedir<{ video: Video }>(`/datos/videos/${id}`)
      .then((r) => (r.video.es_dueno ? setVideo(r.video) : navegar(`/v/${id}`, true)))
      .catch((e) => setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor')));
  }, [id, t]);
  if (error) return <p className="vacio">{error}</p>;
  if (!video || !usuario) return <div className="cargando" aria-busy="true" />;
  return <Editor key={video.id} video={video} cuenta={usuario.id} />;
}

function Editor({ video, cuenta }: { video: Video; cuenta: string }) {
  const { t, idioma } = useIdioma();
  const avisar = useAviso();
  const b = useBorrador<Borrador>(llaveBorrador(`editar-${video.id}`, cuenta), {
    titulo: video.titulo,
    descripcion: video.descripcion,
    recorte_inicio: video.recorte_inicio,
    recorte_fin: video.recorte_fin || video.duracion,
    cortes: video.cortes,
    capitulos: video.capitulos,
    superposiciones: video.superposiciones,
    cta_texto: video.cta_texto,
    cta_url: video.cta_url,
  });
  const d = b.valor;
  const reproductor = useRef<ManejoReproductor>(null);
  const [ahora, setAhora] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [analizando, setAnalizando] = useState(false);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [vistaFinal, setVistaFinal] = useState(false);
  const [ia, setIa] = useState<EstadoIA | null>(null);
  useEffect(() => {
    leerIA(video.id)
      .then(setIa)
      .catch(() => undefined);
  }, [video.id]);

  const duracion = video.duracion;
  const vista: Video = useMemo(
    () => ({ ...video, ...d, recorte_fin: d.recorte_fin >= duracion ? 0 : d.recorte_fin }),
    [video, d, duracion],
  );
  const ocultos = tramosOcultos(
    duracion,
    d.recorte_inicio,
    d.recorte_fin >= duracion ? 0 : d.recorte_fin,
    d.cortes,
  );
  const final = duracionVisible(duracion, ocultos);

  const tiempo = () => reproductor.current?.tiempo() ?? ahora;

  function alternarCorte(tr: Tramo) {
    const existe = d.cortes.some(
      (c) => Math.abs(c.inicio - tr.inicio) < 0.05 && Math.abs(c.fin - tr.fin) < 0.05,
    );
    b.cambiar(
      'cortes',
      existe
        ? d.cortes.filter((c) => !(Math.abs(c.inicio - tr.inicio) < 0.05 && Math.abs(c.fin - tr.fin) < 0.05))
        : [...d.cortes, tr],
    );
  }
  const cortado = (tr: Tramo) => d.cortes.some((c) => c.inicio <= tr.inicio + 0.05 && c.fin >= tr.fin - 0.05);

  const quitarSilencios = useCallback(async () => {
    setAnalizando(true);
    try {
      const datos = await (await fetch(archivoVideo(video.id))).arrayBuffer();
      const ctx = new OfflineAudioContext(1, 1, 16000);
      const audio = await ctx.decodeAudioData(datos);
      const vol = volumenPorVentana(audio.getChannelData(0), audio.sampleRate, 0.1);
      const pico = Math.max(...vol, 0.0001);
      const silencios = detectarSilencios(vol, 0.1, { umbral: Math.max(0.01, pico * 0.06) });
      if (!silencios.length) avisar(t('sinSilencios'));
      else {
        b.cambiar('cortes', unirTramos([...d.cortes, ...silencios]));
        avisar(`${silencios.length} ${t('silenciosEncontrados')}`);
      }
    } catch (e) {
      console.error('silencios', e);
      avisar(t('error.servidor'));
    } finally {
      setAnalizando(false);
    }
  }, [video.id, d.cortes, b, avisar, t]);

  function agregarSuperposicion(tipo: Superposicion['tipo']) {
    const s = Math.floor(tiempo());
    const nueva: Superposicion = {
      tipo,
      inicio: s,
      fin: Math.min(duracion, s + 5),
      x: 35,
      y: 35,
      ancho: tipo === 'texto' ? 30 : 25,
      alto: tipo === 'flecha' ? 10 : 20,
      texto: tipo === 'texto' ? (idioma === 'es' ? 'Tu texto' : 'Your text') : '',
    };
    b.cambiar('superposiciones', [...d.superposiciones, nueva]);
    setSeleccion(d.superposiciones.length);
  }
  function cambiarSup(i: number, cambios: Partial<Superposicion>) {
    b.cambiar(
      'superposiciones',
      d.superposiciones.map((s, n) => (n === i ? { ...s, ...cambios } : s)),
    );
  }

  async function usarFotograma() {
    const v = reproductor.current?.elemento();
    if (!v?.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = Math.round((640 * v.videoHeight) / v.videoWidth);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
    if (!blob) return;
    await pedir(`/datos/videos/${video.id}/miniatura`, {
      method: 'PUT',
      body: blob,
      headers: { 'content-type': 'image/jpeg' },
    });
    avisar(t('guardado'));
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      await pedir(`/datos/videos/${video.id}`, {
        method: 'PATCH',
        json: {
          ...d,
          recorte_inicio: Math.max(0, Math.min(d.recorte_inicio, duracion)),
          recorte_fin: d.recorte_fin >= duracion - 0.05 ? 0 : d.recorte_fin,
          capitulos: [...d.capitulos].sort((a, c) => a.segundo - c.segundo),
          superposiciones: d.superposiciones.map((s) => ({ ...s, fin: Math.max(s.fin, s.inicio + 0.5) })),
        },
      });
      b.limpiar();
      avisar(t('guardado'));
      navegar(`/v/${video.id}`);
    } catch (e) {
      // Lo editado se queda en pantalla y en el borrador: nada se pierde.
      setError(textoError(t, e instanceof ErrorApi ? e.codigo : 'servidor'));
    } finally {
      setGuardando(false);
    }
  }

  // Arrastrar un elemento sobre el video.
  const capa = useRef<HTMLDivElement>(null);
  function arrastrar(i: number, e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    setSeleccion(i);
    const caja = capa.current?.getBoundingClientRect();
    const s = d.superposiciones[i];
    if (!caja || !s) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const mover = (m: PointerEvent) => {
      const x = Math.min(100 - s.ancho, Math.max(0, s.x + ((m.clientX - x0) / caja.width) * 100));
      const y = Math.min(100 - s.alto, Math.max(0, s.y + ((m.clientY - y0) / caja.height) * 100));
      cambiarSup(i, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }

  const capaArrastre = (
    <div ref={capa} className="capa-edicion" onClick={(e) => e.stopPropagation()}>
      {d.superposiciones.map((s, i) =>
        ahora >= s.inicio && ahora <= s.fin ? (
          <div
            key={i}
            className={`asa ${seleccion === i ? 'activa' : ''}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.ancho}%`, height: `${s.alto}%` }}
            onPointerDown={(e) => arrastrar(i, e)}
          />
        ) : null,
      )}
    </div>
  );

  return (
    <div className="editor">
      <div className="editor-video">
        <div className="editor-barra">
          <a href={`/v/${video.id}`} onClick={alClicEnlace} className="enlace">
            ← {t('volver')}
          </a>
          <span className="ayuda">
            {t('duracionFinal')}: <strong>{formatoTiempo(final)}</strong> / {formatoTiempo(duracion)}
          </span>
          <label className="interruptor chico">
            <input type="checkbox" checked={vistaFinal} onChange={(e) => setVistaFinal(e.target.checked)} />
            {t('vistaPrevia')}
          </label>
        </div>
        <Reproductor
          key={vistaFinal ? 'final' : 'completo'}
          ref={reproductor}
          video={vista}
          saltarOcultos={vistaFinal}
          alTiempo={setAhora}
          encima={vistaFinal ? undefined : capaArrastre}
        />
        {b.recuperado && (
          <p className="recuperado">
            {t('recuperado')}{' '}
            <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
              {t('empezarDeNuevo')}
            </button>
          </p>
        )}
        <p className="ayuda">{t('noDestructivo')}</p>
        <div className="editor-guardar">
          {error && <p className="error">{error}</p>}
          <button
            type="button"
            className="boton secundario"
            onClick={() => (b.limpiar(), navegar(`/v/${video.id}`))}
          >
            {t('cancelar')}
          </button>
          <button type="button" className="boton" disabled={guardando} onClick={() => void guardar()}>
            {t('guardar')}
          </button>
        </div>
      </div>

      <div className="editor-paneles">
        <section className="tarjeta">
          <h2>{t('editorTitulo')}</h2>
          <div className="campo">
            <label htmlFor="ed-titulo">{t('titulo')}</label>
            <input
              id="ed-titulo"
              value={d.titulo}
              maxLength={200}
              onChange={(e) => b.cambiar('titulo', e.target.value)}
            />
            {video.transcripcion.length > 0 && (
              <button
                type="button"
                className="enlace chico"
                onClick={() => {
                  const s = tituloAutomatico(video.transcripcion, video.idioma);
                  if (s) b.cambiar('titulo', s);
                }}
              >
                ✨ {t('tituloAuto')}
              </button>
            )}
          </div>
          <div className="campo">
            <label htmlFor="ed-desc">{t('descripcion')}</label>
            <textarea
              id="ed-desc"
              rows={4}
              value={d.descripcion}
              maxLength={5000}
              onChange={(e) => b.cambiar('descripcion', e.target.value)}
            />
            <small className="ayuda">{t('descripcionAyuda')}</small>
          </div>
        </section>

        <section className="tarjeta">
          <h2>{t('recortar')}</h2>
          <div className="fila-campos">
            <div className="campo">
              <label htmlFor="ed-ini">
                {t('inicioVideo')} ({formatoTiempo(d.recorte_inicio)})
              </label>
              <input
                id="ed-ini"
                type="range"
                min={0}
                max={duracion}
                step={0.1}
                value={d.recorte_inicio}
                onChange={(e) => {
                  const v = Math.min(Number(e.target.value), d.recorte_fin - 1);
                  b.cambiar('recorte_inicio', v);
                  reproductor.current?.ir(v);
                }}
              />
              <button
                type="button"
                className="enlace chico"
                onClick={() => b.cambiar('recorte_inicio', Math.min(tiempo(), d.recorte_fin - 1))}
              >
                {t('usarActual')}
              </button>
            </div>
            <div className="campo">
              <label htmlFor="ed-fin">
                {t('finVideo')} ({formatoTiempo(d.recorte_fin)})
              </label>
              <input
                id="ed-fin"
                type="range"
                min={0}
                max={duracion}
                step={0.1}
                value={d.recorte_fin}
                onChange={(e) => {
                  const v = Math.max(Number(e.target.value), d.recorte_inicio + 1);
                  b.cambiar('recorte_fin', v);
                  reproductor.current?.ir(v);
                }}
              />
              <button
                type="button"
                className="enlace chico"
                onClick={() => b.cambiar('recorte_fin', Math.max(tiempo(), d.recorte_inicio + 1))}
              >
                {t('usarActual')}
              </button>
            </div>
          </div>
        </section>

        <section className="tarjeta">
          <h2>{t('quitarSilencios')}</h2>
          <p className="ayuda">{t('quitarSilenciosAyuda')}</p>
          <div className="fila-botones izquierda">
            <button
              type="button"
              className="boton secundario chico"
              disabled={analizando}
              onClick={() => void quitarSilencios()}
            >
              {analizando ? t('analizando') : t('quitarSilencios')}
            </button>
            {d.cortes.length > 0 && (
              <button
                type="button"
                className="boton secundario chico"
                onClick={() => b.cambiar('cortes', [])}
              >
                {t('deshacerCortes')} ({d.cortes.length})
              </button>
            )}
          </div>
        </section>

        {ia && ia.muletillas.length > 0 && (
          <section className="tarjeta">
            <h2>✨ {t('quitarMuletillas')}</h2>
            <p className="ayuda">{t('muletillasAyuda')}</p>
            <button
              type="button"
              className="boton secundario chico"
              onClick={() => {
                b.cambiar(
                  'cortes',
                  unirTramos([...d.cortes, ...ia.muletillas.map(({ inicio, fin }) => ({ inicio, fin }))]),
                );
                avisar(`${ia.muletillas.length} · ${t('ahorra')} ${ahorro(ia.muletillas)} s`);
              }}
            >
              {t('quitarMuletillas')} ({ia.muletillas.length} · {t('ahorra')} {ahorro(ia.muletillas)} s)
            </button>
          </section>
        )}

        {video.transcripcion.length > 0 && (
          <section className="tarjeta">
            <h2>{t('cortesTitulo')}</h2>
            <p className="ayuda">{t('cortesAyuda')}</p>
            <div className="transcripcion-edicion">
              {video.transcripcion.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className={`frase ${cortado(s) ? 'cortada' : ''}`}
                  onClick={() => alternarCorte({ inicio: s.inicio, fin: s.fin })}
                >
                  <span className="minuto">{formatoTiempo(s.inicio)}</span> {s.texto}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="tarjeta">
          <h2>{t('capitulos')}</h2>
          <div className="fila-botones izquierda">
            {video.transcripcion.length > 0 && (
              <button
                type="button"
                className="boton secundario chico"
                onClick={() => b.cambiar('capitulos', capitulosAutomaticos(video.transcripcion, duracion))}
              >
                ✨ {t('capitulosAuto')}
              </button>
            )}
            <button
              type="button"
              className="boton secundario chico"
              onClick={() =>
                b.cambiar('capitulos', [
                  ...d.capitulos,
                  { segundo: Math.floor(tiempo()), titulo: t('tituloCapitulo') },
                ])
              }
            >
              + {t('agregarCapitulo')}
            </button>
          </div>
          {[...d.capitulos]
            .map((c, i) => ({ c, i }))
            .sort((a, z) => a.c.segundo - z.c.segundo)
            .map(({ c, i }) => (
              <div key={i} className="fila-capitulo">
                <button
                  type="button"
                  className="minuto enlace"
                  onClick={() => reproductor.current?.ir(c.segundo)}
                >
                  {formatoTiempo(c.segundo)}
                </button>
                <input
                  value={c.titulo}
                  maxLength={120}
                  aria-label={t('tituloCapitulo')}
                  onChange={(e) =>
                    b.cambiar(
                      'capitulos',
                      d.capitulos.map((x, n) => (n === i ? { ...x, titulo: e.target.value } : x)),
                    )
                  }
                />
                <MenuPuntos
                  opciones={[
                    {
                      etiqueta: t('eliminar'),
                      peligro: true,
                      accion: () =>
                        b.cambiar(
                          'capitulos',
                          d.capitulos.filter((_, n) => n !== i),
                        ),
                    },
                  ]}
                />
              </div>
            ))}
        </section>

        <section className="tarjeta">
          <h2>{t('superposiciones')}</h2>
          <p className="ayuda">{t('superposicionAyuda')}</p>
          <div className="fila-botones izquierda">
            <button
              type="button"
              className="boton secundario chico"
              onClick={() => agregarSuperposicion('texto')}
            >
              T {t('agregarTexto')}
            </button>
            <button
              type="button"
              className="boton secundario chico"
              onClick={() => agregarSuperposicion('flecha')}
            >
              → {t('agregarFlecha')}
            </button>
            <button
              type="button"
              className="boton secundario chico"
              onClick={() => agregarSuperposicion('recuadro')}
            >
              ▢ {t('agregarRecuadro')}
            </button>
            <button
              type="button"
              className="boton secundario chico"
              onClick={() => agregarSuperposicion('difuminar')}
            >
              ◌ {t('agregarDifuminar')}
            </button>
          </div>
          {d.superposiciones.map((s, i) => (
            <div
              key={i}
              className={`fila-superposicion ${seleccion === i ? 'activa' : ''}`}
              onClick={() => setSeleccion(i)}
            >
              <strong>
                {
                  {
                    texto: t('agregarTexto'),
                    flecha: t('agregarFlecha'),
                    recuadro: t('agregarRecuadro'),
                    difuminar: t('agregarDifuminar'),
                  }[s.tipo]
                }
              </strong>
              {s.tipo === 'texto' && (
                <input
                  value={s.texto}
                  maxLength={200}
                  aria-label={t('textoSuperposicion')}
                  onChange={(e) => cambiarSup(i, { texto: e.target.value })}
                />
              )}
              <label>
                {t('desde')}{' '}
                <input
                  type="number"
                  min={0}
                  max={duracion}
                  step={0.5}
                  value={s.inicio}
                  onChange={(e) => cambiarSup(i, { inicio: Number(e.target.value) })}
                />
              </label>
              <label>
                {t('hasta')}{' '}
                <input
                  type="number"
                  min={0}
                  max={duracion}
                  step={0.5}
                  value={s.fin}
                  onChange={(e) => cambiarSup(i, { fin: Number(e.target.value) })}
                />
              </label>
              <label>
                ↔{' '}
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={s.ancho}
                  onChange={(e) => cambiarSup(i, { ancho: Number(e.target.value) })}
                />
              </label>
              <MenuPuntos
                opciones={[
                  {
                    etiqueta: t('eliminar'),
                    peligro: true,
                    accion: () => {
                      b.cambiar(
                        'superposiciones',
                        d.superposiciones.filter((_, n) => n !== i),
                      );
                      setSeleccion(null);
                    },
                  },
                ]}
              />
            </div>
          ))}
        </section>

        <section className="tarjeta">
          <h2>{t('botonCta')}</h2>
          <div className="fila-campos">
            <div className="campo">
              <label htmlFor="cta-t">{t('ctaTexto')}</label>
              <input
                id="cta-t"
                value={d.cta_texto}
                maxLength={60}
                onChange={(e) => b.cambiar('cta_texto', e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="cta-u">{t('ctaUrl')}</label>
              <input
                id="cta-u"
                type="url"
                value={d.cta_url}
                placeholder={t('ctaEjemplo')}
                maxLength={500}
                onChange={(e) => b.cambiar('cta_url', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="tarjeta">
          <h2>{t('miniatura')}</h2>
          <button type="button" className="boton secundario chico" onClick={() => void usarFotograma()}>
            📸 {t('usarFotograma')} ({formatoTiempo(ahora)})
          </button>
        </section>

        <section className="tarjeta pronto">
          <h2>
            {t('muyPronto')} <span className="etiqueta">AI</span>
          </h2>
          <p className="ayuda">{t('iaPronto')}</p>
        </section>
      </div>
    </div>
  );
}
