# PANTALAI

Grabador de pantalla y cámara en el navegador, con enlace al instante (estilo Loom), de Windoce LLC.
Las reglas globales de Richard aplican; estas se suman.

## Leer antes de trabajar

- `docs/investigacion-rea/FICHA-LOOM.md` — lo que REA observó de Loom (página pública, como visitante) y la decisión.
- `CANDADOS.md` — lo que funciona y no se toca, con su prueba.
- `PENDIENTES.md` — la fila; los 👤 dependen de Richard.
- `docs/CONTRATO-YADOMINIOS.md` — cómo se publica.

## REA

REA es la herramienta principal para estudiar referencias y revisar nuestra app. Límite que no se negocia:
a Loom (o cualquier tercero) solo se le observa la web pública como visitante; nunca se descompila ni se
analiza su código. Sobre PANTALAI (nuestro) se puede usar todo REA.

## Estructura

- `servidor/` — Hono, se empaqueta como `_worker.js`. Rutas bajo `/datos` y `/media`, NUNCA `/api`.
  `servidor/index.ts` solo exporta el programa (el runtime no acepta otras exportaciones).
- `web/` — Vite + React. `web/src/logica` (pura, probada), `componentes`, `paginas`.
- `schema.sql` — corre en cada publicación, solo `CREATE ... IF NOT EXISTS`. Columna nueva en tabla
  existente = migración aparte anotada en `CANDADOS.md`.
- `pruebas/` — vitest (base y almacén falsos, nada real). `e2e/` — Playwright con Chrome y cámara,
  micrófono y pantalla simulados: graba de verdad.

## Publicación

- YaDominios Cloud, sitio `pantalai` → `https://pantalai.sitios.dev`, rama `yapanel-build`
  (la llena el Action `publicar` después de que `verify` da verde).
- Necesita plan con base de datos (`env.DB`) y almacenamiento (`env.BUCKET`).
- Prueba local: `npm run build`, `npx wrangler d1 execute pantalai-local --local --file schema.sql`,
  `npx wrangler dev --local --port 8787`, y `npx playwright test`.

## Perímetro

- Carpeta: solo `/Users/windocellc/PANTALAI`.
- GitHub: repositorio `pantalai` de la cuenta conectada en `gh` (winandway).
- YaDominios Cloud: solo el sitio `pantalai`.
- IA de pago: NINGUNA conectada. Transcripción con el reconocimiento de voz del navegador (gratis).
  Conectar un proveedor exige el sí de Richard con el costo escrito.

## Compuertas

`npm run verify` = tipos + lint + pruebas con cobertura (umbral 60 %) + build + audit. El pre-push lo exige.
