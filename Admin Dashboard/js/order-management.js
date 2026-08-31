// ── DATA ──
const ORDERS = [
  {
    id: '#SCR-2891', client: 'Emma Thornton', uni: 'Oxford University',
    topic: 'Quantum Entanglement in Cryptographic Protocols',
    pkg: 'PhD Thesis', pkgClass: 'pkg-phd',
    chapters: 6, wordcount: '82,400 w',
    progressPct: 23, progressBars: [80, 40, 0],
    deadline: 'Today', deadlineTime: '11:59 PM', deadlineClass: 'deadline-today',
    status: 'OVERDUE', statusClass: 's-overdue',
    amount: '$1,240', rowClass: 'row-overdue',
    avatarColor: '#7c6af7', initials: 'ET',
    detail: {
      pages: '180 pp', type: 'PhD Thesis', chapters: 6, wordcount: '82,400 w',
      value: '$1,240', deadline: 'Today 11:59',
      overall: 23, drafted: '41 / 180 pages drafted',
      chapterBreakdown: [
        { name: 'Ch.1 Intro', pct: 100, label: 'Done', color: '#22c987' },
        { name: 'Ch.2 Lit Rev', pct: 40, label: '40%', color: '#f5a623' },
        { name: 'Ch.3 Method', pct: 0, label: '0%', color: '#565d7a' },
        { name: 'Ch.4 Results', pct: 0, label: '0%', color: '#565d7a' },
        { name: 'Ch.5 Discuss', pct: 0, label: '0%', color: '#565d7a' },
        { name: 'Ch.6 Concl.', pct: 0, label: '0%', color: '#565d7a' },
      ],
      milestones: [
        { name: 'Order Confirmed', date: 'May 20 · 09:14 AM', state: 'done' },
        { name: 'Outline Submitted', date: 'May 25 · 06:45 PM', state: 'done' },
        { name: 'Draft in Progress', date: 'Started Jun 1', sub: '& Behind schedule', state: 'active' },
        { name: 'QA Review', date: 'Pending', state: 'pending' },
        { name: 'Delivered', date: 'Pending', state: 'pending' },
      ],
      files: [
        { name: 'ch1_intro_draft.pdf', type: 'pdf' },
        { name: 'outline_v2.docx', type: 'docx' },
      ],
      notes: 'Client requires strict IEEE citation. Ch.3 needs experimental data from lab partner. Escalate if no update by 5PM today.',
      overallColor: '#ff5a5a',
      email: 'emma.t@oxford.ac.uk',
      clientLabel: 'Oxford University · 4 orders · Gold',
      subject: 'Quantum Physics / Cryptography',
      citationStyle: 'IEEE',
      financials: { total: '$1,240', paid: '$620', due: '$620', paidPct: 50 },
    }
  },
  {
    id: '#SCR-2887', client: 'Priya Nair', uni: 'Cambridge University',
    topic: 'CRISPR-Cas9 Gene Editing in Hereditary Diseases',
    pkg: 'MSc Thesis', pkgClass: 'pkg-msc',
    chapters: 5, wordcount: '44,200 w',
    progressPct: 41, progressBars: [100, 70, 20],
    deadline: 'Jun 6', deadlineTime: '09:00 AM', deadlineClass: '',
    status: 'OVERDUE', statusClass: 's-overdue',
    amount: '$890', rowClass: 'row-overdue',
    avatarColor: '#4a9eff', initials: 'PN',
    detail: null
  },
  {
    id: '#SCR-2885', client: 'James Okafor', uni: 'LSE London',
    topic: 'Machine Learning in Financial Fraud Detection',
    pkg: 'MBA Thesis', pkgClass: 'pkg-mba',
    chapters: 7, wordcount: '38,600 w',
    progressPct: 62, progressBars: [100, 100, 50],
    deadline: 'Jun 8', deadlineTime: '05:00 PM', deadlineClass: '',
    status: 'In Progress', statusClass: 's-inprogress',
    amount: '$650', rowClass: '',
    avatarColor: '#22c987', initials: 'JO',
    detail: null
  },
  {
    id: '#SCR-2882', client: 'Sofia Reyes', uni: 'UCL London',
    topic: 'Post-Colonial Identity in Contemporary African Literature',
    pkg: 'MA Thesis', pkgClass: 'pkg-ma',
    chapters: 5, wordcount: '29,800 w',
    progressPct: 78, progressBars: [100, 100, 80],
    deadline: 'Jun 9', deadlineTime: '12:00 PM', deadlineClass: '',
    status: 'In Review', statusClass: 's-review',
    amount: '$480', rowClass: '',
    avatarColor: '#f06292', initials: 'SR',
    detail: null
  },
  {
    id: '#SCR-2879', client: 'Liam Kowalski', uni: 'Warwick University',
    topic: 'Behavioural Economics & Nudge Theory in Policy',
    pkg: 'PhD Thesis', pkgClass: 'pkg-phd',
    chapters: 8, wordcount: '91,000 w',
    progressPct: 55, progressBars: [100, 90, 40],
    deadline: 'Jun 10', deadlineTime: '06:00 PM', deadlineClass: '',
    status: 'In Progress', statusClass: 's-inprogress',
    amount: '$1,100', rowClass: '',
    avatarColor: '#7c6af7', initials: 'LK',
    detail: null
  },
  {
    id: '#SCR-2876', client: 'Aisha Osei', uni: 'Edinburgh University',
    topic: 'Urban Heat Islands: Mitigation via Green Infrastructure',
    pkg: 'BSc Thesis', pkgClass: 'pkg-bsc',
    chapters: 4, wordcount: '18,400 w',
    progressPct: 91, progressBars: [100, 100, 90],
    deadline: 'Jun 14', deadlineTime: '03:00 PM', deadlineClass: '',
    status: 'QA Review', statusClass: 's-review',
    amount: '$320', rowClass: '',
    avatarColor: '#f5a623', initials: 'AO',
    detail: null
  },
  {
    id: '#SCR-2874', client: 'Carlos Mendez', uni: 'MIT',
    topic: 'Autonomous Vehicle Ethics: Trolley Problem Revisited',
    pkg: 'PhD Proposal', pkgClass: 'pkg-proposal',
    chapters: 3, wordcount: '12,000 w',
    progressPct: 85, progressBars: [100, 100, 75],
    deadline: 'Jun 16', deadlineTime: '10:00 AM', deadlineClass: '',
    status: 'In Progress', statusClass: 's-inprogress',
    amount: '$760', rowClass: '',
    avatarColor: '#4a9eff', initials: 'CM',
    detail: null
  },
  {
    id: '#SCR-2871', client: 'Yuki Tanaka', uni: 'Tokyo University',
    topic: 'Microbiome Diversity in Antibiotic-Resistant Strains',
    pkg: 'MSc Thesis', pkgClass: 'pkg-msc',
    chapters: 6, wordcount: '48,200 w',
    progressPct: 0, progressBars: [0, 0, 0],
    deadline: 'Jun 20', deadlineTime: '08:00 AM', deadlineClass: '',
    status: 'Pending', statusClass: 's-pending',
    amount: '$920', rowClass: '',
    avatarColor: '#22c987', initials: 'YT',
    detail: null
  },
  {
    id: '#SCR-2868', client: 'David Okonkwo', uni: 'Harvard University',
    topic: 'Blockchain Governance in Decentralised Finance',
    pkg: 'MBA Thesis', pkgClass: 'pkg-mba',
    chapters: 6, wordcount: '33,100 w',
    progressPct: 100, progressBars: [100, 100, 100],
    deadline: 'Jun 4', deadlineTime: '02:00 PM', deadlineClass: '',
    status: 'Completed', statusClass: 's-completed',
    amount: '$540', rowClass: 'row-completed',
    avatarColor: '#f06292', initials: 'DO',
    detail: null
  },
  {
    id: '#SCR-2865', client: 'Arjun Sharma', uni: 'IIT Delhi',
    topic: 'Deep Learning for Real-Time Medical Image Segmentation',
    pkg: 'PhD Thesis', pkgClass: 'pkg-phd',
    chapters: 9, wordcount: '104,000 w',
    progressPct: 38, progressBars: [100, 60, 20],
    deadline: 'Jun 22', deadlineTime: '11:00 AM', deadlineClass: '',
    status: 'In Progress', statusClass: 's-inprogress',
    amount: '$1,580', rowClass: '',
    avatarColor: '#7c6af7', initials: 'AS',
    detail: null
  },
];

