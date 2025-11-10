self.addEventListener('message', (e)=>{ if(e.data==='SKIP_WAITING'){ self.skipWaiting(); } });

const CACHE='stories-cache-v2';
// Precache hanya aset stabil yang pasti ada di produksi. File hashed akan di-cache saat runtime.
const CORE_ASSETS=[
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
self.addEventListener('install',e=>{e.waitUntil((async()=>{ const c=await caches.open(CACHE); try{ await c.addAll(CORE_ASSETS); }catch{} })()); self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));})());self.clients.claim();});
self.addEventListener('fetch',e=>{
  const {request}=e; if(request.method!=='GET') return;
  const url = new URL(request.url);
  // Stale-While-Revalidate for API stories
  if(url.pathname.startsWith('/v1/stories')){
    e.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const network = fetch(request).then(res=>{ cache.put(request, res.clone()); return res; }).catch(()=>null);
      return cached || network || new Response(JSON.stringify({error:true,message:'offline',listStory:[]}),{headers:{'Content-Type':'application/json'}});
    })());
    return;
  }
  // Default cache-first for static
  e.respondWith((async()=>{const cached=await caches.match(request);if(cached) return cached;try{const fresh=await fetch(request);const cache=await caches.open(CACHE);cache.put(request,fresh.clone());return fresh;}catch{return cached||new Response('Anda offline.',{status:200,headers:{'Content-Type':'text/plain'}});} })());
});
self.addEventListener('push',event=>{let data={};try{data=event.data.json();}catch{data={title:'Story berhasil dibuat',options:{body:'Anda telah membuat story baru.'}};}const title=data.title||'Story berhasil dibuat';const options=data.options||{body:'Story baru berhasil dibuat.'};options.actions=[{action:'open',title:'Lihat'},{action:'dismiss',title:'Tutup'}];options.data=options.data||{};event.waitUntil(self.registration.showNotification(title,options));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=(event.notification.data&&event.notification.data.url)||'/index.html#/home';if(event.action==='dismiss') return;event.waitUntil((async()=>{const all=await self.clients.matchAll({includeUncontrolled:true,type:'window'});const c=all[0];if(c){c.focus();c.navigate(url);}else{self.clients.openWindow(url);}})());});
// Remove duplicate activate that nuked cache

