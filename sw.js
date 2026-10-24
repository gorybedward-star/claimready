/* Offline support for VA Claims Intelligence. It caches only the app's own files, never veterans' data. */
const VERSION = 'vci-20261024220515';
const CORE = ['./', './index.html', './temp-100.html', './ptsd-stressor.html', './doctor-guide.html', './supplemental-claims.html', './medical-opinions.html', './competency.html', './vietnam-service.html', './herbicide-no-association.html', './spouse-aid-attendance.html', './hepatitis.html', './form-526ez.html', './form-0995.html', './form-0996.html', './form-8940.html', './continuous-pursuit.html', './site-config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './fonts/public-sans-latin-400-normal.woff2', './fonts/public-sans-latin-500-normal.woff2', './fonts/public-sans-latin-600-normal.woff2', './fonts/public-sans-latin-700-normal.woff2',
  './fonts/source-serif-4-latin-400-normal.woff2', './fonts/source-serif-4-latin-600-normal.woff2', './fonts/source-serif-4-latin-400-italic.woff2', './fonts/source-serif-4-latin-600-italic.woff2',
  './fonts/ibm-plex-mono-latin-400-normal.woff2', './fonts/ibm-plex-mono-latin-600-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const fresh = req.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(new URL(req.url).pathname) || new URL(req.url).pathname.endsWith('/');
  if (fresh) { // network first so updates arrive; cache when offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else { // fonts and icons: cache first
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })));
  }
});