// ── STATE ──
let activeOrderId = '#SCR-2891';
let timerInterval = null;
let timerSeconds = 4 * 3600 + 37 * 60 + 31;

// ── RENDER TABLE ──
function renderTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!ORDERS.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:3rem;color:rgba(255,255,255,0.25);font-size:13px;"><i class="ti ti-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>No orders found</td></tr>`;
    return;
  }
  tbody.innerHTML = ORDERS.map(o => `
    <tr class="${o.rowClass} ${activeOrderId === o.id ? 'active-row' : ''}" data-id="${o.id}" data-status="${o.statusClass === 's-overdue' ? 'overdue' : o.statusClass === 's-inprogress' ? 'writing' : o.statusClass === 's-review' ? 'draft_ready' : o.statusClass === 's-completed' ? 'completed' : 'pending'}" onclick="selectOrder('${o.id}')">
      <td><span class="order-id">${o.orderId || o.id}</span></td>
      <td>
        <div class="topic-cell">
          <div class="topic-title">${o.topic}</div>
          <div class="topic-uni">${o.uni}</div>
        </div>
      </td>
      <td><span class="pkg-badge ${o.pkgClass}" data-pkg="${o.pkg || ''}">${o.pkg || '<span style=\"color:rgba(255,255,255,0.3);font-style:italic\">—</span>'}</span></td>
      <td>
        <span class="status-badge ${o.statusClass}">${o.status}</span>
        ${o.paymentStatus === 'rejected' ? '<span class="status-badge s-rejected" style="margin-top:3px;display:block;font-size:10px">💳 Payment Rejected</span>' : ''}
        ${(o.paymentStatus === 'unpaid' || o.paymentStatus === 'under_review') && o.statusClass === 's-pending' ? '<span class="status-badge" style="margin-top:3px;display:block;font-size:10px;background:rgba(245,158,11,0.12);color:#fbbf24;border:1px solid rgba(245,158,11,0.25)">' + (o.paymentStatus === 'under_review' ? '⏳ Payment Review' : '⏳ Awaiting Payment') + '</span>' : ''}
      </td>
      <td class="deadline-cell">
        <div class="deadline-date ${o.deadlineClass}">${o.deadline}</div>
        <div class="deadline-time">${o.deadlineTime}</div>
      </td>
      <td class="amount">${o.amount}</td>
    </tr>
  `).join('');
}

// ── SELECT ORDER ──
function selectOrder(id) {
  activeOrderId = id;
  renderTable();
  const order = ORDERS.find(o => o.id === id);
  if (order) {
    openOrderDetailsPanel(order);
  }
}

// ── RENDER BASIC PANEL (for orders without full detail) ──
function renderBasicPanel(order) {
  const panel = document.getElementById('detailPanel');

  document.getElementById('detailOrderId').textContent = order.id;
  document.getElementById('detailTopic').textContent = order.topic;

  // Show timer with deadline countdown
  document.getElementById('timerBox').style.display = 'flex';
  startDeadlineTimer(order.deadline + ' ' + order.deadlineTime);

  // Client info
  document.getElementById('detailClientAvatar').style.background = order.avatarColor;
  document.getElementById('detailClientInitials').textContent = order.initials;
  document.getElementById('detailClientName').textContent = order.client;
  document.getElementById('detailClientInfo').textContent = order.uni;

  // Basic fields
  document.getElementById('detailType').textContent = order.pkg;
  document.getElementById('detailPages').textContent = '—';
  document.getElementById('detailChapters').textContent = order.chapters + ' chapters';
  document.getElementById('detailWordcount').textContent = order.wordcount;
  document.getElementById('detailValue').textContent = order.amount;
  document.getElementById('detailDeadline').textContent = order.deadline + ' ' + order.deadlineTime;

  // Clear chapter breakdown & milestones
  document.getElementById('chapterBreakdown').innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">Detailed breakdown not available yet.</div>';
  document.getElementById('overallPct').textContent = order.progressPct + '%';
  document.getElementById('overallPct').style.color = order.progressPct >= 80 ? '#22c987' : order.progressPct >= 40 ? '#f5a623' : '#ff5a5a';
  document.getElementById('overallBar').style.width = order.progressPct + '%';
  document.getElementById('overallBar').style.background = order.progressPct >= 80 ? '#22c987' : order.progressPct >= 40 ? '#f5a623' : '#ff5a5a';
  document.getElementById('overallDrafted').textContent = order.progressPct + '% complete';
  document.getElementById('milestoneList').innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">Timeline not available yet.</div>';
  document.getElementById('fileList').innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px 0">No files uploaded yet.</div>';
  document.getElementById('adminNotes').textContent = 'No notes added yet.';

  // Update status badge in header
  const badge = panel.querySelector('.detail-badges .status-badge');
  if (badge) {
    badge.textContent = order.status;
    badge.className = 'status-badge ' + order.statusClass;
  }
  const pkgSpan = panel.querySelector('.detail-badges span:last-child');
  if (pkgSpan) pkgSpan.textContent = order.pkg;
}

// ── RENDER DETAIL PANEL ──
function renderDetailPanel(order) {
  const d = order.detail;
  const panel = document.getElementById('detailPanel');

  document.getElementById('detailOrderId').textContent = order.id;
  document.getElementById('detailTopic').textContent = order.topic;

  // Timer — always show with deadline countdown
  document.getElementById('timerBox').style.display = 'flex';
  startDeadlineTimer(order.deadline + ' ' + order.deadlineTime);

  // Client
  document.getElementById('detailClientAvatar').style.background = order.avatarColor;
  document.getElementById('detailClientInitials').textContent = order.initials;
  document.getElementById('detailClientName').textContent = order.client;
  document.getElementById('detailClientInfo').textContent = d.clientLabel;

  // Fields
  document.getElementById('detailType').textContent = d.type;
  document.getElementById('detailPages').textContent = d.pages;
  document.getElementById('detailChapters').textContent = d.chapters + ' chapters';
  document.getElementById('detailWordcount').textContent = d.wordcount;
  document.getElementById('detailValue').textContent = d.value;
  document.getElementById('detailDeadline').textContent = d.deadline;

  // Chapter breakdown
  const cList = document.getElementById('chapterBreakdown');
  cList.innerHTML = d.chapterBreakdown.map(c => `
    <div class="chapter-item">
      <span class="chapter-item-name">${c.name}</span>
      <div class="chapter-bar-wrap">
        <div class="chapter-bar">
          <div class="progress-fill" style="width:${c.pct}%;background:${c.color}"></div>
        </div>
      </div>
      <span class="chapter-pct-label ${c.pct === 100 ? 'ch-done' : ''}">${c.label}</span>
    </div>
  `).join('');

  // Overall
  document.getElementById('overallPct').textContent = d.overall + '%';
  document.getElementById('overallPct').style.color = d.overallColor;
  document.getElementById('overallBar').style.width = d.overall + '%';
  document.getElementById('overallBar').style.background = d.overallColor;
  document.getElementById('overallDrafted').textContent = d.drafted;

  // Milestones
  const mList = document.getElementById('milestoneList');
  mList.innerHTML = d.milestones.map((m, i) => `
    <div class="milestone-item">
      <div class="milestone-dot-col">
        <div class="milestone-dot ${m.state}">
          ${m.state === 'done' ? svgCheck() : m.state === 'active' ? svgClock() : svgDash()}
        </div>
        ${i < d.milestones.length - 1 ? '<div class="milestone-line"></div>' : ''}
      </div>
      <div class="milestone-content">
        <div class="milestone-name ${m.state === 'pending' ? 'pending-text' : ''}">${m.name}</div>
        <div class="milestone-date">${m.date}</div>
        ${m.sub ? `<div class="milestone-warn">${m.sub}</div>` : ''}
      </div>
    </div>
  `).join('');

  // Files
  document.getElementById('fileList').innerHTML = d.files.map(f => `
    <div class="file-item">
      ${svgFile(f.type)}
      <span class="file-item-name">${f.name}</span>
      <span class="file-item-lock">${svgLock()}</span>
    </div>
  `).join('');

  // Notes
  document.getElementById('adminNotes').textContent = d.notes;
}

// ── SVG HELPERS ──
function svgCheck() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3,8 7,12 13,4"/></svg>`;
}
function svgClock() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><polyline points="8,5 8,8 10,10"/></svg>`;
}
function svgDash() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="8" x2="12" y2="8"/></svg>`;
}
function svgFile(type) {
  const color = type === 'pdf' ? '#ff5a5a' : '#4a9eff';
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="${color}" stroke-width="1.5"><path d="M4 2h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/><polyline points="10,2 10,5 13,5"/></svg>`;
}
function svgLock() {
  return `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="10" height="8" rx="1"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>`;
}

