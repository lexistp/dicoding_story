import { getStoryById, toast } from '../api/index.js';
import { initMap } from '../components/map.js';
import { readCachedStories } from '../idb.js';

export class DetailView{
  constructor(params){ this.params=params||{}; }
  async render(){
    const s=document.createElement('section'); s.className='card';
    s.innerHTML = `<h2>Detail Story</h2><div id="wrap"><p class="notice">Memuat detail…</p></div>`;
    this.s=s; await this.load(); return s;
  }
  async load(){
    const wrap=this.s.querySelector('#wrap');
    const id=this.params?.id; if(!id){ wrap.innerHTML='<p class="error">ID tidak ditemukan.</p>'; return; }
    try{
      let story = await getStoryById(id);
      if(!story){ // fallback ke cache list
        const cached = await readCachedStories(); story = cached.find(x=>x.id===id);
      }
      if(!story){ wrap.innerHTML='<p class="error">Story tidak ditemukan.</p>'; return; }
      const dateStr=new Date(story.createdAt).toLocaleString();
      wrap.innerHTML = `<figure style="margin:0"><img src="${story.photoUrl}" alt="Foto story oleh ${story.name||'Anonim'}" style="max-width:100%;border-radius:12px;border:1px solid var(--border)"><figcaption style="margin-top:.4rem"><strong>${story.name||'Anonim'}</strong> • <span class="badge">${dateStr}</span></figcaption><p>${story.description||''}</p></figure><div id="map" class="map" style="margin-top:.8rem" aria-label="Lokasi story"></div><div style="margin-top:.6rem"><a class="secondary" href="#/home">← Kembali</a></div>`;
      if(typeof story.lat==='number'&&typeof story.lon==='number'){
        const map=initMap(this.s.querySelector('#map')); const m=L.marker([story.lat,story.lon]).addTo(map).bindPopup('Lokasi story'); m.openPopup(); map.setView([story.lat,story.lon], 13);
      } else {
        this.s.querySelector('#map').innerHTML = '<p class="notice">Story ini tidak memiliki lokasi.</p>';
      }
    }catch(e){ wrap.innerHTML='<p class="error">Gagal memuat detail story.</p>'; try{ toast('Gagal memuat detail', false); }catch{} }
  }
}
