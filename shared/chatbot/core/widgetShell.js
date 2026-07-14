/* ================================================================
   SCRIPTORA CHATBOT V2 — core/widgetShell.js
   Architecture rule: "Only widgetShell.js can manipulate the
   persistent DOM." Header, panel open/close, input bar — shob
   ekhane. Ei file kono module (AI/liveChat/orders) sombondhe kichu
   jane na — shudhu generic hooks expose kore (getBodyEl,
   setStatus) ja module-gulo porokale use korbe.

   Body-r bhitorer content eখনো kono module render kore na
   (Phase 3+ e ashbe) — Phase 1-e শুধু placeholder dekhায়।
   ================================================================ */

import { EventBus } from './eventBus.js';
import { State } from './state.js';

let refs = null;

function isExcludedPage(excludedPages) {
  const path = window.location.pathname;
  return (excludedPages || []).some((p) => path.includes(p));
}

function loadStyles(baseUrl) {
  ['tokens.css', 'shell.css'].forEach((file) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = baseUrl + 'style/' + file; // folder is `style/` (singular) on disk
    document.head.appendChild(link);
  });
}

function shellHtml() {
  return `
  <div id="sca-root">
    <div class="sca-bubble" id="sca-bubble">👋 Kono kichu jantey chan?</div>

    <div class="sca-panel">
      <div class="sca-header">
        <div class="sca-header-left">
          <div class="sca-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
          </div>
          <div class="sca-header-text">
            <div class="sca-header-title-row">
              <span class="sca-header-title">Scriptora AI</span>
              <span class="sca-status-dot" id="sca-status-dot"></span>
            </div>
            <div class="sca-header-status">Academic Assistant</div>
          </div>
        </div>
        <button class="sca-header-close" id="sca-close-btn" aria-label="Close chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      <div class="sca-body" id="sca-body">
        <p class="sca-placeholder">Assistant loading…</p>
      </div>

      <div class="sca-input-row">
        <textarea id="sca-chat-input" rows="1" placeholder="Type a message..."></textarea>
        <button class="sca-send-btn" id="sca-send-btn" aria-label="Send" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      <div class="sca-footer">Answers are reviewed by our academic team · <strong>Scriptora</strong></div>
    </div>

    <button class="sca-toggle" id="sca-toggle-btn" aria-label="Open chat">
      <svg class="sca-icon-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      <svg class="sca-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>`;
}

function cacheRefs() {
  refs = {
    root: document.getElementById('sca-root'),
    toggleBtn: document.getElementById('sca-toggle-btn'),
    closeBtn: document.getElementById('sca-close-btn'),
    bubble: document.getElementById('sca-bubble'),
    statusDot: document.getElementById('sca-status-dot'),
    bodyEl: document.getElementById('sca-body'),
    inputEl: document.getElementById('sca-chat-input'),
    sendBtn: document.getElementById('sca-send-btn'),
  };
}

function autoGrow() {
  refs.inputEl.style.height = 'auto';
  refs.inputEl.style.height = Math.min(refs.inputEl.scrollHeight, 96) + 'px';
}

function submitInput() {
  const text = refs.inputEl.value.trim();
  if (!text) return;
  refs.inputEl.value = '';
  autoGrow();
  refs.sendBtn.disabled = true;
  EventBus.emit('shell:input', text); // router.js forward kore active module-ke
}

function attachEvents() {
  refs.toggleBtn.addEventListener('click', () => {
    refs.root.classList.toggle('sca-open');
    refs.bubble.classList.remove('sca-show');
    EventBus.emit(refs.root.classList.contains('sca-open') ? 'shell:opened' : 'shell:closed');
  });
  refs.closeBtn.addEventListener('click', () => {
    refs.root.classList.remove('sca-open');
    EventBus.emit('shell:closed');
  });
  refs.bubble.addEventListener('click', () => refs.toggleBtn.click());

  refs.bodyEl.addEventListener('wheel', (e) => {
    const atTop = refs.bodyEl.scrollTop <= 0;
    const atBottom = refs.bodyEl.scrollTop + refs.bodyEl.clientHeight >= refs.bodyEl.scrollHeight - 1;
    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) e.preventDefault();
  }, { passive: false });

  refs.inputEl.addEventListener('input', () => {
    refs.sendBtn.disabled = !refs.inputEl.value.trim();
    autoGrow();
  });
  refs.inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInput(); }
  });
  refs.sendBtn.addEventListener('click', submitInput);

  setTimeout(() => { if (!refs.root.classList.contains('sca-open')) refs.bubble.classList.add('sca-show'); }, 4000);
  setTimeout(() => refs.bubble.classList.remove('sca-show'), 12000);
}

/* config = { baseUrl, excludedPages } — baseUrl e.g. 'shared/chatbot/'
   (relative theke styles/tokens.css, styles/shell.css khonja hoy) */
function mount(config = {}) {
  if (isExcludedPage(config.excludedPages)) {
    console.info('[WidgetShell] excluded page — chatbot not mounted.');
    return null;
  }
  loadStyles(config.baseUrl || '');
  document.body.insertAdjacentHTML('beforeend', shellHtml());
  cacheRefs();
  attachEvents();
  return refs;
}

function getBodyEl() {
  return refs ? refs.bodyEl : null;
}

function setStatus(online) {
  if (refs && refs.statusDot) refs.statusDot.classList.toggle('sca-offline', !online);
}

function open() {
  if (refs && !refs.root.classList.contains('sca-open')) refs.toggleBtn.click();
}

function close() {
  if (refs) refs.root.classList.remove('sca-open');
}

export const WidgetShell = { mount, getBodyEl, setStatus, open, close, isExcludedPage };
