/* ================================================================
   SCRIPTORA — chatbot/state.js
   Chat state (single source of truth) — messages, mode, view.

   Onno file (ui.js, ai.js, liveChat.js, chatWidget.js) shob eikhan
   theke state porbe/lekhbe. Kono direct DOM access ekhane nei —
   sudhu data + pub/sub.
   ================================================================ */

window.ScriptoraChatState = (function () {

  const listeners = [];

  const state = {
    mode: 'guest',          // 'guest' | 'auth'
    view: 'welcome',        // 'welcome' | 'conversation'
    messages: [],           // { id, sender: 'ai'|'user'|'system', type: 'text'|'handoff'|'quick-replies', text, meta }
    typing: false,
    liveMode: false,        // true = human handoff active, input row human-e route hobe
    leadId: null,           // website_chat_leads.id (liveMode true hole thake)
    quickCardsCollapsed: false,
  };

  function get() {
    return state;
  }

  function set(patch) {
    Object.assign(state, patch);
    emit();
  }

  function pushMessage(msg) {
    const withId = Object.assign(
      { id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), ts: Date.now() },
      msg
    );
    state.messages.push(withId);
    emit();
    return withId;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  }

  function emit() {
    listeners.forEach((fn) => {
      try { fn(state); } catch (e) { console.error('[Scriptora Chat] listener error', e); }
    });
    persist();
  }

  /* ── Session persistence — panel bondho kore onno page-e gele o
     thread mone thake ("AI memory" — spec section 9) ── */
  const STORAGE_KEY = 'scw_v2_thread';

  function persist() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        view: state.view,
        messages: state.messages,
        liveMode: state.liveMode,
        leadId: state.leadId,
        quickCardsCollapsed: state.quickCardsCollapsed,
      }));
    } catch (e) { /* storage full/blocked — silently ignore */ }
  }

  function restore() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      Object.assign(state, saved);
      return state.messages.length > 0;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    state.view = 'welcome';
    state.messages = [];
    state.typing = false;
    state.liveMode = false;
    state.leadId = null;
    state.quickCardsCollapsed = false;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
    emit();
  }

  return { get, set, pushMessage, subscribe, restore, reset };

})();
