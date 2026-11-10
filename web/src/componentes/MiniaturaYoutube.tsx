// Creador de miniatura para YouTube (CANDADO C-MINIATURA), dentro de «Para YouTube». Todo en el navegador, sin IA
// y sin costo: un cuadro del video (deslizador sobre el tiempo) o una foto propia (SubirImagen, con «Tomar foto»),
// texto grande con un estilo de alto contraste, y sale en 1280 × 720, JPG, por debajo de 2 MB. No se guarda en el
// servidor: no gasta ninguna escritura. La marca de agua sigue la misma regla que el video (`video.marca`).
import { useEffect, useMemo, useRef, useState } from 'react';
import { archivoVideo, pedir, type Video } from '../logica/api';
import { llaveBorrador, useBorrador } from '../logica/borrador';
import { LectorCuadros, type CuadroSuelto } from '../logica/cuadros';
import { useIdioma } from '../logica/idioma';
import type { MascaraGuardada } from '../logica/mascaras';
import {
  ALTO,
  ANCHO,
  bajoElLimite,
  dibujarMiniatura,
  ESTILOS_LISTOS,
  esPanoramica,
  MAX_TEXTO,
  nombreMiniatura,
  pinturaDe,
  POSICIONES,
  textoCorto,
  type EncuadreVertical,
  type EstiloMiniatura,
  type PosicionTexto,
} from '../logica/miniatura';
import { useSesion } from '../logica/sesion';
import { useAviso } from './Aviso';
import { versionArchivo } from './Reproductor';
import { SubirImagen } from './SubirImagen';

const NOMBRE_ESTILO: Record<EstiloMiniatura, 'minAmarillo' | 'minContorno' | 'minRojo' | 'minMascara'> = {
  amarillo: 'minAmarillo',
  contorno: 'minContorno',
  rojo: 'minRojo',
  mascara: 'minMascara',
};
const NOMBRE_POSICION: Record<PosicionTexto, 'minArriba' | 'minCentro' | 'minAbajo'> = {
  arriba: 'minArriba',
  centro: 'minCentro',
  abajo: 'minAbajo',
};

function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => mal(new Error('imagen'));
    i.src = src;
  });
}

