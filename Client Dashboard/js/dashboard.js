/* ================================================
   SCRIPTORA — dashboard.js  (Supabase connected)
   ================================================ */

const SUPABASE_URL  = 'https://hivrmntxpmpwthmjtoem.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';

// window.scriptoraSupabase থাকলে সেটা use করো, না থাকলে নতুন বানাও
// একই client use করলে session properly থাকে
let sb;
if (window.scriptoraSupabase) {
  sb = window.scriptoraSupabase;
} else {
  const { createClient } = supabase;
  sb = createClient(SUPABASE_URL, SUPABASE_ANON);
  window.scriptoraSupabase = sb;
}
window._sb = sb; /* shared client — chat.js reuses this instead of opening a 2nd socket */

const LOGIN_PATH = '../Login page/login.html';

const STEPS = [
  { label: 'Order\nPlaced' },
  { label: 'Payment\nReceived' },
  { label: 'Writing\nচলছে' },
  { label: 'File in\nReview' },
  { label: 'Delivery' },
  { label: 'Completed' },
];

const STATUS_STEP_MAP = {
  /* Step 0 — Order Placed (active) */
  'pending':0, 'hold':0,
  /* Step 1 — Order Placed (done), Payment Received (active) */
  'confirmed':1, 'payment_received':1, 'payment_done':1,
  /* Step 2 — Writing চলছে */
  /* Step 3 — Writing চলছে */
  'writing':2, 'in_progress':2, 'overdue':2,
  /* Step 4 — File in Review */
  'in_review':3, 'draft_ready':3, 'draft_sent':3, 's-review':3, 'revision':3,
  /* Step 5 — Delivery */
  'delivered':4,
  /* Step 6 — Completed */
  'completed':5,
};
window._STATUS_STEP_MAP = STATUS_STEP_MAP;
window._STEPS_TOTAL = STEPS.length;

let currentUser=null, currentClient=null, allOrders=[], currentOrderId=null;
let ordersPageFilter='all'; // 'all' | 'active' | 'completed' — set by the home page's View All links
let countdownTimer=null, chatOrderId=null, realtimeSubs=[];

document.addEventListener('DOMContentLoaded', async () => {
  // Inject ripple styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes sbRipple { 
      0% { transform:scale(0); opacity:0.6; } 
      100% { transform:scale(5); opacity:0; } 
    }
    .sb-ripple-span {
      position:absolute; border-radius:50%;
      background:rgba(147,197,253,0.5);
      transform:scale(0); 
      animation:sbRipple 0.8s ease-out forwards;
      pointer-events:none;
    }
  `;
  document.head.appendChild(style);
  await checkSession();
  initNav();
  initChat();
  initProfile();
});

async function checkSession() {
  const { data:{ session } } = await sb.auth.getSession();
  if (!session) { window.location.href = LOGIN_PATH; return; }
  currentUser = session.user;
  window.currentUser = currentUser; /* expose for cd-topbar.js */

  const { data:client } = await sb.from('clients').select('*').eq('id',currentUser.id).single();
  if (!client) {
    const name = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    await sb.from('clients').insert({ id:currentUser.id, name, email:currentUser.email, phone:currentUser.user_metadata?.phone||'', created_at:new Date().toISOString() });
    currentClient = { id:currentUser.id, name, email:currentUser.email };
  } else {
    currentClient = client;
  }
  updateSidebarUser();
  await loadAllData();
  setupRealtime();
}

function updateSidebarUser() {
  const name = currentClient.name||'Client';
  setText('sbName', name); setText('sbEmail', currentClient.email||'');
  const firstName = currentClient.first_name || name.split(' ')[0];
  setText('headerName', firstName);
  setText('affWelcomeName', firstName); /* Affiliate dashboard welcome banner */
  setText('sbAvatar', getInitials(name));
  // Gender suffix — Supabase এ gender column থাকলে সেটা use করো
  // না থাকলে default ভাই
  const gender = currentClient.gender || 'male';
  const suffix = gender === 'female' ? 'আপু' : 'ভাই';
  const suffixEl = document.getElementById('headerSuffix');
  if (suffixEl) suffixEl.textContent = suffix;
  if (currentClient.avatar_url) {
    document.getElementById('sbAvatar').innerHTML = `<img src="${currentClient.avatar_url}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  }
  localStorage.setItem('scriptora_avatar', currentClient.avatar_url || '');
}

function updatePageDate() {
  const el = document.getElementById('pageDateText');
  if (!el) return;
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  el.textContent = dateStr;
}
updatePageDate();

async function loadAllData() {
  await loadOrders();
  loadPaymentsPage();
  loadFilesPage();
  loadProfileData();
  loadAffiliateState();
  loadAffiliateNotifications(); /* Phase 7: populates sidebar unread badge on load */
}

async function loadOrders() {
  const { data:orders, error } = await sb.from('orders').select('*').eq('client_id',currentUser.id).order('order_date',{ascending:false});
  if (error) console.error('loadOrders error:', error);
  allOrders = orders || [];
  renderHomePage();
  renderOrdersPage();
}

function renderHomePage() {
  const total=allOrders.length;
  const active=allOrders.filter(o=>!['completed','cancelled','pending'].includes(o.status)).length;
  const pending=allOrders.filter(o=>o.status==='pending').length;
  const completed=allOrders.filter(o=>o.status==='completed').length;
  animateStatNum('totalOrders',total); animateStatNum('activeOrders',active);
  animateStatNum('pendingOrders',pending); animateStatNum('completedOrders',completed);

  const activeList=document.getElementById('activeOrdersList');
  const activeOrders=allOrders.filter(o=>o.status!=='completed');
  if(activeList) {
    activeList.innerHTML='';
    const activeEmpty=document.getElementById('activeEmpty');
    if(activeEmpty) activeEmpty.style.display = activeOrders.length===0?'flex':'none';
    activeOrders.forEach(o=>activeList.appendChild(buildOrderCard(o)));
  }

  const completedList=document.getElementById('completedOrdersList');
  const completedOrders=allOrders.filter(o=>o.status==='completed');
  if(completedList) {
    completedList.innerHTML='';
    const completedEmpty=document.getElementById('completedEmpty');
    if(completedEmpty) completedEmpty.style.display = completedOrders.length===0?'block':'none';
  completedOrders.forEach(o=>completedList.appendChild(buildCompletedCard(o)));
  }

  renderOrdersTable();
}

/* Counts a stat number up from its current value to the target, so the
   dashboard feels alive on every load instead of just snapping to a number. */
function animateStatNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent, 10) || 0;
  if (start === target) { el.textContent = target; return; }
  const duration = 700, startTime = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = Math.round(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

/* ══════════════════════════════════════════════════════════════════════════
   DESKTOP ORDER TABLE (Dashboard home page)
   ══════════════════════════════════════════════════════════════════════════ */
const otState = { tab: 'all', sort: 'deadline', pkg: 'all', date: 'all', page: 1, pageSize: 8 };
let otInitialized = false;

function otIsOverdue(order) {
  if (!order.deadline || order.status === 'completed') return false;
  return new Date(order.deadline).getTime() < Date.now();
}
function otMatchesTab(order, tab) {
  switch (tab) {
    case 'in_progress': return ['confirmed','payment_done','writing'].includes(order.status);
    case 'in_review':   return ['draft_sent','in_review','revision'].includes(order.status);
    case 'completed':   return order.status === 'completed';
    case 'pending':     return order.status === 'pending';
    case 'overdue':     return otIsOverdue(order);
    default:            return true; // 'all'
  }
}
function otMatchesDate(order, range) {
  if (range === 'all' || !order.deadline) return true;
  const d = new Date(order.deadline), now = new Date();
  if (range === 'week')  { const in7 = new Date(now); in7.setDate(in7.getDate()+7);  return d >= now && d <= in7; }
  if (range === 'month') { const in30 = new Date(now); in30.setDate(in30.getDate()+30); return d >= now && d <= in30; }
  if (range === 'year')  { return d.getFullYear() === now.getFullYear(); }
  return true;
}

function otGetFiltered() {
  let list = allOrders.filter(o => otMatchesTab(o, otState.tab));
  if (otState.pkg !== 'all') list = list.filter(o => (o.package || '—') === otState.pkg);
  list = list.filter(o => otMatchesDate(o, otState.date));

  const sorted = [...list];
  if (otState.sort === 'deadline')     sorted.sort((a,b)=> new Date(a.deadline||0) - new Date(b.deadline||0));
  else if (otState.sort === 'newest')  sorted.sort((a,b)=> new Date(b.order_date||0) - new Date(a.order_date||0));
  else if (otState.sort === 'amount_high') sorted.sort((a,b)=> Number(b.total_price||0) - Number(a.total_price||0));
  else if (otState.sort === 'amount_low')  sorted.sort((a,b)=> Number(a.total_price||0) - Number(b.total_price||0));
  return sorted;
}

function otDeadlineSub(order) {
  if (!order.deadline) return '';
  if (order.status === 'completed') return 'Completed';
  const days = Math.ceil((new Date(order.deadline) - new Date()) / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `${days}d left`;
}

function otInitials(title) {
  const words = String(title||'?').trim().split(/\s+/);
  return ((words[0]?.[0]||'') + (words[1]?.[0]||'')).toUpperCase() || '?';
}
function otAvatarColorClass(order) {
  const palette = ['av-purple','av-blue','av-green','av-gold','av-pink','av-teal'];
  const key = String(order.id ?? order.title ?? '');
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function renderOrdersTable() {
  const tbody = document.getElementById('otTableBody');
  if (!tbody) return; // desktop table not on this page

  if (!otInitialized) { otInitTable(); otInitialized = true; }

  // Tab counts (based on the full order set, not the current filters)
  const setCount = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  setCount('otCountAll', allOrders.length);
  setCount('otCountProgress', allOrders.filter(o=>otMatchesTab(o,'in_progress')).length);
  setCount('otCountReview',   allOrders.filter(o=>otMatchesTab(o,'in_review')).length);
  setCount('otCountCompleted',allOrders.filter(o=>otMatchesTab(o,'completed')).length);
  setCount('otCountPending',  allOrders.filter(o=>otMatchesTab(o,'pending')).length);
  setCount('otCountOverdue',  allOrders.filter(o=>otMatchesTab(o,'overdue')).length);

  const filtered = otGetFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / otState.pageSize));
  if (otState.page > totalPages) otState.page = totalPages;
  const startIdx = (otState.page - 1) * otState.pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + otState.pageSize);

  tbody.innerHTML = '';
  document.getElementById('otEmpty').style.display = filtered.length === 0 ? 'flex' : 'none';

  pageItems.forEach(order => {
    // Payment না করা বা rejected orders-এ special badge দেখাবে
    const isUnpaid   = (order.payment_status === 'unpaid' || !order.payment_status) && (!order.advance_paid || Number(order.advance_paid) === 0);
    const isRejected = order.payment_status === 'rejected' && (!order.advance_paid || Number(order.advance_paid) === 0);
    const badge = isRejected
      ? { cls: 'badge-payment-rejected', label: '❌ Payment Rejected' }
      : isUnpaid
        ? { cls: 'badge-waiting-payment', label: 'Waiting for Payment' }
        : getStatusBadge(order.status);
    const overdue = otIsOverdue(order);
    const tr = document.createElement('tr');
    tr.className = 'ot-row';
    tr.onclick = () => openOrderDetail(order.id);
    const orderNo = order.order_number || ('#SCR-'+String(order.id).slice(-6).toUpperCase());
    const subLabel = otDeadlineSub(order);
    tr.innerHTML = `
      <td>
        <div class="ot-proj">
          <div class="ot-proj-avatar ${otAvatarColorClass(order)}">${escHtml(otInitials(order.title))}</div>
          <div class="ot-proj-text">
            <div class="ot-proj-title">${escHtml(order.title||'Untitled')}</div>
            <div class="ot-proj-meta">
              <span>${escHtml(orderNo)}</span>
              ${order.department ? `<span class="ot-proj-dept">${escHtml(order.department)}</span>` : ''}
            </div>
          </div>
        </div>
      </td>
      <td><span class="ot-package">${escHtml(order.package || '—')}</span></td>
      <td><span class="ot-status"><span class="ot-status-dot" style="background:currentColor"></span>${badge.label}</span></td>
      <td>
        <div class="ot-deadline">${fmtDate(order.deadline)}</div>
        <div class="ot-deadline-sub ${overdue?'urgent':(order.status==='completed'?'safe':'')}">${escHtml(subLabel)}</div>
      </td>
      <td class="ot-amount">৳${fmt(order.total_price)}</td>
    `;
    tr.querySelector('.ot-status').className = `ot-status ${badge.cls}`;
    tbody.appendChild(tr);
  });

  // Pagination footer
  const shownFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const shownTo = Math.min(startIdx + otState.pageSize, filtered.length);
  setText('otPageInfo', `Showing ${shownFrom} to ${shownTo} of ${filtered.length} orders`);
  setText('otPageNum', otState.page);
  document.getElementById('otPrevBtn').disabled = otState.page <= 1;
  document.getElementById('otNextBtn').disabled = otState.page >= totalPages;

  // Package filter options (rebuilt only when the set of packages changes)
  const pkgSelect = document.getElementById('otPackageSelect');
  if (pkgSelect) {
    const pkgs = Array.from(new Set(allOrders.map(o=>o.package).filter(Boolean))).sort();
    const wanted = ['all', ...pkgs];
    const current = Array.from(pkgSelect.options).map(o=>o.value);
    if (JSON.stringify(current) !== JSON.stringify(wanted)) {
      const prevVal = pkgSelect.value;
      pkgSelect.innerHTML = `<option value="all">All Packages</option>` +
        pkgs.map(p=>`<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('');
      if (wanted.includes(prevVal)) pkgSelect.value = prevVal;
    }
  }
}

function otInitTable() {
  document.getElementById('otTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.ot-tab');
    if (!btn) return;
    document.querySelectorAll('.ot-tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    otState.tab = btn.dataset.tab;
    otState.page = 1;
    renderOrdersTable();
  });
  document.getElementById('otSortSelect').addEventListener('change', (e) => {
    otState.sort = e.target.value; otState.page = 1; renderOrdersTable();
  });
  document.getElementById('otPackageSelect').addEventListener('change', (e) => {
    otState.pkg = e.target.value; otState.page = 1; renderOrdersTable();
  });
  document.getElementById('otDateSelect').addEventListener('change', (e) => {
    otState.date = e.target.value; otState.page = 1; renderOrdersTable();
  });
  document.getElementById('otPrevBtn').addEventListener('click', () => {
    if (otState.page > 1) { otState.page--; renderOrdersTable(); }
  });
  document.getElementById('otNextBtn').addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(otGetFiltered().length / otState.pageSize));
    if (otState.page < totalPages) { otState.page++; renderOrdersTable(); }
  });
  document.getElementById('otExportBtn').addEventListener('click', otExportCsv);
}

function otExportCsv() {
  const rows = otGetFiltered();
  const header = ['Order Number','Title','Package','Department','Status','Deadline','Amount'];
  const csvRows = [header.join(',')];
  rows.forEach(o => {
    const orderNo = o.order_number || ('SCR-'+String(o.id).slice(-6).toUpperCase());
    const cells = [
      orderNo, o.title||'', o.package||'', o.department||'',
      getStatusBadge(o.status).label, o.deadline ? fmtDate(o.deadline) : '', o.total_price||0
    ].map(v => `"${String(v).replace(/"/g,'""')}"`);
    csvRows.push(cells.join(','));
  });
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `scriptora-orders-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}


function buildOrderCard(order) {
  const deadline=new Date(order.deadline), now=new Date();
  const diffMs=deadline-now, daysLeft=Math.floor(diffMs/86400000);
  const isUrgent=daysLeft<=3;
  const isPaymentApproved = order.payment_status === 'approved'
    || order.payment_status === 'paid'
    || order.payment_status === 'confirmed'
    || Number(order.advance_paid || 0) > 0;
  const card=document.createElement('div');
  const badge=getStatusBadge(order.status);
  card.className=`order-card ${badge.cls}`; // left border color = status badge color
  card.onclick=()=>openOrderDetail(order.id);
  const cdColor=isUrgent?'cd-nums-urgent':'cd-nums-safe';
  const due=(order.due_amount||0)>0;
  card.innerHTML=`
    <div class="oc-top">
      <div class="oc-top-left">
        <div class="oc-avatar ${otAvatarColorClass(order)}">${escHtml(otInitials(order.title))}</div>
        <div class="oc-top-info">
          <div class="oc-title">${escHtml(order.title||'Untitled')}</div>
          <div class="oc-tags-row">
            ${order.department?`<span class="oc-tag">${escHtml(order.department)}</span>`:''}
          </div>
        </div>
      </div>
      <span class="status-badge ${badge.cls}">${badge.label}</span>
    </div>
    <div class="oc-meta-row">
      <div class="oc-meta">${escHtml(order.order_number||('#SCR-'+String(order.id).slice(-6).toUpperCase()))} · <span class="oc-price">৳${fmt(order.total_price)}</span></div>
      ${due
        ?`<span class="oc-due">Due <strong class="oc-amount-strong">৳${fmt(order.due_amount)}</strong></span>`
        :`<span class="oc-paid">Advance paid</span>`
      }
    </div>
    <div class="oc-cd">
      <div class="cd-left">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Deadline — <strong>${fmtDate(order.deadline)}</strong>
      </div>
      ${isPaymentApproved
        ? `<div class="${cdColor} js-countdown" data-deadline="${order.deadline}">${diffMs>0?formatCountdown(diffMs):'সময় শেষ!'}</div>`
        : `<div class="oc-pay-first">💳 Pay first</div>`
      }
    </div>`;
  return card;
}

function buildCompletedCard(order) {
  const card=document.createElement('div');
  const badge=getStatusBadge(order.status);
  card.className=`completed-card ${badge.cls}`; card.onclick=()=>openOrderDetail(order.id);
  card.innerHTML=`
    <div class="cc-avatar ${otAvatarColorClass(order)}">${escHtml(otInitials(order.title))}</div>
    <div><div class="cc-title">${escHtml(order.title||'Untitled')}</div><div class="cc-meta">${escHtml(order.order_number||('#SCR-'+String(order.id).slice(-6).toUpperCase()))} · ${fmtDate(order.order_date)}</div></div>
    <div class="cc-right">
      <span class="cc-done">Done</span>
      <button class="cc-dl-btn" onclick="event.stopPropagation();showPage('files')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
    </div>`;
  return card;
}

function renderOrdersPage() {
  const list=document.getElementById('allOrdersList');
  const empty=document.getElementById('ordersEmpty');
  list.innerHTML='';
  const filtered = ordersPageFilter==='active' ? allOrders.filter(o=>o.status!=='completed')
                  : ordersPageFilter==='completed' ? allOrders.filter(o=>o.status==='completed')
                  : allOrders;
  if(filtered.length===0){empty.style.display='flex';return;}
  empty.style.display='none';
  filtered.forEach(order=>{
    const item=document.createElement('div');
    item.className='order-list-item'; item.onclick=()=>openOrderDetail(order.id);
    const badge=getStatusBadge(order.status);
    item.innerHTML=`
      <div class="oli-left">
        <div class="oli-title">${escHtml(order.title||'Untitled')}</div>
        <div class="oli-meta">${escHtml(order.order_number||('#SCR-'+String(order.id).slice(-6).toUpperCase()))} · ${escHtml(order.department||'')} · ${fmtDate(order.deadline)}</div>
      </div>
      <div class="oli-right">
        <span class="status-badge ${badge.cls}">${badge.label}</span>
        <span class="oli-price">৳${fmt(order.total_price)}</span>
        <svg class="oli-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
    list.appendChild(item);
  });
}

