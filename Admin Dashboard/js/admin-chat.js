/* ── ADMIN CHAT — admin-chat.js  v3 (unified schema, presence, typing, files, reply/react/delete) ── */

const sb = window.scriptoraSupabase;
const CHAT_BUCKET = 'scriptora-files';
const CHAT_FILE_MAX_MB = 15;
const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','🙏'];

/* ── State ─────────────────────────────────────────────────────────────── */
let conversations     = [];
let currentOrderId    = null;
let adminId           = null;
let chatChannel       = null;
let globalChannel     = null;
let typingChannel     = null;
let presenceChannel   = null;
let myTypingTimer     = null;
let iAmTyping         = false;
let pendingAttachment = null;
let messagesById      = {};
let replyTarget       = null;

/* ── Browser notifications (desktop/tab-level) ──────────────────────────── */
function requestNotifyPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function notifyNewMessage(title, body, orderId) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return;

  const n = new Notification(title, { body, icon: '../Client Dashboard/assets/icon.png', tag: `scriptora-admin-order-${orderId}` });
  n.onclick = () => {
    window.focus();
    openConv(orderId);
    n.close();
  };
}

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
  trackAdminPresence();
  bindEvents();
  requestNotifyPermission();

  window.addEventListener('beforeunload', () => {
    if (presenceChannel) presenceChannel.untrack();
  });

  const wantedOrderId = new URLSearchParams(window.location.search).get('order');
  if (wantedOrderId) openConv(wantedOrderId);
}

function trackAdminPresence() {
  presenceChannel = sb.channel('presence-admin-status', { config: { presence: { key: adminId } } });
  presenceChannel.subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({ role: 'admin', online_at: new Date().toISOString() });
    }
  });
}

/* ── Load all orders that have messages ────────────────────────────────── */
async function loadConversations() {
  const { data: orders } = await sb
    .from('orders')
    .select('*')
    .order('order_date', { ascending: false });

  if (!orders || !orders.length) {
    document.getElementById('convList').innerHTML = '<div class="conv-empty">কোনো order নেই</div>';
    return;
  }

  const { data: msgs } = await sb
    .from('messages')
    .select('order_id, message, message_type, sender, status, is_deleted, created_at')
    .order('created_at', { ascending: false });

  const clientIds = [...new Set(orders.map(o => o.client_id).filter(Boolean))];
  let profileMap = {};
  if (clientIds.length) {
    const { data: clients } = await sb
      .from('clients')
      .select('id, name, email, phone')
      .in('id', clientIds);
    (clients || []).forEach(c => profileMap[c.id] = c);
  }

  const msgMap    = {};
  const unreadMap = {};

  (msgs || []).forEach(m => {
    if (!msgMap[m.order_id]) msgMap[m.order_id] = m;
    if (m.sender === 'client' && m.status !== 'read') {
      unreadMap[m.order_id] = (unreadMap[m.order_id] || 0) + 1;
    }
  });

  conversations = orders
    .filter(o => msgMap[o.id])
    .map(o => ({
      ...o,
      latestMsg: msgMap[o.id],
      unread:    unreadMap[o.id] || 0,
      profile:   profileMap[o.client_id] || {}
    }))
    .sort((a, b) => new Date(b.latestMsg.created_at) - new Date(a.latestMsg.created_at));

  renderConvList(conversations);
  updateGlobalBadge(conversations.reduce((s, c) => s + c.unread, 0));
}

