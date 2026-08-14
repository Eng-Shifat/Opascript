/* ═══════════════════════════════════════════════════════════════════════
   SCRIPTORA — CHAT MODULE (Client Side)  v3
   Order-based real-time support chat: text, files, images, payment
   screenshots, quick actions, pinned notices, typing indicator,
   admin online/offline presence, read receipts, reply-to, emoji
   reactions, delete message.
   ═══════════════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://hivrmntxpmpwthmjtoem.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';
const CHAT_BUCKET = 'scriptora-files';
const CHAT_FILE_MAX_MB = 15;
const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','🙏'];

function getSB() {
  if (window._sb) return window._sb;
  window._sb = supabase.createClient(SUPA_URL, SUPA_KEY);
  return window._sb;
}

/* ── State ─────────────────────────────────────────────────────────────── */
let chatActiveOrderId = null;
let currentUserId     = null;
let userInitials       = 'U';
let ordersCache        = {};
let messagesById       = {};   /* id -> message row, for reply-quote lookups */
let chatChannel        = null;
let typingChannel      = null;
let presenceChannel    = null;
let adminIsOnline      = false;
let typingHideTimer    = null;
let myTypingTimer      = null;
let iAmTyping          = false;
let pendingAttachment  = null;
let replyTarget        = null; /* message row being replied to */
let openEmojiPickerId  = null;

/* ── Browser notifications (desktop/tab-level) ──────────────────────────── */
function requestNotifyPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function notifyNewMessage(title, body, orderId) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return; /* user is already looking */

  const n = new Notification(title, {
    body,
    icon: 'assets/icon.png',
    tag: `scriptora-order-${orderId}`
  });
  n.onclick = () => {
    window.focus();
    if (typeof window.showPage === 'function') window.showPage('messages');
    const sel = document.getElementById('chatOrderSelect');
    if (sel) { sel.value = orderId; loadChat(orderId); }
    n.close();
  };
}

/* Global listener (independent of which chat is open) — fires a desktop
   notification whenever admin replies on ANY of this client's orders. */
function subscribeGlobalNotifications() {
  const sb = getSB();
  sb.channel('client-global-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new;
      if (msg.sender !== 'admin') return;
      if (!ordersCache[msg.order_id]) return; /* not one of my orders */
      const order = ordersCache[msg.order_id];
      const preview = msg.message || (msg.message_type === 'file' ? '📄 File পাঠিয়েছেন' : '📷 Photo পাঠিয়েছেন');
      notifyNewMessage(`Admin Support — ${order.order_number ? '#' + order.order_number : 'Order'}`, preview, msg.order_id);
    })
    .subscribe();
}

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
  requestNotifyPermission();
  subscribeGlobalNotifications();
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

  /* শুধু paid orders dropdown-এ দেখাবে */
  const paidOrders = orders.filter(o =>
    o.payment_status === 'approved' ||
    o.payment_status === 'paid' ||
    o.payment_status === 'confirmed' ||
    Number(o.advance_paid || 0) > 0
  );

  sel.innerHTML = '<option value="">Order বেছে নিন</option>';
  paidOrders.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = `${o.order_number ? '#' + o.order_number + ' — ' : ''}${o.title || o.service_type || 'Order'}`;
    sel.appendChild(opt);
  });

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
  const attachBtn    = document.getElementById('chatAttachBtn');
  const fileInput    = document.getElementById('chatFileInput');
  const imgOnlyInput = document.getElementById('chatImageOnlyInput');
  const cpnClose     = document.getElementById('cpnClose');
  const crpClose     = document.getElementById('crpClose');

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

  crpClose?.addEventListener('click', clearReplyTarget);

  /* Delegate reply/react/delete clicks + reaction pill clicks + reply-quote scroll */
  document.getElementById('chatBody')?.addEventListener('click', e => {
    const replyBtn  = e.target.closest('[data-act="reply"]');
    const reactBtn  = e.target.closest('[data-act="react"]');
    const delBtn    = e.target.closest('[data-act="delete"]');
    const pill      = e.target.closest('.msg-reaction-pill');
    const quote     = e.target.closest('.msg-reply-quote');
    const emojiOpt  = e.target.closest('.emoji-picker-popup span');

    if (emojiOpt) {
      const msgId = emojiOpt.closest('.msg-row')?.dataset.id;
      if (msgId) toggleReaction(msgId, emojiOpt.textContent);
      closeEmojiPicker();
      return;
    }
    if (replyBtn) {
      const msgId = replyBtn.closest('.msg-row')?.dataset.id;
      if (msgId && messagesById[msgId]) setReplyTarget(messagesById[msgId]);
      return;
    }
    if (reactBtn) {
      const msgId = reactBtn.closest('.msg-row')?.dataset.id;
      if (msgId) openEmojiPicker(msgId, reactBtn);
      return;
    }
    if (delBtn) {
      const msgId = delBtn.closest('.msg-row')?.dataset.id;
      if (msgId) deleteMessage(msgId);
      return;
    }
    if (pill) {
      const msgId = pill.closest('.msg-row')?.dataset.id;
      const emoji = pill.dataset.emoji;
      if (msgId && emoji) toggleReaction(msgId, emoji);
      return;
    }
    if (quote) {
      const targetId = quote.dataset.targetId;
      const targetRow = document.querySelector(`.msg-row[data-id="${targetId}"]`);
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetRow.classList.add('msg-highlight');
        setTimeout(() => targetRow.classList.remove('msg-highlight'), 1200);
      }
      return;
    }
    /* clicking elsewhere closes any open emoji picker */
    if (!e.target.closest('.emoji-picker-popup')) closeEmojiPicker();
  });
}

