/* ═══════════════════════════════════════════════════════════
   SCRIPTORA — Shared Admin Topbar (topbar.js)

   Usage:
   <script src="js/topbar.js" data-title="Page Title" data-sub="Subtitle"></script>

   sidebar.js এর আগে অথবা পরে রাখা যাবে।
   সব function globally available থাকবে।
═══════════════════════════════════════════════════════════ */

(function () {

  const scriptTag = document.currentScript;
  const PAGE_TITLE = scriptTag?.getAttribute('data-title') || 'Admin Panel';
  const PAGE_SUB   = scriptTag?.getAttribute('data-sub')   || '';

  /* ── Topbar HTML ── */
  const TOPBAR_HTML = `
  <header class="topbar" id="adminTopbar">
    <button class="icon-btn menu-btn" onclick="toggleGlobalSidebar()">☰</button>
    <div class="topbar-title">
      <h1 id="topbarPageTitle">${PAGE_TITLE}</h1>
      <p id="topbarPageSub">${PAGE_SUB}</p>
    </div>

    <div class="search-box" id="topbarSearchWrap">
      <i class="ti ti-search search-icon"></i>
      <input type="text" id="topbarSearchInput" placeholder="Search orders, clients…" oninput="topbarHandleSearch(this.value)">
    </div>

    <div class="topbar-actions">
      <div class="icon-btn" id="topbarNotifBtn" onclick="topbarToggle('topbar-notif-panel', event)">
        <i class="ti ti-bell"></i>
        <span class="dot" id="topbarNotifDot" style="display:none"></span>
      </div>
      <div class="icon-btn" id="topbarMsgBtn" onclick="topbarToggle('topbar-msg-panel', event)">
        <i class="ti ti-mail"></i>
        <span class="dot" id="topbarMsgDot" style="display:none"></span>
      </div>
      <div class="topbar-avatar" id="topbarAvatar" onclick="topbarToggle('topbar-profile-panel', event)">SA</div>
    </div>

    <!-- NOTIFICATION PANEL -->
    <div class="dropdown-panel" id="topbar-notif-panel">
      <div class="dp-header">
        <span class="dp-title">Notifications</span>
        <span class="dp-badge" id="topbarNotifBadge" style="display:none">0</span>
      </div>
      <div class="dp-list" id="topbarNotifList">
        <div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#6b7280;font-size:.82rem;text-align:center;padding:8px 0">Loading…</div></div></div>
      </div>
      <div class="dp-footer" onclick="topbarMarkNotifsRead()" style="cursor:pointer">Mark all as read</div>
    </div>

    <!-- MESSAGE PANEL -->
    <div class="dropdown-panel" id="topbar-msg-panel">
      <div class="dp-header">
        <span class="dp-title">Messages</span>
        <span class="dp-badge" id="topbarMsgBadge" style="display:none">0</span>
      </div>
      <div class="dp-list" id="topbarMsgList">
        <div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#6b7280;font-size:.82rem;text-align:center;padding:8px 0">Loading…</div></div></div>
      </div>
      <div class="dp-footer" onclick="window.location.href='admin-messages.html'" style="cursor:pointer">View all messages</div>
    </div>

    <!-- PROFILE PANEL -->
    <div class="dropdown-panel" id="topbar-profile-panel">
      <div class="dp-profile-head">
        <div class="dp-profile-avatar" id="topbarProfileAvatar">SA</div>
        <div>
          <div class="dp-profile-name">Super Admin</div>
          <div class="dp-profile-email" id="topbarProfileEmail">loading…</div>
        </div>
      </div>
      <div class="dp-divider"></div>
      <div class="dp-menu-item" onclick="topbarGoTo('profile')"><i class="ti ti-user"></i> My Profile</div>
      <div class="dp-menu-item" onclick="topbarGoTo('settings')"><i class="ti ti-settings"></i> Settings</div>
      <div class="dp-menu-item" onclick="topbarGoTo('help')"><i class="ti ti-help-circle"></i> Help &amp; Support</div>
      <div class="dp-divider"></div>
      <div class="dp-menu-item logout" onclick="handleAdminLogout()"><i class="ti ti-logout"></i> Logout</div>
    </div>
  </header>`;

  /* ── Inject on DOMContentLoaded ── */
  document.addEventListener('DOMContentLoaded', function () {
    const main = document.querySelector('.main');
    if (!main) return;
    main.insertAdjacentHTML('afterbegin', TOPBAR_HTML);

    /* Auto date/time subtitle */
    if (!PAGE_SUB) {
      const sub = document.getElementById('topbarPageSub');
      if (sub) {
        const now = new Date();
        const d = now.toLocaleDateString('bn-BD', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        sub.textContent = d + ' · স্বাগতম, Super Admin!';
      }
    }

    /* Outside click → close all dropdowns */
    document.addEventListener('click', function () {
      document.querySelectorAll('#adminTopbar .dropdown-panel').forEach(p => p.classList.remove('open'));
    });

    /* Load data after sidebar auth check */
    setTimeout(_topbarInit, 700);
  });

  /* ── Init (after Supabase session ready) ── */
  async function _topbarInit() {
    const sb = window.scriptoraSupabase;
    if (!sb) return;

    /* Admin email */
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        const email    = session.user.email;
        const initials = email.substring(0, 2).toUpperCase();
        _setEl('topbarProfileEmail', email);
        _setEl('topbarProfileAvatar', initials);
        _setEl('topbarAvatar', initials);
      }
    } catch(e) {}

    /* Load badges */
    await _loadMsgBadge();
    await _loadNotifBadge();
  }

  /* ══════════════════════════════════════
     MESSAGES
  ══════════════════════════════════════ */
  async function _loadMsgBadge() {
    const sb = window.scriptoraSupabase;
    if (!sb) return;
    try {
      const { count } = await sb
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('from_admin', false)
        .eq('read', false);

      const dot   = document.getElementById('topbarMsgDot');
      const badge = document.getElementById('topbarMsgBadge');
      if (count > 0) {
        if (dot)   { dot.style.display = ''; }
        if (badge) { badge.textContent = count; badge.style.display = ''; }
      }
    } catch(e) {}
  }

  async function _loadMsgPanel() {
    const sb   = window.scriptoraSupabase;
    const list  = document.getElementById('topbarMsgList');
    const badge = document.getElementById('topbarMsgBadge');
    const dot   = document.getElementById('topbarMsgDot');
    if (!sb || !list) return;

    list.innerHTML = '<div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#6b7280;font-size:.82rem;text-align:center;padding:8px 0">Loading…</div></div></div>';

    try {
      const { data: unread } = await sb
        .from('messages')
        .select('order_id, text, sent_at')
        .eq('from_admin', false)
        .eq('read', false)
        .order('sent_at', { ascending: false });

      if (!unread || !unread.length) {
        list.innerHTML = '<div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#6b7280;font-size:.82rem;text-align:center;padding:8px 0">কোনো নতুন message নেই</div></div></div>';
        if (badge) badge.style.display = 'none';
        if (dot)   dot.style.display   = 'none';
        return;
      }

      /* Group by order */
      const grouped = {};
      unread.forEach(m => {
        if (!grouped[m.order_id]) grouped[m.order_id] = { latest: m, count: 0 };
        grouped[m.order_id].count++;
        if (new Date(m.sent_at) > new Date(grouped[m.order_id].latest.sent_at)) grouped[m.order_id].latest = m;
      });
      const orderIds = Object.keys(grouped);

      /* Fetch order + client info */
      const { data: ordersData } = await sb.from('orders').select('id, title, client_id').in('id', orderIds);
      const orderMap = {};
      (ordersData || []).forEach(o => { orderMap[o.id] = o; });

      const clientIds = [...new Set((ordersData||[]).map(o=>o.client_id).filter(Boolean))];
      let clientMap = {};
      if (clientIds.length) {
        const { data: clients } = await sb.from('clients').select('id,name,email').in('id', clientIds);
        (clients||[]).forEach(c => { clientMap[c.id] = c; });
      }

      const rows = orderIds.map(oid => {
        const o = orderMap[oid] || {};
        const c = clientMap[o.client_id] || {};
        return {
          orderId: oid,
          name:    c.name || c.email || 'Client',
          title:   o.title || 'Order',
          preview: grouped[oid].latest.text || '—',
          time:    grouped[oid].latest.sent_at,
          count:   grouped[oid].count,
        };
      }).sort((a,b) => new Date(b.time) - new Date(a.time));

      list.innerHTML = rows.slice(0,6).map(r => `
        <div class="dp-item unread" onclick="window.location.href='admin-messages.html?order=${r.orderId}'" style="cursor:pointer">
          <div class="dp-avatar dp-av-purple">${_esc(r.name).substring(0,2).toUpperCase()}</div>
          <div class="dp-body">
            <div class="dp-text"><b>${_esc(r.name)}</b>${r.count > 1 ? ` <span style="font-size:.7rem;background:#6366f1;color:#fff;padding:1px 6px;border-radius:20px;margin-left:4px">${r.count}</span>` : ''}</div>
            <div class="dp-sub">${_esc(r.preview.substring(0,50))}${r.preview.length>50?'…':''}</div>
            <div class="dp-time">${_relTime(r.time)}</div>
          </div>
        </div>`).join('');

      const total = rows.reduce((s,r)=>s+r.count, 0);
      if (badge) { badge.textContent = total + ' new'; badge.style.display = ''; }
      if (dot)   dot.style.display = '';

    } catch(e) {
      list.innerHTML = '<div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#f87171;font-size:.82rem">Load করা যায়নি</div></div></div>';
    }
  }

  /* ══════════════════════════════════════
     NOTIFICATIONS (orders থেকে)
  ══════════════════════════════════════ */
  async function _loadNotifBadge() {
    const sb = window.scriptoraSupabase;
    if (!sb) return;
    try {
      /* নতুন pending orders count */
      const { count } = await sb
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'under_review');

      const dot   = document.getElementById('topbarNotifDot');
      const badge = document.getElementById('topbarNotifBadge');
      if (count > 0) {
        if (dot)   dot.style.display = '';
        if (badge) { badge.textContent = count; badge.style.display = ''; }
      }
    } catch(e) {}
  }

  async function _loadNotifPanel() {
    const sb   = window.scriptoraSupabase;
    const list  = document.getElementById('topbarNotifList');
    const badge = document.getElementById('topbarNotifBadge');
    const dot   = document.getElementById('topbarNotifDot');
    if (!sb || !list) return;

    list.innerHTML = '<div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#6b7280;font-size:.82rem;text-align:center;padding:8px 0">Loading…</div></div></div>';

    try {
      const items = [];

      /* 1. Payment proof submitted — under_review */
      const { data: proofOrders } = await sb
        .from('orders')
        .select('id, title, order_number, order_date, client_id')
        .eq('payment_status', 'under_review')
        .order('order_date', { ascending: false })
        .limit(5);

      if (proofOrders?.length) {
        /* client names */
        const cIds = [...new Set(proofOrders.map(o=>o.client_id).filter(Boolean))];
        let cMap = {};
        if (cIds.length) {
          const { data: cl } = await sb.from('clients').select('id,name,email').in('id', cIds);
          (cl||[]).forEach(c => { cMap[c.id] = c; });
        }
        proofOrders.forEach(o => {
          const c = cMap[o.client_id] || {};
          items.push({
            icon: 'ti-cash',
            color: 'dp-purple',
            text: `<b>${_esc(c.name||'Client')}</b> payment proof পাঠিয়েছেন`,
            sub: _esc(o.title||'Order'),
            time: o.order_date,
            onclick: `window.location.href='order-management.html'`,
          });
        });
      }

      /* 2. Overdue orders */
      const { data: overdueOrders } = await sb
        .from('orders')
        .select('id, title, deadline')
        .eq('status', 'overdue')
        .limit(3);

      (overdueOrders||[]).forEach(o => {
        items.push({
          icon: 'ti-alert-circle',
          color: 'dp-red',
          text: `Order <b>${_esc(o.title||'')}</b> overdue`,
          sub: o.deadline ? 'Deadline: ' + new Date(o.deadline).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '',
          time: o.deadline,
          onclick: `window.location.href='order-management.html'`,
        });
      });

      /* 3. Newly confirmed orders */
      const { data: newOrders } = await sb
        .from('orders')
        .select('id, title, order_date')
        .eq('status', 'confirmed')
        .order('order_date', { ascending: false })
        .limit(3);

      (newOrders||[]).forEach(o => {
        items.push({
          icon: 'ti-check',
          color: 'dp-green',
          text: `নতুন order confirm: <b>${_esc(o.title||'Order')}</b>`,
          sub: '',
          time: o.order_date,
          onclick: `window.location.href='order-management.html'`,
        });
      });

      if (!items.length) {
        list.innerHTML = '<div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#6b7280;font-size:.82rem;text-align:center;padding:8px 0">কোনো notification নেই</div></div></div>';
        if (badge) badge.style.display = 'none';
        if (dot)   dot.style.display   = 'none';
        return;
      }

      /* Sort by time desc */
      items.sort((a,b) => new Date(b.time||0) - new Date(a.time||0));

      list.innerHTML = items.slice(0,6).map(item => `
        <div class="dp-item unread" onclick="${item.onclick}" style="cursor:pointer">
          <div class="dp-icon ${item.color}"><i class="ti ${item.icon}"></i></div>
          <div class="dp-body">
            <div class="dp-text">${item.text}</div>
            ${item.sub ? `<div class="dp-sub">${item.sub}</div>` : ''}
            <div class="dp-time">${_relTime(item.time)}</div>
          </div>
        </div>`).join('');

      if (badge) { badge.textContent = items.length; badge.style.display = ''; }
      if (dot)   dot.style.display = '';

    } catch(e) {
      list.innerHTML = '<div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#f87171;font-size:.82rem">Load করা যায়নি</div></div></div>';
    }
  }

  /* ══════════════════════════════════════
     MARK ALL NOTIFS READ
  ══════════════════════════════════════ */
  window.topbarMarkNotifsRead = function () {
    const dot   = document.getElementById('topbarNotifDot');
    const badge = document.getElementById('topbarNotifBadge');
    const list  = document.getElementById('topbarNotifList');
    if (dot)   dot.style.display   = 'none';
    if (badge) badge.style.display = 'none';
    if (list)  list.innerHTML = '<div class="dp-item"><div class="dp-body"><div class="dp-text" style="color:#6b7280;font-size:.82rem;text-align:center;padding:8px 0">কোনো notification নেই</div></div></div>';
  };

  /* ══════════════════════════════════════
     DROPDOWN TOGGLE
  ══════════════════════════════════════ */
  window.topbarToggle = function (id, e) {
    e?.stopPropagation();
    const panel  = document.getElementById(id);
    if (!panel) return;
    const isOpen = panel.classList.contains('open');
    document.querySelectorAll('#adminTopbar .dropdown-panel').forEach(p => p.classList.remove('open'));
    if (!isOpen) {
      panel.classList.add('open');
      /* Load fresh data when opened */
      if (id === 'topbar-msg-panel')   _loadMsgPanel();
      if (id === 'topbar-notif-panel') _loadNotifPanel();
    }
  };

  /* ══════════════════════════════════════
     SEARCH (page specific function call করে)
  ══════════════════════════════════════ */
  window.topbarHandleSearch = function (val) {
    /* page এ handleSearch() থাকলে call করো */
    if (typeof window.handleSearch === 'function') window.handleSearch(val);
  };

  /* ══════════════════════════════════════
     NAVIGATE
  ══════════════════════════════════════ */
  window.topbarGoTo = function (page) {
    const map = { profile: '#', settings: '#', help: '#' };
    if (map[page]) window.location.href = map[page];
  };

  /* ══════════════════════════════════════
     HELPERS
  ══════════════════════════════════════ */
  function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _relTime(iso) {
    if (!iso) return '';
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1)  return 'এখনই';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' hours ago';
    const d = Math.floor(h / 24);
    return d === 1 ? 'গতকাল' : d + ' days ago';
  }

  function _setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

})();