/* ── Render conversation list ──────────────────────────────────────────── */
function renderConvList(list) {
  const el = document.getElementById('convList');
  

  if (!list.length) {
    el.innerHTML = '<div class="conv-empty">কোনো conversation নেই। Client message করলে এখানে দেখা যাবে।</div>';
    return;
  }

  el.innerHTML = list.map(c => {
    const p    = c.profile;
    const name = p.name || p.email || 'Unknown Client';
    const initials = name.substring(0, 2).toUpperCase();
    const title    = c.title || c.service_type || 'Order';
    const lm = c.latestMsg;
    const preview  = previewText(lm);
    const time     = formatTime(lm?.created_at);
    const active   = currentOrderId === c.id ? 'active' : '';
    const unreadCls = c.unread > 0 ? 'unread' : '';

    return `
    <div class="conv-item ${active} ${unreadCls}" data-id="${c.id}" onclick="openConv('${c.id}')">
      <div class="conv-av">${initials}</div>
      <div class="conv-info">
        <div class="conv-name">${escH(name)}</div>
        <div class="conv-order-title">${escH(title)}</div>
        <div class="conv-preview">${lm?.sender === 'admin' ? 'আপনি: ' : ''}${escH(preview)}</div>
      </div>
      <div class="conv-meta">
        <span class="conv-time">${time}</span>
        ${c.unread > 0 ? `<span class="conv-unread-dot"></span>` : ''}
      </div>
    </div>`;
  }).join('');
}

function previewText(m) {
  if (!m) return '';
  if (m.is_deleted) return '🚫 Message deleted';
  if (m.message_type === 'image')              return '📷 Photo';
  if (m.message_type === 'payment_screenshot')  return '💳 Payment Screenshot';
  if (m.message_type === 'file')                return '📄 File';
  return m.message || '';
}

