/* ── ADMIN WEBSITE CHATS — admin-website-chats.js v1 ──────────────────────
   Website chatbot (shared/chatWidget.js) leads/messages এখন এখান থেকে
   দেখা ও reply করা যাবে।

   Tables used:
     - website_chat_leads    (id, name, email, department, client_id,
                               page_source, status, created_at)
     - website_chat_messages (id, lead_id, sender, message, created_at)
       sender values: 'visitor' | 'bot' | 'admin'
─────────────────────────────────────────────────────────────────────── */

const sb = window.scriptoraSupabase;

/* ── State ─────────────────────────────────────────────────────────────── */
let leads          = [];
let currentLeadId  = null;
let adminId        = null;
let leadChannel     = null;   // realtime: messages inside the currently open lead
let globalChannel   = null;   // realtime: any new lead / message (for list + badge)
let activeFilter    = 'all';  // all | open | closed
let openedThisSession = new Set(); // leads admin has opened this session (clears unread dot locally)
let resolveActionBusy = false; // guards against double-click while a resolve/reopen request is in flight

/* ── Init ──────────────────────────────────────────────────────────────── */
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session || session.user.email.toLowerCase() !== 'yeasinkabirshifat@gmail.com') {
    window.location.href = '../Login Page/login.html';
    return;
  }
  adminId = session.user.id;

  await loadLeads();
  subscribeGlobal();
  bindEvents();

  const wantedLeadId = new URLSearchParams(window.location.search).get('lead');
  if (wantedLeadId) openLead(wantedLeadId);
}

/* ── Load all leads + latest message per lead ────────────────────────────── */
async function loadLeads() {
  const { data: leadRows, error: leadErr } = await sb
    .from('website_chat_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (leadErr) {
    console.error('[admin-website-chats] leads load failed:', leadErr);
    document.getElementById('convList').innerHTML =
      `<div class="conv-empty">Leads load করা যায়নি: ${escH(leadErr.message)}</div>`;
    return;
  }

  if (!leadRows || !leadRows.length) {
    document.getElementById('convList').innerHTML =
      '<div class="conv-empty">এখনো কোনো website chat lead নেই।</div>';
    updateGlobalBadge(0);
    return;
  }

  const { data: msgs } = await sb
    .from('website_chat_messages')
    .select('lead_id, sender, message, message_type, created_at')
    .order('created_at', { ascending: false });

  const latestMap = {};
  (msgs || []).forEach(m => {
    if (!latestMap[m.lead_id]) latestMap[m.lead_id] = m;
  });

  leads = leadRows.map(l => ({
    ...l,
    latestMsg: latestMap[l.id] || null,
    unread: !!(latestMap[l.id] && latestMap[l.id].sender === 'visitor' && !openedThisSession.has(l.id)),
    /* true হলে বোঝায় resolve question পাঠানো হয়েছে কিন্তু client এখনো
       answer দেয়নি (latest message-ই ঐ prompt) — এই অবস্থায় আবার
       Resolve চাপলে duplicate question পাঠানো ঠেকাতে হবে */
    promptPending: latestMap[l.id]?.message_type === 'resolve_prompt',
  }));

  renderLeadList(applyFilter(leads));
  updateGlobalBadge(leads.filter(l => l.unread).length);
}

function applyFilter(list) {
  if (activeFilter === 'open')   return list.filter(l => (l.status || 'open') !== 'closed');
  if (activeFilter === 'closed') return list.filter(l => l.status === 'closed');
  return list;
}

