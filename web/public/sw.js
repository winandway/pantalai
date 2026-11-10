/* global self, caches, fetch, URL */
// Ayudante de la app instalable de Pantalay (PWA). Candado C-PWA.
// - Páginas: primero la red; sin internet, la última copia guardada o la página «Sin conexión».
// - Archivos con huella (/assets/…): se guardan y se sirven de la copia (nunca cambian).
// - NUNCA toca /datos, /media, otros dominios ni nada que no sea GET: grabar, subir y ver videos va siempre directo.
const VERSION = 'pantalay-v1';
const OFFLINE = '/offline';
const FIJOS = [OFFLINE, '/icon-192.png', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FIJOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (u.pathname.startsWith('/datos') || u.pathname.startsWith('/media') || u.pathname === '/sw.js') return;

  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copia = res.clone();
            void caches.open(VERSION).then((c) => c.put(r, copia));
          }
          return res;
        })
        .catch(() => caches.match(r).then((x) => x || caches.match(OFFLINE))),
    );
    return;
  }

  if (u.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(r).then(
        (x) =>
          x ||
          fetch(r).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              void caches.open(VERSION).then((c) => c.put(r, copia));
            }
            return res;
          }),
      ),
    );
  }
});
