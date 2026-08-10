/* ================================================
   SCRIPTORA — dashboard.js  (Supabase connected)
   ================================================ */

const SUPABASE_URL  = 'https://hivrmntxpmpwthmjtoem.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
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
  /* Step 1 — Order Placed */
  'pending':1, 'confirmed':1, 'hold':1,
  /* Step 2 — Payment Received */
  'payment_received':2, 'payment_done':2,
  /* Step 3 — Writing চলছে */
  'writing':3, 'in_progress':3, 'overdue':3,
  /* Step 4 — File in Review */
  'in_review':4, 'draft_ready':4, 'draft_sent':4, 's-review':4,
  /* Step 5 — Delivery */
  'delivered':5,
  /* Step 6 — Completed */
  'completed':6,
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
  setText('headerName', name.split(' ')[0]); setText('sbAvatar', getInitials(name));
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
    case 'in_review':   return ['draft_sent','revision'].includes(order.status);
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
    const badge = getStatusBadge(order.status);
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
      <div class="${cdColor} js-countdown" data-deadline="${order.deadline}">${diffMs>0?formatCountdown(diffMs):'সময় শেষ!'}</div>
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
  startCountdown(order.deadline);
  renderStepper(order.status);
  setText('detailTotal',`৳${fmt(order.total_price)}`);

  /* ── Fetch live approved-payment sum (don't trust stale advance_paid column) ── */
  let livePaid = 0, liveDue = 0;
  try {
    const { data: approvedPays } = await sb
      .from('payments')
      .select('amount')
      .eq('order_id', orderId)
      .eq('confirmed', true)
      .in('type', ['received', 'approval']);
    livePaid = (approvedPays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    liveDue  = Math.max(0, Number(order.total_price || 0) - livePaid);
  } catch(_) {
    /* fallback to order row if query fails */
    livePaid = order.advance_paid || 0;
    liveDue  = order.due_amount   || 0;
  }

  setText('detailAdvance',`৳${fmt(livePaid)}`);
  setText('detailDue',`৳${fmt(liveDue)}`);
  const payBadges=document.getElementById('payBadges');
  payBadges.innerHTML='';
  if(livePaid>0) payBadges.innerHTML+=`<span class="pay-badge confirmed">✓ Advance paid</span>`;
  if(liveDue>0)  payBadges.innerHTML+=`<span class="pay-badge pending">✗ Due pending</span>`;

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

function startCountdown(deadlineStr) {
  clearInterval(countdownTimer);
  const deadline=new Date(deadlineStr);
  function tick() {
    const diff=deadline-new Date();
    if(diff<=0){
      ['cdDays','cdHours','cdMins','cdSecs'].forEach(id=>setText(id,'00'));
      setText('cdDaysLeft','সময় শেষ!'); clearInterval(countdownTimer); return;
    }
    const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000);
    const m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    setText('cdDays',pad(d)); setText('cdHours',pad(h));
    setText('cdMins',pad(m)); setText('cdSecs',pad(s));
    setText('cdDeadline',fmtDateLong(deadlineStr));
    setText('cdDaysLeft',`আর মাত্র ${d} দিন বাকি`);
    const el2=document.getElementById('cdDaysLeft2'); if(el2) el2.textContent=d;
  }
  tick(); countdownTimer=setInterval(tick,1000);
}

