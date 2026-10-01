/* Kidlingo offline copy.
   - The page, manifest and icons: network first (updates arrive), the saved copy when offline.
   - Voice clips (audio/<hash>.m4a, named by content so a changed clip is a new file): saved once and served from the
     device. After the page loads it sends the full list ("save-clips"); missing clips download in the background and
     clips no longer used are removed. Safari plays audio with byte-range requests, so saved clips get 206 replies.
   - Google Fonts are saved the first time they load. Only kidlingo- caches are touched. */
const V = 'kidlingo-46322e0a00', CLIPS = 'kidlingo-clips', FONTS = 'kidlingo-fonts';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kidlingo-') && ![V, CLIPS, FONTS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

async function ranged(req, res){
  const range = req.headers.get('range');
  if(!range || !res || res.status !== 200) return res;
  const buf = await res.arrayBuffer(), size = buf.byteLength, m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = m[1] ? +m[1] : 0, end = Math.min(m[2] ? +m[2] : size - 1, size - 1);
  return new Response(buf.slice(start, end + 1), {status:206, statusText:'Partial Content', headers:{
    'Content-Type': res.headers.get('Content-Type') || 'audio/mp4', 'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes'}});
}
async function clip(req){
  const cache = await caches.open(CLIPS), url = req.url.split('?')[0];
  let res = await cache.match(url);
  if(!res){ res = await fetch(url); if(res.ok) await cache.put(url, res.clone()); }
  return ranged(req, res);
}
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if(req.method !== 'GET') return;
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if(r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }))));
    return; }
  if(u.origin !== location.origin) return;
  if(/\/audio\/[^/]+\.m4a$/.test(u.pathname)) return e.respondWith(clip(req));
  if(req.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('/')){
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(cc => cc.put(req, c)); return r; })
      .catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
    return; }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

let saving = null;
self.addEventListener('message', e => {
  if(!e.data || e.data.type !== 'save-clips') return;
  const src = e.source, urls = e.data.urls.map(x => new URL(x, self.registration.scope).href);
  const post = msg => { try{ src && src.postMessage(msg); }catch(err){} };
  if(saving){ saving.then(() => post({type:'clips', done:urls.length, total:urls.length})); return; }
  saving = (async () => {
    const cache = await caches.open(CLIPS), want = new Set(urls);
    for(const r of await cache.keys()) if(!want.has(r.url)) await cache.delete(r);
    const have = new Set((await cache.keys()).map(r => r.url)); let done = have.size;
    post({type:'clips', done, total:urls.length});
    const todo = urls.filter(u => !have.has(u));
    for(let i = 0; i < todo.length; i += 6){
      await Promise.all(todo.slice(i, i + 6).map(async u => { try{ const r = await fetch(u); if(r.ok){ await cache.put(u, r); done++; } }catch(err){} }));
      post({type:'clips', done, total:urls.length});
    }
  })().finally(() => { saving = null; });
  e.waitUntil && e.waitUntil(saving);
});
