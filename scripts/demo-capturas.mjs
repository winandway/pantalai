// Llena una cuenta de demostración con videos que se ven bien (tableros de ejemplo dibujados en un lienzo, con datos
// neutros) y le pone título, descripción, transcripción y capítulos. Después se sacan las capturas con
// `node scripts/capturas.mjs <correo> <clave> <idVideo>`.
// Uso: con el sitio local corriendo, `node scripts/demo-capturas.mjs`. Imprime el correo, la clave y el video principal.
/* global navigator, setInterval, window -- el guion de adentro corre en la página */
import { chromium } from '@playwright/test';

const BASE = process.env.URL_BASE ?? 'http://127.0.0.1:8787';
const correo = `soporte.demo.${Date.now()}@example.com`;
const clave = `Demo-${Date.now()}`;

const VIDEOS = [
  {
    escena: 0,
    titulo: 'Q3 launch plan: research, design and ship',
    descripcion: 'A 2-minute walkthrough of our launch plan and what each team owns this quarter.',
    frases: [
      'Hi team, quick walkthrough of the Q3 launch plan.',
      'Research is done: we talked to forty customers.',
      'Design is sixty percent there, the new onboarding is the focus.',
      'Shipping starts in two weeks, here are the owners.',
    ],
  },
  {
    escena: 1,
    titulo: 'New online store: best sellers this week',
    descripcion: 'How the new store looks and which products are selling the most.',
    frases: [
      'Here is the new store.',
      'Sneakers are the best seller this week.',
      'Headphones are close behind.',
    ],
  },
  {
    escena: 2,
    titulo: 'October sales review: up 32%',
    descripcion: 'Monthly numbers in three minutes: revenue, top channels and next steps.',
    frases: [
      'October closed up thirty two percent.',
      'The last week was the strongest.',
      'Next month we double down on email.',
    ],
  },
  {
    escena: 3,
    titulo: 'Welcome to the team: your first week',
    descripcion: 'Everything a new teammate needs on day one.',
    frases: [
      'Welcome aboard!',
      'This is your checklist for the first week.',
      'Ping me anytime with questions.',
    ],
  },
  {
    escena: 4,
    titulo: 'Bug report: checkout button not responding',
    descripcion: 'Steps to reproduce and what we expected to happen.',
    frases: [
      'Open the cart and tap checkout.',
      'Nothing happens on mobile Safari.',
      'Expected: the payment form opens.',
    ],
  },
  {
    escena: 5,
    titulo: 'Brand refresh: new colors and type',
    descripcion: 'A quick look at the new palette and how we use it.',
    frases: ['These are the new brand colors.', 'Coral is our accent.', 'Use the dark tone for headers.'],
  },
];

