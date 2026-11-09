// Textos del Estudio de reacciones (inglés principal y español neutro). Aparte de idioma.ts, como los de la extensión.
import type { Idioma } from './idioma';

const en = {
  titulo: 'Reaction Studio',
  intro:
    'Paste a YouTube link, react with your camera and record only the stage: no browser bar, no tabs, no desktop.',
  enlace: 'YouTube link',
  enlacePlaceholder: 'https://www.youtube.com/watch?v=…',
  cargar: 'Load video',
  enlaceMalo: 'That does not look like a YouTube video link. Paste the full link of a video or a Short.',
  noExiste: 'We could not find that video. Check the link.',
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
    'Pega un enlace de YouTube, reacciona con tu cámara y graba solo el escenario: sin barra del navegador, sin pestañas y sin escritorio.',
  enlace: 'Enlace de YouTube',
  enlacePlaceholder: 'https://www.youtube.com/watch?v=…',
  cargar: 'Cargar video',
  enlaceMalo:
    'Eso no parece el enlace de un video de YouTube. Pega el enlace completo de un video o de un Short.',
  noExiste: 'No encontramos ese video. Revisa el enlace.',
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
