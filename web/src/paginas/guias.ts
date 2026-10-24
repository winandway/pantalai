// Guías públicas de Docs, en inglés y español. Escritas para el público, sin nada técnico ni privado.
export type Guia = {
  slug: string;
  seccion: 'empezar' | 'grabar' | 'compartir' | 'editar' | 'ia' | 'cuenta';
  icono: string;
  imagen?: string;
  /** Una captura después de cada párrafo (misma posición que «cuerpo»); null = sin captura. */
  imagenes?: (string | null)[];
  en: { titulo: string; resumen: string; cuerpo: string[] };
  es: { titulo: string; resumen: string; cuerpo: string[] };
};

export const SECCIONES: Record<Guia['seccion'], { en: string; es: string; icono: string }> = {
  empezar: { en: 'Getting started', es: 'Primeros pasos', icono: '🚀' },
  grabar: { en: 'Recording', es: 'Grabar', icono: '⏺' },
  compartir: { en: 'Sharing & viewers', es: 'Compartir y quién lo ve', icono: '🔗' },
  editar: { en: 'Editing', es: 'Editar', icono: '✂' },
  ia: { en: 'AI', es: 'IA', icono: '✨' },
  cuenta: { en: 'Library & account', es: 'Biblioteca y cuenta', icono: '📁' },
};

