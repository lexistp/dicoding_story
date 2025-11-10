export const API_BASE = "https://story-api.dicoding.dev/v1";

// Theme
export const theme = {
  load(){
    const saved = localStorage.getItem("THEME_PREF") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    const btn = document.getElementById("themeToggle");
    if (btn) {
      const isDark = saved === "dark";
      btn.textContent = isDark ? "🌙" : "🌞";
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
    }
  },
  toggle(){
    const now = (document.documentElement.getAttribute("data-theme") === "dark") ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", now);
    localStorage.setItem("THEME_PREF", now);
    const btn = document.getElementById("themeToggle");
    if (btn) {
      const isDark = now === "dark";
      btn.textContent = isDark ? "🌙" : "🌞";
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
    }
  }
};

export function toast(message, ok=true){
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message || (ok ? "OK" : "Gagal");
  el.classList.remove("error","show");
  if (!ok) el.classList.add("error");
  el.classList.add("show");
  setTimeout(()=> el.classList.remove("show"), 2200);
}

export function getToken(){
  return localStorage.getItem("DICODING_TOKEN");
}
export function setToken(t){
  localStorage.setItem("DICODING_TOKEN", t);
}

async function fetchWithTimeout(url, options={}, timeoutMs=15000){
  return await Promise.race([
    fetch(url, options),
    new Promise((_, reject)=> setTimeout(()=> reject(new Error("Timeout, cek koneksi atau matikan Shields/extension di browser")), timeoutMs))
  ]);
}

export async function register(name, email, password){
  const r = await fetchWithTimeout(`${API_BASE}/register`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({name, email, password})
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.message || "Register gagal");
  return d;
}

export async function login(email, password){
  const r = await fetchWithTimeout(`${API_BASE}/login`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email, password})
  });
  const d = await r.json();
  if (!r.ok || d?.error) throw new Error(d?.message || "Login gagal");
  if (d?.loginResult?.token) setToken(d.loginResult.token);
  return d;
}

export async function fetchStories({page=1, size=15, location=1, nocache=false}={}){
  const ts = nocache ? `&_ts=${Date.now()}` : '';
  const r = await fetchWithTimeout(`${API_BASE}/stories?page=${page}&size=${size}&location=${location}${ts}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    cache: nocache ? 'no-store' : 'default'
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.message || "Gagal memuat stories");
  return d;
}

export async function addStory({description, file, lat, lon}){
  const fd = new FormData();
  fd.append('description', description);
  fd.append('photo', file);
  if (Number.isFinite(lat)) fd.append('lat', lat);
  if (Number.isFinite(lon)) fd.append('lon', lon);
  const headers = { Authorization: `Bearer ${getToken()}` };
  const endpoint = `${API_BASE}/stories`;
  // Upload foto bisa lebih lama; beri timeout lebih longgar (45 detik)
  const r = await fetchWithTimeout(endpoint, { method:'POST', headers, body: fd }, 45000);
  const d = await r.json();
  if (!r.ok) throw new Error(d?.message || "Gagal menambah story");
  return d;
}

// Web Push
const VAPID_PUBLIC = "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";
function urlBase64ToUint8Array(base64String){ const padding='='.repeat((4-(base64String.length%4))%4); const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/'); const rawData=atob(base64); return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0))); }
export async function subscribePush(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) return {error:true,message:'Push tidak didukung'};
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) });
  const body = sub.toJSON();
  const r = await fetchWithTimeout(`${API_BASE}/notifications/subscribe`, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`}, body: JSON.stringify({ endpoint:body.endpoint, p256dh:body.keys?.p256dh, auth:body.keys?.auth }) });
  return r.json();
}

export async function unsubscribePush(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) return {error:true,message:'Push tidak didukung'};
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if(!sub) return {error:false, message:'Tidak ada langganan'};
  const body = sub.toJSON();
  await sub.unsubscribe();
  const r = await fetchWithTimeout(`${API_BASE}/notifications/subscribe`, { method:'DELETE', headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`}, body: JSON.stringify({ endpoint:body.endpoint }) });
  return r.json();
}

export async function getStoryById(id){
  const r = await fetchWithTimeout(`${API_BASE}/stories/${id}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.message || 'Gagal memuat detail story');
  return d?.story;
}
