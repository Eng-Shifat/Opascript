/* ═══════════════════════════════════════
   SCRIPTORA — Shared Sidebar (sidebar.js)
   
   Usage: Add to any page:
   <link rel="stylesheet" href="css/sidebar.css">
   <script src="js/sidebar.js" data-page="dashboard"></script>

   SECURITY: এই ফাইল প্রতিটা admin page-এ একবার লোড হওয়ার সাথে সাথেই
   চেক করে যে real logged-in Supabase user-এর email admin email কিনা।
   না হলে সাথে সাথে redirect করে দেয় — তাই admin.html, admin-messages.html,
   order-management.html ইত্যাদি কোনো পেজই non-admin কেউ সরাসরি URL
   টাইপ করে খুলতে পারবে না।
═══════════════════════════════════════ */

(function () {
  /* ⚠️ একমাত্র admin email — পরিবর্তন লাগলে এখানেই করুন */
  const ADMIN_EMAIL = 'yeasinkabirshifat@gmail.com';

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

  const scriptTag   = document.currentScript;
  const currentPage = scriptTag ? scriptTag.getAttribute('data-page') : detectPage();

  function detectPage() {
    const path = window.location.pathname;
    if (path.includes('order-management')) return 'orders';
    if (path.includes('website-chats'))    return 'website-chats';
    if (path.includes('messages'))         return 'messages';
    if (path.includes('admin'))            return 'dashboard';
    if (path.includes('client'))           return 'clients';
    if (path.includes('payment'))          return 'payments';
    if (path.includes('file'))             return 'files';
    if (path.includes('setting'))          return 'settings';
    if (path.includes('services'))         return 'services';
    return 'dashboard';
  }

  const sidebarHTML = `
  <aside class="s-sidebar" id="globalSidebar">
    <a class="s-logo" href="../Homepage/index.html">
      <div class="s-logo-icon">O</div>
      <div class="s-logo-text">
        <strong>Opascript</strong>
        <span>Admin Panel</span>
      </div>
    </a>

    <div class="s-nav">
      <div class="s-nav-label">Main Menu</div>
      <a class="s-nav-item" href="admin.html" data-page="dashboard" data-tooltip="Dashboard Overview">
        <i class="ti ti-layout-dashboard"></i><span class="s-nav-item-label">Dashboard Overview</span>
      </a>
      <a class="s-nav-item" href="order-management.html" data-page="orders" data-tooltip="Orders Management">
        <i class="ti ti-clipboard-list"></i><span class="s-nav-item-label">Orders Management</span>
        <span class="s-badge" id="ordersBadge" style="display:none">0</span>
      </a>
      <a class="s-nav-item" href="admin-messages.html" data-page="messages" data-tooltip="Messages">
        <i class="ti ti-message"></i><span class="s-nav-item-label">Messages</span>
        
      </a>
      <a class="s-nav-item" href="admin-website-chats.html" data-page="website-chats" data-tooltip="Website Chats">
        <i class="ti ti-brand-hipchat"></i><span class="s-nav-item-label">Website Chats</span>
        <span class="s-badge" id="sidebarWcBadge" style="display:none">0</span>
      </a>
      <a class="s-nav-item" href="admin-clients.html" data-page="clients" data-tooltip="Client List">
        <i class="ti ti-users"></i><span class="s-nav-item-label">Client List</span>
      </a>
      <a class="s-nav-item" href="admin-payments.html" data-page="payments" data-tooltip="Payments &amp; Billing">
        <i class="ti ti-credit-card"></i><span class="s-nav-item-label">Payments &amp; Billing</span>
        <span class="s-badge" id="payBadge" style="display:none">0</span>
      </a>
      <a class="s-nav-item" href="admin-files.html" data-page="files" data-tooltip="File Manager">
        <i class="ti ti-folder"></i><span class="s-nav-item-label">File Manager</span>
      </a>

      <a class="s-nav-item" href="admin-services.html" data-page="services" data-tooltip="Service Management">
        <i class="ti ti-toggle-right"></i><span class="s-nav-item-label">Service Management</span>
      </a>

      <div class="s-nav-label">System</div>
      <a class="s-nav-item" href="admin-settings.html" data-page="settings" data-tooltip="Settings">
        <i class="ti ti-settings"></i><span class="s-nav-item-label">Settings</span>
      </a>
      <a class="s-nav-item" href="admin-settings.html" data-page="help" data-tooltip="Help &amp; Support">
        <i class="ti ti-help-circle"></i><span class="s-nav-item-label">Help &amp; Support</span>
      </a>
    </div>
  </aside>
  <div class="s-overlay" id="sidebarOverlay" onclick="toggleGlobalSidebar()"></div>
  `;

  /* ── SECURITY GUARD ─────────────────────────────────────────────────
     এই page render হওয়ার আগেই চেক হয়: সত্যিই login করা আছে কিনা,
     এবং login করা email-টা admin email এর সাথে মিলে কিনা।
  ─────────────────────────────────────────────────────────────────── */
  async function verifyAdminAccess() {
    try {
      if (!window.scriptoraSupabase) {
        window.location.href = '../Login Page/login.html';
        return null;
      }
      const sb = window.scriptoraSupabase;
      const { data: { session } } = await sb.auth.getSession();

      if (!session) {
        window.location.href = '../Login Page/login.html';
        return null;
      }
      const user = session.user;
      if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        /* Valid login কিন্তু admin না — client dashboard এ পাঠিয়ে দিন */
        window.location.href = '../Client Dashboard/dashboard.html';
        return null;
      }
      return user;
    } catch (e) {
      window.location.href = '../Login Page/login.html';
      return null;
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const adminUser = await verifyAdminAccess();
    if (!adminUser) return; /* redirect হয়ে গেছে, আর কিছু render করার দরকার নেই */

    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    document.querySelectorAll('.s-nav-item[data-page]').forEach(item => {
      if (item.getAttribute('data-page') === currentPage) {
        item.classList.add('active');
      }
    });

    /* আসল logged-in admin email দেখান (topbar profile panel) */
    document.querySelectorAll('.dp-profile-email').forEach(el => {
      el.textContent = adminUser.email;
    });

    /* পুরনো hamburger button সরিয়ে দিন — sidebar-এর নিজস্ব fixed
       "Scriptora" লোগো-ই এখন একমাত্র ব্র্যান্ডিং, আলাদা topbar logo লাগবে না */
    function removeOldMenuButtons() {
      const btns = document.querySelectorAll(
        '.menu-btn, .topbar-menu-btn, [onclick*="toggleSidebar"], [onclick*="toggleGlobalSidebar"]'
      );
      btns.forEach(btn => btn.remove());
      return btns.length;
    }
    const removedCount = removeOldMenuButtons();
    if (removedCount === 0) {
      console.warn('[Scriptora sidebar.js] পুরনো hamburger button খুঁজে পাওয়া যায়নি — HTML-এ class/selector মিলছে কিনা চেক করুন।');
    }

    const main = document.querySelector('.main');
    function updateMargin() {
      if (main) {
        main.style.marginLeft = window.innerWidth > 768 ? '64px' : '0';
      }
    }
    updateMargin();
    window.addEventListener('resize', updateMargin);

    /* Check unread messages badge */
    loadUnreadBadge();
    loadWebsiteChatBadge();
    if (window.scriptoraSupabase) setupAdminPresence(window.scriptoraSupabase);
  });

  /* Unread message count for sidebar badge */
  async function loadUnreadBadge() {
    try {
      if (!window.scriptoraSupabase) return;
      const sb = window.scriptoraSupabase;

      const { count } = await sb
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('from_admin', false)
        .eq('read', false);

      const badge = document.getElementById('sidebarMsgBadge');
      if (badge && count > 0) {
        badge.textContent = count;
        badge.style.display = '';
      }
    } catch(e) { /* silently ignore */ }
  }

  /* Unread website-chat lead count for sidebar badge
     (কোনো lead-এর latest message যদি visitor-এর হয় এবং admin এখনো
     reply না করে থাকে, সেটা unread ধরা হয়) */
  async function loadWebsiteChatBadge() {
    try {
      if (!window.scriptoraSupabase) return;
      const sb = window.scriptoraSupabase;

      const { data: leads } = await sb.from('website_chat_leads').select('id').eq('status', 'open');
      if (!leads || !leads.length) return;

      const { data: msgs } = await sb
        .from('website_chat_messages')
        .select('lead_id, sender, created_at')
        .order('created_at', { ascending: false });

      const latestByLead = {};
      (msgs || []).forEach(m => { if (!latestByLead[m.lead_id]) latestByLead[m.lead_id] = m; });

      const leadIds = new Set(leads.map(l => l.id));
      const unreadCount = Object.entries(latestByLead)
        .filter(([leadId, m]) => leadIds.has(leadId) && m.sender === 'visitor').length;

      const badge = document.getElementById('sidebarWcBadge');
      if (badge && unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = '';
      }
    } catch (e) { /* silently ignore */ }
  }

  window.toggleGlobalSidebar = function () {
    const sidebar = document.getElementById('globalSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  };

  window.handleAdminLogout = async function () {
    try {
      if (window.scriptoraSupabase) {
        /* broadcast offline before sign out */
        if (window._adminPresenceChannel) {
          await window._adminPresenceChannel.untrack();
        }
        await window.scriptoraSupabase.auth.signOut();
      }
    } catch(e) {}
    window.location.href = '../Login Page/login.html';
  };

  /* ── Admin Presence Broadcast ──────────────────────────── */
  function setupAdminPresence(sb) {
    const ch = sb.channel('scriptora-admin-presence', {
      config: { presence: { key: 'admin' } }
    });

    ch.on('presence', { event: 'sync' }, () => {})
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ online: true, ts: Date.now() });
        }
      });

    window._adminPresenceChannel = ch;

    /* broadcast offline on tab close/hide */
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        await ch.track({ online: false, ts: Date.now() });
      } else {
        await ch.track({ online: true, ts: Date.now() });
      }
    });
  }

})();