/* ── Render lead list ─────────────────────────────────────────────────── */
function renderLeadList(list) {
  const el = document.getElementById('convList');
  document.getElementById('convCount').textContent = list.length;

  if (!list.length) {
    el.innerHTML = '<div class="conv-empty">কোনো chat নেই।</div>';
    return;
  }

  el.innerHTML = list.map(l => {
    const name     = l.name || l.email || 'Visitor';
    const initials = name.substring(0, 2).toUpperCase();
    const lm       = l.latestMsg;
    const preview  = lm ? (lm.sender === 'admin' ? `আপনি: ${lm.message || ''}` : (lm.message || '')) : '';
    const time     = formatTime(lm?.created_at || l.created_at);
    const active   = currentLeadId === l.id ? 'active' : '';
    const unreadCls = l.unread ? 'unread' : '';
    const statusCls = (l.status === 'closed') ? 'closed' : 'open';
    const statusLbl = (l.status === 'closed') ? 'Resolved' : 'Open';

    return `
    <div class="conv-item ${active} ${unreadCls}" data-id="${l.id}" onclick="openLead('${l.id}')">
      <div class="conv-av">${escH(initials)}</div>
      <div class="conv-info">
        <div class="conv-name">${escH(name)}</div>
        <div class="wc-conv-tags">
          ${l.department ? `<span class="wc-dept-tag">${escH(l.department)}</span>` : ''}
          <span class="wc-status-tag ${statusCls}">${statusLbl}</span>
        </div>
        <div class="conv-preview">${escH(preview)}</div>
      </div>
      <div class="conv-meta">
        <span class="conv-time">${time}</span>
        ${l.unread ? `<span class="conv-unread-dot"></span>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ── Resolve button UI: status + promptPending onujayi label/disabled set kora ── */
function updateResolveBtnUI(lead) {
  const resolveBtn = document.getElementById('wcResolveBtn');
  const forceCloseBtn = document.getElementById('wcForceCloseBtn');
  if (!resolveBtn || !forceCloseBtn) return;
  const isClosed = lead.status === 'closed';

  if (!isClosed && lead.promptPending) {
    resolveBtn.textContent = 'Waiting for reply…';
    resolveBtn.disabled = true;
    resolveBtn.classList.remove('is-closed');
  } else {
    resolveBtn.textContent = isClosed ? 'Reopen' : 'Resolve';
    resolveBtn.disabled = resolveActionBusy;
    resolveBtn.classList.toggle('is-closed', isClosed);
  }
  forceCloseBtn.style.display = isClosed ? 'none' : '';
}

/* ── Open a lead's thread ─────────────────────────────────────────────── */
async function openLead(leadId) {
  currentLeadId = leadId;
  openedThisSession.add(leadId);

  document.querySelectorAll('.conv-item').forEach(i => i.classList.remove('active', 'unread'));
  document.querySelector(`.conv-item[data-id="${leadId}"]`)?.classList.add('active');
  document.getElementById('chatArea').classList.add('mobile-open');
  document.getElementById('chatEmptyState').style.display = 'none';
  document.getElementById('adminChatBox').style.display = 'flex';

  const lead = leads.find(l => l.id === leadId);
  if (lead) {
    lead.unread = false;
    const name = lead.name || lead.email || 'Visitor';
    document.getElementById('clientAv').textContent = name.substring(0, 2).toUpperCase();
    document.getElementById('clientName').textContent = name;
    document.getElementById('chatOrderMeta').textContent =
      `${lead.email || ''}${lead.phone ? ' · 📱 ' + lead.phone : ''}${lead.page_source ? ' · ' + lead.page_source : ''}`;

    const badge = document.getElementById('chatStatusBadge');
    badge.textContent = lead.department || '';
    badge.className   = 'order-status-badge';

    updateResolveBtnUI(lead);
  }
  updateGlobalBadge(leads.filter(l => l.unread).length);

  const body = document.getElementById('adminChatBody');
  body.innerHTML = '<div class="chat-loading-wrap"><div class="spinner"></div></div>';

  const { data: msgs, error } = await sb
    .from('website_chat_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });

  if (error) {
    body.innerHTML = `<div class="chat-body-empty"><p>Message load করা যায়নি: ${escH(error.message)}</p></div>`;
    return;
  }

  renderMessages(msgs || []);
  if (lead && lead.status === 'closed') await appendResolvedCard(leadId);
  subscribeToLead(leadId);
  await claimLead(leadId);
}

/* ── Claim a lead: without this, website_chat_leads.assigned_admin_id
   stays NULL forever, and the visitor's widget (liveChat.module.js)
   never fires its onAssigned() handler — so it never leaves the
   "waiting in queue" screen and never shows the admin's replies, even
   though those replies are correctly saved to website_chat_messages.
   Opening a lead here is what actually connects the two sides. ───── */
async function claimLead(leadId) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead || lead.assigned_admin_id || lead.status === 'closed') return;

  const { error } = await sb
    .from('website_chat_leads')
    .update({ assigned_admin_id: adminId })
    .eq('id', leadId)
    .is('assigned_admin_id', null); // no-op if another admin already claimed it first

  if (error) { console.error('[admin-website-chats] claim failed:', error); return; }
  lead.assigned_admin_id = adminId;
}

/* ── Render messages ──────────────────────────────────────────────────── */
function renderMessages(msgs) {
  const body = document.getElementById('adminChatBody');
  body.innerHTML = '';

  if (!msgs.length) {
    body.innerHTML = `<div class="chat-body-empty"><p>কোনো message নেই</p></div>`;
    return;
  }

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
    body.appendChild(buildBubble(msg));
  });

  scrollToBottom();
}

function buildBubble(msg) {
  const sender = msg.sender; // visitor | bot | admin
  const time   = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const row = document.createElement('div');
  row.className = `msg-row ${sender === 'admin' ? 'admin' : sender === 'bot' ? 'bot' : 'client'}`;
  row.dataset.id = msg.id;

  const av = document.createElement('div');
  av.className   = `msg-av ${sender === 'admin' ? 'admin-av' : 'client-av'}`;
  av.textContent = sender === 'admin' ? 'SA' : sender === 'bot' ? '🤖' : 'V';

  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';
  wrap.innerHTML = `<div class="msg-bubble">${escH(msg.message || '')}</div>`;

  const t = document.createElement('div');
  t.className = 'msg-time';
  t.innerHTML = `<span>${time}</span>`;
  wrap.appendChild(t);

  row.appendChild(av);
  row.appendChild(wrap);
  return row;
}