/* ── Reply-to ──────────────────────────────────────────────────────────── */
function setReplyTarget(msg) {
  replyTarget = msg;
  const bar = document.getElementById('chatReplyPreview');
  const txt = document.getElementById('crpText');
  const label = bar.querySelector('.crp-label');
  label.textContent = msg.sender === 'client' ? 'নিজেকে Reply করছেন' : 'Admin-কে Reply করছেন';
  txt.textContent = msg.message || (msg.message_type === 'file' ? '📄 File' : '📷 Photo');
  bar.style.display = 'flex';
  document.getElementById('chatInput')?.focus();
}
function clearReplyTarget() {
  replyTarget = null;
  document.getElementById('chatReplyPreview').style.display = 'none';
}

/* ── Emoji reactions ───────────────────────────────────────────────────── */
function openEmojiPicker(msgId, anchorBtn) {
  closeEmojiPicker();
  const actionsBar = anchorBtn.closest('.msg-actions');
  const popup = document.createElement('div');
  popup.className = 'emoji-picker-popup';
  popup.innerHTML = REACTION_EMOJIS.map(e => `<span>${e}</span>`).join('');
  actionsBar.style.position = 'relative';
  actionsBar.appendChild(popup);
  openEmojiPickerId = msgId;
}
function closeEmojiPicker() {
  document.querySelectorAll('.emoji-picker-popup').forEach(p => p.remove());
  openEmojiPickerId = null;
}

async function toggleReaction(msgId, emoji) {
  const msg = messagesById[msgId];
  if (!msg || !currentUserId) return;
  const reactions = { ...(msg.reactions || {}) };
  const list = new Set(reactions[emoji] || []);
  if (list.has(currentUserId)) list.delete(currentUserId); else list.add(currentUserId);
  if (list.size) reactions[emoji] = [...list]; else delete reactions[emoji];

  const sb = getSB();
  const { error } = await sb.from('messages').update({ reactions }).eq('id', msgId);
  if (error) { console.error(error); return; }

  msg.reactions = reactions;
  const row = document.querySelector(`.msg-row[data-id="${msgId}"]`);
  if (row) {
    const wrap = row.querySelector('.msg-wrap');
    let reactEl = wrap.querySelector('.msg-reactions');
    const newHtml = buildReactionsHtml(reactions);
    if (reactEl) reactEl.outerHTML = newHtml || '';
    else if (newHtml) wrap.insertAdjacentHTML('beforeend', newHtml);
  }
}

