/* ================================================================
   SAVE AT: shared/chatbot/modules/liveChat/liveChat.templates.js
   Live Chat module-er content — shob Components (ui/components.js)
   diye toiri, ai.templates.js-er exact discipline: pure functions,
   kono state/Supabase/EventBus ekhane nei, shudhu HTML string return
   kore. Wrapper <div class="lc-..."> chhara kono raw/duplicated
   markup nei — protyek interactive/atomic piece (card, button, chip,
   badge, bubble, field) Components theke ashe.

   Department selection Components.suggestionChip diye kora hoyeche
   (native <select> na) — karon Components-e select/dropdown builder
   nei, ar chip-row already ekta existing, reusable primitive jeta
   exactly ei kaj-er jonno moto (compare: ai module-er topic pills-o
   ekই ui-chip use korte pare bhobisshote).
   ================================================================ */

import { Components } from '../../ui/components.js';

const DEPARTMENTS = [
  { key: 'Thesis Writing', label: 'Thesis Writing' },
  { key: 'Assignment Help', label: 'Assignment Help' },
  { key: 'Order & Payment', label: 'Order & Payment' },
  { key: 'General Inquiry', label: 'General Inquiry' },
];

const RATING_VALUES = [1, 2, 3, 4, 5];

/* ---------- Pre-contact form ---------- */

function preContactForm() {
  const deptChips = DEPARTMENTS.map((d) =>
    Components.suggestionChip({ id: 'lc-dept-' + d.key, label: d.label })
  ).join('');

  return `
  <div class="lc-precontact-block">
    ${Components.header({ title: 'Talk to our team', subtitle: 'A few details before we connect you' })}
    ${Components.inputField({ id: 'lc-name', label: 'Your Name', placeholder: 'আপনার নাম' })}
    ${Components.inputField({ id: 'lc-email', label: 'Your Email', type: 'email', placeholder: 'আপনার ইমেইল' })}
    ${Components.inputField({ id: 'lc-phone', label: 'Mobile Number', type: 'tel', placeholder: '017XXXXXXXX' })}
    <div class="lc-dept-field">
      <span class="ui-field-label">Department</span>
      <div class="lc-dept-chips" id="lc-dept-chips">${deptChips}</div>
    </div>
    ${Components.fieldError({ id: 'lc-form-error' })}
    ${Components.button({ id: 'lc-precontact-submit', label: 'Start The Chat', variant: 'primary' })}
  </div>`;
}

/* ---------- Queue waiting card (generic "you're in the queue" shell) ---------- */

function queueWaitingCard() {
  return `
  <div class="lc-queue-card">
    ${Components.statusBadge({ label: 'Waiting', tone: 'accent' })}
    <p class="lc-queue-text">Connecting you with our team — you're in the queue now.</p>
  </div>`;
}

/* ---------- Queue position card (the live-updating number) ---------- */

function queuePositionCard(position) {
  const label = position > 0 ? `You're #${position} in the queue` : "You're next in line";
  return `
  <div class="lc-position-card" id="lc-position-card">
    ${Components.statusBadge({ label, tone: 'accent' })}
  </div>`;
}

/* ---------- Admin connected banner ---------- */

function adminConnectedBanner(adminName) {
  return `
  <div class="lc-assigned-banner">
    ${Components.statusBadge({ label: 'Connected', tone: 'success' })}
    <p class="lc-assigned-text">${Components.escapeHtml(adminName || 'A team member')} has joined the chat.</p>
  </div>`;
}

/* ---------- Chat message area (scrollable thread container) ----------
   Individual messages are NOT built here — module.js calls
   Components.userBubble()/assistantBubble() directly per message,
   since bubble() already fully covers that; a wrapper here would just
   duplicate what Components already does. This function only owns the
   scroll container itself. */

function messageArea({ id = 'lc-messages' } = {}) {
  return Components.scrollArea({ id, html: '', ariaLive: 'polite' });
}

/* ---------- Typing indicator ---------- */

function adminTypingIndicator() {
  return Components.typingIndicator({ label: 'Admin is typing' });
}

/* ---------- Offline notice ---------- */

function offlineNotice() {
  return `
  <div class="lc-offline-notice">
    ${Components.statusBadge({ label: 'Offline', tone: 'warning' })}
    <p class="lc-offline-text">Our team isn't online right now — leave your message and we'll reply as soon as we're back.</p>
  </div>`;
}

/* ---------- Chat closed screen ---------- */

function chatClosedScreen() {
  return `
  <div class="lc-closed-block">
    ${Components.statusBadge({ label: 'Chat closed', tone: 'neutral' })}
    <p class="lc-closed-text">This conversation has ended. Thanks for reaching out!</p>
  </div>`;
}

/* ---------- Feedback card ---------- */

function feedbackCard() {
  const ratingChips = RATING_VALUES.map((n) =>
    Components.suggestionChip({ id: 'lc-rating-' + n, label: String(n) })
  ).join('');

  return `
  <div class="lc-feedback-card">
    ${Components.header({ title: 'How did we do?', subtitle: 'Optional — helps us improve' })}
    <div class="lc-rating-chips" id="lc-rating-chips">${ratingChips}</div>
    ${Components.inputArea({ id: 'lc-feedback-comment', placeholder: 'Optional comment...', sendId: 'lc-feedback-submit' })}
  </div>`;
}

/* ---------- Return-to-AI button ---------- */

function returnToAiButton() {
  return Components.button({ id: 'lc-return-to-ai', label: 'Back to AI Assistant', variant: 'secondary' });
}

export const LiveChatTemplates = {
  DEPARTMENTS,
  preContactForm,
  queueWaitingCard,
  queuePositionCard,
  adminConnectedBanner,
  messageArea,
  adminTypingIndicator,
  offlineNotice,
  chatClosedScreen,
  feedbackCard,
  returnToAiButton,
};
