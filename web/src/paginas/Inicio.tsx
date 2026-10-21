// Portada de Pantalay: tiene que dar ganas de usarlo. Demo animada arriba, logos de donde se comparte,
// cada herramienta con su captura real, la lista completa de funciones y una llamada final.
import {
  siDiscord,
  siFacebook,
  siGmail,
  siGoogledrive,
  siInstagram,
  siNotion,
  siReddit,
  siStripe,
  siTelegram,
  siThreads,
  siTiktok,
  siVimeo,
  siWhatsapp,
  siX,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons';
import { useEffect } from 'react';
import { Demo } from '../componentes/Demo';
import { useIdioma } from '../logica/idioma';
import { alClicEnlace, navegar } from '../logica/ruta';
import { useSesion } from '../logica/sesion';
import { FUNCIONES, PREGUNTAS } from './funciones';

export { FUNCIONES };

type T2 = { en: string; es: string };
const T = (en: string, es: string): T2 => ({ en, es });

/** Cada herramienta grande, con su captura real del programa. */
const VITRINA: { captura: string; etiqueta: T2; titulo: T2; texto: T2; puntos: T2[] }[] = [
  {
    captura: 'grabar',
    etiqueta: T('Record', 'Graba'),
    titulo: T('One click and you’re recording', 'Un clic y ya estás grabando'),
    texto: T(
      'Screen + camera, screen only or camera only. Choose your mic, the quality up to 4K and the shape of your bubble. No install: it runs in your browser.',
      'Pantalla + cámara, solo pantalla o solo cámara. Elige tu micrófono, la calidad hasta 4K y la forma de tu burbuja. Sin instalar nada: funciona en tu navegador.',
    ),
    puntos: [
      T('Floating bubble over every app', 'Burbuja flotante encima de todos tus programas'),
      T(
        'Your computer’s sound too: videos, music, calls',
        'También el sonido de la computadora: videos, música, llamadas',
      ),
      T('Pause, restart or discard anytime', 'Pausa, reinicia o descarta cuando quieras'),
    ],
  },
  {
    captura: 'lapices',
    etiqueta: T('Draw', 'Dibuja'),
    titulo: T('Draw on your screen while you talk', 'Dibuja sobre tu pantalla mientras hablas'),
    texto: T(
      'Pen, highlighter, arrows, boxes and circles in six colors. Point at exactly what matters, live, and it’s in your video.',
      'Lápiz, resaltador, flechas, cuadros y círculos en seis colores. Señala justo lo importante, en vivo, y sale en tu video.',
    ),
    puntos: [
      T('Undo, clear all, or let drawings fade by themselves', 'Deshacer, borrar todo o que se borren solos'),
      T('Freeze the screen to annotate it calmly', 'Congela la pantalla para marcarla con calma'),
      T('Works with mouse, trackpad, finger or stylus', 'Con mouse, trackpad, dedo o lápiz óptico'),
    ],
  },
  {
    captura: 'video',
    etiqueta: T('Share', 'Comparte'),
    titulo: T('A video page your viewers will love', 'Una página de video que a tu gente le va a encantar'),
    texto: T(
      'Your link opens a clean player with chapters, captions, a searchable transcript, comments and reactions at the exact second.',
      'Tu enlace abre un reproductor limpio con capítulos, subtítulos, transcripción para buscar, comentarios y reacciones en el segundo exacto.',
    ),
    puntos: [
      T('Plays on iPhone, Android and any computer', 'Se ve en iPhone, Android y cualquier computadora'),
      T('Embed it on your website with one line', 'Insértalo en tu sitio web con una línea'),
      T('See who watched and for how long', 'Ve quién lo vio y cuánto tiempo'),
    ],
  },
  {
    captura: 'recortar',
    etiqueta: T('Trim', 'Recorta'),
    titulo: T('Cut the ends in seconds', 'Corta las puntas en segundos'),
    texto: T(
      'Drag two handles on a filmstrip of your video and save. Your link, your embeds and your MP4 download come out trimmed.',
      'Arrastra dos agarraderas sobre la tira de tu video y guarda. Tu enlace, tus videos insertados y tu descarga MP4 salen recortados.',
    ),
    puntos: [
      T('Preview the trimmed video before saving', 'Mira el video recortado antes de guardar'),
      T('Your original is never touched', 'Tu grabación original nunca se toca'),
      T('MP4 ready for YouTube, iPhone and Final Cut', 'MP4 listo para YouTube, iPhone y Final Cut'),
    ],
  },
  {
    captura: 'editar',
    etiqueta: T('Edit', 'Edita'),
    titulo: T('Edit like a pro, without being one', 'Edita como un profesional, sin serlo'),
    texto: T(
      'Cut a sentence by tapping it in the transcript, remove long silences, add text, arrows, boxes and blur, a call-to-action button and your own thumbnail.',
      'Corta una frase tocándola en la transcripción, quita los silencios largos, agrega textos, flechas, recuadros y difuminado, un botón de acción y tu propia miniatura.',
    ),
    puntos: [
      T('Undo anything, anytime', 'Deshaz cualquier cosa, cuando quieras'),
      T('Automatic chapters on the progress bar', 'Capítulos automáticos en la barra de avance'),
      T('Your draft is saved as you edit', 'Lo que editas se guarda solo'),
    ],
  },
  {
    captura: 'generar',
    etiqueta: T('AI', 'IA'),
    titulo: T('AI does the boring part', 'La IA hace la parte aburrida'),
    texto: T(
      'Pantalay listens to your video and writes the title, summary, chapters and tasks. Remove “um” and “uh” in one click, or turn the video into a step-by-step document.',
      'Pantalay escucha tu video y escribe el título, el resumen, los capítulos y las tareas. Quita los «eh» y «este» con un clic, o convierte el video en un documento paso a paso.',
    ),
    puntos: [
      T(
        'Guides, procedures and bug reports with screenshots',
        'Guías, procedimientos y reportes de error con capturas',
      ),
      T('In English and Spanish', 'En inglés y en español'),
      T('Copy it or download it', 'Cópialo o descárgalo'),
    ],
  },
  {
    captura: 'compartir',
    etiqueta: T('Control', 'Controla'),
    titulo: T('You decide who sees it', 'Tú decides quién lo ve'),
    texto: T(
      'Anyone with the link or only you. Turn comments and downloads on or off, copy the link or the embed code, and change it whenever you want.',
      'Cualquiera con el enlace o solo tú. Enciende o apaga comentarios y descargas, copia el enlace o el código para insertar, y cámbialo cuando quieras.',
    ),
    puntos: [
      T('Private in one tap', 'Privado con un toque'),
      T('Embed code ready to paste', 'Código para insertar listo para pegar'),
      T('Download the MP4 or save it to Photos', 'Descarga el MP4 o guárdalo en Fotos'),
    ],
  },
  {
    captura: 'biblioteca',
    etiqueta: T('Organize', 'Organiza'),
    titulo: T('All your videos, tidy and searchable', 'Todos tus videos, ordenados y fáciles de encontrar'),
    texto: T(
      'Folders, archive and a search that looks inside what you said, not just the title. Find that video from three months ago in a second.',
      'Carpetas, archivo y un buscador que busca dentro de lo que dijiste, no solo en el título. Encuentra ese video de hace tres meses en un segundo.',
    ),
    puntos: [
      T('Search by any word you said', 'Busca por cualquier palabra que dijiste'),
      T(
        'Your recording is never lost, even without internet',
        'Tu grabación nunca se pierde, aunque se vaya el internet',
      ),
      T('Everything in English and Spanish', 'Todo en inglés y en español'),
    ],
  },
];

/** La lista completa de lo que trae Pantalay. */
const HERRAMIENTAS: [string, T2][] = [
  ['🖥️', T('Screen + camera up to 4K', 'Pantalla + cámara hasta 4K')],
  ['🫧', T('Floating camera bubble', 'Burbuja de cámara flotante')],
  ['🌈', T('Animated color border', 'Borde de colores animado')],
  ['📱', T('Vertical bubble for shorts', 'Burbuja vertical para shorts')],
  ['🔊', T('Computer sound', 'Sonido de la computadora')],
  ['✏️', T('Drawing tools', 'Lápices para dibujar')],
  ['💬', T('Live transcript', 'Transcripción en vivo')],
  ['🔗', T('Instant link', 'Enlace al instante')],
  ['✂️', T('Trim the ends', 'Recortar las puntas')],
  ['🧹', T('Remove silences', 'Quitar silencios')],
  ['📝', T('Edit by transcript', 'Editar con el texto')],
  ['➡️', T('Text, arrows, boxes and blur', 'Textos, flechas, recuadros y difuminado')],
  ['🎯', T('Call-to-action button', 'Botón de acción')],
  ['🖼️', T('Custom thumbnail', 'Miniatura a elección')],
  ['📑', T('Automatic chapters', 'Capítulos automáticos')],
  ['✨', T('AI title and summary', 'Título y resumen con IA')],
  ['🗣️', T('Filler word removal', 'Quitar muletillas')],
  ['📄', T('Video to document', 'De video a documento')],
  ['😀', T('Comments and reactions', 'Comentarios y reacciones')],
  ['📊', T('Viewer insights', 'Estadísticas de quién lo vio')],
  ['🎬', T('MP4 for YouTube and Final Cut', 'MP4 para YouTube y Final Cut')],
  ['🍎', T('Plays on iPhone', 'Se ve en iPhone')],
  ['🧩', T('Embed on any website', 'Insertar en cualquier sitio web')],
  ['🛟', T('Never lose a recording', 'Nunca pierdes una grabación')],
];

const REDES: SimpleIcon[] = [
  siYoutube,
  siX,
  siFacebook,
  siInstagram,
  siTiktok,
  siWhatsapp,
  siTelegram,
  siDiscord,
  siThreads,
  siReddit,
  siVimeo,
  siNotion,
  siGmail,
  siGoogledrive,
];

function Logo({ icono, tam = 28 }: { icono: SimpleIcon; tam?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} role="img" aria-label={icono.title}>
      <title>{icono.title}</title>
      <path d={icono.path} fill={`#${icono.hex}`} />
    </svg>
  );
}