function buildReactionsHtml(reactions) {
  const entries = Object.entries(reactions || {}).filter(([, users]) => users && users.length);
  if (!entries.length) return '';
  const pills = entries.map(([emoji, users]) => {
    const mine = users.includes(currentUserId) ? 'mine' : '';
    return `<span class="msg-reaction-pill ${mine}" data-emoji="${emoji}">${emoji} ${users.length}</span>`;
  }).join('');
  return `<div class="msg-reactions">${pills}</div>`;
}

/* ── Delete message (soft delete) ─────────────────────────────────────── */
async function deleteMessage(msgId) {
  const msg = messagesById[msgId];
  if (!msg || msg.sender !== 'client') return; /* only delete own messages */
  if (!confirm('এই message delete করতে চান?')) return;

  const sb = getSB();
  const { error } = await sb.from('messages').update({ is_deleted: true }).eq('id', msgId);
  if (error) { showToast('Delete করা যায়নি', 'error'); return; }

  msg.is_deleted = true;
  const row = document.querySelector(`.msg-row[data-id="${msgId}"]`);
  if (row) row.replaceWith(buildBubble(msg));
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

  const paid = Number(order.advance_paid || 0);
  const paidEl = document.getElementById('cosPaid');
  if (paidEl) {
    paidEl.textContent = `৳${paid.toLocaleString()}`;
    paidEl.className = paid > 0 ? 'cos-value cos-paid' : 'cos-value';
  }
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
      if (payload.payload.sender === 'client') return;
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
/* ── Payment blocked notice ──────────────────────────────────────────── */
function showPaymentBlockedNotice() {
  const body = document.getElementById('chatBody');
  if (!body) return;
  /* Already showing notice? */
  if (document.getElementById('payBlockedNotice')) return;
  const notice = document.createElement('div');
  notice.id = 'payBlockedNotice';
  notice.style.cssText = 'margin:12px 16px;padding:12px 14px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;font-size:12.5px;color:#fbbf24;text-align:center;';
  notice.innerHTML = '🔒 Message করতে হলে আগে payment সম্পন্ন করুন।';
  body.appendChild(notice);
  setTimeout(() => notice.remove(), 3500);
}

/* ── Input lock for unpaid orders ───────────────────────────────────── */
function updateChatInputLock(orderId) {
  const activeOrder = ordersCache[orderId];
  const isPaid = activeOrder && (
    activeOrder.payment_status === 'approved' ||
    activeOrder.payment_status === 'paid' ||
    activeOrder.payment_status === 'confirmed' ||
    Number(activeOrder.advance_paid || 0) > 0
  );
  const input   = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const attachBtn = document.getElementById('chatAttachBtn');
  if (!input) return;

  if (activeOrder && !isPaid) {
    input.disabled    = true;
    input.placeholder = '🔒 Payment করুন — তারপর message করতে পারবেন';
    if (sendBtn)   sendBtn.disabled  = true;
    if (attachBtn) attachBtn.disabled = true;
    input.style.opacity = '0.5';
    if (sendBtn)   sendBtn.style.opacity = '0.4';
  } else {
    input.disabled    = false;
    input.placeholder = 'Type your message...';
    if (sendBtn)   sendBtn.disabled  = false;
    if (attachBtn) attachBtn.disabled = false;
    input.style.opacity = '';
    if (sendBtn)   sendBtn.style.opacity = '';
  }
}

async function loadChat(orderId) {
  chatActiveOrderId = orderId;
  showChatBox(orderId);

  const body = document.getElementById('chatBody');
  body.innerHTML = '<div class="chat-loading"><div class="spinner"></div></div>';

  const sb = getSB();
  const { data: msgs } = await sb
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  messagesById = {};
  (msgs || []).forEach(m => messagesById[m.id] = m);

  renderMessages(msgs || []);
  renderPinnedNotice(msgs || []);
  subscribeToChat(orderId);
  subscribeTyping(orderId);
  markMessagesRead(orderId);
  updateChatInputLock(orderId);
}

/* ── Pinned notice banner ──────────────────────────────────────────────── */
function renderPinnedNotice(msgs) {
  const banner = document.getElementById('chatPinnedNotice');
  const pinned = [...msgs].reverse().find(m => m.is_pinned && !m.is_deleted);
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

  let bubbleHtml = '';
  const replyQuoteHtml = buildReplyQuoteHtml(msg);

  if (msg.is_deleted) {
    bubbleHtml = `<div class="msg-bubble msg-deleted">🚫 এই message-টি delete করা হয়েছে</div>`;
  } else if (msg.message_type === 'image' || msg.message_type === 'payment_screenshot') {
    let inner = replyQuoteHtml;
    if (msg.message_type === 'payment_screenshot') inner += `<div class="msg-file-tag">💳 Payment Screenshot</div>`;
    inner += `<a href="${msg.file_url}" target="_blank" rel="noopener"><img src="${msg.file_url}" alt="attachment" class="msg-img" loading="lazy"/></a>`;
    if (msg.message) inner += `<div class="msg-caption">${escHtml(msg.message)}</div>`;
    bubbleHtml = `<div class="msg-bubble msg-media-bubble">${inner}</div>`;
  } else if (msg.message_type === 'file') {
    bubbleHtml = `<div class="msg-bubble msg-file-bubble">${replyQuoteHtml}
      <a href="${msg.file_url}" target="_blank" rel="noopener" class="msg-file-link">
        <span class="msg-file-icon">📄</span>
        <span class="msg-file-name">${escHtml(msg.file_name || 'File')}</span>
        <span class="msg-file-download">⬇</span>
      </a></div>`;
  } else {
    const cls = msg.message_type === 'quick_action' ? 'msg-bubble msg-quick-action' : 'msg-bubble';
    bubbleHtml = `<div class="${cls}">${replyQuoteHtml}${escHtml(msg.message || '')}</div>`;
  }

  wrap.innerHTML = bubbleHtml;

  const t = document.createElement('div');
  t.className = 'msg-time';
  t.innerHTML = `<span>${time}</span>`;
  if (isClient) {
    const ticks = document.createElement('span');
    ticks.className = 'msg-ticks';
    ticks.innerHTML = statusTicksSVG(msg.status || 'sent');
    t.appendChild(ticks);
  }
  wrap.appendChild(t);

  if (!msg.is_deleted) {
    const reactHtml = buildReactionsHtml(msg.reactions);
    if (reactHtml) wrap.insertAdjacentHTML('beforeend', reactHtml);
  }

  row.appendChild(av);
  row.appendChild(wrap);
  if (!msg.is_deleted) row.appendChild(buildActionsBar(msg));

  return row;
}

/* Hover action bar: Reply + React for everyone, + Delete only on your own (client) messages */
function buildActionsBar(msg) {
  const div = document.createElement('div');
  div.className = 'msg-actions';
  let html = `<button class="msg-action-btn" data-act="reply" title="Reply">↩</button>
    <button class="msg-action-btn" data-act="react" title="React">😊</button>`;
  if (msg.sender === 'client') html += `<button class="msg-action-btn" data-act="delete" title="Delete">🗑</button>`;
  div.innerHTML = html;
  return div;
}

function buildReplyQuoteHtml(msg) {
  if (!msg.reply_to_id) return '';
  const parent = messagesById[msg.reply_to_id];
  if (!parent) return '';
  const senderLabel = parent.sender === 'client' ? 'আপনি' : 'Admin';
  const snippet = parent.is_deleted
    ? '🚫 Message deleted'
    : (parent.message || (parent.message_type === 'file' ? '📄 File' : '📷 Photo'));
  return `<div class="msg-reply-quote" data-target-id="${parent.id}">
    <span class="rq-sender">${senderLabel}</span>${escHtml(snippet.slice(0, 80))}
  </div>`;
}

/* ── Realtime subscription ─────────────────────────────────────────────── */
function subscribeToChat(orderId) {
  unsubscribeChat();
  const sb = getSB();

  chatChannel = sb
    .channel(`messages-order-${orderId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}`
    }, payload => {
      messagesById[payload.new.id] = payload.new;
      const body = document.getElementById('chatBody');
      const empty = body.querySelector('.chat-empty');
      if (empty) empty.remove();

      body.appendChild(buildBubble(payload.new));
      scrollToBottom();

      if (payload.new.is_pinned) renderPinnedNotice(Object.values(messagesById));

      if (payload.new.sender === 'admin') {
        showTypingRow(false);
        updateUnreadBadge();
        markMessagesRead(orderId);
      }
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}`
    }, payload => {
      messagesById[payload.new.id] = payload.new;
      const row = document.querySelector(`.msg-row[data-id="${payload.new.id}"]`);
      if (row) {
        if (payload.new.is_deleted || payload.new.reactions) {
          row.replaceWith(buildBubble(payload.new));
        } else {
          const ticksEl = row.querySelector('.msg-ticks');
          if (ticksEl) ticksEl.innerHTML = statusTicksSVG(payload.new.status || 'sent');
        }
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

  /* Unpaid order-এ message block করো */
  const activeOrder = ordersCache[chatActiveOrderId];
  const isPaid = activeOrder && (
    activeOrder.payment_status === 'approved' ||
    activeOrder.payment_status === 'paid' ||
    activeOrder.payment_status === 'confirmed' ||
    Number(activeOrder.advance_paid || 0) > 0
  );
  if (activeOrder && !isPaid) {
    showPaymentBlockedNotice();
    return;
  }

  btn.disabled = true;
  broadcastTyping(false);

  const replyToId = replyTarget ? replyTarget.id : null;

  if (pendingAttachment) {
    await uploadAndSendAttachment(text, replyToId);
    input.value = ''; input.style.height = 'auto';
    clearReplyTarget();
    btn.disabled = false;
    return;
  }

  input.value = ''; input.style.height = 'auto';
  clearReplyTarget();

  const sb = getSB();
  const { error } = await sb.from('messages').insert({
    order_id:     chatActiveOrderId,
    sender:       'client',
    sender_id:    currentUserId,
    message:      text,
    message_type: 'text',
    reply_to_id:  replyToId,
    status:       'sent'
  });

  btn.disabled = false;
  if (error) {
    console.error('Message send error:', error);
    input.value = text;
    showToast('Message পাঠানো যায়নি। আবার চেষ্টা করুন।', 'error');
  }
}

async function uploadAndSendAttachment(caption, replyToId) {
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
    reply_to_id:  replyToId || null,
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

  const { data: orders } = await sb.from('orders').select('id').eq('client_id', currentUserId);
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

  if (count > 0) { badge.textContent = count; badge.style.display = ''; }
  else badge.style.display = 'none';
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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('goChatBtn')?.addEventListener('click', () => {
    const orderId = document.getElementById('goChatBtn')?.dataset.orderId;
    if (!orderId) return;
    if (typeof window.showPage === 'function') window.showPage('messages');
    const sel = document.getElementById('chatOrderSelect');
    if (sel) { sel.value = orderId; loadChat(orderId); }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-page="messages"]')?.addEventListener('click', () => {
    setTimeout(() => { if (!currentUserId) initChat(); }, 100);
  });
  document.querySelectorAll('.mbn-item[data-page="messages"]').forEach(el => {
    el.addEventListener('click', () => setTimeout(() => { if (!currentUserId) initChat(); }, 100));
  });
  if (document.getElementById('page-messages')?.classList.contains('active')) {
    initChat();
  }
});

window.chatModule = { init: initChat, updateBadge: updateUnreadBadge, loadChat };
