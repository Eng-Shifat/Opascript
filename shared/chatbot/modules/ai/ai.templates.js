/* ================================================================
   SAVE AT: shared/chatbot/modules/ai/ai.templates.js
   AI module-er content — shob Components (ui/components.js) diye
   toiri, kono duplicate/raw HTML lekha hoyni. Pure functions —
   kono state/Supabase/fetch ekhane nei.
   ================================================================ */

import { Components } from '../../ui/components.js';

const QUICK_ACTIONS = [
  { key: 'service',  title: 'Our Services',   desc: 'Thesis, proposal, SPSS & more',
    icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
  { key: 'pricing',  title: 'Pricing',        desc: 'See packages and cost',
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
  { key: 'sample',   title: 'Samples',        desc: 'See quality of our work',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
  { key: 'citation', title: 'Citation Help',  desc: 'APA, MLA, Chicago & more',
    icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
  { key: 'faq',      title: 'FAQ',            desc: 'Common questions answered',
    icon: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  { key: 'human',    title: 'Talk to a Human', desc: 'Connect with our team',
    icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>' },
];

function iconSvg(pathData) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathData}</svg>`;
}

function welcome({ businessName = 'Scriptora', tagline = '' } = {}) {
  return `
  <div class="ai-welcome-block">
    <p class="ai-welcome-title">Hello 👋 Welcome to ${Components.escapeHtml(businessName)}.</p>
    <p class="ai-welcome-sub">${Components.escapeHtml(tagline || "I can help with pricing, samples, and starting your order — just ask.")}</p>
  </div>`;
}

function quickActionCards() {
  const cards = QUICK_ACTIONS.map((a) => Components.card({
    id: a.key, icon: iconSvg(a.icon), title: a.title, description: a.desc,
  })).join('');
  return `<div class="ai-cards-grid">${cards}</div>`;
}

function showTopicsButton() {
  return Components.button({ id: 'show-topics', label: 'Show topics again', variant: 'ghost' });
}

function serviceCards(services = []) {
  if (!services.length) return Components.loadingSkeleton({ tone: 'card' });
  return `<div class="ai-cards-grid">${services.map((s) =>
    Components.card({ id: 'svc_' + s.key, title: s.name, description: s.description })
  ).join('')}</div>`;
}

/* business.json-e kono fixed price nei (scope onujayi vary kore) —
   tai service list dekhiye ekta "get a quote" CTA jog kora hoy,
   ja handoff trigger kore. Kono price ai module nijei banay na. */
function pricingCards(services = []) {
  const cards = services.length
    ? `<div class="ai-cards-grid">${services.map((s) => Components.card({ id: 'price_' + s.key, title: s.name, description: 'Get a custom quote' })).join('')}</div>`
    : '';
  return cards + Components.button({ id: 'get-quote', label: 'Get a custom quote', variant: 'primary' });
}

function sampleCards() {
  return Components.card({ id: 'sample_request', title: 'Request Samples', description: 'Tell us your subject/field and we\'ll share relevant work' });
}

function citationHelpCard() {
  return `
  <div class="ai-info-block">
    ${Components.statusBadge({ label: 'Citation Styles', tone: 'accent' })}
    <p class="ai-info-text">APA, MLA, Chicago, Harvard — tell us which style your university requires and we'll format your document accordingly.</p>
  </div>`;
}

function handoffCard({ state = 'pending' } = {}) {
  if (state === 'connected') {
    return `
    <div class="ai-handoff-card">
      ${Components.statusBadge({ label: 'Connected', tone: 'success' })}
      <p class="ai-handoff-text">You're now flagged for our team — they usually reply within 15 minutes during working hours.</p>
    </div>`;
  }
  return `
  <div class="ai-handoff-card">
    <p class="ai-handoff-text">I'll bring in a human expert for this.</p>
    <div class="ai-handoff-actions">
      ${Components.button({ id: 'handoff-start', label: 'Talk to a human expert', variant: 'primary' })}
      ${Components.button({ id: 'handoff-dismiss', label: 'Continue with AI', variant: 'ghost' })}
    </div>
  </div>`;
}

export const AiTemplates = {
  QUICK_ACTIONS,
  welcome, quickActionCards, showTopicsButton,
  serviceCards, pricingCards, sampleCards, citationHelpCard, handoffCard,
};
