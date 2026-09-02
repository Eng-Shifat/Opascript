/* ═══════════════════════════════════════════
   SCRIPTORA ADMIN DASHBOARD — admin.js
   Full Supabase integration — no demo data
═══════════════════════════════════════════ */

/* ─── GLOBAL STATE ─── */
let allOrders       = [];   // real orders from Supabase
let revenueChart, donutChart;

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', async () => {
  /* Skeleton placeholders while data loads */
  document.getElementById('stat-revenue').textContent  = '৳—';
  document.getElementById('stat-orders').textContent   = '—';
  document.getElementById('stat-clients').textContent  = '—';
  document.getElementById('stat-due').textContent      = '৳—';

  document.getElementById('m-deadline').value = new Date().toISOString().split('T')[0];

  /* Orders আগে load করতে হবে — loadClientStats allOrders use করে */
  await loadOrdersFromSupabase();

  /* বাকিগুলো parallel এ চলতে পারে */
  await Promise.all([
    loadClientStats(),
    loadAdminMessages(),
  ]);

  loadActivityFeed();
});

/* ═══════════════════════════════════════════
   COUNTER ANIMATION
═══════════════════════════════════════════ */
function animateCounter(id, target, prefix = '', comma = false) {
  const el   = document.getElementById(id);
  if (!el) return;
  const step = Math.max(1, target / (1200 / 16));
  let   cur  = 0;
  const timer = setInterval(() => {
    cur += step;
    if (cur >= target) { cur = target; clearInterval(timer); }
    const val = comma ? Math.floor(cur).toLocaleString('en-IN') : Math.floor(cur);
    el.textContent = prefix + val;
  }, 16);
}

/* ═══════════════════════════════════════════
   LOAD ALL ORDERS FROM SUPABASE
═══════════════════════════════════════════ */
async function loadOrdersFromSupabase() {
  const db = window.scriptoraSupabase;
  if (!db) { renderOrders([]); return; }

  try {
    const { data, error } = await db
      .from('orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (error) throw error;

    allOrders = data || [];

    /* ── Fetch client names ── */
    const clientIds = [...new Set(allOrders.map(o => o.client_id).filter(Boolean))];
    let clientMap   = {};
    if (clientIds.length) {
      const { data: clients } = await db
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds);
      (clients || []).forEach(c => { clientMap[c.id] = c; });
    }

    /* ── Map to display format ── */
    const colors = ['#6c63ff','#34d399','#f59e0b','#a78bfa','#f87171','#11b5d9','#fb923c'];
    const mapped = allOrders.map((o, i) => {
      const cl      = clientMap[o.client_id];
      let   client  = cl?.name || cl?.email || null;
      if (!client) {
        const lines    = (o.special_instructions || '').split('\n');
        const nameLine = lines.find(l => l.startsWith('Name:'));
        client = nameLine ? nameLine.replace('Name:', '').trim() : (o.title || 'Client');
      }
      const initials = client.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const statusMap = {
        pending:     'pending',
        writing:     'progress',
        confirmed:   'progress',
        draft_ready: 'progress',
        revision:    'progress',
        in_review:   'progress',
        hold:        'pending',
        in_progress: 'progress',
        completed:   'done',
        overdue:     'overdue',
      };
      const dl = o.deadline
        ? new Date(o.deadline).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
        : '—';
      return {
        id:       o.order_number || `#${(o.id||'').slice(0, 8)}`,
        client,
        avatar:   initials || 'CL',
        color:    colors[i % colors.length],
        service:  o.title || o.service_type || 'Academic Service',
        dept:     o.department || o.service_type || '—',
        status:   statusMap[o.status] || o.status || 'pending',
        amount:   o.total_price || 0,
        deadline: dl,
        raw:      o,
      };
    });

    /* ── Stat counters ── */
    const IN_PROGRESS_STATUSES = ['writing', 'confirmed', 'draft_ready', 'revision', 'in_review', 'in_progress'];
    const PENDING_STATUSES     = ['pending', 'hold'];

    const pending    = allOrders.filter(o => PENDING_STATUSES.includes(o.status)).length;
    const inProgress = allOrders.filter(o => IN_PROGRESS_STATUSES.includes(o.status)).length;
    const overdue    = allOrders.filter(o => o.status === 'overdue').length;
    const completed  = allOrders.filter(o => o.status === 'completed').length;
    const totalRev   = allOrders.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);
    const totalDue   = allOrders.reduce((s, o) => s + (Number(o.due_amount)   || 0), 0);
    const pendingInv = allOrders.filter(o => (Number(o.due_amount) || 0) > 0).length;

    animateCounter('stat-revenue', totalRev, '৳', true);
    animateCounter('stat-orders',  allOrders.length);
    animateCounter('stat-due',     totalDue, '৳', true);

    document.getElementById('orders-inprogress').textContent = `${inProgress} In Progress`;
    document.getElementById('orders-pending').textContent    = `${pending} Pending`;
    document.getElementById('orders-overdue').textContent    = `${overdue} Overdue`;

    /* ── Dynamic badges ── */
    updateDynamicBadges(allOrders, totalRev);

    /* Pending invoices badge */
    const dueCard = document.getElementById('stat-due')?.closest('.stat-card');
    const badge   = dueCard?.querySelector('.stat-badge');
    if (badge) badge.textContent = `⚠ ${pendingInv} invoices pending`;

    /* ── Charts ── */
    buildRevenueChart(allOrders);
    buildDonutChart(allOrders, { pending, inProgress, overdue, completed });

    /* ── Recent Orders table (last 10) ── */
    renderOrders(mapped.slice(0, 10));

    /* Store mapped for search */
    window._mappedOrders = mapped;

  } catch (err) {
    console.error('[Admin] Orders load failed:', err);
    showToast('❌ Orders লোড হয়নি: ' + (err.message || 'Unknown error'), '#f87171');
    renderOrders([]);
  }
}

