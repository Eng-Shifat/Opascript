/* ================================================================
   SAVE AT: shared/chatbot/modules/ai/ai.module.js
   AI module entry point — router.js (Phase 1) eita dynamic import()
   diye lazy-load kore, tarpor init()/activate()/deactivate()/
   handleInput() call kore (module contract, router.js-e defined).

   Independence rules followed:
   - Core-i shudhu import kora hoyeche (state, eventBus, widgetShell,
     ui/render, ui/components) — eigulo "core", feature module na.
   - liveChat/orders/pricing kono kichu import kora hoyni.
   - Supabase shorasori kono jaygay chhoya hoyni.
   - Human handoff dorkar hole shudhu EventBus.emit('handoff.request', ...)
     kora hoy — lead toiri kora ba Supabase-e lekha AI module-er kaj na,
     oita liveChat module-er (Phase 4) kaj, jokhon oi module ei event-e
     subscribe korবে.
   ================================================================ */

import { State } from '../../core/state.js';
import { EventBus } from '../../core/eventBus.js';
import { WidgetShell } from '../../core/widgetShell.js';
import { Render } from '../../ui/render.js';
import { Components } from '../../ui/components.js';
import { Config } from '../../config.js';
import { AiState } from './ai.state.js';
import { Intents } from './ai.intents.js';
import { AiTemplates } from './ai.templates.js';
import { AiService } from './ai.service.js';

const HANDOFF_INTENTS = new Set(['human', 'contact']);
const HANDOFF_CONFIDENCE_THRESHOLD = 0.55;

let cssInjected = false;
let delegatedListenersAttached = false;

/* ---------- module contract: init ---------- */

async function init() {
  injectStyles();
  AiState.init();
  await AiService.loadKnowledge();
}

function injectStyles() {
  if (cssInjected) return;
  cssInjected = true;
  const href = new URL('./ai.css', import.meta.url).href;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/* ---------- module contract: activate/deactivate ---------- */

function activate() {
  const bodyEl = WidgetShell.getBodyEl();
  if (!bodyEl) return;
  ensureLayout(bodyEl);
  if (!AiState.get().greeted) AiState.set({ greeted: true });
  WidgetShell.setStatus(isWithinBusinessHours());
  render();
}

function deactivate() {
  AiState.set({ typing: false });
}

/* ---------- module contract: handleInput (free-text from the
   persistent input bar, forwarded here by router.js) ---------- */

async function handleInput(text) {
  State.pushMessage({ sender: 'user', type: 'text', text, module: 'ai' });
  State.pushConversationEntry({ role: 'user', text });
  AiState.set({ quickCardsCollapsed: true });
  render();

  const { intent, confidence } = Intents.detectIntent(text);
  AiState.set({ lastIntent: intent });

  if (HANDOFF_INTENTS.has(intent) && confidence >= HANDOFF_CONFIDENCE_THRESHOLD) {
    await withTypingDelay();
    requestHandoff(intent);
    return;
  }

  await withTypingDelay(async () => {
    const history = State.get().conversation.map((c) => ({ role: c.role, text: c.text }));
    const result = await AiService.getReply(history, text, { intent, confidence });
    if (result.text) {
      pushAssistant(result.text);
      State.pushConversationEntry({ role: 'assistant', text: result.text });
    }
    if (result.handoff) requestHandoff(intent);
  });
}

/* ---------- DOM layout (mounted once; re-used across re-renders) ---------- */

function ensureLayout(bodyEl) {
  if (!bodyEl.querySelector('#ai-top')) {
    Render.mount(bodyEl, `<div id="ai-top"></div><div id="ai-thread" class="ui-scroll-area" aria-label="Conversation"></div>`);
    Components.mountScrollArea(bodyEl.querySelector('#ai-thread'));
  }
  attachDelegatedListeners(bodyEl);
}

/* Ekbar-i attach kora — Render.mount() shudhu #ai-top/#ai-thread-er
   ANDOR-er content bodole, bodyEl nijei bodlay na, tai delegation
   bodyEl-er upor rakhle baar baar re-attach korte hoy na. */
function attachDelegatedListeners(bodyEl) {
  if (delegatedListenersAttached) return;
  delegatedListenersAttached = true;
  bodyEl.addEventListener('click', (e) => {
    const cardEl = e.target.closest('[data-card-id]');
    if (cardEl) { onQuickAction(cardEl.dataset.cardId); return; }
    const btnEl = e.target.closest('[data-btn-id]');
    if (btnEl) { onButton(btnEl.dataset.btnId); }
  });
}

/* ---------- interactions ---------- */

function onQuickAction(key) {
  if (key.startsWith('svc_')) { onServiceSelect(key.replace('svc_', '')); return; }
  if (key.startsWith('price_')) { onServiceSelect(key.replace('price_', ''), { fromPricing: true }); return; }

  const business = AiService.getBusiness();
  const action = AiTemplates.QUICK_ACTIONS.find((a) => a.key === key);
  if (action) State.pushMessage({ sender: 'user', type: 'text', text: action.title, module: 'ai' });
  AiState.set({ quickCardsCollapsed: true });

  switch (key) {
    case 'service':
      pushAssistant('Here are the services we offer:', { html: AiTemplates.serviceCards(business.services || []) });
      break;
    case 'pricing':
      pushAssistant('Pricing depends on scope, level, and deadline — here are our services:', { html: AiTemplates.pricingCards(business.services || []) });
      break;
    case 'sample':
      pushAssistant("Sure — tell us your subject/field and we'll share relevant samples.", { html: AiTemplates.sampleCards() });
      break;
    case 'citation':
      pushAssistant('', { html: AiTemplates.citationHelpCard() });
      break;
    case 'faq':
      pushAssistant('Ask me anything — pricing, deadlines, revisions, plagiarism checks, and more.');
      break;
    case 'human':
      requestHandoff('human');
      break;
    default:
      pushAssistant('Tell me more about what you need.');
  }
  render();
}

/* A service card was picked (from "Our Services" or "Pricing" grid) —
   show its description with a direct "Talk to an Expert" CTA so every
   service leads somewhere useful instead of a generic fallback reply. */
function onServiceSelect(serviceKey, { fromPricing = false } = {}) {
  const business = AiService.getBusiness();
  const service = (business.services || []).find((s) => s.key === serviceKey);
  if (!service) { pushAssistant('Tell me more about what you need.'); render(); return; }

  State.pushMessage({ sender: 'user', type: 'text', text: service.name, module: 'ai' });
  pushAssistant('', { html: AiTemplates.serviceDetailCard(service, { fromPricing }) });
  render();
}

function onButton(id) {
  if (id.startsWith('talk-expert_')) {
    const key = id.replace('talk-expert_', '');
    const business = AiService.getBusiness();
    const service = (business.services || []).find((s) => s.key === key);
    requestHandoff(service ? service.name : 'service');
    return;
  }
  if (id === 'show-topics') { AiState.set({ quickCardsCollapsed: false }); render(); return; }
  if (id === 'handoff-start') { requestHandoff('human'); return; }
  if (id === 'get-quote') { requestHandoff('pricing'); return; }
  if (id === 'handoff-dismiss') {
    removeLastHandoffCard();
    pushAssistant("Okay, I'll keep helping. Ask me anything else — or say \"talk to human\" anytime.");
    render();
  }
}

/* AI module NEVER creates leads/talks to Supabase — it only emits the
   request. liveChat module (Phase 4) owns everything after this. */
function requestHandoff(reason) {
  removeLastHandoffCard(); // avoid stacking duplicate pending cards
  State.pushMessage({ sender: 'ai', type: 'handoff', module: 'ai', meta: { state: 'pending' } });
  EventBus.emit('handoff.request', { reason, lastMessage: lastUserMessageText() });
  render();
}

function removeLastHandoffCard() {
  const s = State.get();
  const last = s.messages[s.messages.length - 1];
  if (last && last.type === 'handoff' && last.meta && last.meta.state === 'pending') {
    s.messages.pop();
  }
}

function lastUserMessageText() {
  const found = [...State.get().messages].reverse().find((m) => m.sender === 'user' && m.type === 'text');
  return found ? found.text : '';
}

function pushAssistant(text, { html = null } = {}) {
  State.pushMessage({ sender: 'ai', type: html ? 'html' : 'text', text: text || '', html, module: 'ai' });
}

async function withTypingDelay(work) {
  AiState.set({ typing: true });
  render();
  const [ , ] = await Promise.all([
    new Promise((r) => setTimeout(r, Config.ai.typingDelayMs)),
    work ? work() : Promise.resolve(),
  ]);
  AiState.set({ typing: false });
  render();
}

function isWithinBusinessHours() {
  const { timezone, startHour, endHour } = Config.businessHours;
  const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }), 10);
  return hour >= startHour && hour < endHour;
}

