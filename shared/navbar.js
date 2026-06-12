/* ================================
   SCRIPTORA — shared/navbar.js
   ================================ */

(function () {

  const path       = window.location.pathname;
  const isHome     = path.includes('Homepage') || path.endsWith('index.html');
  const isLogin    = path.includes('Login');
  const isRegister = path.includes('Register');

  const clientName = localStorage.getItem('scriptora_name') || '';
  const clientRole = localStorage.getItem('scriptora_role') || '';
  const isLoggedIn = clientRole === 'client' || clientRole === 'admin';
  const initials   = clientName ? clientName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : 'U';
  const firstName  = clientName ? clientName.split(' ')[0] : '';

  function pricingLink() { return '../Pricing page/pricing.html'; }
  function homeLink(anchor) {
    if (isHome) return anchor || '#';
    return '../Homepage/index.html' + (anchor || '');
  }
  function dashboardLink() {
    if (clientRole === 'admin') return '../Admin Dashboard/admin.html';
    return '../Client Dashboard/dashboard.html';
  }

  const authButtons = isLoggedIn ? `
    <a href="${dashboardLink()}" class="nav-dashboard-btn">
      <div class="nav-avatar">${initials}</div>
      <span>${firstName}</span>
    </a>
    <button class="btn-logout" onclick="scriptoraLogout()">Logout</button>
  ` : `
    ${!isLogin    ? `<button class="btn-login"    onclick="window.location.href='../Login page/login.html'">Login</button>` : ''}
    ${!isRegister ? `<button class="btn-register" onclick="window.location.href='../Register page/register.html'">Register</button>` : ''}
  `;

  const mobileAuthButtons = isLoggedIn ? `
    <div style="display:flex;gap:10px;padding-top:6px;">
      <a href="${dashboardLink()}" class="btn-register" style="flex:1;text-align:center;text-decoration:none;">Dashboard</a>
      <button class="btn-login" style="flex:1" onclick="scriptoraLogout()">Logout</button>
    </div>
  ` : `
    <div style="display:flex;gap:10px;padding-top:6px;">
      ${!isLogin    ? `<button class="btn-login"    style="flex:1" onclick="window.location.href='../Login page/login.html'">Login</button>` : ''}
      ${!isRegister ? `<button class="btn-register" style="flex:1" onclick="window.location.href='../Register page/register.html'">Register</button>` : ''}
    </div>
  `;

  const navHTML = `
  <nav id="shared-nav">
    <a class="logo" href="${homeLink()}">
      <div class="logo-icon">S</div>
      Scriptora
    </a>
    <div class="nav-links">
      <a href="${homeLink('#services')}">Services</a>
      <a href="${pricingLink()}">Pricing</a>
      <a href="${homeLink('#samples')}">Samples</a>
      <a href="${homeLink('#reviews')}">Reviews</a>
      <a href="${homeLink('#faq')}">FAQ</a>
      <a href="${homeLink('#contact')}">Contact</a>
    </div>
    <div class="nav-btns">
      ${authButtons}
      <button class="hamburger" id="hamburgerBtn">☰</button>
    </div>
  </nav>
  <div class="mobile-menu" id="mobileMenu">
    <a href="${homeLink('#services')}">Services</a>
    <a href="${pricingLink()}">Pricing</a>
    <a href="${homeLink('#samples')}">Samples</a>
    <a href="${homeLink('#reviews')}">Reviews</a>
    <a href="${homeLink('#faq')}">FAQ</a>
    <a href="${homeLink('#contact')}">Contact</a>
    ${mobileAuthButtons}
  </div>`;

  const navCSS = `
  <style id="shared-nav-css">
    #shared-nav { background:#0a1428; padding:0 2.5rem; height:58px; display:flex; align-items:center; justify-content:space-between; border-bottom:0.5px solid rgba(255,255,255,0.08); position:sticky; top:0; z-index:1000; }
    .logo { display:flex; align-items:center; gap:10px; font-weight:600; font-size:17px; color:white; text-decoration:none; }
    .logo-icon { width:34px; height:34px; border-radius:8px; background:#2d6ef7; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; color:white; }
    .nav-links { display:flex; gap:1.75rem; align-items:center; }
    .nav-links a { color:rgba(255,255,255,0.7); font-size:14px; text-decoration:none; transition:color 0.2s; }
    .nav-links a:hover { color:white; }
    .nav-btns { display:flex; gap:10px; align-items:center; }
    .btn-login { padding:7px 18px; border:0.5px solid rgba(255,255,255,0.3); border-radius:7px; background:transparent; color:white; font-size:13.5px; cursor:pointer; font-family:inherit; }
    .btn-login:hover { border-color:rgba(255,255,255,0.65); }
    .btn-register { padding:7px 18px; border:none; border-radius:7px; background:#2d6ef7; color:white; font-size:13.5px; font-weight:500; cursor:pointer; font-family:inherit; }
    .btn-register:hover { background:#1d5de0; }
    .btn-logout { padding:7px 18px; border:0.5px solid rgba(239,68,68,0.4); border-radius:7px; background:transparent; color:#fca5a5; font-size:13.5px; cursor:pointer; font-family:inherit; }
    .btn-logout:hover { background:rgba(239,68,68,0.1); border-color:#ef4444; color:#ef4444; }
    .nav-dashboard-btn { display:flex; align-items:center; gap:8px; text-decoration:none; color:white; padding:5px 12px; border:0.5px solid rgba(255,255,255,0.15); border-radius:20px; }
    .nav-dashboard-btn:hover { background:rgba(255,255,255,0.08); }
    .nav-avatar { width:26px; height:26px; border-radius:50%; background:#2d6ef7; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; }
    .nav-dashboard-btn span { font-size:13.5px; font-weight:500; }
    .hamburger { display:none; background:none; border:none; color:white; font-size:22px; cursor:pointer; }
    .mobile-menu { display:none; flex-direction:column; background:transparent; padding:1rem 2rem; border-bottom:0.5px solid rgba(255,255,255,0.08); }
    .mobile-menu a { color:rgba(255,255,255,0.75); font-size:15px; text-decoration:none; padding:10px 0; border-bottom:0.5px solid rgba(255,255,255,0.06); }
    .mobile-menu.open { display:flex; }
    @media (max-width:768px) {
      #shared-nav { padding:0 1.2rem; }
      .nav-links { display:none; }
      .hamburger { display:block; }
      .btn-login,.btn-register,.btn-logout,.nav-dashboard-btn { display:none; }
    }
  </style>`;

  if (!isHome) { document.write(navCSS + navHTML); }
  else { document.write(navHTML); }

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('hamburgerBtn');
    const menu = document.getElementById('mobileMenu');
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== btn) {
          menu.classList.remove('open');
        }
      });
    }
  });

})();

async function scriptoraLogout() {
  try {
    if (typeof supabase !== 'undefined') {
      const sb = supabase.createClient(
        'https://hivrmntxpmpwthmjtoem.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI'
      );
      await sb.auth.signOut();
    }
  } catch(e) {}
  ['scriptora_client_id','scriptora_name','scriptora_email','scriptora_role'].forEach(k => localStorage.removeItem(k));
  window.location.href = '../Homepage/index.html';
}
