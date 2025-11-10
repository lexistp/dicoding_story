import { applyAuthNavbarVisibility } from './auth-ui-helper.js';
import { HomeView } from './views/home.js';
import { LoginView } from './views/login.js';
import { RegisterView } from './views/register.js';
import { AddView } from './views/add.js';
import { DetailView } from './views/detail.js';
import { FavoritesView } from './views/favorites.js';
import { theme, getToken, toast, subscribePush, unsubscribePush } from './api/index.js';
import { favList } from './idb.js';
import './styles/style.css';
import './styles/transitions.css';
import './styles/a11y.css';
import './styles/lightbox.css';
import './styles/nav.css';
import './styles/forms.css';
import { setupOutboxSync, trySyncOutbox } from './offline-sync.js';


const routes={ '/home':HomeView, '/login':LoginView, '/register':RegisterView, '/add':AddView, '/detail':DetailView, '/favorites':FavoritesView };
const splash=document.getElementById('splash');
function parseLocation(){ return (window.location.hash || '#/home').slice(1); }
function resolveRoute(){
  const path = parseLocation();
  if(path.startsWith('/detail/')){ return { View: DetailView, params: { id: path.split('/')[2] } }; }
  return { View: routes[path] || HomeView, params: {} };
}
function updateActiveNav(){
  try{
    const path = parseLocation();
    const links = document.querySelectorAll('#menuList a[data-link]');
    links.forEach(a=>{
      const href=a.getAttribute('href')||'';
      const isActive = href === `#${path}`;
      if(isActive) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  }catch{}
}

async function render(){
  const path = parseLocation();
  if (path === '/add' && !getToken()) {
    try{ toast('Silakan login untuk menambah story.', false); }catch{}
    window.location.hash = '#/login';
    return;
  }
  const { View, params } = resolveRoute();
  const app = document.getElementById('app');
  const draw = async ()=>{ const v = new View(params); app.innerHTML=''; app.appendChild(await v.render()); if(typeof v.afterRender==='function') v.afterRender(); try{ document.getElementById('main')?.focus(); }catch{} try{ document.title = `Dicoding Stories • ${path.slice(1).replace(/^\//,'') || 'home'}`; }catch{} };
  if(document.startViewTransition){ document.startViewTransition(draw); } else { await draw(); }
}
window.addEventListener('hashchange', render);
window.addEventListener('hashchange', ()=>{ try{ applyAuthNavbarVisibility(); }catch{} });
window.addEventListener('hashchange', updateActiveNav);
window.addEventListener('DOMContentLoaded', async ()=>{
  theme.load();
  const themeBtn=document.getElementById('themeToggle'); if(themeBtn){ themeBtn.addEventListener('click', ()=> theme.toggle()); }
  // Ensure skip-link moves focus to main without full navigation
  const skip=document.querySelector('.skip-link');
  if(skip){ skip.addEventListener('click',(e)=>{ e.preventDefault(); try{ document.getElementById('main')?.focus(); }catch{} }); }
  // Push toggle setup
  const pushBtn=document.getElementById('pushToggle');
  async function updatePushBtn(){
    try{
      if(!pushBtn) return;
      const reg = await (navigator.serviceWorker?.ready);
      const sub = await reg?.pushManager?.getSubscription();
      const enabled = !!sub;
      pushBtn.textContent = enabled ? '🔔' : '🔕';
      pushBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      pushBtn.title = enabled ? 'Matikan notifikasi' : 'Aktifkan notifikasi';
    }catch{}
  }
  if(pushBtn){
    pushBtn.addEventListener('click', async()=>{
      if(!getToken()){ toast('Silakan login untuk mengaktifkan notifikasi.', false); return; }
      try{ if(!('serviceWorker' in navigator) || !('PushManager' in window)){ toast('Push notifikasi tidak didukung.', false); return; } }
      catch{}
      try{
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if(sub){ await unsubscribePush(); toast('Notifikasi dimatikan'); }
        else { const r=await subscribePush(); toast(r?.message||'Notifikasi diaktifkan'); }
      }catch(e){ toast('Gagal mengubah notifikasi', false); }
      finally{ updatePushBtn(); }
    });
    updatePushBtn();
  }

  // Favorites badge updater
  async function updateFavCount(){ try{ const n=(await favList()).length; const badge=document.getElementById('fav-count'); if(!badge) return; if(n>0){ badge.style.display='inline-block'; badge.textContent=String(n); } else { badge.style.display='none'; badge.textContent=''; } }catch{} }
  document.addEventListener('favoritesUpdated', updateFavCount);
  updateFavCount();
  const btn=document.getElementById('menuToggle'); const menu=document.getElementById('menuList');
  if(btn&&menu){ btn.addEventListener('click',()=>{ const c=menu.dataset.collapsed==='true'; menu.dataset.collapsed=String(!c); btn.setAttribute('aria-expanded',String(!c)); }); }
  setTimeout(()=> splash.classList.remove('active'), 1200);
  if('serviceWorker' in navigator && import.meta.env.PROD){
    try{
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sendSkip = (w)=>{ try{ w.postMessage('SKIP_WAITING'); }catch{} };
      if(reg.waiting){ sendSkip(reg.waiting); }
      reg.addEventListener('updatefound',()=>{
        const nw = reg.installing; if(!nw) return;
        nw.addEventListener('statechange',()=>{ if(nw.state==='installed' && reg.waiting){ sendSkip(reg.waiting); } });
      });
      navigator.serviceWorker.addEventListener('controllerchange',()=>{ try{ window.location.reload(); }catch{} });
    } catch{}
  }
  try{applyAuthNavbarVisibility();}catch{}
  try{updateActiveNav();}catch{}
  try{ setupOutboxSync(); await trySyncOutbox(); }catch{}
  render();
});
try{applyAuthNavbarVisibility();}catch{};
