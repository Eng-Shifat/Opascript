/* ── CHAT MODULE — Client Side ─────────────────────────────────────────── */
/* Supabase credentials আগে থেকেই dashboard.js-এ init হয়ে আছে ধরে নেওয়া হচ্ছে */
/* তবে এখানেও fallback হিসেবে রাখা হলো */

const SUPA_URL = 'https://hivrmntxpmpwthmjtoem.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';

/* Global supabase client — window._sb থেকে নেওয়া হবে (dashboard.js এ তৈরি),
   না থাকলে নতুন তৈরি করা হবে */
function getSB() {
  if (window._sb) return window._sb;
  window._sb = supabase.createClient(SUPA_URL, SUPA_KEY);
  return window._sb;
}

/* ── State ─────────────────────────────────────────────────────────────── */
let currentOrderId = null;
let currentUserId  = null;
let chatChannel    = null;
let userInitials   = 'U';

/* ── Init ──────────────────────────────────────────────────────────────── */
async function initChat() {
  const sb = getSB();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  currentUserId = user.id;
  const meta = user.user_metadata || {};
  const name = (meta.first_name || meta.full_name || user.email || 'U');
  userInitials = name.substring(0, 2).toUpperCase();

  await loadOrdersIntoSelect(user.id);
  bindChatEvents();
}

/* ── Load orders into dropdown ─────────────────────────────────────────── */
async function loadOrdersIntoSelect(userId) {
  const sb = getSB();
  const sel = document.getElementById('chatOrderSelect');
  if (!sel) return;

  const { data: orders, error } = await sb
    .from('orders')
    .select('id, title, service_type, status, order_number')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !orders) return;

  sel.innerHTML = '<option value="">Order বেছে নিন</option>';
  orders.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.dataset.orderNumber = o.order_number || '';
    opt.textContent = `${o.order_number ? '#' + o.order_number + ' — ' : ''}${o.title || o.service_type || 'Order'}`;
    sel.appendChild(opt);
  });

  /* URL param থেকে auto-select */
  const params = new URLSearchParams(window.location.search);
  const preOrder = params.get('order');
  if (preOrder) {
    sel.value = preOrder;
    loadChat(preOrder);
  }
}

/* ── Bind events ───────────────────────────────────────────────────────── */
function bindChatEvents() {
  const sel     = document.getElementById('chatOrderSelect');
  const sendBtn = document.getElementById('chatSendBtn');
  const input   = document.getElementById('chatInput');

  sel?.addEventListener('change', e => {
    const oid = e.target.value;
    if (oid) loadChat(oid);
    else showChatPrompt();
  });

  sendBtn?.addEventListener('click', sendMessage);

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  /* Auto-resize textarea */
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
}

/* ── Show / hide states ────────────────────────────────────────────────── */
function showChatPrompt() {
  document.getElementById('chatSelectPrompt').style.display = '';
  document.getElementById('chatBox').style.display = 'none';
  currentOrderId = null;
  unsubscribeChat();
}

function showChatBox(orderId) {
  document.getElementById('chatSelectPrompt').style.display = 'none';
  document.getElementById('chatBox').style.display = 'flex';

  /* order_number খোঁজো selected option থেকে */
  const sel = document.getElementById('chatOrderSelect');
  const selectedOpt = sel?.querySelector(`option[value="${orderId}"]`);
  const orderNum = selectedOpt?.dataset.orderNumber;
  document.getElementById('chatOrderId').textContent = orderNum ? `#SCR-${orderNum}` : `#${orderId.substring(0, 8)}`;
}

/* ── Load chat for an order ────────────────────────────────────────────── */
async function loadChat(orderId) {
  currentOrderId = orderId;
  showChatBox(orderId);

  const body = document.getElementById('chatBody');
  body.innerHTML = '<div class="chat-loading"><div class="spinner"></div></div>';

  const sb = getSB();
  const { data: msgs, error } = await sb
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  renderMessages(msgs || []);
  subscribeToChat(orderId);
  markMessagesRead(orderId);
}

/* ── Render messages ───────────────────────────────────────────────────── */
function renderMessages(msgs) {
  const body = document.getElementById('chatBody');
  body.innerHTML = '';

  if (!msgs.length) {
    body.innerHTML = `
      <div class="chat-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <p>এখনো কোনো message নেই। প্রথমে কথা বলুন!</p>
      </div>`;
    return;
  }

  let lastDate = '';
  msgs.forEach(msg => {
    const d = new Date(msg.created_at);
    const dateStr = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });

    if (dateStr !== lastDate) {
      const div = document.createElement('div');
      div.className = 'chat-date-divider';
      div.textContent = dateStr;
      body.appendChild(div);
      lastDate = dateStr;
    }

    body.appendChild(buildBubble(msg));
  });

  scrollToBottom();
}

