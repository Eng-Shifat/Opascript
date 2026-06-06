/* ═══════════════════════════════════════
   SCRIPTORA — Shared Sidebar (sidebar.js)
   
   Usage: Add to any page:
   <link rel="stylesheet" href="css/sidebar.css">
   <script src="js/sidebar.js" data-page="dashboard"></script>
═══════════════════════════════════════ */

(function () {
  // ── 1. Inject sidebar CSS & Tabler icons if not already loaded
  function loadCSS(href) {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = href;
      document.head.appendChild(link);
    }
  }
  loadCSS('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css');
  loadCSS('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
  loadCSS('css/sidebar.css');

  // ── 2. Determine current page
  const scriptTag   = document.currentScript;
  const currentPage = scriptTag ? scriptTag.getAttribute('data-page') : detectPage();

  function detectPage() {
    const path = window.location.pathname;
    if (path.includes('order-management')) return 'orders';
    if (path.includes('admin'))            return 'dashboard';
    if (path.includes('client'))           return 'clients';
    if (path.includes('payment'))          return 'payments';
    if (path.includes('file'))             return 'files';
    if (path.includes('setting'))          return 'settings';
    return 'dashboard';
  }

  // ── 3. Sidebar HTML
  const sidebarHTML = `
  <aside class="s-sidebar" id="globalSidebar">
    <div class="s-logo">
      <div class="s-logo-icon">S</div>
      <div class="s-logo-text">
        <strong>Scriptora</strong>
        <span>Admin Panel</span>
      </div>
    </div>

    <div class="s-nav">
      <div class="s-nav-label">Main Menu</div>
      <a class="s-nav-item" href="admin.html" data-page="dashboard">
        <i class="ti ti-layout-dashboard"></i> Dashboard Overview
      </a>
      <a class="s-nav-item" href="order-management.html" data-page="orders">
        <i class="ti ti-clipboard-list"></i> Orders Management
        <span class="s-badge">5</span>
      </a>
      <a class="s-nav-item" href="#" data-page="clients">
        <i class="ti ti-users"></i> Client List
      </a>
      <a class="s-nav-item" href="#" data-page="payments">
        <i class="ti ti-credit-card"></i> Payments &amp; Billing
        <span class="s-badge">3</span>
      </a>
      <a class="s-nav-item" href="#" data-page="files">
        <i class="ti ti-folder"></i> File Manager
      </a>

      <div class="s-nav-label">System</div>
      <a class="s-nav-item" href="#" data-page="settings">
        <i class="ti ti-settings"></i> Settings
      </a>
      <a class="s-nav-item" href="#" data-page="help">
        <i class="ti ti-help-circle"></i> Help &amp; Support
      </a>
    </div>

    <div class="s-footer">
      <div class="s-admin-card">
        <div class="s-avatar">SA</div>
        <div class="s-admin-info">
          <strong>Super Admin</strong>
          <span>admin@scriptora.com</span>
        </div>
        <span class="s-dots">⋯</span>
      </div>
    </div>
  </aside>
  <div class="s-overlay" id="sidebarOverlay" onclick="toggleGlobalSidebar()"></div>
  `;

  // ── 4. Inject into body
  document.addEventListener('DOMContentLoaded', function () {
    // Insert sidebar at start of body
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // Set active item
    document.querySelectorAll('.s-nav-item[data-page]').forEach(item => {
      if (item.getAttribute('data-page') === currentPage) {
        item.classList.add('active');
      }
    });

    // Push main content right on desktop only
    const main = document.querySelector('.main');
    function updateMargin() {
      if (main) {
        main.style.marginLeft = window.innerWidth > 768 ? '260px' : '0';
      }
    }
    updateMargin();
    window.addEventListener('resize', updateMargin);
  });

  // ── 5. Toggle sidebar (mobile)
  window.toggleGlobalSidebar = function () {
    const sidebar  = document.getElementById('globalSidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  };

})();
