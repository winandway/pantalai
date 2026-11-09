import { describe, expect, it } from 'vitest';
import {
  DISENOS,
  esVertical,
  temaDeArchivo,
  medidaGrabacionEstudio,
  disenoVerticalPara,
  volumenDelVideo,
  FORMATOS,
  claseEscenario,
  enlaceOriginal,
  pideToque,
  disenoPara,
  errorDeVideo,
  leerMensajeTiktok,
  ordenTiktok,
  urlReproductorTiktok,
  videoDeEnlace,
  videoDeTiktok,
  ESCUCHAR_YOUTUBE,
  accionDeTecla,
  armarMascara,
  arrobaDe,
  leerMensajeYoutube,
  noInsertable,
  ordenYoutube,
  puedeRecortarPestana,
  saltar,
  segundosDe,
  tituloReaccion,
  urlReproductor,
  videoDeYoutube,
  zonaRelativa,
} from '../web/src/logica/estudio';

describe('estudio: reconocer enlaces de YouTube', () => {
  const casos: [string, string, boolean, number][] = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', false, 0],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ&t=90', 'dQw4w9WgXcQ', false, 90],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s', 'dQw4w9WgXcQ', false, 90],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ', false, 0],
    ['youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ', false, 0],
    ['https://www.youtube.com/shorts/aBcD3fGh1_-', 'aBcD3fGh1_-', true, 0],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ', false, 0],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ?start=12', 'dQw4w9WgXcQ', false, 12],
    ['  https://music.youtube.com/watch?v=dQw4w9WgXcQ  ', 'dQw4w9WgXcQ', false, 0],
  ];
  for (const [url, id, short, inicio] of casos)
    it(url.trim(), () => expect(videoDeYoutube(url)).toEqual({ id, short, inicio }));

  it('rechaza lo que no es YouTube o no trae un video', () => {
    for (const malo of [
      '',
      'hola',
      'https://vimeo.com/123',
      'https://www.youtube.com/',
      'https://www.youtube.com/watch?v=corto',
      'https://evil.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
      'javascript:alert(1)',
    ])
      expect(videoDeYoutube(malo)).toBeNull();
  });

  it('lee los tiempos', () => {
    expect(segundosDe('1h2m3s')).toBe(3723);
    expect(segundosDe('45')).toBe(45);
    expect(segundosDe('raro')).toBe(0);
    expect(segundosDe(null)).toBe(0);
  });
});

describe('estudio: reproductor oficial', () => {
  it('arma la dirección sin controles de YouTube ni sugeridos, con su API y el origen', () => {
    const u = new URL(
      urlReproductor({ id: 'dQw4w9WgXcQ', short: false, inicio: 30 }, 'https://pantalay.com'),
    );
    expect(u.origin).toBe('https://www.youtube-nocookie.com');
    expect(u.pathname).toBe('/embed/dQw4w9WgXcQ');
    expect(u.searchParams.get('enablejsapi')).toBe('1');
    expect(u.searchParams.get('controls')).toBe('0');
    expect(u.searchParams.get('rel')).toBe('0');
    expect(u.searchParams.get('origin')).toBe('https://pantalay.com');
    expect(u.searchParams.get('start')).toBe('30');
  });

  it('habla el protocolo de mensajes', () => {
    expect(JSON.parse(ordenYoutube('seekTo', [12, true]))).toEqual({
      event: 'command',
      func: 'seekTo',
      args: [12, true],
    });
    expect(JSON.parse(ESCUCHAR_YOUTUBE).event).toBe('listening');
    expect(leerMensajeYoutube('{"event":"onReady"}')).toEqual({ tipo: 'listo' });
    expect(leerMensajeYoutube({ event: 'onError', info: 150 })).toEqual({ tipo: 'error', codigo: 150 });
    expect(
      leerMensajeYoutube(
        '{"event":"infoDelivery","info":{"currentTime":12.5,"playerState":1,"duration":60}}',
      ),
    ).toEqual({ tipo: 'info', tiempo: 12.5, estado: 1, duracion: 60 });
    expect(leerMensajeYoutube('no es json')).toBeNull();
    expect(leerMensajeYoutube({ event: 'otro' })).toBeNull();
    expect(leerMensajeYoutube(null)).toBeNull();
  });

  it('sabe qué errores son «no se deja insertar»', () => {
    expect(noInsertable(150)).toBe(true);
    expect(noInsertable(101)).toBe(true);
    expect(noInsertable(2)).toBe(false);
  });

  it('atajos y saltos de 5 segundos', () => {
    expect(accionDeTecla(' ')).toBe('alternar');
    expect(accionDeTecla('ArrowLeft')).toBe('atras');
    expect(accionDeTecla('l')).toBe('adelante');
    expect(accionDeTecla('x')).toBeNull();
    expect(saltar(3, -5)).toBe(0);
    expect(saltar(10, 5, 12)).toBe(11.5);
    expect(saltar(10, 5)).toBe(15);
  });
});

