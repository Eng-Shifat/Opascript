/* ═══════════════════════════════════════════════════════════
   SCRIPTORA — Production Console Suppressor
   
   Localhost এ console.log কাজ করবে (debugging এর জন্য)
   Live site এ সব console output বন্ধ থাকবে
═══════════════════════════════════════════════════════════ */

(function () {
  const isLocal = window.location.hostname === 'localhost' 
    || window.location.hostname === '127.0.0.1'
    || window.location.hostname.startsWith('192.168.');

  if (!isLocal) {
    const noop = () => {};
    window.console = {
      ...window.console,
      log:   noop,
      debug: noop,
      info:  noop,
      warn:  noop,
      /* error রাখো — critical error দেখা দরকার */
      error: window.console.error.bind(window.console),
    };
  }
})();
