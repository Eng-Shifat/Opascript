/* ================================
   SCRIPTORA — shared/navbar.js
   সব page-এ একই navbar inject করে
   ================================ */

(function () {

  // ── কোন page-এ আছি সেটা detect করো ──
  const path = window.location.pathname;
  const isHome     = path.includes('Homepage') || path.endsWith('index.html');
  const isLogin    = path.includes('Login');
  const isRegister = path.includes('Register');

  function pricingLink() {
    if (isHome) return '../Pricing page/pricing.html';
    return '../Pricing page/pricing.html';
  }

  // ── Home page থেকে relative path ──
  function homeLink(anchor) {
    if (isHome) return anchor || '#';
    return '../Homepage/index.html' + (anchor || '');
  }

  // ── Navbar HTML ──
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
      ${!isLogin    ? `<button class="btn-login"    onclick="window.location.href='../Login page/login.html'">Login</button>` : ''}
      ${!isRegister ? `<button class="btn-register" onclick="window.location.href='../Register page/register.html'">Register</button>` : ''}
      <button class="hamburger" id="hamburgerBtn">☰</button>
    </div>
  </nav>

  <!-- MOBILE MENU -->
  <div class="mobile-menu" id="mobileMenu">
    <a href="${homeLink('#services')}">Services</a>
    <a href="${pricingLink()}">Pricing</a>
    <a href="${homeLink('#samples')}">Samples</a>
    <a href="${homeLink('#reviews')}">Reviews</a>
    <a href="${homeLink('#faq')}">FAQ</a>
    <a href="${homeLink('#contact')}">Contact</a>
    <div style="display:flex;gap:10px;padding-top:6px;">
      ${!isLogin    ? `<button class="btn-login"    style="flex:1" onclick="window.location.href='../Login page/login.html'">Login</button>` : ''}
      ${!isRegister ? `<button class="btn-register" style="flex:1" onclick="window.location.href='../Register page/register.html'">Register</button>` : ''}
    </div>
  </div>`;

  // ── Navbar CSS (সব page-এ inject) ──
  const navCSS = `
  <style id="shared-nav-css">
    #shared-nav {
      background: #0a1428;
      padding: 0 2.5rem;
      height: 58px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.5px solid rgba(255,255,255,0.08);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .logo {
      display: flex; align-items: center; gap: 10px;
      font-weight: 600; font-size: 17px;
      color: white; text-decoration: none;
    }
    .logo-icon {
      width: 34px; height: 34px; border-radius: 8px;
      background: #2d6ef7;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px;
    }
    .nav-links {
      display: flex; gap: 1.75rem; align-items: center;
    }
    .nav-links a {
      color: rgba(255,255,255,0.7); font-size: 14px;
      text-decoration: none; transition: color 0.2s;
    }
    .nav-links a:hover { color: white; }
    .nav-btns { display: flex; gap: 10px; align-items: center; }
    .btn-login {
      padding: 7px 18px;
      border: 0.5px solid rgba(255,255,255,0.3);
      border-radius: 7px; background: transparent;
      color: white; font-size: 13.5px;
      cursor: pointer; transition: border-color 0.2s;
      font-family: inherit;
    }
    .btn-login:hover { border-color: rgba(255,255,255,0.65); }
    .btn-register {
      padding: 7px 18px; border: none;
      border-radius: 7px; background: #2d6ef7;
      color: white; font-size: 13.5px; font-weight: 500;
      cursor: pointer; transition: background 0.2s;
      font-family: inherit;
    }
    .btn-register:hover { background: #1d5de0; }
    .hamburger {
      display: none; background: none; border: none;
      color: white; font-size: 22px; cursor: pointer;
    }
    .mobile-menu {
      display: none; flex-direction: column;
      background: #0a1428; padding: 1rem 2rem;
      border-bottom: 0.5px solid rgba(255,255,255,0.08);
    }
    .mobile-menu a {
      color: rgba(255,255,255,0.75); font-size: 15px;
      text-decoration: none; padding: 10px 0;
      border-bottom: 0.5px solid rgba(255,255,255,0.06);
    }
    .mobile-menu.open { display: flex; }
    @media (max-width: 768px) {
      #shared-nav { padding: 0 1.2rem; }
      .nav-links { display: none; }
      .hamburger { display: block; }
      .btn-login { display: none; }
      .btn-register { display: none; }
    }
  </style>`;

  // ── DOM-এ inject করো ──
  // Homepage-এ style.css আছে, অন্য page-এ CSS inject করো
  if (!isHome) {
    document.write(navCSS + navHTML);
  } else {
    document.write(navHTML);
  }

  // ── Hamburger toggle ──
  document.addEventListener('DOMContentLoaded', function () {
    const btn  = document.getElementById('hamburgerBtn');
    const menu = document.getElementById('mobileMenu');
    if (btn && menu) {
      btn.addEventListener('click', function () {
        menu.classList.toggle('open');
      });
    }
  });

})();