describe('estudio: la máscara', () => {
  it('arma los carteles con el nombre de la cuenta y el creador', () => {
    const m = armarMascara({
      idioma: 'es',
      anfitrion: 'Richard Llerena',
      creador: '@canal',
      tema: 'Un tema',
    });
    expect(m.anfitrion).toBe('Richard');
    expect(m.rolAnfitrion).toBe('Anfitrión');
    expect(m.creador).toBe('@canal');
    expect(m.rolCreador).toBe('Reaccionando');
    expect(m.etiquetaTema).toBe('Tema de hoy');
    expect(m.programa).toBe('Estudio de reacciones');
    const en = armarMascara({ idioma: 'en', anfitrion: '' });
    expect(en.anfitrion).toBe('Host');
    expect(en.etiquetaTema).toBe("Today's topic");
  });

  it('corta los textos largos para que no se salgan', () => {
    const m = armarMascara({ idioma: 'en', anfitrion: 'A', tema: 'x'.repeat(300), creador: 'y'.repeat(80) });
    expect(m.tema.length).toBe(90);
    expect(m.tema.endsWith('…')).toBe(true);
    expect(m.creador.length).toBe(32);
  });

  it('saca el @ del canal', () => {
    expect(arrobaDe('https://www.youtube.com/@MrBeast', 'MrBeast')).toBe('@MrBeast');
    expect(arrobaDe('https://www.youtube.com/channel/UC123', 'Un canal')).toBe('Un canal');
    expect(arrobaDe(undefined, undefined)).toBe('');
  });

  it('título del video grabado', () => {
    expect(tituloReaccion('Tema', 'es')).toBe('Reacción: Tema');
    expect(tituloReaccion('  ', 'en')).toBeUndefined();
  });

  it('zona de la cámara dentro del escenario', () => {
    expect(
      zonaRelativa(
        { left: 110, top: 60, width: 200, height: 100 },
        { left: 10, top: 10, width: 1000, height: 500 },
      ),
    ).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 });
    expect(
      zonaRelativa({ left: 0, top: 0, width: 1, height: 1 }, { left: 0, top: 0, width: 0, height: 0 }),
    ).toBe(null);
  });

  it('solo ofrece el estudio donde existe Region Capture', () => {
    const f = () => undefined;
    const completo = {
      CropTarget: { fromElement: f },
      MediaStreamTrack: { prototype: { cropTo: f } },
      navigator: { mediaDevices: { getDisplayMedia: f } },
      MediaRecorder: f,
    };
    expect(puedeRecortarPestana(completo)).toBe(true);
    expect(puedeRecortarPestana({ ...completo, CropTarget: undefined })).toBe(false);
    expect(puedeRecortarPestana({})).toBe(false);
    // Así lo trae Chrome de verdad: «cropTo» en la pista de captura de pestaña, no en MediaStreamTrack.
    expect(
      puedeRecortarPestana({
        ...completo,
        MediaStreamTrack: { prototype: {} },
        BrowserCaptureMediaStreamTrack: { prototype: { cropTo: f } },
      }),
    ).toBe(true);
  });
});

