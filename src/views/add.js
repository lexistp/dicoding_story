import { emitStoriesUpdated } from '../auth-ui-helper.js';
import { toast, getToken } from '../api/index.js';
import { AddPresenter } from '../presenters/addPresenter.js';
import { initMap } from '../components/map.js';
export class AddView{
  constructor(){ this.state={lat:null,lon:null}; }
  async render(){
    const s=document.createElement('section'); s.className='card';
    s.innerHTML=`<h2>Tambah Story Baru</h2><p class="notice">Klik peta untuk memilih lokasi. Foto wajib (≤ 1MB).</p>
      <form id="form" novalidate><div><label for="description">Deskripsi</label>
      <textarea id="description" rows="4" required aria-required="true" placeholder="Ceritakan sesuatu..."></textarea>
      <small id="descErr" class="error" role="alert"></small></div>
      <div><label for="photo">Foto</label><input id="photo" type="file" accept="image/*" capture="environment" required aria-required="true">
      <div id="previewWrap" class="notice"></div><small id="photoErr" class="error" role="alert"></small>
      <div id="cameraWrap" class="notice" style="margin-top:.5rem">
        <button type="button" id="cameraToggle" class="secondary">Gunakan Kamera</button>
        <div id="cameraArea" style="display:none;margin-top:.5rem">
          <video id="camVideo" autoplay playsinline style="max-width:100%;border:1px solid var(--border);border-radius:8px"></video>
          <canvas id="camCanvas" style="display:none;max-width:100%;border:1px solid var(--border);border-radius:8px"></canvas>
          <div style="display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap">
            <button type="button" id="camCapture">Ambil Foto</button>
            <button type="button" id="camUse" class="secondary" disabled>Pakai Foto</button>
            <button type="button" id="camRetake" class="secondary" disabled>Ulangi</button>
            <button type="button" id="camClose" class="secondary">Tutup Kamera</button>
          </div>
        </div>
      </div></div>
      <div class="form-row"><div><label for="lat">Latitude</label><input id="lat" type="number" step="any" placeholder="-6.2"></div>
      <div><label for="lon">Longitude</label><input id="lon" type="number" step="any" placeholder="106.8"></div></div>
      <div style="margin:.8rem 0;display:flex;gap:.5rem;flex-wrap:wrap">
        <button type="submit" id="submitBtn">Kirim Story</button></div>
      <p id="msg" class="notice" aria-live="polite"></p></form>
      <div id="map" class="map" aria-label="Pilih lokasi story di peta"></div>`;
    this.s=s; return s;
  }
  afterRender(){
    const map=initMap(this.s.querySelector('#map')); let pin=null;
    map.on('click',(e)=>{ const {lat,lng}=e.latlng; this.s.querySelector('#lat').value=lat.toFixed(6);
      this.s.querySelector('#lon').value=lng.toFixed(6); if(pin) map.removeLayer(pin); pin=L.marker([lat,lng]).addTo(map); });
    const form=this.s.querySelector('#form'); const submitBtn=this.s.querySelector('#submitBtn'); const presenter=new AddPresenter();
    const photoInput=this.s.querySelector('#photo'); const previewWrap=this.s.querySelector('#previewWrap');
    const descEl=this.s.querySelector('#description'); const descErr=this.s.querySelector('#descErr'); const photoErr=this.s.querySelector('#photoErr');
    descEl.addEventListener('input',()=>{ descErr.textContent = descEl.value.trim()? '': 'Deskripsi wajib diisi.'; });
    photoInput.addEventListener('change',()=>{ const f=photoInput.files[0]; this.state.capturedBlob=null; previewWrap.innerHTML='';
      if(f){ if(f.size>1024*1024){ photoErr.textContent='Ukuran foto maksimal 1MB.'; } else { photoErr.textContent=''; }
        const url=URL.createObjectURL(f); previewWrap.innerHTML=`<img src="${url}" alt="Preview foto" style="max-width:160px;border-radius:8px;border:1px solid var(--border);margin-top:.4rem">`; }
    });

    // Kamera (MediaStream)
    const cam={ stream:null, video:this.s.querySelector('#camVideo'), canvas:this.s.querySelector('#camCanvas') };
    const camArea=this.s.querySelector('#cameraArea');
    const toggleBtn=this.s.querySelector('#cameraToggle');
    const capBtn=this.s.querySelector('#camCapture');
    const useBtn=this.s.querySelector('#camUse');
    const retakeBtn=this.s.querySelector('#camRetake');
    const closeBtn=this.s.querySelector('#camClose');
    const openCamera=async()=>{
      try{
        camArea.style.display='block'; toggleBtn.disabled=true;
        cam.canvas.style.display='none'; cam.video.style.display='block';
        useBtn.disabled=true; retakeBtn.disabled=true;
        cam.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}, audio:false});
        cam.video.srcObject=cam.stream; await cam.video.play();
      }catch(e){ toast('Gagal mengakses kamera: '+(e.message||''), false); camArea.style.display='none'; toggleBtn.disabled=false; }
    };
    const stopCamera=()=>{ try{ cam.video.pause(); }catch{} if(cam.stream){ cam.stream.getTracks().forEach(t=>t.stop()); cam.stream=null; } toggleBtn.disabled=false; };
    const capture=()=>{
      if(!cam.video.videoWidth){ toast('Kamera belum siap.', false); return; }
      cam.canvas.width=cam.video.videoWidth; cam.canvas.height=cam.video.videoHeight;
      const ctx=cam.canvas.getContext('2d'); ctx.drawImage(cam.video,0,0,cam.canvas.width,cam.canvas.height);
      cam.canvas.style.display='block'; cam.video.style.display='none';
      // Konversi ke blob jpeg
      cam.canvas.toBlob(b=>{ if(!b){ toast('Gagal mengambil foto.', false); return; }
        this.state.capturedBlob=b; const url=URL.createObjectURL(b);
        previewWrap.innerHTML=`<img src="${url}" alt="Preview foto dari kamera" style="max-width:160px;border-radius:8px;border:1px solid var(--border);margin-top:.4rem">`;
        if(b.size>1024*1024){ photoErr.textContent='Foto dari kamera >1MB. Coba ulangi lebih dekat/tanpa HDR.'; } else { photoErr.textContent=''; }
        useBtn.disabled=false; retakeBtn.disabled=false; }, 'image/jpeg', 0.8);
    };
    toggleBtn.addEventListener('click', openCamera);
    capBtn.addEventListener('click', capture);
    useBtn.addEventListener('click',()=>{ toast('Foto kamera dipakai.'); });
    retakeBtn.addEventListener('click',()=>{ cam.canvas.style.display='none'; cam.video.style.display='block'; useBtn.disabled=true; retakeBtn.disabled=true; this.state.capturedBlob=null; photoErr.textContent=''; });
    closeBtn.addEventListener('click',()=>{ camArea.style.display='none'; stopCamera(); });
    window.addEventListener('hashchange', stopCamera, { once:true });
    const compressIfNeeded = async(file)=>{
      try{
        const max=1024*1024; if(!file || file.size<=max) return file;
        const img=await createImageBitmap(file);
        const scale=Math.min(1, Math.sqrt((max/(file.size||1))*0.9));
        const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
        const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
        let q=0.8; let blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',q));
        while(blob && blob.size>max && q>0.4){ q-=0.1; blob=await new Promise(r=>canvas.toBlob(r,'image/jpeg',q)); }
        return blob && blob.size<=max ? blob : file;
      }catch{ return file; }
    };

    const send=async()=>{
      // Guard ekstra
      try{ if(!getToken()){ toast('Sesi berakhir, silakan login lagi.', false); window.location.hash = '#/login'; return; } } catch {}
      const desc=descEl.value.trim(); let file=this.state.capturedBlob || photoInput.files[0];
      const lat=parseFloat(this.s.querySelector('#lat').value); const lon=parseFloat(this.s.querySelector('#lon').value);
      descErr.textContent=''; photoErr.textContent='';
      const v = presenter.validate({ description:desc, file }); if(!v.ok){ if(v.message.includes('Deskripsi')) descErr.textContent=v.message; else photoErr.textContent=v.message; return; }
      file = await presenter.compressIfNeeded(file); if(file.size>1024*1024){ photoErr.textContent='Ukuran foto melebihi 1MB meski sudah dikompresi.'; return; }
      submitBtn.disabled=true; submitBtn.setAttribute('aria-disabled','true'); submitBtn.textContent='Mengirim…';
      form.setAttribute('aria-busy','true');
      const msg=this.s.querySelector('#msg'); msg.textContent='';
      const r = await presenter.submit({ description:desc, file, lat, lon });
      if(r.ok && !r.offlineQueued){
        msg.textContent=r.message||'Berhasil'; msg.className='success'; toast('Story berhasil dibuat.');
        msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true});
        setTimeout(() => { emitStoriesUpdated(); window.location.hash = '#/home'; }, 720);
      } else if(r.ok && r.offlineQueued){
        msg.textContent=r.message; toast('Disimpan offline. Akan dikirim saat online.');
        msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true});
      } else {
        msg.textContent=r.message; toast('Gagal mengirim story.', false);
        msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true});
      }
      // cleanup state
      submitBtn.disabled=false; submitBtn.removeAttribute('aria-disabled');
      submitBtn.textContent='Kirim Story'; form.removeAttribute('aria-busy');
      stopCamera();
    };
    form.addEventListener('submit',(e)=>{e.preventDefault(); send();});
  }
}