// ── COUNTDOWN TIMER (replaced by startDeadlineTimer) ──
function startTimer() { /* replaced */ }
function updateTimerDisplay() { /* replaced */ }

// ── TAB FILTER ──
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ── SEARCH ──
function initSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#ordersTableBody tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

// ── NEW ORDER MODAL (simple alert placeholder) ──
function openNewOrder() {
  alert('New Order form — connect to your backend here.');
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  // Show loading state — Supabase load হওয়ার আগে demo দেখাবে না
  const tbody = document.getElementById('ordersTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:rgba(255,255,255,0.3);font-size:13px;"><div style="margin-bottom:8px">⏳</div>Loading orders...</td></tr>`;
  // old detail panel auto-open removed — new panel opens on row click
  startTimer();
  initTabs();
  initSearch();

  // Close detail panel
  const closeBtn = document.getElementById('closeDetail');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    activeOrderId = null;
    document.getElementById('detailPanel').classList.remove('open');
    renderTable();
  });

  // New Order button
  const newBtn = document.getElementById('btnNewOrder');
  if (newBtn) newBtn.addEventListener('click', openNewOrder);
});

// ══════════════════════════════════════════
// TOAST SYSTEM
// ══════════════════════════════════════════
function showOMToast(msg, color = '#22c987') {
  let container = document.getElementById('omToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'omToastContainer';
    container.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      display:flex; flex-direction:column; gap:8px;
    `;
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.style.cssText = `
    background:#1e2330; border:1px solid ${color}55;
    border-left:3px solid ${color};
    border-radius:10px; padding:12px 16px;
    font-size:13px; color:#e8eaf0;
    min-width:240px; max-width:320px;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
    animation:omSlideIn 0.3s ease;
    font-family:'Inter',sans-serif;
  `;
  toast.textContent = msg;
  container.appendChild(toast);

  if (!document.getElementById('omToastStyle')) {
    const s = document.createElement('style');
    s.id = 'omToastStyle';
    s.textContent = `
      @keyframes omSlideIn {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes omSlideOut {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(120%); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }

  setTimeout(() => {
    toast.style.animation = 'omSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}

// ══════════════════════════════════════════
// STATUS UPDATE
// ══════════════════════════════════════════
function initStatusUpdate() {
  // Use event delegation on detail panel
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-update-status')) {
      const select = document.getElementById('detailStatusSelect') || document.querySelector('.status-select');
      if (!select || !activeOrderId) return;

      const newStatus = select.value;
      const order = ORDERS.find(o => o.id === activeOrderId);
      if (!order) return;

      // Map select value → statusClass and status text (matches HTML option values)
      const statusMap = {
        'pending':     { status: 'Pending',        statusClass: 's-pending',    rowClass: '' },
        'writing':     { status: 'In Progress',    statusClass: 's-inprogress', rowClass: '' },
        'draft_ready': { status: 'Delivered',      statusClass: 's-review',     rowClass: '' },
        'revision':    { status: 'Revision',       statusClass: 's-revision',   rowClass: '' },
        'in_review':   { status: 'Client Review',  statusClass: 's-review',     rowClass: '' },
        'completed':   { status: 'Completed',      statusClass: 's-completed',  rowClass: 'row-completed' },
        'overdue':     { status: 'OVERDUE',        statusClass: 's-overdue',    rowClass: 'row-overdue' },
      };

      const mapped = statusMap[newStatus];
      if (!mapped) return;

      order.status      = mapped.status;
      order.statusClass = mapped.statusClass;
      order.rowClass    = mapped.rowClass;

      renderTable();
      showOMToast(`✅ ${order.id} status updated to "${newStatus}"`, '#22c987');

      // If the order has detail, update badge in header
      const badge = document.querySelector('.detail-badges .status-badge');
      if (badge) {
        badge.textContent  = mapped.status;
        badge.className    = `status-badge ${mapped.statusClass}`;
      }
    }
  });
}

// ══════════════════════════════════════════
// MESSAGE BUTTON
// ══════════════════════════════════════════
function initMessageBtn() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-secondary');
    if (!btn) return;

    const svg = btn.querySelector('svg');
    const isMessage  = btn.textContent.trim().startsWith('Message');
    const isDownload = btn.textContent.trim().startsWith('Download');

    if (isMessage && activeOrderId) {
      const order = ORDERS.find(o => o.id === activeOrderId);
      const name  = order ? order.client : 'Client';
      showOMToast(`✉️ Opening message thread with ${name}…`, '#4a9eff');
      // In a real app: window.open(`/messages/${activeOrderId}`)
    }

    if (isDownload && activeOrderId) {
      showOMToast(`⬇️ Preparing files for ${activeOrderId}…`, '#7c6af7');
    }
  });
}

