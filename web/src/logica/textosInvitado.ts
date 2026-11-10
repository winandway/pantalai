// Textos del invitado remoto (Estudio y página del invitado). Inglés principal y español neutro.
import type { Idioma } from './idioma';
import type { EstadoLlamada } from './llamada';

const en = {
  // Estudio (anfitrión)
  segunda: 'Second card',
  segundaVideo: 'A video (YouTube, TikTok, file)',
  segundaInvitado: 'A remote guest',
  invitar: 'Invite a guest',
  nuevoEnlace: 'New link',
  cerrarInvitacion: 'Close invitation',
  enlace: 'Guest link',
  copiar: 'Copy link',
  copiado: 'Link copied',
  ayudaEnlace:
    'Send this link to your guest. It works for 24 hours, for one guest at a time, with no account. Ask them to use headphones.',
  invitado: 'Guest',
  rolInvitado: 'Guest',
  temaInvitado: 'Live interview',
  volumenInvitado: 'Guest volume',
  volumenInvitadoAyuda:
    'The guest volume changes how loud your guest sounds for you and in the recording. The microphone volume changes only how loud you sound in the recording.',
  anfitrion: {
    esperando: 'Waiting for your guest… Send them the link.',
    conectando: 'Connecting with your guest…',
    conectado: 'Your guest is connected.',
    caido: 'The connection dropped. Reconnecting by itself… The recording keeps going.',
    salio: 'Your guest left. They can come back with the same link.',
    vencida: 'This invitation expired. Create a new link.',
    ocupada: 'Someone else is already using this link.',
  } satisfies Record<EstadoLlamada, string>,
  tarjeta: {
    esperando: 'Waiting for your guest',
    conectando: 'Connecting…',
    conectado: '',
    caido: 'Reconnecting…',
    salio: 'Your guest left',
    vencida: 'Invitation expired',
    ocupada: '',
  } satisfies Record<EstadoLlamada, string>,
  // Página del invitado
  titulo: 'Join a live interview',
  te: (anfitrion: string) => `${anfitrion} invited you to a live interview on Pantalay.`,
  sinCuenta: 'No account and nothing to install. Your host records the interview.',
  tuNombre: 'Your name',
  tuNombrePlaceholder: 'The name people will see',
  audifonos:
    'Use headphones: without them, your host’s voice comes out of your speakers and gets into your microphone as an echo.',
  entrar: 'Join the interview',
  camara: 'Allow camera and microphone',
  sinCamara:
    'We could not turn on your camera or microphone. Allow them in your browser (the camera icon in the address bar) and try again.',
  vistaPrevia: 'This is how you look',
  silenciar: 'Mute',
  activar: 'Unmute',
  salir: 'Leave',
  volver: 'Join again',
  tocarParaOir: 'Tap to hear your host',
  invitado_: {
    esperando: 'Waiting for your host to let you in…',
    conectando: 'Connecting…',
    conectado: 'You are connected with your host.',
    caido: 'The connection dropped. Reconnecting by itself…',
    salio: 'You left the interview. Thanks for joining!',
    vencida: 'This invitation expired or was closed. Ask your host for a new link.',
    ocupada: 'Someone else is already using this invitation. Ask your host for a new link.',
  } satisfies Record<EstadoLlamada, string>,
  rendido: 'We could not reconnect.',
  noExiste: 'This invitation expired or does not exist. Ask your host for a new link.',
  ocupadaAntes: 'Someone else is already using this invitation. Ask your host for a new link.',
};

type Textos = typeof en;

const es: Textos = {
  segunda: 'Segunda tarjeta',
  segundaVideo: 'Un video (YouTube, TikTok, archivo)',
  segundaInvitado: 'Un invitado a distancia',
  invitar: 'Invitar a alguien',
  nuevoEnlace: 'Enlace nuevo',
  cerrarInvitacion: 'Cerrar la invitación',
  enlace: 'Enlace del invitado',
  copiar: 'Copiar enlace',
  copiado: 'Enlace copiado',
  ayudaEnlace:
    'Mándale este enlace a tu invitado. Sirve por 24 horas, para un invitado a la vez y sin cuenta. Pídele que use audífonos.',
  invitado: 'Invitado',
  rolInvitado: 'Invitado',
  temaInvitado: 'Entrevista en vivo',
  volumenInvitado: 'Volumen del invitado',
  volumenInvitadoAyuda:
    'El volumen del invitado cambia qué tan fuerte lo oyes tú y qué tan fuerte sale en la grabación. El del micrófono cambia solo qué tan fuerte sales tú.',
  anfitrion: {
    esperando: 'Esperando a tu invitado… Mándale el enlace.',
    conectando: 'Conectando con tu invitado…',
    conectado: 'Tu invitado está conectado.',
    caido: 'Se cayó la conexión. Se vuelve a conectar sola… La grabación sigue.',
    salio: 'Tu invitado salió. Puede volver con el mismo enlace.',
    vencida: 'Esta invitación venció. Crea un enlace nuevo.',
    ocupada: 'Otra persona ya está usando este enlace.',
  },
  tarjeta: {
    esperando: 'Esperando a tu invitado',
    conectando: 'Conectando…',
    conectado: '',
    caido: 'Reconectando…',
    salio: 'Tu invitado salió',
    vencida: 'La invitación venció',
    ocupada: '',
  },
  titulo: 'Entra a una entrevista en vivo',
  te: (anfitrion: string) => `${anfitrion} te invitó a una entrevista en vivo en Pantalay.`,
  sinCuenta: 'Sin cuenta y sin instalar nada. Quien te invitó graba la entrevista.',
  tuNombre: 'Tu nombre',
  tuNombrePlaceholder: 'El nombre que verá la gente',
  audifonos:
    'Usa audífonos: sin ellos, la voz de quien te invitó sale por tus parlantes y se mete en tu micrófono como eco.',
  entrar: 'Entrar a la entrevista',
  camara: 'Permitir cámara y micrófono',
  sinCamara:
    'No pudimos encender tu cámara o tu micrófono. Permítelos en tu navegador (el ícono de la cámara en la barra de direcciones) y vuelve a intentarlo.',
  vistaPrevia: 'Así te ves',
  silenciar: 'Silenciar',
  activar: 'Activar micrófono',
  salir: 'Salir',
  volver: 'Volver a entrar',
  tocarParaOir: 'Toca para oír a quien te invitó',
  invitado_: {
    esperando: 'Esperando que quien te invitó te deje pasar…',
    conectando: 'Conectando…',
    conectado: 'Estás conectado con quien te invitó.',
    caido: 'Se cayó la conexión. Se vuelve a conectar sola…',
    salio: 'Saliste de la entrevista. ¡Gracias por participar!',
    vencida: 'Esta invitación venció o la cerraron. Pide un enlace nuevo.',
    ocupada: 'Otra persona ya está usando esta invitación. Pide un enlace nuevo.',
  },
  rendido: 'No pudimos volver a conectar.',
  noExiste: 'Esta invitación venció o no existe. Pide un enlace nuevo a quien te invitó.',
  ocupadaAntes: 'Otra persona ya está usando esta invitación. Pide un enlace nuevo a quien te invitó.',
};

export const TEXTOS_INVITADO: Record<Idioma, Textos> = { en, es };
