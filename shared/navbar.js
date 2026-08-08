/*================================
   SCRIPTORA — shared/navbar.js
   ================================*/

(function () {

  const path       = window.location.pathname;
  const isHome     = path.includes('Homepage') || path.endsWith('index.html');
  const isLogin    = path.includes('Login');
  const isRegister = path.includes('Register');

  const clientName = localStorage.getItem('opascript_name') || '';
  const clientRole = localStorage.getItem('opascript_role') || '';
  const isLoggedIn = clientRole === 'client' || clientRole === 'admin';
  const initials   = clientName ? clientName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : 'U';
  const firstName  = clientName ? clientName.split(' ')[0] : '';

  function pricingLink() { return '../Pricing page/pricing.html'; }
  function homeLink(anchor) {
    if (isHome) return anchor || '#';
    return '../Homepage/index.html' + (anchor || '');
  }
  function logoPath() {
    if (isHome) return './assets/logo.png';
    return '../Homepage/assets/logo.png';
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
        <button class="dropdown-logout" onclick="opascriptLogout()">Logout</button>
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
      <img src="${logoPath()}" alt="Opascript" class="logo-img">
      Opascript
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
    #shared-nav { background:rgba(var(--bg-nav-rgb),1); backdrop-filter:blur(12px) saturate(180%); -webkit-backdrop-filter:blur(12px) saturate(180%); padding:0 2.5rem; height:55px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(var(--text-rgb),0.10); position:sticky; top:0; z-index:1000; transition:background 0.3s; isolation:isolate; will-change:transform; font-family:'Inter','Segoe UI','Kalpurush',sans-serif; }
    #shared-nav, #shared-nav * { font-family:'Inter','Segoe UI','Kalpurush',sans-serif; }
    .mobile-menu { font-family:'Inter','Segoe UI','Kalpurush',sans-serif; }
    [data-theme="light"] #shared-nav { background:rgba(var(--bg-nav-rgb),1); border-bottom:1px solid rgba(0,0,0,0.08); }
    .logo { display:flex; align-items:center; gap:0px; font-weight:700; font-size:20px; color:var(--text-main); text-decoration:none; height:100%; }
    .logo-img { height:calc(55px - 4px); width:auto; object-fit:contain; display:block; margin-right:-16px; }
    .nav-links { display:flex; gap:1.6rem; align-items:center; }
    .nav-links a { color:rgba(var(--text-rgb),0.7); font-size:14px; text-decoration:none; transition:color 0.2s; }
    .nav-links a:hover { color:var(--text-main); }
    .nav-btns { display:flex; gap:10px; align-items:center; }
    .btn-login { padding:7px 18px; border:0.5px solid rgba(var(--text-rgb),0.3); border-radius:7px; background:transparent; color:var(--text-main); font-size:13.5px; cursor:pointer; font-family:inherit; }
    .btn-login:hover { border-color:rgba(var(--text-rgb),0.65); }
    .btn-register { padding:7px 18px; border:none; border-radius:7px; background:var(--accent-color); color:var(--text-on-accent); font-size:13.5px; font-weight:500; cursor:pointer; font-family:inherit; }
    .btn-register:hover { background:var(--accent-hover); }
    .btn-logout { padding:7px 18px; border:0.5px solid rgba(var(--color-red-rgb),0.4); border-radius:7px; background:transparent; color:var(--color-red-light); font-size:13.5px; cursor:pointer; font-family:inherit; }
    .btn-logout:hover { background:rgba(var(--color-red-rgb),0.1); border-color:var(--color-red); color:var(--color-red); }
    .nav-dashboard-btn { display:flex; align-items:center; gap:8px; text-decoration:none; color:var(--text-main); padding:5px 14px 5px 6px; border:0.5px solid rgba(var(--text-rgb),0.15); border-radius:20px; background:transparent; cursor:pointer; font-family:inherit; }
    .nav-dashboard-btn:hover { background:rgba(var(--text-rgb),0.08); }
    .nav-avatar { width:26px; height:26px; border-radius:50%; background:var(--accent-color); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:var(--text-on-accent); }
    .nav-avatar-wrap { position:relative; display:flex; margin-right: 2px; }
    .nav-avatar-arrow { position:absolute; bottom:-3px; right:-3px; width:13px; height:13px; border-radius:50%; background:var(--bg-nav); border:1px solid rgba(var(--text-rgb),0.2); display:flex; align-items:center; justify-content:center; font-size:8px; line-height:1; color:rgba(var(--text-rgb),0.8); }
    .nav-dashboard-btn span { font-size:13.5px; font-weight:500; }
    .theme-toggle-btn { width:34px; height:34px; border-radius:50%; border:0.5px solid rgba(var(--text-rgb),0.15); background:rgba(var(--text-rgb),0.05); color:var(--text-main); font-size:15px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background 0.2s, border-color 0.2s, transform 0.25s; flex-shrink:0; }
    .theme-toggle-btn:hover { background:rgba(var(--text-rgb),0.1); border-color:rgba(var(--text-rgb),0.3); transform:rotate(15deg); }
    .profile-wrap { position:relative; }
    .profile-dropdown { display:none; flex-direction:column; position:absolute; top:calc(100% + 8px); right:0; background:var(--bg-dropdown); border:0.5px solid rgba(var(--text-rgb),0.1); border-radius:10px; min-width:150px; padding:6px; box-shadow:0 8px 24px rgba(var(--shadow-rgb),0.35); z-index:1001; }
    .profile-dropdown.open { display:flex; }
    .profile-dropdown a, .profile-dropdown button { color:rgba(var(--text-rgb),0.8); font-size:13.5px; text-decoration:none; padding:8px 10px; border-radius:6px; text-align:left; background:transparent; border:none; cursor:pointer; font-family:inherit; }
    .profile-dropdown a:hover, .profile-dropdown button:hover { background:rgba(var(--text-rgb),0.06); color:var(--text-main); }
    .dropdown-logout { color:var(--color-red-light) !important; }
    .dropdown-logout:hover { color:var(--color-red) !important; }
    .hamburger { display:none; background:none; border:none; color:var(--text-main); font-size:22px; cursor:pointer; }
    .mobile-menu { display:none; flex-direction:column; background:rgba(var(--bg-main-rgb),0.08); backdrop-filter:blur(32px) saturate(180%); -webkit-backdrop-filter:blur(32px) saturate(180%); padding:1rem 2rem; border-bottom:0.5px solid rgba(var(--text-rgb),0.07); border-top:0.5px solid rgba(var(--text-rgb),0.04); position:fixed; top:55px; left:0; right:0; z-index:99; box-shadow:0 12px 48px rgba(var(--shadow-rgb),0.15); }
    .mobile-menu a { color:rgba(var(--text-rgb),0.75); font-size:15px; text-decoration:none; padding:10px 0; border-bottom:0.5px solid rgba(var(--text-rgb),0.06); }
    .mobile-menu.open { display:flex; }
    @media (max-width:768px) {
      #shared-nav { padding:0 1rem 0 0; }
      .nav-links { display:none; }
      .hamburger { display:block; }
      .logo { font-size:15px; gap:0; padding-left:0; margin-left:0; }
      .logo-img { height:46px; width:auto; margin-right:-15px; margin-left:2px; }
      .theme-toggle-btn { display:none; }
      .btn-login { padding:5px 10px; font-size:12px; }
      .btn-register { padding:5px 10px; font-size:12px; }
      .nav-dashboard-btn { padding:4px; border:none; }
      .nav-dashboard-btn span { display:none; }
    }
  </style>`;

  document.write(navCSS + navHTML);

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

async function opascriptLogout() {
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
