/*================================
   SCRIPTORA — shared/theme.js
   থিম টগল (Dark/Light) + localStorage-এ সংরক্ষণ
   ================================*/

(function () {

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyIcon(btn) {
    if (!btn) return;
    btn.textContent = currentTheme() === 'light' ? '🌙' : '☀️';
    btn.setAttribute('aria-label', currentTheme() === 'light' ? 'ডার্ক মোডে যান' : 'লাইট মোডে যান');
  }

  // থিম টগল করার ফাংশন — বাটনের onclick থেকে কল হবে
  window.scriptoraToggleTheme = function () {
    const html = document.documentElement;
    const next = currentTheme() === 'light' ? 'dark' : 'light';

    if (next === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      html.removeAttribute('data-theme');
    }
    localStorage.setItem('scriptora_theme', next);

    applyIcon(document.getElementById('theme-toggle'));
  };

  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      applyIcon(btn);
      btn.addEventListener('click', window.scriptoraToggleTheme);
    }
  });

})();
