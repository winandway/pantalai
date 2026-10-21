// Lo que hace Pantalay, en una línea por función. Lo usan la portada y el servidor (para Google y las IAs).
export const FUNCIONES: Record<'en' | 'es', [string, string][]> = {
  en: [
    [
      'Screen + camera',
      'Your screen with your face in a bubble, just the screen, or just the camera. Up to 4K.',
    ],
    [
      'Instant link',
      'Your video uploads while you record. The moment you stop, the link is on your clipboard.',
    ],
    [
      'Live transcript and captions',
      'Every word becomes text as you speak. Viewers get captions and a searchable transcript.',
    ],
    [
      'Edit without starting over',
      'Trim the ends, cut by transcript, remove silences, add text, arrows, boxes and blur.',
    ],
    [
      'Comments and reactions',
      'Viewers react and comment at the exact second. You see everything in one place.',
    ],
    ['Viewer insights', 'Views, average watch time, completion rate and button clicks for every video.'],
    [
      'AI writes the rest',
      'Title, summary, chapters and tasks appear on their own. Remove filler words in one click.',
    ],
    [
      'Video to document',
      'Turn any video into a step-by-step guide or bug report, with a screenshot per step.',
    ],
  ],
  es: [
    [
      'Pantalla + cámara',
      'Tu pantalla con tu cara en una burbuja, solo la pantalla o solo la cámara. Hasta 4K.',
    ],
    ['Enlace al instante', 'El video se sube mientras grabas. Al terminar, el enlace ya está copiado.'],
    [
      'Transcripción y subtítulos en vivo',
      'Cada palabra se vuelve texto mientras hablas. Quien lo ve tiene subtítulos y una transcripción para buscar.',
    ],
    [
      'Edita sin volver a grabar',
      'Recorta las puntas, corta con la transcripción, quita silencios, agrega textos, flechas, recuadros y difuminado.',
    ],
    [
      'Comentarios y reacciones',
      'Quien lo ve reacciona y comenta en el segundo exacto. Tú lo ves todo en un solo lugar.',
    ],
    [
      'Estadísticas',
      'Vistas, tiempo promedio, cuántos lo vieron completo y clics en tu botón, video por video.',
    ],
    [
      'La IA escribe lo demás',
      'Título, resumen, capítulos y tareas aparecen solos. Quita las muletillas con un clic.',
    ],
    [
      'De video a documento',
      'Convierte cualquier video en una guía paso a paso o un reporte de error, con una captura por paso.',
    ],
  ],
};

/** Preguntas frecuentes: se ven en la portada y van a Google como datos estructurados (deben coincidir). */
export const PREGUNTAS: Record<'en' | 'es', { p: string; r: string }[]> = {
  en: [
    {
      p: 'What is Pantalay?',
      r: 'Pantalay is a free screen and camera recorder that works in your web browser. You record your screen, your camera or both, and the moment you stop you get a link to share. Viewers watch it in their browser without an account.',
    },
    {
      p: 'Is Pantalay free?',
      r: 'Yes. You can create an account and start recording for free. Paid plans add unlimited videos and recording length, 4K, drawing tools and AI features.',
    },
    {
      p: 'Do I need to install anything?',
      r: 'No. Pantalay runs in a modern browser such as Chrome, Edge, Firefox or Safari on your computer. There is nothing to download.',
    },
    {
      p: 'Can I download my videos as MP4?',
      r: 'Yes. Every video can be downloaded as an MP4 file that plays on any phone, computer, YouTube or social network. If you trimmed the video, the download comes out trimmed.',
    },
    {
      p: 'Who can watch my videos?',
      r: 'You choose for each video: anyone with the link, or only you. You can also turn comments and downloads on or off, and embed the video on your website.',
    },
    {
      p: 'Does Pantalay make transcripts and captions?',
      r: 'Yes. Pantalay creates a transcript and captions in English and Spanish, and with AI it can write the title, summary, chapters and step-by-step documents from your video.',
    },
    {
      p: 'Is my data used to train AI?',
      r: 'No. Your videos are processed only to give you the results you ask for. Pantalay does not sell personal data and does not show ads.',
    },
  ],
  es: [
    {
      p: '¿Qué es Pantalay?',
      r: 'Pantalay es un grabador de pantalla y cámara gratis que funciona en tu navegador. Grabas tu pantalla, tu cámara o las dos, y en cuanto paras tienes un enlace para compartir. Quien lo recibe lo ve en su navegador, sin cuenta.',
    },
    {
      p: '¿Pantalay es gratis?',
      r: 'Sí. Puedes crear tu cuenta y empezar a grabar gratis. Los planes pagos suman videos y duración sin límite, 4K, lápices para dibujar y funciones de IA.',
    },
    {
      p: '¿Tengo que instalar algo?',
      r: 'No. Pantalay funciona en un navegador moderno como Chrome, Edge, Firefox o Safari en tu computadora. No hay nada que descargar.',
    },
    {
      p: '¿Puedo descargar mis videos en MP4?',
      r: 'Sí. Cada video se descarga en MP4, que se abre en cualquier celular, computadora, YouTube o red social. Si recortaste el video, la descarga sale recortada.',
    },
    {
      p: '¿Quién puede ver mis videos?',
      r: 'Tú eliges en cada video: cualquiera con el enlace, o solo tú. También puedes activar o apagar los comentarios y la descarga, e insertar el video en tu página web.',
    },
    {
      p: '¿Pantalay hace transcripciones y subtítulos?',
      r: 'Sí. Pantalay crea la transcripción y los subtítulos en inglés y español, y con IA puede escribir el título, el resumen, los capítulos y documentos paso a paso a partir de tu video.',
    },
    {
      p: '¿Usan mis datos para entrenar la IA?',
      r: 'No. Tus videos se procesan solo para darte los resultados que pides. Pantalay no vende datos personales y no muestra publicidad.',
    },
  ],
};
