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

    <div class="sc-footer-brand">
      <a class="sc-footer-logo" href="${homePath}index.html">
        <div class="sc-logo-icon">S</div>
        Scriptora
      </a>
      <p class="sc-footer-tagline">বাংলাদেশের বিশ্বস্ত Academic Writing Service — Professional, Confidential, On-Time.</p>
      <div class="sc-footer-socials">
        <a href="https://t.me/scriptora" class="sc-social-btn" title="Telegram" target="_blank" rel="noopener">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </a>
        <a href="#" class="sc-social-btn" title="Facebook">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
        <a href="mailto:hello@scriptora.com" class="sc-social-btn" title="Email">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </a>
      </div>
    </div>

    <div class="sc-footer-col">
      <div class="sc-footer-col-title">Services</div>
      <a href="#">Thesis Writing</a>
      <a href="#">Assignment Writing</a>
      <a href="#">Research Paper</a>
      <a href="#">Proofreading</a>
      <a href="#">Formatting</a>
      <a href="#">SPSS Analysis</a>
    </div>

    <div class="sc-footer-col">
      <div class="sc-footer-col-title">Quick Links</div>
      <a href="${homePath}index.html">Home</a>
      <a href="#">Pricing</a>
      <a href="#">Samples</a>
      <a href="#">Reviews</a>
      <a href="#">FAQ</a>
      <a href="#">Contact</a>
    </div>

    <div class="sc-footer-col">
      <div class="sc-footer-col-title">Contact</div>
      <a href="https://t.me/scriptora" class="sc-footer-contact-item" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
        Telegram
      </a>
      <a href="#" class="sc-footer-contact-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Facebook Page
      </a>
      <a href="mailto:hello@scriptora.com" class="sc-footer-contact-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        hello@scriptora.com
      </a>
    </div>

  </div>

  <div class="sc-footer-bottom">
    <div class="sc-footer-bottom-left">© 2026 Scriptora. All rights reserved. Developed by Yeasin Kabir Shifat</div>
    <div class="sc-footer-bottom-right">
      <a href="#">Privacy Policy</a>
      <span>·</span>
      <a href="#">Terms of Service</a>
    </div>
  </div>
</footer>`;

  /* ── Footer CSS ── */
  const footerCSS = `
