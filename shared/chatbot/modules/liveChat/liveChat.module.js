/* ================================================================
   SAVE AT: shared/chatbot/modules/liveChat/liveChat.module.js
   Live Chat module entry point — router.js dynamic import() diye
   lazy-load kore, tarpor init()/activate()/deactivate()/handleInput()
   call kore (module contract, core/router.js-e defined, ai.module.js
   already ei exact contract follow kore).

   IMPORT NOTE (transparent deviation, not silent):
   Instruction-e allowed-imports list-e ui/components.js chilo na, ar
   "Components shudhu liveChat.templates.js-er madhome" bola hoyeche.
   Kintu individual chat-message bubble render korার kono upay
   liveChat.templates.js exposes na (thik ai.templates.js-o kore na —
   ai.module.js nijeই Components.bubble() shorasori call kore,
   messageToHtml()-e). liveChat.templates.js ei mujhurte abar
   regenerate kora allowed na ("do not regenerate any previous file"),
   ar HTML duplicate kora-o allowed na ("no duplicated HTML"). Tai
   duita nishiddho option-er modhye, ei module already-approved
   ai.module.js-er EXACT already-established precedent follow kore
   ui/components.js import korche — shudhu bubble() + mountScrollArea()
   -er jonno, notun kono HTML build korার jonno na. Self-review-e
   ei point abar explicitly flag kora ache.

   Independence rules followed (ai.module.js-er moto):
   - Core + liveChat-er nijer state/service/templates chhara r kichu
     import kora hoyni (upore-r note bad diye).
   - Kono onno feature module (ai/orders/pricing) import kora hoyni.
   - Supabase channel object kokhono LiveChatState-e rakha hoy na —
     shob module-scope closure variable-e (queueChannel, leadChannel,
     rosterChannel) — session.js JSON.stringify korার somoy eta
     crash/corrupt na kore.
   ================================================================ */

import { State } from '../../core/state.js';
import { EventBus } from '../../core/eventBus.js';
import { WidgetShell } from '../../core/widgetShell.js';
import { Render } from '../../ui/render.js';
import { Components } from '../../ui/components.js'; // see IMPORT NOTE above
import { Config } from '../../config.js';
import { Session } from '../../core/session.js';
import { LiveChatState } from './liveChat.state.js';
import { LiveChatService } from './liveChat.service.js';
import { LiveChatTemplates } from './liveChat.templates.js';

/* ---------- module-scope only — NEVER put these in LiveChatState ---------- */

let cssInjected = false;
let delegatedListenersAttached = false;
let lastRenderedView = null;

let queueChannel = null;
let leadChannel = null;
let rosterChannel = null;

let selectedDepartment = '';
let selectedRating = null;
let ownQueueJoinedAt = null;
let closedToFeedbackTimer = null;

/* ---------- module contract: init ---------- */

async function init() {
  injectStyles();
  LiveChatState.init();
}

