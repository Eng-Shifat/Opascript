/*================================
   SCRIPTORA — shared/navbar.js
   ================================*/

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
    <div class="profile-wrap" id="profileWrap">
      <button class="nav-dashboard-btn" id="profileBtn">
        <div class="nav-avatar-wrap">
          <div class="nav-avatar">${initials}</div>
          <span class="nav-avatar-arrow">▾</span>
        </div>
        <span>${firstName}</span>
      </button>
      <div class="profile-dropdown" id="profileDropdown">
        <a href="${dashboardLink()}">Dashboard</a>
        <a href="${dashboardLink()}">Profile</a>
        <button class="dropdown-logout" onclick="scriptoraLogout()">Logout</button>
      </div>
    </div>
  ` : `
    ${!isLogin    ? `<button class="btn-login"    onclick="window.location.href='../Login page/login.html'">Login</button>` : ''}
    ${!isRegister ? `<button class="btn-register" onclick="window.location.href='../Register page/register.html'">Register</button>` : ''}
  `;

  const mobileAuthButtons = '';

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
      <button class="theme-toggle-btn" id="theme-toggle" title="থিম পরিবর্তন করুন" aria-label="থিম পরিবর্তন করুন">☀️</button>
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
    #shared-nav { background:rgba(10,20,40,0.35); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); padding:0 2.5rem; height:58px; display:flex; align-items:center; justify-content:space-between; border-bottom:0.5px solid rgba(255,255,255,0.08); position:sticky; top:0; z-index:1000; }
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
    .nav-dashboard-btn { display:flex; align-items:center; gap:8px; text-decoration:none; color:white; padding:5px 12px; border:0.5px solid rgba(255,255,255,0.15); border-radius:20px; background:transparent; cursor:pointer; font-family:inherit; }
    .nav-dashboard-btn:hover { background:rgba(255,255,255,0.08); }
    .nav-avatar { width:26px; height:26px; border-radius:50%; background:#2d6ef7; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; }
    .nav-avatar-wrap { position:relative; display:flex; }
    .nav-avatar-arrow { position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; border-radius:50%; background:rgba(10,20,40,0.6); border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:9px; line-height:1; color:rgba(255,255,255,0.8); }
    .nav-dashboard-btn span { font-size:13.5px; font-weight:500; }
    .theme-toggle-btn { width:34px; height:34px; border-radius:50%; border:0.5px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.05); color:white; font-size:15px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background 0.2s, border-color 0.2s, transform 0.25s; flex-shrink:0; }
    .theme-toggle-btn:hover { background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.3); transform:rotate(15deg); }
    .profile-wrap { position:relative; }
    .profile-dropdown { display:none; flex-direction:column; position:absolute; top:calc(100% + 8px); right:0; background:#0f1a33; border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; min-width:150px; padding:6px; box-shadow:0 8px 24px rgba(0,0,0,0.35); z-index:1001; }
    .profile-dropdown.open { display:flex; }
    .profile-dropdown a, .profile-dropdown button { color:rgba(255,255,255,0.8); font-size:13.5px; text-decoration:none; padding:8px 10px; border-radius:6px; text-align:left; background:transparent; border:none; cursor:pointer; font-family:inherit; }
    .profile-dropdown a:hover, .profile-dropdown button:hover { background:rgba(255,255,255,0.06); color:white; }
    .dropdown-logout { color:#fca5a5 !important; }
    .dropdown-logout:hover { color:#ef4444 !important; }
    .hamburger { display:none; background:none; border:none; color:white; font-size:22px; cursor:pointer; }
    .mobile-menu { display:none; flex-direction:column; background:rgba(5,10,25,0.08); backdrop-filter:blur(32px) saturate(180%); -webkit-backdrop-filter:blur(32px) saturate(180%); padding:1rem 2rem; border-bottom:0.5px solid rgba(255,255,255,0.07); border-top:0.5px solid rgba(255,255,255,0.04); position:fixed; top:58px; left:0; right:0; z-index:99; box-shadow:0 12px 48px rgba(0,0,0,0.15); }
    .mobile-menu a { color:rgba(255,255,255,0.75); font-size:15px; text-decoration:none; padding:10px 0; border-bottom:0.5px solid rgba(255,255,255,0.06); }
    .mobile-menu.open { display:flex; }
    @media (max-width:768px) {
      #shared-nav { padding:0 1.2rem; }
      .nav-links { display:none; }
      .hamburger { display:block; }
      .btn-login, .btn-register { padding:6px 12px; font-size:12.5px; }
      .nav-dashboard-btn { padding:4px; border:none; }
      .nav-dashboard-btn span { display:none; }
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

    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (profileDropdown.classList.contains('open') && !profileDropdown.contains(e.target) && e.target !== profileBtn) {
          profileDropdown.classList.remove('open');
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
      await sb.auth.signOut({ scope: 'local' });
    }
  } catch(e) { console.error('Logout error:', e); }
  localStorage.clear();
  window.location.href = '../Homepage/index.html';
}