/* ── Realtime: messages inside the open lead ─────────────────────────────── */
function subscribeToLead(leadId) {
  if (leadChannel) { sb.removeChannel(leadChannel); leadChannel = null; }
  leadChannel = sb
    .channel('livechat-lead-' + leadId)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'website_chat_messages', filter: `lead_id=eq.${leadId}` },
      (payload) => {
        const msg = payload.new;
        if (currentLeadId !== leadId) return;
        document.getElementById('adminChatBody')?.appendChild(buildBubble(msg));
        scrollToBottom();
        updateLeadPreview(leadId, msg);
      })
    .subscribe();
}

/* ── Realtime: any new lead or message (list refresh + badge) ────────────── */
function subscribeGlobal() {
  globalChannel = sb
    .channel('admin-wc-global')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'website_chat_leads' }, () => loadLeads())
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'website_chat_leads' }, (payload) => {
      const updated = payload.new;
      const lead = leads.find(l => l.id === updated.id);
      if (!lead) return;
      lead.status = updated.status;
      /* status change মানেই client answer দিয়েছে বা admin manually কিছু
         করেছে — এখন আর কোনো prompt-এর জন্য অপেক্ষা করার দরকার নেই */
      lead.promptPending = false;
      if (currentLeadId === updated.id) {
        updateResolveBtnUI(lead);
        if (updated.status === 'closed') {
          // Small delay so any final messages land first
          setTimeout(() => appendResolvedCard(updated.id), 600);
        } else {
          // Reopened — remove the card
          document.getElementById('adminChatBody')?.querySelector('.wc-resolved-card')?.remove();
        }
      }
      renderLeadList(applyFilter(leads));
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'website_chat_messages' }, (payload) => {
      const msg = payload.new;
      const lead = leads.find(l => l.id === msg.lead_id);
      if (!lead) { loadLeads(); return; }
      lead.latestMsg = msg;
      lead.promptPending = msg.message_type === 'resolve_prompt';
      if (msg.sender === 'visitor' && currentLeadId !== msg.lead_id) {
        lead.unread = true;
        openedThisSession.delete(msg.lead_id);
      }
      if (currentLeadId === msg.lead_id) updateResolveBtnUI(lead);
      renderLeadList(applyFilter(leads));
      updateGlobalBadge(leads.filter(l => l.unread).length);
    })
    .subscribe();
}

function updateLeadPreview(leadId, msg) {
  const lead = leads.find(l => l.id === leadId);
  if (lead) lead.latestMsg = msg;
  const item = document.querySelector(`.conv-item[data-id="${leadId}"]`);
  if (!item) return;
  const prev = item.querySelector('.conv-preview');
  if (prev) prev.textContent = msg.sender === 'admin' ? `আপনি: ${msg.message || ''}` : (msg.message || '');
  const time = item.querySelector('.conv-time');
  if (time) time.textContent = formatTime(msg.created_at);
}

/* ── Send admin reply ─────────────────────────────────────────────────── */
async function sendReply() {
  const input = document.getElementById('adminChatInput');
  const btn   = document.getElementById('adminSendBtn');
  const text  = input.value.trim();
  if (!currentLeadId || !text) return;

  input.value = ''; input.style.height = 'auto';
  btn.disabled = true;

  const { error } = await sb.from('website_chat_messages').insert({
    lead_id: currentLeadId,
    sender: 'admin',
    message: text,
  });

  btn.disabled = false;
  if (error) {
    input.value = text;
    showToast('Message পাঠানো যায়নি: ' + error.message);
    console.error(error);
  }
}

/* ── Resolve button click: status onujayi different kaj ──────────────────
   - status 'closed' hole  → shorashori Reopen (client-ke jiggesh korar দরকার নেই)
   - status 'open'   hole  → client-ke Yes/No question pathano, status
                             সাথে সাথে change hoy na — client-er answer-er
                             upor depend kore (chatWidget.js handle kore) */
