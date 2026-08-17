/* ══════════════════════════════════════════════
   SCRIPTORA — Client List
   js/admin-clients.js
══════════════════════════════════════════════ */
'use strict';

let ALL_CLIENTS    = [];
let ORDER_MAP      = {}; /* clientId → { count, totalSpent, dueAmount } */
let CURRENT_FILTER = 'all';
let SEARCH_QUERY   = '';
let CURRENT_PAGE   = 1;
const PAGE_SIZE    = 20;

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('cl-search').addEventListener('input', e => {
    SEARCH_QUERY = e.target.value.toLowerCase();
    CURRENT_PAGE = 1;
    renderTable();
  });
  await loadClients();
});

/* ── Load clients from Supabase ── */
async function loadClients() {
  const sb = window.scriptoraSupabase;
  if (!sb) { showToast('⚠️ Supabase connected হয়নি', '#f87171'); return; }

  try {
    const { data: clients, error: cErr } = await sb
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (cErr) throw cErr;
    ALL_CLIENTS = clients || [];

    const { data: orders } = await sb
      .from('orders')
      .select('client_id, total_price, advance_paid, due_amount, status, payment_status');

    ORDER_MAP = {};
    (orders || []).forEach(o => {
      if (!o.client_id) return;
      if (!ORDER_MAP[o.client_id]) ORDER_MAP[o.client_id] = { count: 0, totalSpent: 0, dueAmount: 0 };
      ORDER_MAP[o.client_id].count++;
      ORDER_MAP[o.client_id].totalSpent += Number(o.advance_paid) || 0;
      ORDER_MAP[o.client_id].dueAmount  += Number(o.due_amount)   || 0;
    });

    const totalClients  = ALL_CLIENTS.length;
    const activeClients = ALL_CLIENTS.filter(c => (ORDER_MAP[c.id]?.count || 0) > 0).length;
    const totalRevenue  = Object.values(ORDER_MAP).reduce((s, v) => s + v.totalSpent, 0);
    const totalDue      = Object.values(ORDER_MAP).reduce((s, v) => s + v.dueAmount,  0);

    document.getElementById('st-total').textContent   = totalClients;
    document.getElementById('st-active').textContent  = activeClients;
    document.getElementById('st-revenue').textContent = '৳' + totalRevenue.toLocaleString('en-IN');
    document.getElementById('st-due').textContent     = '৳' + totalDue.toLocaleString('en-IN');
    document.getElementById('cl-subtitle').textContent = `${totalClients} জন client — ${activeClients} জন active`;

    renderTable();

  } catch (e) {
    console.error('[Clients] load error:', e);
    document.getElementById('cl-tbody').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted2)">Error: ${e.message}</td></tr>`;
  }
}