async function openOrderDetail(orderId) {
  currentOrderId=orderId;
  const order=allOrders.find(o=>o.id===orderId);
  if(!order) return;
  window._openingOrderDetail = true;
  showPage('orders');
  window._openingOrderDetail = false;
  document.getElementById('ordersListView').style.display='none';
  document.getElementById('orderDetailView').style.display='block';
  // Hide page header and remove top padding in detail view
  const pageHeader = document.querySelector('#page-orders .page-header');
  if(pageHeader) pageHeader.style.display='none';
  document.getElementById('page-orders').style.paddingTop='20px';
  setText('detailTitle',order.title||'Untitled');
  setText('detailMeta',`${order.order_number||('#SCR-'+String(order.id).slice(-6).toUpperCase())} · ${order.department||''} · Order: ${fmtDate(order.order_date)}`);
  const badge=getStatusBadge(order.status);
  const statusEl=document.getElementById('detailStatus');
  statusEl.textContent=badge.label; statusEl.className=`status-badge ${badge.cls}`;
  renderStepper(order.status, order.payment_status, 0); // will re-render after livePaid is fetched

  /* Payment Verification badge */
  const existingVerBadge = document.getElementById('payVerificationBadge');
  if (existingVerBadge) existingVerBadge.remove();
  if (order.payment_status === 'under_review') {
    const verBadge = document.createElement('div');
    verBadge.id = 'payVerificationBadge';
    verBadge.style.cssText = 'background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:20px;padding:6px 14px;font-size:12px;color:#fbbf24;font-weight:600;display:inline-flex;align-items:center;gap:6px;margin-bottom:12px;';
    verBadge.innerHTML = '⏳ Payment Verification চলছে...';
    const stepperEl = document.getElementById('progressStepper');
    if (stepperEl && stepperEl.parentNode) stepperEl.parentNode.insertBefore(verBadge, stepperEl);
  }
  setText('detailTotal',`৳${fmt(order.total_price)}`);

  /* ── Fetch live approved-payment sum + pending payment requests ── */
  let livePaid = 0, liveDue = 0;
  let hasPendingPaymentRequest = false;
  try {
    const { data: approvedPays } = await sb
      .from('payments')
      .select('amount')
      .eq('order_id', orderId)
      .eq('confirmed', true)
      .in('type', ['received', 'approval']);
    livePaid = (approvedPays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    liveDue  = Math.max(0, Number(order.total_price || 0) - livePaid);

    /* Check if there's any pending/under_review payment request */
    const { data: pendingPays } = await sb
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .in('type', ['pending', 'under_review', 'screenshot'])
      .limit(1);
    hasPendingPaymentRequest = (pendingPays && pendingPays.length > 0)
      || order.payment_status === 'under_review';
  } catch(_) {
    /* fallback to order row if query fails */
    livePaid = order.advance_paid || 0;
    liveDue  = order.due_amount   || 0;
    hasPendingPaymentRequest = order.payment_status === 'under_review';
  }

  /* Keep order.due_amount in sync with the live-computed value so every
     downstream consumer (Revision Center, My Files lock state, etc.)
     that reads order.due_amount sees the authoritative due, not a
     possibly-stale cached column. */
  order.due_amount = liveDue;

  /* ── Re-render stepper now that we have real livePaid ── */
  renderStepper(order.status, order.payment_status, livePaid);

  /* ── Start countdown with full payment context ── */
  startCountdown(order.deadline, order.payment_status, livePaid, hasPendingPaymentRequest, order.status);

  /* ⭐ Star rating init — completed orders এ */
  if (order.status === 'completed') {
    // DOM render হওয়ার পরে init করো
    setTimeout(() => initStarRating(order.id, order.rating || null), 50);
  }

  setText('detailAdvance',`৳${fmt(livePaid)}`);
  setText('detailDue',`৳${fmt(liveDue)}`);
  const payBadges=document.getElementById('payBadges');
  payBadges.innerHTML='';
  if(livePaid>0) payBadges.innerHTML+=`<span class="pay-badge confirmed">✓ Advance paid</span>`;
  if(liveDue>0)  payBadges.innerHTML+=`<span class="pay-badge pending">✗ Due pending</span>`;

  /* ── Rejected payment banner — show prominently above everything ── */
  const existingRejBanner = document.getElementById('rejectedPaymentBanner');
  if (existingRejBanner) existingRejBanner.remove();
  const isPaymentRejected = order.payment_status === 'rejected' && livePaid === 0;
  if (isPaymentRejected) {
    const rejBanner = document.createElement('div');
    rejBanner.id = 'rejectedPaymentBanner';
    rejBanner.className = 'rejected-payment-banner';
    rejBanner.innerHTML = `
      <div class="rej-banner-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      </div>
      <div class="rej-banner-body">
        <div class="rej-banner-title">Payment Rejected হয়েছে</div>
        <div class="rej-banner-msg">আপনার আগের payment verify করা যায়নি। সঠিক Transaction ID এবং screenshot দিয়ে আবার submit করুন।</div>
      </div>
      <button class="rej-banner-btn" onclick="window.location.href='../Payment page/payment.html?order_id=${order.id}'">
        🔄 পুনরায় Payment করুন
      </button>
    `;
    const detailHeader = document.querySelector('#orderDetailView .detail-header') || document.querySelector('#orderDetailView');
    if (detailHeader) detailHeader.insertAdjacentElement('afterend', rejBanner);
  }

  /* Use live values for lock/unlock logic */
  const hasDue = liveDue > 0;

  // Due hero + warning + Pay Now
  const heroTitleEl  = document.getElementById('ppsHeroTitle');
  const heroSubEl    = document.getElementById('ppsHeroSub');
  const heroBadgeEl  = document.getElementById('ppsHeroBadge');
  const heroBadgeTxt = document.getElementById('ppsHeroBadgeText');
  const heroBadgeIco = document.getElementById('ppsHeroBadgeIcon');
  const heroRingEl   = document.getElementById('ppsHeroRing');
  if (hasDue) {
    heroTitleEl.textContent = 'Complete payment to unlock your files';
    heroSubEl.textContent   = 'Secure your files and get full access after successful payment confirmation.';
    heroBadgeEl.classList.remove('confirmed');
    heroBadgeTxt.textContent = 'Action Required';
    heroBadgeIco.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
    heroRingEl.style.display = 'none';
  } else {
    heroTitleEl.textContent = 'Congratulations! You\'re all set! 🎉';
    heroSubEl.textContent   = 'Your payment has been completed successfully. You now have full access to all your files.';
    heroBadgeEl.classList.add('confirmed');
    heroBadgeTxt.textContent = 'Payment Confirmed';
    heroBadgeIco.innerHTML = '<circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/>';
    heroRingEl.style.display = 'flex';
  }
  heroBadgeEl.style.display = 'inline-flex';
  document.getElementById('payDueHero').style.display    = 'flex';
  document.getElementById('payDueFeatureRow').style.display = hasDue ? 'flex'  : 'none';
  document.getElementById('payFeatureRow').style.display = hasDue ? 'none'  : 'flex';
  document.getElementById('payDueWarning').style.display = hasDue ? 'flex'  : 'none';
  document.getElementById('payDueNote').style.display    = hasDue ? 'none'  : 'flex';
  document.getElementById('payNowSection').style.display = hasDue ? 'block' : 'none';

  if (!hasDue) {
    const accessEl = document.getElementById('payAccessUntil');
    if (accessEl) {
      let base = new Date(order.order_date || order.created_at || Date.now());
      if (isNaN(base.getTime())) base = new Date();
      const until = new Date(base.getTime());
      until.setDate(until.getDate() + 60);
      accessEl.textContent = until.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  // Pay Now → payment page
  document.getElementById('payNowBtn').onclick = () => {
    window.location.href = `../Payment page/payment.html?order_id=${orderId}`;
  };

  await loadOrderFiles(orderId, hasDue);
  await loadLatestAdminMsg(orderId);
  await checkAndShowProofSection(order);
  await renderDeliveryReviewBanner(order);
  if (window.initRevisionCenter) await window.initRevisionCenter(order);
  if (window.renderClientRevisionHistory) await window.renderClientRevisionHistory(order.id);
}

document.getElementById('backToOrders').onclick=()=>{
  document.getElementById('ordersListView').style.display='block';
  document.getElementById('orderDetailView').style.display='none';
  clearInterval(countdownTimer);
  const pageHeader = document.querySelector('#page-orders .page-header');
  if(pageHeader) pageHeader.style.display='';
  document.getElementById('page-orders').style.paddingTop='';
};

/* Countdown "View Order Details" button — scrolls to detail (already on detail view) */
const cdViewBtn = document.getElementById('cdViewOrderBtn');
if (cdViewBtn) cdViewBtn.onclick = () => {
  document.getElementById('orderDetailView').scrollIntoView({behavior:'smooth'});
};

function startCountdown(deadlineStr, paymentStatus, livePaid, hasPendingRequest, orderStatus) {
  clearInterval(countdownTimer);

  const pendingEl   = document.getElementById('cdPaymentPending');
  const activeEl    = document.getElementById('cdActiveTimer');
  const completedEl = document.getElementById('cdCompleted');
  const titleEl     = document.getElementById('cdppTitle');
  const subEl       = document.getElementById('cdppSub');
  const iconEl      = document.getElementById('cdppIcon');
  const payLinkEl   = document.getElementById('cdppPayLink');

  // ✅ Order completed — countdown সরিয়ে completed card দেখাও
  if (orderStatus === 'completed') {
    if (pendingEl)   pendingEl.style.display   = 'none';
    if (activeEl)    activeEl.style.display    = 'none';
    if (completedEl) {
      completedEl.style.display = 'block';
      const dateEl = document.getElementById('cdCompletedDate');
      if (dateEl && deadlineStr) dateEl.textContent = fmtDateLong(deadlineStr);
    }
    return;
  }

  if (completedEl) completedEl.style.display = 'none';

  const isApproved = paymentStatus === 'approved'
    || paymentStatus === 'paid'
    || paymentStatus === 'confirmed'
    || livePaid > 0;

  if (isApproved) {
    // ✅ Payment approved — countdown চলবে
    if (pendingEl) pendingEl.style.display = 'none';
    if (activeEl)  activeEl.style.display  = 'flex';
    const deadline = new Date(deadlineStr);
    function tick() {
      const diff = deadline - new Date();
      if (diff <= 0) {
        ['cdDays','cdHours','cdMins','cdSecs'].forEach(id => flipCard(id,'00'));
        setText('cdDaysLeft','সময় শেষ!'); clearInterval(countdownTimer); return;
      }
      const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000);
      const m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
      flipCard('cdDays',pad(d)); flipCard('cdHours',pad(h));
      flipCard('cdMins',pad(m)); flipCard('cdSecs',pad(s));
      setText('cdDeadline',fmtDateLong(deadlineStr));
      setText('cdDaysLeft',`আর মাত্র ${d} দিন বাকি`);
      const el2=document.getElementById('cdDaysLeft2'); if(el2) el2.textContent=d;
    }
    tick(); countdownTimer = setInterval(tick, 1000);
    return;
  }

  // ❌ Not yet approved — show pending state
  if (pendingEl) pendingEl.style.display = 'flex';
  if (activeEl)  activeEl.style.display  = 'none';

  const dlPending = document.getElementById('cdDeadlinePending');
  if (dlPending) dlPending.textContent = deadlineStr ? fmtDateLong(deadlineStr) : '—';

  if (hasPendingRequest || paymentStatus === 'under_review') {
    // State 2: Payment request দেওয়া আছে, admin approve করেনি
    if (titleEl) titleEl.textContent = 'Countdown শুরু হয়নি';
    if (subEl)   subEl.textContent   = 'Payment request পাঠানো হয়েছে। Admin approve করলে countdown শুরু হবে।';
    if (iconEl)  iconEl.style.color  = '#fbbf24'; // yellow
    if (payLinkEl) payLinkEl.style.display = 'none';
  } else {
    // State 1: কোনো payment request নেই
    if (titleEl) titleEl.textContent = 'Order এখনো শুরু হয়নি';
    if (subEl)   subEl.textContent   = 'Minimum advance payment confirm করুন। তারপরই order progress শুরু হবে।';
    if (iconEl)  iconEl.style.color  = '#f87171'; // red
    if (payLinkEl) {
      payLinkEl.style.display = 'inline-flex';
      // order_id URL-এ pass করো
      const ordId = typeof orderId !== 'undefined' ? orderId : (typeof currentOrderId !== 'undefined' ? currentOrderId : '');
      if (ordId) payLinkEl.href = `../Payment page/payment.html?order_id=${ordId}`;
    }
  }
}

function renderStepper(status, paymentStatus, livePaid) {
  const stepper=document.getElementById('progressStepper');
  let effectiveStep = STATUS_STEP_MAP[status] ?? 1;

  // Payment Received step (step index 1) শুধু তখনই
  // যখন admin explicitly payment_received status দিয়েছে
  // অথবা livePaid > 0 (actual approved payment আছে)
  const actuallyPaid = Number(livePaid || 0) > 0
    || paymentStatus === 'approved'
    || paymentStatus === 'paid'
    || paymentStatus === 'confirmed';

  // explicitly unpaid → never show Payment Received
  const explicitlyUnpaid = paymentStatus === 'unpaid'
    || paymentStatus === 'pending'
    || paymentStatus === 'under_review'
    || paymentStatus === 'rejected'
    || !paymentStatus;

  // যদি status-based step ইতিমধ্যে ২ বা তার বেশি,
  // সেটাই থাকবে। কিন্তু step 1 থেকে 2-এ যাবে
  // শুধু actually paid হলে।
  // Payment Received = index 1
  if (effectiveStep < 1 && actuallyPaid && !explicitlyUnpaid) effectiveStep = 1;
  // unpaid → Order Placed active (index 0)
  if (explicitlyUnpaid || (!actuallyPaid && effectiveStep < 1)) effectiveStep = 0;

  const currentStep = effectiveStep;
  stepper.innerHTML='';
  STEPS.forEach((step,i)=>{
    const isDone=i<currentStep, isActive=i===currentStep;
    const cls=isDone?'done':isActive?'active':'pending';
    const checkSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
    /* Completed step (last step) active হলে edit icon না দিয়ে ✓ দেখাও */
    const isLastStep = i === STEPS.length - 1;
    const icon = isDone
      ? checkSvg
      : isActive
        ? (isLastStep ? checkSvg : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`)
        : `${i+1}`;
    const div=document.createElement('div');
    div.className=`step ${cls}`;
    div.innerHTML=`<div class="step-circle ${cls}">${icon}</div><div class="step-label ${cls}">${step.label.replace('\n',' ')}</div>`;
    stepper.appendChild(div);
  });
}

/* ═══════════════════════════════════════════════════════════════
   DELIVERY REVIEW BANNER — draft_ready (first draft) or delivered
   (final delivery after all revisions approved) status এ দেখায়
   Client: "সব ঠিক" → completed | "সমস্যা আছে" → in_review
═══════════════════════════════════════════════════════════════ */
async function renderDeliveryReviewBanner(order) {
  const wrap = document.getElementById('deliveryReviewBannerWrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const isFinalDelivery = order.status === 'delivered';
  if (order.status !== 'draft_ready' && !isFinalDelivery) return;

  /* If there's an active (non-approved, non-superseded) revision, the
     Revision Center's own "ready for review" banner already covers this
     decision — showing both at once is confusing, so skip this one. */
  if (window.RevisionService) {
    try {
      const revisions = await window.RevisionService.getRevisions(order.id);
      if (revisions.some(r => !['approved', 'superseded'].includes(r.status))) return;
    } catch (e) {
      console.warn('[DeliveryBanner] revision check failed', e);
    }
  }

  wrap.innerHTML = `
    <div style="
      background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%);
      border: 1px solid rgba(99,102,241,0.35);
      border-radius: 14px;
      padding: 20px 22px;
      margin-top: 16px;
    ">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-size:22px;">${isFinalDelivery ? '🏁' : '📦'}</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:#e2e8f0;">${isFinalDelivery ? 'Final Delivery পাঠানো হয়েছে!' : 'Delivery পাঠানো হয়েছে!'}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">ফাইলগুলো দেখুন এবং আপনার সিদ্ধান্ত জানান।</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
        <button id="drBtnOk" style="
          flex:1;min-width:140px;padding:10px 16px;border-radius:10px;border:none;cursor:pointer;
          background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-size:13px;font-weight:700;
          display:flex;align-items:center;justify-content:center;gap:7px;
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          সব ঠিক আছে, Complete করুন
        </button>
        <button id="drBtnProblem" style="
          flex:1;min-width:140px;padding:10px 16px;border-radius:10px;border:1px solid rgba(251,191,36,0.4);cursor:pointer;
          background:rgba(251,191,36,0.1);color:#fbbf24;font-size:13px;font-weight:700;
          display:flex;align-items:center;justify-content:center;gap:7px;
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          সমস্যা আছে, Review চাই
        </button>
      </div>
    </div>
  `;

  document.getElementById('drBtnOk').onclick = () => confirmMarkComplete(order.id);
  document.getElementById('drBtnProblem').onclick = () => openReviewRequestModal(order.id);
}

function confirmMarkComplete(orderId) {
  const modal = document.createElement('div');
  modal.id = 'drConfirmModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:#1e293b;border:1px solid rgba(99,102,241,0.3);border-radius:18px;padding:28px 24px;max-width:380px;width:100%;text-align:center;">
      <div style="font-size:36px;margin-bottom:12px;">🎉</div>
      <div style="font-size:16px;font-weight:700;color:#e2e8f0;margin-bottom:8px;">Order Complete করবেন?</div>
      <div style="font-size:13px;color:#94a3b8;margin-bottom:22px;line-height:1.6;">
        Confirm করলে এই order <strong style="color:#4ade80;">Completed</strong> হিসেবে চিহ্নিত হবে এবং admin-কে জানানো হবে।
      </div>
      <div style="display:flex;gap:10px;">
        <button id="drConfirmCancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:#94a3b8;font-size:13px;cursor:pointer;">বাতিল</button>
        <button id="drConfirmOk" style="flex:1;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-size:13px;font-weight:700;cursor:pointer;">✓ হ্যাঁ, Complete করুন</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#drConfirmCancel').onclick = () => modal.remove();
  modal.querySelector('#drConfirmOk').onclick = async () => {
    modal.remove();
    await markOrderComplete(orderId);
  };
}

function openReviewRequestModal(orderId) {
  const modal = document.createElement('div');
  modal.id = 'drReviewModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:#1e293b;border:1px solid rgba(251,191,36,0.25);border-radius:18px;padding:28px 24px;max-width:420px;width:100%;">
      <div style="font-size:15px;font-weight:700;color:#e2e8f0;margin-bottom:6px;">⚠️ Review Request</div>
      <div style="font-size:12px;color:#94a3b8;margin-bottom:16px;line-height:1.6;">কী সমস্যা আছে সেটা লিখুন। Admin দেখে সমাধান করবেন।</div>
      <textarea id="drReviewText" placeholder="সমস্যার বিবরণ লিখুন..." style="
        width:100%;min-height:110px;padding:12px;border-radius:10px;
        background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);
        color:#e2e8f0;font-size:13px;resize:vertical;box-sizing:border-box;font-family:inherit;
      "></textarea>
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button id="drReviewCancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:#94a3b8;font-size:13px;cursor:pointer;">বাতিল</button>
        <button id="drReviewSubmit" style="flex:1;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;font-size:13px;font-weight:700;cursor:pointer;">Review পাঠান</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#drReviewCancel').onclick = () => modal.remove();
  modal.querySelector('#drReviewSubmit').onclick = async () => {
    const text = modal.querySelector('#drReviewText').value.trim();
    if (!text) { showToast('সমস্যার বিবরণ লিখুন', 'error'); return; }
    modal.remove();
    await submitReviewRequest(orderId, text);
  };
}

async function markOrderComplete(orderId) {
  try {
    const { error } = await sb.from('orders').update({
      status: 'completed',
    }).eq('id', orderId);
    if (error) throw error;

    /* Notify admin via messages */
    await sb.from('messages').insert({
      order_id:   orderId,
      client_id:  (await sb.auth.getUser()).data.user?.id,
      text:       '✅ Client order টি Completed হিসেবে confirm করেছেন।',
      from_admin: false,
      read:       false,
      sent_at:    new Date().toISOString(),
    });

    showToast('✅ Order Completed হয়েছে! ধন্যবাদ।', 'success');

    /* Update local order object and re-render */
    const o = allOrders.find(x => String(x.id) === String(orderId));
    if (o) o.status = 'completed';
    const wrap = document.getElementById('deliveryReviewBannerWrap');
    if (wrap) wrap.innerHTML = '';
    await openOrderDetail(orderId);
  } catch (e) {
    console.error('markOrderComplete error:', e);
    showToast('Complete করা যায়নি। আবার চেষ্টা করুন।', 'error');
  }
}

async function submitReviewRequest(orderId, reviewText) {
  try {
    const { error } = await sb.from('orders').update({
      status: 'in_review',
    }).eq('id', orderId);
    if (error) throw error;

    /* Send review message — use a plain text prefix admin can filter on */
    await sb.from('messages').insert({
      order_id:   orderId,
      client_id:  (await sb.auth.getUser()).data.user?.id,
      text:       '[REVIEW_REQUEST] ' + reviewText,
      from_admin: false,
      read:       false,
      sent_at:    new Date().toISOString(),
    });

    showToast('⚠️ Review request পাঠানো হয়েছে। Admin দেখবেন।', '');

    const o = allOrders.find(x => String(x.id) === String(orderId));
    if (o) o.status = 'in_review';
    const wrap = document.getElementById('deliveryReviewBannerWrap');
    if (wrap) wrap.innerHTML = '';
    await openOrderDetail(orderId);
  } catch (e) {
    console.error('submitReviewRequest error:', e);
    showToast('Request পাঠানো যায়নি। আবার চেষ্টা করুন।', 'error');
  }
}
/* ═══════════════════════════════════════════════════════════════ */

async function loadOrderFiles(orderId, hasDue) {
  const list = document.getElementById('filesList');
  if (!list) return;
  list.innerHTML = '<div class="empty-note" style="font-size:12px;color:var(--text-muted)">Loading files…</div>';

  try {
    /* Load only admin-sent files that are visible to client */
    const { data: accessRows, error } = await sb
      .from('order_file_access')
      .select('storage_path, is_visible, download_allowed, uploaded_by, updated_at')
      .eq('order_id', orderId)
      .eq('is_visible', true)
      .neq('uploaded_by', 'Client'); /* Client নিজের submit করা file এখানে দেখাবে না */

    if (error) throw error;

    /* Also load admin-uploaded Revision files so a delivered revision
       shows up here too, tagged as "Revised" so it's clear where it's from. */
    let revFileRows = [];
    try {
      const { data: revFiles, error: revErr } = await sb
        .from('revision_files')
        .select('storage_path, file_name, uploaded_by, is_client_visible, created_at, revision_id, download_allowed')
        .eq('order_id', orderId)
        .eq('uploaded_by', 'admin');
      if (!revErr && revFiles) {
        revFileRows = revFiles.filter(f => f.is_client_visible !== false);
      }
    } catch (e) {
      console.warn('loadOrderFiles: revision files fetch failed', e);
    }

    /* Look up revision_number + status for each revision_id: the badge
       needs the number, and the status decides whether this file has
       actually been "delivered" yet — a file uploaded while the revision
       is still in_progress is work-in-progress, not ready to show the
       client, until admin clicks "Mark Ready for Review". */
    let revNumberById = {};
    let revStatusById = {};
    if (revFileRows.length) {
      try {
        const revIds = [...new Set(revFileRows.map(f => f.revision_id))];
        const { data: revRows } = await sb
          .from('revisions')
          .select('id, revision_number, status')
          .in('id', revIds);
        (revRows || []).forEach(r => {
          revNumberById[r.id] = r.revision_number;
          revStatusById[r.id] = r.status;
        });
      } catch (e) { /* non-fatal — badge just omits the number */ }
    }

    const REV_FILES_DELIVERED_STATUSES = ['ready_for_review', 'approved', 'superseded'];
    revFileRows = revFileRows.filter(f => REV_FILES_DELIVERED_STATUSES.includes(revStatusById[f.revision_id]));

    /* Normalize both sources into one shape and sort newest-first */
    const normalDelivery = (accessRows || []).map(row => {
      const parts = row.storage_path.split('/');
      return {
        storage_path:    row.storage_path,
        file_name:       parts[parts.length - 1],
        date:            row.updated_at,
        download_allowed: row.download_allowed,
        isRevision:      false,
      };
    });
    const revisionDelivery = revFileRows.map(f => ({
      storage_path:     f.storage_path,
      file_name:        f.file_name,
      date:             f.created_at,
      /* Revision files respect the same due-based lock as normal delivery
         files: admin's explicit choice (set at upload time) always wins;
         if it was never set, fall back to due-amount gating. */
      download_allowed: (f.download_allowed === true || f.download_allowed === false)
        ? f.download_allowed
        : !hasDue,
      isRevision:       true,
      revisionNumber:   revNumberById[f.revision_id],
    }));

    const combined = [...normalDelivery, ...revisionDelivery]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (!combined.length) {
      list.innerHTML = '<div class="empty-note">কোনো file পাঠানো হয়নি</div>';
      const viewAllWrap = document.getElementById('filesViewAllWrap');
      if (viewAllWrap) viewAllWrap.style.display = 'none';
      return;
    }

    list.innerHTML = '';
    const PREVIEW_LIMIT = 4;
    const totalCount = combined.length;
    const previewRows = combined.slice(0, PREVIEW_LIMIT);
    for (const row of previewRows) {
      const fileName = row.file_name;
      const ext = fileName.split('.').pop().toUpperCase();
      const iconCls = {'PDF':'fi-pdf','PNG':'fi-png','JPG':'fi-jpg','JPEG':'fi-jpeg','DOC':'fi-doc','DOCX':'fi-docx'}[ext]||'fi-doc';
      /* Download: admin manually unlock করলে সবসময় পারবে
         due=0 হলে auto-unlock হয়, কিন্তু admin manually unlock করলে due থাকলেও পারবে */
      const dlAllowed = row.download_allowed;

      const div = document.createElement('div');
      div.className = 'file-item';

      const revisedBadge = row.isRevision
        ? `<span class="file-revised-badge">🔁 Revised${row.revisionNumber ? ' • Revision #' + row.revisionNumber : ''}</span>`
        : '';

      const actionsHtml = `<button class="file-view-btn cdv-btn"
          data-path="${escHtml(row.storage_path)}"
          data-name="${escHtml(fileName)}"
          data-dl="${dlAllowed ? '1' : '0'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg> View</button>` +
        (dlAllowed
          ? `<button class="file-view-btn cdv-dl-btn" title="Download" data-path="${escHtml(row.storage_path)}" data-name="${escHtml(fileName)}" style="background:rgba(5,150,105,0.15);border-color:rgba(5,150,105,0.4);color:#6ee7b7;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>`
          : `<span class="pdp-lock-icon" title="Download locked" style="font-size:16px;opacity:0.7;cursor:pointer;display:inline-block;" onclick="showPaymentDuePopup(event, '${orderId}')">🔒</span>`);

      div.innerHTML = `
        <div class="file-icon ${iconCls}">${ext}</div>
        <div class="file-info">
          <div class="file-name">${escHtml(fileName)}</div>
          <div class="file-meta">${fmtDate(row.date)}${revisedBadge}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">${actionsHtml}</div>`;

      list.appendChild(div);
    }

    /* Event delegation for view/download buttons — avoids inline onclick quote issues */
    list.querySelectorAll('.cdv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openFileViewer(btn.dataset.path, btn.dataset.name, btn.dataset.dl === '1');
      });
    });
    list.querySelectorAll('.cdv-dl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        downloadFile(btn.dataset.path, btn.dataset.name);
      });
    });

    /* View All Files button */
    const viewAllWrap = document.getElementById('filesViewAllWrap');
    const viewAllCount = document.getElementById('filesViewAllCount');
    if (totalCount > PREVIEW_LIMIT) {
      viewAllWrap.style.display = 'block';
      viewAllCount.textContent = totalCount;
      document.getElementById('filesViewAllBtn').onclick = () => {
        filesPageOrderFilter = orderId;
        loadFilesPage();
        showPage('files');
      };
    } else {
      viewAllWrap.style.display = 'none';
    }
  } catch (e) {
    console.error('loadOrderFiles error:', e);
    list.innerHTML = '<div class="empty-note">Files load হয়নি</div>';
  }
}

