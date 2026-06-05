/* ═══════════════════════════════════════════
   SCRIPTORA ADMIN DASHBOARD — admin.js
═══════════════════════════════════════════ */

/* ─── DATA ─── */
const orders = [
  { id:'#SCR-1082', client:'Rahim Uddin',   avatar:'RU', color:'#6c63ff', service:'Assignment Writing', dept:'BBA', status:'progress', amount:850,  deadline:'Jun 15' },
  { id:'#SCR-1081', client:'Nusrat Jahan',  avatar:'NJ', color:'#34d399', service:'Thesis Writing',     dept:'CSE', status:'pending',  amount:3200, deadline:'Jun 20' },
  { id:'#SCR-1080', client:'Tanvir Ahmed',  avatar:'TA', color:'#f59e0b', service:'Report Writing',     dept:'BBA', status:'done',     amount:1200, deadline:'Jun 05' },
  { id:'#SCR-1079', client:'Priya Sharma',  avatar:'PS', color:'#a78bfa', service:'Research Paper',     dept:'Law', status:'overdue',  amount:2800, deadline:'Jun 01' },
  { id:'#SCR-1078', client:'Farhan Islam',  avatar:'FI', color:'#f87171', service:'Presentation',       dept:'EEE', status:'done',     amount:600,  deadline:'Jun 03' },
  { id:'#SCR-1077', client:'Sadia Khatun',  avatar:'SK', color:'#34d399', service:'Assignment Writing', dept:'CSE', status:'progress', amount:750,  deadline:'Jun 18' },
];

const activities = [
  { icon:'✅', color:'rgba(52,211,153,0.15)',   title:'Order <b>#SCR-1080</b> completed',        sub:'Tanvir Ahmed — Report Writing',       time:'2 hours ago' },
  { icon:'💳', color:'rgba(108,99,255,0.15)',   title:'Payment received <b>৳1,200</b>',         sub:'Invoice #INV-0412 settled',            time:'3 hours ago' },
  { icon:'📋', color:'rgba(245,158,11,0.15)',   title:'New order <b>#SCR-1082</b> created',     sub:'Rahim Uddin — BBA Assignment',         time:'5 hours ago' },
  { icon:'👤', color:'rgba(167,139,250,0.15)',  title:'New client <b>Nusrat Jahan</b> registered', sub:'CSE Dept · Thesis Writing',         time:'Yesterday'   },
  { icon:'⚠️', color:'rgba(248,113,113,0.15)', title:'Order <b>#SCR-1079</b> is overdue',      sub:'Priya Sharma — Research Paper',        time:'Yesterday'   },
  { icon:'📁', color:'rgba(52,211,153,0.15)',   title:'File uploaded for <b>#SCR-1081</b>',     sub:'requirements.pdf — 2.3 MB',            time:'2 days ago'  },
];

const donutData = [
  { label:'Completed',   value:22, color:'#6c63ff' },
  { label:'In Progress', value:18, color:'#34d399' },
  { label:'Pending',     value:12, color:'#f59e0b' },
  { label:'Overdue',     value: 5, color:'#f87171' },
];

const revenueData = {
  monthly: {
    labels:   ['Jan','Feb','Mar','Apr','May','Jun'],
    revenue:  [52000,60000,58000,65000,68000,84320],
    expenses: [28000,30000,32000,28000,35000,42000],
  },
  quarterly: {
    labels:   ['Q1 2024','Q2 2024','Q3 2024','Q4 2024','Q1 2025','Q2 2025'],
    revenue:  [140000,175000,160000,195000,220000,250000],
    expenses: [80000, 90000, 85000, 95000,110000,125000],
  },
  yearly: {
    labels:   ['2020','2021','2022','2023','2024','2025'],
    revenue:  [350000,420000,510000,640000,780000,950000],
    expenses: [180000,210000,250000,310000,380000,460000],
  },
};

/* ─── CHART INSTANCES ─── */
let revenueChart, donutChart;

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  animateCounter('stat-revenue', 84320, '৳', true);
  animateCounter('stat-orders',  47);
  animateCounter('stat-clients', 138);
  animateCounter('stat-due',     12480, '৳', true);

  document.getElementById('orders-inprogress').textContent = '18 In Progress';
  document.getElementById('orders-pending').textContent    = '12 Pending';
  document.getElementById('orders-overdue').textContent    = '5 Overdue';
  document.getElementById('clients-active').textContent    = '112 Active';
  document.getElementById('clients-inactive').textContent  = '26 Inactive';
  document.getElementById('clients-retention').textContent = '94% Retention';

  renderOrders(orders);
  renderActivity();
  renderDonutLegend();
  initRevenueChart('monthly');
  initDonutChart();

  // Default deadline to today
  document.getElementById('m-deadline').value = new Date().toISOString().split('T')[0];
});

