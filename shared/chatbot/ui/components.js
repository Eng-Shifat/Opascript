/* ================================================================
   SCRIPTORA CHATBOT V2 — ui/components.js
   Shared UI Layer. Prottek function pure — shudhu HTML string
   return kore, kono Supabase/AI/state access nei. Modules
   (Phase 3+) eigulo import kore nijeder content banabe.

   No feature module ei file import korbe na uladiye — ulta, sob
   feature module eigulo import kore.
   ================================================================ */

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

/* ---------- Chat bubbles ---------- */

function bubble({ variant = 'assistant', text = '', html = null, label = '' } = {}) {
  const cls = variant === 'user' ? 'ui-bubble ui-bubble-user' : 'ui-bubble ui-bubble-assistant';
  const body = html != null ? html : escapeHtml(text).replace(/\n/g, '<br>');
  return `
  <div class="${cls}">
    ${label ? `<span class="ui-bubble-label">${escapeHtml(label)}</span>` : ''}
    <div class="ui-bubble-text">${body}</div>
  </div>`;
}

function userBubble(text) {
  return bubble({ variant: 'user', text });
}

function assistantBubble(text, label = 'Opascript') {
  return bubble({ variant: 'assistant', text, label });
}

function typingIndicator({ label = 'Typing' } = {}) {
  return `
  <div class="ui-bubble ui-bubble-assistant ui-typing" role="status" aria-label="${escapeHtml(label)}">
    <div class="ui-typing-dots"><span></span><span></span><span></span></div>
  </div>`;
}

/* ---------- Card / chip / button ---------- */

function card({ id = '', icon = '', title = '', description = '', disabled = false } = {}) {
  return `
  <button class="ui-card" type="button" ${disabled ? 'disabled' : ''} ${id ? `data-card-id="${escapeHtml(id)}"` : ''}>
    ${icon ? `<span class="ui-card-icon" aria-hidden="true">${icon}</span>` : ''}
    <span class="ui-card-title">${escapeHtml(title)}</span>
    ${description ? `<span class="ui-card-desc">${escapeHtml(description)}</span>` : ''}
  </button>`;
}

function suggestionChip({ id = '', label = '' } = {}) {
  return `<button class="ui-chip" type="button" ${id ? `data-chip-id="${escapeHtml(id)}"` : ''}>${escapeHtml(label)}</button>`;
}

const BUTTON_VARIANTS = { primary: 'ui-btn-primary', secondary: 'ui-btn-secondary', ghost: 'ui-btn-ghost', danger: 'ui-btn-danger' };

function button({ id = '', label = '', variant = 'primary', icon = '', disabled = false, type = 'button' } = {}) {
  const variantCls = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  return `
  <button class="ui-btn ${variantCls}" type="${escapeHtml(type)}" ${disabled ? 'disabled' : ''} ${id ? `data-btn-id="${escapeHtml(id)}"` : ''}>
    ${icon ? `<span class="ui-btn-icon" aria-hidden="true">${icon}</span>` : ''}
    <span>${escapeHtml(label)}</span>
  </button>`;
}

/* ---------- Status badge ---------- */

const BADGE_TONES = { neutral: 'ui-badge-neutral', success: 'ui-badge-success', warning: 'ui-badge-warning', danger: 'ui-badge-danger', accent: 'ui-badge-accent' };

function statusBadge({ label = '', tone = 'neutral' } = {}) {
  const toneCls = BADGE_TONES[tone] || BADGE_TONES.neutral;
  return `<span class="ui-badge ${toneCls}">${escapeHtml(label)}</span>`;
}

/* ---------- Timeline item (order tracking, etc.) ---------- */

const TIMELINE_STATES = { done: 'ui-timeline-done', active: 'ui-timeline-active', pending: 'ui-timeline-pending' };

function timelineItem({ title = '', description = '', time = '', state = 'pending' } = {}) {
  const stateCls = TIMELINE_STATES[state] || TIMELINE_STATES.pending;
  return `
  <div class="ui-timeline-item ${stateCls}">
    <span class="ui-timeline-dot" aria-hidden="true"></span>
    <div class="ui-timeline-body">
      <div class="ui-timeline-top">
        <span class="ui-timeline-title">${escapeHtml(title)}</span>
        ${time ? `<span class="ui-timeline-time">${escapeHtml(time)}</span>` : ''}
      </div>
      ${description ? `<p class="ui-timeline-desc">${escapeHtml(description)}</p>` : ''}
    </div>
  </div>`;
}

/* ---------- Notification ---------- */

const NOTIF_TONES = { neutral: 'ui-notif-neutral', success: 'ui-notif-success', warning: 'ui-notif-warning', danger: 'ui-notif-danger', accent: 'ui-notif-accent' };

