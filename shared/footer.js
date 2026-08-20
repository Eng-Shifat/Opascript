/* ================================================================
   SCRIPTORA — shared/footer.js
   Usage: <script src="../shared/footer.js"></script>
   (Pricing page থেকে: ../shared/footer.js)
   ================================================================ */

(function () {
  /* ── Detect relative path based on depth ── */
  const scripts = document.getElementsByTagName('script');
  const thisScript = scripts[scripts.length - 1];
  const scriptSrc  = thisScript ? thisScript.src : '';

  /* shared/ folder এর path বের করো */
  const sharedPath = scriptSrc.replace('footer.js', '');
  /* shared/ থেকে Homepage এর relative path */
  const homePath = sharedPath + '../Homepage/';

  /* ── Footer HTML ── */
  const footerHTML = `
<footer class="sc-footer">

  <div class="sc-footer-top">

    <!-- Brand column -->
    <div class="sc-footer-brand">
      <a class="sc-footer-logo" href="${homePath}index.html">
        <img src="${homePath}assets/logo.png" alt="Opascript" style="height:36px;width:auto;object-fit:contain;">
        Opascript
      </a>

      <p class="sc-footer-tagline">
        <span class="sc-ft-headline">শিক্ষার্থীদের কথা মাথায় রেখে গড়া —<br>World-Class Academic Writing Partner।</span>
        Thesis, Research Paper, Assignment থেকে Proofreading পর্যন্ত — BBA, MBA, CSE, NFE সহ সকল বিভাগের শিক্ষার্থীদের জন্য আমরা কাজ করি। প্রতিটি কাজ সম্পূর্ণ Original, ১০০% Confidential এবং সময়মতো Delivered।
        <span class="sc-ft-italic">আপনার ক্যারিয়ার গড়ার পথে Opascript — সবসময় পাশে।</span>
      </p>


      <!-- Socials -->
      <div class="sc-footer-socials">
        <a href="https://www.facebook.com/opascript" class="sc-social-btn" title="Facebook" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </a>
        <a href="mailto:hello@opascript.com" class="sc-social-btn" title="Email">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </a>
      </div>
    </div>

    <!-- Services -->
    <div class="sc-footer-col">
      <div class="sc-footer-col-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Services
      </div>
      <a href="#">Thesis Writing</a>
      <a href="#">Assignment Writing</a>
      <a href="#">Research Paper</a>
      <a href="#">Proofreading</a>
      <a href="#">Formatting</a>
      <a href="#">SPSS Analysis</a>
    </div>

    <!-- Quick Links -->
    <div class="sc-footer-col">
      <div class="sc-footer-col-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        Quick Links
      </div>
      <a href="${homePath}index.html">Home</a>
      <a href="#">Pricing</a>
      <a href="#">Samples</a>
      <a href="#">Reviews</a>
      <a href="#">FAQ</a>
      <a href="#">Contact</a>
    </div>

    <!-- Contact -->
    <div class="sc-footer-col">
      <div class="sc-footer-col-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Contact
      </div>
      <a href="https://www.facebook.com/opascript" target="_blank" rel="noopener" class="sc-footer-contact-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Facebook Page
      </a>
      <a href="mailto:hello@opascript.com" class="sc-footer-contact-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        hello@opascript.com
      </a>
    </div>

  </div>

  <!-- Divider -->
  <div class="sc-footer-divider"></div>

  <div class="sc-footer-bottom">
    <div class="sc-footer-bottom-left">© 2026 Opascript. All rights reserved. Developed by Yeasin Kabir Shifat</div>
    <div class="sc-footer-bottom-right">
      <a href="#">Privacy Policy</a>
      <span>·</span>
      <a href="#">Terms of Service</a>
    </div>
  </div>

</footer>`;

  /* ── Footer CSS ── */
  const footerCSS = `
/* ════════════════════════════════════════
   Opascript — Shared Footer
════════════════════════════════════════ */
.sc-footer {
  background: #060d1f;
  border-top: 0.5px solid rgba(255,255,255,0.07);
  position: relative;
}


.sc-footer-top {
  display: grid;
  grid-template-columns: 2.2fr 1fr 1fr 1.3fr;
  gap: 3rem;
  padding: 3.5rem 4rem;
  max-width: 1280px;
  margin: 0 auto;
}

/* ── Brand ── */
.sc-footer-logo {
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 700; font-size: 18px; color: white;
  text-decoration: none; margin-bottom: 1.1rem;
}
.sc-footer-tagline {
  font-size: 13px;
  color: rgba(255,255,255,0.45);
  line-height: 1.85;
  margin-bottom: 1.2rem;
  max-width: 310px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sc-ft-headline {
  font-size: 14.5px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  line-height: 1.5;
}
.sc-ft-italic {
  font-style: italic;
  font-size: 12px;
  color: rgba(255,255,255,0.35);
}


/* Socials */
.sc-footer-socials { display: flex; gap: 8px; }
.sc-social-btn {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 0.5px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.5); text-decoration: none;
  transition: all .2s;
}
.sc-social-btn:hover {
  background: rgba(45,110,247,0.2);
  border-color: rgba(45,110,247,0.4);
  color: #60a5fa;
  transform: translateY(-2px);
}

/* ── Columns ── */
.sc-footer-col { display: flex; flex-direction: column; gap: 2px; }
.sc-footer-col-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700;
  color: rgba(255,255,255,0.9);
  letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 0.9rem;
}
.sc-footer-col-title svg { opacity: 0.5; }
.sc-footer-col a {
  font-size: 13px; color: rgba(255,255,255,0.42);
  text-decoration: none; padding: 4px 0;
  transition: color .18s, padding-left .18s;
  display: inline-flex; align-items: center; gap: 6px;
}
.sc-footer-col a:hover { color: rgba(255,255,255,0.85); padding-left: 4px; }
.sc-footer-contact-item { display: flex !important; align-items: center; gap: 8px; }


/* ── Divider + Bottom ── */
.sc-footer-divider {
  height: 0.5px;
  background: rgba(255,255,255,0.07);
  max-width: 1280px;
  margin: 0 auto;
}
.sc-footer-bottom {
  padding: 1.2rem 4rem;
  display: flex; justify-content: space-between; align-items: center;
  max-width: 1280px; margin: 0 auto;
}
.sc-footer-bottom-left { font-size: 12px; color: rgba(255,255,255,0.25); }
.sc-footer-bottom-right { display: flex; align-items: center; gap: 10px; font-size: 12px; color: rgba(255,255,255,0.25); }
.sc-footer-bottom-right a { color: rgba(255,255,255,0.25); text-decoration: none; transition: color .2s; }
.sc-footer-bottom-right a:hover { color: rgba(255,255,255,0.6); }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .sc-footer-top { grid-template-columns: 1.8fr 1fr 1fr 1.2fr; gap: 2rem; padding: 3rem 2.5rem; }
}
@media (max-width: 860px) {
  .sc-footer-top { grid-template-columns: 1fr 1fr; gap: 2rem 3rem; padding: 2.5rem 1.5rem; }
  .sc-footer-brand { grid-column: 1 / -1; }
  .sc-footer-tagline { max-width: 100%; }
}
@media (max-width: 560px) {
  .sc-footer-top { grid-template-columns: 1fr 1fr; gap: 1.5rem 2rem; padding: 2rem 1.2rem; }
  .sc-footer-brand { grid-column: 1 / -1; }
  .sc-ft-headline { font-size: 13.5px; }
  .sc-footer-tagline { font-size: 12.5px; max-width: 100%; }
  .sc-footer-col:last-child { grid-column: 1 / -1; }
  .sc-footer-bottom { flex-direction: column; gap: 5px; text-align: center; padding: 1rem 1.2rem; }
}
@media (max-width: 380px) {
  .sc-trust-badge { font-size: 10px; padding: 3px 8px; }
}

/* ── Light mode ── */
[data-theme="light"] .sc-footer { background: #e8f0fe; border-top: 0.5px solid rgba(0,0,0,0.08); }
[data-theme="light"] .sc-footer-logo { color: #0f172a; }
[data-theme="light"] .sc-ft-headline { color: rgba(15,23,42,0.9); }
[data-theme="light"] .sc-footer-tagline { color: rgba(15,23,42,0.5); }
[data-theme="light"] .sc-ft-italic { color: rgba(15,23,42,0.35); }
[data-theme="light"] .sc-social-btn { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.1); color: rgba(15,23,42,0.5); }
[data-theme="light"] .sc-footer-col-title { color: rgba(15,23,42,0.85); }
[data-theme="light"] .sc-footer-col a { color: rgba(15,23,42,0.45); }
[data-theme="light"] .sc-footer-col a:hover { color: rgba(15,23,42,0.85); }
[data-theme="light"] .sc-footer-divider { background: rgba(0,0,0,0.08); }
[data-theme="light"] .sc-footer-bottom-left { color: rgba(15,23,42,0.35); }
[data-theme="light"] .sc-footer-bottom-right a { color: rgba(15,23,42,0.35); }
[data-theme="light"] .sc-footer-bottom-right a:hover { color: rgba(15,23,42,0.7); }
`;
  /* ── Inject CSS ── */
  const style = document.createElement('style');
  style.textContent = footerCSS;
  document.head.appendChild(style);

  /* ── Inject Footer (once only) ── */
  function injectFooter() {
    if (document.querySelector('.sc-footer')) return;
    document.body.insertAdjacentHTML('beforeend', footerHTML);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooter);
  } else {
    injectFooter();
  }
})();
