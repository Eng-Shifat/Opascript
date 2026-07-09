/* ═══════════════════════════════════════════════════════════
   SCRIPTORA — Client Dashboard Topbar & Notifications
   Depends on: dashboard.js (sb, currentUser, currentClient)
═══════════════════════════════════════════════════════════ */
'use strict';

/* ── Page title sync ──────────────────────────────────── */
const PAGE_TITLES = {
  home: 'Dashboard',
  orders: 'আমার Orders',
  messages: 'Messages',
  files: 'Files',
  payments: 'Payments',
  profile: 'Profile'
};

function cdUpdateTopbarTitle(page) {
  const el = document.getElementById('cdTopbarTitle');
  if (el) el.textContent = PAGE_TITLES[page] || 'Dashboard';
}

/* Hook into existing nav clicks */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sb-item[data-page]').forEach(link => {
    link.addEventListener('click', () => {
      cdUpdateTopbarTitle(link.dataset.page);
    });
  });
});

/* ── Avatar sync ──────────────────────────────────────── */
function cdSyncTopbarAvatar() {
  const topbarAv = document.getElementById('cdTopbarAvatar');
  if (!topbarAv) return;
  const sidebarAv = document.getElementById('sbAvatar');
  if (!sidebarAv) return;

  if (sidebarAv.querySelector('img')) {
    const img = sidebarAv.querySelector('img');
    topbarAv.innerHTML = `<img src="${img.src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  } else {
    topbarAv.textContent = sidebarAv.textContent;
  }
}

const _cdAvObserver = new MutationObserver(() => cdSyncTopbarAvatar());
document.addEventListener('DOMContentLoaded', () => {
  const av = document.getElementById('sbAvatar');
  if (av) _cdAvObserver.observe(av, { childList: true, subtree: true, characterData: true });
});

/* ── Notifications dropdown ───────────────────────────── */
let _cdNotifOpen = false;

window.cdToggleNotif = function() {
  _cdNotifOpen = !_cdNotifOpen;
  const dd = document.getElementById('cdNotifDropdown');
  if (dd) dd.classList.toggle('open', _cdNotifOpen);
  if (_cdNotifOpen) cdLoadNotifications();
};

/* Close when clicking outside */
document.addEventListener('click', (e) => {
  if (_cdNotifOpen && !e.target.closest('#cdNotifWrap')) {
    _cdNotifOpen = false;
    const dd = document.getElementById('cdNotifDropdown');
    if (dd) dd.classList.remove('open');
  }
});

/* Load notifications from Supabase */
async function cdLoadNotifications() {
  const list = document.getElementById('cdNotifList');
  if (!list) return;
  if (typeof sb === 'undefined' || !window.currentUser) return;

  list.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;font-size:13px;font-family:Sora,sans-serif;">Loading...</div>';

  try {
    /* Step 1: get all order ids for this client */
    const { data: orders, error: oErr } = await sb
      .from('orders')
      .select('id')
      .eq('client_id', window.currentUser.id);

    if (oErr) throw oErr;
    if (!orders || !orders.length) { cdRenderNotifEmpty(list); return; }

    const ids = orders.map(o => o.id);

    /* Step 2: fetch notifications matching those order ids */
    const { data: notifs, error: nErr } = await sb
      .from('client_notifications')
      .select('*')
      .in('order_id', ids)
      .order('created_at', { ascending: false })
      .limit(15);

    if (nErr) throw nErr;
    if (!notifs || !notifs.length) { cdRenderNotifEmpty(list); return; }

    cdRenderNotifications(list, notifs);
    cdUpdateNotifBadge(notifs);
  } catch(e) {
    console.warn('[Topbar] notif load error:', e);
    cdRenderNotifEmpty(list);
  }
}

function cdRenderNotifEmpty(list) {
  list.innerHTML = `
    <div class="cd-notif-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <p>কোনো notification নেই</p>
    </div>`;
}

function cdRenderNotifications(list, notifs) {
  const iconMap = {
    file_uploaded:    { cls: 'file',    icon: '📎' },
    status_change:    { cls: 'status',  icon: '✅' },
    message:          { cls: 'message', icon: '💬' },
    payment_approved: { cls: 'status',  icon: '💰' },
    payment_rejected: { cls: 'file',    icon: '❌' },
  };

  list.innerHTML = notifs.map(n => {
    const info = iconMap[n.type] || { cls: 'status', icon: '🔔' };
    const timeAgo = n.created_at ? cdTimeAgo(n.created_at) : '';
    const timeExact = n.created_at
      ? new Date(n.created_at).toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        })
      : '';
    return `
      <div class="cd-notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" onclick="cdNotifClick('${n.id}','${n.order_id || ''}','${n.type || ''}',this)">
        <div class="cd-notif-icon ${info.cls}">${info.icon}</div>
        <div class="cd-notif-content">
          <div class="cd-notif-msg">${_esc(n.message || '')}</div>
          <div class="cd-notif-time" title="${timeExact}">${timeAgo}${timeExact ? ' · ' + timeExact : ''}</div>
        </div>
      </div>`;
  }).join('');
}

function cdUpdateNotifBadge(notifs) {
  const unreadCount = notifs.filter(n => !n.is_read).length;
  const dot = document.getElementById('cdNotifDot');
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
}

window.cdMarkRead = async function(id, el) {
  if (typeof sb === 'undefined') return;
  el?.classList.remove('unread');
  try {
    await sb.from('client_notifications').update({ is_read: true }).eq('id', id);
    await cdCheckUnreadCount();
  } catch(e) {}
};

window.cdMarkAllRead = async function() {
  if (typeof sb === 'undefined' || !window.currentUser) return;
  try {
    const { data: orders } = await sb.from('orders').select('id').eq('client_id', window.currentUser.id);
    if (!orders?.length) return;
    const ids = orders.map(o => o.id);
    await sb.from('client_notifications').update({ is_read: true }).in('order_id', ids).eq('is_read', false);
    document.querySelectorAll('.cd-notif-item.unread').forEach(el => el.classList.remove('unread'));
    const dot = document.getElementById('cdNotifDot');
    if (dot) dot.style.display = 'none';
  } catch(e) {}
};

async function cdCheckUnreadCount() {
  if (typeof sb === 'undefined' || !window.currentUser) return;
  try {
    const { data: orders } = await sb.from('orders').select('id').eq('client_id', window.currentUser.id);
    if (!orders?.length) return;
    const ids = orders.map(o => o.id);
    const { count } = await sb
      .from('client_notifications')
      .select('id', { count: 'exact', head: true })
      .in('order_id', ids)
      .eq('is_read', false);
    const dot = document.getElementById('cdNotifDot');
    if (dot) dot.style.display = (count > 0) ? 'block' : 'none';
  } catch(e) {}
}

/* ── Realtime: new notifications ──────────────────────── */
function cdSetupNotifRealtime() {
  if (typeof sb === 'undefined' || !window.currentUser) return;
  sb.channel('cd-notifs-' + window.currentUser.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'client_notifications' },
      async (payload) => {
        /* Verify this notification belongs to current client's order */
        const { data: order } = await sb
          .from('orders')
          .select('client_id')
          .eq('id', payload.new.order_id)
          .single();

        if (order?.client_id !== window.currentUser.id) return;

        /* Show dot */
        const dot = document.getElementById('cdNotifDot');
        if (dot) dot.style.display = 'block';

        /* If dropdown is open, refresh it */
        if (_cdNotifOpen) cdLoadNotifications();
      })
    .subscribe();
}

/* ── Helpers ──────────────────────────────────────────── */
function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cdTimeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'এইমাত্র';
  if (m < 60) return `${m} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘণ্টা আগে`;
  return `${Math.floor(h / 24)} দিন আগে`;
}

/* ── Messages dropdown (topbar) ──────────────────────────────────────── */
let _cdMsgOpen = false;

window.cdToggleMsg = function() {
  _cdMsgOpen = !_cdMsgOpen;
  const dd = document.getElementById('cdMsgDropdown');
  if (dd) dd.classList.toggle('open', _cdMsgOpen);
  if (_cdMsgOpen) cdLoadMessagesDropdown();
};

window.cdCloseMsg = function() {
  _cdMsgOpen = false;
  document.getElementById('cdMsgDropdown')?.classList.remove('open');
};

document.addEventListener('click', (e) => {
  if (_cdMsgOpen && !e.target.closest('#cdMsgWrap')) {
    _cdMsgOpen = false;
    document.getElementById('cdMsgDropdown')?.classList.remove('open');
  }
});

async function cdLoadMessagesDropdown() {
  const list = document.getElementById('cdMsgList');
  if (!list) return;
  if (typeof sb === 'undefined' || !window.currentUser) return;

  list.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;font-size:13px;font-family:Sora,sans-serif;">Loading...</div>';

  try {
    const { data: orders, error: oErr } = await sb
      .from('orders')
      .select('id, title, service_type, order_number')
      .eq('client_id', window.currentUser.id);
    if (oErr) throw oErr;
    if (!orders || !orders.length) { cdRenderMsgEmpty(list); return; }

    const orderMap = {};
    orders.forEach(o => orderMap[o.id] = o);
    const ids = orders.map(o => o.id);

    const { data: msgs, error: mErr } = await sb
      .from('messages')
      .select('*')
      .in('order_id', ids)
      .eq('sender', 'admin')
      .order('created_at', { ascending: false })
      .limit(15);
    if (mErr) throw mErr;
    if (!msgs || !msgs.length) { cdRenderMsgEmpty(list); return; }

    cdRenderMsgList(list, msgs, orderMap);
    cdUpdateMsgBadge(msgs);
  } catch (e) {
    console.warn('[Topbar] messages load error:', e);
    cdRenderMsgEmpty(list);
  }
}

function cdRenderMsgEmpty(list) {
  list.innerHTML = `
    <div class="cd-notif-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p>কোনো message নেই</p>
    </div>`;
}

function cdRenderMsgList(list, msgs, orderMap) {
  list.innerHTML = msgs.map(m => {
    const order = orderMap[m.order_id];
    const title = order ? (order.title || order.service_type || 'Order') : 'Order';
    const preview = m.is_deleted ? '🚫 Message deleted'
      : (m.message || (m.message_type === 'file' ? '📄 File' : m.message_type === 'image' || m.message_type === 'payment_screenshot' ? '📷 Photo' : ''));
    const timeAgo = m.created_at ? cdTimeAgo(m.created_at) : '';
    const unread = m.status !== 'read';
    return `
      <div class="cd-notif-item ${unread ? 'unread' : ''}" data-order="${m.order_id}" onclick="cdMsgClick('${m.order_id}')">
        <div class="cd-notif-icon message">💬</div>
        <div class="cd-notif-content">
          <div class="cd-notif-msg"><strong>${_esc(title)}</strong> — ${_esc(preview)}</div>
          <div class="cd-notif-time">${timeAgo}</div>
        </div>
      </div>`;
  }).join('');
}

function cdUpdateMsgBadge(msgs) {
  const unreadCount = msgs.filter(m => m.status !== 'read').length;
  const dot = document.getElementById('cdMsgDot');
  if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
}

window.cdMsgClick = function(orderId) {
  cdCloseMsg();
  if (typeof showPage === 'function') showPage('messages');
  setTimeout(() => {
    const sel = document.getElementById('chatOrderSelect');
    if (sel) sel.value = orderId;
    if (window.chatModule && window.chatModule.loadChat) window.chatModule.loadChat(orderId);
  }, 150);
};

async function cdCheckMsgUnreadCount() {
  if (typeof sb === 'undefined' || !window.currentUser) return;
  try {
    const { data: orders } = await sb.from('orders').select('id').eq('client_id', window.currentUser.id);
    if (!orders?.length) return;
    const ids = orders.map(o => o.id);
    const { count } = await sb
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('order_id', ids)
      .eq('sender', 'admin')
      .neq('status', 'read');
    const dot = document.getElementById('cdMsgDot');
    if (dot) dot.style.display = (count > 0) ? 'block' : 'none';
  } catch (e) {}
}

function cdSetupMsgRealtime() {
  if (typeof sb === 'undefined' || !window.currentUser) return;
  sb.channel('cd-msgs-' + window.currentUser.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
      if (payload.new.sender !== 'admin') return;
      const { data: order } = await sb.from('orders').select('client_id').eq('id', payload.new.order_id).single();
      if (order?.client_id !== window.currentUser.id) return;
      const dot = document.getElementById('cdMsgDot');
      if (dot) dot.style.display = 'block';
      if (_cdMsgOpen) cdLoadMessagesDropdown();
    })
    .subscribe();
}

/* ── Notification click → navigate to the relevant page ─────────────────── */
window.cdNotifClick = function(id, orderId, type, el) {
  window.cdMarkRead(id, el);
  cdToggleNotif(); /* close dropdown */

  if (!orderId) return;
  if (type === 'message') {
    if (typeof showPage === 'function') showPage('messages');
    setTimeout(() => {
      const sel = document.getElementById('chatOrderSelect');
      if (sel) sel.value = orderId;
      if (window.chatModule && window.chatModule.loadChat) window.chatModule.loadChat(orderId);
    }, 150);
    return;
  }
  if (type === 'payment_approved' || type === 'payment_rejected') {
    if (typeof showPage === 'function') showPage('orders');
    if (typeof openOrderDetail === 'function') openOrderDetail(orderId);
    setTimeout(() => {
      document.getElementById('proofSubmitSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return;
  }
  /* file_uploaded, status_change, default */
  if (typeof showPage === 'function') showPage('orders');
  if (typeof openOrderDetail === 'function') openOrderDetail(orderId);
};

/* ── Init after auth ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const waitForUser = setInterval(() => {
    if (window.currentUser) {
      clearInterval(waitForUser);
      cdCheckUnreadCount();
      cdSetupNotifRealtime();
      cdCheckMsgUnreadCount();
      cdSetupMsgRealtime();
      setTimeout(cdSyncTopbarAvatar, 500);
    }
  }, 300);
});

/* ── User Menu Dropdown ───────────────────────────────────────────────────── */
let _cdUserMenuOpen = false;

window.cdToggleUserMenu = function() {
  _cdUserMenuOpen = !_cdUserMenuOpen;
  const menu = document.getElementById('cdUserMenu');
  if (_cdUserMenuOpen) {
    menu.classList.add('open');
    cdPopulateUserDropdown();
  } else {
    menu.classList.remove('open');
  }
};

function cdPopulateUserDropdown() {
  const user = window.currentUser;
  const client = window.currentClient;
  if (!user) return;

  const name = client?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const ddAvatar = document.getElementById('cdUserDdAvatar');
  const ddName   = document.getElementById('cdUserDdName');
  const ddEmail  = document.getElementById('cdUserDdEmail');

  if (ddAvatar) ddAvatar.textContent = initials;
  if (ddName)   ddName.textContent   = name;
  if (ddEmail)  ddEmail.textContent  = user.email || '';
}

window.cdUserMenuNav = function(page) {
  _cdUserMenuOpen = false;
  document.getElementById('cdUserMenu')?.classList.remove('open');
  if (page === 'home') {
    window.location.href = '../../index.html';
    return;
  }
  if (typeof showPage === 'function') showPage(page);
};

window.cdUserLogout = async function() {
  if (typeof window.logout === 'function') {
    await window.logout();
    return;
  }
  try {
    const client = window._sb || (typeof sb !== 'undefined' ? sb : null);
    if (client) await client.auth.signOut();
  } catch(e) {}
  ['scriptora_client_id','scriptora_name','scriptora_email','scriptora_role'].forEach(k => localStorage.removeItem(k));
  window.location.href = '../Login page/login.html';
};

/* Close dropdown when clicking outside */
document.addEventListener('click', (e) => {
  const menu = document.getElementById('cdUserMenu');
  if (menu && !menu.contains(e.target) && _cdUserMenuOpen) {
    _cdUserMenuOpen = false;
    menu.classList.remove('open');
  }
});