/* ═══════════════════════════════════════════
   COUNTER ANIMATION
═══════════════════════════════════════════ */
function animateCounter(id, target, prefix = '', comma = false) {
  const el   = document.getElementById(id);
  const step = target / (1200 / 16);
  let   cur  = 0;

  const timer = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(timer); }
    const val = comma ? Math.floor(cur).toLocaleString('en-IN') : Math.floor(cur);
    el.textContent = prefix + val;
  }, 16);
}

/* ═══════════════════════════════════════════
   ORDERS TABLE
═══════════════════════════════════════════ */
function renderOrders(data) {
  document.getElementById('ordersBody').innerHTML = data.map(o => `
    <tr>
      <td><span class="order-id">${o.id}</span></td>
      <td>
        <div class="client-cell">
          <div class="client-av" style="background:${o.color}22;color:${o.color}">${o.avatar}</div>
          ${o.client}
        </div>
      </td>
      <td>${o.service}</td>
      <td><span class="dept-cell">${o.dept}</span></td>
      <td><span class="status-badge ${o.status}">${statusLabel(o.status)}</span></td>
      <td class="amount-cell">৳${o.amount.toLocaleString()}</td>
      <td class="deadline-cell">${o.deadline}</td>
    </tr>
  `).join('');
}

function statusLabel(s) {
  return { progress:'In Progress', pending:'Pending', done:'Completed', overdue:'Overdue' }[s] || s;
}

/* ═══════════════════════════════════════════
   ACTIVITY FEED
═══════════════════════════════════════════ */
function renderActivity() {
  document.getElementById('activityList').innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="activity-dot-wrap">
        <div class="activity-dot" style="background:${a.color}">${a.icon}</div>
        <div class="activity-line"></div>
      </div>
      <div class="activity-body">
        <div class="activity-title">${a.title}<br><span>${a.sub}</span></div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════
   DONUT CHART
═══════════════════════════════════════════ */
function initDonutChart() {
  const canvas = document.getElementById('donutChart');
  canvas.width  = 180;
  canvas.height = 180;
  const ctx   = canvas.getContext('2d');
  const total = donutData.reduce((a, b) => a + b.value, 0);

  if (donutChart) donutChart.destroy();

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: donutData.map(d => d.label),
      datasets: [{
        data:            donutData.map(d => d.value),
        backgroundColor: donutData.map(d => d.color),
        borderWidth:     0,
        hoverOffset:     6,
      }],
    },
    options: {
      cutout: '72%',
      plugins: {
        legend:  { display: false },
        tooltip: {
          enabled:         true,
          backgroundColor: '#1a1d2e',
          borderColor:     'rgba(255,255,255,0.1)',
          borderWidth:     1,
          titleColor:      '#e8eaf6',
          bodyColor:       '#9ca3af',
          padding:         12,
          cornerRadius:    10,
          displayColors:   true,
          boxWidth:        10,
          boxHeight:       10,
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => {
              const total = donutData.reduce((a, b) => a + b.value, 0);
              const pct   = ((item.raw / total) * 100).toFixed(1);
              return ` ${item.raw} orders · ${pct}%`;
            },
          },
        },
      },
      animation: { animateRotate: true, duration: 1000 },
    },
  });
}

function renderDonutLegend() {
  const total = donutData.reduce((a, b) => a + b.value, 0);
  document.getElementById('donut-total').textContent = total;
  document.getElementById('donut-legend').innerHTML = donutData.map(d => {
    const pct = Math.round((d.value / total) * 100);
    return `
    <div class="legend-item">
      <div class="legend-dot" style="background:${d.color}"></div>
      <span class="legend-label">${d.label}</span>
      <span class="legend-count" style="color:${d.color}">${d.value}</span>
      <span class="legend-pct">${pct}%</span>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════
   REVENUE CHART
═══════════════════════════════════════════ */
function initRevenueChart(period) {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  const d   = revenueData[period];

  if (revenueChart) revenueChart.destroy();

  const gradBlue = ctx.createLinearGradient(0, 0, 0, 220);
  gradBlue.addColorStop(0, 'rgba(108,99,255,0.5)');
  gradBlue.addColorStop(1, 'rgba(108,99,255,0.02)');

  const gradGray = ctx.createLinearGradient(0, 0, 0, 220);
  gradGray.addColorStop(0, 'rgba(255,255,255,0.08)');
  gradGray.addColorStop(1, 'rgba(255,255,255,0.01)');

  revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels:   d.labels,
      datasets: [
        {
          label:           'Revenue',
          data:            d.revenue,
          backgroundColor: gradBlue,
          borderRadius:    6,
          borderSkipped:   false,
          order:           2,
        },
        {
          label:           'Expenses',
          data:            d.expenses,
          backgroundColor: gradGray,
          borderRadius:    6,
          borderSkipped:   false,
          order:           3,
        },
        {
          label:                'Net Profit',
          data:                 d.revenue.map((r, i) => r - d.expenses[i]),
          type:                 'line',
          borderColor:          '#34d399',
          backgroundColor:      'transparent',
          borderWidth:          2.5,
          pointBackgroundColor: '#34d399',
          pointRadius:          4,
          pointHoverRadius:     6,
          tension:              0.4,
          order:                1,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#6b7280', font: { family: 'Sora', size: 11 }, boxWidth: 12, padding: 16 },
        },
        tooltip: {
          backgroundColor: '#131629',
          borderColor:     'rgba(255,255,255,0.1)',
          borderWidth:     1,
          titleColor:      '#e8eaf6',
          bodyColor:       '#9ca3af',
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ৳${ctx.raw.toLocaleString()}` },
        },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { family: 'Sora', size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { family: 'Sora', size: 11 }, callback: v => '৳' + v.toLocaleString() } },
      },
    },
  });
}

