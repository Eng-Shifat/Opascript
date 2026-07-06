/* ═══════════════════════════════════════════════════════════════════════
   SCRIPTORA — CHAT MODULE (Client Side)  v2
   Order-based real-time support chat: text, files, images, payment
   screenshots, quick actions, pinned notices, typing indicator,
   admin online/offline presence, read receipts (sent/delivered/read).
   ═══════════════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://hivrmntxpmpwthmjtoem.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';
const CHAT_BUCKET = 'scriptora-files';           /* same bucket payment proofs already use */
const CHAT_FILE_MAX_MB = 15;

function getSB() {
  if (window._sb) return window._sb;
  window._sb = supabase.createClient(SUPA_URL, SUPA_KEY);
  return window._sb;
}

/* ── State ─────────────────────────────────────────────────────────────── */
let chatActiveOrderId   = null;
let currentUserId    = null;
let userInitials     = 'U';
let ordersCache      = {};   /* id -> order row */
let chatChannel       = null;
let typingChannel     = null;
let presenceChannel   = null;
let adminIsOnline     = false;
let typingHideTimer   = null;
let myTypingTimer     = null;
let iAmTyping         = false;
let pendingAttachment = null; /* { file, kind: 'image'|'file'|'payment_screenshot' } */

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
  subscribeAdminPresence();
}

/* ── Load orders into dropdown + cache full rows for the summary strip ──── */
async function loadOrdersIntoSelect(userId) {
  const sb = getSB();
  const sel = document.getElementById('chatOrderSelect');
  if (!sel) return;

  const { data: orders, error } = await sb
    .from('orders')
    .select('*')
    .eq('client_id', userId)
    .order('order_date', { ascending: false });

  if (error) {
    console.error('chat.js: failed to load orders for messages dropdown ->', error);
    showToast('Order list লোড করা যায়নি: ' + error.message, 'error');
    return;
  }
  if (!orders) return;

  ordersCache = {};
  orders.forEach(o => ordersCache[o.id] = o);

  sel.innerHTML = '<option value="">Order বেছে নিন</option>';
  orders.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = `${o.order_number ? '#' + o.order_number + ' — ' : ''}${o.title || o.service_type || 'Order'}`;
    sel.appendChild(opt);
  });

  /* URL param থেকে auto-select — order detail page-এর "সম্পূর্ণ চ্যাট দেখুন" বাটন থেকে আসলে */
  const params = new URLSearchParams(window.location.search);
  const preOrder = params.get('order');
  if (preOrder && ordersCache[preOrder]) {
    sel.value = preOrder;
    loadChat(preOrder);
  }
}

/* ── Bind events ───────────────────────────────────────────────────────── */
function bindChatEvents() {
  const sel     = document.getElementById('chatOrderSelect');
  const sendBtn = document.getElementById('chatSendBtn');
  const input   = document.getElementById('chatInput');
  const attachBtn   = document.getElementById('chatAttachBtn');
  const fileInput   = document.getElementById('chatFileInput');
  const imgOnlyInput = document.getElementById('chatImageOnlyInput');
  const cpnClose    = document.getElementById('cpnClose');

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

  /* Auto-resize + typing broadcast */
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    broadcastTyping(input.value.length > 0);
  });
  input?.addEventListener('blur', () => broadcastTyping(false));

  attachBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) stageAttachment(file, file.type.startsWith('image/') ? 'image' : 'file');
    e.target.value = '';
  });
  imgOnlyInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) stageAttachment(file, 'payment_screenshot');
    e.target.value = '';
  });

  cpnClose?.addEventListener('click', () => {
    const banner = document.getElementById('chatPinnedNotice');
    const id = banner?.dataset.msgId;
    if (id) {
      const dismissed = JSON.parse(localStorage.getItem('scriptora_dismissed_notices') || '[]');
      if (!dismissed.includes(id)) dismissed.push(id);
      localStorage.setItem('scriptora_dismissed_notices', JSON.stringify(dismissed));
    }
    banner.style.display = 'none';
  });

  /* Quick actions */
  document.getElementById('chatQuickActions')?.addEventListener('click', e => {
    const btn = e.target.closest('.qa-btn');
    if (!btn) return;
    handleQuickAction(btn.dataset.action);
  });
}

