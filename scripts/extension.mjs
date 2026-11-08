// Arma la extensión de Chrome (CANDADO C-EXTENSION): compila extension/src con esbuild en .dist-extension, copia el
// manifiesto, los textos (_locales), la ventanita y los íconos, y la empaqueta en web/public/pantalay-extension.zip
// para que se descargue desde pantalay.com/pantalay-extension.zip.
//   node scripts/extension.mjs            → la extensión que se publica
//   node scripts/extension.mjs --pruebas  → .dist-extension-pruebas, con permiso fijo sobre 127.0.0.1 y localhost
//                                           (Playwright no puede tocar la ventanita ni los atajos que dan activeTab)
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

const pruebas = process.argv.includes('--pruebas');
const salida = pruebas ? '.dist-extension-pruebas' : '.dist-extension';

rmSync(salida, { recursive: true, force: true });
mkdirSync(salida, { recursive: true });

await build({
  entryPoints: {
    fondo: 'extension/src/fondo.ts',
    capa: 'extension/src/capa.ts',
    espia: 'extension/src/espia.ts',
    ventanita: 'extension/src/ventanita.ts',
  },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  minify: !pruebas,
  outdir: salida,
  logLevel: 'warning',
});

cpSync('extension/_locales', join(salida, '_locales'), { recursive: true });
cpSync('extension/iconos', join(salida, 'iconos'), { recursive: true });
cpSync('extension/ventanita.html', join(salida, 'ventanita.html'));

const manifiesto = JSON.parse(readFileSync('extension/manifest.json', 'utf8'));
if (pruebas) manifiesto.host_permissions = ['http://127.0.0.1/*', 'http://localhost/*'];
writeFileSync(join(salida, 'manifest.json'), JSON.stringify(manifiesto, null, 2) + '\n');

// Comprobaciones: los textos existen en los dos idiomas y caben donde Chrome los muestra.
const en = JSON.parse(readFileSync('extension/_locales/en/messages.json', 'utf8'));
const es = JSON.parse(readFileSync('extension/_locales/es/messages.json', 'utf8'));
for (const k of Object.keys(en)) if (!es[k]) throw new Error(`Falta «${k}» en español`);
for (const k of Object.keys(es)) if (!en[k]) throw new Error(`Falta «${k}» en inglés`);
for (const m of [en, es]) {
  if (m.nombre.message.length > 75) throw new Error('El nombre pasa de 75 caracteres');
  if (m.descripcion.message.length > 132) throw new Error('La descripción pasa de 132 caracteres');
}
const permisos = [...manifiesto.permissions].sort().join(',');
if (permisos !== 'activeTab,scripting,storage') throw new Error(`Permisos de más: ${permisos}`);
if (!pruebas && manifiesto.host_permissions)
  throw new Error('La extensión publicada no lleva host_permissions');

if (!pruebas) {
  const zip = armarZip(salida);
  writeFileSync('web/public/pantalay-extension.zip', zip);
  console.log(`extensión lista · ${(zip.length / 1024).toFixed(0)} KB · web/public/pantalay-extension.zip`);
} else {
  console.log(`extensión de pruebas lista · ${salida}`);
}

/** ZIP mínimo (deflate), con fecha fija: el mismo código da siempre el mismo archivo. */
function armarZip(carpeta) {
  const archivos = [];
  const recorrer = (d) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) recorrer(p);
      else archivos.push(p);
    }
  };
  recorrer(carpeta);
  const locales = [];
  const central = [];
  let offset = 0;
  const FECHA = ((2026 - 1980) << 9) | (11 << 5) | 8; // 8 nov 2026
  for (const p of archivos) {
    const nombre = Buffer.from(relative(carpeta, p).split('\\').join('/'));
    const datos = readFileSync(p);
    const comprimido = deflateRawSync(datos, { level: 9 });
    const crc = crc32(datos);
    const cab = Buffer.alloc(30);
    cab.writeUInt32LE(0x04034b50, 0);
    cab.writeUInt16LE(20, 4);
    cab.writeUInt16LE(0x0800, 6); // nombres en UTF-8
    cab.writeUInt16LE(8, 8);
    cab.writeUInt16LE(0, 10);
    cab.writeUInt16LE(FECHA, 12);
    cab.writeUInt32LE(crc, 14);
    cab.writeUInt32LE(comprimido.length, 18);
    cab.writeUInt32LE(datos.length, 22);
    cab.writeUInt16LE(nombre.length, 26);
    cab.writeUInt16LE(0, 28);
    locales.push(cab, nombre, comprimido);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(8, 10);
    c.writeUInt16LE(0, 12);
    c.writeUInt16LE(FECHA, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comprimido.length, 20);
    c.writeUInt32LE(datos.length, 24);
    c.writeUInt16LE(nombre.length, 28);
    c.writeUInt32LE(0, 30);
    c.writeUInt32LE(0, 34);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(offset, 42);
    central.push(c, nombre);
    offset += 30 + nombre.length + comprimido.length;
  }
  const tamCentral = central.reduce((n, b) => n + b.length, 0);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(tamCentral, 12);
  fin.writeUInt32LE(offset, 16);
  return Buffer.concat([...locales, ...central, fin]);
}