.sc-footer { background: #060d1f; border-top: 0.5px solid rgba(255,255,255,0.07); }
.sc-footer-top {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.2fr;
  gap: 3rem;
  padding: 3.5rem 4rem;
  max-width: 1200px;
  margin: 0 auto;
}
.sc-footer-logo {
  display: inline-flex; align-items: center; gap: 10px;
  font-weight: 700; font-size: 18px; color: white;
  text-decoration: none; margin-bottom: 1rem;
}
.sc-logo-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: linear-gradient(135deg, #0eb6d7, #0891b2);
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 16px; color: white;
}
.sc-footer-tagline { font-size: 13px; color: rgba(255,255,255,0.42); line-height: 1.75; margin-bottom: 1.4rem; max-width: 260px; }
.sc-footer-socials { display: flex; gap: 10px; }
.sc-social-btn {
  width: 36px; height: 36px; border-radius: 9px;
  background: rgba(255,255,255,0.07); border: 0.5px solid rgba(255,255,255,0.12);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.6); text-decoration: none;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.sc-social-btn:hover { background: rgba(45,110,247,0.2); border-color: rgba(45,110,247,0.45); color: #60a5fa; }
.sc-footer-col { display: flex; flex-direction: column; }
.sc-footer-col-title {
  font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9);
  letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 1.1rem;
}
.sc-footer-col a { font-size: 13.5px; color: rgba(255,255,255,0.45); text-decoration: none; padding: 5px 0; transition: color 0.2s; }
.sc-footer-col a:hover { color: rgba(255,255,255,0.85); }
.sc-footer-contact-item { display: flex !important; align-items: center; gap: 9px; }
.sc-footer-bottom {
  border-top: 0.5px solid rgba(255,255,255,0.07);
  padding: 1.3rem 4rem;
  display: flex; justify-content: space-between; align-items: center;
  max-width: 1200px; margin: 0 auto;
}
.sc-footer-bottom-left { font-size: 12.5px; color: rgba(255,255,255,0.3); }
.sc-footer-bottom-right { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: rgba(255,255,255,0.3); }
.sc-footer-bottom-right a { color: rgba(255,255,255,0.3); text-decoration: none; transition: color 0.2s; }
.sc-footer-bottom-right a:hover { color: rgba(255,255,255,0.65); }

@media (max-width: 900px) {
  .sc-footer-top { grid-template-columns: 1fr 1fr; gap: 2rem; padding: 2.5rem 1.5rem; }
  .sc-footer-brand { grid-column: 1 / -1; }
  .sc-footer-tagline { max-width: 100%; }
}
@media (max-width: 768px) {
  .sc-footer-top { grid-template-columns: 1fr 1fr; gap: 1.2rem 2rem; padding: 1.8rem 1.2rem; }
  .sc-footer-brand { grid-column: 1 / -1; }
  .sc-footer-tagline { font-size: 12px; margin-bottom: 0.8rem; max-width: 100%; }
  .sc-footer-socials { justify-content: flex-start; }
  .sc-footer-col-title { font-size: 11px; margin-bottom: 0.6rem; }
  .sc-footer-col a { font-size: 12.5px; padding: 3px 0; }
  .sc-footer-col:last-child { grid-column: 1 / -1; display: flex; flex-direction: row; flex-wrap: wrap; gap: 0 1.5rem; align-items: center; }
  .sc-footer-col:last-child .sc-footer-col-title { width: 100%; }
  .sc-footer-bottom { flex-direction: column; gap: 4px; text-align: center; padding: 0.9rem 1.2rem; }
}

/* ── Light mode overrides ── */
[data-theme="light"] .sc-footer {
  background: #dff0f8;
  border-top: 0.5px solid rgba(0,0,0,0.08);
}
[data-theme="light"] .sc-footer-logo { color: #0f172a; }
[data-theme="light"] .sc-footer-tagline { color: rgba(15,23,42,0.5); }
[data-theme="light"] .sc-social-btn {
  background: rgba(0,0,0,0.05);
  border: 0.5px solid rgba(0,0,0,0.12);
  color: rgba(15,23,42,0.55);
}
[data-theme="light"] .sc-social-btn:hover {
  background: rgba(17,181,217,0.12);
  border-color: rgba(17,181,217,0.4);
  color: #0891b2;
}
[data-theme="light"] .sc-footer-col-title { color: #0f172a; }
[data-theme="light"] .sc-footer-col a { color: rgba(15,23,42,0.5); }
[data-theme="light"] .sc-footer-col a:hover { color: #0f172a; }
[data-theme="light"] .sc-footer-bottom {
  border-top: 0.5px solid rgba(0,0,0,0.08);
}
[data-theme="light"] .sc-footer-bottom-left { color: rgba(15,23,42,0.38); }
[data-theme="light"] .sc-footer-bottom-right { color: rgba(15,23,42,0.38); }
[data-theme="light"] .sc-footer-bottom-right a { color: rgba(15,23,42,0.38); }
[data-theme="light"] .sc-footer-bottom-right a:hover { color: rgba(15,23,42,0.7); }`;

  /* ── Inject CSS ── */
  const style = document.createElement('style');
  style.textContent = footerCSS;
  document.head.appendChild(style);

  /* ── Inject Footer ── */
  document.addEventListener('DOMContentLoaded', function () {
    document.body.insertAdjacentHTML('beforeend', footerHTML);
  });

  /* If DOM already loaded */
  if (document.readyState !== 'loading') {
    document.body.insertAdjacentHTML('beforeend', footerHTML);
  }
})();
