/* ================================================================
   SAVE AT: shared/chatbot/modules/ai/ai.state.js
   AI module-er nijer state slice — global State.modules.ai-er upor
   ekta thin wrapper (Phase 1 architecture rule: "modules read/write
   ONLY their own key"). Kono onno module-er state ekhane chhoy na.
   ================================================================ */

import { State } from '../../core/state.js';

const KEY = 'ai';

function get() {
  return State.getModuleState(KEY);
}

function set(patch) {
  State.setModuleState(KEY, patch);
}

/* First activate-e ekbar-i call hoy — already initialized thakle
   (session restore-er por) abar overwrite kore na. */
function init() {
  if (!get().initialized) {
    set({
      initialized: true,
      greeted: false,
      quickCardsCollapsed: false,
      typing: false,
      lastIntent: null,
    });
  }
}

function reset() {
  set({ greeted: false, quickCardsCollapsed: false, typing: false, lastIntent: null });
}

export const AiState = { get, set, init, reset };