/* ── Quick actions ─────────────────────────────────────────────────────── */
function handleQuickAction(action) {
  if (!chatActiveOrderId) return;

  if (action === 'upload-payment') {
    /* Order detail page-এর payment proof section-এ নিয়ে যাওয়া */
    if (typeof window.openOrderDetail === 'function' && typeof window.showPage === 'function') {
      window.showPage('orders');
      window.openOrderDetail(chatActiveOrderId);
      setTimeout(() => {
        document.getElementById('proofSubmitSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
    return;
  }

  if (action === 'send-screenshot') {
    document.getElementById('chatImageOnlyInput')?.click();
    return;
  }

  if (action === 'need-help') {
    sendQuickText('🙋 আমার সাহায্য দরকার। Please contact me regarding this order.');
    return;
  }

  if (action === 'download-file') {
    sendQuickText('📥 Please share the latest file for my order.');
    return;
  }
}

async function sendQuickText(text) {
  const sb = getSB();
  const { error } = await sb.from('messages').insert({
    order_id:     chatActiveOrderId,
    sender:       'client',
    sender_id:    currentUserId,
    message:      text,
    message_type: 'quick_action',
    status:       'sent'
  });
  if (error) showToast('পাঠানো যায়নি। আবার চেষ্টা করুন।', 'error');
}

/* ── Stage / preview an attachment before sending ─────────────────────── */
function stageAttachment(file, kind) {
  if (file.size > CHAT_FILE_MAX_MB * 1024 * 1024) {
    showToast(`ফাইল সাইজ ${CHAT_FILE_MAX_MB}MB এর বেশি হতে পারবে না।`, 'error');
    return;
  }
  pendingAttachment = { file, kind };

  const preview = document.getElementById('chatAttachPreview');
  preview.style.display = 'flex';
  preview.innerHTML = `
    <div class="cap-info">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
      <span>${escHtml(file.name)}</span>
    </div>
    <button class="cap-remove" id="capRemove">&times;</button>`;
  document.getElementById('capRemove').addEventListener('click', () => {
    pendingAttachment = null;
    preview.style.display = 'none';
    preview.innerHTML = '';
  });
}

/* ── Show / hide states ────────────────────────────────────────────────── */
function showChatPrompt() {
  document.getElementById('chatSelectPrompt').style.display = '';
  document.getElementById('chatBox').style.display = 'none';
  chatActiveOrderId = null;
  unsubscribeChat();
}

function showChatBox(orderId) {
  document.getElementById('chatSelectPrompt').style.display = 'none';
  document.getElementById('chatBox').style.display = 'flex';
  renderOrderSummary(orderId);
  renderOnlineStatus();
}

/* ── Order summary strip ──────────────────────────────────────────────── */
function renderOrderSummary(orderId) {
  const order = ordersCache[orderId];
  if (!order) return;

  const badge = (typeof window.getStatusBadge === 'function')
    ? window.getStatusBadge(order.status)
    : { cls: 'badge-pending', label: order.status || 'Pending' };

  document.getElementById('cosOrderNo').textContent = order.order_number ? `#${order.order_number}` : `#${String(orderId).slice(-6).toUpperCase()}`;
  const statusBadge = document.getElementById('cosStatusBadge');
  statusBadge.textContent = badge.label;
  statusBadge.className = `status-badge ${badge.cls}`;

  document.getElementById('cosDeadline').textContent = order.deadline
    ? new Date(order.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const due = order.due_amount || 0;
  const dueEl = document.getElementById('cosDue');
  dueEl.textContent = `৳${Number(due).toLocaleString()}`;
  dueEl.classList.toggle('cos-due', due > 0);
  dueEl.classList.toggle('cos-paid', due <= 0);

  const stepMap = window._STATUS_STEP_MAP || {};
  const totalSteps = window._STEPS_TOTAL || 6;
  const step = stepMap[order.status] || 1;
  const derivedPct = Math.round((step / totalSteps) * 100);
  const pct = (typeof order.progress === 'number') ? order.progress : derivedPct;
  document.getElementById('cosProgress').textContent = `${pct}%`;
  document.getElementById('cosProgressFill').style.width = `${pct}%`;
}

/* ── Admin online/offline presence ────────────────────────────────────── */
function subscribeAdminPresence() {
  const sb = getSB();
  presenceChannel = sb.channel('presence-admin-status', { config: { presence: { key: currentUserId || 'client' } } });

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const admins = Object.values(state).flat().filter(p => p.role === 'admin');
      adminIsOnline = admins.length > 0;
      renderOnlineStatus();
    })
    .subscribe();
}

function renderOnlineStatus() {
  const dot  = document.getElementById('onlineDot');
  const text = document.getElementById('onlineText');
  if (!dot || !text) return;
  dot.classList.toggle('offline', !adminIsOnline);
  text.textContent = adminIsOnline ? 'Online' : 'Offline';
}

/* ── Typing indicator ─────────────────────────────────────────────────── */
function subscribeTyping(orderId) {
  const sb = getSB();
  typingChannel = sb.channel(`typing-order-${orderId}`);
  typingChannel
    .on('broadcast', { event: 'typing' }, payload => {
      if (payload.payload.sender === 'client') return; /* ignore our own echo */
      showTypingRow(payload.payload.typing);
    })
    .subscribe();
}

function broadcastTyping(isTyping) {
  if (!typingChannel || !chatActiveOrderId) return;
  if (isTyping === iAmTyping) {
    if (isTyping) resetMyTypingTimer();
    return;
  }
  iAmTyping = isTyping;
  typingChannel.send({ type: 'broadcast', event: 'typing', payload: { sender: 'client', typing: isTyping } });
  if (isTyping) resetMyTypingTimer();
}

function resetMyTypingTimer() {
  clearTimeout(myTypingTimer);
  myTypingTimer = setTimeout(() => broadcastTyping(false), 2500);
}

function showTypingRow(show) {
  const row = document.getElementById('chatTypingRow');
  if (!row) return;
  clearTimeout(typingHideTimer);
  if (show) {
    row.style.display = 'flex';
    scrollToBottom();
    typingHideTimer = setTimeout(() => { row.style.display = 'none'; }, 4000);
  } else {
    row.style.display = 'none';
  }
}

/* ── Load chat for an order ────────────────────────────────────────────── */
async function loadChat(orderId) {
  chatActiveOrderId = orderId;
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
  renderPinnedNotice(msgs || []);
  subscribeToChat(orderId);
  subscribeTyping(orderId);
  markMessagesRead(orderId);
}

/* ── Pinned notice banner ──────────────────────────────────────────────── */
function renderPinnedNotice(msgs) {
  const banner = document.getElementById('chatPinnedNotice');
  const pinned = [...msgs].reverse().find(m => m.is_pinned);
  const dismissed = JSON.parse(localStorage.getItem('scriptora_dismissed_notices') || '[]');

  if (!pinned || dismissed.includes(pinned.id)) {
    banner.style.display = 'none';
    return;
  }
  banner.dataset.msgId = pinned.id;
  document.getElementById('cpnText').textContent = pinned.message || 'Please check your order.';
  banner.style.display = 'flex';
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
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    if (dateStr !== lastDate) {
      const div = document.createElement('div');
      div.className = 'chat-date-divider';
      div.textContent = dateStr === new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) ? 'Today' : dateStr;
      body.appendChild(div);
      lastDate = dateStr;
    }

    body.appendChild(buildBubble(msg));
  });

  scrollToBottom();
}

