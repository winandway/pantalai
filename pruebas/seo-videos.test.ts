import { describe, expect, it, vi } from 'vitest';
import {
  LLAVE_INDEXNOW,
  avisarIndexNow,
  capitulosDe,
  datosVideo,
  idiomaDelTexto,
  paginaCanal,
  paginaVideo,
  resumenCorto,
  textoTranscripcion,
  textosDeBusqueda,
  videosParaIA,
  type VideoSeo,
} from '../servidor/seoVideo';
import { sitemap, sitemapVideos } from '../servidor/dominio';

// CANDADO C-SEO-VIDEOS (Richard, 25 nov 2026): la página de cada video le entrega a Google, a las redes y a las IA
// todo lo de una red de videos. Antes decía que su dirección era la portada, siempre «en inglés», y no llevaba ni la
// transcripción ni los capítulos.
const BASE = `<!doctype html>
<html lang="en">
  <head>
    <title>Pantalay</title>
    <meta name="description" content="x" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="x" />
    <meta property="og:description" content="x" />
    <meta property="og:image" content="https://pantalay.com/og.png" />
    <meta property="og:url" content="https://pantalay.com/" />
    <link rel="canonical" href="https://pantalay.com/videos/abc" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body><div id="raiz"></div></body>
</html>`;

const video: VideoSeo = {
  id: 'abc',
  usuario_id: 'u1',
  titulo: 'Cómo tocar la guitarra <fácil>',
  descripcion:
    'Una clase corta para aprender los primeros acordes de la guitarra y tocar una canción completa.',
  autor: 'Soporte',
  duracion: 125.4,
  ancho: 1080,
  alto: 1920,
  tiene_miniatura: true,
  idioma: 'en', // lo que quedó guardado: el idioma de la pantalla, no el del video
  transcripcion: JSON.stringify([
    { inicio: 0, fin: 3, texto: ' Hola a todos, ' },
    { inicio: 3, fin: 8, texto: 'hoy vamos a aprender los acordes de la guitarra.' },
  ]),
  capitulos: JSON.stringify([
    { segundo: 60, titulo: 'La canción' },
    { segundo: 0, titulo: 'Los acordes' },
    { segundo: -1, titulo: 'roto' },
  ]),
  publicado_en: Date.UTC(2026, 10, 20),
  vistas: 7,
  me_gusta: 2,
};

