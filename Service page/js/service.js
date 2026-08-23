/* =====================================================
   SERVICE PAGE TEMPLATE — service.js
   Reusable across Thesis / Assignment / Research Proposal / SPSS / Proofreading
   Handles: FAQ accordion + Package tab switcher
   ===================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* -------- FAQ ACCORDION -------- */
  document.querySelectorAll('.svc-faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.svc-faq-item');
      item.classList.toggle('open');
    });
  });

  /* -------- PACKAGE TAB SWITCHER -------- */
  var ICON = {
    clock:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    infinity:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/></svg>',
    fileCheck:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>',
    userCheck:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
    fileText:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
    barChart:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    user:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    headphones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  };

  var svcPackages = {
    standard: {
      name: 'Standard',
      title: 'Standard Thesis Package',
      subtitle: 'A solid, well-researched thesis — on time.',
      price: '৳25,000',
      bestValue: "Great fit for Bachelor's students",
      features: [
        { icon: ICON.clock,      title: 'Delivery in 20 Days',   desc: 'Standard delivery timeline' },
        { icon: ICON.infinity,   title: '2 Free Revisions',      desc: 'Until requirements are met' },
        { icon: ICON.fileCheck,  title: 'AI Plagiarism Report',  desc: 'Included' },
        { icon: ICON.userCheck,  title: 'Human Quality Check',   desc: 'Manual review by our editors' },
        { icon: ICON.fileText,   title: 'Editable Source File',  desc: 'Fully editable MS Word file' },
      ],
    },
    recommended: {
      name: 'Recommended',
      title: 'Recommended Thesis Package',
      subtitle: 'Everything you need for a complete thesis — professionally done.',
      price: '৳35,000',
      bestValue: "Best value for Honours &amp; Master's students",
      features: [
        { icon: ICON.clock,      title: 'Delivery in 15 Days',        desc: 'Faster turnaround' },
        { icon: ICON.infinity,   title: '5 Free Revisions',           desc: 'Until you are satisfied' },
        { icon: ICON.fileCheck,  title: 'AI Plagiarism Report',       desc: 'Included' },
        { icon: ICON.userCheck,  title: 'AI + Human Quality Check',   desc: 'Dual-layer quality assurance' },
        { icon: ICON.fileText,   title: 'Editable Source File',       desc: 'Fully editable MS Word file' },
        { icon: ICON.barChart,   title: 'Progress Dashboard Access',  desc: 'Track progress in real-time' },
      ],
    },
    premium: {
      name: 'Premium',
      title: 'Premium Thesis Package',
      subtitle: 'Everything you need for a complete thesis — professionally done.',
      price: '৳45,000',
      bestValue: "Best value for Master's &amp; PhD students",
      features: [
        { icon: ICON.clock,      title: 'Delivery in 10 Days',            desc: 'Guaranteed on-time delivery' },
        { icon: ICON.infinity,   title: 'Unlimited Revisions',            desc: 'Until you are 100% satisfied' },
        { icon: ICON.fileCheck,  title: 'AI Plagiarism Report',           desc: 'Included' },
        { icon: ICON.userCheck,  title: 'AI + Human Quality Check',       desc: 'Dual-layer quality assurance' },
        { icon: ICON.fileText,   title: 'Editable Source File',           desc: 'Fully editable MS Word file' },
        { icon: ICON.barChart,   title: 'Progress Dashboard Access',      desc: 'Track progress in real-time' },
        { icon: ICON.user,       title: '1-on-1 Expert Consultation',     desc: 'Direct support from your expert' },
        { icon: ICON.headphones, title: 'Priority Support',               desc: 'Get faster response always' },
      ],
    }
  };

  var svcTabs        = document.querySelectorAll('.svc-tab');
  var svcTitleEl      = document.getElementById('svc-pkg-title');
  var svcSubtitleEl   = document.getElementById('svc-pkg-subtitle');
  var svcPriceEl      = document.getElementById('svc-pkg-price');
  var svcBestValueEl  = document.getElementById('svc-pkg-bestvalue-text');
  var svcFeaturesEl   = document.getElementById('svc-pkg-features');
  var svcOrderTextEl  = document.getElementById('svc-pkg-order-text');

  function renderPackage(key) {
    var pkg = svcPackages[key];
    if (!pkg) return;

    window._scriptoraSelectedThesisPkg = pkg; /* used by orderThesisPackage() */

    svcTitleEl.textContent    = pkg.title;
    svcSubtitleEl.textContent = pkg.subtitle;
    if (svcPriceEl) svcPriceEl.textContent = pkg.price;
    svcBestValueEl.innerHTML  = pkg.bestValue;
    svcOrderTextEl.textContent = 'Order ' + pkg.name + ' Package';

    svcFeaturesEl.innerHTML = pkg.features.map(function (f) {
      return '<li class="svc-pkg-feat">' +
               '<span class="svc-pkg-feat-icon">' + f.icon + '</span>' +
               '<div>' +
                 '<div class="svc-pkg-feat-title">' + f.title + '</div>' +
                 '<div class="svc-pkg-feat-desc">' + f.desc + '</div>' +
               '</div>' +
             '</li>';
    }).join('');
  }

  svcTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      svcTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      renderPackage(tab.getAttribute('data-pkg'));
    });
  });

  /* Render the default active tab (Premium) on load */
  var activeTab = document.querySelector('.svc-tab.active');
  renderPackage(activeTab ? activeTab.getAttribute('data-pkg') : 'premium');

});

/* -------- ORDER BUTTON -------- */
function orderThesisPackage() {
  var pkg = window._scriptoraSelectedThesisPkg;
  if (!pkg) return;

  var params = new URLSearchParams({
    service: 'thesis',
    urgency: 'normal',
    tier:    pkg.name,
  });
  window.location.href = '../Order page/order.html?' + params.toString();
}

/* ── Process Timeline — Hover + Auto-Cycle Interaction ── */
(function() {
  var currentActive = 1;
  var totalSteps = 5;

  function procSetActive(step) {
    currentActive = step;

    document.querySelectorAll('.proc-card').forEach(function(card) {
      var isActive = parseInt(card.dataset.step) === step;
      card.classList.toggle('proc-card--active', isActive);

      var num      = card.querySelector('.proc-num');
      var iconWrap = card.querySelector('.proc-icon-wrap');
      var title    = card.querySelector('.proc-title');

      if (num)      num.classList.toggle('proc-num--active', isActive);
      if (iconWrap) iconWrap.classList.toggle('proc-icon-wrap--active', isActive);
      if (title)    title.classList.toggle('proc-title--active', isActive);
    });

    document.querySelectorAll('.proc-mobile-dot').forEach(function(dot) {
      dot.classList.toggle('proc-mobile-dot--active', parseInt(dot.dataset.dot) === step);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    procSetActive(1);

    /* Hover: highlight hovered card (no auto-cycle) */
    document.querySelectorAll('.proc-card').forEach(function(card) {
      card.addEventListener('mouseenter', function() {
        procSetActive(parseInt(card.dataset.step));
      });
    });
  });
})();
