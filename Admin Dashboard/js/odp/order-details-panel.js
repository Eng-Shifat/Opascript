/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — Order Details Panel — CORE
   Handles: init, open, close, tab switching, shared state & helpers
   
   Load order in order-management.html:
     <script src="js/odp/order-details-panel.js"></script>  ← LAST
═══════════════════════════════════════════════════════════════════ */
'use strict';

/* ── Shared Global State ─────────────────────────────────────────── */
window._currentOrderId     = null;
window._currentOrder       = null;
window._timerInterval      = null;
window._payRealtimeChannel = null;
window._msgChannel         = null;
window._fileMetaCache      = {};
window._activityLog        = [];

/* ── Supabase helper ─────────────────────────────────────────────── */
window._sb = function() { return window.scriptoraSupabase; };

/* ── UUID validation ─────────────────────────────────────────────── */
window._isRealUUID = function(id) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

/* ── Escape HTML ─────────────────────────────────────────────────── */
window._esc = function(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

/* ── Clip text ───────────────────────────────────────────────────── */
window._clipText = function(str, maxLen) {
  if (str == null || str === '') return '—';
  const clean = String(str).trim().replace(/\s+/g, ' ');
  if (!clean) return '—';
  return clean.length > maxLen ? clean.slice(0, maxLen - 1) + '…' : clean;
};

/* ── Page / word count helpers ───────────────────────────────────── */
window._getPageCount = function(order) {
  if (!order) return null;
  if (Number.isFinite(Number(order.pages)) && Number(order.pages) > 0) return Number(order.pages);
  const d = order.detail || {};
  const fromDetail = parseInt(String(d.pages || ''), 10);
  if (Number.isFinite(fromDetail) && fromDetail > 0) return fromDetail;
  const m = String(d.pages || order.wordcount || '').match(/(\d[\d,]*)/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
window._getWordCount = function(order) {
  const pages = window._getPageCount(order);
  if (pages) return pages * 250;
  const n = parseFloat(String(order.wordcount || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
window._formatWordCount = function(order) {
  const w = window._getWordCount(order);
  return w ? w.toLocaleString() + ' w' : '—';
};
window._formatWordHint = function(order) {
  const w = window._getWordCount(order);
  return w ? '(~' + w.toLocaleString() + ' words)' : '';
};

/* ── Toast notification ──────────────────────────────────────────── */
window._toast = function(msg, color) {
  color = color || 'var(--accent)';
  let t = document.getElementById('odpToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'odpToast';
    t.style.cssText = 'position:fixed;bottom:32px;right:32px;z-index:99999;padding:14px 22px;border-radius:12px;font-size:14px;font-weight:600;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,.4);transition:opacity .4s;pointer-events:none;';
    document.body.appendChild(t);
  }
  t.style.background = color;
  t.style.opacity    = '1';
  t.textContent      = msg;
  clearTimeout(t._hide);
  t._hide = setTimeout(() => { t.style.opacity = '0'; }, 3000);
};

/* ── Deadline parser ─────────────────────────────────────────────── */
window._parseDeadline = function(label, time) {
  if (!label) return null;
  const s = String(label).trim();
  if (/^today$/i.test(s)) {
    const d = new Date();
    if (time) { const [h,m] = time.split(':'); d.setHours(+h||23,+m||59,0,0); }
    return d;
  }
  const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};

  /* Try "30 Jun" or "30 Jun 2026" — day first */
  const m3 = s.match(/^(\d{1,2})\s+([a-z]{3})(?:\s+(\d{4}))?$/i);
  if (m3) {
    const mo = months[m3[2].toLowerCase()];
    if (mo !== undefined) {
      const nd = new Date();
      const yr = m3[3] ? +m3[3] : nd.getFullYear();
      nd.setFullYear(yr); nd.setMonth(mo); nd.setDate(+m3[1]);
      if (!m3[3] && nd < new Date()) nd.setFullYear(nd.getFullYear() + 1);
      if (time) { const [h,mn] = time.split(':'); nd.setHours(+h||23,+mn||59,0,0); }
      else nd.setHours(23,59,0,0);
      return nd;
    }
  }

  /* Try "Jun 30" — month first */
  const m2 = s.match(/^([a-z]{3})\s+(\d{1,2})$/i);
  if (m2) {
    const mo = months[m2[1].toLowerCase()];
    if (mo !== undefined) {
      const nd = new Date();
      nd.setMonth(mo); nd.setDate(+m2[2]);
      if (nd < new Date()) nd.setFullYear(nd.getFullYear() + 1);
      if (time) { const [h,mn] = time.split(':'); nd.setHours(+h||23,+mn||59,0,0); }
      return nd;
    }
  }

  /* Fallback: native Date parse */
  const d = new Date(s + (time ? ' ' + time : ''));
  if (!isNaN(d)) return d;
  return null;
};

/* ── Countdown timer ─────────────────────────────────────────────── */
window._startTimer = function(deadlineStr) {
  const timerEl = document.getElementById('odpTimer');
  if (!timerEl) return;
  if (window._timerInterval) clearInterval(window._timerInterval);
  const parts = String(deadlineStr || '').split(' ');
  const target = window._parseDeadline(parts[0], parts[1]);
  if (!target || isNaN(target)) { timerEl.textContent = ''; return; }
  function tick() {
    const diff = target - Date.now();
    if (diff <= 0) { timerEl.textContent = 'OVERDUE'; timerEl.style.color = 'var(--red)'; clearInterval(window._timerInterval); return; }
    const d = Math.floor(diff/86400000), h = Math.floor((diff%86400000)/3600000),
          m = Math.floor((diff%3600000)/60000),  s = Math.floor((diff%60000)/1000);
    timerEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
    timerEl.style.color = diff < 86400000 ? 'var(--red)' : diff < 259200000 ? 'var(--gold)' : 'var(--green)';
  }
  tick();
  window._timerInterval = setInterval(tick, 1000);
};

/* ── Sync payment info in Overview card ──────────────────────────── */
window._syncOrderInfoPayments = function(order) {
  if (!order) return;
  const fin = (order && order.detail && order.detail.financials) || {};
  const due  = fin.due  !== undefined ? fin.due  : (order.due_amount  || '—');
  const paid = fin.paid !== undefined ? fin.paid : (order.advance_paid || 0);
  const pct  = fin.paidPct || 0;
  const ps   = order.paymentStatus || 'pending';

  const dueFmt  = typeof due  === 'number' ? (due  ? '৳' + Number(due).toLocaleString()  : '৳0') : String(due);
  const paidFmt = typeof paid === 'number' ? (paid ? '৳' + Number(paid).toLocaleString() : '৳0') : String(paid);

  const el = (id) => document.getElementById(id);
  if (el('odpOiDue'))      el('odpOiDue').textContent      = dueFmt;
  if (el('odpOiPaid'))     el('odpOiPaid').textContent     = paidFmt;
  if (el('odpOiProgress')) el('odpOiProgress').textContent = pct + '%';

  const payPill = el('odpOiPayStatus');
  if (payPill) {
    const lbl = { pending:'Unpaid', under_review:'Pending', approved:'Approved', paid:'Paid', rejected:'Rejected' }[ps] || 'Pending';
    const cls = { pending:'odp-oi-pay-unpaid', under_review:'odp-oi-pay-partial', approved:'odp-oi-pay-paid', paid:'odp-oi-pay-paid', rejected:'odp-oi-pay-unpaid' }[ps] || 'odp-oi-pay-unpaid';
    payPill.textContent = lbl;
    payPill.className   = 'odp-oi-pay-pill ' + cls;
  }
};

/* ══════════════════════════════════════════════════════════════════
   OPEN PANEL
══════════════════════════════════════════════════════════════════ */
window.openOrderDetailsPanel = function(order) {
  if (document.getElementById('odpOverlay')) return;

  window._currentOrder   = order;
  window._currentOrderId = order.id || order.orderId || null;

  const statusClass = order.statusClass || 's-pending';
  document.body.insertAdjacentHTML('beforeend', window._buildShell(order));
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => {
    const ov = document.getElementById('odpOverlay');
    if (ov) { ov.style.opacity = '0'; setTimeout(() => { ov.style.opacity = '1'; ov.classList.add('odp-open'); }, 10); }
  });

  window._startTimer(order.deadline);
  window._loadFullOrderData();
  window.odpSwitchTab('overview');
};

/* ── Load full order from Supabase ───────────────────────────────── */
window._loadFullOrderData = async function() {
  if (!window._sb()) return;
  if (!window._isRealUUID(window._currentOrderId)) {
    if (window._currentOrder && window._currentOrder.detail) {
      window._renderThesisDetailsCard(window._currentOrder, null);
    }
    return;
  }
  try {
    const [{ data: ord }, { data: payments }] = await Promise.all([
      window._sb().from('orders').select('*').eq('id', window._currentOrderId).single(),
      window._sb().from('payments').select('amount,type,confirmed').eq('order_id', window._currentOrderId)
    ]);
    if (!ord) return;
    if (window._currentOrder) {
      window._currentOrder.clientId = ord.client_id || window._currentOrder.clientId || '';
      window._currentOrder._rawDB = ord;  /* full DB row for Order Summary */
    }

    /* Payment financials — ONLY sum admin-confirmed rows, never fall back to advance_paid column */
    const total = Number(ord.total_price || 0);
    let paid = 0;
    if (payments && payments.length) {
      paid = payments
        .filter(p => p.confirmed === true && (p.type === 'received' || p.type === 'approval'))
        .reduce((s, p) => s + Number(p.amount || 0), 0);
    }
    const due     = Math.max(0, total - paid);
    const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

    if (!window._currentOrder.detail) window._currentOrder.detail = {};
    window._currentOrder.detail.financials = { total, paid, due, paidPct };
    window._currentOrder.paymentStatus = ord.payment_status || window._currentOrder.paymentStatus;

    /* If Payments tab DOM already exists (e.g. user is on it), sync the stat cards now */
    const sp = document.getElementById('odpPaySummaryPaid');
    const sd = document.getElementById('odpPaySummaryDue');
    if (sp) sp.textContent = '\u09F3' + Number(paid).toLocaleString();
    if (sd) sd.textContent = '\u09F3' + Number(due).toLocaleString();

    /* Client data */
    let client = null;
    if (ord.client_id) {
      const { data: cl } = await window._sb().from('clients').select('*').eq('id', ord.client_id).single();
      client = cl;
    }

    window._renderClientSubmission(ord, client);
    window._renderClientInfoFromDB(ord, client);
    window._renderThesisDetailsCard(ord, client);
    window._syncOrderInfoPayments(window._currentOrder);

    /* Re-render Order Summary tab now that _rawDB is available */
    const summaryEl = document.getElementById('odpSummaryContent');
    if (summaryEl && window._currentOrder) {
      summaryEl.innerHTML = window._buildOrderSummaryHTML(window._currentOrder);
      /* Call immediately after render so odpClientAttachCount is in DOM */
      window._loadClientFilesCount();
    }

    /* Status sync */
    const clsMap = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', in_review:'s-review', overdue:'s-overdue', hold:'s-pending' };
    const lblMap = { writing:'In Progress', completed:'Completed', pending:'Pending', draft_ready:'Delivered', in_review:'Client Review', overdue:'Overdue', hold:'On Hold' };
    document.querySelectorAll('.odp-status-pill').forEach(pill => {
      pill.className   = 'odp-status-pill ' + (clsMap[ord.status] || 's-pending');
      pill.textContent = lblMap[ord.status] || ord.status;
    });
    const statusSel = document.getElementById('odpStatusSelect');
    if (statusSel && ord.status) statusSel.value = ord.status;

    /* Sync current order status from DB */
    if (window._currentOrder) window._currentOrder.status = ord.status;

    /* Show client review request banner if in_review */
    if (typeof window._loadClientReviewRequest === 'function') {
      window._loadClientReviewRequest();
    }

    window._subscribePaymentsRealtime();
    if (typeof window._subscribeRevisionsRealtime === 'function') window._subscribeRevisionsRealtime();
    window._loadClientOrderCount();

    /* Re-render Overview sidebar (ORDER PROGRESS + QUICK ACTIONS) now that _rawDB and financials are loaded */
    _refreshOverviewSidebar();

  } catch(e) { console.error('loadFullOrderData:', e); }
};

/* ══════════════════════════════════════════════════════════════════
   CLOSE PANEL
══════════════════════════════════════════════════════════════════ */
window.closeOrderDetailsPanel = function() {
  const ov = document.getElementById('odpOverlay');
  if (ov) ov.remove();
  document.body.style.overflow = '';
  if (window._timerInterval) { clearInterval(window._timerInterval); window._timerInterval = null; }
  if (window._payRealtimeChannel && window._sb()) { window._sb().removeChannel(window._payRealtimeChannel); window._payRealtimeChannel = null; }
  if (window._msgChannel && window._sb()) { window._sb().removeChannel(window._msgChannel); window._msgChannel = null; }
  if (window._revRealtimeChannel && window._sb()) { window._sb().removeChannel(window._revRealtimeChannel); window._revRealtimeChannel = null; }
  window._currentOrderId = null;
  window._currentOrder   = null;
  window._fileMetaCache  = {};
};

/* ── Re-render only the right sidebar (ORDER PROGRESS + QUICK ACTIONS) ── */
function _refreshOverviewSidebar() {
  const sidebar = document.querySelector('.odp-ov-sidebar');
  if (!sidebar || !window._currentOrder || !window._buildOverviewHTML) return;
  const order = window._currentOrder;
  const statusClass = order.statusClass || 's-pending';

  /* Build a temp container to extract only the sidebar html */
  const tmp = document.createElement('div');
  // _buildOverviewHTML returns the full 2-col grid; we need to rebuild sidebar only
  // Build milestones inline here to keep it self-contained
  const _rawDB2 = order._rawDB || {};
  const _dbStatus = _rawDB2.status || order.status || '';
  const _dbPayStatus = _rawDB2.payment_status || order.paymentStatus || '';
  const _isPayConfirmed = _dbPayStatus === 'confirmed' || _dbPayStatus === 'paid' || _dbPayStatus === 'approved'
    || (order.detail && order.detail.financials && order.detail.financials.paid > 0);
  const _statusOrderMap = { 'pending':1, 'writing':2, 'draft_ready':3, 'in_review':4, 'revision':2, 'completed':5, 'overdue':2, 'hold':1 };
  const _statusIdx = _statusOrderMap[_dbStatus] || 0;

  const milestones = [
    { name:'Order Placed', state:'done', date: _rawDB2.created_at ? new Date(_rawDB2.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '' },
    { name:'Payment Confirmed', state: _isPayConfirmed ? 'done' : (_statusIdx >= 1 ? 'active' : 'pending'), date: _isPayConfirmed ? '' : 'Pending' },
    { name:'Work Started', state: _statusIdx >= 2 ? (_statusIdx > 2 ? 'done' : 'active') : 'pending', date: _statusIdx >= 2 ? (_rawDB2.updated_at ? new Date(_rawDB2.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '') : 'Pending' },
    { name:'Draft Ready', state: _statusIdx >= 3 ? (_statusIdx > 3 ? 'done' : 'active') : 'pending', date: _statusIdx >= 3 ? '' : 'Pending' },
    { name:'Review', state: _dbStatus === 'in_review' ? 'active' : (_dbStatus === 'revision' ? 'done' : (_statusIdx > 3 ? 'done' : 'pending')), date: (_dbStatus === 'in_review' || _dbStatus === 'revision') ? 'Client Reviewed' : 'Pending' },
    { name:'Delivered', state: _statusIdx >= 5 ? 'done' : 'pending', date: _statusIdx >= 5 ? '' : 'Pending' },
  ];

  const pct = order.detail && order.detail.financials
    ? order.detail.financials.paidPct
    : ({ 'pending':5, 's-pending':5, 'writing':40, 's-inprogress':40, 'draft_ready':80, 'in_review':85, 's-review':80, 'completed':100, 's-completed':100 }[statusClass] || 0);
  const pctColor = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';
  const pfClass  = pct >= 80 ? 'pf-green' : pct >= 40 ? 'pf-yellow' : 'pf-red';

  function _escSb(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  const stepsHTML = milestones.map((ms, i) => {
    const isDone   = ms.state === 'done';
    const isActive = ms.state === 'active';
    const dotCls   = isDone ? 'done' : isActive ? 'active' : '';
    const icon     = isDone ? '<i class="ti ti-check"></i>' : isActive ? '<div class="odp-vt-pulse"></div>' : '';
    return `<div class="odp-vt-step">
      <div class="odp-vt-dot-wrap">
        <div class="odp-vt-dot ${dotCls}">${icon}</div>
        ${i < milestones.length - 1 ? `<div class="odp-vt-line ${isDone ? 'done' : isActive ? 'active' : ''}"></div>` : ''}
      </div>
      <div class="odp-vt-body">
        <div class="odp-vt-name ${dotCls}">${_escSb(ms.name)}</div>
        <div class="odp-vt-date">${_escSb(ms.date || 'Pending')}</div>
      </div>
    </div>`;
  }).join('');

  const phaseLabel = statusClass === 's-inprogress' ? 'In Progress' : statusClass === 's-review' ? 'Review Phase' : statusClass === 's-completed' ? 'Completed' : 'Pending';

  /* current selected value */
  const curStatus = _dbStatus || order.status || '';
  const sc = order.statusClass || 's-pending';

  sidebar.innerHTML = `
    <!-- Order Progress — vertical timeline -->
    <div class="odp-card odp-progress-card odp-vt-card">
      <div class="odp-card-title"><i class="ti ti-chart-bar"></i> Order Progress</div>
      <div class="odp-vt-steps">${stepsHTML}</div>
      <div class="odp-prog-label-row" style="margin-top:16px">
        <span>Overall Progress</span>
        <span style="color:${pctColor};font-weight:800">${pct}%</span>
      </div>
      <div class="odp-progress-track" style="margin:6px 0 4px">
        <div class="odp-progress-fill ${pfClass}" style="width:${pct}%"></div>
      </div>
      <div class="odp-prog-phase-pill">
        <span class="odp-prog-dot ${pfClass}"></span>
        ${phaseLabel}
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="odp-card odp-qa-card">
      <div class="odp-card-title"><i class="ti ti-bolt"></i> Quick Actions</div>
      <div class="odp-qa-list">
        <div class="odp-qa-select-wrap">
          <i class="ti ti-edit"></i>
          <select class="odp-qa-select" id="odpStatusSelect" onchange="odpUpdateStatus(this.value)">
            <option value="" disabled ${!curStatus?'selected':''}>Update Order Status</option>
            <option value="writing"     ${curStatus==='writing'    ?'selected':''}>🔵 In Progress</option>
            <option value="draft_ready" ${curStatus==='draft_ready'?'selected':''}>📦 Delivered (Waiting Review)</option>
            <option value="in_review"   ${curStatus==='in_review'  ?'selected':''}>🔶 Revision Requested</option>
            <option value="revision"    ${curStatus==='revision'   ?'selected':''}>✏️ Revision in Progress</option>
            <option value="completed"   ${curStatus==='completed'  ?'selected':''}>🟢 Completed</option>
            <option value="pending"     ${curStatus==='pending'    ?'selected':''}>🟡 Pending</option>
            <option value="overdue"     ${curStatus==='overdue'    ?'selected':''}>🔴 Overdue</option>
            <option value="hold"        ${curStatus==='hold'       ?'selected':''}>⚫ On Hold</option>
          </select>
        </div>
        <button class="odp-qa-btn odp-qa-danger" onclick="odpMarkCompleted()">
          <i class="ti ti-circle-check"></i> Mark as Completed
        </button>
      </div>
    </div>
    <!-- Client review request banner -->
    <div id="odpClientReviewWrap"></div>
  `;
}


/* ══════════════════════════════════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════════════════════════════════ */
window.odpSwitchTab = function(name) {
  document.querySelectorAll('.odp-tab').forEach(b => b.classList.toggle('odp-active', b.dataset.odpTab === name));
  document.querySelectorAll('[data-odp-pane]').forEach(p => p.classList.toggle('odp-pane-active', p.dataset.odpPane === name));

  if (name === 'messages') window._loadMessages();
  if (name === 'files')    window._loadFiles();
  if (name === 'payments') { window._reloadPaymentFinancials(); window._loadPaymentHistory(); }
  if (name === 'activity')  window._loadActivity();
  if (name === 'revisions') window._loadRevisions();
};
