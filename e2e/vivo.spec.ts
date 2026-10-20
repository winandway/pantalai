import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// PRUEBA EN VIVO con la IA de verdad (gasta menos de 1 centavo). Solo corre a propósito:
//   VIVO=1 URL_BASE=https://pantalai.sitios.dev npx playwright test e2e/vivo.spec.ts
// Usa un video hablado en español de 2 min 27 s (dos pedazos de audio) con muletillas y dos tareas dichas.
test.skip(!process.env.VIVO, 'Solo se corre a propósito (VIVO=1): usa la IA real.');
test.setTimeout(300_000);

const H = { 'x-pantalai': '1', 'content-type': 'application/json' };

async function api<T>(
  p: Page,
  ruta: string,
  init: { method?: string; json?: unknown; anonimo?: boolean } = {},
) {
  return p.evaluate(
    async ({ ruta, init, H }) => {
      const r = await fetch(ruta, {
        method: init.method ?? 'GET',
        headers: init.method && init.method !== 'GET' ? H : undefined,
        body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
        credentials: init.anonimo ? 'omit' : 'same-origin',
        cache: 'no-store',
      });
      return { estado: r.status, datos: (await r.json().catch(() => ({}))) as T };
    },
    { ruta, init, H },
  );
}

test('IA real en vivo: español, dos pedazos, título, resumen, capítulos, tareas, muletillas y Generar', async ({
  page,
}) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte Prueba en vivo');
  await page.getByLabel('Email').fill(`soporte.vivo.${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  const antes = (await api<{ ia: { usd_mes: number } }>(page, '/datos/salud')).datos.ia.usd_mes;

  const b64 = readFileSync(new URL('./datos/es.webm', import.meta.url)).toString('base64');
  const id = await page.evaluate(
    async ({ b64, H }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const n = await (
        await fetch('/datos/videos', { method: 'POST', headers: H, body: JSON.stringify({ idioma: 'es' }) })
      ).json();
      const parte = (
        await (
          await fetch(`/datos/videos/${n.id}/partes/1`, {
            method: 'PUT',
            headers: { 'x-pantalai': '1' },
            body: bytes,
          })
        ).json()
      ).parte;
      await fetch(`/datos/videos/${n.id}/completar`, {
        method: 'POST',
        headers: H,
        body: JSON.stringify({ partes: [parte], duracion: 147.4 }),
      });
      return n.id as string;
    },
    { b64, H },
  );

  await page.goto(`/v/${id}`);
  await expect(page.getByText(/AI finished/)).toBeVisible({ timeout: 180_000 });

  type V = {
    titulo: string;
    descripcion: string;
    capitulos: { segundo: number }[];
    transcripcion: { inicio: number; texto: string }[];
  };
  const v = (await api<{ video: V }>(page, `/datos/videos/${id}`)).datos.video;
  const ia = (
    await api<{ ia: { estado: string; tareas: string[]; muletillas: unknown[] } }>(
      page,
      `/datos/videos/${id}/ia`,
    )
  ).datos.ia;
  console.log(
    JSON.stringify(
      {
        titulo: v.titulo,
        resumen: v.descripcion,
        capitulos: v.capitulos,
        tareas: ia.tareas,
        muletillas: ia.muletillas.length,
      },
      null,
      1,
    ),
  );

  expect(ia.estado).toBe('listo');
  expect(v.transcripcion.some((s) => s.inicio >= 120)).toBe(true); // llegó el segundo pedazo
  expect(v.titulo).not.toMatch(/sin título|untitled/i);
  expect(v.titulo + v.descripcion).toMatch(/caja|cierre/i); // en español y del tema
  expect(v.capitulos.length).toBeGreaterThanOrEqual(3);
  expect(v.capitulos[0]!.segundo).toBe(0);
  expect(ia.tareas.join(' ')).toMatch(/bot[oó]n/i);
  expect(ia.tareas.join(' ')).toMatch(/veinte|20/i);
  expect(ia.muletillas.length).toBeGreaterThanOrEqual(1);

  // Editor: quitar muletillas y guardar.
  await page.goto(`/v/${id}/edit`);
  await page.getByRole('button', { name: /Remove filler words \(/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(new RegExp(`/v/${id}$`));
  const editado = (await api<{ video: { cortes: unknown[] } }>(page, `/datos/videos/${id}`)).datos.video;
  expect(editado.cortes.length).toBeGreaterThanOrEqual(ia.muletillas.length);

  // Generar un reporte de error.
  const doc = await api<{ documento: { titulo: string; pasos: { segundo: number; texto: string }[] } }>(
    page,
    `/datos/videos/${id}/ia/generar`,
    {
      method: 'POST',
      json: { plantilla: 'procedimiento' },
    },
  );
  expect(doc.estado).toBe(200);
  expect(doc.datos.documento.pasos.length).toBeGreaterThanOrEqual(4);
  console.log(
    'DOCUMENTO',
    doc.datos.documento.titulo,
    doc.datos.documento.pasos.map((p) => `${p.segundo}s ${p.texto}`).join(' | '),
  );

  // Comentario anónimo y privacidad.
  expect(
    (
      await api(page, `/datos/videos/${id}/comentarios`, {
        method: 'POST',
        json: { nombre: 'Visitante', texto: 'Muy claro', segundo: 10 },
        anonimo: true,
      })
    ).estado,
  ).toBe(201);
  await api(page, `/datos/videos/${id}`, { method: 'PATCH', json: { privacidad: 'privado' } });
  expect((await api(page, `/datos/videos/${id}`, { anonimo: true })).estado).toBe(404);

  // El gasto se anotó y fue de centavos.
  const despues = (await api<{ ia: { usd_mes: number } }>(page, '/datos/salud')).datos.ia.usd_mes;
  console.log('GASTO DE ESTA PRUEBA (USD):', (despues - antes).toFixed(4));
  expect(despues).toBeGreaterThan(antes);
  expect(despues - antes).toBeLessThan(0.05);

  // Limpieza: el video de prueba se borra.
  expect((await api(page, `/datos/videos/${id}`, { method: 'DELETE' })).estado).toBe(200);
});
