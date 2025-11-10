import { toast } from '../api/index.js';
import { AuthPresenter } from '../presenters/authPresenter.js';
import { applyAuthNavbarVisibility } from '../auth-ui-helper.js';

export class LoginView{
  async render(){
    const s=document.createElement('section'); s.className='card';
    s.innerHTML=`<h2>Login</h2><form id="form" novalidate>
      <div><label for="email">Email</label><input id="email" type="email" required autocomplete="username"></div>
      <div><label for="password">Password</label>
        <div class="form-inline">
          <input id="password" type="password" minlength="8" required autocomplete="current-password">
          <button type="button" id="togglePwd" class="secondary inline-btn" aria-pressed="false" aria-label="Tampilkan kata sandi">Tampilkan</button>
        </div>
      </div>
      <button type="submit" id="submitBtn">Masuk</button><p class="notice" id="msg" aria-live="polite"></p></form>`;
    this.s=s; return s;
  }
  afterRender(){
    const form=this.s.querySelector('#form'); const btn=this.s.querySelector('#submitBtn'); const msg=this.s.querySelector('#msg'); const presenter=new AuthPresenter();
    const pwd=this.s.querySelector('#password'); const toggle=this.s.querySelector('#togglePwd');
    if(toggle&&pwd){ toggle.addEventListener('click',()=>{ const show=pwd.type==='password'; pwd.type= show? 'text':'password'; toggle.textContent= show? 'Sembunyikan':'Tampilkan'; toggle.setAttribute('aria-pressed', show? 'true':'false'); pwd.focus(); }); }
    form.addEventListener('submit',async(e)=>{ 
      e.preventDefault();
      btn.disabled=true; btn.setAttribute('aria-disabled','true'); btn.textContent='Memproses…';
      form.setAttribute('aria-busy','true');
      msg.textContent='';
      const email=this.s.querySelector('#email').value.trim(); const password=this.s.querySelector('#password').value;
      const v=presenter.validate({email,password}); if(!v.ok){ msg.textContent=v.message; btn.disabled=false; btn.removeAttribute('aria-disabled'); btn.textContent='Masuk'; form.removeAttribute('aria-busy'); msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true}); return; }
      const r=await presenter.doLogin({email,password});
      if(r.ok){ applyAuthNavbarVisibility(); msg.textContent='Login berhasil! Mengalihkan…'; toast('Login berhasil', true); msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true}); setTimeout(()=>{ window.location.hash='#/home'; }, 600); }
      else { msg.textContent=r.message; toast('Login gagal', false); msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true}); }
      btn.disabled=false; btn.removeAttribute('aria-disabled'); btn.textContent='Masuk'; form.removeAttribute('aria-busy');
    });
  }
}