function renderStepper(status) {
  const stepper=document.getElementById('progressStepper');
  const currentStep=STATUS_STEP_MAP[status]??0;
  stepper.innerHTML='';
  STEPS.forEach((step,i)=>{
    const isDone=i<currentStep, isActive=i===currentStep;
    const cls=isDone?'done':isActive?'active':'pending';
    const icon=isDone
      ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`
      :isActive
        ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
        :`${i+1}`;
    const div=document.createElement('div');
    div.className=`step ${cls}`;
    div.innerHTML=`<div class="step-circle ${cls}">${icon}</div><div class="step-label ${cls}">${step.label.replace('\n',' ')}</div>`;
    stepper.appendChild(div);
  });
}

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

    if (!accessRows || !accessRows.length) {
      list.innerHTML = '<div class="empty-note">কোনো file পাঠানো হয়নি</div>';
      return;
    }

    list.innerHTML = '';
    const PREVIEW_LIMIT = 4;
    const totalCount = accessRows.length;
    const previewRows = accessRows.slice(0, PREVIEW_LIMIT);
    for (const row of previewRows) {
      const parts = row.storage_path.split('/');
      const fileName = parts[parts.length - 1];
      const ext = fileName.split('.').pop().toUpperCase();
      const iconCls = {'PDF':'fi-pdf','PNG':'fi-png','JPG':'fi-jpg','JPEG':'fi-jpeg','DOC':'fi-doc','DOCX':'fi-docx'}[ext]||'fi-doc';
      /* Download: admin manually unlock করলে সবসময় পারবে
         due=0 হলে auto-unlock হয়, কিন্তু admin manually unlock করলে due থাকলেও পারবে */
      const dlAllowed = row.download_allowed;

      const div = document.createElement('div');
      div.className = 'file-item';

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
          <div class="file-meta">${fmtDate(row.updated_at)}</div>
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
  const {data:payments}=await sb.from('payments').select('*').eq('client_id',currentUser.id).order('id',{ascending:false});
  const container=document.getElementById('paymentsList');
  const empty=document.getElementById('paymentsEmpty');
  if(!payments||payments.length===0){empty.style.display='flex';return;}
  empty.style.display='none'; container.innerHTML='';
  payments.forEach(pay=>{
    const cls=pay.confirmed?'confirmed':'pending';
    const lbl=pay.confirmed?'✓ Confirmed':'⏳ Pending';
    const item=document.createElement('div'); item.className='payment-item';
    item.innerHTML=`
      <div class="pi-left">
        <div class="pi-order">${escHtml(pay.orders?.title||'Order')}</div>
        <div class="pi-method">${escHtml(pay.method||'')}${pay.txn_id?` · TXN: ${escHtml(pay.txn_id)}`:''}</div>
        <div class="pi-txn">${fmtDateLong(pay.created_at)}</div>
      </div>
      <div class="pi-right">
        <div><div class="pi-amount">৳${fmt(pay.amount)}</div><div><span class="pay-badge ${cls}">${lbl}</span></div></div>
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
  const name=currentClient.name||'';
  const parts=name.split(' ');
  setVal('pFirstName',parts[0]||''); setVal('pLastName',parts.slice(1).join(' ')||'');
  setVal('pEmail',currentClient.email||''); setVal('pPhone',currentClient.phone||'');
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
  const {error}=await sb.from('clients').update({name:fullName,phone:getVal('pPhone').trim(),university:getVal('pUniversity').trim(),subject:getVal('pSubject').trim(),academic_year:getVal('pYear').trim()}).eq('id',currentUser.id);
  btn.textContent='Profile Save করুন'; btn.disabled=false;
  if(error){showProfileMsg('profileMsg','Save হয়নি: '+error.message,'error');}
  else{currentClient.name=fullName;updateSidebarUser();showProfileMsg('profileMsg','✓ Profile save হয়েছে!','success');showToast('Profile update হয়েছে','success');}
}

async function changePassword() {
  const btn=document.getElementById('passChangeBtn');
  const current=getVal('pCurrentPass'),newPass=getVal('pNewPass'),confirm=getVal('pConfirmPass');
  if(!current||!newPass||!confirm){showProfileMsg('passMsg','সব field পূরণ করুন','error');return;}
  if(newPass.length<8){showProfileMsg('passMsg','কমপক্ষে ৮ অক্ষর হতে হবে','error');return;}
  if(newPass!==confirm){showProfileMsg('passMsg','নতুন password মিলছে না','error');return;}
  btn.textContent='Updating...'; btn.disabled=true;

  /* বর্তমান password দিয়ে re-verify */
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
  'draft_ready': 'In Review — রিভিউ চলছে',
  'overdue':     'Overdue — সময় পার হয়ে গেছে',
  'hold':        'On Hold — বিরতিতে আছে',
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
function getStatusBadge(status){const map={'pending':{cls:'badge-pending',label:'Pending'},'confirmed':{cls:'badge-confirmed',label:'Confirmed'},'payment_done':{cls:'badge-confirmed',label:'Payment Done'},'writing':{cls:'badge-writing',label:'Writing চলছে'},'draft_sent':{cls:'badge-writing',label:'Draft Sent'},'draft_ready':{cls:'badge-review',label:'In Review'},'final_payment':{cls:'badge-pending',label:'Final Payment'},'completed':{cls:'badge-completed',label:'Completed'},'revision':{cls:'badge-revision',label:'Revision'}};return map[status]||{cls:'badge-pending',label:status||'Pending'};}
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
