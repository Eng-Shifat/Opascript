/* ================================================================
   SCRIPTORA CHATBOT V2 — core/state.js
   Global state store. Pure in-memory + pub/sub — NO direct
   sessionStorage/localStorage access here (session.js-er kaj eta).

   Shape (frozen per architecture review):
     currentUser    — null (visitor) | { id, name, email, type: 'client' }
     activeModule   — string key of the module currently owning the body
                      (set by router.js; null until Phase 3+)
     messages       — UI-visible thread only (what the user sees)
     conversation   — AI-only context: system prompts, hidden memory,
                      tool-call context. NEVER rendered directly to UI.
     notifications  — mirrors unread state for a header badge; the
                      notifications module owns fetching, this is
                      just the shared shape other parts can read
     modules        — namespaced per-module state, e.g.
                      modules.liveChat = { leadId, liveMode }
                      modules.pricing  = { selectedPackage, progress }
                      Modules read/write ONLY their own key here —
                      never another module's.
   ================================================================ */

const listeners = new Set();

const state = {
  currentUser: null,
  activeModule: null,
  messages: [],
  conversation: [],
  notifications: [],
  modules: {},
};

function get() {
  return state;
}

/* Top-level field patch — currentUser, activeModule, notifications, etc.
   Never use this to write into `modules` — use setModuleState instead,
   so one module can't accidentally clobber another's slice. */
function set(patch) {
  if ('modules' in patch) {
    console.warn('[State] use setModuleState(key, patch) instead of set({ modules }) directly.');
    delete patch.modules;
  }
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

function pushConversationEntry(entry) {
  state.conversation.push(Object.assign({ ts: Date.now() }, entry));
  emit();
}

function getModuleState(key) {
  return state.modules[key] || {};
}

function setModuleState(key, patch) {
  state.modules[key] = Object.assign({}, state.modules[key], patch);
  emit();
}

/* session.js restore-er jonno — pura state ekbare replace kore, kono
   emit-loop chinta na kore. Onno kothao use kora uchit na. */
function replaceAll(partial) {
  Object.assign(state, partial);
  emit();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => {
    try { fn(state); } catch (e) { console.error('[State] listener error', e); }
  });
}

export const State = {
  get, set, pushMessage, pushConversationEntry,
  getModuleState, setModuleState, replaceAll, subscribe,
};