async function handleResolveClick() {
  if (!currentLeadId || resolveActionBusy) return;
  const lead = leads.find(l => l.id === currentLeadId);
  if (!lead) return;

  if (lead.status !== 'closed' && lead.promptPending) {
    showToast('Ager question-er উত্তরের জন্য এখনো অপেক্ষা করা হচ্ছে — আবার পাঠানোর দরকার নেই।');
    return;
  }

  resolveActionBusy = true;
  updateResolveBtnUI(lead);

  if (lead.status === 'closed') {
    await setLeadStatus(currentLeadId, 'open');
    resolveActionBusy = false;
    updateResolveBtnUI(lead);
    showToast('Chat আবার open করা হয়েছে।');
    return;
  }

  const question = 'Has your issue been resolved? Do you still need any further help from us?';
  const { error } = await sb.from('website_chat_messages').insert({
    lead_id: currentLeadId,
    sender: 'bot',
    message: question,
    message_type: 'resolve_prompt',
  });

  resolveActionBusy = false;

  if (error) {
    showToast('Question পাঠানো যায়নি: ' + error.message);
    updateResolveBtnUI(lead);
    return;
  }

  lead.promptPending = true;
  updateResolveBtnUI(lead);
  showToast('Client-কে resolution question পাঠানো হয়েছে — উত্তরের অপেক্ষায়।');
}

/* ── Force Close: client-কে না জিজ্ঞেস করেই সাথে সাথে resolve করা,
   তবু client-কে জানানোর জন্য একই closing message পাঠানো হয় ─────────── */
async function forceCloseLead() {
  if (!currentLeadId || resolveActionBusy) return;
  resolveActionBusy = true;

  const closingMsg = 'Thanks for contacting us! Feel free to reach out again if you need anything.';
  const { error: msgErr } = await sb.from('website_chat_messages').insert({
    lead_id: currentLeadId, sender: 'bot', message: closingMsg, message_type: 'text',
  });
  if (msgErr) {
    resolveActionBusy = false;
    showToast('Message পাঠানো যায়নি: ' + msgErr.message);
    return;
  }

  await setLeadStatus(currentLeadId, 'closed');
  resolveActionBusy = false;
  showToast('Chat force-close করা হয়েছে।');
}

/* ── Resolved summary card: fetch feedback + render at bottom of chat ─── */
async function appendResolvedCard(leadId) {
  const body = document.getElementById('adminChatBody');
  if (!body) return;

  // Remove any existing card first (prevent duplicates on re-open)
  body.querySelector('.wc-resolved-card')?.remove();

  const { data: fb } = await sb
    .from('website_chat_feedback')
    .select('rating, comment, created_at')
    .eq('lead_id', leadId)
    .maybeSingle();

  const stars = fb?.rating
    ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating)
    : null;

  const card = document.createElement('div');
  card.className = 'wc-resolved-card';
  card.innerHTML = `
    <div class="wc-resolved-icon">✓</div>
    <div class="wc-resolved-body">
      <div class="wc-resolved-title">Conversation Resolved</div>
      ${stars ? `<div class="wc-resolved-rating" title="Client rating">${stars}</div>` : ''}
      ${fb?.comment ? `<div class="wc-resolved-comment">"${escH(fb.comment)}"</div>` : ''}
      ${!fb ? `<div class="wc-resolved-nofb">No feedback left by client.</div>` : ''}
    </div>`;
  body.appendChild(card);
  scrollToBottom();
}

/* ── Shared helper: lead.status update + UI refresh ──────────────────── */
async function setLeadStatus(leadId, newStatus) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;

  const { error } = await sb.from('website_chat_leads').update({ status: newStatus }).eq('id', leadId);
  if (error) { showToast('Status update হয়নি: ' + error.message); return; }

  lead.status = newStatus;
  lead.promptPending = false;
  if (currentLeadId === leadId) updateResolveBtnUI(lead);
  renderLeadList(applyFilter(leads));
}

/* ── Search + filter chips ────────────────────────────────────────────── */
function filterLeads(q) {
  const base = applyFilter(leads);
  if (!q.trim()) { renderLeadList(base); return; }
  const lower = q.toLowerCase();
  renderLeadList(base.filter(l => {
    const name = (l.name || '').toLowerCase();
    const email = (l.email || '').toLowerCase();
    const dept  = (l.department || '').toLowerCase();
    const phone = (l.phone || '').toLowerCase();
    return name.includes(lower) || email.includes(lower) || dept.includes(lower) || phone.includes(lower);
  }));
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

  document.getElementById('wcResolveBtn')?.addEventListener('click', handleResolveClick);
  document.getElementById('wcForceCloseBtn')?.addEventListener('click', forceCloseLead);

  document.getElementById('convSearch')?.addEventListener('input', e => filterLeads(e.target.value));

  document.querySelectorAll('.wc-filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.wc-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      filterLeads(document.getElementById('convSearch')?.value || '');
    });
  });

  document.getElementById('backMobileBtn')?.addEventListener('click', () => {
    document.getElementById('chatArea').classList.remove('mobile-open');
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
  const badge = document.getElementById('sidebarWcBadge');
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

/* openLead must be reachable from inline onclick in rendered HTML */
window.openLead = openLead;

document.addEventListener('DOMContentLoaded', init);
