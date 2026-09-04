/* ═══════════════════════════════════════════════════════════
   SCRIPTORA — Admin Topbar with Realtime Notifications
   topbar.js

   Usage:
   <script src="js/topbar.js" data-title="Page Title" data-sub=""></script>
═══════════════════════════════════════════════════════════ */

(function () {

  const scriptTag  = document.currentScript;
  const PAGE_TITLE = scriptTag?.getAttribute('data-title') || 'Admin Panel';
  const PAGE_SUB   = scriptTag?.getAttribute('data-sub')   || '';

  /* ── Topbar HTML ── */
  const TOPBAR_HTML = `
  <header class="topbar" id="adminTopbar">
    <button class="icon-btn menu-btn" onclick="toggleGlobalSidebar()">☰</button>
    <div class="topbar-title">
      <h1 id="topbarPageTitle">${PAGE_TITLE}</h1>
      <p  id="topbarPageSub">${PAGE_SUB}</p>
    </div>

    <div class="search-box" id="topbarSearchWrap">
      <i class="ti ti-search search-icon"></i>
      <input type="text" id="topbarSearchInput" placeholder="Search orders, clients…" oninput="topbarHandleSearch(this.value)">
    </div>

    <div class="topbar-actions">

      <!-- NOTIFICATION BELL -->
      <div class="icon-btn tb-btn" id="topbarNotifBtn" onclick="topbarToggle('topbar-notif-panel', event)">
        <i class="ti ti-bell"></i>
        <span class="tb-dot" id="topbarNotifDot" style="display:none"></span>
      </div>

      <!-- MESSAGE -->
      <div class="icon-btn tb-btn" id="topbarMsgBtn" onclick="topbarToggle('topbar-msg-panel', event)">
        <i class="ti ti-mail"></i>
        <span class="tb-dot" id="topbarMsgDot" style="display:none"></span>
      </div>

      <!-- AVATAR -->
      <div class="topbar-avatar" id="topbarAvatar" onclick="topbarToggle('topbar-profile-panel', event)">SA</div>
    </div>

    <!-- ── NOTIFICATION PANEL ── -->
    <div class="dropdown-panel" id="topbar-notif-panel">
      <div class="dp-header">
        <span class="dp-title">Notifications</span>
        <span class="dp-badge" id="topbarNotifBadge" style="display:none">0</span>
        <span class="dp-clear" onclick="topbarMarkNotifsRead()">Mark all read</span>
      </div>
      <div class="dp-list" id="topbarNotifList">
        <div class="dp-empty">Loading…</div>
      </div>
    </div>

    <!-- ── MESSAGE PANEL ── -->
    <div class="dropdown-panel" id="topbar-msg-panel">
      <div class="dp-header">
        <span class="dp-title">Messages</span>
        <span class="dp-badge" id="topbarMsgBadge" style="display:none">0</span>
      </div>
      <div class="dp-list" id="topbarMsgList">
        <div class="dp-empty">Loading…</div>
      </div>
      <div class="dp-footer" onclick="window.location.href='admin-messages.html'" style="cursor:pointer">View all messages →</div>
    </div>

    <!-- ── PROFILE PANEL ── -->
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

  /* ══════════════════════════════════════
     IN-MEMORY STORE — panels সবসময় থাকবে
  ══════════════════════════════════════ */
  const store = {
    notifs: [],   /* { id, icon, color, text, sub, time, read, onclick } */
    msgs:   [],   /* { orderId, name, preview, time, count, read } */
  };

  /* ── DB-persisted notifications ─────────────────────────
     admin_notifications table এ save/fetch করা হয়
     যেকোনো device থেকে login করলেও সব notification পাবে
  ══════════════════════════════════════ */
  const NOTIF_MAX = 50;

  async function _saveNotifToDB(notif) {
    const sb = window.scriptoraSupabase;
    if (!sb) return;
    try {
      await sb.from('admin_notifications').upsert({
        id:       notif.id,
        icon:     notif.icon,
        color:    notif.color,
        text:     notif.text,
        sub:      notif.sub    || null,
        time:     notif.time   || new Date().toISOString(),
        read:     notif.read   || false,
        onclick:  notif.onclick|| null,
        type:     notif.type   || null,
        order_id: notif.orderId|| null,
      }, { onConflict: 'id' });
    } catch (e) { console.error('notif save error', e); }
  }

  async function _markAllReadInDB() {
    const sb = window.scriptoraSupabase;
    if (!sb) return;
    try {
      await sb.from('admin_notifications').update({ read: true }).eq('read', false);
    } catch (e) { console.error('notif mark read error', e); }
  }

  /* ── Inject HTML ── */
  document.addEventListener('DOMContentLoaded', function () {
    const main = document.querySelector('.main');
    if (!main) return;
    main.insertAdjacentHTML('afterbegin', TOPBAR_HTML);

    /* Auto subtitle */
    if (!PAGE_SUB) {
      const sub = document.getElementById('topbarPageSub');
      if (sub) {
        const now = new Date();
        sub.textContent = now.toLocaleDateString('en-BD', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }) + ' · Welcome, Super Admin!';
      }
    }

    /* Outside click → close panels (panels data থাকে, শুধু hide হয়) */
    document.addEventListener('click', function () {
      document.querySelectorAll('#adminTopbar .dropdown-panel').forEach(p => p.classList.remove('open'));
    });

    /* Init after supabase ready */
    setTimeout(_topbarInit, 800);
  });

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  async function _topbarInit() {
    const sb = window.scriptoraSupabase;
    if (!sb) return;

    /* Admin session */
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        const email    = session.user.email;
        const initials = email.substring(0, 2).toUpperCase();
        _setEl('topbarProfileEmail', email);
        _setEl('topbarProfileAvatar', initials);
        _setEl('topbarAvatar', initials);

        /* Realtime websocket-এ JWT explicitly attach করা — RLS policy
           (auth.email() = ...) কাজ করার জন্য এটা দরকার */
        if (session.access_token && sb.realtime?.setAuth) {
          sb.realtime.setAuth(session.access_token);
        }
      }
    } catch (e) {}

    /* Initial load */
    await _fetchNotifs();
    await _fetchMsgs();

    /* ── Realtime Subscriptions ── */
    _subscribeRealtime(sb);
  }

  /* ══════════════════════════════════════
     REALTIME — সব change subscribe করা
  ══════════════════════════════════════ */
  function _subscribeRealtime(sb) {

    /* orders table — INSERT / UPDATE */
    sb.channel('topbar-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const o = payload.new;
        /* Client name fetch */
        let clientName = '';
        try {
          if (o.client_id) {
            const { data: cl } = await sb.from('clients').select('name,email').eq('id', o.client_id).single();
            if (cl) clientName = cl.name || cl.email || '';
          }
          if (!clientName) {
            const lines = (o.special_instructions || '').split('\n');
            const nl = lines.find(l => l.startsWith('Name:'));
            if (nl) clientName = nl.replace('Name:', '').trim();
          }
        } catch (_) {}
        _addNotif({
          id:      'order-new-' + o.id,
          icon:    'ti-file-plus',
          color:   'dp-green',
          text:    `নতুন order এসেছে`,
          sub:     (clientName ? clientName + ' — ' : '') + (o.title || o.order_number || 'New Order'),
          time:    new Date().toISOString(),
          onclick: `window.location.href='order-management.html?highlight=${o.id}'`,
          orderId: o.id,
          type:    'new_order',
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, async (payload) => {
        const o   = payload.new;
        const old = payload.old;

        /* ── Client name helper ── */
        let clientName = '';
        try {
          if (o.client_id) {
            const { data: cl } = await sb.from('clients').select('name,email').eq('id', o.client_id).single();
            if (cl) clientName = cl.name || cl.email || '';
          }
          if (!clientName) {
            const lines = (o.special_instructions || '').split('\n');
            const nl = lines.find(l => l.startsWith('Name:'));
            if (nl) clientName = nl.replace('Name:', '').trim();
          }
        } catch (_) {}
        const oNum = o.order_number || o.id?.slice(0, 8) || '';
        const orderPage = `order-management.html?order=${o.id}`;

        /* ── Payment proof submitted ── */
        if (o.payment_status === 'under_review' && old.payment_status !== 'under_review') {
          _addNotif({
            id:      'payment-proof-' + o.id,
            icon:    'ti-receipt',
            color:   'dp-purple',
            text:    `Payment proof জমা দেওয়া হয়েছে`,
            sub:     (clientName || oNum) + (o.title ? ' — ' + o.title : ''),
            time:    new Date().toISOString(),
            onclick: `window.location.href='${orderPage}&tab=payment'`,
            orderId: o.id,
            type:    'payment_proof',
          });
        }

        /* ── Payment approved/confirmed ── */
        if ((o.payment_status === 'approved' || o.payment_status === 'confirmed') &&
             old.payment_status !== o.payment_status) {
          _addNotif({
            id:      'payment-confirm-' + o.id + '-' + Date.now(),
            icon:    'ti-circle-check',
            color:   'dp-green',
            text:    `Payment confirm হয়েছে`,
            sub:     (clientName || oNum) + (o.total_price ? ' — ৳' + Number(o.total_price).toLocaleString() : ''),
            time:    new Date().toISOString(),
            onclick: `window.location.href='${orderPage}&tab=payment'`,
            orderId: o.id,
            type:    'payment_confirmed',
          });
        }

        /* ── Status change — semantic icon per status ── */
        if (o.status !== old.status) {
          const statusMeta = {
            writing:     { icon: 'ti-pencil',        color: 'dp-blue',   label: 'লেখা শুরু হয়েছে' },
            draft_ready: { icon: 'ti-file-check',    color: 'dp-green',  label: 'Draft ready — review করুন' },
            in_review:   { icon: 'ti-eye',           color: 'dp-purple', label: 'Client review করছেন' },
            revision:    { icon: 'ti-edit',          color: 'dp-orange', label: 'Revision চাওয়া হয়েছে' },
            completed:   { icon: 'ti-check',         color: 'dp-green',  label: 'Order completed' },
            overdue:     { icon: 'ti-alert-triangle',color: 'dp-red',    label: 'Deadline পার হয়ে গেছে!' },
            hold:        { icon: 'ti-pause',         color: 'dp-gray',   label: 'Order hold করা হয়েছে' },
            confirmed:   { icon: 'ti-circle-check',  color: 'dp-green',  label: 'Order confirmed' },
            pending:     { icon: 'ti-clock',         color: 'dp-yellow', label: 'Order pending' },
          };
          const sm = statusMeta[o.status] || { icon: 'ti-refresh', color: 'dp-blue', label: o.status };
          _addNotif({
            id:      'status-' + o.id + '-' + o.status,
            icon:    sm.icon,
            color:   sm.color,
            text:    sm.label,
            sub:     (clientName || oNum) + (o.title ? ' — ' + o.title : ''),
            time:    new Date().toISOString(),
            onclick: `window.location.href='${orderPage}'`,
            orderId: o.id,
            type:    'status_change',
          });
        }

        /* ── Revision requested ── */
        if (o.revision_requested && !old.revision_requested) {
          _addNotif({
            id:      'revision-' + o.id,
            icon:    'ti-edit',
            color:   'dp-orange',
            text:    `Revision request এসেছে`,
            sub:     (clientName || oNum) + (o.title ? ' — ' + o.title : ''),
            time:    new Date().toISOString(),
            onclick: `window.location.href='${orderPage}'`,
            orderId: o.id,
            type:    'revision',
          });
        }

        /* ── Rating submitted ── */
        if (o.rating && !old.rating) {
          const stars = '★'.repeat(o.rating) + '☆'.repeat(5 - o.rating);
          _addNotif({
            id:      'rating-' + o.id,
            icon:    'ti-star',
            color:   'dp-yellow',
            text:    `${clientName || 'Client'} রেটিং দিয়েছেন`,
            sub:     stars + ' (' + o.rating + '/5) — ' + (oNum || o.title || ''),
            time:    new Date().toISOString(),
            onclick: `window.location.href='${orderPage}'`,
            orderId: o.id,
            type:    'rating',
          });
        }
      })
      .subscribe((status, err) => {
        console.log('[Realtime] topbar-orders status:', status, err || '');
      });

    /* messages table — INSERT */
    sb.channel('topbar-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const m = payload.new;
        if (m.from_admin) return; /* admin নিজে পাঠালে notification দরকার নেই */

        /* Store এ add */
        const existing = store.msgs.find(x => x.orderId === m.order_id);
        if (existing) {
          existing.count++;
          existing.preview = m.text;
          existing.time    = m.sent_at || new Date().toISOString();
          existing.read    = false;
          _renderMsgPanel();
          _updateMsgBadge();
        } else {
          /* Client name fetch করো */
          let clientName = 'Client';
          let orderTitle = '';
          try {
            const { data: ord } = await sb.from('orders')
              .select('client_id, title, special_instructions, order_number')
              .eq('id', m.order_id).single();
            if (ord) {
              orderTitle = ord.title || ord.order_number || '';
              if (ord.client_id) {
                const { data: cl } = await sb.from('clients')
                  .select('name,email').eq('id', ord.client_id).single();
                if (cl) clientName = cl.name || cl.email || 'Client';
              }
              if (clientName === 'Client') {
                const lines = (ord.special_instructions || '').split('\n');
                const nl = lines.find(l => l.startsWith('Name:'));
                if (nl) clientName = nl.replace('Name:', '').trim();
              }
            }
          } catch (_) {}
          store.msgs.unshift({
            orderId:    m.order_id,
            name:       clientName,
            orderTitle: orderTitle,
            preview:    m.text || '—',
            time:       m.sent_at || new Date().toISOString(),
            count:      1,
            read:       false,
          });
          _renderMsgPanel();
          _updateMsgBadge();
          /* Notification panel এও add করো */
          _addNotif({
            id:      'msg-' + m.id + '-' + Date.now(),
            icon:    'ti-message',
            color:   'dp-blue',
            text:    `${clientName} message পাঠিয়েছেন`,
            sub:     (m.text || '').slice(0, 55) + ((m.text||'').length > 55 ? '…' : ''),
            time:    m.sent_at || new Date().toISOString(),
            onclick: `window.location.href='admin-messages.html?order=${m.order_id}'`,
            orderId: m.order_id,
            type:    'message',
          });
        }
      })
      .subscribe((status, err) => {
        console.log('[Realtime] topbar-messages status:', status, err || '');
      });

    /* files table — INSERT (file upload) */
    sb.channel('topbar-files')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_file_access' }, async (payload) => {
        const f = payload.new;
        if (f.uploaded_by === 'admin') return;
        _addNotif({
          id:      'file-' + f.id,
          icon:    'ti-file-upload',
          color:   'dp-blue',
          text:    'Client নতুন file upload করেছেন',
          sub:     f.file_name || 'File',
          time:    new Date().toISOString(),
          onclick: `window.location.href='order-management.html?order=${f.order_id || ''}&tab=files'`,
          orderId: f.order_id,
          type:    'file_upload',
        });
      })
      .subscribe((status, err) => {
        console.log('[Realtime] topbar-files status:', status, err || '');
      });
  }

  /* ══════════════════════════════════════
     FETCH — initial load
  ══════════════════════════════════════ */
  async function _fetchNotifs() {
    const sb = window.scriptoraSupabase;
    if (!sb) return;
    const fresh = [];

    try {
      /* ── DB থেকে saved notifications (সব device এ পাবে) ── */
      const { data: saved } = await sb
        .from('admin_notifications')
        .select('*')
        .order('time', { ascending: false })
        .limit(NOTIF_MAX);

      (saved || []).forEach(n => {
        /* icon ও color DB থেকে না পেলে type দিয়ে derive করো */
        const typeIconMap = {
          new_order:        { icon: 'ti-file-plus',    color: 'dp-green'  },
          payment_proof:    { icon: 'ti-receipt',      color: 'dp-purple' },
          payment_confirmed:{ icon: 'ti-circle-check', color: 'dp-green'  },
          status_change:    { icon: 'ti-refresh',      color: 'dp-blue'   },
          revision:         { icon: 'ti-edit',         color: 'dp-orange' },
          rating:           { icon: 'ti-star',         color: 'dp-yellow' },
          message:          { icon: 'ti-message',      color: 'dp-blue'   },
          file_upload:      { icon: 'ti-file-upload',  color: 'dp-blue'   },
        };
        const tm = typeIconMap[n.type] || {};
        fresh.push({
          id:      n.id,
          icon:    n.icon  || tm.icon  || 'ti-bell',
          color:   n.color || tm.color || 'dp-blue',
          text:    n.text,
          sub:     n.sub,
          time:    n.time,
          read:    n.read,
          onclick: n.onclick,
          orderId: n.order_id || n.orderId,
          type:    n.type,
        });
      });

      /* ── DB query: payment proof pending (fresh state) ── */
      const { data: proofOrders } = await sb
        .from('orders')
        .select('id, title, order_number, updated_at, client_id')
        .eq('payment_status', 'under_review')
        .order('updated_at', { ascending: false })
        .limit(10);

      (proofOrders || []).forEach(o => {
        const id = 'payment-proof-' + o.id;
        if (!fresh.find(n => n.id === id)) {
          fresh.push({
            id, icon: 'ti-receipt', color: 'dp-purple',
            text:    'Payment proof review pending',
            sub:     o.title || o.order_number || o.id.slice(0, 8),
            time:    o.updated_at, read: false,
            onclick: `window.location.href='order-management.html?order=${o.id}&tab=payment'`,
            orderId: o.id,
            type:    'payment_proof',
          });
        }
      });

      /* ── DB query: overdue orders ── */
      const { data: overdueOrders } = await sb
        .from('orders')
        .select('id, title, deadline')
        .eq('status', 'overdue')
        .limit(5);

      (overdueOrders || []).forEach(o => {
        const id = 'overdue-' + o.id;
        if (!fresh.find(n => n.id === id)) {
          fresh.push({
            id, icon: 'ti-alert-triangle', color: 'dp-red',
            text:    'Deadline পার হয়ে গেছে!',
            sub:     o.title || 'Order',
            time:    o.deadline, read: false,
            onclick: `window.location.href='order-management.html?order=${o.id}'`,
            orderId: o.id,
            type:    'overdue',
          });
        }
      });

      fresh.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      store.notifs = fresh.slice(0, NOTIF_MAX);

    } catch (e) { console.error('notif fetch error', e); }

    _renderNotifPanel();
    _updateNotifBadge();
  }

  async function _fetchMsgs() {
    const sb = window.scriptoraSupabase;
    if (!sb) return;
    store.msgs = [];

    try {
      const { data: unread } = await sb
        .from('messages')
        .select('order_id, text, sent_at')
        .eq('from_admin', false)
        .eq('read', false)
        .order('sent_at', { ascending: false });

      if (!unread?.length) { _renderMsgPanel(); _updateMsgBadge(); return; }

      /* Group by order */
      const grouped = {};
      unread.forEach(m => {
        if (!grouped[m.order_id]) grouped[m.order_id] = { latest: m, count: 0 };
        grouped[m.order_id].count++;
        if (new Date(m.sent_at) > new Date(grouped[m.order_id].latest.sent_at))
          grouped[m.order_id].latest = m;
      });

      const orderIds = Object.keys(grouped);
      const { data: ordersData } = await sb.from('orders').select('id, title, client_id').in('id', orderIds);
      const orderMap = {};
      (ordersData || []).forEach(o => { orderMap[o.id] = o; });

      const clientIds = [...new Set((ordersData||[]).map(o => o.client_id).filter(Boolean))];
      let clientMap = {};
      if (clientIds.length) {
        const { data: clients } = await sb.from('clients').select('id,name,email').in('id', clientIds);
        (clients||[]).forEach(c => { clientMap[c.id] = c; });
      }

      orderIds.forEach(oid => {
        const o = orderMap[oid] || {};
        const c = clientMap[o.client_id] || {};
        store.msgs.push({
          orderId: oid,
          name:    c.name || c.email || 'Client',
          preview: grouped[oid].latest.text || '—',
          time:    grouped[oid].latest.sent_at,
          count:   grouped[oid].count,
          read:    false,
        });
      });

      store.msgs.sort((a, b) => new Date(b.time) - new Date(a.time));

    } catch (e) { console.error('msg fetch error', e); }

    _renderMsgPanel();
    _updateMsgBadge();
  }

  /* ══════════════════════════════════════
     RENDER — store থেকে panel update
  ══════════════════════════════════════ */
  function _renderNotifPanel() {
    const list = document.getElementById('topbarNotifList');
    if (!list) return;

    if (!store.notifs.length) {
      list.innerHTML = '<div class="dp-empty">কোনো notification নেই</div>';
      return;
    }

    list.innerHTML = store.notifs.slice(0, 20).map(item => {
      const safeOnclick = item.onclick
        ? item.onclick.replace(/"/g, '&quot;')
        : '';
      return `
      <div class="dp-item ${item.read ? '' : 'unread'}" onclick="${safeOnclick}" style="cursor:${item.onclick ? 'pointer' : 'default'}">
        <div class="dp-icon ${item.color || 'dp-blue'}"><i class="ti ${item.icon || 'ti-bell'}"></i></div>
        <div class="dp-body">
          <div class="dp-text">${_esc(item.text)}</div>
          ${item.sub ? `<div class="dp-sub">${_esc(item.sub)}</div>` : ''}
          <div class="dp-time">${_relTime(item.time)}</div>
        </div>
      </div>`;
    }).join('');
  }

  function _renderMsgPanel() {
    const list = document.getElementById('topbarMsgList');
    if (!list) return;

    if (!store.msgs.length) {
      list.innerHTML = '<div class="dp-empty">কোনো নতুন message নেই</div>';
      return;
    }

    list.innerHTML = store.msgs.slice(0, 6).map(r => `
      <div class="dp-item ${r.read ? '' : 'unread'}" onclick="window.location.href='admin-messages.html?order=${r.orderId}'" style="cursor:pointer">
        <div class="dp-avatar dp-av-purple">${_esc(r.name).substring(0, 2).toUpperCase()}</div>
        <div class="dp-body">
          <div class="dp-text">
            <b>${_esc(r.name)}</b>
            ${r.count > 1 ? `<span class="dp-count">${r.count}</span>` : ''}
          </div>
          <div class="dp-sub">${_esc((r.preview||'').substring(0, 55))}${(r.preview||'').length > 55 ? '…' : ''}</div>
          <div class="dp-time">${_relTime(r.time)}</div>
        </div>
      </div>`).join('');
  }

  /* ══════════════════════════════════════
     BADGE UPDATE
  ══════════════════════════════════════ */
  function _updateNotifBadge() {
    const unread = store.notifs.filter(n => !n.read).length;
    const dot    = document.getElementById('topbarNotifDot');
    const badge  = document.getElementById('topbarNotifBadge');
    if (dot)   dot.style.display   = unread ? '' : 'none';
    if (badge) { badge.textContent = unread; badge.style.display = unread ? '' : 'none'; }
  }

  function _updateMsgBadge() {
    const unread = store.msgs.filter(m => !m.read).length;
    const total  = store.msgs.reduce((s, m) => s + (m.read ? 0 : m.count), 0);
    const dot    = document.getElementById('topbarMsgDot');
    const badge  = document.getElementById('topbarMsgBadge');
    if (dot)   dot.style.display   = unread ? '' : 'none';
    if (badge) { badge.textContent = total || unread; badge.style.display = unread ? '' : 'none'; }
  }

  /* ══════════════════════════════════════
     ADD NOTIF (realtime থেকে)
  ══════════════════════════════════════ */
  function _addNotif(notif) {
    if (store.notifs.find(n => n.id === notif.id)) return;
    store.notifs.unshift(notif);
    if (store.notifs.length > NOTIF_MAX) store.notifs.length = NOTIF_MAX;
    _saveNotifToDB(notif); /* DB তে persist করো */
    _renderNotifPanel();
    _updateNotifBadge();
  }

  /* ══════════════════════════════════════
     TOAST
  ══════════════════════════════════════ */
  function _toast(msg) {
    let wrap = document.getElementById('topbar-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'topbar-toast-wrap';
      wrap.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.style.cssText = 'background:#1e2540;border:1px solid rgba(255,255,255,0.1);color:#fff;padding:12px 18px;border-radius:12px;font-size:13px;box-shadow:0 4px 24px rgba(0,0,0,0.4);animation:tbSlideIn 0.3s ease;white-space:nowrap;';
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  /* ══════════════════════════════════════
     MARK ALL READ
  ══════════════════════════════════════ */
  window.topbarMarkNotifsRead = function () {
    store.notifs.forEach(n => { n.read = true; });
    _markAllReadInDB(); /* DB তে read = true করো */
    _renderNotifPanel();
    _updateNotifBadge();
  };

  /* ══════════════════════════════════════
     DROPDOWN TOGGLE — panel data থাকে, শুধু hide/show
  ══════════════════════════════════════ */
  window.topbarToggle = function (id, e) {
    e?.stopPropagation();
    const panel  = document.getElementById(id);
    if (!panel) return;
    const isOpen = panel.classList.contains('open');
    document.querySelectorAll('#adminTopbar .dropdown-panel').forEach(p => p.classList.remove('open'));
    if (!isOpen) panel.classList.add('open');
  };

  /* ══════════════════════════════════════
     SEARCH
  ══════════════════════════════════════ */
  window.topbarHandleSearch = function (val) {
    if (typeof window.handleSearch === 'function') window.handleSearch(val);
  };

  window.topbarGoTo = function (page) {
    const map = { profile: 'admin-profile.html', settings: 'admin-settings.html', help: '#' };
    if (map[page]) window.location.href = map[page];
  };

  /* ══════════════════════════════════════
     HELPERS
  ══════════════════════════════════════ */
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _relTime(iso) {
    if (!iso) return '';
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1)   return 'এখনই';
    if (m < 60)  return m + ' min ago';
    const h = Math.floor(m / 60);
    if (h < 24)  return h + 'h ago';
    const d = Math.floor(h / 24);
    return d === 1 ? 'Yesterday' : d + ' days ago';
  }

  function _setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

})();
