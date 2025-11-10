import { toast } from '../api/index.js';
import { RegisterPresenter } from '../presenters/registerPresenter.js';
export class RegisterView{
  async render(){
    const s=document.createElement('section'); s.className='card';
    s.innerHTML=`<h2>Register</h2><form id="form" novalidate>
      <div><label for="name">Nama</label><input id="name" type="text" required autocomplete="name"></div>
      <div><label for="email">Email</label><input id="email" type="email" required autocomplete="email"></div>
      <div><label for="password">Password</label>
        <div class="form-inline">
          <input id="password" type="password" minlength="8" required autocomplete="new-password">
          <button type="button" id="togglePwd" class="secondary inline-btn" aria-pressed="false" aria-label="Tampilkan kata sandi">Tampilkan</button>
        </div>
        <small id="pwdHint" class="notice" aria-live="polite"></small>
      </div>
      <div><label for="confirm">Konfirmasi Password</label>
        <div class="form-inline">
          <input id="confirm" type="password" minlength="8" required autocomplete="new-password">
          <button type="button" id="toggleConfirm" class="secondary inline-btn" aria-pressed="false" aria-label="Tampilkan konfirmasi kata sandi">Tampilkan</button>
        </div>
        <small id="confirmErr" class="error" aria-live="polite"></small>
      </div>
      <button type="submit" id="submitBtn">Daftar</button><p class="notice" id="msg" aria-live="polite"></p></form>`;
    this.s=s; return s;
  }
  afterRender(){
    const form=this.s.querySelector('#form'); const btn=this.s.querySelector('#submitBtn'); const msg=this.s.querySelector('#msg'); const presenter=new RegisterPresenter();
    const pwd=this.s.querySelector('#password'); const toggle=this.s.querySelector('#togglePwd');
    const confirm=this.s.querySelector('#confirm'); const toggleC=this.s.querySelector('#toggleConfirm');
    const pwdHint=this.s.querySelector('#pwdHint'); const confirmErr=this.s.querySelector('#confirmErr');
    if(toggle&&pwd){ toggle.addEventListener('click',()=>{ const show=pwd.type==='password'; pwd.type= show? 'text':'password'; toggle.textContent= show? 'Sembunyikan':'Tampilkan'; toggle.setAttribute('aria-pressed', show? 'true':'false'); pwd.focus(); }); }
    if(toggleC&&confirm){ toggleC.addEventListener('click',()=>{ const show=confirm.type==='password'; confirm.type= show? 'text':'password'; toggleC.textContent= show? 'Sembunyikan':'Tampilkan'; toggleC.setAttribute('aria-pressed', show? 'true':'false'); confirm.focus(); }); }
    const strength=(v)=>{
      let score=0; if(v.length>=8) score++; if(/[A-Z]/.test(v)) score++; if(/[a-z]/.test(v)) score++; if(/[0-9]/.test(v)) score++; if(/[^A-Za-z0-9]/.test(v)) score++;
      if(score<=1) return {label:'Sangat lemah', ok:false};
      if(score===2) return {label:'Lemah', ok:false};
      if(score===3) return {label:'Cukup', ok:true};
      if(score===4) return {label:'Kuat', ok:true};
      return {label:'Sangat kuat', ok:true};
    };
    const recompute=()=>{
      const v=pwd.value||''; const s=strength(v); if(pwdHint){ pwdHint.textContent = v? `Kekuatan sandi: ${s.label}` : ''; }
      if(confirmErr){ confirmErr.textContent = (confirm.value && confirm.value!==pwd.value)? 'Konfirmasi tidak cocok.' : ''; }
    };
    pwd.addEventListener('input',recompute); confirm.addEventListener('input',recompute);
    form.addEventListener('submit',async(e)=>{ e.preventDefault();
      btn.disabled=true; btn.setAttribute('aria-disabled','true'); btn.textContent='Memproses…';
      form.setAttribute('aria-busy','true');
      msg.textContent='';
      const name=this.s.querySelector('#name').value.trim(); const email=this.s.querySelector('#email').value.trim(); const password=this.s.querySelector('#password').value;
      const v=presenter.validate({name,email,password});
      if(!v.ok){ msg.textContent=v.message; msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true}); btn.disabled=false; btn.removeAttribute('aria-disabled'); btn.textContent='Daftar'; form.removeAttribute('aria-busy'); return; }
      if(confirm.value!==password){ confirmErr.textContent='Konfirmasi tidak cocok.'; msg.textContent='Periksa kembali konfirmasi sandi.'; msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true}); btn.disabled=false; btn.removeAttribute('aria-disabled'); btn.textContent='Daftar'; form.removeAttribute('aria-busy'); return; }
      const r=await presenter.submit({name,email,password});
      msg.textContent=r.message; toast(r.ok? 'Registrasi berhasil':'Registrasi gagal', r.ok);
      msg.setAttribute('tabindex','-1'); msg.focus({preventScroll:true});
      if(r.ok) setTimeout(()=>window.location.hash='#/login',700);
      btn.disabled=false; btn.removeAttribute('aria-disabled'); btn.textContent='Daftar'; form.removeAttribute('aria-busy');
    });
  }
}



