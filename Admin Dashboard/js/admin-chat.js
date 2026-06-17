/* ── ADMIN CHAT — admin-chat.js ────────────────────────────────────────── */

const sb = window.scriptoraSupabase;

/* ── State ─────────────────────────────────────────────────────────────── */
let conversations  = [];
let currentOrderId = null;
let adminId        = null;
let chatChannel    = null;
let globalChannel  = null;

/* ── Init ──────────────────────────────────────────────────────────────── */
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || session.user.email.toLowerCase() !== 'yeasinkabirshifat@gmail.com') {
    window.location.href = '../Login Page/login.html';
    return;
  }

  adminId = session.user.id;
  const adminEmailEl = document.getElementById('sidebarAdminEmail');
  if (adminEmailEl) adminEmailEl.textContent = session.user.email;

  await loadConversations();
  subscribeGlobal();
  bindEvents();

  /* Topbar message থেকে সরাসরি কোনো order-এর conversation এ আসা হলে */
  const wantedOrderId = new URLSearchParams(window.location.search).get('order');
  if (wantedOrderId) openConv(wantedOrderId);
}

/* ── Load all orders that have messages ────────────────────────────────── */
async function loadConversations() {
  /* Get all orders with client info */
  const { data: orders } = await sb
    .from('orders')
    .select('id, title, service_type, status, client_id, created_at')
    .order('created_at', { ascending: false });

  if (!orders || !orders.length) {
    document.getElementById('convList').innerHTML = '<div class="conv-empty">কোনো order নেই</div>';
    return;
  }

  /* Get latest message per order */
  const { data: msgs } = await sb
    .from('messages')
    .select('order_id, text, from_admin, sent_at, read')
    .order('sent_at', { ascending: false });

  /* Get all client profiles */
  const clientIds = [...new Set(orders.map(o => o.client_id).filter(Boolean))];
  let profileMap = {};
  if (clientIds.length) {
    const { data: clients } = await sb
      .from('clients')
      .select('id, name, email, phone')
      .in('id', clientIds);
    (clients || []).forEach(c => profileMap[c.id] = c);
  }

  /* Build conversation list */
  const msgMap    = {};
  const unreadMap = {};

  (msgs || []).forEach(m => {
    if (!msgMap[m.order_id]) msgMap[m.order_id] = m;
    if (!m.from_admin && !m.read) {
      unreadMap[m.order_id] = (unreadMap[m.order_id] || 0) + 1;
    }
  });

  /* Only show orders that have at least one message */
  conversations = orders
    .filter(o => msgMap[o.id])
    .map(o => ({
      ...o,
      latestMsg: msgMap[o.id],
      unread:    unreadMap[o.id] || 0,
      profile:   profileMap[o.client_id] || {}
    }))
    .sort((a, b) => new Date(b.latestMsg.sent_at) - new Date(a.latestMsg.sent_at));

  renderConvList(conversations);
  updateGlobalBadge(conversations.reduce((s, c) => s + c.unread, 0));
}

