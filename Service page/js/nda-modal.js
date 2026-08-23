/* ═══════════════════════════════════════════════════
   NDA Modal — Opascript
   Universal confidentiality policy modal.
   Compatible with all Opascript service pages.
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  var backdrop   = null;
  var triggerEl  = null; // element that opened the modal (for focus return)

  function init() {
    backdrop = document.getElementById('opNdaBackdrop');
    if (!backdrop) return;

    // Outside-click closes
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) opCloseNDA();
    });

    // ESC closes
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop.classList.contains('active')) {
        opCloseNDA();
      }
    });
  }

  function opOpenNDA(callerEl) {
    if (!backdrop) return;
    triggerEl = callerEl || document.activeElement || null;
    backdrop.classList.remove('closing');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Move focus into modal (close button)
    var closeBtn = backdrop.querySelector('.op-nda-close');
    if (closeBtn) {
      setTimeout(function () { closeBtn.focus(); }, 50);
    }
  }

  function opCloseNDA() {
    if (!backdrop) return;
    backdrop.classList.add('closing');
    setTimeout(function () {
      backdrop.classList.remove('active', 'closing');
      document.body.style.overflow = '';

      // Return focus to the element that opened the modal
      if (triggerEl && typeof triggerEl.focus === 'function') {
        triggerEl.focus();
      }
    }, 220);
  }

  // Expose globally so onclick attributes can reach them
  window.opOpenNDA  = opOpenNDA;
  window.opCloseNDA = opCloseNDA;

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