function notification({ id = '', title = '', message = '', tone = 'neutral', time = '', unread = false } = {}) {
  const toneCls = NOTIF_TONES[tone] || NOTIF_TONES.neutral;
  return `
  <div class="ui-notification ${toneCls} ${unread ? 'ui-notification-unread' : ''}" ${id ? `data-notif-id="${escapeHtml(id)}"` : ''}>
    ${unread ? `<span class="ui-notification-dot" aria-hidden="true"></span>` : ''}
    <div class="ui-notification-body">
      <div class="ui-notification-title">${escapeHtml(title)}</div>
      ${message ? `<div class="ui-notification-message">${escapeHtml(message)}</div>` : ''}
      ${time ? `<div class="ui-notification-time">${escapeHtml(time)}</div>` : ''}
    </div>
  </div>`;
}

/* ---------- Loading skeleton ---------- */

function loadingSkeleton({ lines = 3, tone = 'text' } = {}) {
  if (tone === 'card') return `<div class="ui-skeleton ui-skeleton-card" aria-hidden="true"></div>`;
  const rows = Array.from({ length: Math.max(1, lines) })
    .map((_, i) => `<div class="ui-skeleton-line" style="width:${i === lines - 1 ? '60%' : '100%'}"></div>`)
    .join('');
  return `<div class="ui-skeleton ui-skeleton-text" aria-hidden="true">${rows}</div>`;
}

/* ---------- Form field / input area ---------- */

function inputField({ id = '', label = '', placeholder = '', type = 'text', errorId = '' } = {}) {
  return `
  <label class="ui-field" ${id ? `for="${escapeHtml(id)}"` : ''}>
    ${label ? `<span class="ui-field-label">${escapeHtml(label)}</span>` : ''}
    <input class="ui-field-input" ${id ? `id="${escapeHtml(id)}"` : ''} type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" ${errorId ? `aria-describedby="${escapeHtml(errorId)}"` : ''} />
  </label>`;
}

function fieldError({ id = '', text = '' } = {}) {
  return `<div class="ui-field-error" ${id ? `id="${escapeHtml(id)}"` : ''} role="alert">${escapeHtml(text)}</div>`;
}

/* Generic composer row — modules use this for any inline text input
   they own (widgetShell.js has its own persistent input bar; this is
   for module-local inputs, e.g. a search box inside a module view). */
function inputArea({ id = 'ui-input', placeholder = 'Type a message...', sendId = 'ui-input-send' } = {}) {
  return `
  <div class="ui-input-area">
    <textarea class="ui-input-textarea" id="${escapeHtml(id)}" rows="1" placeholder="${escapeHtml(placeholder)}"></textarea>
    <button class="ui-input-send" id="${escapeHtml(sendId)}" type="button" aria-label="Send" disabled>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
  </div>`;
}

/* ---------- Section header / footer (module-local, NOT the
   persistent widget header/footer — widgetShell.js owns those) ---------- */

function header({ title = '', subtitle = '', showBack = false } = {}) {
  return `
  <div class="ui-header">
    ${showBack ? `
    <button class="ui-header-back" type="button" aria-label="Back">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
    </button>` : ''}
    <div class="ui-header-text">
      <div class="ui-header-title">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="ui-header-subtitle">${escapeHtml(subtitle)}</div>` : ''}
    </div>
  </div>`;
}

function footer({ text = '' } = {}) {
  return `<div class="ui-footer">${escapeHtml(text)}</div>`;
}

/* ---------- Scroll area ---------- */

function scrollArea({ id = '', html = '', ariaLive = 'polite' } = {}) {
  return `<div class="ui-scroll-area" ${id ? `id="${escapeHtml(id)}"` : ''} role="log" aria-live="${escapeHtml(ariaLive)}">${html}</div>`;
}

/* Prevents scroll-chaining to the page behind the widget. Modules
   call this once on their own scrollable element after mounting it. */
function mountScrollArea(el) {
  if (!el) return;
  el.addEventListener('wheel', (e) => {
    const hasOwnOverflow = el.scrollHeight > el.clientHeight;
    if (!hasOwnOverflow) return; // nothing for this element to contain — let the wheel event bubble/chain to whichever ancestor actually scrolls
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) e.preventDefault();
  }, { passive: false });
}

export const Components = {
  escapeHtml,
  bubble, userBubble, assistantBubble, typingIndicator,
  card, suggestionChip, button,
  statusBadge,
  timelineItem,
  notification,
  loadingSkeleton,
  inputField, fieldError, inputArea,
  header, footer,
  scrollArea, mountScrollArea,
};
