// Textos de la extensión de Chrome y del reporte de error dentro de la página (inglés principal y español neutro).
// Van aparte de idioma.ts para no tocar el diccionario grande.
import type { Idioma } from './idioma';

const en = {
  instalar: 'Get the Chrome extension',
  instalarAyuda:
    'Draw on any web page, highlight your cursor and record bug reports with console and network logs.',
  reporteTitulo: 'Bug report mode',
  reporteListo: 'Console and network from this tab are attached to your video:',
  reporteSinPagina:
    'Console and network from the tab where you opened the extension are attached to your video.',
  reporteSinExtension:
    'To attach console and network logs, install the Pantalay extension for Chrome and start the report from it.',
  reporteConsejo: 'Tip: share that tab when your browser asks what to record, then reproduce the bug.',
  reporteFallo: 'The video is saved, but the console and network logs could not be attached.',
  pestana: 'Console & network',
  todo: 'All',
  consola: 'Console',
  red: 'Network',
  fallos: 'Errors',
  pagina: 'Page',
  navegador: 'Browser',
  antes: 'before recording',
  sinFilas: 'Nothing here.',
  ir: 'Go to this moment',
};

const es: Record<keyof typeof en, string> = {
  instalar: 'Instala la extensión de Chrome',
  instalarAyuda:
    'Dibuja sobre cualquier página web, resalta tu cursor y graba reportes de error con la consola y la red.',
  reporteTitulo: 'Modo reporte de error',
  reporteListo: 'La consola y la red de esta pestaña se adjuntan a tu video:',
  reporteSinPagina: 'La consola y la red de la pestaña donde abriste la extensión se adjuntan a tu video.',
  reporteSinExtension:
    'Para adjuntar la consola y la red, instala la extensión de Pantalay para Chrome y empieza el reporte desde ella.',
  reporteConsejo:
    'Consejo: comparte esa pestaña cuando el navegador te pregunte qué grabar y repite el fallo.',
  reporteFallo: 'El video quedó guardado, pero no se pudieron adjuntar la consola y la red.',
  pestana: 'Consola y red',
  todo: 'Todo',
  consola: 'Consola',
  red: 'Red',
  fallos: 'Errores',
  pagina: 'Página',
  navegador: 'Navegador',
  antes: 'antes de grabar',
  sinFilas: 'No hay nada aquí.',
  ir: 'Ir a este momento',
};

export const TEXTOS_EXTENSION: Record<Idioma, Record<keyof typeof en, string>> = { en, es };
export const ENLACE_EXTENSION = '/pantalay-extension.zip';
export const GUIA_EXTENSION = '/docs/chrome-extension';