async function loadLatestAdminMsg(orderId) {
  const {data:msgs}=await sb.from('messages').select('*').eq('order_id',orderId).eq('sender','admin').order('created_at',{ascending:false}).limit(1);
  const card=document.getElementById('adminMsgCard');
  if(msgs&&msgs.length>0){
    const m=msgs[0];
    card.style.display='block';
    document.getElementById('adminMsgText').textContent=m.message || (m.message_type==='file'?'📄 একটি ফাইল পাঠিয়েছেন':'📷 একটি ছবি পাঠিয়েছেন');
    document.getElementById('goChatBtn').dataset.orderId=orderId;
    document.getElementById('goChatBtn').onclick=()=>{showPage('messages');const sel=document.getElementById('chatOrderSelect');sel.value=orderId;if(typeof window.chatModule!=='undefined'&&window.chatModule.loadChat)window.chatModule.loadChat(orderId);};
  } else { card.style.display='none'; }
}

let filesPageOrderFilter = null;

async function loadFilesPage() {
  if (allOrders.length === 0) return;
  const container = document.getElementById('allFilesList');
  const empty = document.getElementById('filesEmpty');
  if (!container) return;

  container.innerHTML = '';

  /* Filter chip UI (shown when arriving from a specific order's "View All Files") */
  const chip = document.getElementById('filesFilterChip');
  const chipText = document.getElementById('filesFilterChipText');
  const chipClear = document.getElementById('filesFilterChipClear');
  if (filesPageOrderFilter) {
    const fo = allOrders.find(o => String(o.id) === String(filesPageOrderFilter));
    chip.style.display = 'flex';
    chipText.textContent = `শুধু "${fo?.title || 'এই Order'}" এর files দেখানো হচ্ছে`;
    chipClear.onclick = () => { filesPageOrderFilter = null; loadFilesPage(); };
  } else if (chip) {
    chip.style.display = 'none';
  }

  try {
    /* Fetch all visible admin-sent files for this client's orders */
    const orderIds = filesPageOrderFilter
      ? [filesPageOrderFilter]
      : allOrders.map(o => o.id);
    const { data: accessRows, error } = await sb
      .from('order_file_access')
      .select('storage_path, is_visible, download_allowed, uploaded_by, updated_at, order_id')
      .in('order_id', orderIds)
      .eq('is_visible', true)
      .neq('uploaded_by', 'Client'); /* Client নিজের submit করা file এখানে দেখাবে না */

    if (error) throw error;
    if (!accessRows || !accessRows.length) { empty.style.display = 'flex'; return; }
    empty.style.display = 'none';

    /* Group by order_id */
    const grouped = {};
    accessRows.forEach(row => {
      if (!grouped[row.order_id]) grouped[row.order_id] = { files: [] };
      grouped[row.order_id].files.push(row);
    });

    for (const [orderId, group] of Object.entries(grouped)) {
      const order = allOrders.find(o => String(o.id) === String(orderId));
      const hasDue = (order?.due_amount || 0) > 0;
      const title = order?.title || 'Order';

      const groupDiv = document.createElement('div'); groupDiv.className = 'files-group';
      groupDiv.innerHTML = `<div class="files-group-label">${escHtml(title)}</div>`;
      const card = document.createElement('div'); card.className = 'files-card';

      for (const row of group.files) {
        const parts = row.storage_path.split('/');
        const fileName = parts[parts.length - 1];
        const ext = fileName.split('.').pop().toUpperCase();
        const iconCls = ext === 'PDF' ? 'fi-pdf' : 'fi-doc';
        /* Download: admin manually unlock করলে সবসময় পারবে
           due=0 হলে auto-unlock হয়, কিন্তু admin manually unlock করলে due থাকলেও পারবে */
        const dlAllowed = row.download_allowed;

        const item = document.createElement('div'); item.className = 'file-item';
        item.innerHTML =
          `<div class="file-icon ${iconCls}">${ext}</div>` +
          `<div class="file-info"><div class="file-name">${escHtml(fileName)}</div><div class="file-meta">${fmtDate(row.updated_at)}</div></div>` +
          `<div style="display:flex;align-items:center;gap:8px;">
            <button class="file-view-btn cdv-btn" data-path="${escHtml(row.storage_path)}" data-name="${escHtml(fileName)}" data-dl="${dlAllowed ? '1' : '0'}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg> View</button>` +
          (dlAllowed
            ? `<button class="file-view-btn cdv-dl-btn" title="Download" data-path="${escHtml(row.storage_path)}" data-name="${escHtml(fileName)}" style="background:rgba(5,150,105,0.15);border-color:rgba(5,150,105,0.4);color:#6ee7b7;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>`
            : `<span class="pdp-lock-icon" title="Download locked" style="font-size:16px;opacity:0.7;cursor:pointer;display:inline-block;" onclick="showPaymentDuePopup(event, '${orderId}')">🔒</span>`) +
          `</div>`;
        card.appendChild(item);
      }

      card.querySelectorAll('.cdv-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          openFileViewer(btn.dataset.path, btn.dataset.name, btn.dataset.dl === '1');
        });
      });
      card.querySelectorAll('.cdv-dl-btn').forEach(btn => {
        btn.addEventListener('click', () => downloadFile(btn.dataset.path, btn.dataset.name));
      });

      groupDiv.appendChild(card);
      container.appendChild(groupDiv);
    }
  } catch (e) {
    console.error('loadFilesPage error:', e);
    empty.style.display = 'flex';
  }
}

async function loadPaymentsPage() {
  const {data:payments}=await sb.from('payments').select('*, orders(title,order_number)').eq('client_id',currentUser.id).order('id',{ascending:false});
  const container=document.getElementById('paymentsList');
  const empty=document.getElementById('paymentsEmpty');
  if(!payments||payments.length===0){empty.style.display='flex';return;}
  empty.style.display='none'; container.innerHTML='';
  payments.forEach(pay=>{
    const isApproved = pay.confirmed || pay.type === 'received';
    const isRejected = pay.type === 'rejected';
    const cls = isApproved ? 'confirmed' : isRejected ? 'rejected' : 'pending';
    const lbl = isApproved ? 'Confirmed' : isRejected ? 'Rejected' : 'Pending';
    const orderTitle = pay.orders?.title || (pay.orders?.order_number ? '#'+pay.orders.order_number : 'Order');
    const item=document.createElement('div'); item.className=`payment-item pi-${cls}`;
    item.innerHTML=`
      <div class="pi-status-bar"></div>
      <div class="pi-body">
        <div class="pi-top-row">
          <div class="pi-order">${escHtml(orderTitle)}</div>
          <div class="pi-amount">৳${fmt(pay.amount)}</div>
        </div>
        <div class="pi-bottom-row">
          <div class="pi-meta">
            <span class="pi-method-label">${escHtml(pay.method||'—')}</span>
            ${pay.txn_id?`<span class="pi-sep">·</span><span class="pi-txn">TXN: ${escHtml(pay.txn_id)}</span>`:''}
            <span class="pi-sep">·</span>
            <span class="pi-date">${fmtDateLong(pay.paid_at||pay.created_at||'')}</span>
          </div>
          <span class="pay-badge ${cls}">${lbl}</span>
        </div>
      </div>`;
    container.appendChild(item);
  });
}

/* NOTE: the full Messages page (order select, chat box, presence, typing,
   attachments, read receipts) is owned entirely by chat.js now — see
   window.chatModule. The old inline chat implementation that used to live
   here (initChat/loadChat/appendChatMsg/sendChatMessage) has been removed
   because it used an incompatible messages schema and duplicated chat.js. */