// ══════════════════════════════════════════
// ESCALATE BUTTON
// ══════════════════════════════════════════
function initEscalateBtn() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-escalate')) {
      if (!activeOrderId) return;
      const order = ORDERS.find(o => o.id === activeOrderId);
      const name  = order ? order.client : '';

      // Show confirmation
      const confirmed = confirm(`Escalate ${activeOrderId} (${name})?\n\nThis will flag the order for senior review and notify the team.`);
      if (confirmed) {
        showOMToast(`🚨 ${activeOrderId} escalated to senior review!`, '#ff5a5a');
        // Mark order as critical if not already overdue
        if (order && order.statusClass !== 's-overdue') {
          order.status      = 'OVERDUE';
          order.statusClass = 's-overdue';
          order.rowClass    = 'row-overdue';
          renderTable();
        }
      }
    }
  });
}

// ══════════════════════════════════════════
// TAB FILTER (functional)
// ══════════════════════════════════════════
function initTabFilter() {
  document.querySelectorAll('.topbar-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.topbar-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const label = btn.textContent.trim().toLowerCase();
      const rows  = document.querySelectorAll('#ordersTableBody tr');

      rows.forEach(row => {
        if (label.startsWith('all')) {
          row.style.display = '';
          return;
        }
        const statusCell = row.querySelector('.status-badge');
        if (!statusCell) { row.style.display = ''; return; }
        const rowStatus = statusCell.textContent.trim().toLowerCase();

        let show = false;
        if (label.startsWith('overdue')    && rowStatus.includes('overdue'))     show = true;
        if (label.startsWith('pending')    && rowStatus.includes('pending'))     show = true;
        if (label.startsWith('in progress')&& rowStatus.includes('progress'))   show = true;
        if (label.startsWith('in review')  && rowStatus.includes('review'))     show = true;
        if (label.startsWith('completed')  && rowStatus.includes('completed'))  show = true;

        row.style.display = show ? '' : 'none';
      });
    });
  });
}

