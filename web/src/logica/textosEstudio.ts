// Textos del Estudio de reacciones (inglés principal y español neutro). Aparte de idioma.ts, como los de la extensión.
import type { Idioma } from './idioma';

const en = {
  titulo: 'Reaction Studio',
  intro:
    'Paste a YouTube or TikTok link, react with your camera and record only the stage: no browser bar, no tabs, no desktop.',
  enlace: 'YouTube or TikTok link',
  enlacePlaceholder: 'https://www.youtube.com/watch?v=… or https://www.tiktok.com/@…/video/…',
  cargar: 'Load video',
  enlaceMalo: 'That does not look like a YouTube or TikTok video link. Paste the full link of the video.',
  noExiste: 'We could not find that video. Check the link.',
  ocupado: 'TikTok is not letting this video play right now. Try again in a minute, or open it on TikTok.',
  tocarTiktok:
    'TikTok asks for one tap: tap the video once to start it. After that, use these buttons to play, pause and skip.',
  noArranco: 'The video did not start. Tap the video directly, or open it on its own page.',
  abrirTiktok: 'Open on TikTok',
  abrirYoutube: 'Open on YouTube',
  formato: 'Format',
  formatos: { horizontal: 'Horizontal 16:9 (YouTube)', vertical: 'Vertical 9:16 (Shorts, TikTok, Reels)' },
  posicion: 'Layout',
  disenos: {
    clasico: 'Camera + wide video',
    iguales: 'Two side by side',
    vertical: 'Vertical video (TikTok, Shorts)',
  },
  noInsertable:
    'The owner of this video does not allow it to play outside YouTube. Use Record → “Choose area” and share the YouTube tab instead.',
  irGrabar: 'Open Record',
  creador: 'Creator',
  tema: "Today's topic",
  programa: 'Show name',
  reproducir: 'Play',
  pausar: 'Pause',
  atras: 'Back 5 s',
  adelante: 'Forward 5 s',
  atajos: 'Shortcuts: Space or K play/pause · J or ← back 5 s · L or → forward 5 s',
  grabar: 'Start recording',
  pausaGrabacion: 'Pause recording',
  continuar: 'Resume',
  terminar: 'Finish',
  descartar: 'Discard',
  grabando: 'Recording',
  enPausa: 'Paused',
  subiendo: 'Uploading…',
  consejo:
    'When your browser asks, choose “This tab” and turn on “Also share tab audio”. Keep the stage on screen while you record.',
  sinRecorte:
    'The Reaction Studio needs Chrome or Edge on a computer. In this browser you can still react with Record → “Choose area”.',
  otraPestana: 'Choose “This tab” (the Pantalay tab) so only the stage is recorded.',
  sinCamara: 'Turn on your camera to appear in the show. Check your browser’s camera permission.',
  sinPermiso: 'Recording was not allowed. Try again and choose “This tab”.',
  sinSonido:
    'Tab audio is off: the video’s sound will not be recorded. Next time turn on “Also share tab audio”.',
  fallo: 'The upload failed. Your recording is kept on this computer: open Record to retry it.',
  derechos:
    'React with your own comments and respect the creator’s rights. You are responsible for what you publish.',
  sinVideo: 'Load a video first.',
  microfono: 'Microphone',
  sonidoVideo: 'Video sound',
};

const es: typeof en = {
  titulo: 'Estudio de reacciones',
  intro:
    'Pega un enlace de YouTube o de TikTok, reacciona con tu cámara y graba solo el escenario: sin barra del navegador, sin pestañas y sin escritorio.',
  enlace: 'Enlace de YouTube o de TikTok',
  enlacePlaceholder: 'https://www.youtube.com/watch?v=… o https://www.tiktok.com/@…/video/…',
  cargar: 'Cargar video',
  enlaceMalo:
    'Eso no parece el enlace de un video de YouTube o de TikTok. Pega el enlace completo del video.',
  noExiste: 'No encontramos ese video. Revisa el enlace.',
  ocupado:
    'TikTok no está dejando reproducir este video en este momento. Inténtalo en un minuto o ábrelo en TikTok.',
  tocarTiktok:
    'TikTok pide un toque: toca el video una vez para que arranque. Después lo manejas con estos botones: reproducir, pausar y saltar.',
  noArranco: 'El video no arrancó. Tócalo directamente o ábrelo en su página.',
  abrirTiktok: 'Abrir en TikTok',
  abrirYoutube: 'Abrir en YouTube',
  formato: 'Formato',
  formatos: { horizontal: 'Horizontal 16:9 (YouTube)', vertical: 'Vertical 9:16 (Shorts, TikTok, Reels)' },
  posicion: 'Posición',
  disenos: {
    clasico: 'Cámara + video ancho',
    iguales: 'Dos horizontales',
    vertical: 'Video vertical (TikTok, Shorts)',
  },
  noInsertable:
    'El dueño de este video no deja reproducirlo fuera de YouTube. Usa Grabar → «Elegir qué parte» y comparte la pestaña de YouTube.',
  irGrabar: 'Abrir Grabar',
  creador: 'Creador',
  tema: 'Tema de hoy',
  programa: 'Nombre del programa',
  reproducir: 'Reproducir',
  pausar: 'Pausar',
  atras: 'Atrás 5 s',
  adelante: 'Adelante 5 s',
  atajos: 'Atajos: Espacio o K reproducir/pausar · J o ← atrás 5 s · L o → adelante 5 s',
  grabar: 'Empezar a grabar',
  pausaGrabacion: 'Pausar la grabación',
  continuar: 'Continuar',
  terminar: 'Terminar',
  descartar: 'Descartar',
  grabando: 'Grabando',
  enPausa: 'En pausa',
  subiendo: 'Subiendo…',
  consejo:
    'Cuando el navegador pregunte, elige «Esta pestaña» y enciende «Compartir también el audio de la pestaña». Deja el escenario a la vista mientras grabas.',
  sinRecorte:
    'El Estudio de reacciones necesita Chrome o Edge en una computadora. En este navegador puedes reaccionar con Grabar → «Elegir qué parte».',
  otraPestana: 'Elige «Esta pestaña» (la de Pantalay) para que se grabe solo el escenario.',
  sinCamara: 'Enciende tu cámara para salir en el programa. Revisa el permiso de cámara del navegador.',
  sinPermiso: 'No se permitió grabar. Inténtalo otra vez y elige «Esta pestaña».',
  sinSonido:
    'El audio de la pestaña está apagado: el sonido del video no se grabará. La próxima vez enciende «Compartir también el audio de la pestaña».',
  fallo: 'La subida falló. Tu grabación quedó guardada en esta computadora: abre Grabar para reintentarla.',
  derechos:
    'Reacciona con comentarios propios y respeta los derechos del creador. Lo que publicas es tu responsabilidad.',
  sinVideo: 'Primero carga un video.',
  microfono: 'Micrófono',
  sonidoVideo: 'Sonido del video',
};

export const TEXTOS_ESTUDIO: Record<Idioma, typeof en> = { en, es };