/* ── Status ticks (sent/delivered/read) ───────────────────────────────── */
function statusTicksSVG(status) {
  if (status === 'read') {
    return `<svg class="tick tick-read" width="15" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L4.5 9L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5.5L9 9L15.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (status === 'delivered') {
    return `<svg class="tick tick-delivered" width="15" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L4.5 9L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5.5L9 9L15.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return `<svg class="tick tick-sent" width="12" height="10" viewBox="0 0 12 11" fill="none"><path d="M1 5.5L4.5 9L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ── Build a single bubble ─────────────────────────────────────────────── */
function buildBubble(msg) {
  const isClient = msg.sender === 'client';
  const time = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const row = document.createElement('div');
  row.className = `msg-row ${isClient ? 'client' : 'admin'}`;
  row.dataset.id = msg.id;

  const av = document.createElement('div');
  av.className = `msg-av ${isClient ? 'client-av' : 'admin'}`;
  av.textContent = isClient ? userInitials : 'SA';

  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';

  let bubble;
  if (msg.message_type === 'image' || msg.message_type === 'payment_screenshot') {
    bubble = document.createElement('div');
    bubble.className = 'msg-bubble msg-media-bubble';
    if (msg.message_type === 'payment_screenshot') {
      bubble.innerHTML += `<div class="msg-file-tag">💳 Payment Screenshot</div>`;
    }
    bubble.innerHTML += `<a href="${msg.file_url}" target="_blank" rel="noopener"><img src="${msg.file_url}" alt="attachment" class="msg-img" loading="lazy"/></a>`;
    if (msg.message) bubble.innerHTML += `<div class="msg-caption">${escHtml(msg.message)}</div>`;
  } else if (msg.message_type === 'file') {
    bubble = document.createElement('div');
    bubble.className = 'msg-bubble msg-file-bubble';
    bubble.innerHTML = `
      <a href="${msg.file_url}" target="_blank" rel="noopener" class="msg-file-link">
        <span class="msg-file-icon">📄</span>
        <span class="msg-file-name">${escHtml(msg.file_name || 'File')}</span>
        <span class="msg-file-download">⬇</span>
      </a>`;
  } else {
    bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    if (msg.message_type === 'quick_action') bubble.classList.add('msg-quick-action');
    bubble.textContent = msg.message || '';
  }

  const t = document.createElement('div');
  t.className = 'msg-time';
  t.innerHTML = `<span>${time}</span>`;
  if (isClient) {
    const ticks = document.createElement('span');
    ticks.className = 'msg-ticks';
    ticks.innerHTML = statusTicksSVG(msg.status || 'sent');
    t.appendChild(ticks);
  }

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
    .channel(`messages-order-${orderId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `order_id=eq.${orderId}`
    }, payload => {
      const body = document.getElementById('chatBody');
      const empty = body.querySelector('.chat-empty');
      if (empty) empty.remove();

      body.appendChild(buildBubble(payload.new));
      scrollToBottom();

      if (payload.new.is_pinned) renderPinnedNotice([payload.new]);

      if (payload.new.sender === 'admin') {
        showTypingRow(false);
        updateUnreadBadge();
        markMessagesRead(orderId);
      }
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `order_id=eq.${orderId}`
    }, payload => {
      /* Refresh ticks when admin marks our messages as read/delivered */
      const row = document.querySelector(`.msg-row[data-id="${payload.new.id}"]`);
      if (row) {
        const ticksEl = row.querySelector('.msg-ticks');
        if (ticksEl) ticksEl.innerHTML = statusTicksSVG(payload.new.status || 'sent');
      }
    })
    .subscribe();
}