describe('CANDADO C-SEO-VIDEOS: la página de un video', () => {
  const html = paginaVideo(BASE, video, [{ id: 'otro', titulo: 'Otro video', autor: 'Soporte' }]);

  it('dice su propia dirección, no la de la portada', () => {
    expect(html).toContain('<meta property="og:url" content="https://pantalay.com/videos/abc" />');
    expect(html).toContain('<link rel="canonical" href="https://pantalay.com/videos/abc" />');
    expect(html).not.toContain('content="https://pantalay.com/"');
  });

  it('lleva el idioma real del video, no el de la pantalla', () => {
    expect(html).toContain('<html lang="es"');
    expect(html).toContain('<meta property="og:locale" content="es_ES" />');
    expect(idiomaDelTexto('How to record your screen with the camera', 'es')).toBe('en');
    expect(idiomaDelTexto('Demo 2026', 'es')).toBe('es');
    expect(idiomaDelTexto('Demo 2026', 'en')).toBe('en');
  });

  it('trae la tarjeta completa para redes y la vista previa grande para Google', () => {
    expect(html).toContain('<title>Cómo tocar la guitarra &lt;fácil&gt; · Soporte · Pantalay</title>');
    expect(html).toContain('<meta property="og:type" content="video.other" />');
    expect(html).toContain('<meta property="og:video" content="https://pantalay.com/media/abc/video" />');
    expect(html).toContain('<meta property="og:video:height" content="1920" />');
    expect(html).toContain('<meta property="video:duration" content="125" />');
    expect(html).toContain(
      '<meta name="twitter:image" content="https://pantalay.com/media/abc/miniatura" />',
    );
    expect(html).toContain('max-image-preview:large');
    expect(html).toContain('max-video-preview:-1');
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    expect(html.match(/<meta property="og:url"/g)).toHaveLength(1);
  });

  it('los datos de video llevan idioma, medidas, transcripción, capítulos, canal y ruta', () => {
    const [v, ruta] = datosVideo(video) as [Record<string, unknown>, Record<string, unknown>];
    expect(v['@type']).toBe('VideoObject');
    expect(v.inLanguage).toBe('es');
    expect(v.width).toBe(1080);
    expect(v.duration).toBe('PT125S');
    expect(v.transcript).toBe('Hola a todos, hoy vamos a aprender los acordes de la guitarra.');
    expect(v.author).toEqual({ '@type': 'Person', name: 'Soporte', url: 'https://pantalay.com/channel/u1' });
    expect(v.hasPart).toEqual([
      {
        '@type': 'Clip',
        name: 'Los acordes',
        startOffset: 0,
        endOffset: 60,
        url: 'https://pantalay.com/videos/abc?t=0',
      },
      {
        '@type': 'Clip',
        name: 'La canción',
        startOffset: 60,
        endOffset: 125,
        url: 'https://pantalay.com/videos/abc?t=60',
      },
    ]);
    expect(ruta['@type']).toBe('BreadcrumbList');
    expect(html).toContain('"@type":"VideoObject"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    // Nada del título puede cerrar la etiqueta del guion.
    expect(html).not.toContain('<fácil>');
  });

  it('el contenido va escrito en el HTML: título, miniatura, capítulos, transcripción y más videos', () => {
    expect(html).toContain('<h1>Cómo tocar la guitarra &lt;fácil&gt;</h1>');
    expect(html).toContain('<img src="/media/abc/miniatura"');
    expect(html).toContain('<a href="/channel/u1">Soporte</a>');
    expect(html).toContain('<h2>Capítulos</h2>');
    expect(html).toContain('<a href="/videos/abc?t=60">1:00 La canción</a>');
    expect(html).toContain('<h2>Transcripción</h2><p>Hola a todos, hoy vamos');
    expect(html).toContain('<a href="/videos/otro">Otro video</a>');
    expect(html).toContain('Graba tu pantalla y tu cámara gratis con Pantalay');
  });

  it('un video sin descripción ni transcripción igual tiene un resumen útil', () => {
    const pelado = paginaVideo(BASE, { ...video, descripcion: '', transcripcion: '[]', capitulos: 'roto' });
    expect(pelado).toMatch(
      /<meta name="description" content="Mira «Cómo tocar la guitarra[^"]+Pantalay[^"]*" \/>/,
    );
    expect(pelado).not.toContain('<h2>Capítulos</h2>');
    expect(pelado).not.toContain('"transcript"');
  });

  it('las piezas chicas no se rompen con datos malos', () => {
    expect(textoTranscripcion('no es json')).toBe('');
    expect(capitulosDe('{"a":1}')).toEqual([]);
    expect(resumenCorto('una dos tres cuatro cinco seis', 15)).toBe('una dos tres…');
    expect(resumenCorto('corto', 160)).toBe('corto');
    expect(
      textoTranscripcion(JSON.stringify([{ texto: 'palabra '.repeat(100) }]), 50).length,
    ).toBeLessThanOrEqual(51);
  });
});

// Richard, 25 nov 2026: «todo lo que le sugerimos para YouTube lo usamos para nosotros». Los títulos, la primera
// línea, las etiquetas y los hashtags que la IA escribe con lo que se dice en el video van al SEO de su página.
describe('CANDADO C-SEO-VIDEOS: los textos de «Para YouTube» trabajan para los buscadores', () => {
  const youtube = JSON.stringify({
    titulos: [
      { estilo: 'directo', texto: 'Cómo tocar la guitarra <fácil>' },
      { estilo: 'pregunta', texto: '¿Puedes aprender guitarra en dos minutos?' },
    ],
    gancho: 'Aprende tus primeros acordes de guitarra en dos minutos.',
    etiquetas: ['guitarra', 'acordes de guitarra', 'Guitarra', 'clase de guitarra para principiantes'],
    hashtags: ['#guitarra', 'aprender guitarra', 'musica'],
  });
  const conKit = { ...video, descripcion: '', youtube };
  const html = paginaVideo(BASE, conKit);

  it('se limpian: sin «#», sin repetidos y sin espacios en los hashtags', () => {
    expect(textosDeBusqueda(youtube)).toEqual({
      gancho: 'Aprende tus primeros acordes de guitarra en dos minutos.',
      etiquetas: ['guitarra', 'acordes de guitarra', 'clase de guitarra para principiantes'],
      hashtags: ['guitarra', 'aprenderguitarra', 'musica'],
      titulos: ['Cómo tocar la guitarra <fácil>', '¿Puedes aprender guitarra en dos minutos?'],
    });
    expect(textosDeBusqueda('roto')).toEqual({ gancho: '', etiquetas: [], hashtags: [], titulos: [] });
    expect(textosDeBusqueda(null).etiquetas).toEqual([]);
  });

  it('sin descripción propia, el resumen es la primera línea escrita para YouTube', () => {
    expect(html).toContain(
      '<meta name="description" content="Aprende tus primeros acordes de guitarra en dos minutos." />',
    );
  });

  it('las etiquetas y los hashtags van en los datos de video, en la tarjeta y a la vista', () => {
    const [v] = datosVideo(conKit) as [Record<string, unknown>];
    expect(v.keywords).toBe(
      'guitarra, aprenderguitarra, musica, acordes de guitarra, clase de guitarra para principiantes',
    );
    expect(v.alternateName).toEqual(['¿Puedes aprender guitarra en dos minutos?']);
    expect(html).toContain(
      '<meta name="keywords" content="guitarra, acordes de guitarra, clase de guitarra para principiantes" />',
    );
    expect(html).toContain('<meta property="video:tag" content="aprenderguitarra" />');
    expect(html).toContain('<a href="/videos/search?q=aprenderguitarra">#aprenderguitarra</a>');
    expect(html).toContain('<h2>Temas</h2>');
    expect(html).toContain('<a href="/videos/search?q=acordes%20de%20guitarra">acordes de guitarra</a>');
  });

  it('el mapa de videos de Google lleva las etiquetas (hasta 32)', () => {
    const mapa = sitemapVideos([
      {
        id: 'abc',
        titulo: 'Clase',
        descripcion: 'Acordes.',
        autor: 'Soporte',
        duracion: 60,
        publicado_en: Date.UTC(2026, 10, 20),
        vistas: 1,
        tiene_miniatura: true,
        etiquetas: Array.from({ length: 40 }, (_, i) => `tema ${i} & más`),
      },
    ]);
    expect(mapa.match(/<video:tag>/g)).toHaveLength(32);
    expect(mapa).toContain('<video:tag>tema 0 &amp; más</video:tag>');
  });

  it('un video sin esos textos no cambia en nada', () => {
    const sin = paginaVideo(BASE, video);
    expect(sin).not.toContain('name="keywords"');
    expect(sin).not.toContain('<h2>Temas</h2>');
    expect((datosVideo(video)[0] as Record<string, unknown>).keywords).toBeUndefined();
  });
});

describe('CANDADO C-SEO-VIDEOS: canal, mapa del sitio, IA y aviso a buscadores', () => {
  it('la página del canal es un perfil con sus videos', () => {
    const html = paginaCanal(BASE, {
      id: 'u1',
      nombre: 'Soporte',
      idioma: 'en',
      videos: [
        { id: 'abc', titulo: 'First video', tiene_miniatura: true, publicado_en: Date.UTC(2026, 10, 20) },
      ],
    });
    expect(html).toContain('<title>Soporte · Videos on Pantalay</title>');
    expect(html).toContain('"@type":"ProfilePage"');
    expect(html).toContain('<meta property="og:url" content="https://pantalay.com/channel/u1" />');
    expect(html).toContain('<meta property="og:type" content="profile" />');
    expect(html).toContain('<a href="/videos/abc">First video</a>');
  });

  it('el mapa del sitio lleva los canales', () => {
    const mapa = sitemap(
      [{ id: 'abc', publicado_en: Date.UTC(2026, 10, 20) }],
      [{ id: 'u1', publicado_en: Date.UTC(2026, 10, 20) }],
    );
    expect(mapa).toContain('<loc>https://pantalay.com/videos/abc</loc><lastmod>2026-11-20</lastmod>');
    expect(mapa).toContain('<loc>https://pantalay.com/channel/u1</loc><lastmod>2026-11-20</lastmod>');
  });

  it('las IA reciben la lista de videos públicos', () => {
    const texto = videosParaIA([
      { id: 'abc', titulo: 'Clase [1]', autor: 'Soporte', descripcion: 'Acordes.' },
    ]);
    expect(texto).toContain('## Latest public videos');
    expect(texto).toContain('- [Clase 1](https://pantalay.com/videos/abc): Soporte. Acordes.');
    expect(videosParaIA([])).toBe('');
  });

  it('el aviso a los buscadores solo sale desde el sitio público y nunca rompe nada', async () => {
    const pedir = vi.fn<typeof fetch>(async () => new Response('', { status: 200 }));
    expect(await avisarIndexNow('http://127.0.0.1:8787', ['https://pantalay.com/videos/abc'], pedir)).toBe(
      false,
    );
    expect(pedir).not.toHaveBeenCalled();
    expect(await avisarIndexNow('https://pantalay.com', ['https://pantalay.com/videos/abc'], pedir)).toBe(
      true,
    );
    const cuerpo = JSON.parse(String(pedir.mock.calls[0]![1]!.body)) as Record<string, unknown>;
    expect(cuerpo).toEqual({
      host: 'pantalay.com',
      key: LLAVE_INDEXNOW,
      keyLocation: `https://pantalay.com/${LLAVE_INDEXNOW}.txt`,
      urlList: ['https://pantalay.com/videos/abc'],
    });
    const caido = vi.fn<typeof fetch>(async () => {
      throw new Error('sin red');
    });
    const callar = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await avisarIndexNow('https://pantalay.com', ['https://pantalay.com/videos/abc'], caido)).toBe(
      false,
    );
    callar.mockRestore();
  });
});
