/* ================================================================
   SCRIPTORA — chatbot/chatWidget.js
   Main controller. Onno file-gulo (state.js, ui.js, ai.js,
   liveChat.js) er upor depend kore — tai HTML-e eguloke ei order-e
   load korte hobe:

     <link rel="stylesheet" href="chatbot/styles.css"> (ai-o load hoy nicher script diye)
     <script src="chatbot/state.js"></script>
     <script src="chatbot/ui.js"></script>
     <script src="chatbot/ai.js"></script>
     <script src="chatbot/liveChat.js"></script>
     <script src="chatbot/chatWidget.js"></script>

   (eito script tag-er age supabase-js CDN + shared/supabaseClient.js
    load kora thakle Live Chat + account snapshot pura kaj korbe;
    na thakle assistant local/demo mode-e cholbe.)

   Optional — real AI backend jog korte:
     <script>window.SCRIPTORA_AI_ENDPOINT = 'https://YOUR-PROJECT.functions.supabase.co/ai-assistant';</script>
   (ai.js dekhun — details oikhane)
   ================================================================ */

(function () {

  const State = window.ScriptoraChatState;
  const UI = window.ScriptoraChatUI;
  const AI = window.ScriptoraChatAI;
  const LiveChat = window.ScriptoraLiveChat;

  /* ── Load styles.css relative to this script's own location, tai
     kono page theke include korলেও path bhangbe na ── */
  (function loadStyles() {
    const thisScript = document.currentScript || (function () {
      const scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    const base = thisScript.src.replace(/chatWidget\.js(\?.*)?$/, '');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + 'styles.css';
    document.head.appendChild(link);
  })();

  function inject() {
    document.body.insertAdjacentHTML('beforeend', UI.shellHtml());
    initWidget();
  }
  if (document.readyState !== 'loading') inject();
  else document.addEventListener('DOMContentLoaded', inject);

  function initWidget() {
    const root       = document.getElementById('sca-root');
    const toggleBtn  = document.getElementById('sca-toggle-btn');
    const closeBtn   = document.getElementById('sca-close-btn');
    const bubble     = document.getElementById('sca-bubble');
    const statusDot  = document.getElementById('sca-status-dot');
    const bodyEl     = document.getElementById('sca-body');
    const inputEl    = document.getElementById('sca-chat-input');
    const sendBtn    = document.getElementById('sca-send-btn');

    /* ── Guest vs Authenticated mode (spec §2) — purono localStorage
       convention reuse kora (Client Dashboard/login theke set hoy) ── */
    const clientId  = localStorage.getItem('scriptora_client_id') || null;
    const firstName = (localStorage.getItem('scriptora_name') || '').split(' ')[0];
    const ctx = {
      mode: clientId ? 'auth' : 'guest',
      firstName,
      dashboardUrl: '../Client Dashboard/dashboard.html',
      activeOrder: null,
      orderLine: null,
    };

    statusDot.classList.toggle('sca-offline', !LiveChat.isOnlineNow());

    /* ── Restore session thread (panel bondho kore onno page-e gele o
       conversation mone thake) ── */
    State.restore();
    if (!State.get().messages.length) State.set({ view: 'welcome' });

    /* ── Auth mode hole active order tene ana (non-blocking — na
       paile o UI break korbe na) ── */
    if (ctx.mode === 'auth') loadAccountSnapshot(clientId).then(() => rerender());

    /* ── Live chat resume — page reload/navigation-e agei ekta lead
       thakle abar connect kora ── */
    if (LiveChat.hasActiveLead() && State.get().liveMode) {
      LiveChat.subscribe(handleIncomingLiveMessage);
    }

    rerender();
    State.subscribe(rerender);

    function rerender() {
      UI.render(bodyEl, State.get(), ctx);
      attachBodyHandlers();
    }

    async function loadAccountSnapshot(cid) {
      const sb = window.scriptoraSupabase;
      if (!sb) return;
      try {
        const { data } = await sb.from('orders').select('*').eq('client_id', cid).lt('progress', 100).order('order_date', { ascending: false }).limit(1);
        if (data && data[0]) {
          const o = data[0];
          ctx.activeOrder = { title: o.title || o.service_type || 'Your order', stage: o.status || o.stage || 'In progress', progress: o.progress || 0 };
          ctx.orderLine = `Your ${ctx.activeOrder.title} is at ${ctx.activeOrder.progress}% — ${ctx.activeOrder.stage}.`;
        }
      } catch (e) {
        console.warn('[Scriptora Chat] account snapshot fetch failed (non-fatal):', e);
      }
    }

    /* ── Panel open/close ── */
    toggleBtn.addEventListener('click', () => {
      root.classList.toggle('sca-open');
      bubble.classList.remove('sca-show');
    });
    closeBtn.addEventListener('click', () => root.classList.remove('sca-open'));
    bubble.addEventListener('click', () => { root.classList.add('sca-open'); bubble.classList.remove('sca-show'); });

    setTimeout(() => { if (!root.classList.contains('sca-open')) bubble.classList.add('sca-show'); }, 4000);
    setTimeout(() => bubble.classList.remove('sca-show'), 12000);

    /* Scroll-chaining prevent (purono widget-er moto) */
    bodyEl.addEventListener('wheel', (e) => {
      const atTop = bodyEl.scrollTop <= 0;
      const atBottom = bodyEl.scrollTop + bodyEl.clientHeight >= bodyEl.scrollHeight - 1;
      if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) e.preventDefault();
    }, { passive: false });

    /* ── Textarea auto-grow (up to 4 lines) + send button enable ── */
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 96) + 'px';
      sendBtn.disabled = !inputEl.value.trim();
    });
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    sendBtn.addEventListener('click', handleSend);

    /* ── Body-level click delegation — quick cards, pills, handoff,
       lead-form; UI.render() dhorar por abar attach korte hoy tai
       function-e rakha ── */
    function attachBodyHandlers() {
      bodyEl.querySelectorAll('[data-topic]').forEach((el) => {
        el.addEventListener('click', () => onQuickAction(el.dataset.topic, el.querySelector('.sca-card-title').textContent));
      });
      bodyEl.querySelectorAll('[data-pill]').forEach((el) => {
        el.addEventListener('click', () => onPillClick(el.dataset.pill));
      });
      const showTopics = document.getElementById('sca-show-topics');
      if (showTopics) showTopics.addEventListener('click', () => State.set({ quickCardsCollapsed: false }));

      bodyEl.querySelectorAll('[data-handoff]').forEach((el) => {
        el.addEventListener('click', () => onHandoffAction(el.dataset.handoff, el.closest('.sca-handoff-card').dataset.msgId));
      });
      const lfSubmit = document.getElementById('sca-lf-submit');
      if (lfSubmit) lfSubmit.addEventListener('click', () => onLeadFormSubmit(lfSubmit.dataset.department, lfSubmit.closest('.sca-leadform').dataset.msgId));
    }

    /* ── Quick action card click ── */
    async function onQuickAction(topicKey, title) {
      State.pushMessage({ sender: 'user', type: 'text', text: title });
      State.set({ quickCardsCollapsed: true, typing: true });
      const result = AI.replyForTopic(topicKey);
      await settleReply(result);
    }

    async function onPillClick(pillLabel) {
      State.pushMessage({ sender: 'user', type: 'text', text: pillLabel });
      State.set({ quickCardsCollapsed: true, typing: true });
      const result = AI.replyForPill(pillLabel);
      await settleReply(result);
    }

    /* ── Free-text send ── */
    async function handleSend() {
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;

      const s = State.get();
      State.pushMessage({ sender: 'user', type: 'text', text });

      if (s.liveMode) {
        LiveChat.sendMessage(text);
        return;
      }

      State.set({ typing: true, quickCardsCollapsed: true });
      const history = s.messages.filter((m) => m.type === 'text').map((m) => ({ sender: m.sender, text: m.text }));
      const result = await AI.getReply(history, text, ctx);
      await settleReply(result, text);
    }

    /* ── AI reply eslei show kora, dorkar hole handoff card jog kora ── */
    async function settleReply(result, originalUserText) {
      // ektu delay — real typing feel-er jonno
      await new Promise((r) => setTimeout(r, 500));
      State.set({ typing: false });
      if (result.text) {
        State.pushMessage({ sender: 'ai', type: 'text', text: result.text });
      }
      if (result.handoff) {
        State.pushMessage({ sender: 'ai', type: 'handoff', meta: { state: 'pending', originalUserText: originalUserText || '' } });
      }
    }

    /* ── Human handoff card button ── */
    async function onHandoffAction(action, msgId) {
      if (action === 'dismiss') {
        const s = State.get();
        s.messages = s.messages.filter((m) => m.id !== msgId);
        State.pushMessage({ sender: 'ai', type: 'text', text: "Thik ache, ami e continue korchi. Ar jodi lage, jekhono 'Contact Expert' bolben." });
        return;
      }
      // action === 'start'
      const department = 'General Inquiry';
      const { needsForm, leadId, error } = await LiveChat.startHandoff(department);
      if (error) { State.pushMessage({ sender: 'ai', type: 'text', text: 'Connect korte problem hocche, ektu por abar try korun.' }); return; }

      if (needsForm) {
        const s = State.get();
        s.messages = s.messages.filter((m) => m.id !== msgId);
        State.pushMessage({ sender: 'ai', type: 'lead-form', meta: { department } });
        return;
      }

      finalizeHandoff(leadId, department, msgId);
    }

    async function onLeadFormSubmit(department, msgId) {
      const name = document.getElementById('sca-lf-name').value.trim();
      const email = document.getElementById('sca-lf-email').value.trim();
      const phone = document.getElementById('sca-lf-phone').value.trim();
      const errEl = document.getElementById('sca-lf-error');
      const btn = document.getElementById('sca-lf-submit');

      btn.disabled = true;
      const { leadId, error } = await LiveChat.submitLeadForm({ name, email, phone, department });
      if (error) {
        errEl.textContent = error.message || 'Kichu ekta bhul hoyeche, abar try korun.';
        btn.disabled = false;
        return;
      }
      finalizeHandoff(leadId, department, msgId);
    }

    function finalizeHandoff(leadId, department, msgId) {
      const s = State.get();
      s.messages = s.messages.filter((m) => m.id !== msgId);
      State.set({ liveMode: true, leadId });
      State.pushMessage({ sender: 'ai', type: 'handoff', meta: { state: 'connected' } });

      const lastUserMsg = [...s.messages].reverse().find((m) => m.sender === 'user' && m.type === 'text');
      LiveChat.sendInitialMessage(lastUserMsg ? lastUserMsg.text : `${department} niye help lagbe.`, department);
      LiveChat.subscribe(handleIncomingLiveMessage);
    }

    function handleIncomingLiveMessage(msg) {
      State.pushMessage({
        sender: 'ai', type: 'text', text: msg.message,
        meta: { label: msg.sender === 'admin' ? 'Scriptora Team' : 'Scriptora AI' },
      });
    }
  }

})();
