/* ================================================================
   SCRIPTORA CHATBOT V2 — main.js (BOOTSTRAP LAYER)

   NAMING NOTE: the requested flow diagram labels this step
   "chatWidget.js (Bootstrap)". It is named `main.js` here instead,
   because `shared/chatbot/chatWidget.js` already exists as a legacy
   file and Task 5 requires every legacy file to stay untouched —
   renaming or overwriting it would violate that. `main.js` is the V2
   entry point; conceptually it *is* the "chatWidget.js (Bootstrap)"
   box in the diagram.

   This file is the ONLY place that wires the independent pieces
   together. Nothing here contains business logic — it only:
     1. Restores session (before mount, so first render reflects it)
     2. Mounts the persistent shell
     3. Registers enabled modules (lazy dynamic import loaders)
     4. Connects the shell's input bar to the router
     5. Activates the initial module (restored, or 'ai' by default)

   Startup flow implemented below:
     Browser
       -> main.js (this file)
       -> config.js            (Config)
       -> core/session.js       (Session.init + Session.restore)
       -> core/state.js          (State — read by session/router)
       -> core/eventBus.js        (EventBus — wired to shell input)
       -> core/widgetShell.js      (WidgetShell.mount)
       -> core/router.js            (Router.register)
       -> dynamic import(ai.module.js)   (lazy, only on first activate)
       -> Router.activate('ai')
       -> READY

   Usage (per page, add before </body>):
     <script type="module" src="../shared/chatbot/main.js"></script>
   ================================================================ */

import { Config } from './config.js';
import { Session } from './core/session.js';
import { State } from './core/state.js';
import { EventBus } from './core/eventBus.js';
import { WidgetShell } from './core/widgetShell.js';
import { Router } from './core/router.js';

function isWithinBusinessHours() {
  const { timezone, startHour, endHour } = Config.businessHours;
  const hour = parseInt(
    new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }),
    10
  );
  return hour >= startHour && hour < endHour;
}

/* Every enabled module gets one line here — a lazy loader function,
   never an eager import. Adding a future module (liveChat, orders,
   pricing, ...) only ever means adding one more line in this list;
   no core file changes. */
function registerModules() {
  if (Config.modules.ai.enabled) {
    Router.register('ai', () => import('./modules/ai/ai.module.js'), Config.modules.ai);
  }
  if (Config.modules.liveChat.enabled) {
    Router.register('liveChat', () => import('./modules/liveChat/liveChat.module.js'), Config.modules.liveChat);
  }
}

async function bootstrap() {
  /* 1. Session — restore BEFORE mounting, so the very first render
        (once a module activates) already reflects any prior state. */
  Session.init();
  const restored = Session.restore();

  /* 2. Mount the persistent shell (header/panel/input). Returns null
        on excluded pages (payment/checkout/admin per config) — in
        that case there is nothing further to wire up. */
  const refs = WidgetShell.mount({
    baseUrl: Config.baseUrl,
    excludedPages: Config.excludedPages,
  });
  if (!refs) {
    console.info('[Scriptora Chatbot V2] excluded page — bootstrap stopped after shell mount check.');
    return;
  }

  /* 3. Register modules per config (no eager imports happen yet —
        only when Router.activate() is actually called for a key). */
  registerModules();

  /* 4. Handoff bridge — the ONLY place 'handoff.request' is translated
        into the generic 'router:activate' event that router.js already
        understands. This line is the entire bridge:
          - ai.module.js emits 'handoff.request' and has no idea what
            handles it, or that LiveChat exists at all.
          - router.js only ever understands 'router:activate' + a key —
            it has no idea LiveChat exists either; it's still completely
            generic, same as before Phase 4.
        main.js is the one place allowed to know both event names, since
        wiring independent pieces together is exactly what main.js is
        for (see file header). Nothing here is business logic — it's a
        one-line translation, not a decision. */
  EventBus.on('handoff.request', (payload) => {
    EventBus.emit('router:activate', { key: 'liveChat', payload });
  });

  /* 5. Persistent input bar -> EventBus -> Router -> active module.
        widgetShell.js emits 'shell:input'; router.js already
        subscribes to it internally, so this line just documents the
        connection point — no duplicate wiring needed here. */
  // (intentionally no additional EventBus.on('shell:input', ...) here —
  //  core/router.js already owns that subscription.)

  /* 6. Decide + activate the initial module: resume the restored
        active module if it's registered/enabled, otherwise default
        to 'ai'. */
  const restoredKey = restored ? State.get().activeModule : null;
  const initialKey = (restoredKey && Router.isEnabled(restoredKey)) ? restoredKey : 'ai';
  await Router.activate(initialKey);

  /* 7. Shared shell chrome that doesn't belong to any one module. */
  WidgetShell.setStatus(isWithinBusinessHours());

  /* Session persistence itself needs no wiring here — session.js
     subscribes to every State change internally (see Session.init())
     and debounced-saves automatically. */

  EventBus.emit('app:ready', { initialModule: initialKey });
  console.info('[Scriptora Chatbot V2] ready — active module:', initialKey);

  /* ── Global bridge — non-module pages (e.g. thesis-writing.html) এর
        জন্য, যেখানে EventBus import করা সম্ভব না।
        Usage:
          window.scriptoraChat.open()                   // widget খোলে
          window.scriptoraChat.openLiveChat()           // widget খোলে + liveChat activate করে
   ── */
  window.scriptoraChat = {
    open() {
      WidgetShell.open();
    },
    openLiveChat() {
      WidgetShell.open();
      /* Shell open হওয়ার পর liveChat activate করো */
      setTimeout(() => {
        EventBus.emit('router:activate', { key: 'liveChat' });
      }, 120);
    },
  };
}

if (document.readyState !== 'loading') bootstrap();
else document.addEventListener('DOMContentLoaded', bootstrap);
