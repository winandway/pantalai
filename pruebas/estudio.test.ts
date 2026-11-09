import { describe, expect, it } from 'vitest';
import {
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