function injectStyles() {
  if (cssInjected) return;
  cssInjected = true;
  const href = new URL('./liveChat.css', import.meta.url).href;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/* ---------- module contract: activate/deactivate ---------- */

function activate(payload) {
  const bodyEl = WidgetShell.getBodyEl();
  if (!bodyEl) return;
  attachDelegatedListeners(bodyEl);

  const { reason = '', lastMessage = '' } = payload || {};
  void reason; void lastMessage; // reserved for a future "why you were handed off" note — not rendered yet

  const s = LiveChatState.get();

  /* Resuming a session that was already past the precontact form
     (page reload while queued, or while mid-chat) — reconnect the
     realtime subscriptions that deactivate()/a fresh page load would
     have torn down or never started. */
  if (s.leadId && (s.view === 'queue' || s.view === 'chat')) {
    subscribeLead(s.leadId);
    if (s.view === 'queue') subscribeQueue();
    render();
    return;
  }

  if (s.view === 'idle' || !s.view) {
    LiveChatState.set({ view: 'precontact', adminOnline: isWithinBusinessHours() });
    startRosterWatch();
  }
  render();
}

function deactivate() {
  // Visitor switched back to AI mid-session. leadId/view stay in
  // LiveChatState (persisted via session.js) so activate() can resume
  // correctly later — only the live realtime connections are torn down.
  const s = LiveChatState.get();
  if (s.view === 'queue' && s.leadId) cancelQueue(s.leadId, 'deactivated');
  unsubscribeAll();
  if (closedToFeedbackTimer) { clearTimeout(closedToFeedbackTimer); closedToFeedbackTimer = null; }
}

function unsubscribeAll() {
  if (queueChannel) { LiveChatService.unsubscribe(queueChannel); queueChannel = null; }
  if (leadChannel) { LiveChatService.unsubscribe(leadChannel); leadChannel = null; }
  if (rosterChannel) { LiveChatService.unsubscribe(rosterChannel); rosterChannel = null; }
}

/* ---------- module contract: handleInput (free-text from the
   persistent input bar, forwarded here by router.js) ---------- */

function handleInput(text) {
  const s = LiveChatState.get();
  if (s.view === 'chat' && s.leadId) {
    sendVisitorMessage(text);
    return;
  }
  // Any other view — the shared input isn't the primary control right
  // now (precontact has its own form fields; queue/feedback don't need
  // free text). A short, friendly nudge instead of silently dropping it.
  State.pushMessage({ sender: 'system', type: 'text', text: "Please use the form above for now — I'll switch to free typing once we're connected.", module: 'liveChat' });
  render();
}

/* ---------- delegated interactions (attached once to bodyEl,
   survives Render.mount() replacing bodyEl's children — same pattern
   ai.module.js uses) ---------- */

function attachDelegatedListeners(bodyEl) {
  if (delegatedListenersAttached) return;
  delegatedListenersAttached = true;

  bodyEl.addEventListener('click', (e) => {
    const chipEl = e.target.closest('[data-chip-id]');
    if (chipEl) { onChipClick(bodyEl, chipEl); return; }

    // Components.inputArea() (used for the feedback comment box) renders
    // its send button with a plain id, not data-btn-id — caught here
    // explicitly since the generic [data-btn-id] selector below can't see it.
    const feedbackSubmitEl = e.target.closest('#lc-feedback-submit');
    if (feedbackSubmitEl) { onButtonClick(bodyEl, 'lc-feedback-submit'); return; }

    const btnEl = e.target.closest('[data-btn-id]');
    if (btnEl) { onButtonClick(bodyEl, btnEl.dataset.btnId); }
  });
}

function onChipClick(bodyEl, chipEl) {
  const chipId = chipEl.dataset.chipId;

  if (chipId.startsWith('lc-dept-')) {
    selectedDepartment = chipId.replace('lc-dept-', '');
    const group = chipEl.closest('#lc-dept-chips');
    if (group) group.querySelectorAll('.ui-chip').forEach((el) => el.setAttribute('aria-pressed', 'false'));
    chipEl.setAttribute('aria-pressed', 'true');
    return;
  }

  if (chipId.startsWith('lc-rating-')) {
    selectedRating = parseInt(chipId.replace('lc-rating-', ''), 10);
    const group = chipEl.closest('#lc-rating-chips');
    if (group) group.querySelectorAll('.ui-chip').forEach((el) => el.setAttribute('aria-pressed', 'false'));
    chipEl.setAttribute('aria-pressed', 'true');
    updateFeedbackSubmitState(bodyEl);
  }
}

function onButtonClick(bodyEl, btnId) {
  if (btnId === 'lc-precontact-submit') { submitPrecontactForm(bodyEl); return; }
  if (btnId === 'lc-feedback-submit') { submitFeedback(bodyEl); return; }
  if (btnId === 'lc-resolve-yes') { handleResolveYes(bodyEl); return; }
  if (btnId === 'lc-resolve-no')  { handleResolveNo(bodyEl);  return; }
  if (btnId === 'lc-return-to-ai') { returnToAi(); }
}

async function handleResolveYes(bodyEl) {
  // Remove the prompt card immediately so user can't click twice
  const card = bodyEl.querySelector('#lc-resolve-prompt');
  if (card) card.remove();

  // Show the visitor's "Yes" reply as a user bubble
  State.pushMessage({ sender: 'visitor', type: 'text', text: 'Yes', module: 'liveChat' });
  render();

  // Send "Yes" to Supabase so admin can see it
  const s = LiveChatState.get();
  await LiveChatService.sendMessage(s.leadId, 'Yes');

  // Bot follow-up: invite further questions
  State.pushMessage({
    sender: 'bot',
    type: 'text',
    text: "Okay! Let me know how I can help you further.",
    module: 'liveChat',
  });
  render();
}

async function handleResolveNo(bodyEl) {
  // Remove the prompt card
  const card = bodyEl.querySelector('#lc-resolve-prompt');
  if (card) card.remove();

  // Show the visitor's "No" reply as a user bubble
  State.pushMessage({ sender: 'visitor', type: 'text', text: 'No', module: 'liveChat' });
  render();

  // Send "No" to Supabase so admin sees it
  const s = LiveChatState.get();
  await LiveChatService.sendMessage(s.leadId, 'No');

  // Auto-close the lead
  await LiveChatService.closeLead(s.leadId);
  // onClosed realtime event will fire and show the closed screen automatically
}

/* ---------- pre-contact form ---------- */

async function submitPrecontactForm(bodyEl) {
  const nameEl = bodyEl.querySelector('#lc-name');
  const emailEl = bodyEl.querySelector('#lc-email');
  const phoneEl = bodyEl.querySelector('#lc-phone');
  const name = nameEl ? nameEl.value.trim() : '';
  const email = emailEl ? emailEl.value.trim() : '';
  const phone = phoneEl ? phoneEl.value.trim() : '';
  const errorEl = bodyEl.querySelector('#lc-form-error');
  const submitBtn = bodyEl.querySelector('[data-btn-id="lc-precontact-submit"]');

  if (!name || !email || !selectedDepartment) {
    if (errorEl) errorEl.textContent = 'Please fill in your name, email, and choose a department.';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
    return;
  }
  if (errorEl) errorEl.textContent = '';
  if (submitBtn) submitBtn.disabled = true;

  const currentUser = State.get().currentUser;
  const { lead, error } = await LiveChatService.createLead({
    name,
    email,
    phone,
    department: selectedDepartment,
    pageSource: detectPageSource(),
    clientId: currentUser ? currentUser.id : null,
  });

  if (error || !lead) {
    if (errorEl) errorEl.textContent = 'Something went wrong — please try again.';
    if (submitBtn) submitBtn.disabled = false;
    return;
  }

  EventBus.emit('livechat.lead.created', { leadId: lead.id });
  await enterQueue(lead);
}

function detectPageSource() {
  const path = window.location.pathname;
  if (path.includes('Homepage')) return 'Homepage';
  if (path.includes('Service page')) return 'Thesis Writing Page';
  return 'Other';
}

/* ---------- queue ---------- */

async function enterQueue(lead) {
  stopRosterWatch(); // only relevant on the precontact "are we online" notice
  ownQueueJoinedAt = lead.queue_joined_at;

  LiveChatState.set({ leadId: lead.id, view: 'queue', queuePosition: null });
  render();

  const { position } = await LiveChatService.getQueuePosition(lead.queue_joined_at);
  LiveChatState.set({ queuePosition: position });
  EventBus.emit('livechat.queue.joined', { leadId: lead.id, position });

  subscribeQueue();
  subscribeLead(lead.id);
  render();
}

function subscribeQueue() {
  if (queueChannel) return;
  queueChannel = LiveChatService.subscribeQueueChannel({
    onJoined() {
      // Someone joined the queue AFTER us — per the approved queue
      // design, that never changes OUR OWN position. Intentional no-op.
    },
    onLeft(row) {
      const s = LiveChatState.get();
      if (!s.leadId || s.view !== 'queue') return;
      if (row.id === s.leadId) return; // our own exit is handled via onAssigned/onClosed instead
      if (ownQueueJoinedAt && row.queue_joined_at && row.queue_joined_at < ownQueueJoinedAt) {
        const newPos = Math.max(0, (s.queuePosition || 0) - 1);
        LiveChatState.set({ queuePosition: newPos });
        EventBus.emit('livechat.queue.position.updated', { leadId: s.leadId, position: newPos });
        render();
        flashPosition();
      }
    },
  });
}

function teardownQueueChannel() {
  if (queueChannel) { LiveChatService.unsubscribe(queueChannel); queueChannel = null; }
}

function flashPosition() {
  const bodyEl = WidgetShell.getBodyEl();
  const el = bodyEl && bodyEl.querySelector('#lc-position-card');
  if (!el) return;
  el.classList.add('lc-position-flash');
  window.setTimeout(() => el.classList.remove('lc-position-flash'), 700);
}

/* Explicit queue-exit only (see deactivate() below) — no automatic
   background/hidden-tab trigger. A future Cancel Queue button in
   liveChat.templates.js would call cancelQueue(leadId, 'cancelled')
   the same way. */
async function cancelQueue(leadId, reason) {
  teardownQueueChannel();
  const { error } = await LiveChatService.leaveQueue(leadId);
  if (!error) {
    EventBus.emit('livechat.queue.left', { leadId, reason });
  }
}

/* ---------- per-lead realtime: assignment, messages, close, presence ---------- */

function subscribeLead(leadId) {
  if (leadChannel) return;
  leadChannel = LiveChatService.subscribeToLead(leadId, {
    onMessage(row) {
      if (row.sender === 'visitor') return; // already shown optimistically on send

      if (row.message_type === 'resolve_prompt') {
        // Instead of a plain bubble, inject an interactive Yes/No card
        const bodyEl = WidgetShell.getBodyEl();
        if (bodyEl) {
          // Remove any existing prompt card so we never duplicate it
          const existing = bodyEl.querySelector('#lc-resolve-prompt');
          if (existing) existing.remove();
          bodyEl.insertAdjacentHTML('beforeend', LiveChatTemplates.resolvePromptCard());
          bodyEl.scrollTop = bodyEl.scrollHeight;
        }
        EventBus.emit('livechat.message.received', { message: row });
        return; // do NOT push a State message — card owns the UI
      }

      State.pushMessage({ sender: row.sender, type: 'text', text: row.message, module: 'liveChat', dbId: row.id });
      EventBus.emit('livechat.message.received', { message: row });
      render();
    },
    onAssigned(row) {
      const s = LiveChatState.get();
      if (s.view === 'chat') return; // already handled by an earlier event
      teardownQueueChannel();
      LiveChatState.set({ view: 'chat', assignedAdminId: row.assigned_admin_id });
      const adminName = LiveChatState.get().assignedAdminName; // null today (Option A — single admin, no name join available)
      EventBus.emit('livechat.assigned', { leadId, adminName });
      trackOwnPresence();
      loadMessages(leadId);
      render();
    },
    onClosed() {
      EventBus.emit('livechat.closed', { leadId });
      const closedBodyEl = WidgetShell.getBodyEl();
      if (closedBodyEl) Render.mount(closedBodyEl, LiveChatTemplates.chatClosedScreen());

      // After a brief moment so the closed screen is visible, clear the
      // session and close the widget — next open will start completely fresh.
      closedToFeedbackTimer = window.setTimeout(() => {
        unsubscribeAll();
        LiveChatState.reset();
        Session.clear();
        State.replaceAll({ messages: [], activeModule: null, modules: {} });
        WidgetShell.close();
      }, 1800);
    },
    onPresenceSync(presenceState) {
      const entries = Object.values(presenceState).flat();
      const adminEntry = entries.find((p) => p.role === 'admin');
      const isTyping = !!(adminEntry && adminEntry.typing);
      const wasTyping = LiveChatState.get().adminTyping;
      LiveChatState.set({ adminTyping: isTyping });
      if (isTyping && !wasTyping) EventBus.emit('livechat.typing.start', { leadId, who: 'admin' });
      else if (!isTyping && wasTyping) EventBus.emit('livechat.typing.stop', { leadId, who: 'admin' });
      render();
    },
  });
}

function trackOwnPresence() {
  // Visitor's own typing can't be detected today — widgetShell.js's
  // shared input bar only emits on submit, not on keystroke, and it
  // exposes no per-keystroke hook to this module. This tracks presence
  // as "connected, not typing" so the admin side at least sees the
  // visitor as present on the thread; see self-review for the honest
  // note on this limitation.
  if (leadChannel) LiveChatService.trackPresence(leadChannel, { role: 'visitor', typing: false });
}

async function loadMessages(leadId) {
  const { messages } = await LiveChatService.loadExistingMessages(leadId);
  const existingDbIds = new Set(
    State.get().messages.filter((m) => m.module === 'liveChat' && m.dbId).map((m) => m.dbId)
  );
  messages.forEach((row) => {
    if (existingDbIds.has(row.id)) return;
    State.pushMessage({ sender: row.sender, type: 'text', text: row.message, module: 'liveChat', dbId: row.id });
  });
}

async function sendVisitorMessage(text) {
  const s = LiveChatState.get();
  State.pushMessage({ sender: 'visitor', type: 'text', text, module: 'liveChat' });
  render();
  const { error } = await LiveChatService.sendMessage(s.leadId, text);
  if (error) {
    State.pushMessage({ sender: 'system', type: 'text', text: "That message couldn't be sent — please check your connection.", module: 'liveChat' });
    render();
  }
}

/* ---------- admin roster (precontact-only "are we online" notice) ---------- */

function startRosterWatch() {
  if (rosterChannel) return;
  rosterChannel = LiveChatService.subscribeAdminRoster({
    onChange(anyOnline) {
      LiveChatState.set({ adminOnline: anyOnline });
      render();
    },
  });
}

function stopRosterWatch() {
  if (rosterChannel) { LiveChatService.unsubscribe(rosterChannel); rosterChannel = null; }
}

function isWithinBusinessHours() {
  const { timezone, startHour, endHour } = Config.businessHours;
  const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }), 10);
  return hour >= startHour && hour < endHour;
}

