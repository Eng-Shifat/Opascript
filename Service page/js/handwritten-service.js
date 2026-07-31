/* =====================================================
   HANDWRITTEN SERVICE PAGE — handwritten-service.js
   Overrides svcPackages from service.js with
   handwritten-specific package data.
   Must load AFTER service.js.
   ===================================================== */

document.addEventListener('DOMContentLoaded', function () {

  var ICON = {
    clock:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    infinity:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/></svg>',
    fileCheck:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>',
    userCheck:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>',
    barChart:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    eye:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    shield:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    edit:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    pen:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
  };

  var hwPackages = {
    standard: {
      name: 'Standard',
      title: 'Standard Handwritten Package',
      subtitle: 'Neat, university-standard handwriting for everyday assignments and lab reports.',
      price: '৳1,500',
      bestValue: 'Great fit for assignments &amp; lab reports',
      features: [
        { icon: ICON.pen,       title: 'University-Standard Handwriting',   desc: 'Clean, consistent style throughout' },
        { icon: ICON.fileCheck, title: 'Proper Margins &amp; Formatting',   desc: 'Follows your university guidelines' },
        { icon: ICON.clock,     title: 'Delivery in 5 Days',                desc: 'Standard delivery timeline' },
        { icon: ICON.infinity,  title: 'Free Revisions',                    desc: 'Until requirements are met' },
        { icon: ICON.shield,    title: 'Secure &amp; Confidential',         desc: 'Your work stays private' },
      ],
    },
    recommended: {
      name: 'Recommended',
      title: 'Recommended Handwritten Package',
      subtitle: 'Complete handwritten documents with quality ink options and progress tracking.',
      price: '৳2,500',
      bestValue: 'Best value for practical notebooks &amp; project copies',
      features: [
        { icon: ICON.pen,       title: 'University-Standard Handwriting',   desc: 'Neat &amp; consistent presentation' },
        { icon: ICON.fileCheck, title: 'Proper Margins &amp; Formatting',   desc: 'Follows your university guidelines' },
        { icon: ICON.edit,      title: 'High-Quality Ink &amp; Notebook',   desc: 'Premium ink and paper options' },
        { icon: ICON.clock,     title: 'Delivery in 3 Days',                desc: 'Faster turnaround' },
        { icon: ICON.barChart,  title: 'Live Progress Dashboard',           desc: 'Track progress in real-time' },
        { icon: ICON.eye,       title: 'Scanned Preview Before Delivery',   desc: 'Review before final handover' },
        { icon: ICON.infinity,  title: 'Free Revisions',                    desc: 'Until you are satisfied' },
        { icon: ICON.shield,    title: 'Secure &amp; Confidential',         desc: 'Your work stays private' },
      ],
    },
    premium: {
      name: 'Premium',
      title: 'Professional Handwritten Package',
      subtitle: 'Everything you need for a complete handwritten document — neat, formatted, and ready for submission.',
      price: '৳4,000',
      bestValue: 'Best value for record books &amp; complete academic documents',
      features: [
        { icon: ICON.pen,       title: 'University-Standard Handwriting',   desc: 'Neat &amp; consistent presentation' },
        { icon: ICON.fileCheck, title: 'Proper Margins &amp; Formatting',   desc: 'Follows your university guidelines' },
        { icon: ICON.edit,      title: 'High-Quality Ink &amp; Notebook',   desc: 'Premium ink and paper options' },
        { icon: ICON.clock,     title: 'Priority Delivery',                 desc: 'Guaranteed on-time delivery' },
        { icon: ICON.barChart,  title: 'Live Progress Dashboard',           desc: 'Track progress in real-time' },
        { icon: ICON.eye,       title: 'Scanned Preview Before Delivery',   desc: 'Review before final handover' },
        { icon: ICON.infinity,  title: 'Free Revisions',                    desc: 'Until you are 100% satisfied' },
        { icon: ICON.shield,    title: 'Secure &amp; Confidential Service', desc: 'Your academic work stays private' },
      ],
    },
  };

  var svcTabs       = document.querySelectorAll('.svc-tab');
  var svcTitleEl    = document.getElementById('svc-pkg-title');
  var svcSubtitleEl = document.getElementById('svc-pkg-subtitle');
  var svcPriceEl    = document.getElementById('svc-pkg-price');
  var svcBestValEl  = document.getElementById('svc-pkg-bestvalue-text');
  var svcFeaturesEl = document.getElementById('svc-pkg-features');
  var svcOrderTxtEl = document.getElementById('svc-pkg-order-text');

  function renderHwPackage(key) {
    var pkg = hwPackages[key];
    if (!pkg) return;

    window._opascriptSelectedPkg = pkg;

    svcTitleEl.textContent    = pkg.title;
    svcSubtitleEl.textContent = pkg.subtitle;
    if (svcPriceEl) svcPriceEl.textContent = pkg.price;
    svcBestValEl.innerHTML    = pkg.bestValue;
    svcOrderTxtEl.textContent = 'Order ' + pkg.name + ' Handwritten Package';

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

  /* Re-bind tabs to use handwritten package data */
  svcTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      svcTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      renderHwPackage(tab.getAttribute('data-pkg'));
    });
  });

  /* Render default active tab on load (overrides service.js render) */
  var activeTab = document.querySelector('.svc-tab.active');
  renderHwPackage(activeTab ? activeTab.getAttribute('data-pkg') : 'premium');

});

/* -------- ORDER BUTTON -------- */
function orderHandwrittenPackage() {
  var pkg = window._opascriptSelectedPkg;
  if (!pkg) return;

  var params = new URLSearchParams({
    service: 'handwritten',
    price:   pkg.price.replace(/[^\d]/g, ''),
    urgency: 'normal',
    tier:    pkg.name,
  });
  window.location.href = '../Order page/order.html?' + params.toString();
}
