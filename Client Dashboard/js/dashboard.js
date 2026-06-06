/* ================================================
   SCRIPTORA — dashboard.js  (Supabase version)
   ================================================
   - Login check + auto redirect
   - Real user info from localStorage + Supabase
   - Real orders from Supabase (realtime)
   - Dynamic order cards with live countdown
   - Logout clears Supabase session
   ================================================ */

// ── Supabase Config ─────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://hivrmntxpmpwthmjtoem.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);


// ════════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════════
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function pad(n) { return String(n).padStart(2, '0'); }

function getInitials(name) {
  return (name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { label:'Payment Pending', cls:'pending',   dot:true  },
  confirmed:   { label:'Confirmed',       cls:'confirmed', dot:false },
  in_progress: { label:'Writing চলছে',   cls:'writing',   dot:true  },
  review:      { label:'Review এ আছে',   cls:'review',    dot:false },
  delivered:   { label:'Delivered',       cls:'done',      dot:false },
  completed:   { label:'Completed',       cls:'done',      dot:false },
  cancelled:   { label:'Cancelled',       cls:'cancelled', dot:false },
};

// ── Deadline urgency ───────────────────────────────────────────────────────
function getUrgencyClass(deadlineStr) {
  if (!deadlineStr) return 'safe';
  const days = Math.ceil((new Date(deadlineStr) - new Date()) / 86400000);
  if (days < 0)  return 'overdue';
  if (days <= 2) return 'urgent';
  if (days <= 7) return 'warning';
  return 'safe';
}
function urgencyColor(cls) {
  return { urgent:'#f87171', warning:'#fbbf24', safe:'#4ade80', overdue:'#ef4444' }[cls] || '#4ade80';
}


// ════════════════════════════════════════════════════════════════
//  Countdown Timer
// ════════════════════════════════════════════════════════════════
const countdownIntervals = {};

function startCountdown(deadlineStr, orderId) {
  if (!deadlineStr) return;
  const target = new Date(deadlineStr);
  target.setHours(23, 59, 59, 0);

  if (countdownIntervals[orderId]) clearInterval(countdownIntervals[orderId]);

  countdownIntervals[orderId] = setInterval(() => {
    const diff = target - new Date();
    const dEl  = document.getElementById(`cd-${orderId}-d`);
    const hEl  = document.getElementById(`cd-${orderId}-h`);
    const mEl  = document.getElementById(`cd-${orderId}-m`);
    const sEl  = document.getElementById(`cd-${orderId}-s`);
    if (!dEl) { clearInterval(countdownIntervals[orderId]); return; }

    if (diff <= 0) {
      [dEl,hEl,mEl,sEl].forEach(el => { if(el) el.textContent = '00'; });
      clearInterval(countdownIntervals[orderId]);
      return;
    }
    if (dEl) dEl.textContent = pad(Math.floor(diff / 86400000));
    if (hEl) hEl.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    if (mEl) mEl.textContent = pad(Math.floor((diff % 3600000)  / 60000));
    if (sEl) sEl.textContent = pad(Math.floor((diff % 60000)    / 1000));
  }, 1000);
}


// ════════════════════════════════════════════════════════════════
//  Render Order Cards
// ════════════════════════════════════════════════════════════════
function renderOrders(orders) {
  const activeSection    = document.getElementById('activeOrdersSection');
  const completedSection = document.getElementById('completedOrdersSection');
  const emptyState       = document.getElementById('emptyState');

  if (!orders || orders.length === 0) {
    if (activeSection)    activeSection.innerHTML    = '';
    if (completedSection) completedSection.innerHTML = '';
    if (emptyState)       emptyState.style.display   = 'flex';
    updateStats([], []);
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  const active    = orders.filter(o => !['completed','delivered','cancelled'].includes(o.status));
  const completed = orders.filter(o => ['completed','delivered'].includes(o.status));

  updateStats(orders, active);

  // ── Active Orders ─────────────────────────────────────────────────────
  if (activeSection) {
    activeSection.innerHTML = active.length === 0
      ? '<p style="color:rgba(255,255,255,0.35);font-size:13px;padding:1rem 0;">কোনো active order নেই</p>'
      : active.map(o => renderActiveCard(o)).join('');

    active.forEach(o => {
      if (o.deadline && !['completed','delivered','cancelled'].includes(o.status)) {
        startCountdown(o.deadline, o.id);
      }
    });
  }

  // ── Completed Orders ──────────────────────────────────────────────────
  if (completedSection) {
    completedSection.innerHTML = completed.length === 0
      ? '<p style="color:rgba(255,255,255,0.35);font-size:13px;padding:1rem 0;">কোনো completed order নেই</p>'
      : completed.map(o => renderCompletedCard(o)).join('');
  }
}

function renderActiveCard(o) {
  const urg    = getUrgencyClass(o.deadline);
  const color  = urgencyColor(urg);
  const status = STATUS_CONFIG[o.status] || { label: o.status, cls:'pending', dot:false };
  const pct    = o.progress_pct || 0;
  const shortId = o.id?.slice(0,8).toUpperCase() || '—';
  const deadlineFormatted = o.deadline
    ? new Date(o.deadline).toLocaleDateString('bn-BD', { day:'numeric', month:'short' })
    : '—';

  return `
  <div class="order-card ${urg}">
    <div class="oc-top">
      <div style="flex:1;min-width:0">
        <div class="oc-title">${o.title || 'Untitled Order'}</div>
        <div class="oc-meta">#SCR-${shortId} · ${o.dept || '—'} · <span class="oc-price">৳${(o.total_price||0).toLocaleString()}</span></div>
      </div>
      <span class="oc-badge ${status.cls}">
        ${status.dot ? '<span class="status-dot"></span>' : ''}
        ${status.label}
      </span>
    </div>

    ${o.deadline ? `
    <div class="oc-cd ${urg}-cd">
      <div class="cd-left">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Deadline বাকি — <strong>${deadlineFormatted}</strong>
      </div>
      <div class="cd-nums ${urg}-nums">
        <span id="cd-${o.id}-d">--</span>d
        <span id="cd-${o.id}-h">--</span>h
        <span id="cd-${o.id}-m">--</span>m
        <span id="cd-${o.id}-s">--</span>s
      </div>
    </div>` : ''}

    <div class="oc-prog-bar">
      <div class="oc-prog-fill" style="width:${pct}%;background:${color}"></div>
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:4px;text-align:right">${pct}% সম্পন্ন</div>

    <div class="oc-foot">
      <button class="oc-det-btn" onclick="viewOrderDetail('${o.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        Details দেখুন
      </button>
      ${o.due_amount > 0
        ? `<span class="oc-due">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            ৳${o.due_amount.toLocaleString()} বাকি
          </span>`
        : `<span class="oc-paid">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Advance paid ✓
          </span>`
      }
    </div>
  </div>`;
}

function renderCompletedCard(o) {
  const shortId   = o.id?.slice(0,8).toUpperCase() || '—';
  const delivered = o.updated_at
    ? new Date(o.updated_at).toLocaleDateString('en-BD', { day:'numeric', month:'short', year:'numeric' })
    : '—';
  return `
  <div class="completed-card">
    <div>
      <div class="cc-title">${o.title || 'Untitled'}</div>
      <div class="cc-meta">#SCR-${shortId} · Delivered: ${delivered}</div>
    </div>
    <div class="cc-right">
      <span class="cc-done">✓ Done</span>
      <button class="cc-dl-btn" onclick="viewOrderDetail('${o.id}')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
    </div>
  </div>`;
}

function viewOrderDetail(orderId) {
  sessionStorage.setItem('scriptora_view_order', orderId);
  window.location.href = 'order-detail.html';
}


// ════════════════════════════════════════════════════════════════
//  Stats Update
// ════════════════════════════════════════════════════════════════
function updateStats(all, active) {
  const pending   = all.filter(o => o.status === 'pending').length;
  const completed = all.filter(o => ['completed','delivered'].includes(o.status)).length;

  setText('totalOrders',     all.length);
  setText('activeOrders',    active.length);
  setText('pendingOrders',   pending);
  setText('completedOrders', completed);
}


// ════════════════════════════════════════════════════════════════
//  Load Orders from Supabase
// ════════════════════════════════════════════════════════════════
async function loadOrders(clientId) {
  // Loading state
  const activeSection = document.getElementById('activeOrdersSection');
  if (activeSection) activeSection.innerHTML = `
    <div style="padding:2rem;text-align:center;color:rgba(255,255,255,0.35);">
      <div style="font-size:24px;margin-bottom:8px">⏳</div>
      Orders লোড হচ্ছে…
    </div>`;

  const { data: orders, error } = await sb
    .from('orders')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Orders fetch error:', error);
    if (activeSection) activeSection.innerHTML = `
      <div style="padding:2rem;text-align:center;color:#f87171;">
        Orders লোড করতে সমস্যা হয়েছে। Page refresh করুন।
      </div>`;
    return;
  }

  renderOrders(orders || []);

  // ── Realtime subscription — order update হলে auto refresh ────────────
  sb.channel('orders-changes')
    .on('postgres_changes', {
      event:  '*',
      schema: 'public',
      table:  'orders',
      filter: `client_id=eq.${clientId}`,
    }, () => {
      loadOrders(clientId); // re-fetch on any change
    })
    .subscribe();
}


// ════════════════════════════════════════════════════════════════
//  Logout
// ════════════════════════════════════════════════════════════════
async function handleLogout() {
  await sb.auth.signOut();
  localStorage.removeItem('scriptora_client_id');
  localStorage.removeItem('scriptora_name');
  localStorage.removeItem('scriptora_email');
  localStorage.removeItem('scriptora_role');
  window.location.href = '../Login page/login.html';
}


// ════════════════════════════════════════════════════════════════
//  Sidebar Inject (আগের মতোই, logout updated)
// ════════════════════════════════════════════════════════════════
function injectSidebar(name, email, initials) {
  const NAV = [
    { href:'dashboard.html', label:'Dashboard',   svg:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' },
    { href:'orders.html',    label:'আমার Order',  svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>' },
    { href:'downloads.html', label:'Downloads',    svg:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' },
    { divider: true },
    { href:'profile.html',   label:'Profile',      svg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
    { href:'help.html',      label:'সাহায্য',      svg:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  ];
  const cur  = location.pathname.split('/').pop() || 'dashboard.html';
  const icon = d => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
  const navHTML = NAV.map(n => {
    if (n.divider) return '<div class="sb-divider"></div>';
    const active = cur === n.href ? ' active' : '';
    return `<a href="${n.href}" class="sb-link${active}">${icon(n.svg)} ${n.label}</a>`;
  }).join('');

  const html = `
<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>
<aside class="sidebar" id="sidebar">
  <div class="sb-logo"><div class="logo-icon">S</div><span>Scriptora</span></div>
  <nav class="sb-nav">${navHTML}</nav>
  <div class="sb-bottom">
    <div class="sb-user">
      <div class="sb-avatar" id="sbAvatar">${initials}</div>
      <div class="sb-userinfo">
        <div class="sb-name"  id="sbName">${name}</div>
        <div class="sb-email" id="sbEmail">${email}</div>
      </div>
    </div>
    <button class="sb-logout" onclick="handleLogout()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Logout
    </button>
  </div>
</aside>
<div class="mobile-topbar">
  <button class="menu-btn" onclick="toggleSidebar()">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  </button>
  <div class="mobile-logo"><div class="logo-icon">S</div> Scriptora</div>
  <div class="sb-avatar sm" id="mobileAvatar">${initials}</div>
</div>`;

  const mount = document.getElementById('sidebarMount');
  if (mount) mount.outerHTML = html;
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('show');
}


// ════════════════════════════════════════════════════════════════
//  dashboard.html এ dynamic sections inject
// ════════════════════════════════════════════════════════════════
function injectDynamicSections() {
  const main = document.querySelector('main.main');
  if (!main) return;

  // stat cards এর পরে dynamic sections যোগ করো
  const existingStatRow = main.querySelector('.stat-row');
  if (!existingStatRow) return;

  const sectionsHTML = `
  <!-- ACTIVE ORDERS SECTION -->
  <div class="section-title-row" style="margin-top:1.75rem">
    <div class="section-dot green pulse-dot"></div>
    <span>ACTIVE ORDERS</span>
  </div>
  <div id="activeOrdersSection"></div>

  <!-- COMPLETED SECTION -->
  <div class="section-title-row" style="margin-top:1.75rem">
    <div class="section-dot blue"></div>
    <span>COMPLETED</span>
  </div>
  <div id="completedOrdersSection"></div>

  <!-- EMPTY STATE -->
  <div id="emptyState" style="display:none;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;">
    <div style="font-size:48px;margin-bottom:1rem">📄</div>
    <div style="font-size:16px;font-weight:600;color:white;margin-bottom:8px">কোনো order নেই</div>
    <p style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:1.5rem">আপনার প্রথম thesis order দিন</p>
    <a href="../Order page/order.html" style="padding:10px 24px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:10px;color:white;text-decoration:none;font-size:14px;font-weight:600;">+ নতুন Order দিন</a>
  </div>`;

  existingStatRow.insertAdjacentHTML('afterend', sectionsHTML);

  // HTML এ hardcoded order cards সরিয়ে দাও
  main.querySelectorAll('.order-card, .completed-card, .section-title-row:not(:first-of-type)').forEach(el => {
    // শুধু dynamically created sections এর বাইরেরগুলো রাখো
  });
}


// ════════════════════════════════════════════════════════════════
//  MAIN INIT
// ════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', async () => {

  // ── Login check ───────────────────────────────────────────────────────
  const clientId = localStorage.getItem('scriptora_client_id');
  const role     = localStorage.getItem('scriptora_role');

  if (!clientId || role !== 'client') {
    window.location.href = '../Login page/login.html';
    return;
  }

  // ── User info ─────────────────────────────────────────────────────────
  const name     = localStorage.getItem('scriptora_name')  || 'User';
  const email    = localStorage.getItem('scriptora_email') || '';
  const initials = getInitials(name);
  const firstName = name.split(' ')[0];

  // ── Sidebar inject ────────────────────────────────────────────────────
  injectSidebar(name, email, initials);

  // ── Header ────────────────────────────────────────────────────────────
  setText('headerName',   firstName);
  setText('headerAvatar', initials);

  // ── Dynamic sections inject ───────────────────────────────────────────
  injectDynamicSections();

  // ── Load real orders ──────────────────────────────────────────────────
  await loadOrders(clientId);
});
