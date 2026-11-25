import { expect, test } from '@playwright/test';
import { cabecerasDePrueba, correoDePrueba } from './ayuda';

test.use({ extraHTTPHeaders: cabecerasDePrueba(), viewport: { width: 1280, height: 900 } });

// CANDADO C-FACEBOOK: un Reel o un video de Facebook se carga en el Estudio con el reproductor oficial y se maneja
// con los botones de Pantalay. El código de Facebook («SDK») se reemplaza aquí por uno de prueba servido en su misma
// dirección: no se llama a Facebook. Antes: «Eso no parece el enlace de un video de YouTube, TikTok o Pantalay».
const SDK_FALSO = `
(function(){
  var subs={}, t=0;
  var anotar=function(x){(window.__ordenes=window.__ordenes||[]).push(x)};
  var j={
    play:function(){anotar('play');subs.startedPlaying&&subs.startedPlaying()},
    pause:function(){anotar('pause');subs.paused&&subs.paused()},
    seek:function(x){t=x;anotar('seek:'+x)},
    mute:function(){anotar('mute')}, unmute:function(){anotar('unmute')},
    setVolume:function(v){anotar('vol:'+v)},
    getCurrentPosition:function(){return t}, getDuration:function(){return 81},
    subscribe:function(e,f){subs[e]=f}
  };
  var listo;
  window.FB={
    init:function(){
      var el=document.querySelector('.fb-video');
      var w=Number(el.getAttribute('data-width'));
      el.style.cssText='display:block;background:#1877f2;width:'+w+'px;height:'+Math.round(w*16/9)+'px';
      window.__href=el.getAttribute('data-href');
      setTimeout(function(){listo({type:'video',instance:j})},50);
    },
    Event:{subscribe:function(n,f){listo=f}}
  };
  window.fbAsyncInit();
})();`;

test('un Reel de Facebook se carga en el Estudio y obedece a los botones de Pantalay', async ({ page }) => {
  await page.route('https://connect.facebook.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'text/javascript', body: SDK_FALSO }),
  );
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Soporte E2E');
  await page.getByLabel('Email').fill(correoDePrueba('facebook'));
  await page.getByLabel('Password', { exact: true }).fill(`Prueba-${Date.now()}`);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/library/);

  await page.goto('/studio');
  await page
    .getByLabel('YouTube, TikTok, Facebook or Pantalay link')
    .fill('https://www.facebook.com/reel/1699340011899306');
  await page.getByRole('button', { name: 'Load video' }).click();
  // Sin error de enlace, y el reproductor es nuestra página de Facebook con el Reel pedido.
  await expect(page.locator('.error')).toHaveCount(0);
  const marco = page.locator('.escenario iframe');
  await expect(marco).toHaveAttribute('src', /\/media\/facebook\/1699340011899306\?r=1/);
  const dentro = () => page.frames().find((f) => f.url().includes('/media/facebook/'))!;
  await expect
    .poll(() => dentro()?.evaluate(() => (window as unknown as { __href?: string }).__href))
    .toBe('https://www.facebook.com/reel/1699340011899306');
  const ordenes = () =>
    dentro().evaluate(() => (window as unknown as { __ordenes?: string[] }).__ordenes ?? []);

  // Un Reel es vertical: el Estudio elige solo la posición de video vertical grande.
  await expect(page.locator('.escenario')).toHaveClass(/diseno-grande/);
  // El video llena el alto de su tarjeta sin salirse (se escala la caja entera).
  const llenado = () =>
    dentro().evaluate(() => {
      const r = document.getElementById('caja')!.getBoundingClientRect();
      return {
        mayor: Math.max(r.width / innerWidth, r.height / innerHeight),
        cabe: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      };
    });
  await expect.poll(async () => (await llenado()).mayor, { timeout: 8000 }).toBeGreaterThan(0.97);
  expect((await llenado()).cabe).toBe(true);

  // Botones de Pantalay: reproducir, pausar con la tecla, adelantar y el volumen solo del video.
  await page.getByRole('button', { name: /Play/ }).click();
  await expect(page.getByRole('button', { name: /Pause$/ })).toBeVisible();
  await expect.poll(ordenes).toContain('play');
  await page.keyboard.press('k');
  await expect(page.getByRole('button', { name: /Play/ })).toBeVisible();
  await expect.poll(ordenes).toContain('pause');
  await page.keyboard.press('l');
  await expect.poll(ordenes).toContain('seek:5');
  await page.getByRole('slider', { name: 'Video volume' }).fill('40');
  await expect.poll(ordenes).toContain('vol:0.4');
  await page.screenshot({ path: test.info().outputPath('estudio-facebook.png') });

  // Un enlace de Facebook que no es de un video sigue diciendo que no parece un enlace de video.
  await page
    .getByLabel('YouTube, TikTok, Facebook or Pantalay link')
    .fill('https://www.facebook.com/unapagina');
  await page.getByRole('button', { name: 'Load video' }).click();
  await expect(page.locator('.error')).toContainText('Facebook');
});