export function Inicio() {
  const { t, idioma } = useIdioma();
  const { usuario, cargando } = useSesion();
  const es = idioma === 'es';
  useEffect(() => {
    if (!cargando && usuario) navegar('/library', true);
  }, [usuario, cargando]);

  const empezar = (
    <a className="boton grande portada-cta" href="/signup" onClick={alClicEnlace}>
      <span className="punto-rojo" aria-hidden="true" /> {t('empezar')}
    </a>
  );

  return (
    <div className="portada">
      <section className="portada-hero">
        <div className="portada-hero-texto">
          <a className="portada-novedad" href="/docs/draw-on-screen" onClick={alClicEnlace}>
            <b>{es ? 'Nuevo' : 'New'}</b>{' '}
            {es ? 'Dibuja sobre tu pantalla mientras grabas →' : 'Draw on your screen while you record →'}
          </a>
          <h1>
            {es ? (
              <>
                Graba tu pantalla. <span>Compártela en segundos.</span>
              </>
            ) : (
              <>
                Record your screen. <span>Share it in seconds.</span>
              </>
            )}
          </h1>
          <p className="portada-sub">{t('sublema')}</p>
          <div className="fila-botones izquierda">
            {empezar}
            <a
              className="boton secundario grande portada-segundo"
              href="/docs/start-here"
              onClick={alClicEnlace}
            >
              {es ? 'Ver cómo funciona' : 'See how it works'}
            </a>
          </div>
          <ul className="portada-confianza">
            <li>✓ {es ? 'Sin instalar nada' : 'Nothing to install'}</li>
            <li>✓ {es ? 'Hasta 4K' : 'Up to 4K'}</li>
            <li>✓ {es ? 'En inglés y español' : 'English and Spanish'}</li>
          </ul>
        </div>
        <Demo />
      </section>

      <section className="portada-redes" aria-label={es ? 'Comparte en tus redes' : 'Share anywhere'}>
        <p>{es ? 'Tu video, donde ya está tu gente' : 'Your video, wherever your people are'}</p>
        <div className="portada-logos">
          {/* La cinta va dos veces seguida para que dé la vuelta sin cortes. */}
          <div className="portada-logos-cinta">
            {[...REDES, ...REDES].map((i, n) => (
              <span key={`${i.slug}-${n}`} aria-hidden={n >= REDES.length}>
                <Logo icono={i} tam={44} /> {i.title}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="portada-pasos">
        <h2>{es ? 'Tres pasos. Cero complicaciones.' : 'Three steps. Zero hassle.'}</h2>
        <ol>
          <li>
            <span>1</span>
            <h3>{es ? 'Graba' : 'Record'}</h3>
            <p>{es ? 'Pantalla, cámara y voz con un clic.' : 'Screen, camera and voice in one click.'}</p>
          </li>
          <li>
            <span>2</span>
            <h3>{es ? 'Mejora' : 'Polish'}</h3>
            <p>
              {es
                ? 'Recorta, dibuja y deja que la IA escriba el resto.'
                : 'Trim, draw and let AI write the rest.'}
            </p>
          </li>
          <li>
            <span>3</span>
            <h3>{es ? 'Comparte' : 'Share'}</h3>
            <p>
              {es
                ? 'Pega el enlace en cualquier chat, correo o red social.'
                : 'Paste the link in any chat, email or social network.'}
            </p>
          </li>
        </ol>
      </section>

      {VITRINA.map((v, i) => (
        <section key={v.captura} className={`portada-vitrina ${i % 2 ? 'invertida' : ''}`}>
          <div className="portada-vitrina-texto">
            <span className="portada-etiqueta">{v.etiqueta[idioma]}</span>
            <h2>{v.titulo[idioma]}</h2>
            <p>{v.texto[idioma]}</p>
            <ul>
              {v.puntos.map((p) => (
                <li key={p.en}>✓ {p[idioma]}</li>
              ))}
            </ul>
          </div>
          <figure className="portada-vitrina-captura">
            <img
              src={`/capturas/${v.captura}-${idioma}.webp`}
              alt={v.titulo[idioma]}
              loading="lazy"
              onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
            />
          </figure>
        </section>
      ))}

      <section className="portada-herramientas">
        <h2>{es ? 'Todo lo que trae Pantalay' : 'Everything Pantalay can do'}</h2>
        <div>
          {HERRAMIENTAS.map(([icono, texto]) => (
            <span key={texto.en}>
              <b aria-hidden="true">{icono}</b> {texto[idioma]}
            </span>
          ))}
        </div>
      </section>

      <section className="portada-seguro">
        <div>
          <Logo icono={siStripe} tam={44} />
          <h3>{es ? 'Pagos seguros con Stripe' : 'Secure payments with Stripe'}</h3>
          <p>
            {es
              ? 'Los planes se pagan con Stripe, dentro de Pantalay. Nunca vemos ni guardamos tu tarjeta.'
              : 'Plans are paid with Stripe, right inside Pantalay. We never see or store your card.'}
          </p>
        </div>
        <div>
          <span className="portada-seguro-icono" aria-hidden="true">
            🔒
          </span>
          <h3>{es ? 'Tú decides quién lo ve' : 'You decide who watches'}</h3>
          <p>
            {es
              ? 'Privado o con enlace, y lo cambias con un toque.'
              : 'Private or by link, and you change it with one tap.'}
          </p>
        </div>
        <div>
          <span className="portada-seguro-icono" aria-hidden="true">
            🛟
          </span>
          <h3>{es ? 'Tu grabación nunca se pierde' : 'Your recording is never lost'}</h3>
          <p>
            {es
              ? 'Se sube mientras grabas y queda una copia en tu computadora por si se va el internet.'
              : 'It uploads while you record and keeps a copy on your computer in case your internet drops.'}
          </p>
        </div>
      </section>

      <section className="portada-preguntas" aria-labelledby="preguntas-titulo">
        <h2 id="preguntas-titulo">{es ? 'Preguntas frecuentes' : 'Frequently asked questions'}</h2>
        {PREGUNTAS[idioma].map((q) => (
          <details key={q.p}>
            <summary>{q.p}</summary>
            <p>{q.r}</p>
          </details>
        ))}
      </section>

      <section className="portada-final">
        <h2>{es ? 'Tu primer video está a un clic.' : 'Your first video is one click away.'}</h2>
        <p>
          {es
            ? 'Crea tu cuenta gratis y graba ahora mismo.'
            : 'Create your free account and record right now.'}
        </p>
        {empezar}
      </section>
    </div>
  );
}
