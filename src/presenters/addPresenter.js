import { addStory } from '../api/index.js';
import { queueOutbox } from '../idb.js';

export class AddPresenter{
  validate({ description, file }){
    if(!String(description||'').trim()) return { ok:false, message:'Deskripsi wajib diisi.' };
    if(!file) return { ok:false, message:'Foto wajib diunggah.' };
    return { ok:true };
  }
  async compressIfNeeded(file){
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
  }
  async submit({ description, file, lat, lon }){
    try{
      const res = await addStory({ description, file, lat, lon });
      return { ok:true, message: res?.message || 'Berhasil' };
    }catch(e){
      const m = (e && e.message) ? String(e.message) : '';
      const isTimeout = /timeout/i.test(m);
      const looksOffline = !navigator.onLine || /failed to fetch|network|offline/i.test(m);
      if(looksOffline){
        try{ const ok=await queueOutbox({ description, file, lat, lon }); if(ok) return { ok:true, offlineQueued:true, message:'Disimpan offline dan akan dikirim saat online.' }; }
        catch{}
      }
      if(isTimeout && navigator.onLine){ return { ok:false, message:'Permintaan habis waktu. Coba kirim ulang.' }; }
      return { ok:false, message: m || 'Gagal mengirim story.' };
    }
  }
}