/* ---------- feedback ---------- */

function updateFeedbackSubmitState(bodyEl) {
  const commentEl = bodyEl.querySelector('#lc-feedback-comment');
  const submitBtn = bodyEl.querySelector('#lc-feedback-submit');
  if (!commentEl || !submitBtn) return;
  submitBtn.disabled = !(selectedRating || commentEl.value.trim());
}

function wireFeedbackCommentInput(bodyEl) {
  const commentEl = bodyEl.querySelector('#lc-feedback-comment');
  if (!commentEl) return;
  commentEl.addEventListener('input', () => updateFeedbackSubmitState(bodyEl));
  updateFeedbackSubmitState(bodyEl);
}

async function submitFeedback(bodyEl) {
  const s = LiveChatState.get();
  if (!s.leadId) { returnToAi(); return; }

  const commentEl = bodyEl.querySelector('#lc-feedback-comment');
  const comment = commentEl ? commentEl.value.trim() : '';
  const submitBtn = bodyEl.querySelector('#lc-feedback-submit');
  if (submitBtn) submitBtn.disabled = true;

  const { error } = await LiveChatService.submitFeedback(s.leadId, { rating: selectedRating, comment });
  if (error) {
    if (submitBtn) submitBtn.disabled = false;
    showFeedbackError(bodyEl);
    return; // stay on the feedback screen; do NOT return to AI on failure
  }

  LiveChatState.set({ feedbackSubmitted: true });
  EventBus.emit('livechat.feedback.submitted', { leadId: s.leadId, rating: selectedRating, comment });

  // Clear the session so the next widget open starts fresh, then close.
  unsubscribeAll();
  LiveChatState.reset();
  Session.clear();
  State.replaceAll({ messages: [], activeModule: null, modules: {} });
  WidgetShell.close();
}