/* ── Render conversation list ──────────────────────────────────────────── */
function renderConvList(list) {
  const el = document.getElementById('convList');
  document.getElementById('convCount').textContent = list.length;

  if (!list.length) {
    el.innerHTML = '<div class="conv-empty">কোনো conversation নেই। Client message করলে এখানে দেখা যাবে।</div>';
    return;
  }

  el.innerHTML = list.map(c => {
    const p    = c.profile;
    const name = p.name || p.email || 'Unknown Client';
    const initials = name.substring(0, 2).toUpperCase();
    const title    = c.title || c.service_type || 'Order';
    const preview  = c.latestMsg?.text || '';
    const time     = formatTime(c.latestMsg?.sent_at);
    const active   = currentOrderId === c.id ? 'active' : '';
    const unreadCls = c.unread > 0 ? 'unread' : '';

    return `
    <div class="conv-item ${active} ${unreadCls}" data-id="${c.id}" onclick="openConv('${c.id}')">
      <div class="conv-av">${initials}</div>
      <div class="conv-info">
        <div class="conv-name">${escH(name)}</div>
        <div class="conv-order-title">${escH(title)}</div>
        <div class="conv-preview">${c.latestMsg?.from_admin ? 'আপনি: ' : ''}${escH(preview)}</div>
      </div>
      <div class="conv-meta">
        <span class="conv-time">${time}</span>
        ${c.unread > 0 ? `<span class="conv-unread-dot"></span>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ── Open a conversation ───────────────────────────────────────────────── */
async function openConv(orderId) {
  currentOrderId = orderId;

  document.querySelectorAll('.conv-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.conv-item[data-id="${orderId}"]`)?.classList.add('active');
  document.getElementById('chatArea').classList.add('mobile-open');
  document.getElementById('chatEmptyState').style.display = 'none';
  document.getElementById('adminChatBox').style.display = 'flex';

  /* Fill header */
  const conv = conversations.find(c => c.id === orderId);
  if (conv) {
    const p    = conv.profile;
    const name = p.name || p.email || 'Unknown';
    document.getElementById('clientAv').textContent   = name.substring(0, 2).toUpperCase();
    document.getElementById('clientName').textContent  = name;
    document.getElementById('chatOrderMeta').textContent =
      `${conv.title || conv.service_type || 'Order'} · #${String(orderId).slice(-6).toUpperCase()}`;

    const badge = document.getElementById('chatStatusBadge');
    badge.textContent = conv.status || '';
    badge.className   = `order-status-badge ${conv.status || ''}`;
  }

  /* Load messages */
  const body = document.getElementById('adminChatBody');
  body.innerHTML = '<div class="chat-loading-wrap"><div class="spinner"></div></div>';

  const { data: msgs } = await sb
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('sent_at', { ascending: true });

  renderMessages(msgs || [], conv?.profile);
  subscribeToOrder(orderId);

  /* Mark client messages as read */
  await sb.from('messages')
    .update({ read: true })
    .eq('order_id', orderId)
    .eq('from_admin', false)
    .eq('read', false);

  const c = conversations.find(x => x.id === orderId);
  if (c) c.unread = 0;
  updateGlobalBadge(conversations.reduce((s, c) => s + c.unread, 0));
  document.querySelector(`.conv-item[data-id="${orderId}"]`)?.classList.remove('unread');
  const dot = document.querySelector(`.conv-item[data-id="${orderId}"] .conv-unread-dot`);
  if (dot) dot.remove();
}

/* ── Render messages ───────────────────────────────────────────────────── */
function renderMessages(msgs, profile) {
  const body = document.getElementById('adminChatBody');
  body.innerHTML = '';

  if (!msgs.length) {
    body.innerHTML = `<div class="chat-body-empty">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <p>কোনো message নেই</p>
    </div>`;
    return;
  }

  const p           = profile || {};
  const clientName  = p.name || p.email || 'Client';
  const clientInit  = clientName.substring(0, 2).toUpperCase();

  let lastDate = '';
  msgs.forEach(msg => {
    const d       = new Date(msg.sent_at);
    const dateStr = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });

    if (dateStr !== lastDate) {
      const div = document.createElement('div');
      div.className   = 'chat-date-divider';
      div.textContent = dateStr;
      body.appendChild(div);
      lastDate = dateStr;
    }

    body.appendChild(buildBubble(msg, clientInit));
  });

  scrollToBottom();
}

/* ── Build bubble ──────────────────────────────────────────────────────── */
function buildBubble(msg, clientInitials = 'C') {
  const isAdmin = msg.from_admin;
  const time    = new Date(msg.sent_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

  const row = document.createElement('div');
  row.className = `msg-row ${isAdmin ? 'admin' : 'client'}`;

  const av = document.createElement('div');
  av.className   = `msg-av ${isAdmin ? 'admin-av' : 'client-av'}`;
  av.textContent = isAdmin ? 'SA' : clientInitials;

  const wrap  = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className   = 'msg-bubble';
  bubble.textContent = msg.text;

  const t = document.createElement('div');
  t.className   = 'msg-time';
  t.textContent = time;

  wrap.appendChild(bubble);
  wrap.appendChild(t);
  row.appendChild(av);
  row.appendChild(wrap);
  return row;
}

/* ── Realtime: one order ───────────────────────────────────────────────── */
function subscribeToOrder(orderId) {
  if (chatChannel) sb.removeChannel(chatChannel);

  chatChannel = sb
    .channel(`admin:chat:${orderId}`)
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'messages',
      filter: `order_id=eq.${orderId}`
    }, payload => {
      const body  = document.getElementById('adminChatBody');
      const empty = body.querySelector('.chat-body-empty');
      if (empty) empty.remove();

      const conv  = conversations.find(c => c.id === orderId);
      const init  = (conv?.profile?.name || 'C').substring(0, 2).toUpperCase();
      body.appendChild(buildBubble(payload.new, init));
      scrollToBottom();

      if (!payload.new.from_admin) {
        sb.from('messages').update({ read: true }).eq('id', payload.new.id);
      }
      updateConvPreview(orderId, payload.new);
    })
    .subscribe();
}

/* ── Realtime: all orders (new messages from clients) ──────────────────── */
function subscribeGlobal() {
  globalChannel = sb
    .channel('admin:all:messages')
    .on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'messages'
    }, payload => {
      const msg = payload.new;
      if (!msg.from_admin && msg.order_id !== currentOrderId) {
        const c = conversations.find(x => x.id === msg.order_id);
        if (c) {
          c.unread++;
          c.latestMsg = msg;
          conversations.sort((a, b) => new Date(b.latestMsg.sent_at) - new Date(a.latestMsg.sent_at));
          renderConvList(conversations);
          updateGlobalBadge(conversations.reduce((s, c) => s + c.unread, 0));
        } else {
          loadConversations();
        }
      }
    })
    .subscribe();
}