// ══════════════════════════════════════════
// SORT & FILTER BUTTONS (UI feedback)
// ══════════════════════════════════════════
function initFilterBtns() {
  document.querySelectorAll('.filter-btn, .btn-export').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.textContent.trim();
      if (label.includes('Export CSV')) { exportCSV(); return; }

      /* Sort button */
      if (label.includes('Sort')) {
        const rows = Array.from(document.querySelectorAll('#ordersTableBody tr'));
        const asc  = btn.textContent.includes('↑');
        rows.sort((a, b) => {
          const da = a.querySelector('.deadline-date')?.textContent || '';
          const db = b.querySelector('.deadline-date')?.textContent || '';
          return asc ? da.localeCompare(db) : db.localeCompare(da);
        });
        const tbody = document.getElementById('ordersTableBody');
        rows.forEach(r => tbody.appendChild(r));
        btn.innerHTML = btn.innerHTML.replace(asc ? '↑' : '↓', asc ? '↓' : '↑');
        return;
      }

      /* Package filter */
      if (label.includes('Package') || label.includes('Packages')) {
        const pkgs = [...new Set(ORDERS.map(o => o.pkg).filter(Boolean))];
        const menu = document.createElement('div');
        menu.style.cssText = 'position:absolute;background:#1a1d2e;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:6px;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.5);min-width:180px;';
        ['All Packages', ...pkgs].forEach(pkg => {
          const item = document.createElement('div');
          item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:12px;color:#e2e8f0;border-radius:6px;';
          item.textContent = pkg;
          item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.06)';
          item.onmouseleave = () => item.style.background = '';
          item.onclick = () => {
            document.querySelectorAll('#ordersTableBody tr').forEach(row => {
              if (pkg === 'All Packages') { row.style.display = ''; return; }
              const pkgEl = row.querySelector('.pkg-badge');
              const pkgVal = pkgEl ? (pkgEl.dataset.pkg || pkgEl.textContent.trim()) : '';
              row.style.display = pkgVal === pkg ? '' : 'none';
            });
            btn.querySelector('span') && (btn.querySelector('span').textContent = pkg);
            menu.remove();
          };
          menu.appendChild(item);
        });
        const rect = btn.getBoundingClientRect();
        menu.style.top = rect.bottom + 4 + 'px';
        menu.style.left = rect.left + 'px';
        document.body.appendChild(menu);
        setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
        return;
      }

      /* Date filter */
      if (label.includes('Jun') || label.includes('Jul') || label.includes('Jan') || label.includes('–') || label.includes('Date')) {
        showDateRangePicker(btn);
        return;
      }
    });
  });
}

/* Date range picker */
function showDateRangePicker(btn) {
  const existing = document.getElementById('omDatePicker');
  if (existing) { existing.remove(); return; }

  const now = new Date();
  const picker = document.createElement('div');
  picker.id = 'omDatePicker';
  picker.style.cssText = 'position:absolute;background:#1a1d2e;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.5);min-width:240px;';

  picker.innerHTML = `
    <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Date Range</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <label style="font-size:12px;color:#e2e8f0">From <input type="date" id="omDateFrom" style="background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 8px;color:#e2e8f0;font-size:12px;margin-left:6px"></label>
      <label style="font-size:12px;color:#e2e8f0">To &nbsp;&nbsp;&nbsp;<input type="date" id="omDateTo" style="background:#0d1117;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 8px;color:#e2e8f0;font-size:12px;margin-left:6px"></label>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button onclick="applyDateFilter()" style="flex:1;padding:6px;background:#6366f1;border:none;border-radius:6px;color:#fff;font-size:12px;cursor:pointer">Apply</button>
        <button onclick="clearDateFilter()" style="flex:1;padding:6px;background:rgba(255,255,255,0.06);border:none;border-radius:6px;color:#e2e8f0;font-size:12px;cursor:pointer">All Time</button>
      </div>
    </div>`;

  const rect = btn.getBoundingClientRect();
  picker.style.top = rect.bottom + 4 + 'px';
  picker.style.left = rect.left + 'px';
  document.body.appendChild(picker);
  setTimeout(() => document.addEventListener('click', (e) => { if (!picker.contains(e.target) && e.target !== btn) picker.remove(); }, { once: true }), 10);
}

function applyDateFilter() {
  const from = document.getElementById('omDateFrom')?.value;
  const to   = document.getElementById('omDateTo')?.value;
  document.getElementById('omDatePicker')?.remove();

  document.querySelectorAll('#ordersTableBody tr').forEach(row => {
    const dl = row.querySelector('.deadline-date')?.textContent?.trim() || '';
    if (!from && !to) { row.style.display = ''; return; }
    const d = new Date(dl);
    let show = true;
    if (from && d < new Date(from)) show = false;
    if (to   && d > new Date(to))   show = false;
    row.style.display = show ? '' : 'none';
  });

  /* Update filter button label */
  const from2 = document.getElementById('omDateFrom')?.value;
  const to2   = document.getElementById('omDateTo')?.value;
  const btn   = document.querySelector('.filter-btn i.ti-calendar')?.closest('.filter-btn');
  if (btn && from2 && to2) btn.childNodes[2].textContent = ` ${from2} – ${to2} `;
}

function clearDateFilter() {
  document.getElementById('omDatePicker')?.remove();
  document.querySelectorAll('#ordersTableBody tr').forEach(row => row.style.display = '');
}

