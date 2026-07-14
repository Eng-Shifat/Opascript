/* ================================================================
   SCRIPTORA CHATBOT V2 — core/router.js
   Kon module ekhon body-r content "own" kore ta thik kore, ar
   feature module-gulo lazy-load kore — register() shudhu ekta
   loader function rekhe dey, activate() na hoya porjonto kono
   dynamic import() call hoy na.

   Module contract (Phase 3+ e ei shape follow korte hobe):
     export default {
       async init({ State, EventBus }) { ... },   // ekbar-i, first activate-e
       activate(payload)   { ... },                 // protibar activate hole
       deactivate()         { ... },                 // onno module active hole
       handleInput(text)     { ... },                 // input bar theke text ashle
     }
   ================================================================ */

import { State } from './state.js';
import { EventBus } from './eventBus.js';

const registry = new Map();       // key -> { loader, enabled }
const loadedModules = new Map();  // key -> resolved module instance (cached — lazy load ekbar-i)

/* config.js theke ashbe: { ai: { enabled: true }, liveChat: { enabled: true }, ... } */
function register(key, loader, options = {}) {
  registry.set(key, { loader, enabled: options.enabled !== false });
}

function isEnabled(key) {
  const entry = registry.get(key);
  return !!entry && entry.enabled;
}

async function activate(key, payload) {
  const entry = registry.get(key);
  if (!entry) { console.warn(`[Router] "${key}" is not registered.`); return null; }
  if (!entry.enabled) { console.warn(`[Router] "${key}" is disabled in config.`); return null; }

  let mod = loadedModules.get(key);
  if (!mod) {
    const imported = await entry.loader(); // <- lazy load happens HERE, first time only
    mod = imported.default || imported;
    loadedModules.set(key, mod);
    if (typeof mod.init === 'function') await mod.init({ State, EventBus });
    EventBus.emit('module:loaded', { key });
  }

  const previousKey = State.get().activeModule;
  if (previousKey && previousKey !== key) {
    const previousMod = loadedModules.get(previousKey);
    if (previousMod && typeof previousMod.deactivate === 'function') previousMod.deactivate();
  }

  State.set({ activeModule: key });
  if (typeof mod.activate === 'function') mod.activate(payload);
  EventBus.emit('router:changed', { key, payload });
  return mod;
}

function currentModule() {
  const key = State.get().activeModule;
  return key ? loadedModules.get(key) || null : null;
}

/* widgetShell.js input bar theke ashe emit('shell:input', text) diye —
   router shudhu shei muhurte-r active module-e forward kore. */
function forwardInput(text) {
  const mod = currentModule();
  if (mod && typeof mod.handleInput === 'function') return mod.handleInput(text);
  console.warn('[Router] no active module can handle input right now.');
}

EventBus.on('router:activate', ({ key, payload } = {}) => activate(key, payload));
EventBus.on('shell:input', forwardInput);

export const Router = { register, isEnabled, activate, currentModule, forwardInput };
