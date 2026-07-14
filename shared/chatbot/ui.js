/* ================================================================
   SCRIPTORA — chatbot/ui.js
   Shob DOM rendering ekhane. state.js theke data porbe, kintu state
   nijei change korbe na (event handler-gulo chatWidget.js theke
   attach hoy — ui.js sudhu markup + refs dey).
   ================================================================ */

window.ScriptoraChatUI = (function () {

  /* ── Quick Action Cards (spec §3.4 — guest default, 6 card) ── */
  const QUICK_ACTIONS = [
    { key: 'thesis',   title: 'Thesis Writing', desc: 'Honours theke PhD — full support',
      icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' },
    { key: 'pricing',  title: 'Pricing', desc: 'Package o cost দেখুন',
      icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    { key: 'samples',  title: 'Samples', desc: 'Kaj-er quality dekhe nin',
      icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
    { key: 'academic', title: 'Academic Help', desc: 'Proposal, SPSS, Turnitin',
      icon: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
    { key: 'faq',      title: 'FAQ', desc: 'Common questions-er answer',
      icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
    { key: 'contact',  title: 'Contact Expert', desc: 'Direct human-er sathe kotha bolun',
      icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>' },
  ];

  const TOPIC_PILLS = ['Honours Thesis', 'Masters Thesis', 'Proposal', 'SPSS', 'Turnitin', 'Pricing'];

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  /* ── Static shell (header + body scaffold + input bar) — chatWidget.js
     eita ekbar inject kore, tarpor ui.render() body-r bhitorer content
     shob shomoy update kore ── */
  function shellHtml() {
    return `
    <div id="sca-root">
      <div class="sca-bubble" id="sca-bubble">👋 Kono kichu jantey chan?</div>

      <div class="sca-panel">
        <div class="sca-header">
          <div class="sca-header-left">
            <div class="sca-avatar">
              <span class="sca-avatar-dot"></span>
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

        <div class="sca-body" id="sca-body"></div>

        <div class="sca-input-row" id="sca-input-row">
          <button class="sca-icon-btn" id="sca-attach-btn" aria-label="Attach file" title="File attach">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <textarea id="sca-chat-input" rows="1" placeholder="Ask about your thesis, pricing, samples..."></textarea>
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

  /* ── Welcome text (guest vs authenticated — spec §3.3) ── */
  function welcomeHtml(ctx) {
    if (ctx.mode === 'auth') {
      const first = escapeHtml(ctx.firstName || 'there');
      const line = ctx.orderLine
        ? escapeHtml(ctx.orderLine)
        : 'Apnar account-e ekhono kono active order nei.';
      return `
      <div class="sca-welcome-block">
        <p class="sca-welcome-title">Welcome back, ${first} 👋</p>
        <p class="sca-welcome-sub">${line}</p>
      </div>`;
    }
    return `
    <div class="sca-welcome-block">
      <p class="sca-welcome-title">Hello 👋 Welcome to Scriptora.</p>
      <p class="sca-welcome-sub">I can help with pricing, samples, and starting your order — just ask.</p>
    </div>`;
  }

  /* ── Account snapshot mini-card (auth mode, §2 Authenticated Content Layer) ── */
  function accountSnapshotHtml(ctx) {
    if (ctx.mode !== 'auth') return '';
    if (!ctx.activeOrder) {
      return `
      <div class="sca-snapshot sca-snapshot-empty">
        <span class="sca-snapshot-label">No active order</span>
        <a class="sca-snapshot-link" href="${ctx.dashboardUrl}">Start a new order →</a>
      </div>`;
    }
    const o = ctx.activeOrder;
    return `
    <div class="sca-snapshot">
      <div class="sca-snapshot-top">
        <span class="sca-snapshot-name">${escapeHtml(o.title || 'Your order')}</span>
        <span class="sca-snapshot-badge">${escapeHtml(o.stage || 'In progress')}</span>
      </div>
      <div class="sca-snapshot-bar"><div class="sca-snapshot-bar-fill" style="width:${Math.max(4, Math.min(100, o.progress || 0))}%"></div></div>
      <a class="sca-snapshot-link" href="${ctx.dashboardUrl}">View full order →</a>
    </div>`;
  }

  /* ── Quick action cards (guest) / quick actions (auth) ── */
  function quickCardsHtml(ctx) {
    if (ctx.mode === 'auth') {
      const items = [
        { key: 'orders',   title: 'My Orders',  url: ctx.dashboardUrl },
        { key: 'files',    title: 'My Files',   url: ctx.dashboardUrl },
        { key: 'payments', title: 'Payments',   url: ctx.dashboardUrl },
        { key: 'messages', title: 'Messages',   url: ctx.dashboardUrl },
      ];
      return `<div class="sca-auth-actions">${items.map(i =>
        `<a class="sca-auth-action" href="${i.url}" data-nav="${i.key}">${escapeHtml(i.title)}</a>`
      ).join('')}</div>`;
    }
    return `
    <div class="sca-cards-grid">
      ${QUICK_ACTIONS.map(a => `
        <button class="sca-card" data-topic="${a.key}">
          <svg class="sca-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a.icon}</svg>
          <span class="sca-card-title">${escapeHtml(a.title)}</span>
          <span class="sca-card-desc">${escapeHtml(a.desc)}</span>
        </button>`).join('')}
    </div>
    <div class="sca-pills-row">
      ${TOPIC_PILLS.map(p => `<button class="sca-pill" data-pill="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('')}
    </div>`;
  }

  /* ── Single message bubble ── */
  function messageHtml(msg) {
    if (msg.type === 'handoff') return handoffCardHtml(msg);
    if (msg.type === 'lead-form') return leadFormHtml(msg);

    const cls = msg.sender === 'user' ? 'sca-msg-user' : 'sca-msg-ai';
    const label = msg.sender === 'user' ? '' : (msg.meta && msg.meta.label) || 'Scriptora AI';
    return `
    <div class="sca-msg ${cls}" data-msg-id="${msg.id}">
      ${label ? `<span class="sca-msg-label">${escapeHtml(label)}</span>` : ''}
      <div class="sca-msg-text">${escapeHtml(msg.text).replace(/\n/g, '<br>')}</div>
    </div>`;
  }

  /* ── Human handoff card (Screen D — inline in thread, not a modal) ── */
  function handoffCardHtml(msg) {
    const state = msg.meta && msg.meta.state || 'pending'; // pending | connected
    return `
    <div class="sca-handoff-card" data-msg-id="${msg.id}">
      <div class="sca-handoff-top">
        <div class="sca-handoff-avatar">S</div>
        <div>
          <div class="sca-handoff-name">Scriptora Team</div>
          <div class="sca-handoff-sub">${state === 'connected' ? 'Connected — usually replies within 15 minutes' : 'I\'ll bring in a human expert for this'}</div>
        </div>
      </div>
      ${state === 'pending' ? `
      <div class="sca-handoff-actions">
        <button class="sca-handoff-btn sca-handoff-primary" data-handoff="start">Talk to a human expert</button>
        <button class="sca-handoff-btn" data-handoff="dismiss">Continue with AI</button>
      </div>` : ''}
    </div>`;
  }

  /* ── Inline lead-capture mini form (only for unregistered guests
     before human handoff starts — name/email/phone) ── */
  function leadFormHtml(msg) {
    const dept = (msg.meta && msg.meta.department) || 'General Inquiry';
    return `
    <div class="sca-leadform" data-msg-id="${msg.id}">
      <p class="sca-leadform-hint">Human expert-er sathe connect korার আগে একটু info দিন:</p>
      <input class="sca-leadform-input" id="sca-lf-name" placeholder="আপনার নাম" />
      <input class="sca-leadform-input" id="sca-lf-email" placeholder="আপনার ইমেইল" type="email" />
      <input class="sca-leadform-input" id="sca-lf-phone" placeholder="মোবাইল নম্বর" type="tel" />
      <div class="sca-leadform-error" id="sca-lf-error"></div>
      <button class="sca-leadform-submit" id="sca-lf-submit" data-department="${escapeHtml(dept)}">Connect me</button>
    </div>`;
  }

  function typingHtml() {
    return `
    <div class="sca-msg sca-msg-ai sca-typing">
      <div class="sca-typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  }

  /* ── Full body render — welcome/snapshot/cards collapse once
     conversation starts (spec §3.3, §6) ── */
  function render(bodyEl, state, ctx) {
    const collapsed = state.quickCardsCollapsed;

    let html = '';
    html += `<div class="sca-top-section ${collapsed ? 'sca-collapsed' : ''}">`;
    html += welcomeHtml(ctx);
    html += accountSnapshotHtml(ctx);
    if (!collapsed) html += quickCardsHtml(ctx);
    else html += `<button class="sca-show-topics" id="sca-show-topics">Show topics again</button>`;
    html += `</div>`;

    html += `<div class="sca-messages" id="sca-messages">`;
    html += state.messages.map(messageHtml).join('');
    if (state.typing) html += typingHtml();
    html += `</div>`;

    bodyEl.innerHTML = html;
    scrollToBottom(bodyEl);
  }

  function scrollToBottom(bodyEl) {
    requestAnimationFrame(() => { bodyEl.scrollTop = bodyEl.scrollHeight; });
  }

  return {
    QUICK_ACTIONS, TOPIC_PILLS,
    shellHtml, render, messageHtml, typingHtml, scrollToBottom, escapeHtml,
  };

})();
