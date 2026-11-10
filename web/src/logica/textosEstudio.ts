// Textos del Estudio de reacciones (inglés principal y español neutro). Aparte de idioma.ts, como los de la extensión.
import type { Idioma } from './idioma';

const en = {
  titulo: 'Reaction Studio',
  intro:
    'Paste a YouTube or TikTok link, react with your camera and record only the stage: no browser bar, no tabs, no desktop.',
  enlace: 'YouTube, TikTok or Pantalay link',
  enlacePlaceholder: 'https://www.youtube.com/watch?v=… or https://www.tiktok.com/@…/video/…',
  cargar: 'Load video',
  enlaceMalo:
    'That does not look like a YouTube, TikTok or Pantalay video link. Paste the full link of the video, or upload it from your computer.',
  noExiste: 'We could not find that video. Check the link.',
  ocupado:
    'TikTok is not letting this video play here. It almost always means you are not signed in to TikTok in this browser: sign in at tiktok.com, then load the video again.',
  tocarTiktok:
    'TikTok asks for one tap: tap the video once to start it. After that, use these buttons to play, pause and skip.',
  noArranco: 'The video did not start. Tap the video directly, or open it on its own page.',
  noArrancoTiktok:
    'The TikTok did not start. TikTok only plays inside other sites if you are signed in to TikTok in this browser: sign in at tiktok.com, come back and load the video again.',
  ayudaPlataformas:
    'YouTube plays without an account. TikTok asks you to be signed in to TikTok in this same browser.',
  entrarTiktok: 'Sign in to TikTok',
  volumenVideo: 'Video volume',
  o: 'or',
  subirArchivo: 'Upload a video from my computer',
  archivoAyuda:
    'It plays from your computer: it is not uploaded anywhere. Write the creator’s @ in “Creator” so the credit shows.',
  archivoMalo: 'That file cannot be played here. Try an MP4.',
  bibliotecaAyuda:
    'A video from your Pantalay library. Write the creator’s @ in “Creator” so the credit shows.',
  elegirMicrofono: 'Microphone',
  elegirCamara: 'Camera',
  predeterminado: 'Browser default',
  predeterminada: 'Browser default',
  volumenMicro: 'Microphone in the recording',
  volumenAyuda:
    'The video volume changes only the video (what you hear and what is recorded), not your computer or your microphone. The microphone volume changes only how loud you sound in the recording.',
  karaoke: 'Karaoke',
  karaokeAyuda:
    'Karaoke makes your voice sound like a live singing show: a clean EQ, a touch of compression, a warm reverb and a short echo, with the music a little lower so the lyrics come through. The effect is in the recording (you hear yourself dry while singing).',
  karaokeEfecto: 'Effect',
  karaokeAudifonos: 'I’m using headphones (best sound)',
  karaokeParlantes: 'Using speakers? Keep the music low so it doesn’t get into the microphone.',
  karaokeDuranteGrabacion:
    'Turn Karaoke on or off before recording. You can move the Effect while recording.',
  volumenAyudaTiktok:
    'TikTok does not let other sites change its volume: this slider sets how loud the TikTok sounds in your recording (at 0 it is muted). The microphone volume changes only how loud you sound in the recording.',
  abrirTiktok: 'Open on TikTok',
  abrirYoutube: 'Open on YouTube',
  formato: 'Format',
  formatos: { horizontal: 'Horizontal 16:9 (YouTube)', vertical: 'Vertical 9:16 (Shorts, TikTok, Reels)' },
  posicion: 'Layout',
  disenos: {
    clasico: 'Camera + wide video',
    iguales: 'Two side by side',
    vertical: 'Small vertical video',
    grande: 'Big vertical video (TikTok, Shorts)',
  },
  disenosV: {
    protagonista: 'Video in the spotlight (small camera on top)',
    mitades: 'Big camera on top',
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
  enlace: 'Enlace de YouTube, TikTok o Pantalay',
  enlacePlaceholder: 'https://www.youtube.com/watch?v=… o https://www.tiktok.com/@…/video/…',
  cargar: 'Cargar video',
  enlaceMalo:
    'Eso no parece el enlace de un video de YouTube, TikTok o Pantalay. Pega el enlace completo del video, o súbelo desde tu computadora.',
  noExiste: 'No encontramos ese video. Revisa el enlace.',
  ocupado:
    'TikTok no deja reproducir este video aquí. Casi siempre es porque no has iniciado sesión en TikTok en este navegador: entra a tiktok.com, inicia sesión y vuelve a cargar el video.',
  tocarTiktok:
    'TikTok pide un toque: toca el video una vez para que arranque. Después lo manejas con estos botones: reproducir, pausar y saltar.',
  noArranco: 'El video no arrancó. Tócalo directamente o ábrelo en su página.',
  noArrancoTiktok:
    'El TikTok no arrancó. TikTok solo se reproduce dentro de otras páginas si tienes tu sesión de TikTok iniciada en este navegador: inicia sesión en tiktok.com, vuelve y carga el video otra vez.',
  ayudaPlataformas:
    'YouTube se reproduce sin cuenta. TikTok pide que tengas tu sesión de TikTok iniciada en este mismo navegador.',
  entrarTiktok: 'Iniciar sesión en TikTok',
  volumenVideo: 'Volumen del video',
  o: 'o',
  subirArchivo: 'Subir un video de mi computadora',
  archivoAyuda:
    'Se reproduce desde tu computadora: no se sube a ningún lado. Escribe el @ del creador en «Creador» para que el crédito quede a la vista.',
  archivoMalo: 'Ese archivo no se puede reproducir aquí. Prueba con un MP4.',
  bibliotecaAyuda:
    'Un video de tu biblioteca de Pantalay. Escribe el @ del creador en «Creador» para que el crédito quede a la vista.',
  elegirMicrofono: 'Micrófono',
  elegirCamara: 'Cámara',
  predeterminado: 'El predeterminado del navegador',
  predeterminada: 'La predeterminada del navegador',
  volumenMicro: 'Micrófono en la grabación',
  volumenAyuda:
    'El volumen del video cambia solo el video (lo que oyes y lo que se graba), no el de tu computadora ni el de tu micrófono. El del micrófono cambia solo qué tan fuerte sales tú en la grabación.',
  karaoke: 'Karaoke',
  karaokeAyuda:
    'Karaoke hace que tu voz suene como en un show de canto en vivo: ecualizada, un poco comprimida, con un reverb cálido y un eco corto, y la música un poco más baja para que se entienda la letra. El efecto queda en la grabación (mientras cantas te oyes sin efecto).',
  karaokeEfecto: 'Efecto',
  karaokeAudifonos: 'Uso audífonos (mejor sonido)',
  karaokeParlantes: '¿Con parlantes? Deja la música bajita para que no se meta en el micrófono.',
  karaokeDuranteGrabacion:
    'Enciende o apaga Karaoke antes de grabar. El Efecto lo puedes mover mientras grabas.',
  volumenAyudaTiktok:
    'TikTok no deja que otras páginas cambien su volumen: esta barra ajusta qué tan fuerte suena el TikTok en tu grabación (en 0 se silencia). El del micrófono cambia solo qué tan fuerte sales tú en la grabación.',
  abrirTiktok: 'Abrir en TikTok',
  abrirYoutube: 'Abrir en YouTube',
  formato: 'Formato',
  formatos: { horizontal: 'Horizontal 16:9 (YouTube)', vertical: 'Vertical 9:16 (Shorts, TikTok, Reels)' },
  posicion: 'Posición',
  disenos: {
    clasico: 'Cámara + video ancho',
    iguales: 'Dos horizontales',
    vertical: 'Video vertical pequeño',
    grande: 'Video vertical grande (TikTok, Shorts)',
  },
  disenosV: {
    protagonista: 'Video protagonista (cámara pequeña arriba)',
    mitades: 'Cámara grande arriba',
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
