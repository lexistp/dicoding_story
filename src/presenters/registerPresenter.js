import { register as apiRegister } from '../api/index.js';

export class RegisterPresenter {
  validate({ name, email, password }){
    const n=String(name||'').trim();
    const e=String(email||'').trim();
    const p=String(password||'');
    if(!n) return { ok:false, message:'Nama wajib diisi.' };
    const re=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!re.test(e)) return { ok:false, message:'Format email tidak valid.' };
    if(p.length<8) return { ok:false, message:'Password minimal 8 karakter.' };
    return { ok:true };
  }
  async submit({ name, email, password }){
    try{
      const res = await apiRegister(name, email, password);
      if(res?.error) return { ok:false, message: res?.message||'Registrasi gagal' };
      return { ok:true, message: res?.message || 'Registrasi berhasil' };
    }catch(err){
      return { ok:false, message: err?.message || 'Registrasi gagal' };
    }
  }
}