/* ── Open a conversation ───────────────────────────────────────────────── */
async function openConv(orderId) {
  currentOrderId = orderId;
  clearReplyTarget();

  document.querySelectorAll('.conv-item').forEach(i => i.classList.remove('active'));
  document.querySelector(`.conv-item[data-id="${orderId}"]`)?.classList.add('active');
  document.getElementById('chatArea').classList.add('mobile-open');
  document.getElementById('chatEmptyState').style.display = 'none';
  document.getElementById('adminChatBox').style.display = 'flex';

  const conv = conversations.find(c => c.id === orderId);
  if (conv) {
    const p    = conv.profile;
    const name = p.name || p.email || 'Unknown';
    document.getElementById('clientAv').textContent   = name.substring(0, 2).toUpperCase();
    document.getElementById('clientName').textContent  = name;
    document.getElementById('chatOrderMeta').textContent = conv.title || conv.service_type || 'Order';

    const badge = document.getElementById('chatStatusBadge');
    if (badge) { badge.textContent = conv.status || ''; badge.className = `order-status-badge ${conv.status || ''}`; }

    /* ── Order summary banner (deadline / due / paid) ─────────────── */
    const orderNo = conv.order_number
      ? `#${conv.order_number}`
      : `#${String(orderId).slice(0,8).toUpperCase()}`; /* fallback if order_number missing */
    const orderNoEl = document.getElementById('adminCosOrderNo');
    if (orderNoEl) orderNoEl.textContent = orderNo;

    const cosTitleEl = document.getElementById('adminCosTitle');
    if (cosTitleEl) cosTitleEl.textContent = conv.title || conv.service_type || '';

    const statusBadgeEl = document.getElementById('adminCosStatusBadge');
    if (statusBadgeEl) {
      statusBadgeEl.textContent = conv.status || '—';
      statusBadgeEl.className = `order-status-badge ${conv.status || ''}`;
    }

    const deadlineEl = document.getElementById('adminCosDeadline');
    if (deadlineEl) {
      deadlineEl.textContent = conv.deadline
        ? new Date(conv.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';
    }

    const dueEl = document.getElementById('adminCosDue');
    if (dueEl) {
      const due = Number(conv.due_amount || 0);
      dueEl.textContent = `৳${due.toLocaleString()}`;
      dueEl.className = due <= 0 ? 'cos-value cos-paid' : 'cos-value cos-due';
    }

    const paidEl = document.getElementById('adminCosPaid');
    if (paidEl) {
      const paid = Number(conv.advance_paid || 0);
      paidEl.textContent = `৳${paid.toLocaleString()}`;
      paidEl.className = paid > 0 ? 'cos-value cos-paid' : 'cos-value';
    }

    const summaryEl = document.getElementById('adminChatOrderSummary');
    if (summaryEl) summaryEl.style.display = 'block';
  }

  const body = document.getElementById('adminChatBody');
  body.innerHTML = '<div class="chat-loading-wrap"><div class="spinner"></div></div>';

  const { data: msgs } = await sb
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  messagesById = {};
  (msgs || []).forEach(m => messagesById[m.id] = m);

  renderMessages(msgs || [], conv?.profile);
  subscribeToOrder(orderId);
  subscribeTypingChannel(orderId);

  await sb.from('messages')
    .update({ status: 'read' })
    .eq('order_id', orderId)
    .eq('sender', 'client')
    .neq('status', 'read');

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
    const d       = new Date(msg.created_at);
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

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

/* ── Ticks / reactions / reply-quote helpers ─────────────────────────────── */
function statusTicksSVG(status) {
  if (status === 'read') {
    return `<svg class="tick tick-read" width="15" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L4.5 9L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5.5L9 9L15.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (status === 'delivered') {
    return `<svg class="tick tick-delivered" width="15" height="10" viewBox="0 0 16 11" fill="none"><path d="M1 5.5L4.5 9L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 5.5L9 9L15.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return `<svg class="tick tick-sent" width="12" height="10" viewBox="0 0 12 11" fill="none"><path d="M1 5.5L4.5 9L11 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function buildReactionsHtml(reactions) {
  const entries = Object.entries(reactions || {}).filter(([, users]) => users && users.length);
  if (!entries.length) return '';
  const pills = entries.map(([emoji, users]) => {
    const mine = users.includes(adminId) ? 'mine' : '';
    return `<span class="msg-reaction-pill ${mine}" data-emoji="${emoji}">${emoji} ${users.length}</span>`;
  }).join('');
  return `<div class="msg-reactions">${pills}</div>`;
}

function buildReplyQuoteHtml(msg, clientInitials) {
  if (!msg.reply_to_id) return '';
  const parent = messagesById[msg.reply_to_id];
  if (!parent) return '';
  const senderLabel = parent.sender === 'admin' ? 'আপনি' : (clientInitials ? 'Client' : 'Client');
  const snippet = parent.is_deleted
    ? '🚫 Message deleted'
    : (parent.message || (parent.message_type === 'file' ? '📄 File' : '📷 Photo'));
  return `<div class="msg-reply-quote" data-target-id="${parent.id}">
    <span class="rq-sender">${senderLabel}</span>${escH(snippet.slice(0, 80))}
  </div>`;
}

/* ── Build bubble ──────────────────────────────────────────────────────── */
function buildBubble(msg, clientInitials = 'C') {
  const isAdmin = msg.sender === 'admin';
  const time    = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const row = document.createElement('div');
  row.className = `msg-row ${isAdmin ? 'admin' : 'client'}`;
  row.dataset.id = msg.id;

  const av = document.createElement('div');
  av.className   = `msg-av ${isAdmin ? 'admin-av' : 'client-av'}`;
  av.textContent = isAdmin ? 'SA' : clientInitials;

  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';

  const replyQuoteHtml = buildReplyQuoteHtml(msg, clientInitials);
  let bubbleHtml = '';

  if (msg.is_deleted) {
    bubbleHtml = `<div class="msg-bubble msg-deleted">🚫 এই message-টি delete করা হয়েছে</div>`;
  } else if (msg.message_type === 'image' || msg.message_type === 'payment_screenshot') {
    let inner = replyQuoteHtml;
    if (msg.message_type === 'payment_screenshot') inner += `<div class="msg-file-tag">💳 Payment Screenshot</div>`;
    inner += `<a href="${msg.file_url}" target="_blank" rel="noopener"><img src="${msg.file_url}" class="msg-img" loading="lazy"/></a>`;
    if (msg.message) inner += `<div class="msg-caption">${escH(msg.message)}</div>`;
    bubbleHtml = `<div class="msg-bubble msg-media-bubble">${inner}</div>`;
  } else if (msg.message_type === 'file') {
    bubbleHtml = `<div class="msg-bubble msg-file-bubble">${replyQuoteHtml}<a href="${msg.file_url}" target="_blank" rel="noopener" class="msg-file-link"><span class="msg-file-icon">📄</span><span class="msg-file-name">${escH(msg.file_name || 'File')}</span><span class="msg-file-download">⬇</span></a></div>`;
  } else {
    const cls = msg.is_pinned ? 'msg-bubble msg-notice-bubble' : 'msg-bubble';
    bubbleHtml = `<div class="${cls}">${replyQuoteHtml}${escH(msg.message || '')}</div>`;
  }

  wrap.innerHTML = bubbleHtml;

  const t = document.createElement('div');
  t.className   = 'msg-time';
  t.innerHTML   = `<span>${time}</span>`;
  if (isAdmin) {
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

function buildActionsBar(msg) {
  const div = document.createElement('div');
  div.className = 'msg-actions';
  let html = `<button class="msg-action-btn" data-act="reply" title="Reply">↩</button>
    <button class="msg-action-btn" data-act="react" title="React">😊</button>`;
  if (msg.sender === 'admin') html += `<button class="msg-action-btn" data-act="delete" title="Delete">🗑</button>`;
  div.innerHTML = html;
  return div;
}

/* ── Reply-to ──────────────────────────────────────────────────────────── */
function setReplyTarget(msg) {
  replyTarget = msg;
  const bar = document.getElementById('adminReplyPreview');
  const txt = document.getElementById('adminCrpText');
  bar.querySelector('.crp-label').textContent = msg.sender === 'admin' ? 'নিজেকে Reply করছেন' : 'Client-কে Reply করছেন';
  txt.textContent = msg.message || (msg.message_type === 'file' ? '📄 File' : '📷 Photo');
  bar.style.display = 'flex';
  document.getElementById('adminChatInput')?.focus();
}
function clearReplyTarget() {
  replyTarget = null;
  const bar = document.getElementById('adminReplyPreview');
  if (bar) bar.style.display = 'none';
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
}
function closeEmojiPicker() {
  document.querySelectorAll('.emoji-picker-popup').forEach(p => p.remove());
}

async function toggleReaction(msgId, emoji) {
  const msg = messagesById[msgId];
  if (!msg || !adminId) return;
  const reactions = { ...(msg.reactions || {}) };
  const list = new Set(reactions[emoji] || []);
  if (list.has(adminId)) list.delete(adminId); else list.add(adminId);
  if (list.size) reactions[emoji] = [...list]; else delete reactions[emoji];

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

/* ── Delete message (soft delete, admin's own only) ─────────────────────── */
async function deleteMessage(msgId) {
  const msg = messagesById[msgId];
  if (!msg || msg.sender !== 'admin') return;
  if (!confirm('এই message delete করতে চান?')) return;

  const { error } = await sb.from('messages').update({ is_deleted: true }).eq('id', msgId);
  if (error) { showToast('Delete করা যায়নি'); return; }

  msg.is_deleted = true;
  const conv = conversations.find(c => c.id === currentOrderId);
  const row = document.querySelector(`.msg-row[data-id="${msgId}"]`);
  if (row) row.replaceWith(buildBubble(msg, (conv?.profile?.name || 'C').substring(0,2).toUpperCase()));
}

/* ── Realtime: one order ───────────────────────────────────────────────── */
function subscribeToOrder(orderId) {
  if (chatChannel) sb.removeChannel(chatChannel);

  chatChannel = sb
    .channel(`admin-chat-${orderId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}`
    }, payload => {
      messagesById[payload.new.id] = payload.new;
      const body  = document.getElementById('adminChatBody');
      const empty = body.querySelector('.chat-body-empty');
      if (empty) empty.remove();

      const conv  = conversations.find(c => c.id === orderId);
      const init  = (conv?.profile?.name || 'C').substring(0, 2).toUpperCase();
      body.appendChild(buildBubble(payload.new, init));
      scrollToBottom();

      if (payload.new.sender === 'client') {
        sb.from('messages').update({ status: 'read' }).eq('id', payload.new.id);
      }
      updateConvPreview(orderId, payload.new);
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}`
    }, payload => {
      messagesById[payload.new.id] = payload.new;
      const row = document.querySelector(`.msg-row[data-id="${payload.new.id}"]`);
      if (row) {
        if (payload.new.is_deleted || payload.new.reactions) {
          const conv = conversations.find(c => c.id === orderId);
          const init = (conv?.profile?.name || 'C').substring(0, 2).toUpperCase();
          row.replaceWith(buildBubble(payload.new, init));
        } else {
          const t = row.querySelector('.msg-ticks');
          if (t) t.innerHTML = statusTicksSVG(payload.new.status || 'sent');
        }
      }
    })
    .subscribe();
}

function subscribeTypingChannel(orderId) {
  typingChannel = sb.channel(`typing-order-${orderId}`);
  typingChannel.subscribe();
}
function broadcastTyping(isTyping) {
  if (!typingChannel || !currentOrderId) return;
  if (isTyping === iAmTyping) { if (isTyping) resetMyTypingTimer(); return; }
  iAmTyping = isTyping;
  typingChannel.send({ type: 'broadcast', event: 'typing', payload: { sender: 'admin', typing: isTyping } });
  if (isTyping) resetMyTypingTimer();
}
function resetMyTypingTimer() {
  clearTimeout(myTypingTimer);
  myTypingTimer = setTimeout(() => broadcastTyping(false), 2500);
}

function subscribeGlobal() {
  globalChannel = sb
    .channel('admin-all-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new;
      if (msg.sender === 'client') {
        const c0 = conversations.find(x => x.id === msg.order_id);
        const name = c0?.profile?.name || c0?.profile?.email || 'Client';
        const preview = msg.message || (msg.message_type === 'file' ? '📄 File পাঠিয়েছেন' : '📷 Photo পাঠিয়েছেন');
        notifyNewMessage(name, preview, msg.order_id);
      }
      if (msg.sender === 'client' && msg.order_id !== currentOrderId) {
        const c = conversations.find(x => x.id === msg.order_id);
        if (c) {
          c.unread++;
          c.latestMsg = msg;
          conversations.sort((a, b) => new Date(b.latestMsg.created_at) - new Date(a.latestMsg.created_at));
          renderConvList(conversations);
          updateGlobalBadge(conversations.reduce((s, c) => s + c.unread, 0));
        } else {
          loadConversations();
        }
      }
    })
    .subscribe();
}

/* ── Attach + send ─────────────────────────────────────────────────────── */
function stageAttachment(file, kind) {
  if (file.size > CHAT_FILE_MAX_MB * 1024 * 1024) {
    showToast(`ফাইল সাইজ ${CHAT_FILE_MAX_MB}MB এর বেশি হতে পারবে না।`);
    return;
  }
  pendingAttachment = { file, kind };
  const preview = document.getElementById('adminAttachPreview');
  if (!preview) return;
  preview.style.display = 'flex';
  preview.innerHTML = `<div class="cap-info"><span>📎 ${escH(file.name)}</span></div><button class="cap-remove" id="adminCapRemove">&times;</button>`;
  document.getElementById('adminCapRemove').addEventListener('click', () => {
    pendingAttachment = null;
    preview.style.display = 'none';
    preview.innerHTML = '';
  });
}

async function uploadAndSendAttachment(caption, replyToId) {
  const { file, kind } = pendingAttachment;
  const ext  = file.name.split('.').pop();
  const path = `chat-attachments/${currentOrderId}/${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`;

  const { error: upErr } = await sb.storage.from(CHAT_BUCKET).upload(path, file, { upsert: true });
  if (upErr) { showToast('ফাইল আপলোড হয়নি: ' + upErr.message); return; }
  const { data: urlData } = sb.storage.from(CHAT_BUCKET).getPublicUrl(path);

  const { error } = await sb.from('messages').insert({
    order_id:     currentOrderId,
    sender:       'admin',
    sender_id:    adminId,
    message:      caption || null,
    message_type: kind,
    reply_to_id:  replyToId || null,
    file_url:     urlData.publicUrl,
    file_name:    file.name,
    file_size:    file.size,
    status:       'sent'
  });
  if (error) showToast('মেসেজ পাঠানো যায়নি: ' + error.message);

  pendingAttachment = null;
  const preview = document.getElementById('adminAttachPreview');
  if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
}

/* ── Send reply (text / attachment / pinned notice) ─────────────────────── */
async function sendReply(pinAsNotice = false) {
  const input = document.getElementById('adminChatInput');
  const btn   = document.getElementById('adminSendBtn');
  const text  = input.value.trim();

  if (!currentOrderId) return;
  if (!text && !pendingAttachment) return;

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

  const { error } = await sb.from('messages').insert({
    order_id:   currentOrderId,
    sender:     'admin',
    sender_id:  adminId,
    message:    text,
    message_type: 'text',
    reply_to_id: replyToId,
    is_pinned:  !!pinAsNotice,
    status:     'sent'
  });

  btn.disabled = false;
  if (error) {
    input.value = text;
    showToast('Message পাঠানো যায়নি: ' + error.message);
    console.error(error);
  } else if (pinAsNotice) {
    showToast('📌 Notice pin করা হয়েছে — client-এর chat-এ উপরে দেখাবে।');
  }
}

/* ── Update conv preview ───────────────────────────────────────────────── */
function updateConvPreview(orderId, msg) {
  const item = document.querySelector(`.conv-item[data-id="${orderId}"]`);
  if (!item) return;
  const prev = item.querySelector('.conv-preview');
  if (prev) prev.textContent = msg.sender === 'admin' ? `আপনি: ${previewText(msg)}` : previewText(msg);
  const time = item.querySelector('.conv-time');
  if (time) time.textContent = formatTime(msg.created_at);
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
  document.getElementById('adminSendBtn')?.addEventListener('click', () => sendReply(false));
  document.getElementById('adminPinBtn')?.addEventListener('click', () => sendReply(true));

  document.getElementById('adminChatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(false); }
  });

  document.getElementById('adminChatInput')?.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    broadcastTyping(this.value.length > 0);
  });
  document.getElementById('adminChatInput')?.addEventListener('blur', () => broadcastTyping(false));

  document.getElementById('adminAttachBtn')?.addEventListener('click', () => document.getElementById('adminFileInput')?.click());
  document.getElementById('adminFileInput')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) stageAttachment(file, file.type.startsWith('image/') ? 'image' : 'file');
    e.target.value = '';
  });

  document.getElementById('adminCrpClose')?.addEventListener('click', clearReplyTarget);

  document.getElementById('convSearch')?.addEventListener('input', e => filterConversations(e.target.value));

  document.getElementById('backMobileBtn')?.addEventListener('click', () => {
    document.getElementById('chatArea').classList.remove('mobile-open');
  });

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (presenceChannel) await presenceChannel.untrack();
    await sb.auth.signOut();
    window.location.href = 'admin.html';
  });

  /* Delegate reply/react/delete + reaction pill + reply-quote-scroll clicks */
  document.getElementById('adminChatBody')?.addEventListener('click', e => {
    const replyBtn = e.target.closest('[data-act="reply"]');
    const reactBtn = e.target.closest('[data-act="react"]');
    const delBtn   = e.target.closest('[data-act="delete"]');
    const pill     = e.target.closest('.msg-reaction-pill');
    const quote    = e.target.closest('.msg-reply-quote');
    const emojiOpt = e.target.closest('.emoji-picker-popup span');

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
    if (!e.target.closest('.emoji-picker-popup')) closeEmojiPicker();
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
  if (diff === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'গতকাল';
  if (diff < 7)  return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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

document.addEventListener('DOMContentLoaded', init);