/* ── Send reply ────────────────────────────────────────────────────────── */
async function sendReply() {
  const input = document.getElementById('adminChatInput');
  const btn   = document.getElementById('adminSendBtn');
  const text  = input.value.trim();

  if (!text || !currentOrderId) return;

  btn.disabled = true;
  input.value  = '';
  input.style.height = 'auto';

  /* Get client_id from order */
  const conv      = conversations.find(c => c.id === currentOrderId);
  const client_id = conv?.client_id || null;

  const { error } = await sb.from('messages').insert({
    order_id:   currentOrderId,
    client_id:  client_id,
    text:       text,
    from_admin: true,
    sent_at:    new Date().toISOString(),
    read:       false
  });

  btn.disabled = false;
  if (error) {
    input.value = text;
    showToast('Message পাঠানো যায়নি: ' + error.message);
    console.error(error);
  }
}

/* ── Update conv preview ───────────────────────────────────────────────── */
function updateConvPreview(orderId, msg) {
  const item = document.querySelector(`.conv-item[data-id="${orderId}"]`);
  if (!item) return;
  const prev = item.querySelector('.conv-preview');
  if (prev) prev.textContent = msg.from_admin ? `আপনি: ${msg.text}` : msg.text;
  const time = item.querySelector('.conv-time');
  if (time) time.textContent = formatTime(msg.sent_at);
}

/* ── Search ────────────────────────────────────────────────────────────── */
function filterConversations(q) {
  if (!q.trim()) { renderConvList(conversations); return; }
  const lower    = q.toLowerCase();
  const filtered = conversations.filter(c => {
    const p    = c.profile;
    const name = (p.name || p.email || '').toLowerCase();
    const title = (c.title || c.service_type || '').toLowerCase();
    return name.includes(lower) || title.includes(lower);
  });
  renderConvList(filtered);
}

/* ── Bind events ───────────────────────────────────────────────────────── */
function bindEvents() {
  document.getElementById('adminSendBtn')?.addEventListener('click', sendReply);

  document.getElementById('adminChatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  });

  document.getElementById('adminChatInput')?.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  document.getElementById('convSearch')?.addEventListener('input', e => filterConversations(e.target.value));

  document.getElementById('backMobileBtn')?.addEventListener('click', () => {
    document.getElementById('chatArea').classList.remove('mobile-open');
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = 'admin.html';
  });
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function scrollToBottom() {
  const body = document.getElementById('adminChatBody');
  if (body) body.scrollTop = body.scrollHeight;
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d    = new Date(isoStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'গতকাল';
  if (diff < 7)  return d.toLocaleDateString('bn-BD', { weekday: 'short' });
  return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
}

function updateGlobalBadge(count) {
  const badge = document.getElementById('adminMsgBadge');
  if (!badge) return;
  if (count > 0) { badge.textContent = count; badge.style.display = ''; }
  else badge.style.display = 'none';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'toast show';
  setTimeout(() => t.className = 'toast', 3000);
}

function escH(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Start ─────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
