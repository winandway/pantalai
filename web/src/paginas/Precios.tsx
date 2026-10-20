// Página de precios, armada como la de Loom: cuatro tarjetas, cobro mensual o anual y la tabla para comparar.
// El «precio de fundador» (50 % de por vida) va al lado del precio de lista tachado.
// Mientras no haya pasarela de pago probada, los planes pagos dicen «Próximamente» y la página no se anuncia
// (no está en el menú ni en el mapa del sitio, y lleva noindex).
import { useEffect, useState } from 'react';
import { pedir } from '../logica/api';
import { useIdioma, type Idioma } from '../logica/idioma';
import { alClicEnlace } from '../logica/ruta';

type Texto = { en: string; es: string };
type Tarjeta = {
  id: 'starter' | 'business' | 'business_ia' | 'enterprise';
  nombre: string;
  frase: Texto;
  lista?: [number, number];
  fundador?: [number, number];
  suma: Texto;
  puntos: Texto[];
  popular?: boolean;
};

const T = (en: string, es: string): Texto => ({ en, es });

export const TARJETAS: Tarjeta[] = [
  {
    id: 'starter',
    nombre: 'Starter',
    frase: T('Get started with video communication', 'Empieza a comunicarte con video'),
    suma: T('Key features', 'Lo principal'),
    puntos: [
      T('25 videos', '25 videos'),
      T('5 minute recordings', 'Grabaciones de 5 minutos'),
      T('Up to 720p', 'Hasta 720p'),
      T('Screen, camera and computer sound', 'Pantalla, cámara y sonido de la computadora'),
      T('Live transcript and captions', 'Transcripción en vivo y subtítulos'),
      T('Comments and emoji reactions', 'Comentarios y reacciones con emoji'),
      T('MP4 copy of every video', 'Copia MP4 de cada video'),
    ],
  },
  {
    id: 'business',
    nombre: 'Business',
    frase: T(
      'Move work forward faster with unlimited videos and editing',
      'Avanza más rápido con videos ilimitados y edición',
    ),
    lista: [18, 15],
    fundador: [9, 7.5],
    suma: T('Everything in Starter, and', 'Todo lo de Starter, y'),
    puntos: [
      T('Unlimited videos', 'Videos ilimitados'),
      T('Unlimited recording time', 'Tiempo de grabación ilimitado'),
      T('Up to 4K', 'Hasta 4K'),
      T('Drawing tools while you record', 'Lápices para dibujar mientras grabas'),
      T('Custom thumbnail and call-to-action button', 'Miniatura a elección y botón de acción'),
      T('Remove Pantalay branding', 'Sin la marca de Pantalay'),
    ],
  },
  {
    id: 'business_ia',
    nombre: 'Business + AI',
    popular: true,
    frase: T(
      'Communicate your best with videos enhanced and edited by AI',
      'Comunica mejor con videos mejorados y editados con IA',
    ),
    lista: [24, 20],
    fundador: [12, 10],
    suma: T('Everything in Business, and', 'Todo lo de Business, y'),
    puntos: [
      T('AI titles, summaries and chapters', 'Títulos, resúmenes y capítulos con IA'),
      T('Filler word removal', 'Quitar muletillas'),
      T('Silence removal', 'Quitar silencios'),
      T('Edit by transcript', 'Editar cortando el texto'),
      T('Text, box and arrow overlays', 'Textos, cuadros y flechas encima'),
      T('Generate documents from a video', 'Generar documentos a partir de un video'),
    ],
  },
  {
    id: 'enterprise',
    nombre: 'Enterprise',
    frase: T(
      'Control and securely manage video for the entire organization',
      'Control y seguridad del video para toda la empresa',
    ),
    suma: T('Everything in Business + AI, and', 'Todo lo de Business + AI, y'),
    puntos: [
      T('Teams and user roles', 'Equipos y roles de usuario'),
      T('Sign in with your company account (SSO)', 'Entrar con la cuenta de la empresa (SSO)'),
      T('Activity log', 'Registro de actividad'),
      T('Priority support', 'Soporte prioritario'),
    ],
  },
];

/** Tabla para comparar: solo lo que Pantalay da hoy, en qué plan. */
export const FILAS: { grupo: Texto; filas: [Texto, string, string, string, string][] }[] = [
  {
    grupo: T('Videos', 'Videos'),
    filas: [
      [T('Videos per person', 'Videos por persona'), '25', '∞', '∞', '∞'],
      [T('Recording length', 'Largo de grabación'), '5 min', '∞', '∞', '∞'],
      [T('Video quality', 'Calidad'), '720p', '4K', '4K', '4K'],
    ],
  },
  {
    grupo: T('Recording', 'Grabación'),
    filas: [
      [T('Screen + camera bubble', 'Pantalla + burbuja de cámara'), '✓', '✓', '✓', '✓'],
      [
        T('Floating bubble over all your apps', 'Burbuja flotante sobre todos tus programas'),
        '✓',
        '✓',
        '✓',
        '✓',
      ],
      [T('Computer sound', 'Sonido de la computadora'), '✓', '✓', '✓', '✓'],
      [T('Live transcript and captions', 'Transcripción en vivo y subtítulos'), '✓', '✓', '✓', '✓'],
      [T('Drawing tools', 'Lápices para dibujar'), '', '✓', '✓', '✓'],
    ],
  },
  {
    grupo: T('Editing', 'Edición'),
    filas: [
      [T('Trim the ends', 'Recortar las puntas'), '✓', '✓', '✓', '✓'],
      [T('Custom thumbnail', 'Miniatura a elección'), '', '✓', '✓', '✓'],
      [T('Call-to-action button', 'Botón de acción'), '', '✓', '✓', '✓'],
      [T('Edit by transcript', 'Editar cortando el texto'), '', '', '✓', '✓'],
      [T('Text, box and arrow overlays', 'Textos, cuadros y flechas'), '', '', '✓', '✓'],
    ],
  },
  {
    grupo: T('AI', 'IA'),
    filas: [
      [T('AI titles', 'Títulos con IA'), '✓', '✓', '✓', '✓'],
      [T('Summaries and chapters', 'Resúmenes y capítulos'), '', '', '✓', '✓'],
      [T('Filler word and silence removal', 'Quitar muletillas y silencios'), '', '', '✓', '✓'],
      [T('Generate documents', 'Generar documentos'), '', '', '✓', '✓'],
    ],
  },
  {
    grupo: T('Sharing', 'Compartir'),
    filas: [
      [T('Share link and embed', 'Enlace para compartir e insertar'), '✓', '✓', '✓', '✓'],
      [
        T('MP4 download (iPhone, YouTube, Final Cut)', 'Descarga MP4 (iPhone, YouTube, Final Cut)'),
        '✓',
        '✓',
        '✓',
        '✓',
      ],
      [T('Comments and reactions', 'Comentarios y reacciones'), '✓', '✓', '✓', '✓'],
      [T('Viewer insights', 'Quién lo vio'), '✓', '✓', '✓', '✓'],
      [T('Remove Pantalay branding', 'Sin la marca de Pantalay'), '', '✓', '✓', '✓'],
    ],
  },
];