const navegador = await chromium.launch({
  channel: 'chrome',
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const ctx = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ['camera', 'microphone'],
});
// La «pantalla» compartida: uno de seis tableros dibujados (window.__escena elige cuál).
await ctx.addInitScript(() => {
  const dibujar = (g, escena) => {
    const W = 1920;
    const H = 1080;
    const fondo = ['#f6f7f9', '#fff8f3', '#f3f8ff', '#f7f3ff', '#0f1115', '#fff'][escena];
    g.fillStyle = fondo;
    g.fillRect(0, 0, W, H);
    const tinta = escena === 4 ? '#e6e8ee' : '#16181d';
    const suave = escena === 4 ? '#9aa0ab' : '#4a4f5a';
    const tarjeta = (x, y, w, h, c = '#fff') => {
      g.fillStyle = c;
      g.beginPath();
      g.roundRect(x, y, w, h, 28);
      g.fill();
    };
    g.fillStyle = tinta;
    g.font = 'bold 76px system-ui';
    const titulos = [
      'Launch plan · Q3',
      'Online store',
      'Sales · October',
      'Welcome to the team',
      'checkout.ts',
      'Brand refresh',
    ];
    const subt = [
      'Three steps to ship the new onboarding',
      'Best sellers this week',
      '+32% vs. September',
      'Your first week, step by step',
      'TypeError: cannot read property "submit" of null',
      'New palette and typography',
    ];
    g.fillText(titulos[escena], 120, 190);
    g.fillStyle = escena === 4 ? '#ff6b6b' : suave;
    g.font = '38px system-ui';
    g.fillText(subt[escena], 120, 260);
    if (escena === 0)
      ['Research', 'Design', 'Ship'].forEach((t, i) => {
        const x = 120 + i * 570;
        tarjeta(x, 400, 520, 420);
        g.fillStyle = '#6b7280';
        g.font = '32px system-ui';
        g.fillText(`Step ${i + 1}`, x + 44, 480);
        g.fillStyle = '#16181d';
        g.font = 'bold 60px system-ui';
        g.fillText(t, x + 44, 570);
        tarjeta(x + 44, 660, 432, 26, '#e2e4e9');
        tarjeta(x + 44, 660, 432 * [1, 0.6, 0.2][i], 26, '#1f9d55');
      });
    if (escena === 1)
      [
        ['👟', '$89', '#ffe3d6'],
        ['🎧', '$129', '#dff1ff'],
        ['⌚', '$199', '#efe3ff'],
        ['🕶️', '$59', '#e2f7e8'],
      ].forEach(([e, p, c], i) => {
        const x = 120 + i * 430;
        tarjeta(x, 380, 390, 500, c);
        g.font = '160px system-ui';
        g.fillText(e, x + 110, 640);
        g.fillStyle = '#16181d';
        g.font = 'bold 64px system-ui';
        g.fillText(p, x + 130, 800);
      });
    if (escena === 2) {
      tarjeta(120, 340, 1680, 620);
      [38, 52, 46, 70, 64, 92].forEach((h, i) => {
        const alto = 5 * h;
        const x = 220 + i * 260;
        const grad = g.createLinearGradient(0, 900 - alto, 0, 900);
        grad.addColorStop(0, '#34c759');
        grad.addColorStop(1, '#1f9d55');
        g.fillStyle = grad;
        g.beginPath();
        g.roundRect(x, 900 - alto, 170, alto, [16, 16, 0, 0]);
        g.fill();
      });
    }
    if (escena === 3)
      ['Set up your laptop', 'Meet your buddy', 'Read the handbook', 'Ship your first task'].forEach(
        (t, i) => {
          tarjeta(120, 340 + i * 160, 1100, 130);
          g.fillStyle = i < 2 ? '#1f9d55' : '#d1d5db';
          g.beginPath();
          g.arc(200, 405 + i * 160, 30, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#16181d';
          g.font = '44px system-ui';
          g.fillText(t, 270, 420 + i * 160);
        },
      );
    if (escena === 4) {
      tarjeta(120, 330, 1680, 640, '#1c1f26');
      const lineas = [
        ['#b46bff', 'export function checkout(cart) {'],
        ['#e6e8ee', '  const form = document.querySelector("#pay");'],
        ['#ff6b6b', '  form.submit(); // form is null on Safari'],
        ['#e6e8ee', '  return track("checkout", cart.total);'],
        ['#b46bff', '}'],
      ];
      g.font = '44px ui-monospace, Menlo, monospace';
      lineas.forEach(([c, t], i) => {
        g.fillStyle = '#5c6370';
        g.fillText(String(i + 12), 170, 440 + i * 100);
        g.fillStyle = c;
        g.fillText(t, 280, 440 + i * 100);
      });
    }
    if (escena === 5)
      ['#e5484d', '#ff9f43', '#ffe14d', '#1f9d55', '#2563eb', '#16181d'].forEach((c, i) => {
        tarjeta(120 + i * 285, 380, 250, 420, c);
        g.fillStyle = '#16181d';
        g.font = 'bold 34px system-ui';
        g.fillText(c.toUpperCase(), 140 + i * 285, 860);
      });
  };
  navigator.mediaDevices.getDisplayMedia = async () => {
    const c = document.createElement('canvas');
    c.width = 1920;
    c.height = 1080;
    const g = c.getContext('2d');
    const escena = window.__escena ?? 0;
    dibujar(g, escena);
    setInterval(() => dibujar(g, escena), 250);
    const s = c.captureStream(30);
    const v = s.getVideoTracks()[0];
    const original = v.getSettings.bind(v);
    v.getSettings = () => ({ ...original(), width: 1920, height: 1080, displaySurface: 'browser' });
    return s;
  };
});

const p = await ctx.newPage();
await p.goto(`${BASE}/signup`);
await p.getByLabel('Your name').fill('Soporte Pantalay');
await p.getByLabel('Email').fill(correo);
await p.getByLabel('Password', { exact: true }).fill(clave);
await p.getByRole('button', { name: 'Create account' }).click();
await p.waitForURL(/library/);

const ids = [];
for (const v of VIDEOS) {
  await p.goto(`${BASE}/record`);
  await p.evaluate((e) => (window.__escena = e), v.escena);
  await p.getByText('Screen only').click();
  const vivo = p.getByLabel(/Live transcription/);
  if ((await vivo.count()) && (await vivo.isEnabled()) && (await vivo.isChecked())) await vivo.uncheck();
  await p.getByRole('button', { name: 'Start recording' }).click();
  await p.locator('.barra-grabacion .indicador.vivo').waitFor({ timeout: 15000 });
  await p.waitForTimeout(9000);
  await p.getByRole('button', { name: /Finish/ }).click();
  await p.waitForURL(/\/v\/[a-z0-9]{20}$/, { timeout: 60000 });
  const id = p.url().split('/v/')[1];
  ids.push(id);
  const transcripcion = v.frases.map((texto, i) => ({ inicio: i * 2.2, fin: i * 2.2 + 2, texto }));
  await p.evaluate(
    async ([i, datos]) => {
      await fetch(`/datos/videos/${i}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-pantalai': '1' },
        body: JSON.stringify(datos),
      });
    },
    [
      id,
      {
        titulo: v.titulo,
        descripcion: v.descripcion,
        transcripcion,
        capitulos: [
          { segundo: 0, titulo: 'Intro' },
          { segundo: 4, titulo: 'Details' },
        ],
      },
    ],
  );
}
console.log(JSON.stringify({ correo, clave, principal: ids[0], ids }));
await navegador.close();