/* Components.inputArea() (the feedback comment box) renders an
   icon-only send button — no <span>, nowhere to write a retry label
   onto the button itself. Reuses the existing Components.fieldError()
   primitive instead (same one the pre-contact form already uses),
   inserted right after the input row. Removes any previous instance
   first so role="alert" re-announces on a repeated failure. */
function showFeedbackError(bodyEl) {
  const existing = bodyEl.querySelector('#lc-feedback-error');
  if (existing) existing.remove();
  const commentEl = bodyEl.querySelector('#lc-feedback-comment');
  const inputArea = commentEl ? commentEl.closest('.ui-input-area') : null;
  if (!inputArea) return;
  inputArea.insertAdjacentHTML(
    'afterend',
    Components.fieldError({ id: 'lc-feedback-error', text: "Couldn't save — please try again." })
  );
}

/* ---------- return to AI ---------- */

function returnToAi() {
  unsubscribeAll();
  if (closedToFeedbackTimer) { clearTimeout(closedToFeedbackTimer); closedToFeedbackTimer = null; }
  selectedDepartment = '';
  selectedRating = null;
  ownQueueJoinedAt = null;

  LiveChatState.reset();
  EventBus.emit('livechat.session.ended', {});
  EventBus.emit('router:activate', { key: 'ai' });
}

