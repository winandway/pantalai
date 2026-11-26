import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, correoDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 1100 } });

// CANDADO C-MASCARA-NATURAL (Richard, 25 nov 2026): la máscara «Natural» es plana de verdad. Sin cabecera, sin
// marcos ni brillos, sin carteles: la cámara arriba a todo el ancho, el título en una franja debajo y el video en
// todo el resto, de borde a borde.
test('la máscara Natural deja los dos videos planos con el título en una franja', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(correoDePrueba('natural'));
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);
  await page.goto('/studio');
  await page.locator('[data-archivo-estudio]').setInputFiles('e2e/datos/vertical-verde.mp4');
  await expect(page.locator('.escenario video.video-local')).toBeVisible();
  await page.locator('#estudio-tema').fill('A plain title');
  await page.locator('.mascaras-lista label', { hasText: 'Natural' }).click();
  await page.locator('.estudio-formatos label').nth(1).click();
  const escenario = page.locator('[data-escenario]');
  await expect(escenario).toHaveClass(/formato-vertical/);
  await expect(escenario).toHaveClass(/estilo-natural/);

  // Nada de adornos.
  await expect(page.locator('.escenario-cabeza')).toBeHidden();
  await expect(page.locator('.escenario .cartel').first()).toBeHidden();
  await expect(page.locator('.escenario-etiqueta')).toBeHidden();
  const caja = page.locator('.escenario-video .escenario-caja');
  await expect(caja).toHaveCSS('border-top-width', '0px');
  await expect(caja).toHaveCSS('box-shadow', 'none');
  await expect(caja).toHaveCSS('border-top-left-radius', '0px');

  // Cámara arriba, franja con el título en el medio y video abajo, todo de borde a borde y sin huecos.
  const m = await page.evaluate(() => {
    const r = (q: string) => document.querySelector(q)!.getBoundingClientRect();
    const e = r('[data-escenario]');
    const rel = (x: DOMRect) => ({
      x: Math.round(x.left - e.left),
      y: Math.round(x.top - e.top),
      w: Math.round(x.width),
      h: Math.round(x.height),
    });
    return {
      W: Math.round(e.width),
      H: Math.round(e.height),
      camara: rel(r('.escenario-camara .escenario-caja')),
      franja: rel(r('.escenario-pie')),
      video: rel(r('.escenario-video .escenario-caja')),
    };
  });
  for (const parte of [m.camara, m.franja, m.video]) {
    expect(Math.abs(parte.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(parte.w - m.W)).toBeLessThanOrEqual(2);
  }
  expect(m.camara.y).toBeLessThanOrEqual(1);
  expect(Math.abs(m.franja.y - (m.camara.y + m.camara.h))).toBeLessThanOrEqual(2);
  expect(Math.abs(m.video.y - (m.franja.y + m.franja.h))).toBeLessThanOrEqual(2);
  expect(Math.abs(m.video.y + m.video.h - m.H)).toBeLessThanOrEqual(2);
  // El video es el protagonista: más de la mitad del alto.
  expect(m.video.h / m.H).toBeGreaterThan(0.5);
  // El título va en mayúsculas, con letras oscuras sobre la franja blanca.
  await expect(page.locator('.escenario-tema')).toHaveText('A plain title');
  await expect(page.locator('.escenario-tema')).toHaveCSS('text-transform', 'uppercase');
  await expect(page.locator('.escenario-pie')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.locator('[data-escenario]').screenshot({ path: test.info().outputPath('natural-vertical.png') });

  // CANDADO C-TITULO-INTELIGENTE (Richard, 25 nov 2026): una frase larga cabe ENTERA. La letra se achica y se reparte
  // en más líneas; antes tenía una sola medida y la frase se cortaba en «¿SABES CÓMO SE LLAMA ESTE…».
  const tema = page.locator('.escenario-tema');
  const letra = () => tema.evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize));
  const letraCorta = await letra();
  const frase = '¿Sabes cómo se llama este instrumento brasileño? 🇧🇷';
  await page.locator('#estudio-tema').fill(frase);
  await expect(tema).toHaveText(frase);
  await expect(tema).not.toContainText('…');
  expect(await letra()).toBeLessThan(letraCorta);
  expect(Number(await tema.getAttribute('data-lineas'))).toBeGreaterThan(1);
  // Nada se sale de la franja: ni a lo ancho ni a lo alto.
  const cabe = await tema.evaluate((e) => {
    const pie = e.parentElement!.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(e);
    const t = r.getBoundingClientRect();
    return {
      ancho: e.scrollWidth <= e.clientWidth + 1,
      alto: t.top >= pie.top && t.bottom <= pie.bottom,
      lados: t.left >= pie.left && t.right <= pie.right,
    };
  });
  await page.locator('[data-escenario]').screenshot({ path: test.info().outputPath('natural-frase.png') });
  expect(cabe).toEqual({ ancho: true, alto: true, lados: true });

  // Tu cámara se achica con el control «Your camera size» y el video gana ese espacio.
  const altoCamara = () =>
    page.locator('.escenario-camara .escenario-caja').evaluate((e) => e.getBoundingClientRect().height);
  const altoVideo = () =>
    page.locator('.escenario-video .escenario-caja').evaluate((e) => e.getBoundingClientRect().height);
  const antes = { camara: await altoCamara(), video: await altoVideo() };
  expect(antes.camara / m.H).toBeLessThan(0.22); // de entrada va chata: 20 % del alto
  await page.getByLabel(/Your camera size/).fill('12');
  await expect.poll(altoCamara).toBeLessThan(antes.camara - 10);
  expect(await altoVideo()).toBeGreaterThan(antes.video + 10);
  await page.locator('[data-escenario]').screenshot({ path: test.info().outputPath('natural-chata.png') });

  // El podcast de siempre no cambia: al volver a él, los marcos vuelven.
  await page.locator('.mascaras-lista label', { hasText: 'Podcast' }).click();
  await expect(escenario).not.toHaveClass(/estilo-natural/);
  await expect(caja).not.toHaveCSS('border-top-width', '0px');
});
