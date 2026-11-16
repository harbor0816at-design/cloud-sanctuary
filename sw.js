const V='sanctuary-v5';
const SHELL=['/','/index.html','/privacy.html','/manifest.webmanifest','/icon-192.png','/icon.svg','/app.js?v=5','/fr/','/de/','/it/','/es/','/zh/','/i18n/en.js?v=4','/i18n/fr.js?v=4','/i18n/de.js?v=4','/i18n/it.js?v=4','/i18n/es.js?v=4','/i18n/zh.js?v=4'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.hostname.endsWith('supabase.co'))return; // live data: never cache
  const isLib=/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u.hostname);
  if(isLib){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res;})));return;}
  if(u.origin===location.origin){e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('/'))));}
});