export function MiniaturaYoutube({ video, tituloSugerido }: { video: Video; tituloSugerido: string }) {
  const { t, idioma } = useIdioma();
  const avisar = useAviso();
  const { usuario } = useSesion();
  const b = useBorrador(llaveBorrador(`miniatura-${video.id}`, usuario?.id), {
    texto: null as string | null,
    fuente: 'video' as 'video' | 'foto',
    segundo: Math.min(1, Math.max(0, video.duracion / 2)),
    estilo: 'amarillo' as EstiloMiniatura,
    posicion: 'abajo' as PosicionTexto,
    encuadre: 'desenfocado' as EncuadreVertical,
    mascara: '',
  });
  const v = b.valor;
  const texto = v.texto ?? textoCorto(tituloSugerido);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [cuadro, setCuadro] = useState<CuadroSuelto | null>(null);
  const [foto, setFoto] = useState<CuadroSuelto | null>(null);
  const [cargando, setCargando] = useState(false);
  const [sinCuadro, setSinCuadro] = useState(false);
  const [mascaras, setMascaras] = useState<MascaraGuardada[]>([]);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [icono, setIcono] = useState<HTMLImageElement | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [peso, setPeso] = useState<number | null>(null);

  // El lector de cuadros: uno por video (abre el archivo una vez y salta a cada segundo pedido).
  const lector = useMemo(() => {
    const ver = versionArchivo(video);
    return new LectorCuadros(
      `${archivoVideo(video.id)}?formato=webm&v=${ver}`,
      `${archivoVideo(video.id)}?formato=${video.tiene_mp4 ? 'mp4' : 'webm'}&v=${ver}`,
    );
  }, [video]);
  useEffect(() => () => lector.cerrar(), [lector]);

  // Las máscaras del Estudio de la cuenta (solo lectura): sus colores y su logo se ofrecen como estilo.
  useEffect(() => {
    let vivo = true;
    pedir<{ mascaras: MascaraGuardada[] }>('/datos/estudio/mascaras')
      .then((r) => vivo && setMascaras(r.mascaras))
      .catch(() => undefined);
    void cargarImagen('/icon.png').then(
      (i) => vivo && setIcono(i),
      () => undefined,
    );
    return () => {
      vivo = false;
    };
  }, []);
  const mascara = mascaras.find((m) => m.id === v.mascara) ?? mascaras[0] ?? null;
  useEffect(() => {
    setLogo(null);
    if (v.estilo !== 'mascara' || !mascara?.logo) return;
    let vivo = true;
    cargarImagen(mascara.logo).then(
      (i) => vivo && setLogo(i),
      () => undefined,
    );
    return () => {
      vivo = false;
    };
  }, [v.estilo, mascara?.logo]);

  // Cuadro del video en el segundo elegido (con un respiro mientras se arrastra el deslizador).
  useEffect(() => {
    if (v.fuente !== 'video') return;
    let vivo = true;
    setCargando(true);
    const espera = setTimeout(() => {
      lector.cuadro(v.segundo).then(
        (c) => {
          if (!vivo) return;
          setCuadro(c);
          setSinCuadro(false);
          setCargando(false);
        },
        (e: unknown) => {
          if (!vivo) return;
          console.error('miniatura: sin cuadro', e);
          setSinCuadro(true);
          setCargando(false);
        },
      );
    }, 220);
    return () => {
      vivo = false;
      clearTimeout(espera);
    };
  }, [lector, v.fuente, v.segundo]);

  const fuente = v.fuente === 'foto' ? foto : cuadro;
  const estilo: EstiloMiniatura = v.estilo === 'mascara' && !mascara ? 'amarillo' : v.estilo;
  const vertical = fuente ? !esPanoramica(fuente.ancho, fuente.alto) && fuente.alto > fuente.ancho : false;

  useEffect(() => {
    const c = lienzo.current?.getContext('2d');
    if (!c) return;
    dibujarMiniatura(c, {
      fuente,
      texto,
      idioma,
      pintura: pinturaDe(estilo, mascara),
      posicion: v.posicion,
      encuadre: v.encuadre,
      logo: estilo === 'mascara' ? logo : null,
      marca: Boolean(video.marca),
      iconoMarca: icono,
    });
    setPeso(null);
  }, [fuente, texto, idioma, estilo, mascara, v.posicion, v.encuadre, logo, video.marca, icono]);

  async function descargar() {
    const c = lienzo.current;
    if (!c) return;
    setDescargando(true);
    try {
      const { archivo } = await bajoElLimite(
        (calidad) =>
          new Promise<Blob>((ok, mal) =>
            c.toBlob((x) => (x ? ok(x) : mal(new Error('vacío'))), 'image/jpeg', calidad),
          ),
      );
      setPeso(archivo.size);
      const url = URL.createObjectURL(archivo);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreMiniatura(video.titulo);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      avisar(t('minListo'));
    } catch (e) {
      console.error('miniatura: no se pudo crear', e);
      avisar(t('minError'));
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="miniatura-yt" data-miniatura>
      <h3>{t('minTitulo')}</h3>
      <p className="ayuda">{t('minAyuda')}</p>
      <div className="miniatura-yt-cuerpo">
        <div className="miniatura-yt-vista">
          <canvas
            ref={lienzo}
            width={ANCHO}
            height={ALTO}
            role="img"
            aria-label={t('minVista')}
            data-miniatura-lienzo
            data-modo={v.fuente === 'video' ? (lector.modo ?? '') : 'foto'}
            aria-busy={cargando}
          />
          {cargando && <p className="ayuda">{t('minPreparando')}</p>}
          {v.fuente === 'video' && sinCuadro && (
            <p className="error" role="alert">
              {t('minSinCuadro')}
            </p>
          )}
        </div>
        <div className="miniatura-yt-ajustes">
          {b.recuperado && (
            <p className="recuperado">
              {t('recuperado')}{' '}
              <button type="button" className="enlace" onClick={b.empezarDeNuevo}>
                {t('empezarDeNuevo')}
              </button>
            </p>
          )}
          <fieldset className="selector-modo miniatura-yt-opciones">
            {(['video', 'foto'] as const).map((f) => (
              <label key={f} className={v.fuente === f ? 'activo' : ''}>
                <input
                  type="radio"
                  name={`min-fuente-${video.id}`}
                  checked={v.fuente === f}
                  onChange={() => b.cambiar('fuente', f)}
                />
                {t(f === 'video' ? 'minDelVideo' : 'minMiFoto')}
              </label>
            ))}
          </fieldset>
          {v.fuente === 'video' ? (
            <label className="campo">
              {t('minMomento')} · {Math.floor(v.segundo / 60)}:
              {String(Math.floor(v.segundo % 60)).padStart(2, '0')}
              <input
                type="range"
                min={0}
                max={Math.max(0, video.duracion - 0.1)}
                step={0.1}
                value={v.segundo}
                onChange={(e) => b.cambiar('segundo', Number(e.target.value))}
              />
            </label>
          ) : (
            <SubirImagen
              nombre="miniatura"
              maximo={1920}
              alElegir={(imagen) => {
                void createImageBitmap(imagen).then((bmp) => {
                  const c = document.createElement('canvas');
                  c.width = bmp.width;
                  c.height = bmp.height;
                  c.getContext('2d')!.drawImage(bmp, 0, 0);
                  setFoto({ imagen: c, ancho: bmp.width, alto: bmp.height });
                  bmp.close();
                });
              }}
            />
          )}
          <label className="campo">
            {t('minTexto')}
            <input
              type="text"
              maxLength={MAX_TEXTO}
              value={texto}
              onChange={(e) => b.cambiar('texto', e.target.value)}
            />
            <span className="ayuda">{t('minTextoAyuda')}</span>
          </label>
          <fieldset className="selector-modo miniatura-yt-opciones">
            <legend>{t('minEstilo')}</legend>
            {[...ESTILOS_LISTOS, ...(mascaras.length ? (['mascara'] as const) : [])].map((e) => (
              <label key={e} className={estilo === e ? 'activo' : ''}>
                <input
                  type="radio"
                  name={`min-estilo-${video.id}`}
                  checked={estilo === e}
                  onChange={() => b.cambiar('estilo', e)}
                />
                {t(NOMBRE_ESTILO[e])}
              </label>
            ))}
            {estilo === 'mascara' && mascaras.length > 1 && (
              <select
                aria-label={t('minMascara')}
                value={mascara?.id ?? ''}
                onChange={(e) => b.cambiar('mascara', e.target.value)}
              >
                {mascaras.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            )}
          </fieldset>
          <fieldset className="selector-modo miniatura-yt-opciones">
            <legend>{t('minPosicion')}</legend>
            {POSICIONES.map((p) => (
              <label key={p} className={v.posicion === p ? 'activo' : ''}>
                <input
                  type="radio"
                  name={`min-pos-${video.id}`}
                  checked={v.posicion === p}
                  onChange={() => b.cambiar('posicion', p)}
                />
                {t(NOMBRE_POSICION[p])}
              </label>
            ))}
          </fieldset>
          {vertical && (
            <fieldset className="selector-modo miniatura-yt-opciones">
              <legend>{t('minEncuadre')}</legend>
              {(['desenfocado', 'recorte'] as const).map((m) => (
                <label key={m} className={v.encuadre === m ? 'activo' : ''}>
                  <input
                    type="radio"
                    name={`min-encuadre-${video.id}`}
                    checked={v.encuadre === m}
                    onChange={() => b.cambiar('encuadre', m)}
                  />
                  {t(m === 'desenfocado' ? 'minDesenfocado' : 'minRecorte')}
                </label>
              ))}
            </fieldset>
          )}
          {video.marca && <p className="ayuda">{t('minMarca')}</p>}
          <div className="fila-botones">
            <button
              type="button"
              className="boton"
              disabled={descargando || (v.fuente === 'foto' && !foto)}
              onClick={() => void descargar()}
            >
              ⬇ {t('minDescargar')}
            </button>
            {peso !== null && (
              <span className="ayuda" data-miniatura-peso={peso}>
                {ANCHO} × {ALTO} · {Math.round(peso / 1024)} KB
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
