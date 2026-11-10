// Páginas por búsqueda (SEO, 9 nov 2026): una por cada cosa que la gente escribe en Google. Inglés en «/<slug>»,
// español en «/es/<slug>». Escritas para personas; nada técnico ni privado. Las usan la página (Landing.tsx) y el
// servidor (texto para Google, título, descripción, datos estructurados y mapa del sitio).

export type Landing = {
  slug: string;
  icono: string;
  /** Adónde lleva el botón principal (con sesión). */
  destino: '/record' | '/studio';
  /** Guías de Docs relacionadas (enlaces internos). */
  guias: string[];
  en: TextoLanding;
  es: TextoLanding;
};

type TextoLanding = {
  /** Título para Google (≤ 60 caracteres aprox.). */
  titulo: string;
  /** Descripción para Google (≤ 155 caracteres aprox.). */
  descripcion: string;
  h1: string;
  intro: string;
  secciones: { h2: string; texto: string }[];
  pasos: string[];
  preguntas: { p: string; r: string }[];
  cta: string;
};

export const LANDINGS: Landing[] = [
  {
    slug: 'screen-recorder',
    icono: '🖥️',
    destino: '/record',
    guias: ['start-here', 'record-your-screen', 'record-computer-sound', 'download-mp4'],
    en: {
      titulo: 'Free Online Screen Recorder — No Download | Pantalay',
      descripcion:
        'Record your screen online for free, right in your browser. Screen, camera and sound, up to 4K, with an instant link and MP4 download. Nothing to install.',
      h1: 'Free online screen recorder, right in your browser',
      intro:
        'Pantalay records your screen, your camera and your voice without installing anything. When you stop, your video is already uploaded and its link is ready to share. Download it as MP4 whenever you want.',
      secciones: [
        {
          h2: 'Record your whole screen, a window or a tab',
          texto:
            'Choose what to share and record it in HD or up to 4K. Mark just the part you want with “Choose area” and nothing else shows: no desktop, no other apps.',
        },
        {
          h2: 'Your voice and your computer’s sound',
          texto:
            'Record your microphone and the sound of videos, music or calls together. Live meters show both, and Pantalay warns you if your microphone is not sending any signal.',
        },
        {
          h2: 'An instant link, and MP4 when you need it',
          texto:
            'Your video uploads while you record, so the link is copied the second you finish. Viewers watch it in their browser without an account, and you can download an MP4 that plays everywhere.',
        },
        {
          h2: 'Transcript, captions and AI',
          texto:
            'Every word becomes text as you speak. Get captions in English and Spanish, and let AI write the title, a summary and chapters for you.',
        },
      ],
      pasos: [
        'Open Pantalay and press Record.',
        'Choose screen, camera or both, and your microphone.',
        'Pick what to share and start. Press Finish when you are done.',
        'Your link is copied. Share it or download the MP4.',
      ],
      preguntas: [
        {
          p: 'Is this screen recorder really free?',
          r: 'Yes. You can create an account and record for free. Paid plans add longer videos, 4K and AI tools.',
        },
        {
          p: 'Do I need to download anything?',
          r: 'No. Pantalay works in Chrome, Edge, Firefox and Safari on your computer. There is nothing to install.',
        },
        {
          p: 'Can I record my screen with sound?',
          r: 'Yes. Pantalay records your microphone and your computer’s sound together, and shows you both levels while you record.',
        },
        {
          p: 'Can I save my recording as MP4?',
          r: 'Yes. Every video can be downloaded as an MP4 that plays on phones, computers, YouTube and social networks.',
        },
      ],
      cta: 'Record your screen for free',
    },
    es: {
      titulo: 'Grabar pantalla gratis online, sin descargar | Pantalay',
      descripcion:
        'Graba tu pantalla gratis desde el navegador: pantalla, cámara y sonido, hasta 4K, con enlace al instante y descarga en MP4. Sin instalar nada.',
      h1: 'Grabador de pantalla gratis, directo en tu navegador',
      intro:
        'Pantalay graba tu pantalla, tu cámara y tu voz sin instalar nada. Cuando terminas, tu video ya está subido y su enlace listo para compartir. Descárgalo en MP4 cuando quieras.',
      secciones: [
        {
          h2: 'Graba toda la pantalla, una ventana o una pestaña',
          texto:
            'Elige qué compartir y grábalo en HD o hasta 4K. Marca solo la parte que quieres con «Elegir qué parte» y no sale nada más: ni el escritorio ni otros programas.',
        },
        {
          h2: 'Tu voz y el sonido de la computadora',
          texto:
            'Graba tu micrófono y el sonido de videos, música o llamadas, juntos. Las barritas en vivo te muestran los dos, y Pantalay te avisa si tu micrófono no está mandando señal.',
        },
        {
          h2: 'Enlace al instante, y MP4 cuando lo necesites',
          texto:
            'Tu video se sube mientras grabas: el enlace queda copiado en cuanto terminas. Quien lo recibe lo ve en su navegador sin cuenta, y tú puedes descargar un MP4 que se reproduce en todos lados.',
        },
        {
          h2: 'Transcripción, subtítulos e IA',
          texto:
            'Cada palabra se convierte en texto mientras hablas. Tienes subtítulos en español e inglés, y la IA te escribe el título, un resumen y los capítulos.',
        },
      ],
      pasos: [
        'Abre Pantalay y toca Grabar.',
        'Elige pantalla, cámara o las dos, y tu micrófono.',
        'Elige qué compartir y empieza. Toca Terminar cuando acabes.',
        'Tu enlace queda copiado. Compártelo o descarga el MP4.',
      ],
      preguntas: [
        {
          p: '¿Este grabador de pantalla es gratis de verdad?',
          r: 'Sí. Puedes crear tu cuenta y grabar gratis. Los planes pagos suman videos más largos, 4K y herramientas de IA.',
        },
        {
          p: '¿Tengo que descargar algo?',
          r: 'No. Pantalay funciona en Chrome, Edge, Firefox y Safari de tu computadora. No hay nada que instalar.',
        },
        {
          p: '¿Puedo grabar la pantalla con sonido?',
          r: 'Sí. Pantalay graba tu micrófono y el sonido de la computadora juntos, y te muestra los dos niveles mientras grabas.',
        },
        {
          p: '¿Puedo guardar la grabación en MP4?',
          r: 'Sí. Cada video se descarga en MP4 y se reproduce en celulares, computadoras, YouTube y redes sociales.',
        },
      ],
      cta: 'Grabar mi pantalla gratis',
    },
  },
  {
    slug: 'record-screen-and-camera',
    icono: '🎥',
    destino: '/record',
    guias: ['camera-bubble', 'record-your-screen', 'draw-on-screen'],
    en: {
      titulo: 'Record Your Screen and Webcam at the Same Time | Pantalay',
      descripcion:
        'Record your screen and your webcam together in the browser: your face in a floating bubble, your voice and your screen, then share a link or download MP4.',
      h1: 'Record your screen and webcam at the same time',
      intro:
        'Show your screen and your face in the same video. Pantalay puts your camera in a bubble you can move and resize, and records everything with your voice, ready to share with a link.',
      secciones: [
        {
          h2: 'Your face in a floating bubble',
          texto:
            'Round, square or vertical, small or large, with an animated color border. The bubble floats over every app, so it stays with you while you move around.',
        },
        {
          h2: 'Point, draw and explain',
          texto:
            'Use the pencils to draw arrows, circles and highlights on your screen while you record. Perfect for tutorials, product demos, feedback and classes.',
        },
        {
          h2: 'Vertical too',
          texto:
            'Make a 9:16 Short with your screen in one half and your camera in the other, ready for YouTube Shorts, TikTok and Reels.',
        },
      ],
      pasos: [
        'Press Record and choose Screen + Cam.',
        'Pick your camera, microphone and the bubble you like.',
        'Share your screen and start talking.',
        'Finish and share your link or download the MP4.',
      ],
      preguntas: [
        {
          p: 'Can I record my screen and camera at the same time for free?',
          r: 'Yes. Screen + camera recording is included for free, right in your browser.',
        },
        {
          p: 'Can I move or hide the camera bubble?',
          r: 'Yes. Change its size, shape and corner before recording, and it floats over your other apps while you record.',
        },
        {
          p: 'Does it work for online classes and tutorials?',
          r: 'Yes. Teachers, trainers and support teams use it to explain step by step with their face on screen.',
        },
      ],
      cta: 'Record screen and camera',
    },
    es: {
      titulo: 'Grabar pantalla y cámara al mismo tiempo | Pantalay',
      descripcion:
        'Graba tu pantalla y tu cámara juntas desde el navegador: tu cara en una burbuja flotante, tu voz y tu pantalla. Comparte con un enlace o descarga en MP4.',
      h1: 'Graba tu pantalla y tu cámara al mismo tiempo',
      intro:
        'Muestra tu pantalla y tu cara en el mismo video. Pantalay pone tu cámara en una burbuja que puedes mover y agrandar, y lo graba todo con tu voz, listo para compartir con un enlace.',
      secciones: [
        {
          h2: 'Tu cara en una burbuja flotante',
          texto:
            'Redonda, cuadrada o vertical, chica o grande, con un borde de colores animado. La burbuja flota encima de todos tus programas y te acompaña mientras te mueves.',
        },
        {
          h2: 'Señala, dibuja y explica',
          texto:
            'Usa los lápices para dibujar flechas, círculos y resaltados sobre tu pantalla mientras grabas. Ideal para tutoriales, demostraciones, revisiones y clases.',
        },
        {
          h2: 'También en vertical',
          texto:
            'Haz un Short 9:16 con tu pantalla en una mitad y tu cámara en la otra, listo para YouTube Shorts, TikTok y Reels.',
        },
      ],
      pasos: [
        'Toca Grabar y elige Pantalla + cámara.',
        'Elige tu cámara, tu micrófono y la burbuja que te guste.',
        'Comparte tu pantalla y empieza a hablar.',
        'Termina y comparte tu enlace o descarga el MP4.',
      ],
      preguntas: [
        {
          p: '¿Puedo grabar mi pantalla y mi cámara al mismo tiempo gratis?',
          r: 'Sí. Grabar pantalla y cámara está incluido gratis, directo en tu navegador.',
        },
        {
          p: '¿Puedo mover o esconder la burbuja de la cámara?',
          r: 'Sí. Cambia su tamaño, su forma y su esquina antes de grabar, y flota encima de tus otros programas mientras grabas.',
        },
        {
          p: '¿Sirve para clases en línea y tutoriales?',
          r: 'Sí. Profesores, capacitadores y equipos de soporte lo usan para explicar paso a paso con su cara en pantalla.',
        },
      ],
      cta: 'Grabar pantalla y cámara',
    },
  },
  {
    slug: 'reaction-video-maker',
    icono: '🎙️',
    destino: '/studio',
    guias: ['reaction-studio', 'interview-a-remote-guest', 'record-a-vertical-short'],
    en: {
      titulo: 'Reaction Video Maker — React to YouTube & TikTok | Pantalay',
      descripcion:
        'Make reaction videos online: paste a YouTube or TikTok link, react with your camera in a podcast-style frame and record only the stage. Horizontal or vertical.',
      h1: 'Make reaction videos like a pro podcast',
      intro:
        'Paste a YouTube or TikTok link (or upload your own video) and react live with your camera. Pantalay puts you, the video, the creator’s name and today’s topic in a polished frame, and records only that frame.',
      secciones: [
        {
          h2: 'A podcast-style frame, ready to publish',
          texto:
            'Your camera with your name, the video with the creator’s name, and a “Today’s topic” strip. No browser bar, no tabs, no desktop: just the show.',
        },
        {
          h2: 'Horizontal for YouTube, vertical for Shorts and TikTok',
          texto:
            'Choose 16:9 or 9:16 and the layout you like: camera plus wide video, side by side, or the video in the spotlight with your camera small on top.',
        },
        {
          h2: 'Control the video without leaving the studio',
          texto:
            'Play, pause and skip 5 seconds with buttons or shortcuts. Set the video volume and your microphone volume separately, so your voice is always clear.',
        },
        {
          h2: 'Credit the creator',
          texto:
            'The creator’s name is shown on screen. React with your own commentary and respect the creator’s rights when you publish.',
        },
      ],
      pasos: [
        'Open the Reaction Studio and paste a YouTube or TikTok link, or upload a video.',
        'Choose horizontal or vertical and your layout.',
        'Press Start recording and choose “This tab”.',
        'React, finish, and download your MP4.',
      ],
      preguntas: [
        {
          p: 'Do I need to download the YouTube or TikTok video?',
          r: 'No. The video plays with the official player inside the studio. You can also upload a video from your computer.',
        },
        {
          p: 'Can I make vertical reaction videos for TikTok and Shorts?',
          r: 'Yes. Choose the vertical 9:16 format and the video gets the spotlight with your camera small on top.',
        },
        {
          p: 'Which browsers work?',
          r: 'The Reaction Studio works in Chrome and Edge on a computer.',
        },
      ],
      cta: 'Open the Reaction Studio',
    },
    es: {
      titulo: 'Hacer videos de reacción a YouTube y TikTok | Pantalay',
      descripcion:
        'Haz videos de reacción online: pega un enlace de YouTube o TikTok, reacciona con tu cámara en un marco estilo podcast y graba solo el escenario. Horizontal o vertical.',
      h1: 'Haz videos de reacción como un podcast profesional',
      intro:
        'Pega un enlace de YouTube o de TikTok (o sube tu propio video) y reacciona en vivo con tu cámara. Pantalay te pone a ti, el video, el nombre del creador y el tema del día en un marco cuidado, y graba solo ese marco.',
      secciones: [
        {
          h2: 'Un marco estilo podcast, listo para publicar',
          texto:
            'Tu cámara con tu nombre, el video con el nombre del creador y una franja «Tema de hoy». Sin barra del navegador, sin pestañas y sin escritorio: solo el programa.',
        },
        {
          h2: 'Horizontal para YouTube, vertical para Shorts y TikTok',
          texto:
            'Elige 16:9 o 9:16 y la posición que te guste: cámara más video ancho, uno al lado del otro, o el video de protagonista con tu cámara pequeña arriba.',
        },
        {
          h2: 'Maneja el video sin salir del estudio',
          texto:
            'Reproduce, pausa y salta 5 segundos con botones o atajos. Ajusta el volumen del video y el de tu micrófono por separado, para que tu voz siempre se escuche clara.',
        },
        {
          h2: 'Dale el crédito al creador',
          texto:
            'El nombre del creador sale en pantalla. Reacciona con comentarios propios y respeta los derechos del creador al publicar.',
        },
      ],
      pasos: [
        'Abre el Estudio de reacciones y pega un enlace de YouTube o TikTok, o sube un video.',
        'Elige horizontal o vertical y la posición.',
        'Toca Empezar a grabar y elige «Esta pestaña».',
        'Reacciona, termina y descarga tu MP4.',
      ],
      preguntas: [
        {
          p: '¿Tengo que descargar el video de YouTube o TikTok?',
          r: 'No. El video se reproduce con el reproductor oficial dentro del estudio. También puedes subir un video de tu computadora.',
        },
        {
          p: '¿Puedo hacer videos de reacción verticales para TikTok y Shorts?',
          r: 'Sí. Elige el formato vertical 9:16 y el video queda de protagonista con tu cámara pequeña arriba.',
        },
        {
          p: '¿En qué navegadores funciona?',
          r: 'El Estudio de reacciones funciona en Chrome y Edge de computadora.',
        },
      ],
      cta: 'Abrir el Estudio de reacciones',
    },
  },
  {
    slug: 'vertical-video-recorder',
    icono: '📱',
    destino: '/record',
    guias: ['record-a-vertical-short', 'reaction-studio', 'youtube-texts', 'youtube-thumbnail'],
    en: {
      titulo: 'Vertical Video Recorder for Shorts, TikTok & Reels | Pantalay',
      descripcion:
        'Record vertical 9:16 videos in your browser for YouTube Shorts, TikTok and Instagram Reels: screen and camera together, 1080 × 1920, ready to upload.',
      h1: 'Record vertical videos for Shorts, TikTok and Reels',
      intro:
        'Create 9:16 videos straight from your computer: what you are showing in one half and your camera in the other, at 1080 × 1920. Download the MP4 and upload it to YouTube Shorts, TikTok or Reels.',
      secciones: [
        {
          h2: 'Frame exactly what you want',
          texto:
            'Mark the part of your screen that goes in the Short: the frame keeps the exact shape of its half, so what you see is what you get.',
        },
        {
          h2: 'Your camera, sharp and in its place',
          texto:
            'Camera on top or at the bottom, bigger or smaller. The preview shows your Short before you record a single second.',
        },
        {
          h2: 'Titles and tags for YouTube',
          texto:
            'Use “For YouTube” to get titles, a description, tags and hashtags ready to paste into YouTube Studio.',
        },
      ],
      pasos: [
        'Press Record, choose Screen + Cam and “Vertical Short (9:16)”.',
        'Share the screen or tab you will show and frame it.',
        'Arrange your camera and press Start recording.',
        'Download the MP4 and upload it to Shorts, TikTok or Reels.',
      ],
      preguntas: [
        {
          p: 'What size are the vertical videos?',
          r: '1080 × 1920 (9:16), the size YouTube Shorts, TikTok and Instagram Reels expect.',
        },
        {
          p: 'Can I react to a video in vertical format?',
          r: 'Yes. In the Reaction Studio choose the vertical format and the video gets the spotlight with your camera small on top.',
        },
      ],
      cta: 'Record a vertical video',
    },
    es: {
      titulo: 'Grabar videos verticales para Shorts, TikTok y Reels | Pantalay',
      descripcion:
        'Graba videos verticales 9:16 desde tu navegador para YouTube Shorts, TikTok e Instagram Reels: pantalla y cámara juntas, 1080 × 1920, listos para subir.',
      h1: 'Graba videos verticales para Shorts, TikTok y Reels',
      intro:
        'Crea videos 9:16 desde tu computadora: lo que muestras en una mitad y tu cámara en la otra, en 1080 × 1920. Descarga el MP4 y súbelo a YouTube Shorts, TikTok o Reels.',
      secciones: [
        {
          h2: 'Encuadra justo lo que quieres',
          texto:
            'Marca la parte de tu pantalla que va en el Short: el recuadro tiene la forma exacta de su mitad, así que lo que ves es lo que sale.',
        },
        {
          h2: 'Tu cámara, nítida y en su lugar',
          texto:
            'Cámara arriba o abajo, más grande o más chica. La vista previa te muestra tu Short antes de grabar un solo segundo.',
        },
        {
          h2: 'Títulos y etiquetas para YouTube',
          texto:
            'Usa «Para YouTube» y recibe títulos, descripción, etiquetas y hashtags listos para pegar en YouTube Studio.',
        },
      ],
      pasos: [
        'Toca Grabar, elige Pantalla + cámara y «Short vertical (9:16)».',
        'Comparte la pantalla o la pestaña que vas a mostrar y encuádrala.',
        'Acomoda tu cámara y toca Empezar a grabar.',
        'Descarga el MP4 y súbelo a Shorts, TikTok o Reels.',
      ],
      preguntas: [
        {
          p: '¿De qué tamaño salen los videos verticales?',
          r: '1080 × 1920 (9:16), el tamaño que piden YouTube Shorts, TikTok e Instagram Reels.',
        },
        {
          p: '¿Puedo reaccionar a un video en formato vertical?',
          r: 'Sí. En el Estudio de reacciones elige el formato vertical y el video queda de protagonista con tu cámara pequeña arriba.',
        },
      ],
      cta: 'Grabar un video vertical',
    },
  },
];

export const landingPorSlug = (slug: string) => LANDINGS.find((l) => l.slug === slug);
export const SLUGS_LANDING = LANDINGS.map((l) => l.slug);
