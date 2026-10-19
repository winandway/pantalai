// Compila el servidor a UN solo _worker.js (módulo ES, dependencias dentro) y le graba el commit.
import { build } from 'esbuild';

const raw = process.env.VERSION || process.env.GITHUB_SHA || '';
const commit = /^[0-9a-f]{7,40}$/i.test(raw) ? raw.slice(0, 7).toLowerCase() : 'local';
await build({
  entryPoints: ['servidor/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  outfile: '.dist-worker/_worker.js',
  define: { COMMIT_PUBLICADO: JSON.stringify(commit) },
  conditions: ['workerd', 'worker', 'browser'],
});
console.log(`servidor compilado · ${commit}`);