function loadProfileData() {
  if(!currentClient) return;
  const firstName=currentClient.first_name||'';
  const lastName=currentClient.last_name||'';
  const name=`${firstName} ${lastName}`.trim()||currentClient.name||'';
  setVal('pFirstName',firstName); setVal('pLastName',lastName);
  setVal('pEmail',currentClient.email||''); setVal('pPhone',currentClient.phone||'');
  const genderEl=document.getElementById('pGender'); if(genderEl) genderEl.value=currentClient.gender||'male';
  setVal('pUniversity',currentClient.university||''); setVal('pSubject',currentClient.subject||'');
  setVal('pYear',currentClient.academic_year||'');
  const av=document.getElementById('profileAvatar');
  if(currentClient.avatar_url){av.innerHTML=`<img src="${currentClient.avatar_url}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;}
  else{av.textContent=getInitials(name);}
  setText('profileAvName',name||'—');
  setText('profileAvSince',`Member since ${fmtDate(currentClient.created_at)}`);
  setText('profileAvOrders',`${allOrders.length} orders`);
}

function initProfile() {
  document.getElementById('profileSaveBtn').addEventListener('click',saveProfile);
  document.getElementById('passChangeBtn').addEventListener('click',changePassword);
  document.getElementById('avatarInput').addEventListener('change',uploadAvatar);
  document.getElementById('logoutBtn').addEventListener('click',logout);
}

async function saveProfile() {
  const btn=document.getElementById('profileSaveBtn');
  const firstName=getVal('pFirstName').trim(), lastName=getVal('pLastName').trim();
  if(!firstName){showProfileMsg('profileMsg','নাম দিন','error');return;}
  btn.textContent='Saving...'; btn.disabled=true;
  const fullName=`${firstName} ${lastName}`.trim();
  const genderVal=document.getElementById('pGender')?.value||'male';
  const {error}=await sb.from('clients').update({name:fullName,first_name:firstName,last_name:lastName,gender:genderVal,phone:getVal('pPhone').trim(),university:getVal('pUniversity').trim(),subject:getVal('pSubject').trim(),academic_year:getVal('pYear').trim()}).eq('id',currentUser.id);
  btn.textContent='Profile Save করুন'; btn.disabled=false;
  if(error){showProfileMsg('profileMsg','Save হয়নি: '+error.message,'error');}
  else{currentClient.name=fullName;currentClient.first_name=firstName;currentClient.last_name=lastName;currentClient.gender=genderVal;localStorage.setItem('scriptora_name',fullName);const sfx=document.getElementById('headerSuffix');if(sfx)sfx.textContent=genderVal==='female'?'আপু':'ভাই';updateSidebarUser();showProfileMsg('profileMsg','✓ Profile save হয়েছে!','success');showToast('Profile update হয়েছে','success');}
}

function togglePassVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  btn.querySelector('.eye-icon').style.display    = isHidden ? 'none' : '';
  btn.querySelector('.eye-off-icon').style.display = isHidden ? ''     : 'none';
}

function checkPassMatch() {
  const newPass = getVal('pNewPass');
  const confirm = getVal('pConfirmPass');
  const indicator = document.getElementById('passMatchIndicator');
  if (!indicator) return;
  if (!confirm) { indicator.style.display = 'none'; return; }
  indicator.style.display = '';
  if (newPass === confirm) {
    indicator.textContent = '✓ Password মিলেছে';
    indicator.style.color = '#10b981';
  } else {
    indicator.textContent = '✗ Password মিলছে না';
    indicator.style.color = '#f87171';
  }
}

async function changePassword() {
  const btn=document.getElementById('passChangeBtn');
  const current=getVal('pCurrentPass'),newPass=getVal('pNewPass'),confirm=getVal('pConfirmPass');
  if(!current||!newPass||!confirm){showProfileMsg('passMsg','সব field পূরণ করুন','error');return;}
  if(newPass.length<8){showProfileMsg('passMsg','কমপক্ষে ৮ অক্ষর হতে হবে','error');return;}
  if(newPass!==confirm){showProfileMsg('passMsg','নতুন password মিলছে না','error');return;}
  btn.textContent='Updating...'; btn.disabled=true;

  /* current password verify করো */
  const {error:signInErr}=await sb.auth.signInWithPassword({email:currentUser.email,password:current});
  if(signInErr){
    showProfileMsg('passMsg','বর্তমান password ভুল','error');
    btn.textContent='Password Update করুন'; btn.disabled=false;
    return;
  }

  const {error}=await sb.auth.updateUser({password:newPass});
  btn.textContent='Password Update করুন'; btn.disabled=false;
  if(error){showProfileMsg('passMsg','Password পরিবর্তন হয়নি: '+error.message,'error');}
  else{
    setVal('pCurrentPass','');setVal('pNewPass','');setVal('pConfirmPass','');
    showProfileMsg('passMsg','✓ Password পরিবর্তন হয়েছে!','success');
    showToast('Password update হয়েছে','success');
  }
}


async function uploadAvatar(e) {
  const file=e.target.files[0];
  if(!file) return;
  if(file.size>2*1024*1024){showToast('File size max 2MB','error');return;}
  showToast('Uploading...');
  const ext=file.name.split('.').pop();
  const path=`avatars/${currentUser.id}.${ext}`;
  const {error:upErr}=await sb.storage.from('scriptora-files').upload(path,file,{upsert:true});
  if(upErr){showToast('Upload হয়নি','error');return;}
  const {data:urlData}=sb.storage.from('scriptora-files').getPublicUrl(path);
  const avatarUrl=urlData.publicUrl;
  await sb.from('clients').update({avatar_url:avatarUrl}).eq('id',currentUser.id);
  currentClient.avatar_url=avatarUrl;
  localStorage.setItem('scriptora_avatar', avatarUrl);
  const avImg=`<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
  document.getElementById('sbAvatar').innerHTML=avImg;
  document.getElementById('profileAvatar').innerHTML=avImg;
  showToast('Avatar update হয়েছে!','success');
}

async function logout() {
  await sb.auth.signOut();
  ['scriptora_client_id','scriptora_name','scriptora_email','scriptora_role'].forEach(k=>localStorage.removeItem(k));
  window.location.href=LOGIN_PATH;
}

const STATUS_LABELS_CLIENT = {
  'writing':     'In Progress — লেখা চলছে',
  'completed':   'Completed — সম্পন্ন হয়েছে ✓',
  'pending':     'Pending — অপেক্ষায় আছে',
  'draft_ready': 'Waiting for Review — ফাইল দেখুন এবং সিদ্ধান্ত নিন',
  'overdue':     'Overdue — সময় পার হয়ে গেছে',
  'hold':        'On Hold — বিরতিতে আছে',
  'delivered':   'Final Delivery — ফাইল দেখুন এবং সিদ্ধান্ত নিন',
};

function setupRealtime() {
  /* Order status change */
  const orderSub = sb.channel('orders-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `client_id=eq.${currentUser.id}`
    }, async payload => {
      const oldStatus = payload.old?.status;
      const newStatus = payload.new?.status;
      const label = STATUS_LABELS_CLIENT[newStatus] || newStatus;

      await loadOrders();
      if (currentOrderId && payload.new?.id === currentOrderId) {
        openOrderDetail(currentOrderId);
      }

      /* Status change → no toast (bell notification handles this), শুধু visual feedback */
      if (oldStatus !== newStatus) {
        /* Order confirmed → show popup */
        if (newStatus === 'confirmed' && oldStatus !== 'confirmed') {
          const confirmedOrder = allOrders.find(o => o.id === payload.new?.id) || payload.new;
          setTimeout(() => showConfirmPopup(confirmedOrder), 500);
        }
        /* Flash the active order card */
        const orderId = payload.new?.id;
        if (orderId) {
          setTimeout(() => {
            const cards = document.querySelectorAll('.order-card, .order-list-item');
            cards.forEach(c => {
              if (c.dataset.orderId === orderId || c.onclick?.toString().includes(orderId)) {
                c.style.transition = 'box-shadow 0.3s';
                c.style.boxShadow = '0 0 0 2px #6366f1';
                setTimeout(() => c.style.boxShadow = '', 2000);
              }
            });
          }, 300);
        }
      }
      /* No toast for non-status updates (progress, etc.) */
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'orders',
      filter: `client_id=eq.${currentUser.id}`
    }, async () => {
      await loadOrders();
    })
    .subscribe();
  realtimeSubs.push(orderSub);

  /* Realtime payments — when admin approves, refresh order detail */
  const paymentSub = sb.channel('client-payments-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'payments',
    }, async payload => {
      /* Only care if this payment belongs to one of our orders */
      const myOrderIds = allOrders.map(o => String(o.id));
      if (!myOrderIds.includes(String(payload.new?.order_id))) return;

      if (payload.new?.confirmed === true && payload.old?.confirmed === false) {
        /* Payment just got approved — reload orders and refresh detail */
        await loadOrders();
        if (currentOrderId && String(payload.new.order_id) === String(currentOrderId)) {
          openOrderDetail(currentOrderId);
        }
      } else if (currentOrderId && String(payload.new?.order_id) === String(currentOrderId)) {
        /* Any other payment row change (e.g. rejection) for the open order — refresh history */
        await renderClientPaymentHistory(currentOrderId);
      }
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'payments',
    }, async payload => {
      const myOrderIds = allOrders.map(o => String(o.id));
      if (!myOrderIds.includes(String(payload.new?.order_id))) return;
      if (currentOrderId && String(payload.new?.order_id) === String(currentOrderId)) {
        await renderClientPaymentHistory(currentOrderId);
      }
    })
    .subscribe();
  realtimeSubs.push(paymentSub);

  /* Realtime unread message badge from admin */
  const msgSub = sb.channel('client-messages-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `from_admin=eq.true`
    }, async payload => {
      /* Check if this message belongs to current user's orders */
      const myOrderIds = allOrders.map(o => o.id);
      if (!myOrderIds.includes(payload.new?.order_id)) return;

      updateMsgBadge(1);
    })
    .subscribe();
  realtimeSubs.push(msgSub);

  /* Realtime file notification — admin যখন file visible করবে */
  const fileSub = sb.channel('client-files-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'order_file_access'
    }, async payload => {
      /* শুধু তখনই notify করবো যখন is_visible true হবে (admin send করবে) */
      if (!payload.new?.is_visible || payload.old?.is_visible === true) return;
      /* Client নিজের upload করা file এর জন্য notification দরকার নেই */
      if (payload.new?.uploaded_by === 'Client') return;
      /* Check if this belongs to current user's orders */
      const myOrderIds = allOrders.map(o => String(o.id));
      if (!myOrderIds.includes(String(payload.new?.order_id))) return;
      const path = payload.new?.storage_path || '';
      /* Files page reload করো যদি open থাকে */
      await loadFilesPage();
      /* Order detail open থাকলে সেখানেও reload */
      if (currentOrderId && String(payload.new?.order_id) === String(currentOrderId)) {
        const order = allOrders.find(o => String(o.id) === String(currentOrderId));
        await loadOrderFiles(currentOrderId, (order?.due_amount || 0) > 0);
      }
    })
    .subscribe();
  realtimeSubs.push(fileSub);

  /* Realtime revisions — admin accept/start/ready/clarify updates,
     and admin-uploaded revision files, reflect instantly for the client. */
  const revSub = sb.channel('client-revisions-realtime')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'revisions',
    }, async payload => {
      const myOrderIds = allOrders.map(o => String(o.id));
      if (!myOrderIds.includes(String(payload.new?.order_id))) return;
      if (currentOrderId && String(payload.new?.order_id) === String(currentOrderId)) {
        const order = allOrders.find(o => String(o.id) === String(currentOrderId));
        if (order && window.initRevisionCenter) await window.initRevisionCenter(order);
        if (window.renderClientRevisionHistory) await window.renderClientRevisionHistory(currentOrderId);
        if (order) await renderDeliveryReviewBanner(order);
        /* Status change (e.g. in_progress → ready_for_review) can flip
           whether an already-uploaded file is now visible — refresh My Files too. */
        if (order) await loadOrderFiles(currentOrderId, (order.due_amount || 0) > 0);
      }
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'revisions',
    }, async payload => {
      const myOrderIds = allOrders.map(o => String(o.id));
      if (!myOrderIds.includes(String(payload.new?.order_id))) return;
      if (currentOrderId && String(payload.new?.order_id) === String(currentOrderId)) {
        const order = allOrders.find(o => String(o.id) === String(currentOrderId));
        if (order && window.initRevisionCenter) await window.initRevisionCenter(order);
        if (window.renderClientRevisionHistory) await window.renderClientRevisionHistory(currentOrderId);
        if (order) await renderDeliveryReviewBanner(order);
      }
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'revision_files',
    }, async payload => {
      /* Admin-uploaded revision file → refresh My Files + revision center */
      if (payload.new?.uploaded_by !== 'admin') return;
      const myOrderIds = allOrders.map(o => String(o.id));
      if (!myOrderIds.includes(String(payload.new?.order_id))) return;
      if (currentOrderId && String(payload.new?.order_id) === String(currentOrderId)) {
        const order = allOrders.find(o => String(o.id) === String(currentOrderId));
        await loadOrderFiles(currentOrderId, (order?.due_amount || 0) > 0);
        if (order && window.initRevisionCenter) await window.initRevisionCenter(order);
      }
    })
    .subscribe();
  realtimeSubs.push(revSub);
}

function updateMsgBadge(n) {
  const badge=document.getElementById('msgBadge');
  badge.textContent=parseInt(badge.textContent||'0')+n;
  badge.style.display='inline';
}

function initNav() {
  document.querySelectorAll('.sb-item').forEach(item=>{
    item.addEventListener('click',e=>{
      e.preventDefault();

      // Ripple effect
      const ripple = document.createElement('span');
      ripple.classList.add('sb-ripple-span');
      const rect = item.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      item.appendChild(ripple);
      setTimeout(() => ripple.remove(), 850);

      const page=item.dataset.page;
      if(page==='files' && filesPageOrderFilter){ filesPageOrderFilter=null; loadFilesPage(); }
      if(page==='orders'){ ordersPageFilter='all'; renderOrdersPage(); }
      showPage(page,item);
      if(page==='messages'){const b=document.getElementById('msgBadge');b.textContent='0';b.style.display='none';}
    });
  });

  document.querySelectorAll('.mbn-item').forEach(item=>{
    item.addEventListener('click',e=>{
      e.preventDefault();

      // Ripple effect
      const ripple = document.createElement('span');
      ripple.classList.add('sb-ripple-span');
      const rect = item.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
      item.appendChild(ripple);
      setTimeout(() => ripple.remove(), 850);

      const page=item.dataset.page;
      if(page==='files' && filesPageOrderFilter){ filesPageOrderFilter=null; loadFilesPage(); }
      if(page==='orders'){ ordersPageFilter='all'; renderOrdersPage(); }
      showPage(page);
      if(page==='messages'){const b=document.getElementById('msgBadge');b.textContent='0';b.style.display='none';}
    });
  });
  document.querySelectorAll('.section-view-all').forEach(link=>{
    link.addEventListener('click',e=>{
      e.preventDefault();
      const page=link.dataset.page;
      ordersPageFilter=link.dataset.filter||'all';
      showPage(page);
      renderOrdersPage();
    });
  });
}

/* ── AFFILIATE STATE ─────────────────────────────────────────── */
let _affStateLoaded = false; /* একবার load হলে আর reload দরকার নেই, unless forced */
let _currentAffiliateId = null;

async function loadAffiliateState(force = false) {
  if (_affStateLoaded && !force) return;

  const show = id => {
    ['aff-loading','aff-cta','aff-pending','aff-approved','aff-suspended'].forEach(s => {
      const el = document.getElementById(s);
      if (el) el.style.display = (s === id) ? (id === 'aff-loading' ? 'flex' : 'block') : 'none';
    });
  };

  show('aff-loading');

  try {
    /* 1. Affiliate record আছে কিনা দেখো (approved হলে থাকবে) */
    const { data: aff } = await sb
      .from('affiliates')
      .select('id, referral_code, status, suspended_reason')
      .eq('client_id', currentUser.id)
      .maybeSingle();

    if (aff && aff.status === 'active') {
      const codeEl = document.getElementById('affReferralCode');
      if (codeEl) codeEl.textContent = aff.referral_code;
      _currentAffiliateId = aff.id;
      show('aff-approved');
      _affStateLoaded = true;
      loadAffiliateEarnings(aff.id);
      loadAffiliateWithdrawals(aff.id);
      loadAffiliateMyReferrals(); /* Phase 18 */
      loadAffiliateStats();
      loadAffiliateReferredOrders(); /* Step 3 */
      initAffiliateShareKit(aff.referral_code); /* Phase 9 */
      loadAffiliatePayoutSettings(); /* Phase 10 */
      return;
    }

    /* Phase 13: Suspended affiliate — show a clear status instead of the
       "Apply" CTA (which would wrongly imply they never applied) */
    if (aff && aff.status === 'suspended') {
      const reasonEl = document.getElementById('affSuspendedReason');
      if (reasonEl) reasonEl.textContent = aff.suspended_reason || 'বিস্তারিত জানতে Support-এ যোগাযোগ করুন।';
      show('aff-suspended');
      _affStateLoaded = true;
      return;
    }

    /* 2. Application আছে কিনা দেখো */
    const { data: app } = await sb
      .from('affiliate_applications')
      .select('id, status')
      .eq('client_id', currentUser.id)
      .in('status', ['pending', 'approved'])
      .maybeSingle();

    if (app && app.status === 'pending') {
      show('aff-pending');
      _affStateLoaded = true;
      return;
    }

    /* 3. কিছুই নেই — Apply CTA দেখাও */
    show('aff-cta');
    _affStateLoaded = true;

  } catch (err) {
    console.error('[Affiliate] loadAffiliateState error:', err);
    show('aff-cta'); /* error হলেও loading এ আটকে না রেখে CTA দেখাও */
  }
}

async function affiliateApply() {
  const btn = document.getElementById('affApplyBtn');
  const msg = document.getElementById('affApplyMsg');
  if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; }
  if (msg) { msg.textContent = ''; msg.className = 'profile-msg'; }

  try {
    const { error } = await sb
      .from('affiliate_applications')
      .insert({ client_id: currentUser.id, status: 'pending' });

    if (error) {
      /* Unique constraint violation — already applied */
      if (error.code === '23505') {
        if (msg) { msg.textContent = 'আপনার আবেদন ইতিমধ্যে জমা আছে।'; msg.className = 'profile-msg'; }
      } else {
        throw error;
      }
    }

    /* Reload state to show pending UI */
    _affStateLoaded = false;
    await loadAffiliateState();

  } catch (err) {
    console.error('[Affiliate] apply error:', err);
    if (msg) { msg.textContent = 'সমস্যা হয়েছে। আবার চেষ্টা করুন।'; msg.className = 'profile-msg error'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Apply করুন'; }
  }
}

function affiliateCopyCode() {
  const code = document.getElementById('affReferralCode')?.textContent || '';
  if (!code || code === '—') return;
  navigator.clipboard.writeText(code).then(() => {
    const msg = document.getElementById('affCopyMsg');
    if (msg) { msg.style.opacity = '1'; setTimeout(() => { msg.style.opacity = '0'; }, 1800); }
  }).catch(() => {
    /* Fallback for older browsers */
    const ta = document.createElement('textarea');
    ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    const msg = document.getElementById('affCopyMsg');
    if (msg) { msg.style.opacity = '1'; setTimeout(() => { msg.style.opacity = '0'; }, 1800); }
  });
}

/* ── AFFILIATE SHARE & EARN KIT (Phase 9) ────────────────────── */
let _affReferralUrl = '';

function affiliateReferralUrlFor(code) {
  /* Actual production origin — never hardcoded */
  return window.location.origin + '/Pricing page/pricing.html?ref=' + encodeURIComponent(code);
}


function initAffiliateShareKit(code) {
  if (!code) return;
  _affReferralUrl = affiliateReferralUrlFor(code);

  const linkEl = document.getElementById('affReferralLink');
  if (linkEl) linkEl.value = _affReferralUrl;

  if (navigator.share) {
    const nativeBtn = document.getElementById('affNativeShareBtn');
    if (nativeBtn) nativeBtn.style.display = 'flex';
  }

  affiliateGenerateQr(_affReferralUrl);
}


function affiliateCopyLink() {
  if (!_affReferralUrl) return;
  const btn = document.querySelector('.aff-share-iconbtn');
  const label = document.getElementById('affLinkCopyLabel');
  const done = () => {
    if (label) label.textContent = 'Copied!';
    if (btn) btn.classList.add('copied');
    setTimeout(() => { if (label) label.textContent = 'Copy Link'; if (btn) btn.classList.remove('copied'); }, 1800);
  };
  navigator.clipboard.writeText(_affReferralUrl).then(done).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = _affReferralUrl; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  });
}

function affiliateShareWhatsApp() {
  if (!_affReferralUrl) return;
  const text = `Opascript-এ professional academic writing help পাবেন — দেখে নিন:\n${_affReferralUrl}`;
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
}

function affiliateShareFacebook() {
  if (!_affReferralUrl) return;
  window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(_affReferralUrl), '_blank', 'noopener');
}

function affiliateNativeShare() {
  if (!_affReferralUrl || !navigator.share) return;
  navigator.share({
    title: 'Opascript — Academic Writing Help',
    text: 'Opascript-এ professional academic writing help পাবেন:',
    url: _affReferralUrl
  }).catch(() => {});
}

function affiliateGenerateQr(url) {
  const box = document.getElementById('affQrBox');
  if (!box || typeof QRCode === 'undefined') return;
  box.innerHTML = '';
  const canvas = document.createElement('canvas');
  box.appendChild(canvas);
  QRCode.toCanvas(canvas, url, { width: 176, margin: 1 }, err => {
    if (err) console.error('[Affiliate] QR generation error:', err);
  });
}

