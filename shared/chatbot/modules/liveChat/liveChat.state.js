/* ================================================================
   SAVE AT: shared/chatbot/modules/liveChat/liveChat.state.js
   Live Chat module-er nijer state slice — global State.modules.liveChat-er
   upor ekta thin wrapper (same rule ai.state.js follow kore: "modules
   read/write ONLY their own key"). Kono onno module-er state ekhane
   chhoy na.

   view lifecycle (module.js ei values set korবে):
     'idle'        — module load hoyeche kintu ekhono kono handoff shuru hoyni
     'precontact'  — name/email/phone/department form dekhano hocche
     'queue'       — lead toiri hoye geche, admin accept-er opekkhay
     'chat'        — admin assign hoye geche, realtime message thread active
     'feedback'    — chat close hoyeche, rating/comment card dekhano hocche
   ================================================================ */

import { State } from '../../core/state.js';

const KEY = 'liveChat';

function get() {
  return State.getModuleState(KEY);
}

function set(patch) {
  State.setModuleState(KEY, patch);
}

/* First activate-e ekbar-i call hoy — already initialized thakle
   (session restore-er por) abar overwrite kore na, ai.state.js-er
   init()-er moto-i guard. */
function init() {
  if (!get().initialized) {
    set({
      initialized: true,
      view: 'idle',
      leadId: null,
      queuePosition: null,
      assignedAdminId: null,
      assignedAdminName: null,
      adminTyping: false,
      adminOnline: null,      // null = ekhono jana jayni, roster presence report korle true/false hobe
      feedbackSubmitted: false,
    });
  }
}

/* Ekta pura session (precontact → queue → chat → feedback) shesh hoye
   'ai'-e ferot jaoar por, porer notun handoff-er jonno fresh obosthay
   ferot ante — `initialized` bad diye baki shob field reset hoy. */
function reset() {
  set({
    view: 'idle',
    leadId: null,
    queuePosition: null,
    assignedAdminId: null,
    assignedAdminName: null,
    adminTyping: false,
    adminOnline: null,
    feedbackSubmitted: false,
  });
}

export const LiveChatState = { get, set, init, reset };