/* ── Build a single bubble ─────────────────────────────────────────────── */
function buildBubble(msg) {
  const isClient = msg.sender === 'client';
  const time = new Date(msg.created_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

  const row = document.createElement('div');
  row.className = `msg-row ${isClient ? 'client' : 'admin'}`;
  row.dataset.id = msg.id;

  const av = document.createElement('div');
  av.className = `msg-av ${isClient ? 'client-av' : 'admin'}`;
  av.textContent = isClient ? userInitials : 'SA';

  const wrap = document.createElement('div');

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = msg.message;

  const t = document.createElement('div');
  t.className = 'msg-time';
  t.textContent = time;

  wrap.appendChild(bubble);
  wrap.appendChild(t);
  row.appendChild(av);
  row.appendChild(wrap);
  return row;
}

/* ── Realtime subscription ─────────────────────────────────────────────── */
function subscribeToChat(orderId) {
  unsubscribeChat();
  const sb = getSB();

  chatChannel = sb
    .channel(`messages:order:${orderId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `order_id=eq.${orderId}`
    }, payload => {
      const body = document.getElementById('chatBody');
      /* Remove empty state if present */
      const empty = body.querySelector('.chat-empty');
      if (empty) empty.remove();

      body.appendChild(buildBubble(payload.new));
      scrollToBottom();

      /* Badge update যদি অন্য page-এ থাকে */
      if (payload.new.sender === 'admin') {
        updateUnreadBadge();
      }
    })
    .subscribe();
}

function unsubscribeChat() {
  if (chatChannel) {
    getSB().removeChannel(chatChannel);
    chatChannel = null;
  }
}

/* ── Send message ──────────────────────────────────────────────────────── */
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const btn   = document.getElementById('chatSendBtn');
  const text  = input.value.trim();

  if (!text || !currentOrderId || !currentUserId) return;

  btn.disabled = true;
  input.value = '';
  input.style.height = 'auto';

  const sb = getSB();
  const { error } = await sb.from('messages').insert({
    order_id:   currentOrderId,
    sender:     'client',
    sender_id:  currentUserId,
    message:    text
  });

  btn.disabled = false;
  if (error) {
    console.error('Message send error:', error);
    input.value = text; /* restore */
    showToast('Message পাঠানো যায়নি। আবার চেষ্টা করুন।', 'error');
  }
}

/* ── Mark as read ──────────────────────────────────────────────────────── */
async function markMessagesRead(orderId) {
  const sb = getSB();
  await sb
    .from('messages')
    .update({ read: true })
    .eq('order_id', orderId)
    .eq('sender', 'admin')
    .eq('read', false);

  updateUnreadBadge();
}

/* ── Unread badge (global) ─────────────────────────────────────────────── */
async function updateUnreadBadge() {
  if (!currentUserId) return;
  const sb = getSB();

  /* Get all orders of this user */
  const { data: orders } = await sb
    .from('orders')
    .select('id')
    .eq('user_id', currentUserId);

  if (!orders || !orders.length) return;

  const orderIds = orders.map(o => o.id);

  const { count } = await sb
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('order_id', orderIds)
    .eq('sender', 'admin')
    .eq('read', false);

  const badge = document.getElementById('msgBadge');
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function scrollToBottom() {
  const body = document.getElementById('chatBody');
  if (body) body.scrollTop = body.scrollHeight;
}

function showToast(msg, type = 'info') {
  /* dashboard.js এর toast function use করা, নাহলে fallback */
  if (typeof window.showDashToast === 'function') {
    window.showDashToast(msg);
  } else {
    const t = document.getElementById('toast');
    if (t) {
      t.textContent = msg;
      t.className = `toast show ${type}`;
      setTimeout(() => t.className = 'toast', 3000);
    }
  }
}

/* "সম্পূর্ণ চ্যাট দেখুন" button — order detail page থেকে */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('goChatBtn')?.addEventListener('click', () => {
    const orderId = document.getElementById('goChatBtn')?.dataset.orderId;
    if (!orderId) return;

    /* Messages page-এ navigate করি */
    document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
    document.querySelector('[data-page="messages"]')?.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-messages')?.classList.add('active');

    const sel = document.getElementById('chatOrderSelect');
    if (sel) {
      sel.value = orderId;
      loadChat(orderId);
    }
  });
});

/* ── Page switch hook — Messages page-এ ঢুকলে init করো ─────────────────── */
/* dashboard.js এ page switching logic থাকলে এখানে hook করা যায় */
document.addEventListener('DOMContentLoaded', () => {
  /* Messages sidebar link */
  document.querySelector('[data-page="messages"]')?.addEventListener('click', () => {
    setTimeout(() => {
      if (!currentUserId) initChat();
    }, 100);
  });

  /* Auto-init if messages page is default active */
  if (document.getElementById('page-messages')?.classList.contains('active')) {
    initChat();
  }
});

/* Export for dashboard.js */
window.chatModule = { init: initChat, updateBadge: updateUnreadBadge };