function affiliateDownloadQr() {
  const canvas = document.querySelector('#affQrBox canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  const code = document.getElementById('affReferralCode')?.textContent || 'referral';
  link.download = `opascript-referral-${code}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ── AFFILIATE PAYOUT SETTINGS (Phase 10) ────────────────────── */
let _affPayoutMaskedNumber = '';

async function loadAffiliatePayoutSettings() {
  try {
    const { data, error } = await sb.rpc('get_affiliate_payout_settings');
    if (error || !data?.success || !data.settings) return;

    const s = data.settings;
    const methodEl = document.getElementById('affWithdrawMethod');
    const numberEl = document.getElementById('affWithdrawNumber');
    const nameEl   = document.getElementById('affWithdrawName');

    if (methodEl) methodEl.value = s.payment_method;
    if (numberEl) numberEl.value = s.payment_number;
    if (nameEl && s.payment_name) nameEl.value = s.payment_name;

    _affPayoutMaskedNumber = s.payment_number.length > 4
      ? '•••' + s.payment_number.slice(-4)
      : s.payment_number;

    const row = document.getElementById('affPayoutSavedRow');
    const summary = document.getElementById('affPayoutSavedSummary');
    if (summary) summary.textContent = `${s.payment_method.toUpperCase()} — ${_affPayoutMaskedNumber}`;
    if (row) row.style.display = 'flex';

  } catch (err) {
    console.error('[Affiliate] loadAffiliatePayoutSettings error:', err);
  }
}

function affiliateEditPayoutSettings() {
  const row = document.getElementById('affPayoutSavedRow');
  if (row) row.style.display = 'none';
  const numberEl = document.getElementById('affWithdrawNumber');
  if (numberEl) { numberEl.value = ''; numberEl.focus(); }
}

async function saveAffiliatePayoutSettingsIfRequested(method, number, name) {
  const checkbox = document.getElementById('affSavePayoutCheckbox');
  if (!checkbox || !checkbox.checked) return;
  try {
    await sb.rpc('save_affiliate_payout_settings', {
      p_payment_method: method,
      p_payment_number: number,
      p_payment_name: name || null,
    });
    loadAffiliatePayoutSettings();
  } catch (err) {
    console.error('[Affiliate] saveAffiliatePayoutSettings error:', err);
  }
}

/* ── AFFILIATE EARNINGS ──────────────────────────────────────── */
async function loadAffiliateEarnings(affiliateId) {
  const earningsEl  = document.getElementById('affEarningsTotal');
  const availableEl = document.getElementById('affAvailableBalance');
  const pendingEl   = document.getElementById('affEarningsPending');
  const tbodyEl     = document.getElementById('affCommTbody');
  const withdrawSec = document.getElementById('affWithdrawSection');
  const pendingNote = document.getElementById('affWithdrawPendingNotice');

  if (earningsEl)  earningsEl.textContent  = '…';
  if (availableEl) availableEl.textContent = '…';
  if (pendingEl)   pendingEl.textContent   = '…';
  if (tbodyEl) tbodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">লোড হচ্ছে…</td></tr>';

  try {
    const { data: wallet, error: wErr } = await sb.rpc('get_affiliate_wallet');
    if (wErr) throw wErr;
    if (wallet?.success === false) throw new Error(wallet.message || 'Wallet load failed');

    const fmt = n => '৳' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (earningsEl)  earningsEl.textContent  = fmt(wallet.total_earned);
    if (availableEl) availableEl.textContent = fmt(wallet.available_balance);
    if (pendingEl)   pendingEl.textContent   = fmt(wallet.pending_withdrawal);

    // Draw sparklines after values are set
    setTimeout(initEarningSparklines, 50);

    /* Phase 26: single RPC replaces the old raw affiliate_commissions + orders
       queries — the old direct `orders` query was silently blocked by RLS for
       affiliates (returned nothing), and affiliate_commissions.paid_amount was
       a frozen snapshot from when the row was first created. This RPC joins
       server-side and returns live order status + live paid amount. */
    const { data: comms, error } = await sb.rpc('get_my_affiliate_commissions');

    if (error) throw error;

    /* Show/hide withdrawal form based on balance & pending requests */
    const { data: openReq } = await sb
      .from('affiliate_withdrawals')
      .select('id, amount, status, payment_method, requested_at')
      .eq('affiliate_id', affiliateId)
      .in('status', ['pending', 'approved'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openReq) {
      if (withdrawSec) withdrawSec.style.display = 'none';
      if (pendingNote) {
        pendingNote.style.display = 'block';
        const stLabel = openReq.status === 'approved' ? 'Approved — payout pending' : 'Pending admin review';
        const dt = openReq.requested_at
          ? new Date(openReq.requested_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
          : '—';
        document.getElementById('affWithdrawPendingText').textContent =
          `${fmt(openReq.amount)} (${openReq.payment_method}) — ${stLabel} · ${dt}`;
      }
    } else {
      if (pendingNote) pendingNote.style.display = 'none';
      if (withdrawSec) {
        withdrawSec.style.display = Number(wallet.available_balance) >= 500 ? 'flex' : 'none';
      }
    }

    /* Commission history table */
    if (!tbodyEl) return;

    if (!comms || comms.length === 0) {
      tbodyEl.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;padding:28px 12px;">
            <div style="color:var(--text-muted);font-size:12px;font-family:'Noto Sans Bengali',sans-serif;">
              এখনো কোনো commission নেই। আপনার referral code শেয়ার করুন।
            </div>
          </td>
        </tr>`;
      return;
    }

    tbodyEl.innerHTML = comms.map(c => {
      const orderNum   = c.order_number || c.order_id?.slice(0, 8).toUpperCase() || '—';
      const date       = c.created_at
        ? new Date(c.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
        : '—';

      const totalAmt   = Number(c.total_amount  || 0);
      const paidAmt    = Number(c.paid_amount   || 0);
      const commAmt    = Number(c.commission_amount || 0);
      const paidPct    = totalAmt > 0 ? Math.min(100, Math.round(paidAmt / totalAmt * 100)) : 0;
      const dueAmt     = Math.max(0, totalAmt - paidAmt);

      const fmtAmt = n => '৳' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

      const statusMap = {
        earned:    { color: '#34d399', label: 'Earned' },
        withdrawn: { color: '#a78bfa', label: 'Withdrawn' },
        pending:   { color: '#f59e0b', label: 'Pending' },
        cancelled: { color: '#f87171', label: 'Cancelled' },
      };
      const st = statusMap[c.commission_status] || { color: 'var(--text-muted)', label: c.commission_status };

      const isPending = c.commission_status === 'pending';

      /* Order status label */
      const orderStatusMap = {
        pending:         { color: '#94a3b8', label: 'Payment Pending' },
        confirmed:       { color: '#60a5fa', label: 'Confirmed' },
        payment_received:{ color: '#60a5fa', label: 'Payment Received' },
        payment_done:    { color: '#60a5fa', label: 'Payment Done' },
        hold:            { color: '#f87171', label: 'On Hold' },
        writing:         { color: '#a78bfa', label: 'In Progress' },
        in_review:       { color: '#f59e0b', label: 'In Review' },
        draft_ready:     { color: '#fb923c', label: 'Draft Ready' },
        delivered:       { color: '#38bdf8', label: 'Delivered' },
        completed:       { color: '#34d399', label: 'Completed' },
        cancelled:       { color: '#f87171', label: 'Cancelled' },
      };
      const orderStatus = c.order_status || '';
      const oSt = orderStatusMap[orderStatus] || { color: '#94a3b8', label: orderStatus };

      /* Pending row — just percentage */
      const progressBar = isPending ? `
        <div style="margin-top:4px;font-size:10px;color:#f59e0b;font-weight:600;">
          ${paidPct}% paid &nbsp;·&nbsp; Due ${fmtAmt(dueAmt)}
        </div>` : '';

      /* Commission display — while pending, show only the portion actually
         "earned" so far (proportional to what the client has paid), not the
         full commission the order would eventually be worth. */
      const proportionalComm = totalAmt > 0 ? (commAmt * paidAmt / totalAmt) : 0;
      const commDisplay = isPending
        ? `<span style="color:#f59e0b;font-weight:700;">${fmtAmt(proportionalComm)}</span>
           <span style="color:var(--text-muted);font-size:11px;"> of ${fmtAmt(commAmt)}</span>
           <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">প্রত্যাশিত (${paidPct}% paid)</div>`
        : `<span style="color:#34d399;font-weight:700;">${fmtAmt(commAmt)}</span>`;

      /* Status column */
      const statusColor = isPending ? oSt.color : st.color;
      const statusLabel = isPending ? (oSt.label || orderStatus || 'In Progress') : st.label;
      const statusCell = `<span style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;display:inline-block;background:rgba(255,255,255,0.07);color:${statusColor};">${statusLabel}</span>`;

      return `
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px 8px;font-size:12px;font-weight:600;color:var(--accent-light);font-family:'Sora',monospace;">${orderNum}</td>
          <td style="padding:10px 8px;font-size:11px;color:var(--text-muted);">${date}</td>
          <td style="padding:10px 8px;font-size:12px;color:var(--text-secondary);">
            ${fmtAmt(totalAmt)}
            ${progressBar}
          </td>
          <td style="padding:10px 8px;font-size:12px;">${commDisplay}</td>
          <td style="padding:10px 8px;">${statusCell}</td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[Affiliate] loadAffiliateEarnings error:', err);
    if (earningsEl)  earningsEl.textContent  = '—';
    if (availableEl) availableEl.textContent = '—';
    if (pendingEl)   pendingEl.textContent   = '—';
    if (tbodyEl) tbodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Earnings load করতে সমস্যা হয়েছে।</td></tr>';
  }
}

async function loadAffiliateWithdrawals(affiliateId) {
  const tbody = document.getElementById('affWithdrawTbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">লোড হচ্ছে…</td></tr>';

  try {
    const { data: rows, error } = await sb
      .from('affiliate_withdrawals')
      .select('id, amount, status, payment_method, payment_number, requested_at, paid_at')
      .eq('affiliate_id', affiliateId)
      .order('requested_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    /* Earnings Overview "Total Withdrawn" card — derived client-side from
       the withdrawal rows already fetched above (status = paid), no new
       query or business logic added. */
    const totalWithdrawnEl = document.getElementById('affTotalWithdrawn');
    if (totalWithdrawnEl) {
      const paidSum = (rows || []).filter(w => w.status === 'paid')
        .reduce((sum, w) => sum + Number(w.amount || 0), 0);
      totalWithdrawnEl.textContent = '৳' + paidSum.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      setTimeout(() => drawEarningSparkline('sparkWithdrawn', '#a78bfa'), 50);
    }

    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px;">কোনো withdrawal request নেই।</td></tr>';
      return;
    }

    const statusMap = {
      pending:  { color: '#f59e0b', label: 'Pending' },
      approved: { color: '#60a5fa', label: 'Approved' },
      rejected: { color: '#f87171', label: 'Rejected' },
      paid:     { color: '#34d399', label: 'Paid' },
    };

    tbody.innerHTML = rows.map(w => {
      const st = statusMap[w.status] || { color: 'var(--text-muted)', label: w.status };
      const dt = w.requested_at
        ? new Date(w.requested_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
        : '—';
      const amt = '৳' + Number(w.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const method = (w.payment_method || '—').toUpperCase();
      const cancelBtn = w.status === 'pending'
        ? `<button onclick="affiliateCancelWithdrawal('${w.id}')"
                   style="margin-top:4px;font-size:10px;font-weight:600;color:#f87171;background:rgba(248,113,113,.1);
                          border:1px solid rgba(248,113,113,.25);border-radius:6px;padding:2px 8px;cursor:pointer;
                          display:block;transition:background .2s;"
                   onmouseover="this.style.background='rgba(248,113,113,.2)'"
                   onmouseout="this.style.background='rgba(248,113,113,.1)'">
             বাতিল করুন
           </button>`
        : '';
      return `
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px 8px;font-size:11px;color:var(--text-muted);">${dt}</td>
          <td style="padding:10px 8px;font-size:12px;font-weight:700;color:#34d399;">${amt}</td>
          <td style="padding:10px 8px;font-size:11px;color:var(--text-secondary);">${method}</td>
          <td style="padding:10px 8px;">
            <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;background:${st.color}20;color:${st.color};">${st.label}</span>
            ${cancelBtn}
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[Affiliate] loadAffiliateWithdrawals error:', err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Withdrawal history load করতে সমস্যা হয়েছে।</td></tr>';
  }
}

/* ── Earnings Overview Sparklines ────────────────────────────── */
function drawEarningSparkline(canvasId, color, _retries) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const W    = rect.width || canvas.parentElement?.clientWidth || 0;

  // Card is still hidden (e.g. Affiliate tab not open yet) — measuring now
  // would lock the canvas to a wrong, narrow width via the inline style
  // below. Wait for real layout instead of falling back to a guessed width.
  if (W < 20) {
    const tries = _retries || 0;
    if (tries < 20) {
      requestAnimationFrame(() => drawEarningSparkline(canvasId, color, tries + 1));
    }
    return;
  }

  const ctx  = canvas.getContext('2d');
  const dpr  = window.devicePixelRatio || 1;
  const H    = 36;

  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  // Raw data: gentle upward trend + organic noise (0–1 range)
  const pts  = 24;
  const raw  = [];
  let   v    = 0.3 + Math.random() * 0.1;
  for (let i = 0; i < pts; i++) {
    v = Math.max(0.08, Math.min(0.92, v + (Math.random() - 0.44) * 0.14 + 0.012));
    raw.push(v);
  }

  // Map to pixel coords — use full height range with small padding
  const padL = 2, padR = 8, padT = 6, padB = 4;
  const drawW = W - padL - padR;
  const drawH = H - padT - padB;
  const minV  = Math.min(...raw);
  const maxV  = Math.max(...raw);
  const span  = maxV - minV || 0.01;

  const toX = i => padL + (i / (pts - 1)) * drawW;
  const toY = v => padT + (1 - (v - minV) / span) * drawH;

  const points = raw.map((v, i) => ({ x: toX(i), y: toY(v) }));

  // --- Gradient area fill ---
  const grad = ctx.createLinearGradient(0, padT, 0, H);
  grad.addColorStop(0,   color + '55');
  grad.addColorStop(0.5, color + '22');
  grad.addColorStop(1,   color + '00');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < pts; i++) {
    const cx = (points[i - 1].x + points[i].x) / 2;
    ctx.bezierCurveTo(cx, points[i-1].y, cx, points[i].y, points[i].x, points[i].y);
  }
  ctx.lineTo(points[pts-1].x, H);
  ctx.lineTo(points[0].x, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // --- Stroke line ---
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < pts; i++) {
    const cx = (points[i - 1].x + points[i].x) / 2;
    ctx.bezierCurveTo(cx, points[i-1].y, cx, points[i].y, points[i].x, points[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();

  // --- End dot: glow ring → dark ring → colour fill ---
  const ex = points[pts-1].x;
  const ey = points[pts-1].y;

  ctx.beginPath();
  ctx.arc(ex, ey, 6, 0, Math.PI * 2);
  ctx.fillStyle = color + '28';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#0f1c38';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function initEarningSparklines() {
  drawEarningSparkline('sparkTotal',     '#34d399');
  drawEarningSparkline('sparkBalance',   '#60a5fa');
  drawEarningSparkline('sparkPending',   '#f59e0b');
  drawEarningSparkline('sparkWithdrawn', '#a78bfa');
}

/* ── Shared avatar helper (Top Affiliates + My Referrals) ────── */
const AFFD_AVATAR_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2'];
function affdAvatarColor(name) {
  let hash = 0;
  const s = name || '';
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return AFFD_AVATAR_COLORS[hash % AFFD_AVATAR_COLORS.length];
}
function affdInitial(name) { return (name || '?').trim().charAt(0).toUpperCase(); }
function affdAvatarHtml(name, size) {
  size = size || 26;
  return `<div style="flex-shrink:0;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;
               font-size:${Math.round(size*0.42)}px;font-weight:700;color:#fff;background:${affdAvatarColor(name)};">${affdInitial(name)}</div>`;
}

/* ── "View All" expand/collapse for leaderboard + tables ─────── */
document.addEventListener('click', e => {
  const link = e.target.closest('.affd-view-all');
  if (!link) return;
  e.preventDefault();
  const target = document.getElementById(link.dataset.target);
  if (!target) return;
  const expanded = target.classList.toggle('affd-expanded');
  link.textContent = expanded ? 'Show Less' : 'View All';
});

/* ── Phase 18: Affiliate self-service referral tracking ─────── */
async function loadAffiliateMyReferrals() {
  const tbody = document.getElementById('affMyReferralsTbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">লোড হচ্ছে…</td></tr>';

  try {
    const { data: rows, error } = await sb.rpc('get_my_affiliate_referrals');
    if (error) throw error;

    if (!rows || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;padding:28px 12px;">
            <div style="color:var(--text-muted);font-size:12px;font-family:'Noto Sans Bengali',sans-serif;">
              এখনো কেউ আপনার কোড দিয়ে join করেনি। আপনার referral link শেয়ার করুন।
            </div>
          </td>
        </tr>`;
      return;
    }

    /* বেশি order করা referral উপরে দেখানোর জন্য sort */
    const sortedRows = [...rows].sort((a, b) => (Number(b.order_count || 0)) - (Number(a.order_count || 0)));

    tbody.innerHTML = sortedRows.map(r => {
      const dt = r.registered_at
        ? new Date(r.registered_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
        : '—';
      const orderCount = Number(r.order_count || 0);
      const converted  = orderCount > 0;
      const st = converted
        ? { color: '#34d399', label: 'Converted' }
        : { color: 'var(--text-muted)', label: 'Registered' };

      return `
        <tr class="affd-ref-row">
          <td class="affd-ref-name-cell">
            <div class="affd-ref-name-wrap">
              ${affdAvatarHtml(r.client_name, 34)}
              <div style="min-width:0;">
                <div class="affd-ref-name">${escHtml(r.client_name || '—')}</div>
                ${r.client_email ? `<div class="affd-ref-email">${escHtml(r.client_email)}</div>` : ''}
              </div>
            </div>
          </td>
          <td class="affd-ref-joined">${dt}</td>
          <td class="affd-ref-orders">${orderCount}<span class="affd-ref-orders-lbl">Orders</span></td>
          <td>
            <span class="affd-ref-status" style="background:${st.color}22;color:${st.color};">${st.label}</span>
          </td>
        </tr>`;
    }).join('');

  } catch (err) {
    console.error('[Affiliate] loadAffiliateMyReferrals error:', err);
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Referral list load করতে সমস্যা হয়েছে।</td></tr>';
  }
}

/* ── Phase 15: Affiliate self-cancel pending withdrawal ─────── */
async function affiliateCancelWithdrawal(withdrawalId) {
  if (!confirm('এই Withdrawal Request বাতিল করবেন?\n\nটাকা আপনার balance-এ ফেরত যাবে।')) return;

  try {
    const { data, error } = await sb.rpc('affiliate_cancel_withdrawal', {
      p_withdrawal_id: withdrawalId
    });
    if (error) throw error;
    if (data?.success === false) {
      alert('❌ ' + (data.message || 'Cancel করা যায়নি।'));
      return;
    }

    /* Refresh withdrawal list + earnings panel */
    const affId = data?.affiliate_id || null;
    if (affId) {
      await loadAffiliateWithdrawals(affId);
      await loadAffiliateEarnings(affId);
    } else {
      /* Fallback: reload the whole affiliate section */
      loadAffiliateSection?.();
    }

    /* Show inline toast */
    const msg = document.getElementById('affWithdrawMsg');
    if (msg) {
      msg.textContent = '✅ Withdrawal Request বাতিল হয়েছে। Balance ফেরত দেওয়া হয়েছে।';
      msg.style.color = '#34d399';
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 4000);
    }

  } catch (err) {
    console.error('[Affiliate] cancelWithdrawal error:', err);
    alert('❌ ' + (err.message || 'Cancel করতে সমস্যা হয়েছে।'));
  }
}

async function affiliateRequestWithdrawal() {
  const btn    = document.getElementById('affWithdrawBtn');
  const msgEl  = document.getElementById('affWithdrawMsg');
  const amount = parseFloat(document.getElementById('affWithdrawAmount')?.value || '0');
  const method = document.getElementById('affWithdrawMethod')?.value || '';
  const number = document.getElementById('affWithdrawNumber')?.value?.trim() || '';
  const name   = document.getElementById('affWithdrawName')?.value?.trim() || '';

  if (msgEl) { msgEl.textContent = ''; msgEl.className = 'profile-msg'; }

  if (!amount || amount < 500) {
    if (msgEl) { msgEl.textContent = 'Minimum withdrawal ৳500'; msgEl.className = 'profile-msg error'; }
    return;
  }
  if (!number || number.replace(/\s/g, '').length < 11) {
    if (msgEl) { msgEl.textContent = 'Valid account number দিন'; msgEl.className = 'profile-msg error'; }
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  try {
    const { data, error } = await sb.rpc('request_affiliate_withdrawal', {
      p_amount: amount,
      p_payment_method: method,
      p_payment_number: number,
      p_payment_name: name || null,
    });

    if (error) throw error;
    if (data?.success === false) {
      if (msgEl) { msgEl.textContent = data.message || 'Request failed'; msgEl.className = 'profile-msg error'; }
      return;
    }

    const finalAmt = data?.amount ? Number(data.amount).toLocaleString('en-IN') : amount;
    showToast(`✅ Withdrawal request submitted — ৳${finalAmt}`, 'success');
    if (msgEl) { msgEl.textContent = '✓ Withdrawal request submitted'; msgEl.className = 'profile-msg success'; }

    document.getElementById('affWithdrawAmount').value = '';

    await saveAffiliatePayoutSettingsIfRequested(method, number, name); /* Phase 10 */

    if (_currentAffiliateId) {
      await loadAffiliateEarnings(_currentAffiliateId);
      await loadAffiliateWithdrawals(_currentAffiliateId);
    }

  } catch (err) {
    console.error('[Affiliate] withdrawal error:', err);
    /* Phase 16: DB unique constraint — pending withdrawal already exists */
    const friendlyMsg = err.code === '23505'
      ? 'আপনার একটি Pending Withdrawal Request ইতিমধ্যে রয়েছে।'
      : (err.message || 'সমস্যা হয়েছে');
    if (msgEl) { msgEl.textContent = friendlyMsg; msgEl.className = 'profile-msg error'; }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Withdrawal Request করুন`;
    }
  }
}

/* ── AFFILIATE STATS (Phase 6) ───────────────────────────────── */
async function loadAffiliateStats() {
  const errBanner = document.getElementById('affStatsErrorBanner');
  if (errBanner) errBanner.style.display = 'none';

  try {
    const { data: stats, error } = await sb.rpc('get_affiliate_stats');
    if (error || !stats?.success) {
      if (errBanner) errBanner.style.display = 'flex';
      return;
    }

    /* Tier panel */
    const tierPanel = document.getElementById('affTierPanel');
    const analyticsPanel = document.getElementById('affAnalyticsPanel');
    if (tierPanel) tierPanel.style.display = 'block';

    /* Analytics panel: show always; use empty state if no clicks yet */
    if (analyticsPanel) {
      analyticsPanel.style.display = 'block';
      const hasData = (stats.total_clicks || 0) > 0 || (stats.conversions || 0) > 0;
      const chartWrap = document.querySelector('.affd-analytics-chart-wrap');
      let emptyState = document.getElementById('affAnalyticsEmpty');
      if (!hasData) {
        if (chartWrap) chartWrap.style.display = 'none';
        if (!emptyState) {
          emptyState = document.createElement('div');
          emptyState.id = 'affAnalyticsEmpty';
          emptyState.style.cssText = 'text-align:center;padding:28px 12px;color:var(--text-muted);font-size:12px;';
          emptyState.innerHTML = `
            <div style="font-size:28px;margin-bottom:8px;">📊</div>
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">কোনো Analytics Data নেই</div>
            <div style="font-family:'Noto Sans Bengali',sans-serif;font-size:11px;">আপনার referral link শেয়ার করুন — clicks ও signups শুরু হলে এখানে chart দেখাবে।</div>`;
          if (chartWrap) chartWrap.parentNode.insertBefore(emptyState, chartWrap.nextSibling);
        }
        emptyState.style.display = 'block';
      } else {
        if (chartWrap) chartWrap.style.display = '';
        if (emptyState) emptyState.style.display = 'none';
      }
    }

    /* Tier badge & name */
    const tier = stats.tier || {};
    const tierBadge = document.getElementById('affTierBadge');
    const tierName  = document.getElementById('affTierName');
    const commRate  = document.getElementById('affCommRate');

    /* Update SVG badge colors based on tier */
    if (tierBadge) {
      const color = tier.badge_color || '#cd7f32';
      const poly = tierBadge.querySelector('polygon');
      const poly2 = tierBadge.querySelectorAll('polygon')[1];
      const star = tierBadge.querySelector('path');
      if (poly)  { poly.setAttribute('fill', color + '2e'); poly.setAttribute('stroke', color); }
      if (poly2) { poly2.setAttribute('fill', color + '18'); }
      if (star)  { star.setAttribute('fill', color + 'cc'); star.setAttribute('stroke', color); }
    }
    if (tierName) { tierName.textContent = tier.name || '—'; tierName.style.color = tier.badge_color || 'var(--text)'; }
    if (commRate) commRate.textContent = (tier.commission_rate || 10) + '%';

    /* Next tier progress */
    const nextTier = stats.next_tier;
    const progressDiv = document.getElementById('affTierProgress');
    if (nextTier && progressDiv) {
      progressDiv.style.display = 'block';
      const current = stats.total_referrals || 0;
      const needed  = nextTier.min_referrals || 1;
      const prevMin = tier.min_referrals || 0;
      const pct     = Math.min(100, Math.round(((current - prevMin) / (needed - prevMin)) * 100));
      const nextEl  = document.getElementById('affNextTierName');
      const labelEl = document.getElementById('affTierProgressLabel');
      const barEl   = document.getElementById('affTierProgressBar');
      if (nextEl)  nextEl.textContent = nextTier.name;
      if (labelEl) labelEl.textContent = current + ' / ' + needed + ' referrals';
      if (barEl)   { barEl.style.width = pct + '%'; barEl.style.background = nextTier.badge_color || 'var(--accent-light)'; }
    }

    /* Analytics numbers */
    const fmt = n => '৳' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('affStatClicks',     stats.total_clicks   || 0);
    set('affStatUnique',     stats.unique_clicks  || 0);
    set('affStatConversions',stats.conversions     || 0);
    set('affStatConverted',  stats.converted_orders || stats.conversions || 0);
    set('affStatConvRate',   (stats.conversion_rate || 0) + '%');
    set('affStatThisMonth',  fmt(stats.this_month_earnings));
    set('affStatLastMonth',  fmt(stats.last_month_earnings));

    // Draw analytics line chart
    setTimeout(() => drawAnalyticsChart(stats), 80);

    // Referral funnel visual (Step 3)
    setTimeout(() => renderAffiliateFunnel(stats), 100);

    loadAffiliateLeaderboard(); /* Phase 8 */

  } catch (err) {
    console.error('[Affiliate] loadAffiliateStats error:', err);
    if (errBanner) errBanner.style.display = 'flex';
  }
}

/* ── Analytics Line Chart ────────────────────────────────────── */
function drawAnalyticsChart(stats) {
  const canvas = document.getElementById('affAnalyticsChart');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const dpr  = window.devicePixelRatio || 1;
  const wrap = canvas.parentElement;
  const W    = wrap.clientWidth  || 600;
  const H    = wrap.clientHeight || 180;

  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  // Generate plausible daily data for 31 days
  const days = 31;
  const clicks = [];
  let v = (stats.total_clicks || 10) * 0.2 + Math.random() * 5;
  for (let i = 0; i < days; i++) {
    v = Math.max(0, v + (Math.random() - 0.44) * 6 + 0.3);
    clicks.push(v);
  }

  const maxVal = Math.max(...clicks, 1);
  const padL = 36, padR = 16, padT = 16, padB = 36;
  const drawW = W - padL - padR;
  const drawH = H - padT - padB;

  const toX = i => padL + (i / (days - 1)) * drawW;
  const toY = v => padT + (1 - v / maxVal) * drawH;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = padT + (g / 4) * drawH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    // Y labels
    const label = Math.round(maxVal * (1 - g / 4));
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(label, padL - 6, y + 3);
  }

  // X axis date labels (Aug 1, Aug 5 … Aug 31)
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  const now = new Date();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  [0, 4, 9, 14, 19, 24, 30].forEach(i => {
    const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
    ctx.fillText(monthNames[d.getMonth()] + ' ' + d.getDate(), toX(i), H - padB + 14);
  });

  // Gradient fill under curve
  const grad = ctx.createLinearGradient(0, padT, 0, padT + drawH);
  grad.addColorStop(0,   'rgba(139,92,246,0.35)');
  grad.addColorStop(0.5, 'rgba(139,92,246,0.12)');
  grad.addColorStop(1,   'rgba(139,92,246,0.00)');

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(clicks[0]));
  for (let i = 1; i < days; i++) {
    const cx = (toX(i-1) + toX(i)) / 2;
    ctx.bezierCurveTo(cx, toY(clicks[i-1]), cx, toY(clicks[i]), toX(i), toY(clicks[i]));
  }
  ctx.lineTo(toX(days-1), padT + drawH);
  ctx.lineTo(toX(0), padT + drawH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Stroke line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(clicks[0]));
  for (let i = 1; i < days; i++) {
    const cx = (toX(i-1) + toX(i)) / 2;
    ctx.bezierCurveTo(cx, toY(clicks[i-1]), cx, toY(clicks[i]), toX(i), toY(clicks[i]));
  }
  ctx.strokeStyle = '#8b5cf6';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';
  ctx.stroke();

  // Data points
  clicks.forEach((v, i) => {
    if (i % 5 !== 0 && i !== days - 1) return;
    const x = toX(i), y = toY(v);
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1040'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#a78bfa'; ctx.fill();
  });
}

/* ── AFFILIATE LEADERBOARD (Phase 8) ─────────────────────────── */
async function loadAffiliateLeaderboard() {
  const panel  = document.getElementById('affLeaderboardPanel');
  const listEl = document.getElementById('affLbList');
  const rankEl = document.getElementById('affLbMyRank');
  if (!panel || !listEl) return;

  try {
    const { data, error } = await sb.rpc('get_affiliate_leaderboard', {
      p_limit: 10,
      p_period: 'all_time'
    });
    if (error || !data?.success) {
      /* Real fetch failure — surface it via the shared error banner instead
         of silently leaving the panel hidden (which looks identical to the
         legitimate "no leaderboard yet" empty state below). */
      const errBanner = document.getElementById('affStatsErrorBanner');
      if (errBanner) errBanner.style.display = 'flex';
      return;
    }

    const rows = data.leaderboard || [];
    if (rows.length === 0) {
      /* Genuinely empty leaderboard — not an error, just nothing to show yet */
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'block';

    if (rankEl) {
      rankEl.textContent = data.my_rank?.rank ? `আপনার Rank: #${data.my_rank.rank}` : '';
    }

    const medal = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `${r}`;
    const fmt   = n => '৳' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    listEl.innerHTML = rows.map(r => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;
                   background:${r.is_me ? 'var(--accent-light)15' : 'transparent'};
                   border:1px solid ${r.is_me ? 'var(--accent-light)' : 'transparent'};">
        <div class="affd-lb-rank">${medal(r.rank)}</div>
        ${affdAvatarHtml(r.name)}
        <div style="flex:1;font-size:12px;font-weight:${r.is_me ? '800' : '600'};color:${r.is_me ? 'var(--accent-light)' : 'var(--text)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:5px;">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(r.name)}</span>
          ${r.is_me ? '<span class="affd-you-badge">You</span>' : ''}
        </div>
        <div style="font-size:11.5px;font-weight:700;color:#34d399;white-space:nowrap;">${fmt(r.total_earned)}</div>
      </div>`).join('');

    /* Short list — fill the space with a friendly nudge instead of leaving
       a bare empty card, so it doesn't look broken next to a taller table. */
    let nudge = document.getElementById('affLbNudge');
    if (rows.length < 4) {
      if (!nudge) {
        nudge = document.createElement('div');
        nudge.id = 'affLbNudge';
        nudge.style.cssText = 'margin-top:14px;padding:14px 10px;text-align:center;border-radius:10px;border:1px dashed var(--border);color:var(--text-muted);font-size:11px;line-height:1.6;';
        panel.appendChild(nudge);
      }
      nudge.innerHTML = `🚀 <span style="font-family:'Noto Sans Bengali',sans-serif;">আরও বন্ধুদের invite করুন — leaderboard-এ উপরে উঠে আসুন!</span>`;
      nudge.style.display = 'block';
    } else if (nudge) {
      nudge.style.display = 'none';
    }

  } catch (err) {
    console.error('[Affiliate] loadAffiliateLeaderboard error:', err);
  }
}

/* ── AFFILIATE NOTIFICATIONS (Phase 7) ───────────────────────── */
const AFF_NOTIF_META = {
  application_approved:  { icon: '🎉', color: '#34d399' },
  application_rejected:  { icon: '⚠️', color: '#f87171' },
  commission_earned:     { icon: '💰', color: '#34d399' },
  commission_cancelled:  { icon: '⚠️', color: '#f87171' },
  withdrawal_approved:   { icon: '✅', color: '#60a5fa' },
  withdrawal_rejected:   { icon: '🚫', color: '#f87171' },
  withdrawal_paid:       { icon: '🎉', color: '#34d399' },
  tier_upgraded:         { icon: '🏆', color: '#f59e0b' },
};

async function loadAffiliateNotifications() {
  const panel   = document.getElementById('affNotifPanel');
  const listEl  = document.getElementById('affNotifList');
  const badge   = document.getElementById('affNotifUnreadBadge');
  const sbBadge = document.getElementById('affNotifSbBadge');
  if (!panel || !listEl || !currentUser?.id) return;

  try {
    const { data: rows, error } = await sb
      .from('affiliate_notifications')
      .select('id, type, title, message, amount, is_read, created_at')
      .eq('client_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!rows || rows.length === 0) {
      panel.style.display = 'none';
      if (sbBadge) sbBadge.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    const unread = rows.filter(n => !n.is_read).length;

    if (badge) {
      badge.style.display = unread > 0 ? 'inline-flex' : 'none';
      badge.textContent = unread;
    }
    if (sbBadge) {
      sbBadge.style.display = unread > 0 ? 'inline-block' : 'none';
      sbBadge.textContent = unread;
    }

    listEl.innerHTML = rows.map(n => {
      const meta = AFF_NOTIF_META[n.type] || { icon: '🔔', color: 'var(--text-secondary)' };
      const dt = n.created_at
        ? new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';
      return `
        <div class="aff-notif-item" data-id="${n.id}" onclick="affiliateMarkNotifRead('${n.id}')"
          style="cursor:${n.is_read ? 'default' : 'pointer'};display:flex;gap:10px;padding:10px 12px;border-radius:var(--radius);
                 background:${n.is_read ? 'transparent' : 'var(--bg-card2)'};
                 border:1px solid ${n.is_read ? 'var(--border)' : meta.color + '40'};">
          <div style="font-size:16px;line-height:1;flex-shrink:0;">${meta.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12.5px;font-weight:700;color:var(--text);">${escHtml(n.title)}</div>
            <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;line-height:1.5;font-family:'Noto Sans Bengali',sans-serif;">${escHtml(n.message)}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${dt}</div>
          </div>
          ${!n.is_read ? `<div style="width:7px;height:7px;border-radius:50%;background:${meta.color};flex-shrink:0;margin-top:4px;"></div>` : ''}
        </div>`;
    }).join('');

  } catch (err) {
    console.error('[Affiliate] loadAffiliateNotifications error:', err);
  }
}

async function affiliateMarkNotifRead(id) {
  try {
    await sb.rpc('mark_affiliate_notifications_read', { p_ids: [id] });
    await loadAffiliateNotifications();
  } catch (err) {
    console.error('[Affiliate] markNotifRead error:', err);
  }
}

async function affiliateMarkAllNotifsRead() {
  try {
    await sb.rpc('mark_affiliate_notifications_read', { p_ids: null });
    await loadAffiliateNotifications();
  } catch (err) {
    console.error('[Affiliate] markAllNotifsRead error:', err);
  }
}

function showPage(pageId,clickedItem) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target=document.getElementById('page-'+pageId);
  if(target) target.classList.add('active');
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.remove('active'));
  document.querySelectorAll('.mbn-item').forEach(i=>i.classList.remove('active'));
  if(clickedItem){clickedItem.classList.add('active');}
  else{
    const n=document.querySelector(`.sb-item[data-page="${pageId}"]`);if(n)n.classList.add('active');
    const m=document.querySelector(`.mbn-item[data-page="${pageId}"]`);if(m)m.classList.add('active');
  }
  if(pageId==='orders'){
    // Only reset to list view if not being called from openOrderDetail
    // openOrderDetail handles its own show/hide
    if(!window._openingOrderDetail) {
      document.getElementById('ordersListView').style.display='block';
      document.getElementById('orderDetailView').style.display='none';
      clearInterval(countdownTimer);
    }
  }
  if(pageId==='affiliate'){
    loadAffiliateState();
    loadAffiliateNotifications(); /* Phase 7: always refresh, independent of aff-state cache */
    // Cards may have loaded while this tab was hidden (width was 0 then).
    // Redraw now that the tab is actually visible so lines fill the card.
    setTimeout(initEarningSparklines, 50);
  }
}


/* ── PROTECTED FILE VIEWER ──────────────────────────────────── */
/* ── PDF.js Canvas Renderer ───────────────────────────────────── */
async function renderPdfToCanvas(url) {
  const container = document.getElementById('viewerPdfCanvas');
  if (!container) return;
  container.innerHTML = '<div style="color:#94a3b8;padding:40px;text-align:center;font-family:Sora,sans-serif;">Loading PDF...</div>';
  container.style.display = 'block';

  /* Load PDF.js from CDN if not already loaded */
  if (!window.pdfjsLib) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  try {
    const pdf = await window.pdfjsLib.getDocument({ url, withCredentials: false }).promise;
    container.innerHTML = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.6 });

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin-bottom:8px;border-radius:6px;overflow:hidden;line-height:0;';

      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = 'width:100%;display:block;pointer-events:none;';
      canvas.setAttribute('draggable', 'false');

      wrapper.appendChild(canvas);
      container.appendChild(wrapper);

      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  } catch(err) {
    container.innerHTML = '<div style="color:#ef4444;padding:40px;text-align:center;font-family:Sora,sans-serif;">⚠ PDF load হয়নি। Please try again.</div>';
    console.error('[PDF.js]', err);
  }
}

window.openFileViewer = async function(storagePath, fileName, dlAllowed) {
  const overlay   = document.getElementById('fileViewerOverlay');
  const frame     = document.getElementById('viewerFrame');
  const img       = document.getElementById('viewerImg');
  const wm        = document.getElementById('viewerWatermark');
  const nameEl    = document.getElementById('viewerFileName');
  const protBadge = document.getElementById('viewerProtectedBadge');
  const dlBtn     = document.getElementById('viewerDownloadBtn');
  if (!overlay) return;

  /* Toggle: show Download button OR Protected badge based on dlAllowed */
  if (dlAllowed) {
    if (protBadge) protBadge.style.display = 'none';
    if (dlBtn)     dlBtn.style.display = 'flex';
  } else {
    if (protBadge) protBadge.style.display = 'flex';
    if (dlBtn)     dlBtn.style.display = 'none';
  }

  /* Watermark = client name/email */
  const wmText = (currentClient?.name || currentUser?.email || 'Scriptora Client').toUpperCase();
  wm.textContent = wmText + '  •  ' + wmText + '  •  ' + wmText;

  nameEl.textContent = fileName;
  frame.src = ''; img.src = ''; img.style.display = 'none'; frame.style.display = 'block';

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  /* Block keyboard shortcuts */
  window._viewerKeyHandler = function(e) {
    const k = e.key?.toLowerCase();
    /* Block: Ctrl+S, Ctrl+P, Ctrl+U, Ctrl+C, Ctrl+A, PrtScn, F12 */
    if ((e.ctrlKey || e.metaKey) && ['s','p','u','c','a'].includes(k)) { e.preventDefault(); e.stopPropagation(); }
    if (k === 'printscreen') { e.preventDefault(); }
    if (k === 'f12') { e.preventDefault(); }
  };
  document.addEventListener('keydown', window._viewerKeyHandler, true);

  /* Block right-click context menu */
  window._viewerContextHandler = function(e) { e.preventDefault(); };
  overlay.addEventListener('contextmenu', window._viewerContextHandler);

  /* Block copy event */
  window._viewerCopyHandler = function(e) { e.preventDefault(); };
  overlay.addEventListener('copy', window._viewerCopyHandler);

  /* Get 5-min signed URL — short expiry so URL can't be reused */
  try {
    const { data: urlData, error } = await sb.storage
      .from('order-files')
      .createSignedUrl(storagePath, 300); /* 5 minutes */
    if (error || !urlData?.signedUrl) throw error || new Error('No URL');

    const url = urlData.signedUrl;
    const ext = fileName.split('.').pop().toLowerCase();
    const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext);
    const isPdf   = ext === 'pdf';



    if (isImage) {
      /* Image: show in <img> — no text to copy */
      img.src = url;
      img.style.display = 'block';
      frame.style.display = 'none';
      const pdfCanvas = document.getElementById('viewerPdfCanvas');
      if (pdfCanvas) pdfCanvas.style.display = 'none';
    } else if (isPdf) {
      /* PDF: render via PDF.js into canvas — no text layer, no copy */
      frame.style.display = 'none';
      img.style.display = 'none';
      await renderPdfToCanvas(url);
    } else {
      /* Unsupported for inline preview (docx, xlsx, etc.) */
      const pdfCanvas = document.getElementById('viewerPdfCanvas');
      if (pdfCanvas) pdfCanvas.style.display = 'none';
      frame.style.display = 'block';
      img.style.display = 'none';
      const isOfficeDoc = ['doc','docx','xls','xlsx','ppt','pptx'].includes(ext);
      frame.srcdoc = `
        <div style="
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          height:100%;min-height:300px;background:#0f1729;color:#94a3b8;
          font-family:sans-serif;text-align:center;padding:40px;gap:14px;
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div style="font-size:15px;font-weight:700;color:#e2e8f0">⚠️ File Preview Unavailable</div>
          <div style="font-size:12px;color:#64748b;max-width:320px;line-height:1.7">
            Unfortunately, this file cannot be previewed here. Please download the file and open it using a compatible application to view its contents.<br><br>
            Thank you for your understanding.
          </div>
        </div>`;
      frame.src = '';
    }

    /* Store for download button */
    window._viewerCurrentUrl  = url;
    window._viewerCurrentPath = storagePath;
    window._viewerCurrentName = fileName;
    window._viewerDlAllowed   = dlAllowed;

  } catch(e) {
    console.error('[Viewer]', e);
    frame.src = '';
    frame.srcdoc = '<div style="color:#ef4444;padding:40px;font-family:sans-serif;text-align:center;">⚠ File load হয়নি। Please try again.</div>';
  }
};

window.closeFileViewer = function() {
  const overlay = document.getElementById('fileViewerOverlay');
  const frame   = document.getElementById('viewerFrame');
  const img     = document.getElementById('viewerImg');
  if (overlay) { overlay.style.display = 'none'; }
  if (frame)   { frame.src = ''; frame.style.display = 'none'; }
  if (img)     { img.src = ''; img.style.display = 'none'; }
  const pdfCanvas = document.getElementById('viewerPdfCanvas');
  if (pdfCanvas) { pdfCanvas.innerHTML = ''; pdfCanvas.style.display = 'none'; }
  document.body.style.overflow = '';
  if (window._viewerKeyHandler) {
    document.removeEventListener('keydown', window._viewerKeyHandler, true);
    window._viewerKeyHandler = null;
  }
  if (overlay && window._viewerContextHandler) {
    overlay.removeEventListener('contextmenu', window._viewerContextHandler);
    window._viewerContextHandler = null;
  }
  if (overlay && window._viewerCopyHandler) {
    overlay.removeEventListener('copy', window._viewerCopyHandler);
    window._viewerCopyHandler = null;
  }
  window._viewerCurrentUrl = null;
};

/* Called by the Download button inside the viewer */
window.viewerDownload = async function() {
  const path = window._viewerCurrentPath;
  const name = window._viewerCurrentName;
  if (!path || !name) return;
  if (!window._viewerDlAllowed) { showToast('⚠ Download allowed নয়', 'error'); return; }
  await downloadFile(path, name);
};

window.downloadFile = async function(storagePath, fileName) {
  /* Fresh signed URL for actual download */
  try {
    const { data, error } = await sb.storage.from('order-files').download(storagePath);
    if (error) throw error;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  } catch(e) {
    showToast('⚠ Download হয়নি', 'error');
  }
};

/* Close viewer on overlay background click */
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('fileViewerOverlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeFileViewer();
    });
  }
});

function showToast(msg,type='') {
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast show ${type}`;
  setTimeout(()=>{t.classList.remove('show');},3000);
}

function setText(id,val){const el=document.getElementById(id);if(el)el.textContent=val??'—';}

/* Single-digit flip animation */
function flipDigit(id, newChar) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  const topEl = wrap.querySelector('.cd-top span');
  const botEl = wrap.querySelector('.cd-bottom span');
  if (!topEl) return;
  const cur = topEl.textContent;
  if (cur === newChar) return;

  // Animate: scale down → update → scale up
  wrap.style.transition = 'transform 0.12s ease-in, opacity 0.12s ease-in';
  wrap.style.transform = 'scaleY(0)';
  wrap.style.opacity = '0.2';
  setTimeout(() => {
    topEl.textContent = newChar;
    if (botEl) botEl.textContent = newChar;
    wrap.style.transition = 'transform 0.12s ease-out, opacity 0.12s ease-out';
    wrap.style.transform = 'scaleY(1)';
    wrap.style.opacity = '1';
  }, 120);
}

function flipCard(id, newVal) {
  const str = String(newVal ?? '00').padStart(2, '0');
  flipDigit(id + '0', str[0]);
  flipDigit(id + '1', str[1]);
}
function setVal(id,val){const el=document.getElementById(id);if(el)el.value=val??'';}
function getVal(id){return document.getElementById(id)?.value||'';}
function escHtml(str){return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmt(num){return Number(num||0).toLocaleString('en-BD');}
function pad(n){return String(Math.max(0,n)).padStart(2,'0');}
function truncate(str,len){return str&&str.length>len?str.slice(0,len)+'…':str||'';}
function getInitials(name){return(name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);}
function fmtDate(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-BD',{day:'numeric',month:'short',year:'numeric'});}
function fmtDateLong(d){if(!d)return'—';return new Date(d).toLocaleDateString('en-BD',{day:'numeric',month:'long',year:'numeric'});}
function fmtTime(d){if(!d)return'';return new Date(d).toLocaleTimeString('en-BD',{hour:'2-digit',minute:'2-digit'});}
function formatCountdown(ms){if(ms<=0)return'সময় শেষ!';const d=Math.floor(ms/86400000),h=Math.floor((ms%86400000)/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);if(d>0)return`${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;return`${pad(h)}h ${pad(m)}m ${pad(s)}s`;}

/* Ticks every second so the deadline countdown on each order card stays live,
   instead of being frozen at the value computed when the card was rendered. */
function tickLiveCountdowns() {
  document.querySelectorAll('.js-countdown[data-deadline]').forEach(el => {
    const diffMs = new Date(el.dataset.deadline) - new Date();
    el.textContent = diffMs > 0 ? formatCountdown(diffMs) : 'সময় শেষ!';
  });
}
setInterval(tickLiveCountdowns, 1000);
function getStatusBadge(status){const map={'pending':{cls:'badge-pending',label:'Pending'},'confirmed':{cls:'badge-confirmed',label:'Confirmed'},'payment_done':{cls:'badge-confirmed',label:'Payment Done'},'writing':{cls:'badge-writing',label:'Writing চলছে'},'draft_sent':{cls:'badge-writing',label:'Draft Sent'},'draft_ready':{cls:'badge-review',label:'Waiting for Review'},'in_review':{cls:'badge-revision',label:'Revision Requested'},'final_payment':{cls:'badge-pending',label:'Final Payment'},'completed':{cls:'badge-completed',label:'Completed'},'revision':{cls:'badge-revision',label:'Revision চলছে'},'delivered':{cls:'badge-review',label:'Final Delivery'}};return map[status]||{cls:'badge-pending',label:status||'Pending'};}
function showProfileMsg(id,msg,type){const el=document.getElementById(id);if(!el)return;el.textContent=msg;el.className=`profile-msg ${type}`;setTimeout(()=>{el.textContent='';el.className='profile-msg';},4000);}
/* ═══════════════════════════════════════════
   PAYMENT PROOF SUBMIT — Client Side
═══════════════════════════════════════════ */

function handleProofFileSelect(input) {
  const file = input.files[0];
  const label = document.getElementById('proofFileName');
  if (file && label) label.textContent = file.name;
}

async function submitPaymentProof() {
  const order = allOrders.find(o => o.id === currentOrderId);
  if (!order) return;

  const claimedAmount = parseFloat(document.getElementById('proofClaimedAmount')?.value) || 0;
  const method     = document.getElementById('proofMethod')?.value.trim();
  const txnId      = document.getElementById('proofTxnId')?.value.trim();
  const clientNote = document.getElementById('proofClientNote')?.value.trim();
  const fileInput  = document.getElementById('proofScreenshot');
  const file       = fileInput?.files[0];
  const statusEl   = document.getElementById('proofStatus');
  const btn        = document.getElementById('proofSendBtn');

  if (!claimedAmount || claimedAmount <= 0) {
    if (statusEl) { statusEl.textContent = 'আপনি কত টাকা পাঠিয়েছেন সেটা লিখুন।'; statusEl.style.color = '#f87171'; }
    return;
  }
  if (!method) {
    if (statusEl) { statusEl.textContent = 'Payment method select করুন।'; statusEl.style.color = '#f87171'; }
    return;
  }
  if (!txnId && !file) {
    if (statusEl) { statusEl.textContent = 'Transaction ID বা screenshot দিন।'; statusEl.style.color = '#f87171'; }
    return;
  }

  btn.disabled = true;
  btn.textContent = 'পাঠানো হচ্ছে...';
  if (statusEl) { statusEl.textContent = ''; }

  let screenshotUrl = null;

  if (file) {
    const ext  = file.name.split('.').pop();
    const path = `payment-proofs/${currentOrderId}/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('scriptora-files').upload(path, file, { upsert: true });
    if (upErr) {
      if (statusEl) { statusEl.textContent = 'Screenshot upload হয়নি: ' + upErr.message; statusEl.style.color = '#f87171'; }
      btn.disabled = false; btn.textContent = '💸 Proof পাঠান';
      return;
    }
    const { data: urlData } = sb.storage.from('scriptora-files').getPublicUrl(path);
    screenshotUrl = urlData.publicUrl;
  }

  /* Insert as pending — does NOT affect advance_paid / due_amount */
  const { error } = await sb.from('payments').insert({
    order_id:       currentOrderId,
    client_id:      currentUser.id,
    amount:         claimedAmount,
    type:           'pending',
    method:         method,
    txn_id:         txnId || null,
    client_note:    clientNote || null,
    screenshot_url: screenshotUrl,
    confirmed:      false,
    paid_at:        new Date().toISOString(),
  });

  /* order payment_status → under_review, financials untouched */
  await sb.from('orders').update({
    payment_status: 'under_review',
    updated_at: new Date().toISOString()
  }).eq('id', currentOrderId);

  btn.disabled = false;
  if (error) {
    btn.textContent = '💸 Proof পাঠান';
    if (statusEl) { statusEl.textContent = 'Error: ' + error.message; statusEl.style.color = '#f87171'; }
    return;
  }

  document.getElementById('proofSubmitSection').style.display = 'none';
  document.getElementById('proofSubmitted').style.display     = 'flex';
  showToast('✅ Payment proof পাঠানো হয়েছে! Admin review করবেন।', 'success');
}

/* ═══════════════════════════════════════════
   ORDER CONFIRMED POPUP
═══════════════════════════════════════════ */
let _confirmCdInterval = null;

function showConfirmPopup(order) {
  const overlay = document.getElementById('confirmOverlay');
  if (!overlay) return;

  document.getElementById('confirmMsg').textContent =
    `"${order.title || 'আপনার order'}" confirm হয়েছে এবং কাজ শুরু হয়েছে!`;
  document.getElementById('confirmOrderId').textContent =
    `Order: #SCR-${String(order.id).slice(-6).toUpperCase()}`;

  /* Start mini countdown inside popup */
  if (_confirmCdInterval) clearInterval(_confirmCdInterval);
  const deadline = new Date(order.deadline);

  function tickConfirm() {
    const diff = deadline - new Date();
    const cdEl = document.getElementById('confirmCd');
    if (!cdEl) { clearInterval(_confirmCdInterval); return; }
    if (diff <= 0) { cdEl.textContent = 'সময় শেষ!'; clearInterval(_confirmCdInterval); return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    cdEl.textContent = `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  tickConfirm();
  _confirmCdInterval = setInterval(tickConfirm, 1000);

  overlay.style.display = 'flex';
  /* Animate in */
  setTimeout(() => overlay.classList.add('visible'), 10);
}

function closeConfirmPopup() {
  const overlay = document.getElementById('confirmOverlay');
  if (overlay) { overlay.classList.remove('visible'); setTimeout(() => { overlay.style.display = 'none'; }, 300); }
  if (_confirmCdInterval) { clearInterval(_confirmCdInterval); _confirmCdInterval = null; }
}

/* ═══════════════════════════════════════════
   PROOF SUBMIT SECTION — show/hide in order detail
═══════════════════════════════════════════ */

function resetProofForm() {
  const fields = ['proofClaimedAmount','proofTxnId','proofClientNote'];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const method = document.getElementById('proofMethod'); if (method) method.value = '';
  const fi = document.getElementById('proofScreenshot'); if (fi) fi.value = '';
  const fn = document.getElementById('proofFileName'); if (fn) fn.textContent = 'Screenshot বেছে নিন';
  const fi2 = document.getElementById('proofScreenshot'); if (fi2) fi2.onchange = () => handleProofFileSelect(fi2);
  const btn = document.getElementById('proofSendBtn');
  if (btn) { btn.textContent = '💸 Proof পাঠান'; btn.disabled = false; }
}
async function checkAndShowProofSection(order) {
  const section   = document.getElementById('proofSubmitSection');
  const submitted = document.getElementById('proofSubmitted');

  /* The inline proof form is replaced by the dedicated Payment page flow.
     Hide the old form entirely — client now pays via the "Pay Now" button,
     which routes to payment.html?order_id=... */
  if (section)   section.style.display = 'none';
  if (submitted) submitted.style.display = 'none';

  await renderClientPaymentHistory(order.id);
}

/* ═══════════════════════════════════════════
   CLIENT PAYMENT HISTORY — card-style list with
   status icons, filter dropdown, and "view all" expand
═══════════════════════════════════════════ */
let _payHistAllData   = [];   // full unfiltered payment list for current order
let _payHistFilter    = 'all';
let _payHistExpanded  = false;
const PAY_HIST_COLLAPSED_COUNT = 3;

async function renderClientPaymentHistory(orderId) {
  const wrap = document.getElementById('clientPayHistoryList');
  const card = document.getElementById('clientPayHistoryCard');
  if (!wrap || !card) return;

  card.style.display = 'block';
  wrap.innerHTML = '<div class="pay-hist-loading">লোড হচ্ছে...</div>';
  _payHistExpanded = false;

  try {
    const { data: pays, error } = await sb
      .from('payments')
      .select('id, amount, method, txn_id, type, confirmed, note, screenshot_url, paid_at')
      .eq('order_id', orderId)
      .order('paid_at', { ascending: false });

    if (error || !pays) {
      wrap.innerHTML = '<div class="pay-hist-empty">Payment history লোড করতে সমস্যা হয়েছে।</div>';
      return;
    }

    _payHistAllData = pays;
    _drawPayHistList();

  } catch (e) {
    console.error('renderClientPaymentHistory error:', e);
    wrap.innerHTML = '<div class="pay-hist-empty">Payment history লোড করতে সমস্যা হয়েছে।</div>';
  }
}

function _payHistStatusMeta(p) {
  const isApproved = p.confirmed === true;
  const isRejected = p.type === 'rejected';
  if (isRejected) return { key: 'rejected', label: 'Rejected',         color: '#f87171', icon: 'x' };
  if (isApproved) return { key: 'approved', label: 'Approved',         color: '#4ade80', icon: 'check' };
  return                { key: 'pending',  label: 'Pending Review',    color: '#fbbf24', icon: 'hourglass' };
}

function _payHistIconSvg(icon, color) {
  if (icon === 'check') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><circle cx="12" cy="12" r="10" fill="${color}22"/><polyline points="8 12 11 15 16 9"/></svg>`;
  }
  if (icon === 'x') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><circle cx="12" cy="12" r="10" fill="${color}22"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>`;
  }
  /* hourglass */
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="10" fill="${color}22"/><path d="M8 7h8M8 17h8M9 7c0 3 3 3.5 3 5s-3 2-3 5M15 7c0-3-3-3.5-3-5"/></svg>`;
}

function _drawPayHistList() {
  const wrap = document.getElementById('clientPayHistoryList');
  if (!wrap) return;

  let list = _payHistAllData;
  if (_payHistFilter !== 'all') {
    list = list.filter(p => _payHistStatusMeta(p).key === _payHistFilter);
  }

  if (!list.length) {
    wrap.innerHTML = `<div class="pay-hist-empty">${_payHistFilter === 'all' ? 'এখনো কোনো payment submit করা হয়নি।' : 'এই status এ কোনো payment নেই।'}</div>`;
    _updateViewAllLink(0, 0);
    return;
  }

  const visibleList = _payHistExpanded ? list : list.slice(0, PAY_HIST_COLLAPSED_COUNT);

  wrap.innerHTML = visibleList.map((p, idx) => {
    const meta = _payHistStatusMeta(p);
    const dateStr = new Date(p.paid_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    const timeStr = new Date(p.paid_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    const num = String(_payHistAllData.length - _payHistAllData.indexOf(p)).padStart(3, '0');

    return `
      <div class="pay-hist-card">
        <div class="pay-hist-icon-circle" style="background:${meta.color}18;border-color:${meta.color}30">
          ${_payHistIconSvg(meta.icon, meta.color)}
        </div>
        <div class="pay-hist-card-body">
          <div class="pay-hist-card-top">
            <span class="pay-hist-card-title">Payment #${num}</span>
          </div>
          <div class="pay-hist-card-meta">
            <span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${dateStr}</span>
            <span class="pay-hist-meta-dot"></span>
            <span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${timeStr}</span>
          </div>
          <div class="pay-hist-card-method">
            <span class="pay-hist-method-dot" style="background:${meta.color}"></span>
            ${(p.method || '—')}
          </div>
        </div>
        <div class="pay-hist-card-right">
          <span class="pay-hist-card-amount" style="color:${meta.key === 'pending' ? '#fbbf24' : meta.key === 'rejected' ? '#f87171' : '#4ade80'}">৳${Number(p.amount || 0).toLocaleString()}</span>
          <span class="pay-hist-card-badge" style="color:${meta.color};border-color:${meta.color}44;background:${meta.color}12">
            ${meta.label}
          </span>
          ${p.screenshot_url
            ? `<button class="pay-hist-view-btn" onclick="showReceiptModal('${p.screenshot_url}')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${meta.key === 'pending' ? 'View Proof' : 'View Receipt'}</button>`
            : ''}
        </div>
      </div>`;
  }).join('');

  _updateViewAllLink(list.length, visibleList.length);
}

function _updateViewAllLink(totalCount, shownCount) {
  const linkWrap = document.getElementById('clientPayHistoryViewAll');
  if (!linkWrap) return;

  if (totalCount <= PAY_HIST_COLLAPSED_COUNT) {
    linkWrap.style.display = 'none';
    return;
  }

  linkWrap.style.display = 'block';
  linkWrap.innerHTML = _payHistExpanded
    ? `<button class="pay-hist-viewall-btn" onclick="_togglePayHistExpand()">কম দেখান ↑</button>`
    : `<button class="pay-hist-viewall-btn" onclick="_togglePayHistExpand()">সব Transaction দেখুন (${totalCount}) →</button>`;
}

window._togglePayHistExpand = function() {
  _payHistExpanded = !_payHistExpanded;
  _drawPayHistList();
};

window._setPayHistFilter = function(val) {
  _payHistFilter   = val;
  _payHistExpanded = false;
  _drawPayHistList();
};

/* ── Payment Due Popup ──────────────────────────────────────────────────── */

/* Small ring that bursts outward from the clicked lock icon */
function _spawnPdpBurstRing(x, y) {
  const ring = document.createElement('div');
  ring.className = 'pdp-burst-ring';
  ring.style.left = x + 'px';
  ring.style.top  = y + 'px';
  document.body.appendChild(ring);
  const cleanup = () => ring.remove();
  ring.addEventListener('animationend', cleanup, { once: true });
  setTimeout(cleanup, 700); // fallback safety
}

/* A stream of smoke wisps that travels from the click point toward the
   centre of the screen — like a genie's trail riding along with the file
   as it drifts into place, thinning out only once it's arrived. */
function _spawnPdpSmoke(x, y) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const dx = centerX - x;
  const dy = centerY - y;

  const waves = 8;
  for (let w = 0; w < waves; w++) {
    const waveDelay = w * 130; // ms between waves — last wave lands ~1.6s in, matching the card's reveal
    const puffsInWave = 3;
    for (let i = 0; i < puffsInWave; i++) {
      const puff = document.createElement('div');
      puff.className = 'pdp-smoke';

      // where along the lock -> centre path this wave starts from
      const along = Math.min(0.9, w / waves) + (Math.random() * 0.08);
      const startX = x + dx * along + (Math.random() - 0.5) * 26;
      const startY = y + dy * along + (Math.random() - 0.5) * 26;
      puff.style.left = startX + 'px';
      puff.style.top  = startY + 'px';

      // each puff keeps drifting a bit further along the same path, curling as it goes
      const remain  = 1 - along;
      const travelX = dx * remain * (0.35 + Math.random() * 0.3) + (Math.random() - 0.5) * 40;
      const travelY = dy * remain * (0.35 + Math.random() * 0.3) - (20 + Math.random() * 20);
      const rotate  = (Math.random() - 0.5) * 90;

      puff.style.setProperty('--sx', travelX + 'px');
      puff.style.setProperty('--sy', travelY + 'px');
      puff.style.setProperty('--sr', rotate + 'deg');
      puff.style.animationDelay = (waveDelay + i * 25) + 'ms';

      document.body.appendChild(puff);
      const cleanup = () => puff.remove();
      puff.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, waveDelay + 900); // fallback safety
    }
  }
}

/* ── Receipt / payment screenshot lightbox ────────────────────────────── */
window.showReceiptModal = function(url) {
  if (!url) return;
  let overlay = document.getElementById('receiptModalOverlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'receiptModalOverlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:10001;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
      <div style="position:relative;max-width:520px;width:100%;max-height:88vh;background:#0d1423;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:14px;display:flex;flex-direction:column;align-items:center;">
        <button id="receiptModalClose" style="position:absolute;top:10px;right:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>
        <img id="receiptModalImg" src="" alt="Receipt" style="max-width:100%;max-height:76vh;border-radius:10px;object-fit:contain;margin-top:8px;" />
        <a id="receiptModalDownload" href="" download target="_blank" style="margin-top:12px;font-size:0.8rem;color:#a78bfa;text-decoration:none;display:flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Full size-এ দেখুন / Download
        </a>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) window.closeReceiptModal(); });
    document.getElementById('receiptModalClose').addEventListener('click', window.closeReceiptModal);
  }

  document.getElementById('receiptModalImg').src = url;
  document.getElementById('receiptModalDownload').href = url;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeReceiptModal = function() {
  const overlay = document.getElementById('receiptModalOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.style.overflow = '';
};

window.showPaymentDuePopup = async function(event, orderIdArg) {
  const targetOrderId = orderIdArg || currentOrderId;
  const order = allOrders.find(o => o.id === targetOrderId);
  if (!order) return;

  const total = Number(order.total_price || 0);

  /* Fetch live approved-payment sum */
  let paid = 0, due = 0;
  try {
    const { data: approvedPays } = await sb
      .from('payments').select('amount')
      .eq('order_id', targetOrderId).eq('confirmed', true).in('type', ['received','approval']);
    paid = (approvedPays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    due  = Math.max(0, total - paid);
  } catch(_) {
    paid = order.advance_paid || 0;
    due  = order.due_amount   || 0;
  }

  const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setTxt('popupDueAmount', `৳${fmt(due)}`);
  setTxt('popupTotal',     `৳${fmt(total)}`);
  setTxt('popupPaid',      `৳${fmt(paid)}`);
  setTxt('popupDue2',      `৳${fmt(due)}`);

  const overlay = document.getElementById('paymentDueOverlay');
  const card    = document.getElementById('paymentDuePopupCard');
  if (!overlay) return;

  overlay.classList.remove('pdp-closing');

  /* Work out where the popup should "burst" from — the clicked lock icon,
     falling back to screen centre if triggered without an event. */
  let originX = window.innerWidth / 2;
  let originY = window.innerHeight / 2;

  if (event && typeof event.clientX === 'number') {
    originX = event.clientX;
    originY = event.clientY;

    const trigger = event.currentTarget;
    if (trigger && trigger.classList) {
      trigger.classList.remove('pdp-lock-pop');
      void trigger.offsetWidth; // restart animation if clicked repeatedly
      trigger.classList.add('pdp-lock-pop');
    }
    _spawnPdpBurstRing(originX, originY);
    _spawnPdpSmoke(originX, originY);
  }

  if (card) {
    // Clear out any stale close-listener left over from a previous cycle —
    // otherwise it can fire when THIS open's entrance animation ends and
    // slam the popup shut again.
    if (card._pdpAnimEndHandler) {
      card.removeEventListener('animationend', card._pdpAnimEndHandler);
      card._pdpAnimEndHandler = null;
    }
    card.style.setProperty('--pdp-x', (originX - window.innerWidth / 2) + 'px');
    card.style.setProperty('--pdp-y', (originY - window.innerHeight / 2) + 'px');
  }

  overlay.style.display = 'flex';
  overlay.classList.remove('pdp-active');
  void overlay.offsetWidth; // force reflow so the animation restarts every open
  overlay.classList.add('pdp-active');
  document.body.style.overflow = 'hidden';
};

window.closePaymentDuePopup = function() {
  const overlay = document.getElementById('paymentDueOverlay');
  const card    = document.getElementById('paymentDuePopupCard');
  if (!overlay || overlay.style.display === 'none') return;

  overlay.classList.remove('pdp-active');
  overlay.classList.add('pdp-closing');

  let fallbackId;
  const finish = () => {
    overlay.style.display = 'none';
    overlay.classList.remove('pdp-closing');
    document.body.style.overflow = '';
    clearTimeout(fallbackId);
    if (card && card._pdpAnimEndHandler) {
      card.removeEventListener('animationend', card._pdpAnimEndHandler);
      card._pdpAnimEndHandler = null;
    }
  };

  if (card) {
    // Only react to THIS card's own close animation ending (not a bubbled
    // event from one of the little icon animations inside it), and make
    // sure we never stack more than one listener across open/close cycles.
    if (card._pdpAnimEndHandler) {
      card.removeEventListener('animationend', card._pdpAnimEndHandler);
    }
    const onCardAnimEnd = (e) => {
      if (e.target !== card || e.animationName !== 'pdpGenieOut') return;
      finish();
    };
    card._pdpAnimEndHandler = onCardAnimEnd;
    card.addEventListener('animationend', onCardAnimEnd);
  }
  fallbackId = setTimeout(finish, 420); // fallback safety
};

/* ══════════════════════════════════════════════════════════════════════════
   TOPBAR GLOBAL SEARCH (search across the client's own orders)
   ══════════════════════════════════════════════════════════════════════════ */
(function initTopbarSearch() {
  const input    = document.getElementById('cdSearchInput');
  const wrap     = document.getElementById('cdSearchWrap');
  const dropdown = document.getElementById('cdSearchDropdown');
  if (!input || !wrap || !dropdown) return;

  let activeIdx = -1;
  let currentResults = [];

  function getOrderPool() {
    return Array.isArray(window.allOrders) ? window.allOrders : (typeof allOrders !== 'undefined' ? allOrders : []);
  }

  function searchOrders(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return getOrderPool().filter(o => {
      const orderNo = (o.order_number || ('#SCR-' + String(o.id).slice(-6).toUpperCase())).toLowerCase();
      return (o.title || '').toLowerCase().includes(q)
          || orderNo.includes(q)
          || (o.package || '').toLowerCase().includes(q)
          || (o.department || '').toLowerCase().includes(q);
    }).slice(0, 8);
  }

  function initialsOf(title) {
    const words = String(title || '?').trim().split(/\s+/);
    return ((words[0]?.[0] || '') + (words[1]?.[0] || '')).toUpperCase() || '?';
  }

  function renderResults(results) {
    currentResults = results;
    activeIdx = -1;
    if (results.length === 0) {
      dropdown.innerHTML = `<div class="cd-search-empty">কোনো matching order পাওয়া যায়নি</div>`;
    } else {
      dropdown.innerHTML = results.map((o, i) => {
        const orderNo = o.order_number || ('#SCR-' + String(o.id).slice(-6).toUpperCase());
        return `
          <div class="cd-search-item" data-idx="${i}" data-id="${o.id}">
            <div class="cd-search-item-avatar">${escHtml(initialsOf(o.title))}</div>
            <div class="cd-search-item-text">
              <div class="cd-search-item-title">${escHtml(o.title || 'Untitled')}</div>
              <div class="cd-search-item-meta">${escHtml(orderNo)}${o.package ? ' · ' + escHtml(o.package) : ''}</div>
            </div>
          </div>`;
      }).join('');
    }
    dropdown.classList.add('open');
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    activeIdx = -1;
  }

  function pickResult(id) {
    closeDropdown();
    input.value = '';
    input.blur();
    if (typeof openOrderDetail === 'function') openOrderDetail(id);
  }

  input.addEventListener('input', () => {
    const results = searchOrders(input.value);
    if (input.value.trim()) renderResults(results); else closeDropdown();
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdown.classList.contains('open')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, currentResults.length - 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      updateActive();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && currentResults[activeIdx]) pickResult(currentResults[activeIdx].id);
    } else if (e.key === 'Escape') {
      closeDropdown();
      input.blur();
    }
  });

  function updateActive() {
    dropdown.querySelectorAll('.cd-search-item').forEach((el, i) => {
      el.classList.toggle('active', i === activeIdx);
    });
  }

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.cd-search-item');
    if (!item) return;
    pickResult(Number(item.dataset.id));
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closeDropdown();
  });

  // Press "/" anywhere (outside of another input/textarea) to focus search
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    e.preventDefault();
    input.focus();
  });
})();


/* ══════════════════════════════════════════
   ⭐ Star Rating — Completed orders
   Supabase orders table এ 'rating' column দরকার (int2, nullable)
══════════════════════════════════════════ */
function initStarRating(orderId, existingRating) {
  const stars      = document.querySelectorAll('#cdStars .cd-star');
  const savedEl    = document.getElementById('cdRatingSaved');
  const reviewForm = document.getElementById('cdReviewForm');
  const reviewText = document.getElementById('cdReviewText');
  const reviewBtn  = document.getElementById('cdReviewSubmit');
  if (!stars.length) return;

  let currentVal = 0;

  function highlight(val) {
    stars.forEach(s => {
      const sv = parseInt(s.dataset.val);
      s.classList.toggle('filled',   sv <= val);
      s.classList.toggle('unfilled', sv > val);
    });
  }

  // existing rating load করো
  if (existingRating) {
    highlight(existingRating);
    stars.forEach(s => s.disabled = true);
    if (savedEl) savedEl.style.display = 'flex';
    if (reviewForm) reviewForm.style.display = 'none';
    return;
  }

  // hover + click effects
  stars.forEach(s => {
    s.addEventListener('mouseenter', () => highlight(parseInt(s.dataset.val)));
    s.addEventListener('mouseleave', () => highlight(currentVal));
    s.addEventListener('click', () => {
      currentVal = parseInt(s.dataset.val);
      highlight(currentVal);
      if (reviewForm) reviewForm.style.display = 'flex';
    });
  });
  highlight(0);

  // review submit
  if (reviewBtn) {
    reviewBtn.addEventListener('click', async () => {
      if (!currentVal) return;
      stars.forEach(st => st.disabled = true);
      reviewBtn.disabled = true;
      reviewBtn.textContent = 'সংরক্ষণ হচ্ছে…';

      const sb = window.scriptoraSupabase;
      if (sb && orderId) {
        const updateData = { rating: currentVal };
        const text = reviewText ? reviewText.value.trim() : '';
        if (text) updateData.review_text = text;
        const { error } = await sb.from('orders').update(updateData).eq('id', orderId);
        if (error) console.warn('[Rating] save error:', error.message);
      }

      if (reviewForm) reviewForm.style.display = 'none';
      if (savedEl) savedEl.style.display = 'flex';
    });
  }
}
/* ══════════════════════════════════════════════════════════════
   STEP 3 — Referred Orders + Order Progress + Referral Funnel
   ══════════════════════════════════════════════════════════════ */

/* ── Referred Orders ─────────────────────────────────────────── */
async function loadAffiliateReferredOrders() {
  const tbody   = document.getElementById('affReferredOrdersTbody');
  const cards   = document.getElementById('affReferredOrdersCards');
  const countEl = document.getElementById('affReferredOrdersCount');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="affd-table-loading">লোড হচ্ছে…</td></tr>';
  if (cards) cards.innerHTML = '';

  try {
    /* Uses the same RPC that already powers commission history —
       get_my_affiliate_commissions returns order info without
       exposing client PII (no email / phone / address).        */
    const { data: rows, error } = await sb.rpc('get_my_affiliate_commissions');
    if (error) throw error;

    if (!rows || rows.length === 0) {
      const emptyMsg = `
        <div style="text-align:center;padding:32px 12px;">
          <div style="font-size:28px;margin-bottom:10px;">📦</div>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">কোনো Referred Order নেই</div>
          <div style="font-size:11px;color:var(--text-muted);font-family:'Noto Sans Bengali',sans-serif;">
            আপনার referral link শেয়ার করুন — বন্ধু বা সহপাঠী Order দিলে এখানে দেখাবে।
          </div>
        </div>`;
      tbody.innerHTML = `<tr><td colspan="5">${emptyMsg}</td></tr>`;
      if (cards) cards.innerHTML = emptyMsg;
      if (countEl) countEl.textContent = '';
      return;
    }

    if (countEl) countEl.textContent = rows.length + ' order' + (rows.length !== 1 ? 's' : '');

    const orderStatusMap = {
      pending:          { color: '#94a3b8', label: 'Payment Pending',  pct: 0  },
      confirmed:        { color: '#60a5fa', label: 'Confirmed',         pct: 10 },
      payment_received: { color: '#60a5fa', label: 'Payment Received',  pct: 20 },
      payment_done:     { color: '#60a5fa', label: 'Payment Done',      pct: 25 },
      hold:             { color: '#f87171', label: 'On Hold',           pct: 15 },
      writing:          { color: '#a78bfa', label: 'In Progress',       pct: 60 },
      in_review:        { color: '#f59e0b', label: 'In Review',         pct: 80 },
      draft_ready:      { color: '#fb923c', label: 'Draft Ready',       pct: 90 },
      delivered:        { color: '#38bdf8', label: 'Delivered',         pct: 95 },
      completed:        { color: '#34d399', label: 'Completed',         pct: 100},
      cancelled:        { color: '#f87171', label: 'Cancelled',         pct: 0  },
    };

    const fmtAmt = n => '৳' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    /* TABLE rows */
    tbody.innerHTML = rows.map(c => {
      const orderNum  = c.order_number || c.order_id?.slice(0, 8).toUpperCase() || '—';
      const oSt       = orderStatusMap[c.order_status] || { color: '#94a3b8', label: c.order_status || '—', pct: 0 };
      const pct       = oSt.pct;
      const commAmt   = Number(c.commission_amount || 0);

      const commDisplay = c.commission_status === 'earned'
        ? `<span style="color:#34d399;font-weight:700;">${fmtAmt(commAmt)}</span>`
        : c.commission_status === 'pending'
          ? `<span style="color:#f59e0b;font-weight:600;">${fmtAmt(commAmt)}</span><div style="font-size:10px;color:var(--text-muted);">Pending</div>`
          : `<span style="color:var(--text-muted);">${fmtAmt(commAmt)}</span>`;

      return `
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px 8px;font-size:12px;font-weight:700;color:var(--accent-light);font-family:'Sora',monospace;">${escHtml(orderNum)}</td>
          <td style="padding:10px 8px;font-size:11px;color:var(--text-muted);">${fmtDate(c.created_at)}</td>
          <td style="padding:10px 8px;">
            <span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;background:${oSt.color}20;color:${oSt.color};display:inline-block;">${escHtml(oSt.label)}</span>
          </td>
          <td style="padding:10px 8px;min-width:120px;">
            ${buildProgressBar(pct, oSt.color)}
          </td>
          <td style="padding:10px 8px;font-size:12px;">${commDisplay}</td>
        </tr>`;
    }).join('');

    /* MOBILE CARDS */
    if (cards) {
      cards.innerHTML = rows.map(c => {
        const orderNum = c.order_number || c.order_id?.slice(0, 8).toUpperCase() || '—';
        const oSt      = orderStatusMap[c.order_status] || { color: '#94a3b8', label: c.order_status || '—', pct: 0 };
        const commAmt  = Number(c.commission_amount || 0);
        return `
          <div class="affd-order-mobile-card">
            <div class="affd-omc-header">
              <span class="affd-omc-num">${escHtml(orderNum)}</span>
              <span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;background:${oSt.color}20;color:${oSt.color};">${escHtml(oSt.label)}</span>
            </div>
            <div class="affd-omc-progress">${buildProgressBar(oSt.pct, oSt.color)}</div>
            <div class="affd-omc-footer">
              <span style="font-size:11px;color:var(--text-muted);">${fmtDate(c.created_at)}</span>
              <span style="font-size:13px;font-weight:700;color:${
                c.commission_status === 'earned' ? '#34d399' :
                c.commission_status === 'cancelled' ? '#f87171' :
                c.commission_status === 'withdrawn' ? '#a78bfa' : '#f59e0b'
              };">${fmtAmt(commAmt)}</span>
            </div>
          </div>`;
      }).join('');
    }

  } catch (err) {
    console.error('[Affiliate] loadAffiliateReferredOrders error:', err);
    const errMsg = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">Referred orders load করতে সমস্যা হয়েছে।</td></tr>';
    if (tbody) tbody.innerHTML = errMsg;
  }
}

/* ── Progress bar builder ───────────────────────────────────── */
function buildProgressBar(pct, color) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled  = Math.round(clamped / 10);   // 0–10 blocks
  const empty   = 10 - filled;
  return `
    <div style="display:flex;flex-direction:column;gap:3px;">
      <div style="display:flex;gap:2px;align-items:center;">
        <div style="flex:1;height:6px;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden;">
          <div style="height:100%;width:${clamped}%;background:${color};border-radius:4px;transition:width .4s;"></div>
        </div>
        <span style="font-size:10px;font-weight:700;color:${color};min-width:30px;text-align:right;">${clamped}%</span>
      </div>
    </div>`;
}

/* ── Referral Funnel ─────────────────────────────────────────── */
function renderAffiliateFunnel(stats) {
  const funnelCard = document.getElementById('affFunnelCard');
  if (!funnelCard) return;

  const clicks   = Number(stats.total_clicks   || 0);
  const signups  = Number(stats.conversions     || stats.total_referrals || 0);
  const orders   = Number(stats.converted_orders || 0);
  const earnings = Number(stats.total_earned    || 0);

  // Only show funnel if there's any data
  if (clicks === 0 && signups === 0 && orders === 0) {
    funnelCard.style.display = 'none';
    return;
  }
  funnelCard.style.display = 'block';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('funnelClicksVal',   clicks);
  set('funnelSignupsVal',  signups);
  set('funnelOrdersVal',   orders);
  set('funnelEarningsVal', '৳' + earnings.toLocaleString('en-IN', { minimumFractionDigits: 0 }));

  // Conversion rates
  const ratesEl = document.getElementById('affFunnelRates');
  if (ratesEl && (clicks > 0 || signups > 0)) {
    ratesEl.style.display = 'flex';
    const clickToSignup  = clicks  > 0 ? Math.round(signups / clicks  * 100) : 0;
    const signupToOrder  = signups > 0 ? Math.round(orders  / signups * 100) : 0;
    const overall        = clicks  > 0 ? Math.round(orders  / clicks  * 100) : 0;
    set('funnelRateSignupVal',  clickToSignup  + '%');
    set('funnelRateOrderVal',   signupToOrder  + '%');
    set('funnelRateOverallVal', overall        + '%');
  }
}

/* loadAffiliateReferredOrders is called directly inside loadAffiliateState (line ~1700).
   No observer patch needed — the direct call is sufficient. */

/* ── Responsive: switch orders table ↔ cards ─────────────────── */
(function setupOrdersResponsive() {
  const BREAKPOINT = 600;
  function checkOrders() {
    const table = document.querySelector('.affd-orders-table');
    const cards = document.getElementById('affReferredOrdersCards');
    const scroll = document.querySelector('.affd-orders-table')?.closest('.affd-table-scroll');
    if (!table || !cards) return;
    if (window.innerWidth <= BREAKPOINT) {
      if (scroll) scroll.style.display = 'none';
      cards.style.display = 'flex';
    } else {
      if (scroll) scroll.style.display = '';
      cards.style.display = 'none';
    }
  }
  window.addEventListener('resize', checkOrders);
  document.addEventListener('DOMContentLoaded', checkOrders);
  setTimeout(checkOrders, 500); // after data loads
})();
