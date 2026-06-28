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
      <div class="cd-notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}" onclick="cdMarkRead('${n.id}',this)">
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

/* ── Init after auth ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const waitForUser = setInterval(() => {
    if (window.currentUser) {
      clearInterval(waitForUser);
      cdCheckUnreadCount();
      cdSetupNotifRealtime();
      setTimeout(cdSyncTopbarAvatar, 500);
    }
  }, 300);
});