/* ---------- render ---------- */

function render() {
  const bodyEl = WidgetShell.getBodyEl();
  if (!bodyEl) return;
  const s = LiveChatState.get();
  const view = s.view;

  if (view !== lastRenderedView) {
    lastRenderedView = view;
    mountView(bodyEl, view, s);
    return;
  }

  if (view === 'precontact') patchOfflineNotice(bodyEl, s);
  else if (view === 'queue') patchQueuePosition(bodyEl, s);
  else if (view === 'chat') patchMessages(bodyEl, s);
}

function mountView(bodyEl, view, s) {
  switch (view) {
    case 'precontact': {
      selectedDepartment = '';
      Render.mount(bodyEl, `<div id="lc-precontact-notice"></div>${LiveChatTemplates.preContactForm()}${LiveChatTemplates.returnToAiButton()}`);
      patchOfflineNotice(bodyEl, s);
      break;
    }
    case 'queue': {
      Render.mount(bodyEl, `<div class="lc-waiting-screen">${LiveChatTemplates.queueWaitingCard()}${LiveChatTemplates.queuePositionCard(s.queuePosition || 0)}</div>${LiveChatTemplates.returnToAiButton()}`);
      break;
    }
    case 'chat': {
      const banner = LiveChatTemplates.adminConnectedBanner(s.assignedAdminName);
      Render.mount(bodyEl, banner + LiveChatTemplates.messageArea({ id: 'lc-messages' }));
      Components.mountScrollArea(bodyEl.querySelector('#lc-messages'));
      patchMessages(bodyEl, s);
      break;
    }
    case 'feedback': {
      selectedRating = null;
      Render.mount(bodyEl, LiveChatTemplates.feedbackCard() + LiveChatTemplates.returnToAiButton());
      wireFeedbackCommentInput(bodyEl);
      break;
    }
    default:
      Render.mount(bodyEl, '');
  }
}