export const GUIAS: Guia[] = [
  {
    slug: 'start-here',
    seccion: 'empezar',
    icono: '🚀',
    imagenes: ['crear-cuenta', 'grabar', null, 'video', 'compartir', 'editar', 'generar'],
    en: {
      titulo: 'Start here: your first video in 5 minutes',
      resumen: 'Create your account, record, let AI do the rest, share and edit — step by step.',
      cuerpo: [
        '1. Create your account. Open Pantalay and press Sign up. Write your name, your email and a password of at least 8 characters, and press Create account. You land in your library.',
        '2. Record. Press the red Record button. Choose Screen + Cam, pick your camera and microphone, choose the quality and the language you will speak, and press Start recording. Your browser asks what to share: choose a screen, a window or a tab and press Share. After a 3-second countdown, talk and show what you want.',
        '3. Finish. Press Finish (or “Stop sharing” in the browser bar). Your video is already uploaded and its link is copied: you can paste it anywhere right away.',
        '4. Let AI work. Your video opens and a line at the top shows that AI is working. In about a minute you get a title, a summary, chapters on the progress bar, the tasks you mentioned, and an accurate transcript with captions.',
        '5. Share. Press Share to choose who can watch, start at a specific minute, copy the link or the embed code, or send it by email or WhatsApp.',
        '6. Edit if you want. Press Edit to trim the start and the end, remove filler words or silences with one click, cut sentences from the transcript, and add text, arrows, boxes, blur or a button. Your original file is never touched.',
        '7. Turn it into a document. Press Generate, pick a template like “Step-by-step procedure”, and get every step with its minute and a screenshot. Copy it or download it.',
      ],
    },
    es: {
      titulo: 'Empieza aquí: tu primer video en 5 minutos',
      resumen: 'Crea tu cuenta, graba, deja que la IA haga el resto, comparte y edita, paso a paso.',
      cuerpo: [
        '1. Crea tu cuenta. Abre Pantalay y toca Crear cuenta. Escribe tu nombre, tu correo y una contraseña de al menos 8 caracteres, y toca Crear cuenta. Llegas a tu biblioteca.',
        '2. Graba. Toca el botón rojo Grabar. Elige Pantalla + cámara, escoge tu cámara y tu micrófono, la calidad y el idioma en que vas a hablar, y toca Empezar a grabar. El navegador te pregunta qué compartir: elige una pantalla, una ventana o una pestaña y toca Compartir. Después de la cuenta de 3 segundos, habla y muestra lo que quieras.',
        '3. Termina. Toca Terminar (o «Dejar de compartir» en la barra del navegador). Tu video ya está subido y su enlace copiado: lo puedes pegar donde quieras de inmediato.',
        '4. Deja trabajar a la IA. Se abre tu video y arriba aparece que la IA está trabajando. En más o menos un minuto tienes título, resumen, capítulos en la barra, las tareas que mencionaste y una transcripción precisa con subtítulos.',
        '5. Comparte. Toca Compartir para elegir quién puede verlo, hacer que empiece en un minuto exacto, copiar el enlace o el código para insertar, o mandarlo por correo o WhatsApp.',
        '6. Edita si quieres. Toca Editar para recortar el inicio y el final, quitar muletillas o silencios con un clic, cortar frases desde la transcripción y agregar textos, flechas, recuadros, difuminado o un botón. Tu archivo original nunca se toca.',
        '7. Conviértelo en un documento. Toca Generar, elige una plantilla como «Procedimiento paso a paso» y recibe cada paso con su minuto y una captura. Cópialo o descárgalo.',
      ],
    },
  },
  {
    slug: 'what-is-pantalai',
    seccion: 'empezar',
    icono: '👋',
    imagen: 'video',
    en: {
      titulo: 'What is Pantalay',
      resumen: 'Record your screen and camera, and share it with a link in seconds.',
      cuerpo: [
        'Pantalay is a screen recorder that lives in your browser. There is nothing to install: open the site, press Record, and talk.',
        'When you finish, your video is already uploaded and the link is copied. Paste it in an email, a chat or a ticket, and whoever opens it can watch right away — no account needed.',
        'Every video comes with a live transcript, captions, chapters, comments, reactions and insights about who watched it.',
        'Pantalay works best in Chrome or Edge on a computer. Firefox can record too; live transcription needs Chrome or Edge.',
      ],
    },
    es: {
      titulo: 'Qué es Pantalay',
      resumen: 'Graba tu pantalla y tu cámara, y compártelo con un enlace en segundos.',
      cuerpo: [
        'Pantalay es un grabador de pantalla que vive en tu navegador. No hay nada que instalar: abres el sitio, tocas Grabar y hablas.',
        'Cuando terminas, el video ya está subido y el enlace copiado. Pégalo en un correo, un chat o un ticket, y quien lo abra lo ve al instante, sin necesidad de cuenta.',
        'Cada video trae transcripción en vivo, subtítulos, capítulos, comentarios, reacciones y estadísticas de quién lo vio.',
        'Pantalay funciona mejor en Chrome o Edge en una computadora. Firefox también graba; la transcripción en vivo necesita Chrome o Edge.',
      ],
    },
  },
  {
    slug: 'create-account',
    imagen: 'crear-cuenta',
    seccion: 'empezar',
    icono: '🔑',
    en: {
      titulo: 'Create your account',
      resumen: 'Sign up with your name, email and a password.',
      cuerpo: [
        'Press Sign up at the top right. Write your name, your email and a password of at least 8 characters. Use the eye icon to check what you typed.',
        'If you close the page by accident, your name and email will be there when you come back. Your password is never saved on the page.',
        'To leave, open your name at the top right and choose Log out. Your session closes on our side too, so the computer is safe for the next person.',
      ],
    },
    es: {
      titulo: 'Crea tu cuenta',
      resumen: 'Regístrate con tu nombre, tu correo y una contraseña.',
      cuerpo: [
        'Toca Crear cuenta arriba a la derecha. Escribe tu nombre, tu correo y una contraseña de al menos 8 caracteres. Con el ojito compruebas lo que escribiste.',
        'Si cierras la página sin querer, al volver tu nombre y tu correo siguen ahí. La contraseña nunca se guarda en la página.',
        'Para salir, abre tu nombre arriba a la derecha y elige Cerrar sesión. La sesión también se cierra de nuestro lado, así la computadora queda segura para el siguiente.',
      ],
    },
  },
  {
    slug: 'record-your-screen',
    seccion: 'grabar',
    icono: '⏺',
    imagen: 'grabar',
    en: {
      titulo: 'Record your screen',
      resumen: 'Choose Screen + Cam, Screen only or Cam only, and start.',
      cuerpo: [
        'Press Record. Choose a mode: Screen + Cam puts your face in a bubble over the screen, Screen only records just the screen, and Cam only records just you.',
        'Pick your camera and microphone. “Record computer sound” comes on by default, so the sound of a video, music or a meeting is recorded too.',
        'Choose the quality: 720p, 1080p HD or 4K. On the free plan your videos show a small gray Pantalay mark in the corner; paid plans have no mark.',
        'Press Start recording. Your browser asks what to share. To record installed apps too (not only the browser), choose “Entire screen”. A window or a tab only records that window or tab. Press Share and, after a 3-second countdown, you are live.',
        'While recording you can Pause, Resume, Restart or Discard. When you are done, press Finish, or press “Stop sharing” in the bar of your browser.',
        'Shortcuts while the Pantalay tab is open: Alt + Shift + P pauses or resumes, Alt + Shift + S finishes, Alt + Shift + D opens the drawing tools.',
      ],
    },
    es: {
      titulo: 'Graba tu pantalla',
      resumen: 'Elige Pantalla + cámara, Solo pantalla o Solo cámara, y empieza.',
      cuerpo: [
        'Toca Grabar. Elige el modo: Pantalla + cámara pone tu cara en una burbuja sobre la pantalla, Solo pantalla graba únicamente la pantalla y Solo cámara te graba solo a ti.',
        'Elige tu cámara y tu micrófono. «Grabar el sonido de la computadora» viene encendido, así que también se graba el sonido de un video, de la música o de una reunión.',
        'Elige la calidad: 720p, 1080p HD o 4K. En el plan gratis tus videos llevan una pequeña marca gris de Pantalay en la esquina; los planes pagos no llevan marca.',
        'Toca Empezar a grabar. El navegador te pregunta qué compartir. Para que también salgan los programas instalados (no solo el navegador), elige «Pantalla completa». Una ventana o una pestaña graba solo esa ventana o esa pestaña. Toca Compartir y, tras una cuenta de 3 segundos, estás grabando.',
        'Mientras grabas puedes Pausar, Seguir, Reiniciar o Descartar. Cuando termines, toca Terminar, o toca «Dejar de compartir» en la barra del navegador.',
        'Atajos con la pestaña de Pantalay abierta: Alt + Shift + P pausa o sigue, Alt + Shift + S termina, Alt + Shift + D abre los lápices.',
      ],
    },
  },
  {
    slug: 'camera-bubble',
    seccion: 'grabar',
    icono: '👤',
    en: {
      titulo: 'Your camera bubble',
      resumen: 'Size, shape and position of your face on the recording.',
      cuerpo: [
        'In Screen + Cam mode, the preview on the right shows where your bubble will be.',
        'Change the bubble size (small, medium or large), the shape (circle or square) and the corner where it sits.',
        'The bubble is mirrored, like a mirror, so it feels natural when you point at things.',
        'Shapes: circle, square, or vertical (like a short). Turn on “Animated color border” for a moving pink-orange-yellow edge.',
        'Floating bubble (Chrome and Edge): your camera opens in a small window that stays on top of every app, like Loom. Drag it anywhere by its top bar while you talk; it has the timer, pause and finish. Share your “Entire screen” so the bubble appears in the video.',
      ],
    },
    es: {
      titulo: 'Tu burbuja de cámara',
      resumen: 'Tamaño, forma y posición de tu cara en la grabación.',
      cuerpo: [
        'En el modo Pantalla + cámara, la vista previa de la derecha muestra dónde va a quedar tu burbuja.',
        'Cambia el tamaño (chica, mediana o grande), la forma (círculo o cuadrado) y la esquina donde va.',
        'La burbuja se ve en espejo, como te ves en un espejo, para que señalar las cosas se sienta natural.',
        'Formas: círculo, cuadrado o vertical (tipo short). Enciende «Borde de colores animado» para un borde rosado, naranja y amarillo que va girando.',
        'Burbuja flotante (Chrome y Edge): tu cámara se abre en una ventanita que queda encima de todos los programas, como en Loom. Arrástrala a donde quieras por su barra de arriba mientras hablas; trae el tiempo, pausar y terminar. Comparte la «Pantalla completa» para que la burbuja salga en el video.',
      ],
    },
  },
  {
    slug: 'draw-on-screen',
    seccion: 'grabar',
    icono: '✏️',
    imagen: 'lapices',
    en: {
      titulo: 'Draw on your screen while you record',
      resumen: 'Pen, highlighter, arrows, boxes and circles in six colors, right in your video.',
      cuerpo: [
        'While you record, press Draw in the recording bar. The drawing tools open under the preview, and everything you draw shows up in your video at that moment.',
        'Pick a tool: Pen for free handwriting, Highlighter to mark a line of text, Arrow to point at something, Box and Circle to frame it.',
        'Choose a color (red, yellow, green, blue, white or black) and a thickness (thin, medium or thick). Draw with your mouse, your trackpad, your finger or a stylus.',
        'Made a mistake? Undo removes the last drawing (Cmd + Z or Ctrl + Z also works) and Clear all leaves the screen clean. Turn on “Fade after 3 s” and each drawing disappears by itself, perfect for quick pointers while you talk.',
        'Sharing your entire screen? When you come back to Pantalay to draw, Pantalay would show up in the video. Leave “Freeze screen while drawing” on: the video keeps the last image of the app you were showing and your drawings go on top of it. When you stop drawing, the video goes back to live.',
        'Sharing a single window or tab? You draw over it live, with no freezing needed. Tip: with two monitors, keep Pantalay on one and present on the other.',
        'Press Stop drawing (or Alt + Shift + D) to put the tools away. Your drawings stay until you undo or clear them.',
      ],
    },
    es: {
      titulo: 'Dibuja sobre la pantalla mientras grabas',
      resumen: 'Lápiz, resaltador, flechas, cuadros y círculos en seis colores, directo en tu video.',
      cuerpo: [
        'Mientras grabas, toca Dibujar en la barra de grabación. Los lápices se abren debajo de la vista previa y todo lo que dibujas sale en tu video en ese mismo momento.',
        'Elige la herramienta: Lápiz para escribir a mano, Resaltador para marcar una línea de texto, Flecha para señalar algo, Cuadro y Círculo para encerrarlo.',
        'Elige el color (rojo, amarillo, verde, azul, blanco o negro) y el grosor (fino, medio o grueso). Dibuja con el mouse, el trackpad, el dedo o un lápiz óptico.',
        '¿Te equivocaste? Deshacer quita el último dibujo (también con Cmd + Z o Ctrl + Z) y Borrar todo deja la pantalla limpia. Enciende «Que se borre solo a los 3 s» y cada dibujo desaparece solo, ideal para señalar rápido mientras hablas.',
        '¿Compartes la pantalla completa? Al volver a Pantalay para dibujar, Pantalay mismo saldría en el video. Deja encendido «Congelar la pantalla mientras dibujas»: el video se queda con la última imagen del programa que estabas mostrando y tus dibujos van encima. Cuando dejas de dibujar, el video vuelve a estar en vivo.',
        '¿Compartes una sola ventana o pestaña? Dibujas encima en vivo, sin congelar nada. Consejo: con dos pantallas, deja Pantalay en una y presenta en la otra.',
        'Toca Dejar de dibujar (o Alt + Shift + D) para guardar los lápices. Tus dibujos se quedan hasta que los deshagas o los borres.',
      ],
    },
  },
  {
    slug: 'record-computer-sound',
    seccion: 'grabar',
    icono: '🔊',
    en: {
      titulo: 'Record your computer’s sound',
      resumen: 'Get the sound of YouTube, music, calls and apps in your video, not only your voice.',
      cuerpo: [
        '“Record computer sound (videos, music, calls)” comes on by default. Leave it on if you want what you hear on your computer in the video.',
        'When your browser asks what to share, turn on the sound switch at the bottom of that window: “Share tab audio” if you share a tab, or “Share system audio” if you share your entire screen. Without that switch, the browser sends no sound.',
        'While you record, the bar shows two meters: the microphone and the computer sound. If the computer one moves when a video plays, it is being recorded.',
        'If Pantalay sees that the computer sound did not arrive, it tells you right away with a notice under the recording bar. Restart and turn on the sound switch.',
        'On a Mac, the sound of the entire screen depends on your browser and macOS version. If it does not show up, share the browser tab where the video plays: tab sound always works.',
      ],
    },
    es: {
      titulo: 'Graba el sonido de tu computadora',
      resumen:
        'Que salga en tu video el sonido de YouTube, la música, las llamadas y los programas, no solo tu voz.',
      cuerpo: [
        '«Grabar el sonido de la computadora (videos, música, llamadas)» viene encendido. Déjalo así si quieres que en el video salga lo que oyes en tu computadora.',
        'Cuando el navegador te pregunta qué compartir, enciende el interruptor de sonido de abajo en esa ventana: «Compartir audio de la pestaña» si compartes una pestaña, o «Compartir audio del sistema» si compartes la pantalla completa. Sin ese interruptor, el navegador no manda sonido.',
        'Mientras grabas, la barra muestra dos medidores: el micrófono y el sonido de la computadora. Si el de la computadora se mueve cuando suena un video, se está grabando.',
        'Si Pantalay ve que el sonido de la computadora no llegó, te avisa en ese momento con un aviso debajo de la barra de grabación. Reinicia y enciende el interruptor de sonido.',
        'En una Mac, el sonido de la pantalla completa depende de la versión del navegador y de macOS. Si no sale, comparte la pestaña del navegador donde suena el video: el sonido de una pestaña siempre funciona.',
      ],
    },
  },
  {
    slug: 'live-transcript',
    seccion: 'grabar',
    icono: '💬',
    en: {
      titulo: 'Live transcript and captions',
      resumen: 'Everything you say becomes text while you record. Free.',
      cuerpo: [
        'Turn on Live transcription and choose the language you will speak. While you record, your words appear on the preview.',
        'When you finish, the transcript is saved with the video. Viewers get captions (the CC button) and a Transcript tab where every sentence shows its minute: click one to jump there.',
        'The transcript also powers the search in your library, the suggested title, the automatic chapters and cutting by transcript.',
        'Live transcription uses the speech recognition built into Chrome and Edge. In other browsers the video records normally, without a transcript.',
      ],
    },
    es: {
      titulo: 'Transcripción y subtítulos en vivo',
      resumen: 'Todo lo que dices se vuelve texto mientras grabas. Gratis.',
      cuerpo: [
        'Enciende Transcripción en vivo y elige el idioma en que vas a hablar. Mientras grabas, tus palabras aparecen sobre la vista previa.',
        'Al terminar, la transcripción se guarda con el video. Quien lo ve tiene subtítulos (el botón CC) y una pestaña Transcripción donde cada frase muestra su minuto: tócala y salta ahí.',
        'La transcripción también sirve para buscar en tu biblioteca, sugerir el título, crear capítulos y cortar con la transcripción.',
        'La transcripción en vivo usa el reconocimiento de voz que traen Chrome y Edge. En otros navegadores el video se graba normal, sin transcripción.',
      ],
    },
  },
  {
    slug: 'never-lose-a-recording',
    seccion: 'grabar',
    icono: '🛟',
    en: {
      titulo: 'Your recording is never lost',
      resumen: 'If the internet drops, the recording stays safe on your computer.',
      cuerpo: [
        'Your video uploads while you record, piece by piece. Each piece is also kept on your computer until the upload finishes.',
        'If the connection fails, Pantalay keeps trying on its own. If it still cannot finish, you will see Try again and Download recording.',
        'If you closed the tab before it finished, open your library: recordings saved on this computer appear at the top. Press “Upload again” to finish uploading them, or download them.',
      ],
    },
    es: {
      titulo: 'Tu grabación nunca se pierde',
      resumen: 'Si se cae el internet, la grabación queda a salvo en tu computadora.',
      cuerpo: [
        'El video se sube mientras grabas, por partes. Cada parte también queda guardada en tu computadora hasta que la subida termina.',
        'Si la conexión falla, Pantalay sigue intentando solo. Si aun así no puede terminar, verás Intentar otra vez y Descargar la grabación.',
        'Si cerraste la pestaña antes de que terminara, abre tu biblioteca: arriba aparecen las grabaciones guardadas en esta computadora. Toca «Subir otra vez» para terminar de subirlas, o descárgalas.',
      ],
    },
  },
  {
    slug: 'share-a-video',
    seccion: 'compartir',
    icono: '🔗',
    imagen: 'compartir',
    en: {
      titulo: 'Share a video',
      resumen: 'Copy the link, choose who can watch, or start at a specific minute.',
      cuerpo: [
        'When you finish recording, the link is already copied. You can copy it again with the link icon next to the title, or from the ⋮ menu in your library.',
        'Press Share to choose who can watch: Anyone with the link, or Only me.',
        'Check “Start at current time” to send a link that opens at the minute you are watching.',
        'Share by email, WhatsApp, LinkedIn or X with one click, and decide whether viewers can download the video or leave comments.',
      ],
    },
    es: {
      titulo: 'Comparte un video',
      resumen: 'Copia el enlace, elige quién puede verlo o haz que empiece en un minuto exacto.',
      cuerpo: [
        'Cuando terminas de grabar, el enlace ya está copiado. Lo puedes copiar otra vez con el ícono de enlace junto al título, o desde el menú ⋮ de tu biblioteca.',
        'Toca Compartir para elegir quién puede verlo: Cualquiera con el enlace, o Solo yo.',
        'Marca «Empezar en el minuto actual» para mandar un enlace que abre justo en el minuto que estás viendo.',
        'Comparte por correo, WhatsApp, LinkedIn o X con un clic, y decide si quien lo vea puede descargarlo o comentar.',
      ],
    },
  },
  {
    slug: 'download-mp4',
    seccion: 'compartir',
    icono: '⬇',
    en: {
      titulo: 'Download your video as MP4',
      resumen: 'For YouTube, Final Cut, Premiere, iPhone or any editor.',
      cuerpo: [
        'Pantalay records straight to MP4 in Chrome, Edge and Safari, so your video is ready to download the moment you stop: nothing to convert, nothing to wait for.',
        'If you trim the ends, Pantalay cuts the MP4 in a few seconds (without re-encoding it) so the download comes out trimmed. Older videos recorded before this change are converted once, the first time you open them.',
        'The button next to Share says “Download MP4”. The file opens in Final Cut, Premiere, iMovie, QuickTime and on any phone, and you can upload it to YouTube as is.',
        'The MP4 version is also what people watch, so your link plays on iPhone too.',
        'On iPhone or Android, press “Download MP4” and then “Save to Photos”: the phone’s share menu opens and “Save Video” puts it in your Photos, ready for Instagram, TikTok or YouTube. (A plain download on a phone goes to the Files app, where it is hard to find.)',
        'For older videos, the original recording is still there: open ⋮ and choose “Download original (WebM)”.',
      ],
    },
    es: {
      titulo: 'Descarga tu video en MP4',
      resumen: 'Para YouTube, Final Cut, Premiere, iPhone o cualquier editor.',
      cuerpo: [
        'Pantalay graba directo en MP4 en Chrome, Edge y Safari, así que tu video está listo para descargar en cuanto terminas: nada que convertir, nada que esperar.',
        'Si recortas las puntas, Pantalay corta el MP4 en unos segundos (sin volver a codificarlo) para que la descarga salga recortada. Los videos grabados antes de este cambio se convierten una sola vez, la primera vez que los abres.',
        'El botón junto a Compartir dice «Descargar MP4». El archivo abre en Final Cut, Premiere, iMovie, QuickTime y en cualquier teléfono, y lo puedes subir a YouTube tal cual.',
        'La versión MP4 también es la que ve la gente, así que tu enlace se reproduce también en iPhone.',
        'En iPhone o Android, toca «Descargar MP4» y después «Guardar en Fotos»: se abre el menú de compartir del teléfono y «Guardar video» lo deja en tus Fotos, listo para Instagram, TikTok o YouTube. (Una descarga normal en el teléfono va a la app Archivos, donde cuesta encontrarla.)',
        'En los videos más viejos, la grabación original sigue ahí: abre ⋮ y elige «Descargar el original (WebM)».',
      ],
    },
  },
  {
    slug: 'embed-a-video',
    seccion: 'compartir',
    icono: '🧩',
    en: {
      titulo: 'Embed a video on your website',
      resumen: 'Paste the embed code in any page, help center or document.',
      cuerpo: [
        'Open the video, press Share and copy the embed code at the bottom.',
        'Paste it in your website, help center, course or internal wiki. The player adjusts to the width of the page.',
        'Embedded videos follow the same privacy: if you switch the video to Only me, it stops playing everywhere.',
      ],
    },
    es: {
      titulo: 'Inserta un video en tu sitio web',
      resumen: 'Pega el código para insertar en cualquier página, centro de ayuda o documento.',
      cuerpo: [
        'Abre el video, toca Compartir y copia el código para insertar que está abajo.',
        'Pégalo en tu sitio web, tu centro de ayuda, un curso o tu wiki interna. El reproductor se ajusta al ancho de la página.',
        'Los videos insertados respetan la misma privacidad: si cambias el video a Solo yo, deja de verse en todas partes.',
      ],
    },
  },
  {
    slug: 'comments-and-reactions',
    imagen: 'video',
    seccion: 'compartir',
    icono: '😮',
    en: {
      titulo: 'Comments and reactions',
      resumen: 'Viewers comment and react at the exact second.',
      cuerpo: [
        'Under the video there is a row of emojis. Tap one and it is pinned to that second; anyone watching later sees it float by at that moment.',
        'In the Activity tab, viewers can leave a comment. By default it is tied to the minute they are watching, so you know exactly what they mean. Click the minute to jump there.',
        'Viewers without an account only need to write their name. You can turn comments off from Share.',
      ],
    },
    es: {
      titulo: 'Comentarios y reacciones',
      resumen: 'Quien lo ve comenta y reacciona en el segundo exacto.',
      cuerpo: [
        'Debajo del video hay una fila de emojis. Toca uno y queda fijado en ese segundo; quien lo vea después lo verá pasar en ese momento.',
        'En la pestaña Actividad se pueden dejar comentarios. Por defecto quedan atados al minuto que se está viendo, así sabes exactamente a qué se refieren. Toca el minuto para saltar ahí.',
        'Quien no tiene cuenta solo escribe su nombre. Puedes apagar los comentarios desde Compartir.',
      ],
    },
  },
  {
    slug: 'viewer-insights',
    seccion: 'compartir',
    icono: '📈',
    en: {
      titulo: 'Viewer insights',
      resumen: 'Views, average watch time, completion rate and button clicks.',
      cuerpo: [
        'Open one of your videos and choose the Insights tab on the right.',
        'Views counts each person once. Avg. watched is how far people get on average. Completion rate is how many watched until the end. Button clicks counts clicks on your call-to-action button.',
        'Your own views never count, so the numbers show only real viewers.',
      ],
    },
    es: {
      titulo: 'Estadísticas de quién lo vio',
      resumen: 'Vistas, tiempo promedio, cuántos lo vieron completo y clics en el botón.',
      cuerpo: [
        'Abre uno de tus videos y elige la pestaña Estadísticas a la derecha.',
        'Vistas cuenta a cada persona una vez. Promedio visto es hasta dónde llega la gente en promedio. Lo vieron completo es cuántos llegaron al final. Clics en el botón cuenta los clics en tu botón de llamada a la acción.',
        'Tus propias vistas nunca cuentan, así los números muestran solo a quien de verdad lo vio.',
      ],
    },
  },
  {
    slug: 'player-shortcuts',
    seccion: 'compartir',
    icono: '⌨',
    en: {
      titulo: 'Player and shortcuts',
      resumen: 'Speed, captions, theater mode and keyboard shortcuts.',
      cuerpo: [
        'The progress bar is split by chapters: hover a part to see its name.',
        'Shortcuts: K or space plays and pauses, J and L go back and forward 5 seconds, M mutes, A turns captions on or off, S changes the speed, T switches theater mode, F goes full screen and P opens picture-in-picture.',
        'Speeds go from 0.5× to 2.5×. Pantalay remembers the speed you like.',
      ],
    },
    es: {
      titulo: 'El reproductor y sus atajos',
      resumen: 'Velocidad, subtítulos, modo teatro y atajos de teclado.',
      cuerpo: [
        'La barra de progreso está partida por capítulos: pasa el mouse por una parte para ver su nombre.',
        'Atajos: K o la barra espaciadora reproducen y pausan, J y L van 5 segundos atrás y adelante, M silencia, A enciende o apaga los subtítulos, S cambia la velocidad, T cambia el modo teatro, F pone pantalla completa y P abre la imagen en imagen.',
        'Las velocidades van de 0.5× a 2.5×. Pantalay recuerda la velocidad que te gusta.',
      ],
    },
  },
  {
    slug: 'edit-a-video',
    seccion: 'editar',
    icono: '✂',
    imagen: 'editar',
    en: {
      titulo: 'Edit a video',
      resumen: 'Trim, cut by transcript and remove silences without recording again.',
      cuerpo: [
        'Open your video and press Edit.',
        'Trim the ends: drag the two handles on the strip under the video to cut the beginning and the end. See the guide “Trim the start and end of a video”.',
        'Cut by transcript: tap a sentence to remove that part. Tap it again to bring it back.',
        'Remove silences: Pantalay listens to the audio, finds long pauses and cuts them for you.',
        'Turn on Preview to watch the final version. Edits never touch your original file, so you can undo anything later. Press Save when you are happy.',
      ],
    },
    es: {
      titulo: 'Edita un video',
      resumen: 'Recorta, corta con la transcripción y quita silencios sin volver a grabar.',
      cuerpo: [
        'Abre tu video y toca Editar.',
        'Recortar las puntas: arrastra las dos agarraderas de la tira debajo del video para quitar el principio y el final. Mira la guía «Recorta el principio y el final de un video».',
        'Cortar con la transcripción: toca una frase para quitar esa parte. Tócala otra vez para devolverla.',
        'Quitar silencios: Pantalay escucha el audio, encuentra las pausas largas y las corta por ti.',
        'Enciende Vista previa para ver cómo queda. Editar nunca toca tu archivo original, así que puedes deshacer cualquier cosa después. Toca Guardar cuando te guste.',
      ],
    },
  },
  {
    slug: 'trim-video',
    seccion: 'editar',
    icono: '✂️',
    imagen: 'recortar',
    en: {
      titulo: 'Trim the start and end of a video',
      resumen:
        'Cut the first seconds and the last click in a few seconds, and download or share it already trimmed.',
      cuerpo: [
        'Almost every recording starts with a second of you getting ready and ends with the click on Finish. Trimming the ends removes that so your video looks finished.',
        'Open your video and press Edit. Under the video you will see “Trim the ends”: a strip with pictures of your whole video and a time ruler on top.',
        'Drag the left handle to where your video should start and the right handle to where it should end. The blue frame shows what stays, and the bubble tells you how long the final video is.',
        'As soon as the editor opens, Pantalay gets the first and last 20 seconds ready, frame by frame. When you see “Ends ready” in green, dragging a handle shows that exact moment on the big screen instantly, so you can find the perfect cut without waiting for the video to load. Let go and the video stays right there.',
        'Press “Play trimmed video” to watch it from the new start: it stops by itself at the new end. With the keyboard, select a handle and use the arrows (Shift + arrow moves one second).',
        'Press Save. From then on your link plays trimmed, the embedded player too, and Download gives you an MP4 without the ends: ready for your phone, YouTube or Final Cut.',
        'Changed your mind? Press “Reset trim” and save again. Your original recording is never touched.',
      ],
    },
    es: {
      titulo: 'Recorta el principio y el final de un video',
      resumen:
        'Quita los primeros segundos y el último clic en unos segundos, y descárgalo o envíalo ya recortado.',
      cuerpo: [
        'Casi toda grabación empieza con un segundo en el que te acomodas y termina con el clic en Terminar. Recortar las puntas quita eso para que tu video se vea terminado.',
        'Abre tu video y toca Editar. Debajo del video verás «Recortar las puntas»: una tira con fotos de todo tu video y una regla de tiempo arriba.',
        'Arrastra la agarradera de la izquierda hasta donde debe empezar tu video y la de la derecha hasta donde debe terminar. El marco azul muestra lo que se queda y la burbuja te dice cuánto dura el video final.',
        'Apenas abres el editor, Pantalay prepara los primeros y los últimos 20 segundos, cuadro por cuadro. Cuando veas en verde «Puntas listas», al arrastrar una agarradera la pantalla grande muestra ese momento exacto al instante, así encuentras el corte justo sin esperar a que cargue el video. Suelta y el video queda ahí mismo.',
        'Toca «Reproducir recortado» para verlo desde el nuevo inicio: se para solo en el nuevo final. Con el teclado, elige una agarradera y usa las flechas (Shift + flecha mueve un segundo).',
        'Toca Guardar. Desde ese momento tu enlace se ve recortado, el reproductor insertado también, y Descargar te da un MP4 sin las puntas: listo para el celular, YouTube o Final Cut.',
        '¿Cambiaste de idea? Toca «Quitar el recorte» y guarda otra vez. Tu grabación original nunca se toca.',
      ],
    },
  },
  {
    slug: 'chapters-and-title',
    seccion: 'editar',
    icono: '📑',
    en: {
      titulo: 'Chapters, title and summary',
      resumen: 'Let Pantalay suggest them from what you said, or write your own.',
      cuerpo: [
        'In the editor, “Suggest title from transcript” proposes a title from your first words. You can change it any time.',
        'Generate chapters splits the video where you paused, using your own words as names. You can rename, add or delete chapters.',
        'The description is shown as the summary under the video.',
      ],
    },
    es: {
      titulo: 'Capítulos, título y resumen',
      resumen: 'Deja que Pantalay los sugiera con lo que dijiste, o escríbelos tú.',
      cuerpo: [
        'En el editor, «Sugerir título con la transcripción» propone un título con tus primeras palabras. Lo puedes cambiar cuando quieras.',
        'Crear capítulos parte el video donde hiciste pausas, con tus propias palabras como nombre. Puedes renombrar, agregar o borrar capítulos.',
        'La descripción se muestra como resumen debajo del video.',
      ],
    },
  },
  {
    slug: 'overlays-and-buttons',
    seccion: 'editar',
    icono: '➡',
    en: {
      titulo: 'Text, arrows, boxes, blur and buttons',
      resumen: 'Point at what matters, hide what is private and add a call-to-action.',
      cuerpo: [
        'In the editor, under Overlays, add a Text, an Arrow, a Box or a Blur. It appears at the current minute for 5 seconds.',
        'Drag it on the video to place it, and change when it starts and ends. Blur hides passwords, emails or anything private on screen.',
        'Call-to-action button: write the text and the link (for example “Book a demo”). The button stays on the video and Insights tells you how many people clicked it.',
        'Thumbnail: pause on the frame you like and press “Use current frame”.',
      ],
    },
    es: {
      titulo: 'Textos, flechas, recuadros, difuminado y botones',
      resumen: 'Señala lo importante, esconde lo privado y agrega una llamada a la acción.',
      cuerpo: [
        'En el editor, en Elementos sobre el video, agrega un Texto, una Flecha, un Recuadro o un Difuminado. Aparece en el minuto actual por 5 segundos.',
        'Arrástralo sobre el video para ubicarlo y cambia cuándo empieza y cuándo termina. El difuminado esconde contraseñas, correos o cualquier cosa privada en pantalla.',
        'Botón de llamada a la acción: escribe el texto y el enlace (por ejemplo «Agenda una demo»). El botón queda sobre el video y en Estadísticas ves cuántos lo tocaron.',
        'Miniatura: pausa en el fotograma que te guste y toca «Usar este fotograma».',
      ],
    },
  },
  {
    slug: 'ai-title-summary-chapters',
    imagen: 'video',
    seccion: 'ia',
    icono: '✨',
    en: {
      titulo: 'AI title, summary, chapters and tasks',
      resumen: 'When you finish recording, AI listens to your video and writes the rest for you.',
      cuerpo: [
        'After you stop recording, open your video. A line at the top shows that AI is working: first it prepares the audio, then it transcribes, then it writes.',
        'In about a minute you get an accurate transcript with punctuation and captions, a clear title, a short summary under the video, chapters on the progress bar, and a list of tasks you mentioned.',
        'AI never overwrites your own work: if you changed the title or already wrote a summary or chapters, it leaves them as they are.',
        'It works for any video, in any browser, in more than 50 languages. If the AI service is busy, your video keeps working and you can press “Try AI again” later.',
      ],
    },
    es: {
      titulo: 'Título, resumen, capítulos y tareas con IA',
      resumen: 'Cuando terminas de grabar, la IA escucha tu video y escribe lo demás por ti.',
      cuerpo: [
        'Al terminar de grabar, abre tu video. Arriba aparece una línea que dice que la IA está trabajando: primero prepara el audio, después transcribe y después escribe.',
        'En más o menos un minuto tienes una transcripción precisa con puntuación y subtítulos, un título claro, un resumen corto debajo del video, capítulos en la barra y la lista de tareas que mencionaste.',
        'La IA nunca pisa lo tuyo: si cambiaste el título o ya escribiste un resumen o capítulos, los deja como están.',
        'Funciona con cualquier video, en cualquier navegador y en más de 50 idiomas. Si el servicio de IA está ocupado, tu video sigue funcionando y puedes tocar «Intentar otra vez con IA» después.',
      ],
    },
  },
  {
    slug: 'ai-remove-filler-words',
    imagen: 'editar',
    seccion: 'ia',
    icono: '🧹',
    en: {
      titulo: 'Remove filler words',
      resumen: 'Skip every “um”, “uh” and “hmm” with one click.',
      cuerpo: [
        'Open your video and press Edit. If AI found filler sounds, you will see “Remove filler words” with how many it found and how many seconds it saves.',
        'Press it and those moments are skipped when people watch. Turn on Preview to hear the result.',
        'Like every edit in Pantalay, it never touches the original file: press “Bring back all cuts” to undo it.',
      ],
    },
    es: {
      titulo: 'Quitar muletillas',
      resumen: 'Sáltate cada «eh», «mmm» y «um» con un clic.',
      cuerpo: [
        'Abre tu video y toca Editar. Si la IA encontró muletillas, verás «Quitar muletillas» con cuántas encontró y cuántos segundos ahorra.',
        'Tócalo y esos momentos se saltan cuando alguien lo ve. Enciende Vista previa para escuchar cómo queda.',
        'Como toda edición en Pantalay, nunca toca el archivo original: toca «Devolver todos los cortes» para deshacerlo.',
      ],
    },
  },
  {
    slug: 'ai-generate-documents',
    imagen: 'generar',
    seccion: 'ia',
    icono: '📄',
    en: {
      titulo: 'Turn a video into a document',
      resumen: 'Procedures, guides, bug reports and messages, with a screenshot for every step.',
      cuerpo: [
        'Open your video and press Generate. Pick a template: step-by-step procedure, customer guide, bug report, code change description, QA test steps, or message to share.',
        'AI writes the document from what you said. Every step shows the minute of the video where it happens, and a screenshot of that moment.',
        'Click a minute to jump there. Copy the text, or download it with screenshots to send it or keep it in your help center.',
        'AI only uses what is in your video. If something is missing, record it and generate again.',
      ],
    },
    es: {
      titulo: 'Convierte un video en un documento',
      resumen: 'Procedimientos, guías, reportes de error y mensajes, con una captura por paso.',
      cuerpo: [
        'Abre tu video y toca Generar. Elige una plantilla: procedimiento paso a paso, guía para clientes, reporte de error, descripción de un cambio de código, pasos de prueba o mensaje para compartir.',
        'La IA escribe el documento con lo que dijiste. Cada paso muestra el minuto del video donde pasa y una captura de ese momento.',
        'Toca un minuto para saltar ahí. Copia el texto o descárgalo con capturas para enviarlo o guardarlo en tu centro de ayuda.',
        'La IA solo usa lo que está en tu video. Si falta algo, grábalo y genera otra vez.',
      ],
    },
  },
  {
    slug: 'reset-password',
    seccion: 'cuenta',
    icono: '🔑',
    en: {
      titulo: 'Forgot your password',
      resumen: 'Get a link by email to create a new password in a minute.',
      cuerpo: [
        'On the Log in page, tap “Forgot your password?”.',
        'Type the email of your account and tap “Send me the link”. For your privacy, the page says the same whether the email has an account or not.',
        'Within a few minutes you get an email from noreply@pantalay.com. Check your spam folder too. The link works once, for one hour.',
        'Open it, type your new password twice and save. For your safety, every open session is signed out and you get a second email confirming the change.',
        'Log in with your new password. If you get the confirmation email and it wasn’t you, ask for a new link right away.',
      ],
    },
    es: {
      titulo: 'Olvidaste tu contraseña',
      resumen: 'Recibe un enlace por correo para crear una contraseña nueva en un minuto.',
      cuerpo: [
        'En la página de Entrar, toca «¿Olvidaste tu contraseña?».',
        'Escribe el correo de tu cuenta y toca «Mándame el enlace». Por tu privacidad, la página dice lo mismo tenga cuenta ese correo o no.',
        'En unos minutos te llega un correo de noreply@pantalay.com. Revisa también la carpeta de spam. El enlace sirve una sola vez, durante una hora.',
        'Ábrelo, escribe tu contraseña nueva dos veces y guarda. Por tu seguridad se cierran todas las sesiones abiertas y te llega un segundo correo que confirma el cambio.',
        'Entra con tu contraseña nueva. Si te llega el correo de confirmación y no fuiste tú, pide un enlace nuevo de inmediato.',
      ],
    },
  },
  {
    slug: 'emails-from-pantalay',
    seccion: 'cuenta',
    icono: '✉️',
    en: {
      titulo: 'Emails you get from Pantalay',
      resumen: 'Welcome, password, plan and invoices: all from noreply@pantalay.com.',
      cuerpo: [
        'Pantalay writes to you only when something about your account happens, always from noreply@pantalay.com and in your language.',
        'Welcome: when you create your account, with a button to record your first video.',
        'Password: the link to create a new one, and a notice when it changes.',
        'Plans: when your plan becomes active, each invoice with its link and PDF, if a payment fails (so you don’t lose your plan) and when a plan ends.',
        'Pantalay never asks for your password or card by email. If you get an email asking for that, it isn’t us.',
      ],
    },
    es: {
      titulo: 'Los correos que te manda Pantalay',
      resumen: 'Bienvenida, contraseña, plan y facturas: todos desde noreply@pantalay.com.',
      cuerpo: [
        'Pantalay te escribe solo cuando pasa algo con tu cuenta, siempre desde noreply@pantalay.com y en tu idioma.',
        'Bienvenida: cuando creas tu cuenta, con un botón para grabar tu primer video.',
        'Contraseña: el enlace para crear una nueva, y un aviso cuando cambia.',
        'Planes: cuando tu plan queda activo, cada factura con su enlace y su PDF, si un pago no pasa (para que no pierdas tu plan) y cuando un plan termina.',
        'Pantalay nunca te pide tu contraseña ni tu tarjeta por correo. Si te llega un correo pidiendo eso, no somos nosotros.',
      ],
    },
  },
  {
    slug: 'library-and-folders',
    seccion: 'cuenta',
    icono: '📁',
    imagen: 'biblioteca',
    en: {
      titulo: 'Library, folders and archive',
      resumen: 'Find any video, organize it in folders and archive what you no longer need.',
      cuerpo: [
        'Your library shows all your videos with their thumbnail, length, views and comments.',
        'The search box looks in titles, descriptions and in everything you said in your videos.',
        'Create folders with the + next to Folders. Move a video from its ⋮ menu. Deleting a folder never deletes its videos.',
        'Archive hides a video from your library without deleting it; the link keeps working. Delete is inside the ⋮ menu and asks you to confirm.',
      ],
    },
    es: {
      titulo: 'Biblioteca, carpetas y archivo',
      resumen: 'Encuentra cualquier video, ordénalo en carpetas y archiva lo que ya no usas.',
      cuerpo: [
        'Tu biblioteca muestra todos tus videos con su miniatura, duración, vistas y comentarios.',
        'El buscador busca en los títulos, las descripciones y en todo lo que dijiste en tus videos.',
        'Crea carpetas con el + junto a Carpetas. Mueve un video desde su menú ⋮. Borrar una carpeta nunca borra sus videos.',
        'Archivar quita un video de tu biblioteca sin borrarlo; el enlace sigue funcionando. Eliminar está dentro del menú ⋮ y pide confirmación.',
      ],
    },
  },
  {
    slug: 'your-account',
    seccion: 'cuenta',
    icono: '👤',
    en: {
      titulo: 'Your account: name, password, plan and deleting it',
      resumen:
        'Change your name or password, cancel or keep your plan, and delete your account whenever you want.',
      cuerpo: [
        'Open your account. Press your name at the top right and choose Account.',
        'Change your name. Write it in Profile and press Save. It is the name your viewers see on your videos and comments.',
        'Change your password. Write your current password and the new one (at least 8 characters) and press Change password. Every other device where you were logged in is logged out, and you get an email so you know it happened.',
        'See your plan. Plan shows what you have and the date it renews. Press See plans to compare or upgrade.',
        'Cancel your plan. Press Cancel plan and confirm. Nothing is charged again: you keep your paid features until the end of the period you already paid, and then your account moves to the free plan with all your videos. Changed your mind? Press Keep my plan before that date.',
        'Delete your account. Open the ⋮ menu next to Legal, choose Delete account, write your password and confirm. Your account, videos, transcripts and folders are deleted and any paid plan is canceled right away. It can’t be undone, so download the videos you want to keep first.',
      ],
    },
    es: {
      titulo: 'Tu cuenta: nombre, contraseña, plan y borrarla',
      resumen:
        'Cambia tu nombre o tu contraseña, cancela o mantén tu plan, y borra tu cuenta cuando quieras.',
      cuerpo: [
        'Abre tu cuenta. Toca tu nombre arriba a la derecha y elige Mi cuenta.',
        'Cambia tu nombre. Escríbelo en Perfil y toca Guardar. Es el nombre que ven quienes miran tus videos y comentarios.',
        'Cambia tu contraseña. Escribe la actual y la nueva (al menos 8 caracteres) y toca Cambiar contraseña. Se cierra la sesión en los demás equipos donde habías entrado, y te llega un correo para que sepas que pasó.',
        'Mira tu plan. En Plan ves lo que tienes y la fecha en que se renueva. Toca Ver planes para comparar o subir de plan.',
        'Cancela tu plan. Toca Cancelar plan y confirma. No se vuelve a cobrar: conservas las funciones pagas hasta el final del período que ya pagaste y después tu cuenta pasa al plan gratis con todos tus videos. ¿Cambiaste de idea? Toca Mantener mi plan antes de esa fecha.',
        'Borra tu cuenta. Abre el menú ⋮ al lado de Legal, elige Borrar cuenta, escribe tu contraseña y confirma. Se borran tu cuenta, tus videos, transcripciones y carpetas, y se cancela al momento cualquier plan pago. No se puede deshacer: descarga antes los videos que quieras guardar.',
      ],
    },
  },
  {
    slug: 'youtube-texts',
    seccion: 'ia',
    icono: '▶️',
    en: {
      titulo: 'Ready-to-paste texts for YouTube',
      resumen:
        'Three titles to choose from, the description, keywords and hashtags, each with its own Copy button.',
      cuerpo: [
        'When AI finishes your summary, a “For YouTube” card appears under it, only for you. It is written from what you actually say in the video, following what helps a video get found on YouTube today.',
        'Titles: pick one. You get three different styles: descriptive (says exactly what the viewer will see, with the main topic first), direct (short and punchy) and bold (creates curiosity, without promising anything the video does not have). Each one shows its length: YouTube allows 100 characters, but only the first 60 to 70 show in search.',
        'Description. It starts with a one-line hook that shows before “Show more”, then your summary, your chapters (only when they follow YouTube’s rule: first at 0:00, at least three, 10 seconds or longer) and three hashtags.',
        'Keywords (tags). Up to 35 search phrases, separated by commas, that always fit YouTube’s 500-character limit. Copy them and paste them in Tags in YouTube Studio: no errors.',
        'Hashtags. Three: one broad, one niche and one about your topic. YouTube shows up to three above your title.',
        'Press Copy next to each part, or “Copy everything” to take it all at once. Want different options? Press “Write again”. The summary also has its own Copy button.',
      ],
    },
    es: {
      titulo: 'Textos listos para pegar en YouTube',
      resumen:
        'Tres títulos para elegir, la descripción, las palabras clave y los hashtags, cada uno con su botón de copiar.',
      cuerpo: [
        'Cuando la IA termina tu resumen, debajo aparece la tarjeta «Para YouTube», que solo ves tú. Se escribe con lo que de verdad dices en el video, siguiendo lo que hoy ayuda a que un video se encuentre en YouTube.',
        'Títulos: elige uno. Recibes tres estilos distintos: descriptivo (dice exactamente lo que se va a ver, con el tema al principio), directo (corto y al grano) e impactante (despierta curiosidad, sin prometer nada que el video no tenga). Cada uno muestra su largo: YouTube permite 100 caracteres, pero en la búsqueda solo se ven los primeros 60 a 70.',
        'Descripción. Empieza con una línea gancho que se ve antes de «Mostrar más», sigue tu resumen, tus capítulos (solo cuando cumplen la regla de YouTube: el primero en 0:00, al menos tres y de 10 segundos o más) y tres hashtags.',
        'Palabras clave (etiquetas). Hasta 35 frases de búsqueda separadas por coma que siempre caben en el límite de 500 caracteres de YouTube. Cópialas y pégalas en Etiquetas de YouTube Studio: sin errores.',
        'Hashtags. Tres: uno general, uno de nicho y uno de tu tema. YouTube muestra hasta tres encima de tu título.',
        'Toca Copiar al lado de cada parte, o «Copiar todo» para llevártelo de una vez. ¿Quieres otras opciones? Toca «Escribir otra vez». El resumen también tiene su propio botón de copiar.',
      ],
    },
  },
];