function unsubscribeChat() {
  const sb = getSB();
  if (chatChannel)   { sb.removeChannel(chatChannel);   chatChannel = null; }
  if (typingChannel) { sb.removeChannel(typingChannel); typingChannel = null; }
}

/* ── Send text message (+ optional staged attachment) ─────────────────── */
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const btn   = document.getElementById('chatSendBtn');
  const text  = input.value.trim();

  if (!chatActiveOrderId || !currentUserId) return;
  if (!text && !pendingAttachment) return;

  btn.disabled = true;
  broadcastTyping(false);

  if (pendingAttachment) {
    await uploadAndSendAttachment(text);
    input.value = '';
    input.style.height = 'auto';
    btn.disabled = false;
    return;
  }

  input.value = '';
  input.style.height = 'auto';

  const sb = getSB();
  const { error } = await sb.from('messages').insert({
    order_id:     chatActiveOrderId,
    sender:       'client',
    sender_id:    currentUserId,
    message:      text,
    message_type: 'text',
    status:       'sent'
  });

  btn.disabled = false;
  if (error) {
    console.error('Message send error:', error);
    input.value = text;
    showToast('Message পাঠানো যায়নি। আবার চেষ্টা করুন।', 'error');
  }
}

async function uploadAndSendAttachment(caption) {
  const { file, kind } = pendingAttachment;
  const sb = getSB();
  const ext  = file.name.split('.').pop();
  const path = `chat-attachments/${chatActiveOrderId}/${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`;

  const { error: upErr } = await sb.storage.from(CHAT_BUCKET).upload(path, file, { upsert: true });
  if (upErr) {
    showToast('ফাইল আপলোড হয়নি: ' + upErr.message, 'error');
    return;
  }
  const { data: urlData } = sb.storage.from(CHAT_BUCKET).getPublicUrl(path);

  const { error } = await sb.from('messages').insert({
    order_id:     chatActiveOrderId,
    sender:       'client',
    sender_id:    currentUserId,
    message:      caption || null,
    message_type: kind,
    file_url:     urlData.publicUrl,
    file_name:    file.name,
    file_size:    file.size,
    status:       'sent'
  });

  if (error) {
    showToast('মেসেজ পাঠানো যায়নি: ' + error.message, 'error');
  } else if (kind === 'payment_screenshot') {
    showToast('✅ Payment screenshot পাঠানো হয়েছে!', 'success');
  }

  pendingAttachment = null;
  const preview = document.getElementById('chatAttachPreview');
  preview.style.display = 'none';
  preview.innerHTML = '';
}

