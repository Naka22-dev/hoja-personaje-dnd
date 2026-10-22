// Guarda la app en el móvil para que funcione sin conexión.
// Sirve siempre la copia guardada y, en segundo plano, descarga la versión nueva
// (las actualizaciones se ven la siguiente vez que se abre la app).
const CACHE = 'hoja-pj-v1';
const ARCHIVOS = [
  './',
  'index.html',
  'estilos.css',
  'app.js',
  'manifest.webmanifest',
  'iconos/icono.svg',
  'iconos/icono-180.png',
  'iconos/icono-192.png',
  'iconos/icono-512.png',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  ev.respondWith(caches.open(CACHE).then(async cache => {
    const guardada = await cache.match(req, { ignoreSearch: true });
    const nueva = fetch(req).then(resp => {
      if (resp.ok) cache.put(req, resp.clone());
      return resp;
    }).catch(() => null);
    if (guardada) {
      ev.waitUntil(nueva);
      return guardada;
    }
    return (await nueva) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  }));
});
