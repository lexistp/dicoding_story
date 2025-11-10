import { favList, favRemove } from '../idb.js';

export class FavoritesView{
  constructor(){ this.state={items:[], filtered:[]}; }
  async render(){
    const s=document.createElement('section'); s.className='card';
    s.innerHTML=`<h2>Favorit</h2>
      <div class="form-row">
        <div style="flex:1"><label for="q">Cari</label><input id="q" type="text" placeholder="ketik kata kunci…"></div>
        <div style="align-self:end"><button id="clearAll" class="secondary">Hapus Semua</button></div>
      </div>
      <div id="list" class="list" aria-live="polite"></div>`;
    this.s=s; await this.load(); return s;
  }
  renderList(arr){
    const el=this.s.querySelector('#list'); el.innerHTML='';
    if(!arr.length){ el.innerHTML='<p class="notice">Belum ada favorit.</p>'; return; }
    for(const s of arr){
      const item=document.createElement('article'); item.className='list-item'; item.dataset.id=s.id;
      item.innerHTML=`<img src="${s.photoUrl}" alt="Foto story oleh ${s.name||'Anonim'}" loading="lazy"><div><h3>${s.name||'Anonim'}</h3>
        <p>${s.description||''}</p><div><span class="badge">${new Date(s.createdAt).toLocaleDateString()}</span>
        <a class="badge" href="#/detail/${s.id}">Lihat Detail</a>
        <button class="secondary" data-remove>Hapus</button></div></div>`;
      item.querySelector('[data-remove]').addEventListener('click', async()=>{ await favRemove(s.id); this.state.items=this.state.items.filter(x=>x.id!==s.id); this.applyFilter(); try{ document.dispatchEvent(new CustomEvent('favoritesUpdated')); }catch{} try{ (await import('../api/index.js')).toast('Dihapus dari Favorit', true); }catch{} });
      el.appendChild(item);
    }
  }
  applyFilter(){
    const q=(this.s.querySelector('#q').value||'').toLowerCase();
    const arr=this.state.items.filter(s=> (s.name||'').toLowerCase().includes(q) || (s.description||'').toLowerCase().includes(q));
    this.state.filtered=arr; this.renderList(arr);
  }
  async load(){
    const items=await favList(); this.state.items=items; this.applyFilter();
    this.s.querySelector('#q').addEventListener('input',()=>this.applyFilter());
    this.s.querySelector('#clearAll').addEventListener('click', async()=>{ for(const it of [...this.state.items]) await favRemove(it.id); this.state.items=[]; this.applyFilter(); try{ document.dispatchEvent(new CustomEvent('favoritesUpdated')); }catch{} try{ (await import('../api/index.js')).toast('Semua favorit dihapus', true); }catch{} });
    // Dengarkan perubahan favorit dari halaman lain, lalu reload
    if(!this._favEvt){
      this._favEvt = ()=>{ try{ this.load(); }catch{} };
      document.addEventListener('favoritesUpdated', this._favEvt);
    }
  }
}