/* ═══════════════════════════════════════════
   DYNAMIC BADGES — real comparison calculations
═══════════════════════════════════════════ */
function updateDynamicBadges(orders, totalRevThisMonth) {
  const now         = new Date();
  const thisMonth   = now.getMonth();
  const thisYear    = now.getFullYear();
  const lastMonth   = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYr = thisMonth === 0 ? thisYear - 1 : thisYear;

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay()); // Sunday
  thisWeekStart.setHours(0, 0, 0, 0);

  /* ── Revenue: this month vs last month ── */
  const revBadge = document.getElementById('badge-revenue');
  const revSub   = document.getElementById('sub-revenue');
  if (revBadge) {
    const revThis = orders
      .filter(o => {
        const d = new Date(o.order_date || o.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);

    const revLast = orders
      .filter(o => {
        const d = new Date(o.order_date || o.created_at);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYr;
      })
      .reduce((s, o) => s + (Number(o.advance_paid) || 0), 0);

    if (revLast > 0) {
      const pct    = ((revThis - revLast) / revLast * 100).toFixed(1);
      const isUp   = pct >= 0;
      revBadge.textContent  = (isUp ? '↑ +' : '↓ ') + pct + '%';
      revBadge.className    = 'stat-badge ' + (isUp ? 'up' : 'down');
      if (revSub) revSub.textContent = 'গত মাসের তুলনায়';
    } else if (revThis > 0) {
      revBadge.textContent = '↑ নতুন revenue';
      revBadge.className   = 'stat-badge up';
    } else {
      revBadge.textContent = '— কোনো data নেই';
      revBadge.className   = 'stat-badge';
    }
  }

  /* ── Orders: new this week ── */
  const ordBadge = document.getElementById('badge-orders');
  if (ordBadge) {
    const newThisWeek = orders.filter(o => {
      const d = new Date(o.order_date || o.created_at);
      return d >= thisWeekStart;
    }).length;

    ordBadge.textContent = newThisWeek > 0
      ? `↑ +${newThisWeek} this week`
      : '— এই সপ্তাহে নতুন নেই';
    ordBadge.className = newThisWeek > 0 ? 'stat-badge up' : 'stat-badge';
  }
}

/* ── Client badge — called from loadClientStats ── */
function updateClientBadge(clients) {
  const badge = document.getElementById('badge-clients');
  if (!badge) return;

  const now         = new Date();
  const thisMonth   = now.getMonth();
  const thisYear    = now.getFullYear();

  const newThisMonth = (clients || []).filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  badge.textContent = newThisMonth > 0
    ? `↑ +${newThisMonth} new this month`
    : '— এই মাসে নতুন নেই';
  badge.className = newThisMonth > 0 ? 'stat-badge up' : 'stat-badge';
}

/* ═══════════════════════════════════════════
   CLIENT STATS
═══════════════════════════════════════════ */
async function loadClientStats() {
  const db = window.scriptoraSupabase;
  if (!db) return;
  try {
    /* created_at আনতে হবে badge calculation-এর জন্য */
    const { data: clientsData, count: totalClients } = await db
      .from('clients')
      .select('id, created_at', { count: 'exact' });

    const uniqueActive = new Set(allOrders.map(o => o.client_id).filter(Boolean)).size;
    const inactive     = Math.max(0, (totalClients || 0) - uniqueActive);
    const retention    = totalClients > 0 ? Math.round((uniqueActive / totalClients) * 100) : 0;

    animateCounter('stat-clients', totalClients || 0);
    document.getElementById('clients-active').textContent    = `${uniqueActive} Active`;
    document.getElementById('clients-inactive').textContent  = `${inactive} Inactive`;
    document.getElementById('clients-retention').textContent = `${retention}% Retention`;

    /* Badge: new clients this month */
    updateClientBadge(clientsData || []);

  } catch (e) {
    console.warn('[Admin] Client stats error:', e);
  }
}

/* ═══════════════════════════════════════════
   REVENUE CHART — real data from orders
═══════════════════════════════════════════ */
function buildRevenueChart(orders, period = 'monthly') {
  const ctx = document.getElementById('revenueChart')?.getContext('2d');
  if (!ctx) return;

  const now = new Date();

  let labels, revenue, expenses;

  if (period === 'monthly') {
    /* Last 6 months */
    labels   = [];
    revenue  = [];
    expenses = [];
    for (let i = 5; i >= 0; i--) {
      const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear(), mo = d.getMonth();
      labels.push(d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
      const monthOrders = orders.filter(o => {
        const od = new Date(o.order_date || o.created_at);
        return od.getFullYear() === yr && od.getMonth() === mo;
      });
      revenue.push(monthOrders.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0));
      expenses.push(monthOrders.reduce((s, o) => s + (Number(o.due_amount)  || 0), 0));
    }

  } else if (period === 'quarterly') {
    /* Last 6 quarters */
    labels   = [];
    revenue  = [];
    expenses = [];
    for (let i = 5; i >= 0; i--) {
      const qDate   = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const yr      = qDate.getFullYear();
      const quarter = Math.floor(qDate.getMonth() / 3);
      labels.push(`Q${quarter + 1} ${yr}`);
      const qOrders = orders.filter(o => {
        const od = new Date(o.order_date || o.created_at);
        return od.getFullYear() === yr && Math.floor(od.getMonth() / 3) === quarter;
      });
      revenue.push(qOrders.reduce((s, o) => s + (Number(o.advance_paid) || 0), 0));
      expenses.push(qOrders.reduce((s, o) => s + (Number(o.due_amount)  || 0), 0));
    }

  } else {
    /* Yearly — last 4 years */
    const years = [];
    for (let i = 3; i >= 0; i--) years.push(now.getFullYear() - i);
    labels   = years.map(String);
    revenue  = years.map(yr => orders.filter(o => new Date(o.order_date || o.created_at).getFullYear() === yr)
                                      .reduce((s, o) => s + (Number(o.advance_paid) || 0), 0));
    expenses = years.map(yr => orders.filter(o => new Date(o.order_date || o.created_at).getFullYear() === yr)
                                      .reduce((s, o) => s + (Number(o.due_amount)  || 0), 0));
  }

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
      labels,
      datasets: [
        {
          label:           'Revenue (Received)',
          data:            revenue,
          backgroundColor: gradBlue,
          borderRadius:    6,
          borderSkipped:   false,
          order:           2,
        },
        {
          label:           'Due Amount',
          data:            expenses,
          backgroundColor: gradGray,
          borderRadius:    6,
          borderSkipped:   false,
          order:           3,
        },
        {
          label:                'Net (Revenue − Due)',
          data:                 revenue.map((r, i) => r - expenses[i]),
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

  /* Store current period for tab switch */
  window._currentRevPeriod = period;
  window._allOrdersForChart = orders;
}

/* ═══════════════════════════════════════════
   TAB SWITCH
═══════════════════════════════════════════ */
function switchTab(btn, period) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildRevenueChart(window._allOrdersForChart || allOrders, period);
}

/* ═══════════════════════════════════════════
   DONUT CHART — real status counts
═══════════════════════════════════════════ */
function buildDonutChart(orders, counts) {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  canvas.width  = 180;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');

  const donutData = [
    { label: 'Completed',   value: counts.completed,  color: '#6c63ff' },
    { label: 'In Progress', value: counts.inProgress, color: '#34d399' },
    { label: 'Pending',     value: counts.pending,    color: '#f59e0b' },
    { label: 'Overdue',     value: counts.overdue,    color: '#f87171' },
  ].filter(d => d.value > 0);

  const total = donutData.reduce((a, b) => a + b.value, 0);

  /* Donut total center */
  const totalEl = document.getElementById('donut-total');
  if (totalEl) totalEl.textContent = total;

  /* Legend */
  const legendEl = document.getElementById('donut-legend');
  if (legendEl) {
    legendEl.innerHTML = donutData.map(d => {
      const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
      return `
      <div class="legend-item">
        <div class="legend-dot" style="background:${d.color}"></div>
        <span class="legend-label">${d.label}</span>
        <span class="legend-count" style="color:${d.color}">${d.value}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  if (donutChart) donutChart.destroy();

  if (!donutData.length) return;

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   donutData.map(d => d.label),
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
              const pct = total > 0 ? ((item.raw / total) * 100).toFixed(1) : 0;
              return ` ${item.raw} orders · ${pct}%`;
            },
          },
        },
      },
      animation: { animateRotate: true, duration: 1000 },
    },
  });
}

/* ═══════════════════════════════════════════
   ACTIVITY FEED — real Supabase data
═══════════════════════════════════════════ */
async function loadActivityFeed() {
  const db = window.scriptoraSupabase;
  const el = document.getElementById('activityList');
  if (!el) return;

  if (!db) {
    el.innerHTML = '<div class="activity-item"><div class="activity-body"><div class="activity-title">Supabase সংযুক্ত নেই</div></div></div>';
    return;
  }

  try {
    /* Last 20 orders sorted by creation — derive activity from them */
    const { data: recentOrders } = await db
      .from('orders')
      .select('id, order_number, title, service_type, status, total_price, advance_paid, client_id, order_date, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(20);

    /* Fetch client names */
    const cids = [...new Set((recentOrders || []).map(o => o.client_id).filter(Boolean))];
    let cMap = {};
    if (cids.length) {
      const { data: cls } = await db.from('clients').select('id, name, email').in('id', cids);
      (cls || []).forEach(c => { cMap[c.id] = c; });
    }

    /* Fetch recent unread messages — from_admin column olmayabilir */
    const { data: recentMsgs } = await db
      .from('messages')
      .select('order_id, text, sent_at')
      .order('sent_at', { ascending: false })
      .limit(5);

    /* Build activity items from orders + messages, merged & sorted */
    const items = [];

    (recentOrders || []).forEach(o => {
      const cl     = cMap[o.client_id];
      const name   = cl?.name || cl?.email || 'Client';
      const oNum   = o.order_number || '#' + (o.id || '').slice(0, 8);
      const svc    = o.title || o.service_type || 'Academic Service';
      const time   = o.created_at;

      const statusIcons = {
        completed:   { icon: '✅', color: 'rgba(52,211,153,0.15)',  label: 'completed' },
        in_progress: { icon: '🔄', color: 'rgba(108,99,255,0.15)',  label: 'in progress' },
        writing:     { icon: '🔄', color: 'rgba(108,99,255,0.15)',  label: 'in progress' },
        confirmed:   { icon: '🔄', color: 'rgba(108,99,255,0.15)',  label: 'confirmed' },
        draft_ready: { icon: '📤', color: 'rgba(52,211,153,0.15)',  label: 'delivered' },
        in_review:   { icon: '👁', color: 'rgba(167,139,250,0.15)', label: 'in review' },
        revision:    { icon: '✏', color: 'rgba(245,158,11,0.15)',   label: 'revision requested' },
        hold:        { icon: '⏸', color: 'rgba(156,163,175,0.15)', label: 'on hold' },
        pending:     { icon: '📋', color: 'rgba(245,158,11,0.15)',  label: 'created' },
        overdue:     { icon: '⚠', color: 'rgba(248,113,113,0.15)', label: 'overdue' },
      };
      const si = statusIcons[o.status] || { icon: '📋', color: 'rgba(108,99,255,0.15)', label: o.status || 'created' };

      if (o.advance_paid > 0) {
        items.push({
          icon:  '💳',
          color: 'rgba(52,211,153,0.15)',
          title: `Payment received <b>৳${Number(o.advance_paid).toLocaleString()}</b>`,
          sub:   `${name} — ${oNum}`,
          time,
        });
      }

      items.push({
        icon:  si.icon,
        color: si.color,
        title: `Order <b>${oNum}</b> ${si.label}`,
        sub:   `${name} — ${svc}`,
        time,
      });
    });

    (recentMsgs || []).forEach(m => {
      items.push({
        icon:  '💬',
        color: 'rgba(17,181,217,0.15)',
        title: 'New message received',
        sub:   (m.text || '').slice(0, 60) + ((m.text || '').length > 60 ? '…' : ''),
        time:  m.sent_at,
      });
    });

    /* Sort all items by time descending */
    items.sort((a, b) => new Date(b.time) - new Date(a.time));

    if (!items.length) {
      el.innerHTML = '<div class="activity-item"><div class="activity-body"><div class="activity-title">কোনো activity নেই</div></div></div>';
      return;
    }

    el.innerHTML = items.slice(0, 8).map(a => `
      <div class="activity-item">
        <div class="activity-dot-wrap">
          <div class="activity-dot" style="background:${a.color}">${a.icon}</div>
          <div class="activity-line"></div>
        </div>
        <div class="activity-body">
          <div class="activity-title">${a.title}</div>
          <div class="activity-title"><span>${escapeHtmlAdmin(a.sub)}</span></div>
          <div class="activity-time"><i class="ti ti-clock" style="font-size:.7rem"></i> ${formatRelativeTimeAdmin(a.time)}</div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('[Admin] Activity feed error:', err);
    if (el) el.innerHTML = '<div class="activity-item"><div class="activity-body"><div class="activity-title">Activity লোড হয়নি</div></div></div>';
  }
}

/* ═══════════════════════════════════════════
   ORDERS TABLE RENDER
═══════════════════════════════════════════ */
function renderOrders(data) {
  const tbody = document.getElementById('ordersBody');
  if (!tbody) return;
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:24px;">কোনো order পাওয়া যায়নি</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(o => `
    <tr>
      <td><span class="order-id">${escapeHtmlAdmin(o.id)}</span></td>
      <td>
        <div class="client-cell">
          <div class="client-av" style="background:${o.color}22;color:${o.color}">${escapeHtmlAdmin(o.avatar)}</div>
          ${escapeHtmlAdmin(o.client)}
        </div>
      </td>
      <td>${escapeHtmlAdmin(o.service)}</td>
      <td><span class="dept-cell">${escapeHtmlAdmin(o.dept)}</span></td>
      <td><span class="status-badge ${o.status}">${statusLabel(o.status)}</span></td>
      <td class="amount-cell">৳${Number(o.amount).toLocaleString()}</td>
      <td class="deadline-cell">${escapeHtmlAdmin(o.deadline)}</td>
    </tr>
  `).join('');
}

function statusLabel(s) {
  return { progress:'In Progress', in_progress:'In Progress', pending:'Pending', done:'Completed', completed:'Completed', overdue:'Overdue' }[s] || s;
}

/* ═══════════════════════════════════════════
   SEARCH — filters from real Supabase data
═══════════════════════════════════════════ */
function handleSearch(q) {
  const term   = (q || '').toLowerCase().trim();
  const source = window._mappedOrders || [];
  const filtered = term === ''
    ? source.slice(0, 10)
    : source.filter(o =>
        o.client.toLowerCase().includes(term)  ||
        o.id.toLowerCase().includes(term)      ||
        o.service.toLowerCase().includes(term) ||
        o.dept.toLowerCase().includes(term)
      );
  renderOrders(filtered);
}

/* ═══════════════════════════════════════════
   MODAL — Create New Order
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

async function submitOrder() {
  const client  = document.getElementById('m-client').value.trim();
  const contact = document.getElementById('m-contact').value.trim();
  const amount  = parseInt(document.getElementById('m-amount').value) || 0;
  const service = document.getElementById('m-service').value;
  const dept    = document.getElementById('m-dept').value;
  const deadline= document.getElementById('m-deadline').value;
  const notes   = document.getElementById('m-notes').value.trim();

  if (!client) { showToast('⚠️ Client name দিন!', '#f87171'); return; }

  const submitBtn = document.querySelector('#modalOverlay .modal-btn-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

  try {
    const sb = window.scriptoraSupabase;
    const orderNum = 'OPA-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 900 + 100);

    let clientId = null;
    if (sb && contact) {
      const isEmail = contact.includes('@');
      const query = isEmail
        ? sb.from('clients').select('id').eq('email', contact).maybeSingle()
        : sb.from('clients').select('id').or(`phone.eq.${contact},whatsapp.eq.${contact}`).maybeSingle();
      const { data: existingClient } = await query;

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const clientData = { name: client, created_at: new Date().toISOString() };
        if (isEmail) clientData.email = contact;
        else         clientData.phone = contact;
        const { data: newClient } = await sb.from('clients').insert(clientData).select('id').single();
        if (newClient) clientId = newClient.id;
      }
    }

    if (sb) {
      const { error: orderErr } = await sb.from('orders').insert({
        order_number:         orderNum,
        client_id:            clientId,
        title:                service,
        service_type:         service,
        department:           dept,
        total_price:          amount,
        advance_paid:         0,
        due_amount:           amount,
        status:               'pending',
        payment_status:       'unpaid',
        deadline:             deadline || null,
        special_instructions: notes || null,
        order_date:           new Date().toISOString(),
        created_at:           new Date().toISOString(),
      });
      if (orderErr) throw orderErr;
    }

    closeModal();
    showToast(`✅ Order #${orderNum} সফলভাবে তৈরি হয়েছে!`, '#34d399');

    /* Reload everything */
    setTimeout(() => {
      loadOrdersFromSupabase();
      loadClientStats();
      loadActivityFeed();
    }, 800);

    /* Reset form */
    ['m-client','m-contact','m-amount','m-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  } catch (err) {
    console.error('[Admin] Order create error:', err);
    showToast('❌ Error: ' + (err.message || 'Unknown'), '#f87171');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Order'; }
  }
}

/* ═══════════════════════════════════════════
   TOPBAR MESSAGES — real Supabase data
═══════════════════════════════════════════ */
async function loadAdminMessages() {
  if (!window.scriptoraSupabase) return;
  const sb = window.scriptoraSupabase;

  const list     = document.querySelector('#msg-panel .dp-list');
  const badgeTxt = document.querySelector('#msg-panel .dp-badge');
  const dot      = document.getElementById('msgDot');

  const { data: unread, error } = await sb
    .from('messages')
    .select('order_id, text, sent_at, from_admin, read')
    .or('from_admin.eq.false,from_admin.is.null')
    .order('sent_at', { ascending: false })
    .limit(30);

  if (error) { console.error('Message load error:', error); return; }

  if (!unread || !unread.length) {
    if (list)     list.innerHTML = '<div class="dp-item"><div class="dp-body"><div class="dp-text">কোনো নতুন message নেই</div></div></div>';
    if (badgeTxt) badgeTxt.style.display = 'none';
    if (dot)      dot.style.display = 'none';
    return;
  }

  const grouped = {};
  unread.forEach(m => {
    if (!grouped[m.order_id]) grouped[m.order_id] = { latest: m, count: 0 };
    grouped[m.order_id].count++;
    if (new Date(m.sent_at) > new Date(grouped[m.order_id].latest.sent_at))
      grouped[m.order_id].latest = m;
  });
  const orderIds = Object.keys(grouped);

  const { data: ordersData } = await sb
    .from('orders').select('id, title, service_type, client_id').in('id', orderIds);

  const orderMap = {};
  (ordersData || []).forEach(o => { orderMap[o.id] = o; });

  const clientIds = [...new Set((ordersData || []).map(o => o.client_id).filter(Boolean))];
  let clientMap = {};
  if (clientIds.length) {
    const { data: clientsData } = await sb.from('clients').select('id, name, email').in('id', clientIds);
    (clientsData || []).forEach(c => { clientMap[c.id] = c; });
  }

  const rows = orderIds.map(oid => {
    const o      = orderMap[oid] || {};
    const client = clientMap[o.client_id] || {};
    return {
      orderId: oid,
      name:    client.name || client.email || 'Client',
      title:   o.title || o.service_type || 'Order',
      preview: (grouped[oid].latest.text || '').replace(/^\[REVIEW_REQUEST\]\s*/i, '📋 Review: '),
      time:    grouped[oid].latest.sent_at,
      count:   grouped[oid].count,
    };
  }).sort((a, b) => new Date(b.time) - new Date(a.time));

  if (list) {
    list.innerHTML = rows.slice(0, 5).map(r => `
      <div class="dp-item unread" onclick="window.location.href='admin-messages.html?order=${r.orderId}'" style="cursor:pointer">
        <div class="dp-avatar dp-av-purple">${escapeHtmlAdmin(r.name).substring(0, 2).toUpperCase()}</div>
        <div class="dp-body">
          <div class="dp-text"><b>${escapeHtmlAdmin(r.name)}</b></div>
          <div class="dp-sub">${escapeHtmlAdmin(r.preview)}</div>
          <div class="dp-time">${formatRelativeTimeAdmin(r.time)}</div>
        </div>
      </div>`).join('');
  }

  const totalUnread = rows.reduce((s, r) => s + r.count, 0);
  if (badgeTxt) { badgeTxt.textContent = totalUnread + ' new'; badgeTxt.style.display = ''; }
  if (dot)      dot.style.display = '';
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

  if (page === 'orders') {
    window.location.href = 'order-management.html';
    return;
  }

  if (page !== 'dashboard') {
    showToast(`📂 "${titles[page]}" — এই পেজটি শীঘ্রই যোগ হবে!`, '#f59e0b');
  }
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
    document.getElementById('searchInput')?.focus();
  }
});

/* ═══════════════════════════════════════════
   DROPDOWN PANELS
═══════════════════════════════════════════ */
function toggleDropdown(id, e) {
  e.stopPropagation();
  const panel  = document.getElementById(id);
  const isOpen = panel.classList.contains('open');
  document.querySelectorAll('.dropdown-panel').forEach(p => p.classList.remove('open'));
  if (!isOpen) {
    panel.classList.add('open');
    if (id === 'msg-panel') loadAdminMessages();
  }
}

document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-panel').forEach(p => p.classList.remove('open'));
});

function handleLogout() {
  if (confirm('Logout করবেন?')) {
    showToast('👋 Logged out successfully!', '#34d399');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
  }
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function escapeHtmlAdmin(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatRelativeTimeAdmin(isoStr) {
  const diffMin = Math.floor((Date.now() - new Date(isoStr)) / 60000);
  if (diffMin < 1)  return 'এখনই';
  if (diffMin < 60) return diffMin + ' min ago';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return diffHr + ' hours ago';
  const diffDay = Math.floor(diffHr / 24);
  return diffDay === 1 ? 'গতকাল' : diffDay + ' days ago';
}