/* ═══════════════════════════════════════════
   TAB SWITCH
═══════════════════════════════════════════ */
function switchTab(btn, period) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  initRevenueChart(period);
}

/* ═══════════════════════════════════════════
   SEARCH
═══════════════════════════════════════════ */
function handleSearch(q) {
  const term     = q.toLowerCase().trim();
  const filtered = term === ''
    ? orders
    : orders.filter(o =>
        o.client.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term)     ||
        o.service.toLowerCase().includes(term)
      );
  renderOrders(filtered);
}

/* ═══════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════ */
function setPage(page) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');

  const titles = {
    dashboard: 'Dashboard Overview',
    orders:    'Orders Management',
    clients:   'Client List',
    payments:  'Payments & Billing',
    files:     'File Manager',
    settings:  'Settings',
    help:      'Help & Support',
  };

  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

  if (page !== 'dashboard') {
    showToast(`📂 "${titles[page]}" — এই পেজটি শীঘ্রই যোগ হবে!`, '#f59e0b');
  }
}

/* ═══════════════════════════════════════════
   MODAL
═══════════════════════════════════════════ */
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function submitOrder() {
  const client = document.getElementById('m-client').value.trim();
  const amount = document.getElementById('m-amount').value;

  if (!client) { showToast('⚠️ Client name দিন!', '#f87171'); return; }

  const newOrder = {
    id:       '#SCR-' + (1083 + orders.length),
    client,
    avatar:   client.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    color:    '#6c63ff',
    service:  document.getElementById('m-service').value,
    dept:     document.getElementById('m-dept').value,
    status:   'pending',
    amount:   parseInt(amount) || 0,
    deadline: document.getElementById('m-deadline').value,
  };

  orders.unshift(newOrder);
  renderOrders(orders);

  activities.unshift({
    icon:  '📋',
    color: 'rgba(108,99,255,0.15)',
    title: `New order <b>${newOrder.id}</b> created`,
    sub:   `${client} — ${newOrder.dept} ${newOrder.service}`,
    time:  'Just now',
  });
  renderActivity();

  closeModal();
  showToast(`✅ Order ${newOrder.id} created successfully!`, '#34d399');

  // Reset form
  ['m-client','m-contact','m-amount','m-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function showToast(msg, color = '#34d399') {
  const container = document.getElementById('toastContainer');
  const toast     = document.createElement('div');
  toast.className = 'toast';
  toast.style.setProperty('--toast-color', color);
  toast.innerHTML = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ═══════════════════════════════════════════
   SIDEBAR TOGGLE (mobile)
═══════════════════════════════════════════ */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').style.display =
    document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
}

function bottomNav(page, el) {
  document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const titles = {
    dashboard: 'Dashboard Overview', orders: 'Orders Management',
    clients: 'Client List', payments: 'Payments & Billing', settings: 'Settings',
  };
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
  if (page !== 'dashboard') showToast(`📂 "${titles[page]}" — শীঘ্রই আসছে!`, '#f59e0b');
}

/* ═══════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});

/* ═══════════════════════════════════════════
   DROPDOWN PANELS
═══════════════════════════════════════════ */
function toggleDropdown(id, e) {
  e.stopPropagation();
  const panel = document.getElementById(id);
  const isOpen = panel.classList.contains('open');

  // Close all panels first
  document.querySelectorAll('.dropdown-panel').forEach(p => p.classList.remove('open'));

  // Open clicked one if it was closed
  if (!isOpen) panel.classList.add('open');
}

// Close all dropdowns on outside click
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-panel').forEach(p => p.classList.remove('open'));
});

function handleLogout() {
  if (confirm('Logout করবেন?')) {
    showToast('👋 Logged out successfully!', '#34d399');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  }
}
