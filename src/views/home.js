import { applyAuthNavbarVisibility } from '../auth-ui-helper.js';
import { toast, getToken } from '../api/index.js';
import { HomePresenter } from '../presenters/homePresenter.js';
import { cacheStories } from '../idb.js';
import { favHas, favToggle, favList } from '../idb.js';
import { initMap } from '../components/map.js';
export class HomeView{
  constructor(){
    this.state={stories:[],markers:[],map:null,page:1,hasMore:true};
    this.searchTimer=null; this.inGlobalSearch=false; this.searchSeq=0;
    this.presenter=new HomePresenter();
    if(typeof window!=='undefined'){ window.__home=this; }
  }
  async render(){
    const wrap=document.createElement('div'); wrap.className='grid';
    const listCard=document.createElement('section'); listCard.className='card'; listCard.style.gridColumn='span 5';
    listCard.innerHTML=`<h2>Daftar Story</h2><p class="notice">Klik item untuk menyorot marker di peta.</p>
      <div class="form-row"><div><label for="keyword">Cari</label><input id="keyword" type="text" placeholder="ketik kata kunci…"></div>
      <div style="align-self:end"><label><input id="hasLoc" type="checkbox" checked> Hanya yang ada lokasi</label></div></div>
      <div class="form-row" style="margin-top:.3rem"><div style="display:none"></div>
      <div style="align-self:end;display:flex;gap:.4rem;flex-wrap:wrap"><select id="timeFilter" aria-label="Filter waktu">
      <option value="all">Semua waktu</option><option value="7">7 hari terakhir</option><option value="30">30 hari terakhir</option></select>
      <button id="reload" class="secondary">Cari</button></div></div>
      <div id="resultInfo" class="notice" aria-live="polite"></div>
      <div id="list" class="list" aria-live="polite" aria-busy="true"></div>
      <div id="sentinel" style="height:1px"></div>
      <div style="margin-top:.6rem"><button id="loadMore" class="secondary" style="display:none">Muat Lebih</button></div>`;
    const mapCard=document.createElement('section'); mapCard.className='card'; mapCard.style.gridColumn='span 7';
    mapCard.innerHTML=`<h2>Peta Story</h2><div id="map" class="map" role="application" aria-label="Peta lokasi story"></div>`;
    wrap.appendChild(listCard); wrap.appendChild(mapCard); this.wrap=wrap;
    await this.load(); return wrap;
  }
  async renderList(stories){
    const listEl=this.wrap.querySelector('#list'); listEl.innerHTML='';
    const favs = new Set((await favList()).map(x=>x.id));
    stories.forEach((s, i)=>{
      const item=document.createElement('article'); item.className='list-item'; item.tabIndex=0; item.dataset.id=s.id; item.dataset.idx=String(i);
      const isFav = favs.has(s.id);
      item.innerHTML=`<img src="${s.photoUrl}" alt="Foto story oleh ${s.name}" loading="lazy"><div><h3>${s.name||'Anonim'}</h3>
        <p>${s.description||''}</p><div><span class="badge">${new Date(s.createdAt).toLocaleDateString()}</span>
        ${ typeof s.lat==="number" && typeof s.lon==="number" ? '<span class="badge">Ada Lokasi</span>' : '' }
        <button class="secondary" data-fav aria-pressed="${isFav?'true':'false'}">${isFav?'★ Favorit':'☆ Favorit'}</button>
        </div></div>`;
      item.querySelector('[data-fav]').addEventListener('click', async(e)=>{
        e.stopPropagation(); const nowFav = await favToggle(s); const btn=e.currentTarget; btn.setAttribute('aria-pressed', nowFav?'true':'false'); btn.textContent = nowFav? '★ Favorit':'☆ Favorit';
        try{ document.dispatchEvent(new CustomEvent('favoritesUpdated')); }catch{}
      });
      listEl.appendChild(item);
    });
  }
  async load(page=1, append=false, nocache=false){
    const listEl=this.wrap.querySelector('#list');
    if(append){ listEl.setAttribute('aria-busy','true'); }
    else { listEl.setAttribute('aria-busy','true'); listEl.innerHTML='<p>Memuat…</p>'; }
    try{
      const { list: items, hasMore } = await this.presenter.load({page, location:1, nocache});
      this.state.page=page;
      this.state.hasMore = hasMore;
      this.state.stories = append ? [...this.state.stories, ...items] : items;
      // Cache gabungan ke IndexedDB untuk mode offline
      try{ await cacheStories(this.state.stories); }catch{}
    }catch(e){
      const needLogin = !getToken() || /unauthor/i.test(String(e?.message||''));
      listEl.innerHTML = `<p class="error">Gagal memuat stories${needLogin? ': silakan login.':''}</p>`;
      listEl.setAttribute('aria-busy','false');
      if(needLogin){ try{ toast('Silakan login untuk melihat story.', false); }catch{} window.location.hash = '#/login'; }
      return;
    }
    const mapEl=this.wrap.querySelector('#map'); if(!this.state.map){ this.state.map=initMap(mapEl); }
    // Tambah area preview foto di bawah peta jika belum ada
    try{
      if(mapEl && !this.wrap.querySelector('#photoPreview')){
        const photoBox=document.createElement('div');
        photoBox.id='photoPreview'; photoBox.className='card';
        photoBox.setAttribute('aria-live','polite');
        photoBox.style.marginTop='.8rem';
        photoBox.innerHTML='<p class="notice">Pilih item/marker untuk melihat foto story di sini.</p>';
        mapEl.parentElement.appendChild(photoBox);
      }
    }catch{}
    await this.applyFiltersAndSync();
    if(this.state.map){ setTimeout(()=>this.state.map.invalidateSize(), 180); }
    const loadMoreBtn=this.wrap.querySelector('#loadMore');
    const reloadBtn=this.wrap.querySelector('#reload');
    reloadBtn.onclick=()=>{ this.inGlobalSearch=false; this.searchSeq++; this.wrap.querySelector('#resultInfo').textContent=''; this.load(1,false); this.setupInfinite(); };
    loadMoreBtn.onclick=()=>{ if(this.state.hasMore){ this.inGlobalSearch=false; this.load(this.state.page+1,true).then(()=>{ if(!this.state.hasMore) loadMoreBtn.disabled=true; }); } };
    if(!this.state.hasMore) loadMoreBtn.disabled=true; else loadMoreBtn.disabled=false;
    const keywordEl=this.wrap.querySelector('#keyword');
    keywordEl.oninput=()=>{
      clearTimeout(this.searchTimer);
      this.searchSeq++; const seq=this.searchSeq;
      this.searchTimer=setTimeout(()=>{ if(seq===this.searchSeq) this.handleSearch(); }, 300);
    };
    if(this.state.map){ setTimeout(()=>this.state.map.invalidateSize(), 180); }
    this.wrap.querySelector('#hasLoc').onchange=()=>{ this.inGlobalSearch=false; this.wrap.querySelector('#resultInfo').textContent=''; this.applyFiltersAndSync(); this.setupInfinite(); };
    if(this.state.map){ setTimeout(()=>this.state.map.invalidateSize(), 180); }
    this.wrap.querySelector('#timeFilter').onchange=()=>{ this.inGlobalSearch=false; this.wrap.querySelector('#resultInfo').textContent=''; this.applyFiltersAndSync(); this.setupInfinite(); };
    if(this.state.map){ setTimeout(()=>this.state.map.invalidateSize(), 180); }
    this.setupInfinite();
    listEl.setAttribute('aria-busy','false');
  }
  async applyFiltersAndSync(){
    const keyword=(this.wrap.querySelector('#keyword').value||'').toLowerCase();
    const onlyLoc=this.wrap.querySelector('#hasLoc').checked;
    const timeFilter=this.wrap.querySelector('#timeFilter').value;
    const now=Date.now();
    const filterOne=this.presenter.makeFilter({keyword, onlyLoc, timeFilter});
    const filtered=this.state.stories.filter(filterOne);
    await this.renderList(filtered); this.drawMarkers(filtered); this.clearPreview();
    // Jika tidak ada hasil dan ada keyword, lakukan pencarian lintas halaman
    if(keyword && !filtered.length && !this.inGlobalSearch){ this.globalSearch(filterOne); }
  }
  async globalSearch(filterOne){
    this.inGlobalSearch=true; const seq=this.searchSeq;
    const listEl=this.wrap.querySelector('#list');
    listEl.setAttribute('aria-busy','true');
    listEl.innerHTML='<p>Mencari di semua halaman…</p>';
    const onlyLoc=this.wrap.querySelector('#hasLoc').checked;
    try{
      const results = await this.presenter.globalSearch({filter:filterOne, onlyLoc, isCanceled: ()=> seq!==this.searchSeq});
      if(results){ await this.renderList(results); this.drawMarkers(results); const info=this.wrap.querySelector('#resultInfo'); if(info) info.textContent = `Hasil dari banyak halaman: ${results.length} item`; }
    }catch(e){ listEl.innerHTML='<p class="error">Gagal melakukan pencarian lintas halaman.</p>'; }
    finally{ listEl.setAttribute('aria-busy','false'); this.inGlobalSearch=false; }
  }
  setupInfinite(){
    const sentinel=this.wrap.querySelector('#sentinel'); const btn=this.wrap.querySelector('#loadMore');
    if(!sentinel) return;
    if(this.observer){ try{ this.observer.disconnect(); }catch{} }
    if('IntersectionObserver' in window){
      btn.style.display='none';
      this.isLoadingMore=false;
      this.observer=new IntersectionObserver((entries)=>{
        for(const e of entries){
          if(e.isIntersecting && !this.inGlobalSearch && this.state.hasMore && !this.isLoadingMore){
            this.isLoadingMore=true;
            this.load(this.state.page+1,true).finally(()=>{ this.isLoadingMore=false; if(!this.state.hasMore){ try{ this.observer.disconnect(); }catch{} } });
          }
        }
      },{root:null, rootMargin:'300px', threshold:0});
      this.observer.observe(sentinel);
    }else{
      btn.style.display='inline-block';
    }
  }
  drawMarkers(stories){
    this.state.markers.forEach(m=>m.remove()); this.state.markers=[];
    const group=[];
    stories.forEach((s, i)=>{
      if(typeof s.lat==='number' && typeof s.lon==='number'){
        const m=L.marker([s.lat,s.lon]).addTo(this.state.map).bindPopup(`<strong>${s.name||'Anonim'}</strong><br>${s.description||''}`);
        try{ m.on('click',()=> this.setPreviewWithIndex(i, stories)); }catch{}
        m.storyId=s.id; this.state.markers.push(m); group.push(m.getLatLng());
      }
    });
    if(group.length){ this.state.map.fitBounds(L.latLngBounds(group),{padding:[20,20]}); }
    const listItems=this.wrap.querySelectorAll('.list-item');
    const highlight=(id, idx)=>{ listItems.forEach(el=>el.classList.toggle('active',el.dataset.id===id));
      for(const m of this.state.markers){ if(m.storyId===id){ m.openPopup(); this.state.map.setView(m.getLatLng(),13,{animate:true}); } }
      try{ if(typeof idx==='number') this.setPreviewWithIndex(idx, stories); else this.setPreviewById(id, stories); }catch{}
    };
    listItems.forEach(el=>{
      el.addEventListener('click',()=>highlight(el.dataset.id, parseInt(el.dataset.idx,10)));
      el.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); highlight(el.dataset.id, parseInt(el.dataset.idx,10));} });
    });
  }
  setPreviewWithIndex(index, list){ try{ this.lastPreviewList=list; this.lastPreviewIndex=index; this.setPreview(list[index]); }catch{} }
  clearPreview(){ try{ const box=this.wrap.querySelector('#photoPreview'); if(box) box.innerHTML='<p class="notice">Pilih item/marker untuk melihat foto story di sini.</p>'; }catch{} }
  setPreviewById(id, storiesRef){ try{ const arr=storiesRef||this.state.stories; const s=(arr||[]).find(x=>x.id===id); if(s) this.setPreview(s); }catch{} }
  setPreview(s){
    try{
      const box=this.wrap.querySelector('#photoPreview'); if(!box) return;
      const dateStr=new Date(s.createdAt).toLocaleString();
      box.innerHTML=`<figure style="margin:0"><img id="previewImg" src="${s.photoUrl}" alt="Foto story oleh ${s.name||'Anonim'}" style="max-width:100%;border-radius:12px;border:1px solid var(--border);cursor:zoom-in"><figcaption style="margin-top:.4rem"><strong>${s.name||'Anonim'}</strong> • <span class="badge">${dateStr}</span><br>${s.description||''}</figcaption></figure>`;
      const img=box.querySelector('#previewImg');
      if(img) img.addEventListener('click',()=> this.openLightboxFromCurrent(img.src, img.alt));
    }catch{}
  }
  openLightbox(src, alt='Pratinjau gambar'){
    try{
      let o=document.getElementById('lightboxOverlay');
      if(!o){
        o=document.createElement('div'); o.id='lightboxOverlay'; o.className='lightbox-overlay'; o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-label','Pratinjau gambar');
        o.innerHTML=`<div class="lightbox-content"><button class="lightbox-prev" aria-label="Sebelumnya">‹</button><button class="lightbox-next" aria-label="Berikutnya">›</button><a class="lightbox-dl" aria-label="Unduh" download>⬇</a><button class="lightbox-close" aria-label="Tutup">×</button><img alt=""></div>`;
        document.body.appendChild(o);
        o.addEventListener('click',(e)=>{ if(e.target===o) this.closeLightbox(); });
        o.querySelector('.lightbox-close').addEventListener('click',()=> this.closeLightbox());
        o.querySelector('.lightbox-prev').addEventListener('click',()=> this.lightboxStep(-1));
        o.querySelector('.lightbox-next').addEventListener('click',()=> this.lightboxStep(1));
      }
      const img=o.querySelector('img'); img.src=src; img.alt=alt||''; const dl=o.querySelector('.lightbox-dl'); if(dl){ dl.href=src; }
      o.classList.add('open');
      this._keyHandler=(ev)=>{ if(ev.key==='Escape'){ this.closeLightbox(); } if(ev.key==='ArrowLeft'){ this.lightboxStep(-1); } if(ev.key==='ArrowRight'){ this.lightboxStep(1); } };
      document.addEventListener('keydown', this._keyHandler);

      // Zoom & pan handlers
      this._lb={ scale:1, x:0, y:0, isDown:false };
      const apply=()=>{ img.style.transform = `translate(${this._lb.x}px, ${this._lb.y}px) scale(${this._lb.scale})`; };
      const clamp=(v,min,max)=> Math.max(min, Math.min(max, v));
      img.onwheel=(e)=>{ e.preventDefault(); const delta = -Math.sign(e.deltaY)*0.2; this._lb.scale = clamp(this._lb.scale + delta, 1, 4); if(this._lb.scale===1){ this._lb.x=0; this._lb.y=0; } apply(); };
      img.onmousedown=(e)=>{ this._lb.isDown=true; this._lb.sx=e.clientX; this._lb.sy=e.clientY; img.style.cursor='grabbing'; };
      window.onmouseup=()=>{ this._lb.isDown=false; img.style.cursor='grab'; };
      window.onmousemove=(e)=>{ if(!this._lb.isDown) return; this._lb.x += e.clientX-this._lb.sx; this._lb.y += e.clientY-this._lb.sy; this._lb.sx=e.clientX; this._lb.sy=e.clientY; apply(); };
      // touch pinch basic
      o.ontouchstart=(ev)=>{
        if(ev.touches.length===2){ this._lb.pinch=true; const dx=ev.touches[0].clientX-ev.touches[1].clientX; const dy=ev.touches[0].clientY-ev.touches[1].clientY; this._lb.baseDist=Math.hypot(dx,dy); this._lb.baseScale=this._lb.scale; }
        else if(ev.touches.length===1){ this._lb.isDown=true; this._lb.sx=ev.touches[0].clientX; this._lb.sy=ev.touches[0].clientY; }
      };
      o.ontouchmove=(ev)=>{
        if(this._lb.pinch && ev.touches.length===2){ const dx=ev.touches[0].clientX-ev.touches[1].clientX; const dy=ev.touches[0].clientY-ev.touches[1].clientY; const dist=Math.hypot(dx,dy); const ratio=dist/this._lb.baseDist; this._lb.scale=clamp(this._lb.baseScale*ratio,1,4); apply(); }
        else if(this._lb.isDown && ev.touches.length===1){ const x=ev.touches[0].clientX; const y=ev.touches[0].clientY; this._lb.x += x-this._lb.sx; this._lb.y += y-this._lb.sy; this._lb.sx=x; this._lb.sy=y; apply(); }
      };
      o.ontouchend=()=>{ this._lb.isDown=false; this._lb.pinch=false; };
    }catch{}
  }
  openLightboxFromCurrent(src, alt){ if(this.lastPreviewList && typeof this.lastPreviewIndex==='number'){ const s=this.lastPreviewList[this.lastPreviewIndex]; this.openLightbox(s?.photoUrl||src, s?.description||alt); } else { this.openLightbox(src, alt); } }
  lightboxStep(step){ try{ if(!this.lastPreviewList) return; this.lastPreviewIndex = (this.lastPreviewIndex + step + this.lastPreviewList.length) % this.lastPreviewList.length; const s=this.lastPreviewList[this.lastPreviewIndex]; const o=document.getElementById('lightboxOverlay'); if(o){ const img=o.querySelector('img'); const dl=o.querySelector('.lightbox-dl'); img.src=s.photoUrl; img.alt=s.description||''; if(dl) dl.href=s.photoUrl; img.style.transform='none'; } }catch{} }
  closeLightbox(){ try{ const o=document.getElementById('lightboxOverlay'); if(o) o.classList.remove('open'); if(this._keyHandler){ document.removeEventListener('keydown', this._keyHandler); this._keyHandler=null; } }catch{} }
}
try{applyAuthNavbarVisibility();}catch{};

document.addEventListener('storiesUpdated',(e)=>{ try{ const nocache=!!(e?.detail?.nocache); if(window.__home && typeof window.__home.load==='function'){ window.__home.load(1,false,nocache); } }catch(e){} });