describe('estudio: TikTok y las posiciones', () => {
  it('reconoce los enlaces de TikTok', () => {
    expect(
      videoDeTiktok(
        'https://www.tiktok.com/@genesisjoangeliqu/video/7691731841765690645?_r=1&_t=ZS-9BGPBWAFyug',
      ),
    ).toEqual({ id: '7691731841765690645', creador: '@genesisjoangeliqu' });
    expect(videoDeTiktok('tiktok.com/@a.b_c/video/7691731841765690645')).toEqual({
      id: '7691731841765690645',
      creador: '@a.b_c',
    });
    expect(videoDeTiktok('https://www.tiktok.com/player/v1/7691731841765690645')?.id).toBe(
      '7691731841765690645',
    );
    expect(videoDeTiktok('https://vm.tiktok.com/ZMabc123/')).toEqual({
      id: '',
      creador: '',
      corto: 'https://vm.tiktok.com/ZMabc123/',
    });
    expect(videoDeTiktok('https://www.tiktok.com/t/ZTabc123/')?.corto).toBe(
      'https://www.tiktok.com/t/ZTabc123/',
    );
    for (const malo of [
      'https://www.tiktok.com/@alguien',
      'https://www.tiktok.com/@a/video/abc',
      'https://tiktok.com.evil.com/@a/video/7691731841765690645',
      'https://vm.tiktok.com/',
    ])
      expect(videoDeTiktok(malo)).toBeNull();
  });

  it('une YouTube y TikTok, y sabe cuál es vertical', () => {
    expect(videoDeEnlace('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toMatchObject({
      plataforma: 'youtube',
      vertical: false,
    });
    expect(videoDeEnlace('https://www.youtube.com/shorts/aBcD3fGh1_-')).toMatchObject({ vertical: true });
    expect(videoDeEnlace('https://www.tiktok.com/@x/video/7691731841765690645')).toMatchObject({
      plataforma: 'tiktok',
      vertical: true,
      creador: '@x',
    });
    expect(videoDeEnlace('https://vimeo.com/1')).toBeNull();
    expect(disenoPara(true)).toBe('grande');
    expect(disenoPara(false)).toBe('clasico');
    expect(DISENOS).toEqual(['clasico', 'iguales', 'vertical', 'grande']);
  });

  it('arma el reproductor de TikTok sin sus botones y habla su protocolo', () => {
    const u = new URL(urlReproductorTiktok('7691731841765690645'));
    expect(u.origin + u.pathname).toBe('https://www.tiktok.com/player/v1/7691731841765690645');
    for (const p of ['controls', 'play_button', 'progress_bar', 'rel', 'description', 'music_info'])
      expect(u.searchParams.get(p)).toBe('0');
    expect(ordenTiktok('play')).toEqual({ type: 'play', 'x-tiktok-player': true });
    expect(ordenTiktok('seekTo', 12)).toEqual({ type: 'seekTo', value: 12, 'x-tiktok-player': true });
    expect(leerMensajeTiktok({ type: 'onPlayerReady', 'x-tiktok-player': true })).toEqual({ tipo: 'listo' });
    expect(leerMensajeTiktok('{"type":"onStateChange","value":1}')).toEqual({ tipo: 'info', estado: 1 });
    expect(leerMensajeTiktok({ type: 'onCurrentTime', value: { currentTime: 3, duration: 20 } })).toEqual({
      tipo: 'info',
      tiempo: 3,
      duracion: 20,
    });
    expect(
      leerMensajeTiktok({
        type: 'onPlayerError',
        value: { errorCode: 2005, errorType: 'TOO_MANY_REQUESTS' },
      }),
    ).toEqual({ tipo: 'error', codigo: 2005 });
    expect(leerMensajeTiktok('[tea-sdk]ready')).toBeNull();
    expect(errorDeVideo('tiktok', 1001)).toBe('no_existe');
    expect(errorDeVideo('tiktok', 2005)).toBe('ocupado');
    expect(errorDeVideo('youtube', 150)).toBe('no_insertable');
    expect(errorDeVideo('youtube', 2)).toBeNull();
  });
});

