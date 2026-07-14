/* ================================================================
   SCRIPTORA CHATBOT V2 — core/eventBus.js
   Shudhu-matro ei file diye module-to-module communication hobe.
   Kono module onno kono module-ke shorasori import/call korbe na —
   shob shomoy emit/on diye, ei bus-er madhome.

   Convention (namespaced event names, colon-separated):
     'shell:opened' / 'shell:closed' / 'shell:input'
     'router:activate' / 'router:changed'
     'module:loaded'
     'handoff:request' / 'handoff:started'
     ...ityadi — notun module nijer namespace use korbe, jate
     event-name collision na hoy.
   ================================================================ */

const handlers = new Map(); // event -> Set<fn>

function on(event, fn) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(fn);
  return () => off(event, fn);
}

function off(event, fn) {
  const set = handlers.get(event);
  if (set) set.delete(fn);
}

function once(event, fn) {
  const unsub = on(event, (payload) => {
    unsub();
    fn(payload);
  });
  return unsub;
}

function emit(event, payload) {
  const set = handlers.get(event);
  if (!set || set.size === 0) return;
  // Snapshot before iterating — ekta handler nijei off() korle, live
  // Set-er upor iterate korle skip hoye jete pare.
  [...set].forEach((fn) => {
    try { fn(payload); } catch (e) { console.error(`[EventBus] handler for "${event}" threw:`, e); }
  });
}

function clear(event) {
  if (event) handlers.delete(event);
  else handlers.clear();
}

export const EventBus = { on, off, once, emit, clear };
