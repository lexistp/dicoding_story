import { getToken } from './api/index.js';

export function applyAuthNavbarVisibility(){
  let token = getToken();
  if (!token) {
    try {
      const user = JSON.parse(localStorage.getItem('APP_USER') || 'null');
      token = user?.token || null;
    } catch {}
  }
  const loginNav = document.querySelector('#nav-login');
  const registerNav = document.querySelector('#nav-register');
  const addNav = document.querySelector('#nav-add');
  const logoutNav = document.querySelector('#nav-logout');
  if (loginNav) loginNav.style.display = token ? 'none' : 'inline-block';
  if (registerNav) registerNav.style.display = token ? 'none' : 'inline-block';
  if (addNav) addNav.style.display = token ? 'inline-block' : 'none';
  if (logoutNav) {
    logoutNav.style.display = token ? 'inline-block' : 'none';
    if (!logoutNav.__bound) {
      logoutNav.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('DICODING_TOKEN');
        localStorage.removeItem('APP_USER');
        applyAuthNavbarVisibility();
        window.location.hash = '#/login';
      });
      logoutNav.__bound = true;
    }
  }
}
export function emitStoriesUpdated(){ try{ document.dispatchEvent(new CustomEvent('storiesUpdated',{ detail:{ nocache:true } })); }catch{ document.dispatchEvent(new Event('storiesUpdated')); } }
