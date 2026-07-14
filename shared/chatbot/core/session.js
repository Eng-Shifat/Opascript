/* ================================================================
   SCRIPTORA CHATBOT V2 — core/session.js
   Ekমাত্র ei file sessionStorage-e hat dey. state.js nijei kono
   storage chhuye na — eta module-gulor sathe onno kono connection
   thakle-o backend/API change korle state.js-e kono change lagbe na.

   Persist kora hoy: messages (UI thread), activeModule, modules
   (namespaced per-module slice — selected package, pricing progress,
   liveChat leadId shob ei slice-er moddhei automatically thake).

   Persist kora hoy NA: conversation (AI-only hidden context) —
   ইচ্ছাকৃতভাবে bad deওয়া, দেখুন state.js-er comment।
   ================================================================ */

import { State } from './state.js';

const STORAGE_KEY = 'scriptora_chat_session_v2';
const SESSION_ID_KEY = STORAGE_KEY + '_id';
const SAVE_DEBOUNCE_MS = 150;

let sessionId = null;
let saveTimer = null;
let unsubscribeState = null;

function getSessionId() {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
  } catch (e) {
    // storage blocked (private mode / disabled) — in-memory fallback,
    // ei tab-e e kaj chalabe, refresh-e r mone thakbe na
    sessionId = sessionId || 'sess_' + Date.now();
  }
  return sessionId;
}

function restore() {
  getSessionId();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    State.replaceAll({
      messages: Array.isArray(saved.messages) ? saved.messages : [],
      activeModule: saved.activeModule || null,
      modules: (saved.modules && typeof saved.modules === 'object') ? saved.modules : {},
    });
    return true;
  } catch (e) {
    console.warn('[Session] restore failed (corrupt or blocked storage):', e);
    return false;
  }
}

function persist() {
  try {
    const s = State.get();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages: s.messages,
      activeModule: s.activeModule,
      modules: s.modules,
    }));
  } catch (e) {
    // quota full / blocked — silently skip, chat UI-te kono effect nei
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, SAVE_DEBOUNCE_MS);
}

function clear() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
  } catch (e) { /* ignore */ }
  sessionId = null;
}

/* State-er je kono change-e auto-save subscribe kore — kono module-ke
   nijer state save korte alada kore call korte hobe na, jehetu shob
   e State.setModuleState()/pushMessage() diye-i jai. */
function init() {
  getSessionId();
  if (unsubscribeState) unsubscribeState();
  unsubscribeState = State.subscribe(scheduleSave);
}

export const Session = { init, restore, persist, clear, getSessionId };