/* ── Mark as read ──────────────────────────────────────────────────────── */
async function markMessagesRead(orderId) {
  const sb = getSB();
  await sb
    .from('messages')
    .update({ status: 'read' })
    .eq('order_id', orderId)
    .eq('sender', 'admin')
    .neq('status', 'read');

  updateUnreadBadge();
}

/* ── Unread badge (global) ─────────────────────────────────────────────── */
async function updateUnreadBadge() {
  if (!currentUserId) return;
  const sb = getSB();

  const { data: orders } = await sb
    .from('orders')
    .select('id')
    .eq('client_id', currentUserId);

  if (!orders || !orders.length) return;
  const orderIds = orders.map(o => o.id);

  const { count } = await sb
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('order_id', orderIds)
    .eq('sender', 'admin')
    .neq('status', 'read');

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

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showToast(msg, type = 'info') {
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

    if (typeof window.showPage === 'function') window.showPage('messages');

    const sel = document.getElementById('chatOrderSelect');
    if (sel) {
      sel.value = orderId;
      loadChat(orderId);
    }
  });
});

/* ── Page switch hook — Messages page-এ ঢুকলে init করো ─────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-page="messages"]')?.addEventListener('click', () => {
    setTimeout(() => {
      if (!currentUserId) initChat();
    }, 100);
  });
  document.querySelectorAll('.mbn-item[data-page="messages"]').forEach(el => {
    el.addEventListener('click', () => setTimeout(() => { if (!currentUserId) initChat(); }, 100));
  });

  if (document.getElementById('page-messages')?.classList.contains('active')) {
    initChat();
  }
});

/* Export for dashboard.js */
window.chatModule = { init: initChat, updateBadge: updateUnreadBadge, loadChat };