/* ── Filter chip ── */
function setFilter(status, btn) {
  CURRENT_FILTER = status;
  CURRENT_PAGE   = 1;
  document.querySelectorAll('.cl-filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

/* ── Filter + search ── */
function getFiltered() {
  return ALL_CLIENTS.filter(c => {
    const orderData = ORDER_MAP[c.id] || { count: 0 };
    if (CURRENT_FILTER === 'active'   && orderData.count === 0) return false;
    if (CURRENT_FILTER === 'inactive' && orderData.count >  0) return false;
    if (SEARCH_QUERY) {
      const q     = SEARCH_QUERY;
      const name  = (c.name  || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || c.whatsapp || '').toLowerCase();
      const uni   = (c.University || c.university || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !uni.includes(q)) return false;
    }
    return true;
  });
}

/* ── Render table ── */
function renderTable() {
  const filtered = getFiltered();
  const total    = filtered.length;
  const start    = (CURRENT_PAGE - 1) * PAGE_SIZE;
  const page     = filtered.slice(start, start + PAGE_SIZE);

  const COLORS = ['#6c63ff','#34d399','#f59e0b','#a78bfa','#f87171','#11b5d9','#fb923c'];

  if (!page.length) {
    document.getElementById('cl-tbody').innerHTML = `
      <tr><td colspan="7">
        <div class="cl-empty">
          <i class="ti ti-users"></i>
          <p>${SEARCH_QUERY ? 'কোনো client পাওয়া যায়নি' : 'কোনো client নেই'}</p>
        </div>
      </td></tr>`;
    document.getElementById('cl-pagination').style.display = 'none';
    return;
  }

  document.getElementById('cl-tbody').innerHTML = page.map((c, i) => {
    const initials = (c.name || c.email || 'CL').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const color    = COLORS[(start + i) % COLORS.length];
    const ord      = ORDER_MAP[c.id] || { count: 0, totalSpent: 0, dueAmount: 0 };
    const isActive = ord.count > 0;
    const uni      = c.University || c.university || '—';
    const phone    = c.phone || c.whatsapp || '—';

    return `<tr onclick="openDetail('${c.id}')">
      <td>
        <div class="cl-name-cell">
          <div class="cl-avatar" style="background:${color}22;color:${color}">${initials}</div>
          <div>
            <strong>${esc(c.name || '—')}</strong>
            <span>${esc(c.email || '—')}</span>
          </div>
        </div>
      </td>
      <td style="color:var(--muted2);font-size:.78rem">${esc(phone)}</td>
      <td style="font-size:.78rem;color:var(--muted2)">${esc(uni)}</td>
      <td><span class="cl-orders-cnt">${ord.count}</span></td>
      <td>
        <div class="cl-amount">৳${ord.totalSpent.toLocaleString('en-IN')}</div>
        ${ord.dueAmount > 0 ? `<div class="cl-due">৳${ord.dueAmount.toLocaleString('en-IN')} due</div>` : ''}
      </td>
      <td>
        <span class="cl-badge ${isActive ? 'active' : 'inactive'}">
          ${isActive ? '● Active' : '○ Inactive'}
        </span>
      </td>
      <td>
        <div class="cl-actions" onclick="event.stopPropagation()">
          <div class="cl-act-btn" title="Orders দেখুন" onclick="openDetail('${c.id}')">
            <i class="ti ti-eye"></i>
          </div>
          <div class="cl-act-btn" title="Message করুন" onclick="messageClient('${c.id}')">
            <i class="ti ti-message"></i>
          </div>
        </div>
      </td>
    </tr>`;
  }).join('');

  /* Pagination */
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages > 1) {
    document.getElementById('cl-pagination').style.display = 'flex';
    document.getElementById('cl-pg-info').textContent =
      `${start + 1}–${Math.min(start + PAGE_SIZE, total)} of ${total} clients`;

    let btns = '';
    for (let p = 1; p <= totalPages; p++) {
      btns += `<div class="cl-pg-btn ${p === CURRENT_PAGE ? 'active' : ''}" onclick="goPage(${p})">${p}</div>`;
    }
    document.getElementById('cl-pg-btns').innerHTML = btns;
  } else {
    document.getElementById('cl-pagination').style.display = 'none';
  }
}

function goPage(p) {
  CURRENT_PAGE = p;
  renderTable();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Client Detail Panel ── */
async function openDetail(clientId) {
  const sb     = window.scriptoraSupabase;
  const client = ALL_CLIENTS.find(c => c.id === clientId);
  if (!client) return;

  document.getElementById('clDetailOverlay').classList.add('open');

  const COLORS   = ['#6c63ff','#34d399','#f59e0b','#a78bfa','#f87171','#11b5d9','#fb923c'];
  const initials = (client.name || client.email || 'CL').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const color    = COLORS[Math.abs(clientId.charCodeAt(0) - 48) % COLORS.length];
  const ord      = ORDER_MAP[clientId] || { count: 0, totalSpent: 0, dueAmount: 0 };

  document.getElementById('cdp-content').innerHTML = `
    <div class="cdp-profile">
      <div class="cdp-avatar" style="background:${color}22;color:${color}">${initials}</div>
      <div class="cdp-name">${esc(client.name || '—')}</div>
      <div class="cdp-email">${esc(client.email || '—')}</div>
      <div class="cdp-uni">${esc(client.University || client.university || '')}</div>
    </div>
    <div class="cdp-stats">
      <div class="cdp-stat">
        <div class="cdp-stat-val" style="color:var(--accent2)">${ord.count}</div>
        <div class="cdp-stat-label">Orders</div>
      </div>
      <div class="cdp-stat">
        <div class="cdp-stat-val" style="color:var(--green)">৳${ord.totalSpent.toLocaleString('en-IN')}</div>
        <div class="cdp-stat-label">Paid</div>
      </div>
      <div class="cdp-stat">
        <div class="cdp-stat-val" style="color:var(--red)">৳${ord.dueAmount.toLocaleString('en-IN')}</div>
        <div class="cdp-stat-label">Due</div>
      </div>
    </div>
    <div class="cdp-section">
      <div class="cdp-section-title">Contact Info</div>
      <div class="cdp-row"><span class="cdp-row-label">Email</span><span class="cdp-row-val">${esc(client.email || '—')}</span></div>
      <div class="cdp-row"><span class="cdp-row-label">Phone</span><span class="cdp-row-val">${esc(client.phone || client.whatsapp || '—')}</span></div>
      <div class="cdp-row"><span class="cdp-row-label">University</span><span class="cdp-row-val">${esc(client.University || client.university || '—')}</span></div>
      <div class="cdp-row"><span class="cdp-row-label">Joined</span><span class="cdp-row-val">${client.created_at ? new Date(client.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</span></div>
    </div>
    <div class="cdp-section" id="cdp-orders-section">
      <div class="cdp-section-title">Recent Orders</div>
      <div class="cdp-orders-list" id="cdp-orders-list">
        <div style="text-align:center;padding:16px;color:var(--muted2);font-size:.78rem">Loading orders...</div>
      </div>
    </div>
    <div style="padding:16px 20px;">
      <button onclick="messageClient('${clientId}')" style="width:100%;padding:10px;background:rgba(124,92,255,.15);border:1px solid rgba(124,92,255,.3);border-radius:10px;color:var(--accent2);font-family:'Sora',sans-serif;font-size:.82rem;cursor:pointer;font-weight:600;">
        <i class="ti ti-message"></i> Message করুন
      </button>
    </div>
  `;

  if (sb) {
    const { data: orders } = await sb
      .from('orders')
      .select('id, order_number, title, status, total_price, advance_paid, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (orders && orders.length) {
      const SC = { completed:'#34d399', writing:'#7c5cff', pending:'#f59e0b', overdue:'#f87171', draft_ready:'#a78bfa' };
      document.getElementById('cdp-orders-list').innerHTML = orders.map(o => `
        <div class="cdp-order-item" onclick="window.location.href='order-management.html'">
          <div>
            <div class="cdp-order-id">${esc(o.order_number || o.id.slice(0,8).toUpperCase())}</div>
            <div class="cdp-order-title">${esc(o.title || 'Academic Service')}</div>
          </div>
          <span style="background:${SC[o.status]||'#6f6a85'}22;color:${SC[o.status]||'#6f6a85'};font-size:.68rem;padding:2px 8px;border-radius:20px;font-weight:600;">${esc(o.status||'pending')}</span>
        </div>
      `).join('');
    } else {
      document.getElementById('cdp-orders-list').innerHTML =
        '<div style="text-align:center;padding:16px;color:var(--muted2);font-size:.78rem">কোনো order নেই</div>';
    }
  }
}

function closeDetail() {
  document.getElementById('clDetailOverlay').classList.remove('open');
}
function closeDetailPanel(e) {
  if (e.target === document.getElementById('clDetailOverlay')) closeDetail();
}

/* ── New Client Modal ── */
function openNewClientModal() {
  document.getElementById('ncModal').classList.add('open');
}
function closeNcModal() {
  document.getElementById('ncModal').classList.remove('open');
  ['nc-name','nc-email','nc-phone','nc-uni','nc-dept'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}
function closeNcOutside(e) {
  if (e.target === document.getElementById('ncModal')) closeNcModal();
}

async function saveNewClient() {
  const sb    = window.scriptoraSupabase;
  const name  = document.getElementById('nc-name').value.trim();
  const email = document.getElementById('nc-email').value.trim();
  if (!name)  { showToast('⚠️ নাম দিন', '#f87171'); return; }
  if (!email) { showToast('⚠️ Email দিন', '#f87171'); return; }

  const btn = document.querySelector('.nc-btn-save');
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const { data, error } = await sb.from('clients').insert({
      name,
      email,
      phone:      document.getElementById('nc-phone').value.trim() || null,
      University: document.getElementById('nc-uni').value.trim()   || null,
      department: document.getElementById('nc-dept').value.trim()  || null,
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    ALL_CLIENTS.unshift(data);
    renderTable();
    closeNcModal();
    showToast('✅ Client সফলভাবে যোগ হয়েছে!', '#34d399');

    document.getElementById('st-total').textContent    = ALL_CLIENTS.length;
    document.getElementById('cl-subtitle').textContent = `${ALL_CLIENTS.length} জন client`;
  } catch (e) {
    showToast('❌ Error: ' + e.message, '#f87171');
  } finally {
    btn.disabled = false; btn.textContent = 'Save করুন';
  }
}

/* ── Message Client ── */
async function messageClient(clientId) {
  const sb     = window.scriptoraSupabase;
  const client = ALL_CLIENTS.find(c => c.id === clientId);
  if (!client) return;

  const clientOrders = [];
  if (sb) {
    const { data: orders } = await sb
      .from('orders')
      .select('id, order_number, title, status')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (orders && orders.length) clientOrders.push(...orders);
  }

  if (!clientOrders.length) {
    /* No orders — go to messages page filtered by client */
    window.location.href = `admin-messages.html?client=${clientId}`;
    return;
  }

  if (clientOrders.length === 1) {
    window.location.href = `admin-messages.html?order=${clientOrders[0].id}`;
    return;
  }

  /* Multiple orders — show picker */
  document.getElementById('msgPickerClientName').textContent = esc(client.name || client.email || 'Client');

  const SC = { completed:'#34d399', writing:'#7c5cff', pending:'#f59e0b', overdue:'#f87171', draft_ready:'#a78bfa' };
  document.getElementById('msgPickerList').innerHTML = clientOrders.map(o => {
    const orderNo = o.order_number ? `#${o.order_number}` : `#${o.id.slice(0,8).toUpperCase()}`;
    const sc = SC[o.status] || '#6f6a85';
    return `
      <div class="mp-order-item" onclick="window.location.href='admin-messages.html?order=${o.id}'">
        <div>
          <div style="font-size:.78rem;font-family:monospace;color:var(--accent2)">${orderNo}</div>
          <div style="font-size:.75rem;color:var(--muted2);margin-top:2px">${esc(o.title || 'Academic Service')}</div>
        </div>
        <span style="background:${sc}22;color:${sc};font-size:.68rem;padding:2px 8px;border-radius:20px;font-weight:600;">${esc(o.status || 'pending')}</span>
      </div>`;
  }).join('');

  document.getElementById('msgPickerModal').classList.add('open');
}

function closeMsgPicker() {
  document.getElementById('msgPickerModal').classList.remove('open');
}
function closeMsgPickerOutside(e) {
  if (e.target === document.getElementById('msgPickerModal')) closeMsgPicker();
}

/* ── Helpers ── */
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function showToast(msg, color = '#34d399') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.style.cssText = `background:${color};color:#fff;padding:12px 18px;border-radius:10px;font-size:.82rem;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.3);animation:fadeIn .2s ease;`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