/* ---------- render ---------- */

function render() {
  const bodyEl = WidgetShell.getBodyEl();
  if (!bodyEl) return;

  const business = AiService.getBusiness();
  const aiState = AiState.get();

  const topEl = bodyEl.querySelector('#ai-top');
  const topHtml = aiState.quickCardsCollapsed
    ? AiTemplates.showTopicsButton()
    : AiTemplates.welcome({ businessName: business.companyName, tagline: business.brand && business.brand.tagline }) + AiTemplates.quickActionCards();
  Render.mount(topEl, topHtml);

  const threadEl = bodyEl.querySelector('#ai-thread');
  const wasAtBottom = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 4;
  const items = State.get().messages
    .filter((m) => m.module === 'ai')
    .map((m) => ({
      key: m.id,
      hash: (m.text || '') + (m.html || '') + (m.meta ? JSON.stringify(m.meta) : ''),
      html: messageToHtml(m),
    }));
  if (aiState.typing) items.push({ key: 'typing', hash: 'typing', html: Components.typingIndicator({ label: 'Opascript is typing' }) });

  Render.renderKeyedList(threadEl, items, { emptyHtml: '' });
  if (wasAtBottom) Render.scrollToBottom(bodyEl);
}

function messageToHtml(m) {
  if (m.type === 'handoff') return AiTemplates.handoffCard({ state: (m.meta && m.meta.state) || 'pending' });
  if (m.type === 'html') return Components.bubble({ variant: m.sender === 'user' ? 'user' : 'assistant', html: m.html, label: m.sender === 'user' ? '' : 'Opascript' });
  return Components.bubble({ variant: m.sender === 'user' ? 'user' : 'assistant', text: m.text, label: m.sender === 'user' ? '' : 'Opascript' });
}

export default { init, activate, deactivate, handleInput };
