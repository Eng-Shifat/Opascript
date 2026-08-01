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

/* =====================================================
   HANDWRITING SAMPLES CAROUSEL
   Data-driven — reads window.PAGE_DATA.samples.slides
   and window.HW_FEATURE_MAP (both from handwritten-data.js).
   Must load after handwritten-data.js.
   ===================================================== */
document.addEventListener('DOMContentLoaded', function () {

  var samples = window.PAGE_DATA && window.PAGE_DATA.samples;
  var slides   = samples && samples.slides;
  var featureMap = window.HW_FEATURE_MAP;
  if (!slides || !slides.length) return;

  var hwTrack     = document.getElementById('hwTrack');
  var hwDots      = document.getElementById('hwDots');
  var hwPrev      = document.getElementById('hwPrev');
  var hwNext      = document.getElementById('hwNext');
  var hwCarousel  = document.getElementById('hwCarousel');
  if (!hwTrack || !hwDots) return;

  /* Identical across every slide — built once, not per slide */
  var MINI_STATS_HTML =
    '<div class="ts-mini-stats">' +
      '<div class="ts-mini-stat"><span class="ts-mini-val">100%</span><span class="ts-mini-label">Human Written</span></div>' +
      '<div class="ts-mini-divider"></div>' +
      '<div class="ts-mini-stat"><span class="ts-mini-val">Original</span><span class="ts-mini-label">Formatting</span></div>' +
      '<div class="ts-mini-divider"></div>' +
      '<div class="ts-mini-stat"><span class="ts-mini-val">Exam</span><span class="ts-mini-label">Friendly</span></div>' +
      '<div class="ts-mini-divider"></div>' +
      '<div class="ts-mini-stat"><span class="ts-mini-val">HD</span><span class="ts-mini-label">Scanned</span></div>' +
    '</div>';

  var ACTIONS_HTML =
    '<div class="ts-actions">' +
      '<button class="ts-btn-primary">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        'Preview Full Sample' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
      '</button>' +
      '<button class="ts-btn-secondary" onclick="window.location.href=\'../Order page/order.html\'">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        'Order This Style' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
      '</button>' +
    '</div>';

  function featureChipHtml(key) {
    var f = featureMap && featureMap[key];
    if (!f) return '';
    return '<div class="ts-feat">' +
             '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + f.icon + '</svg>' +
             '<span>' + f.label + '</span>' +
           '</div>';
  }

  function slideHtml(s, i) {
    return '<div class="hw-carousel-slide' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
      '<div class="hw-carousel-img-wrap">' +
        '<img src="' + s.img + '" alt="' + s.alt + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '">' +
      '</div>' +
      '<div class="hw-carousel-info">' +
        '<div class="hw-carousel-label">' +
          '<span class="hw-carousel-badge">' + s.badge + '</span>' +
          '<span class="hw-carousel-badge ' + s.badgeCls + '">' + s.type + '</span>' +
        '</div>' +
        '<h3 class="hw-carousel-title">' + s.title + '</h3>' +
        '<p class="hw-carousel-desc">' + s.desc + '</p>' +
        '<div class="hw-carousel-tags">' +
          s.tags.map(function (t) { return '<span>' + t + '</span>'; }).join('') +
        '</div>' +
        '<div class="ts-feature-grid">' +
          s.features.map(featureChipHtml).join('') +
        '</div>' +
        MINI_STATS_HTML +
        ACTIONS_HTML +
      '</div>' +
    '</div>';
  }

  function renderHwCarousel() {
    hwTrack.innerHTML = slides.map(slideHtml).join('');
    hwDots.innerHTML  = slides.map(function (s, i) {
      return '<button class="hw-dot' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '"></button>';
    }).join('');
  }

  function initHwCarouselBehavior() {
    var slideEls = hwTrack.querySelectorAll('.hw-carousel-slide');
    var dotEls   = hwDots.querySelectorAll('.hw-dot');
    var current  = 0;
    var total    = slideEls.length;
    if (!total) return;

    function goTo(idx, dir) {
      slideEls[current].classList.remove('active', 'slide-left');
      dotEls[current].classList.remove('active');
      current = (idx + total) % total;
      slideEls[current].classList.remove('slide-left');
      if (dir === 'left') slideEls[current].classList.add('slide-left');
      slideEls[current].classList.add('active');
      dotEls[current].classList.add('active');
    }

    if (hwPrev) hwPrev.addEventListener('click', function () { goTo(current - 1, 'left'); });
    if (hwNext) hwNext.addEventListener('click', function () { goTo(current + 1, 'right'); });

    /* Event delegation — one listener for all dots instead of one per dot */
    hwDots.addEventListener('click', function (e) {
      var dot = e.target.closest('.hw-dot');
      if (!dot) return;
      var idx = parseInt(dot.getAttribute('data-idx'), 10);
      goTo(idx, idx > current ? 'right' : 'left');
    });

    /* Touch / swipe support */
    var startX = 0;
    if (hwCarousel) {
      hwCarousel.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
      hwCarousel.addEventListener('touchend', function (e) {
        var diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1, diff > 0 ? 'right' : 'left');
      }, { passive: true });
    }
  }

  renderHwCarousel();
  initHwCarouselBehavior();

});
