/* ═══════════════════════════════════════════════════════════
   SCRIPTORA — Auth Guard (authGuard.js)

   Protected page এ এটা add করলে login না থাকলে
   automatically Register page এ redirect করবে।

   Usage (HTML এ supabaseClient.js এর পরে):
   <script src="../shared/authGuard.js"></script>

   Optional — login থাকলে redirect করতে:
   <script src="../shared/authGuard.js" data-redirect-if-logged-in="../Client Dashboard/dashboard.html"></script>
═══════════════════════════════════════════════════════════ */

(function () {

  /* Register page এর path — সব page থেকে relative */
  const REGISTER_PATH = '../Register page/register.html';
  const LOGIN_PATH    = '../Login page/login.html';

  /* Page টা কোথায় আছে সেটা detect করে সঠিক path বানাই */
  function getPath(relativePath) {
    /* order.html, payment.html এ কাজ করবে */
    return relativePath;
  }

  /* Current URL কে param হিসেবে pass করি যাতে login এর পরে ফিরে আসতে পারে */
  function redirectToRegister() {
    /* Return URL sessionStorage এ save করি */
    sessionStorage.setItem('scriptora_return_url', window.location.href);
    window.location.href = REGISTER_PATH;
  }

  async function checkAuth() {
    const sb = window.scriptoraSupabase;

    /* Supabase client না থাকলে wait করি */
    if (!sb) {
      setTimeout(checkAuth, 100);
      return;
    }

    try {
      const { data: { session } } = await sb.auth.getSession();

      if (!session) {
        /* Login নেই — Register page এ পাঠাও */
        redirectToRegister();
        return;
      }

      /* Login আছে — localStorage এ client_id store করি (order.js compatibility) */
      localStorage.setItem('scriptora_client_id', session.user.id);

      /* data-redirect-if-logged-in check */
      const scriptTag = document.querySelector('script[src*="authGuard"]');
      const loggedInRedirect = scriptTag?.getAttribute('data-redirect-if-logged-in');
      if (loggedInRedirect) {
        window.location.href = loggedInRedirect;
      }

    } catch (e) {
      /* Error হলেও Register এ পাঠাও */
      redirectToRegister();
    }
  }

  /* Page load হওয়ার সাথে সাথে check */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }

  /* ── SESSION TIMEOUT — 30 মিনিট inactive হলে auto logout ── */
  const TIMEOUT_MS = 30 * 60 * 1000; // 30 মিনিট
  let timeoutTimer = null;

  function resetTimer() {
    clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(async () => {
      const sb = window.scriptoraSupabase;
      if (sb) await sb.auth.signOut({ scope: 'local' });
      localStorage.removeItem('scriptora_role');
      localStorage.removeItem('scriptora_email');
      localStorage.removeItem('scriptora_client_id');
      sessionStorage.setItem('scriptora_timeout', '1');
      window.location.href = LOGIN_PATH;
    }, TIMEOUT_MS);
  }

  /* User activity এ timer reset করো */
  ['click','mousemove','keydown','scroll','touchstart'].forEach(evt => {
    document.addEventListener(evt, resetTimer, { passive: true });
  });

  /* প্রথমবার start করো */
  resetTimer();

})();
