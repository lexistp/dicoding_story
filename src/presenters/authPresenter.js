import { login } from '../api/index.js';

export class AuthPresenter {
  validate({ email, password }){
    const e = String(email||'').trim();
    const p = String(password||'');
    if(!e || !p) return { ok:false, message:'Email dan password wajib diisi.' };
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!re.test(e)) return { ok:false, message:'Format email tidak valid.' };
    if(p.length < 8) return { ok:false, message:'Password minimal 8 karakter.' };
    return { ok:true };
  }
  async doLogin({ email, password }){
    try{
      const res = await login(email,password);
      const token = res?.loginResult?.token;
      if(!token) throw new Error('Token login tidak ditemukan!');
      localStorage.setItem('APP_USER', JSON.stringify(res.loginResult));
      return { ok:true, user: res.loginResult };
    }catch(err){
      return { ok:false, message: err?.message || 'Login gagal' };
    }
  }
}

