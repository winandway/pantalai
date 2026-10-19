// Arma la carpeta «salida»: lo que se publica en la rama yapanel-build de YaDominios Cloud.
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

rmSync('salida', { recursive: true, force: true });
mkdirSync('salida');
cpSync('dist', 'salida', { recursive: true });
cpSync('.dist-worker/_worker.js', 'salida/_worker.js');
cpSync('schema.sql', 'salida/schema.sql');
writeFileSync(
  'salida/yadominios.json',
  JSON.stringify({ compatibility_date: '2026-09-01', compatibility_flags: [] }, null, 2) + '\n',
);
for (const f of ['salida/index.html', 'salida/_worker.js', 'salida/schema.sql']) {
  if (!existsSync(f)) throw new Error(`Falta ${f} en el paquete`);
}
const gz = gzipSync(readFileSync('salida/_worker.js')).length;
if (gz > 10 * 1024 * 1024) throw new Error('El _worker.js pasa de 10 MB comprimido');
console.log(`paquete listo · worker ${(statSync('salida/_worker.js').size / 1024).toFixed(0)} KB (${(gz / 1024).toFixed(0)} KB gzip)`);