// ══════════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════════
function exportCSV() {
  const headers = ['Order ID','Client','University','Package','Chapters','Wordcount','Progress','Deadline','Status','Amount'];
  const rows = ORDERS.map(o => [
    o.id, o.client, o.uni, o.pkg,
    o.chapters, o.wordcount,
    o.progressPct + '%',
    `${o.deadline} ${o.deadlineTime}`,
    o.status, o.amount
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `scriptora_orders_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showOMToast('📊 CSV exported successfully!', '#22c987');
}

// ══════════════════════════════════════════
// UPLOAD FILE BUTTON
// ══════════════════════════════════════════
function initUploadBtn() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-upload')) {
      const input = document.createElement('input');
      input.type   = 'file';
      input.accept = '.pdf,.doc,.docx,.txt';
      input.onchange = (ev) => {
        const file = ev.target.files[0];
        if (!file || !activeOrderId) return;
        showOMToast(`📎 "${file.name}" uploaded to ${activeOrderId}`, '#22c987');
        // Add to file list UI
        const fileList = document.getElementById('fileList');
        if (fileList) {
          const ext  = file.name.split('.').pop().toLowerCase();
          const type = ext === 'pdf' ? 'pdf' : 'docx';
          const div  = document.createElement('div');
          div.className = 'file-item';
          div.innerHTML = svgFile(type) + `<span class="file-item-name">${file.name}</span><span class="file-item-lock">${svgLock()}</span>`;
          fileList.appendChild(div);
        }
      };
      input.click();
    }
  });
}

// ══════════════════════════════════════════
// MOBILE SIDEBAR TOGGLE
// ══════════════════════════════════════════
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlayOM');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

// ══════════════════════════════════════════
// BOOT ALL NEW FEATURES
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initStatusUpdate();
  initMessageBtn();
  initEscalateBtn();
  initTabFilter();
  initFilterBtns();
  initUploadBtn();
});

function closeDetail() {
  document.getElementById('detailPanel').classList.remove('open');
}
function openNewOrderModal() {
  const btn = document.getElementById('btnNewOrder');
  if (btn) btn.click();
}

/* ═══════════════════════════════════════
   FIXED FUNCTIONS
═══════════════════════════════════════ */

// ── SHOW TOAST ──
function showToast(msg, color) {
  color = color || '#34d399';
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.style.cssText = `background:#131629;border:1px solid rgba(255,255,255,0.1);border-left:3px solid ${color};border-radius:10px;padding:10px 16px;font-size:12px;color:#e8eaf6;min-width:220px;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:slideIn .25s ease;font-family:'Sora',sans-serif`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── FILTER STATUS ──
function filterStatus(status, btn) {
  // Update active tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Filter table rows
  const rows = document.querySelectorAll('#ordersTableBody tr');
  rows.forEach(row => {
    if (status === 'all') {
      row.style.display = '';
    } else {
      const rowStatus = row.getAttribute('data-status') || '';
      row.style.display = rowStatus === status ? '' : 'none';
    }
  });
}

// ── UPDATE ORDER STATUS (real update) ──
function updateOrderStatus() {
  const sel   = document.getElementById('detailStatusSelect');
  const panel = document.getElementById('detailPanel');
  if (!sel || !activeOrderId) return;

  const newStatus = sel.value;
  const order     = ORDERS.find(o => o.id === activeOrderId);
  if (!order) return;

  // Status label & class map
  const map = {
    pending:     { label: 'Pending',     cls: 's-pending',    rowClass: 'row-pending'  },
    writing:     { label: 'In Progress', cls: 's-inprogress', rowClass: 'row-progress' },
    draft_ready: { label: 'In Review',   cls: 's-review',     rowClass: 'row-review'   },
    completed:   { label: 'Completed',   cls: 's-completed',  rowClass: 'row-done'     },
    overdue:     { label: 'Overdue',     cls: 's-overdue',    rowClass: 'row-overdue'  },
  };

  const info = map[newStatus];
  if (!info) return;

  // Update order object
  order.status      = info.label;
  order.statusClass = info.cls;
  order.rowClass    = info.rowClass;

  // Update detail panel badge
  const badge = panel.querySelector('.detail-badges .status-badge');
  if (badge) {
    badge.textContent = info.label;
    badge.className   = 'status-badge ' + info.cls;
  }

  // Update table row
  const row = document.querySelector(`#ordersTableBody tr[data-id="${activeOrderId}"]`);
  if (row) {
    row.className = info.rowClass;
    const statusCell = row.querySelector('.status-badge');
    if (statusCell) {
      statusCell.textContent = info.label;
      statusCell.className   = 'status-badge ' + info.cls;
    }
  }

  // Timer always visible — shows deadline countdown for all orders
  const timerBox = document.getElementById('timerBox');
  if (timerBox) timerBox.style.display = 'flex';

  // Update stat counts
  updateStatCounts();

  showToast('✅ Status updated to ' + info.label, '#34d399');
}

// ── UPDATE STAT COUNTS ──
function updateStatCounts() {
  const counts = { all: 0, overdue: 0, pending: 0, writing: 0, draft_ready: 0, completed: 0 };
  ORDERS.forEach(o => {
    counts.all++;
    if (o.statusClass === 's-overdue')    counts.overdue++;
    if (o.statusClass === 's-pending')    counts.pending++;
    if (o.statusClass === 's-inprogress') counts.writing++;
    if (o.statusClass === 's-review')     counts.draft_ready++;
    if (o.statusClass === 's-completed')  counts.completed++;
  });

  // Update tab counts
  ['all','overdue','pending','writing','draft_ready','completed'].forEach(key => {
    const el = document.getElementById('count-' + key);
    if (el) el.textContent = counts[key];
  });

  // Update stat cards
  const sd = document.getElementById('s-total');       if (sd) sd.textContent = counts.all;
  const si = document.getElementById('s-inprogress');  if (si) si.textContent = counts.writing;
  const sp = document.getElementById('s-pending');     if (sp) sp.textContent = counts.pending;
  const sc = document.getElementById('s-completed');   if (sc) sc.textContent = counts.completed;
  const so = document.getElementById('s-overdue');     if (so) so.textContent = counts.overdue;
  const sr = document.getElementById('s-review');      if (sr) sr.textContent = counts.draft_ready;
}


// ── DEADLINE COUNTDOWN TIMER ──
function startDeadlineTimer(deadlineStr) {
  if (timerInterval) clearInterval(timerInterval);

  function update() {
    const now      = new Date();
    const deadline = parseDeadline(deadlineStr);
    if (!deadline) return;

    const diff = deadline - now;
    const el   = document.getElementById('timerValue');
    const lbl  = document.getElementById('timerBox') && document.getElementById('timerBox').querySelector('.timer-label');

    if (!el) return;

    if (diff <= 0) {
      el.textContent = 'OVERDUE';
      el.style.color = '#f87171';
      if (lbl) lbl.textContent = 'Overdue by';
      return;
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const secs  = Math.floor((diff % 60000) / 1000);
    const fmt   = n => String(n).padStart(2, '0');

    el.innerHTML = `<span class="t-days">${days}<em>d</em></span> <span class="t-hours">${fmt(hours)}<em>h</em></span> <span class="t-mins">${fmt(mins)}<em>m</em></span> <span class="t-secs">${fmt(secs)}<em>s</em></span>`;
    el.className = 'timer-value' + (days < 1 ? '' : days < 3 ? ' warn' : ' safe');
    if (lbl) lbl.textContent = 'Time Remaining';
  }

  update();
  timerInterval = setInterval(update, 1000);
}

function parseDeadline(str) {
  if (!str || str.trim() === '— —' || str.trim() === '' || str.trim() === '—') return null;
  const now = new Date();

  // Handle "Today", "Tomorrow"
  str = str.replace('Today', now.toLocaleDateString('en-US', { month:'short', day:'numeric' }));
  str = str.replace('Tomorrow', new Date(now.getTime() + 86400000).toLocaleDateString('en-US', { month:'short', day:'numeric' }));

  // Try current year first
  let d = new Date(str + ' ' + now.getFullYear());
  if (isNaN(d.getTime())) return null;

  // If already passed, use next year
  if (d < now) {
    d = new Date(str + ' ' + (now.getFullYear() + 1));
  }

  return isNaN(d.getTime()) ? null : d;
}


/* ══════════════════════════════════════════════════════════
   SUPABASE — REAL ORDERS LOAD
   Mock ORDERS array কে Supabase real data দিয়ে replace করে।
   বাকি সব function (renderTable, selectOrder, filterStatus...)
   unchanged থাকে — শুধু ORDERS array টা পাল্টায়।
══════════════════════════════════════════════════════════ */

function buildOrderMilestones(o) {
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'Pending';
  const placed = o.order_date || o.created_at;
  const paid = o.payment_status === 'confirmed' || o.payment_status === 'paid' || Number(o.advance_paid) > 0;
  const writing = ['writing', 'confirmed', 'draft_ready', 'completed'].includes(o.status);
  const draftReady = ['draft_ready', 'completed'].includes(o.status);
  const review = o.status === 'completed';
  const delivered = o.status === 'completed';

  return [
    { name: 'Order Placed',      date: placed ? fmt(placed) : 'Pending', state: 'done' },
    { name: 'Payment Confirmed', date: paid ? fmt(placed) : 'Pending', state: paid ? 'done' : 'pending' },
    { name: 'Work Started',      date: writing ? fmt(o.updated_at || placed) : 'Pending', state: writing && !draftReady ? 'active' : writing ? 'done' : 'pending' },
    { name: 'Draft Ready',       date: draftReady ? fmt(o.updated_at) : 'Pending', state: draftReady && !review ? 'active' : draftReady ? 'done' : 'pending' },
    { name: 'Review',            date: review ? fmt(o.updated_at) : 'Pending', state: review && !delivered ? 'active' : review ? 'done' : 'pending' },
    { name: 'Delivered',         date: delivered ? fmt(o.updated_at) : 'Pending', state: delivered ? 'done' : 'pending' },
  ];
}

function mapSupabaseOrderToLocal(o) {
  /* status mapping */
  const statusMap = {
    'pending':    { label: 'Pending',       cls: 's-pending',    row: '' },
    'confirmed':  { label: 'Confirmed',     cls: 's-inprogress', row: '' },
    'writing':    { label: 'In Progress',   cls: 's-inprogress', row: '' },
    'draft_ready':{ label: 'Delivered',     cls: 's-review',     row: '' },
    'in_review':  { label: 'Client Review', cls: 's-review',     row: 'row-review' },
    'completed':  { label: 'Completed',     cls: 's-completed',  row: '' },
    'overdue':    { label: 'Overdue',       cls: 's-overdue',    row: 'row-overdue' },
    'hold':       { label: 'On Hold',       cls: 's-pending',    row: '' },
  };
  const s = statusMap[o.status] || { label: o.status || 'Pending', cls: 's-pending', row: '' };

  /* deadline display */
  let deadlineDisplay = '—';
  let deadlineTime    = '';
  let deadlineCls     = '';
  if (o.deadline) {
    const d    = new Date(o.deadline);
    const now  = new Date();
    const diff = d - now;
    deadlineDisplay = d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
    deadlineTime    = d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    if (diff < 0)           deadlineCls = 'deadline-overdue';
    else if (diff < 86400000) deadlineCls = 'deadline-today';
  }

  /* client name from metadata */
  const meta      = o.clients || {};
  const clientName = meta.name || meta.email || 'Client';
  const uni        = meta.University || meta.university || o.university || '—';
  const initials   = clientName.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();

  const pageNum = Number(o.pages);

  return {
    id:            o.id,          /* real UUID */
    orderId:       o.order_number || o.id.slice(0,8).toUpperCase(),
    client:        clientName,
    uni:           uni,
    topic:         o.title || 'Untitled',
    pkg:           o.package || '—',
    pkgClass:      o.payment_status === 'rejected' ? 'pkg-rejected' : 'pkg-msc',
    paymentStatus: o.payment_status || 'unpaid',
    pages:         Number.isFinite(pageNum) && pageNum > 0 ? pageNum : null,
    chapters:      Number.isFinite(pageNum) && pageNum > 0 ? Math.ceil(pageNum / 30) : '—',
    wordcount:     Number.isFinite(pageNum) && pageNum > 0 ? (pageNum * 250).toLocaleString() + ' w' : '—',
    progressPct:   o.progress || 0,
    progressBars:  [o.progress || 0, 0, 0],
    deadline:      deadlineDisplay,
    deadlineTime:  deadlineTime,
    deadlineClass: deadlineCls,
    status:        s.label,
    statusClass:   s.cls,
    amount:        o.total_price ? '৳' + Number(o.total_price).toLocaleString() : '—',
    rowClass:      s.row,
    avatarColor:   '#6366f1',
    initials:      initials,
    clientId:      o.client_id || '',
    /* full raw data for detail panel */
    detail: {
      pages:        Number.isFinite(pageNum) && pageNum > 0 ? pageNum + ' pp' : '—',
      type:         o.package || '—',
      chapters:     Number.isFinite(pageNum) && pageNum > 0 ? Math.ceil(pageNum / 30) : '—',
      wordcount:    Number.isFinite(pageNum) && pageNum > 0 ? (pageNum * 250).toLocaleString() + ' w' : '—',
      value:        o.total_price ? '৳' + Number(o.total_price).toLocaleString() : '—',
      deadline:     deadlineDisplay + ' ' + deadlineTime,
      overall:      o.progress || 0,
      drafted:      (o.progress || 0) + '% complete',
      chapterBreakdown: [],
      milestones: buildOrderMilestones(o),
      files: [],
      notes:        o.citation ? 'Citation: ' + o.citation : '',
      overallColor: o.progress > 70 ? '#22c987' : o.progress > 30 ? '#f5a623' : '#6366f1',
      email:        meta.email || o.email || '',
      phone:        meta.phone || meta.whatsapp || o.phone || o.whatsapp || '',
      language:     o.language || 'English',
      clientLabel:  uni,
      subject:      o.department || '—',
      citationStyle: o.citation || 'APA',
      financials: {
        total:   o.total_price  ? '৳' + Number(o.total_price).toLocaleString()  : '—',
        paid:    o.advance_paid ? '৳' + Number(o.advance_paid).toLocaleString() : '৳0',
        due:     o.due_amount   ? '৳' + Number(o.due_amount).toLocaleString()   : '—',
        paidPct: o.total_price  ? Math.round((o.advance_paid / o.total_price) * 100) : 0,
      },
    },
  };
}

async function loadRealOrders() {
  /* sidebar.js admin auth শেষ হওয়ার জন্য wait করি */
  let sb = window.scriptoraSupabase;
  if (!sb) {
    await new Promise(res => setTimeout(res, 800));
    sb = window.scriptoraSupabase;
  }
  if (!sb) return;

  /* Loading state */
  const tbody = document.getElementById('ordersTableBody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2.5rem;color:rgba(255,255,255,0.3);font-size:13px;"><div style="margin-bottom:8px">⏳</div>Loading orders...</td></tr>`;

  try {
    /* Step 1: orders load.
       Admin dashboard-এ দেখাবে না যদি:
         payment_status = 'unpaid' OR 'rejected'  AND  advance_paid = 0
         → fake/invalid orders যেগুলোতে কোনো real payment হয়ইনি।
       দেখাবে: under_review (proof জমা দিয়েছে, approve বাকি), approved,
               paid, confirmed — এবং যেকোনো order যেখানে advance_paid > 0
               (real টাকা এসেছে, status যাই হোক না কেন)। */
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .or('payment_status.neq.unpaid,payment_status.neq.rejected,advance_paid.gt.0')
      .order('order_date', { ascending: false });

    if (error) throw error;
    if (!data || !data.length) {
      ORDERS.length = 0;
      renderTable();
      updateStatCounts();
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:3rem;color:rgba(255,255,255,0.25);font-size:13px;"><i class="ti ti-inbox" style="font-size:2rem;display:block;margin-bottom:8px"></i>No orders found</td></tr>`;
      return;
    }

    /* Step 2: client names load */
    const clientIds = [...new Set(data.map(o => o.client_id).filter(Boolean))];
    let clientMap = {};
    if (clientIds.length) {
      const { data: clients } = await sb
        .from('clients')
        .select('id, name, email, "University"')
        .in('id', clientIds);
      if (clients) clients.forEach(c => { clientMap[c.id] = c; });
    }

    /* Merge client info into orders */
    const enriched = data.map(o => ({ ...o, clients: clientMap[o.client_id] || {} }));

    /* Replace mock ORDERS with real data */
    ORDERS.length = 0;
    enriched.forEach(o => ORDERS.push(mapSupabaseOrderToLocal(o)));

    /* Re-render everything */
    renderTable();
    updateStatCounts();

    /* Update tab counts */
    const all       = ORDERS.length;
    const overdue   = ORDERS.filter(o => o.statusClass === 's-overdue').length;
    const pending   = ORDERS.filter(o => o.statusClass === 's-pending').length;
    const writing   = ORDERS.filter(o => o.statusClass === 's-inprogress').length;
    const review    = ORDERS.filter(o => o.statusClass === 's-review').length;
    const completed = ORDERS.filter(o => o.statusClass === 's-completed').length;

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('count-all', all);
    set('count-overdue', overdue);
    set('count-pending', pending);
    set('count-writing', writing);
    set('count-draft_ready', review);
    set('count-completed', completed);
    set('s-total', all);
    set('s-inprogress', writing);
    set('s-pending', pending);
    set('s-completed', completed);
    set('s-overdue', overdue);

  } catch(e) {
    console.error('[Scriptora] Order load error:', e.message);
    /* Silently keep mock data on error */
  }
}

/* DOMContentLoaded এ hook করি */
document.addEventListener('DOMContentLoaded', () => {
  /* sidebar.js এর admin auth check শেষ হওয়ার জন্য 1s delay */
  setTimeout(loadRealOrders, 1000);
});
