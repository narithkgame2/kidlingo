/* Kidlingo offline copy. The page is network-first (so updates arrive), with the saved copy when offline.
   Google Fonts (the kana and UI fonts) are saved the first time they load. Only kidlingo- caches are touched. */
const V = 'kidlingo-0487cae588', FONTS = 'kidlingo-fonts';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kidlingo-') && k !== V && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.open(FONTS).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if(r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }))));
    return; }
  if(u.origin !== location.origin) return;
  if(e.request.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('/')){
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(cc => cc.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html'))));
    return; }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