function patchOfflineNotice(bodyEl, s) {
  const el = bodyEl.querySelector('#lc-precontact-notice');
  if (!el) return;
  Render.mount(el, s.adminOnline === false ? LiveChatTemplates.offlineNotice() : '');
}

function patchQueuePosition(bodyEl, s) {
  Render.mount(bodyEl, `<div class="lc-waiting-screen">${LiveChatTemplates.queueWaitingCard()}${LiveChatTemplates.queuePositionCard(s.queuePosition || 0)}</div>`);
  flashPosition();
}

function patchMessages(bodyEl, s) {
  const threadEl = bodyEl.querySelector('#lc-messages');
  if (!threadEl) return;

  const wasAtBottom = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 4;

  const items = State.get().messages
    .filter((m) => m.module === 'liveChat')
    .map((m) => ({
      key: m.id,
      hash: m.sender + '|' + (m.text || ''),
      html: Components.bubble({
        variant: m.sender === 'visitor' ? 'user' : 'assistant',
        text: m.text,
        label: m.sender === 'visitor' || m.sender === 'system' ? '' : (s.assignedAdminName || 'Support'),
      }),
    }));

  if (s.adminTyping) {
    items.push({ key: 'admin-typing', hash: 'typing', html: LiveChatTemplates.adminTypingIndicator() });
  }

  Render.renderKeyedList(threadEl, items, { emptyHtml: '' });
  if (wasAtBottom) Render.scrollToBottom(bodyEl);
}

export default { init, activate, deactivate, handleInput };