describe('estudio: el play de TikTok (portada que pide un toque)', () => {
  it('pide el toque solo en TikTok y hasta que el reproductor responde', () => {
    expect(pideToque('tiktok', false)).toBe(true);
    expect(pideToque('tiktok', true)).toBe(false);
    expect(pideToque('youtube', false)).toBe(false);
    expect(pideToque(undefined, false)).toBe(false);
  });

  it('plan B: abre el video en su página', () => {
    expect(enlaceOriginal({ plataforma: 'youtube', id: 'dQw4w9WgXcQ' })).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(enlaceOriginal({ plataforma: 'tiktok', id: '7691731841765690645', creador: '@genesis' })).toBe(
      'https://www.tiktok.com/@genesis/video/7691731841765690645',
    );
    expect(enlaceOriginal({ plataforma: 'tiktok', id: '7691731841765690645', creador: '' })).toBe(
      'https://www.tiktok.com/player/v1/7691731841765690645',
    );
  });
});

describe('estudio: formato vertical 9:16', () => {
  it('arma las clases del escenario', () => {
    expect(claseEscenario('horizontal', 'iguales', false)).toBe('escenario diseno-iguales');
    expect(claseEscenario('horizontal', 'vertical', true)).toBe('escenario diseno-vertical');
    expect(claseEscenario('vertical', 'clasico', false)).toBe('escenario formato-vertical vertical-mitades');
    expect(claseEscenario('vertical', 'iguales', true)).toBe(
      'escenario formato-vertical vertical-mitades video-es-vertical',
    );
    expect(FORMATOS).toEqual(['horizontal', 'vertical']);
  });
});

describe('estudio: volumen del video aparte del micrófono', () => {
  it('YouTube cambia su propio volumen; en la grabación entra tal cual', () => {
    expect(volumenDelVideo('youtube', 40)).toEqual({
      ordenes: ['unMute', { setVolume: 40 }],
      enGrabacion: 1,
    });
    expect(volumenDelVideo('youtube', 0)).toEqual({ ordenes: ['mute'], enGrabacion: 1 });
  });
  it('TikTok solo se silencia; su volumen en la grabación lo pone nuestro mezclador', () => {
    expect(volumenDelVideo('tiktok', 30)).toEqual({ ordenes: ['unMute'], enGrabacion: 0.3 });
    expect(volumenDelVideo('tiktok', 0)).toEqual({ ordenes: ['mute'], enGrabacion: 0 });
  });
  it('valores raros se corrigen', () => {
    expect(volumenDelVideo('tiktok', 250).enGrabacion).toBe(1);
    expect(volumenDelVideo('youtube', -5).ordenes).toEqual(['mute']);
    expect(volumenDelVideo('tiktok', Number.NaN).enGrabacion).toBe(1);
  });
});

describe('estudio: posiciones del Short 9:16', () => {
  it('un video vertical va de protagonista; uno horizontal, en mitades', () => {
    expect(disenoVerticalPara(true)).toBe('protagonista');
    expect(disenoVerticalPara(false)).toBe('mitades');
    expect(claseEscenario('vertical', 'clasico', true, 'protagonista')).toBe(
      'escenario formato-vertical vertical-protagonista video-es-vertical',
    );
  });
});

describe('estudio: medida fija del video', () => {
  it('lado largo 1920 y números pares, según la forma del escenario', () => {
    expect(medidaGrabacionEstudio(1148, 645.75)).toEqual({ ancho: 1920, alto: 1080 });
    expect(medidaGrabacionEstudio(450, 800)).toEqual({ ancho: 1080, alto: 1920 });
    expect(medidaGrabacionEstudio(0, 0)).toEqual({ ancho: 1920, alto: 1080 });
    const m = medidaGrabacionEstudio(1001, 577);
    expect((m.ancho % 2) + (m.alto % 2)).toBe(0);
  });
});

describe('estudio: video de la computadora', () => {
  it('propone el tema con el nombre del archivo y sabe si es vertical', () => {
    expect(temaDeArchivo('mi_reaccion_favorita.mp4')).toBe('mi reaccion favorita');
    expect(temaDeArchivo('Video de prueba.MOV')).toBe('Video de prueba');
    expect(esVertical(720, 1280)).toBe(true);
    expect(esVertical(1920, 1080)).toBe(false);
    expect(esVertical(0, 0)).toBe(false);
  });
  it('el volumen lo pone el propio reproductor y no hay página que abrir', () => {
    expect(volumenDelVideo('archivo', 30)).toEqual({ ordenes: [], enGrabacion: 1 });
    expect(enlaceOriginal({ plataforma: 'archivo', id: 'blob:x' })).toBe('');
  });
});