export function precio(n: number, idioma: Idioma): string {
  return new Intl.NumberFormat(idioma === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

export function Precios() {
  const { t, idioma } = useIdioma();
  const [anual, setAnual] = useState(true);
  const [cobro, setCobro] = useState(false);
  useEffect(() => {
    // Que Google no la muestre hasta que se pueda comprar.
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex';
    document.head.appendChild(m);
    // Los botones de compra se encienden cuando el cobro con Stripe está conectado.
    pedir<{ listo: boolean }>('/datos/pago/config')
      .then((r) => setCobro(r.listo))
      .catch(() => undefined);
    return () => {
      document.head.removeChild(m);
    };
  }, []);
  const i = anual ? 1 : 0;

  return (
    <div className="precios">
      <h1>{t('preciosTitulo')}</h1>
      <p className="precios-fundador">⭐ {t('preciosFundador')}</p>
      <div className="precios-ciclo" role="radiogroup" aria-label={t('preciosCobro')}>
        <label className={!anual ? 'activo' : ''}>
          <input type="radio" name="ciclo" checked={!anual} onChange={() => setAnual(false)} />
          {t('preciosMensual')}
        </label>
        <label className={anual ? 'activo' : ''}>
          <input type="radio" name="ciclo" checked={anual} onChange={() => setAnual(true)} />
          {t('preciosAnual')} <span className="etiqueta-ahorro">{t('preciosAhorro')}</span>
        </label>
      </div>

      <div className="precios-tarjetas">
        {TARJETAS.map((p) => (
          <section key={p.id} className={`precio-tarjeta ${p.popular ? 'popular' : ''}`}>
            {p.popular && <span className="precio-popular">{t('preciosPopular')}</span>}
            <h2>{p.nombre}</h2>
            <p className="precio-frase">{p.frase[idioma]}</p>
            <div className="precio-monto">
              {p.id === 'starter' && <strong>{precio(0, idioma)}</strong>}
              {p.id === 'enterprise' && <strong>{t('preciosHablemos')}</strong>}
              {p.lista && p.fundador && (
                <>
                  <s>{precio(p.lista[i], idioma)}</s> <strong>{precio(p.fundador[i], idioma)}</strong>
                  <small>{t('preciosPorUsuario')}</small>
                  <small className="precio-anual">
                    {anual ? `${precio(p.fundador[1] * 12, idioma)} ${t('preciosAlAno')}` : ' '}
                  </small>
                </>
              )}
            </div>
            {p.id === 'starter' ? (
              <a className="boton secundario ancho" href="/signup" onClick={alClicEnlace}>
                {t('preciosEmpezarGratis')}
              </a>
            ) : p.id === 'enterprise' ? (
              <a
                className="boton secundario ancho"
                href="https://windoce.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('preciosContactar')}
              </a>
            ) : cobro ? (
              <a
                className={`boton ancho ${p.popular ? '' : 'secundario'}`}
                href={`/checkout?plan=${p.id}&ciclo=${anual ? 'anual' : 'mensual'}`}
                onClick={alClicEnlace}
              >
                {t('preciosFundadorBoton')}
              </a>
            ) : (
              <button type="button" className={`boton ancho ${p.popular ? '' : 'secundario'}`} disabled>
                {t('preciosProximamente')}
              </button>
            )}
            <p className="precio-suma">{p.suma[idioma]}</p>
            <ul>
              {p.puntos.map((x) => (
                <li key={x.en}>✓ {x[idioma]}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <h2 className="precios-comparar">{t('preciosComparar')}</h2>
      <div className="precios-tabla-marco">
        <table className="precios-tabla">
          <thead>
            <tr>
              <th />
              {TARJETAS.map((p) => (
                <th key={p.id} scope="col">
                  {p.nombre}
                </th>
              ))}
            </tr>
          </thead>
          {FILAS.map((g) => (
            <tbody key={g.grupo.en}>
              <tr className="grupo">
                <th colSpan={5} scope="colgroup">
                  {g.grupo[idioma]}
                </th>
              </tr>
              {g.filas.map(([nombre, ...celdas]) => (
                <tr key={nombre.en}>
                  <th scope="row">{nombre[idioma]}</th>
                  {celdas.map((v, j) => (
                    <td key={j} className={v === '✓' ? 'si' : ''}>
                      {v || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="ayuda centro">{t('preciosNota')}</p>
    </div>
  );
}
