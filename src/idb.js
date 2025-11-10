const DB_NAME = 'stories-idb-v2';
const DB_VERSION = 2;
const STORES = { stories: 'stories', outbox: 'outbox', favorites: 'favorites' };

function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains(STORES.stories)) db.createObjectStore(STORES.stories, { keyPath:'id' });
      if(!db.objectStoreNames.contains(STORES.outbox)) db.createObjectStore(STORES.outbox, { keyPath:'_id', autoIncrement:true });
      if(!db.objectStoreNames.contains(STORES.favorites)) db.createObjectStore(STORES.favorites, { keyPath:'id' });
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

async function tx(store, mode='readonly'){ const db = await openDB(); return db.transaction(store, mode).objectStore(store); }

export async function cacheStories(list){ try{ const s = await tx(STORES.stories, 'readwrite'); await new Promise((res,rej)=>{ const clearReq=s.clear(); clearReq.onsuccess=()=>res(); clearReq.onerror=()=>rej(clearReq.error); }); for(const item of (list||[])){ await new Promise((res,rej)=>{ const r=s.put(item); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); } }catch{} }
export async function readCachedStories(){ try{ const s = await tx(STORES.stories); return await new Promise((res,rej)=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); }catch{ return []; } }

export async function queueOutbox(entry){ try{ const s = await tx(STORES.outbox, 'readwrite'); await new Promise((res,rej)=>{ const r=s.add({ ...entry, _ts: Date.now() }); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); return true; }catch{ return false; } }
export async function readOutbox(){ try{ const s = await tx(STORES.outbox); return await new Promise((res,rej)=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); }catch{ return []; } }
export async function removeOutbox(id){ try{ const s = await tx(STORES.outbox, 'readwrite'); await new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }catch{} }

// Favorites CRUD
export async function favList(){ try{ const s=await tx(STORES.favorites); return await new Promise((res,rej)=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); }catch{ return []; } }
export async function favHas(id){ try{ const s=await tx(STORES.favorites); return await new Promise((res,rej)=>{ const r=s.get(id); r.onsuccess=()=>res(!!r.result); r.onerror=()=>rej(r.error); }); }catch{ return false; } }
export async function favAdd(item){ try{ const s=await tx(STORES.favorites,'readwrite'); await new Promise((res,rej)=>{ const r=s.put(item); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); return true; }catch{ return false; } }
export async function favRemove(id){ try{ const s=await tx(STORES.favorites,'readwrite'); await new Promise((res,rej)=>{ const r=s.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); return true; }catch{ return false; } }
export async function favToggle(item){ return (await favHas(item.id)) ? (await favRemove(item.id), false) : (await favAdd(item), true); }
