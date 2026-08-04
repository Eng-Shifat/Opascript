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
    truck:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h5l2 2v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    ink:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/><path d="M12 2c2.5 2.5 4 6 4 10"/><path d="M12 2C9.5 4.5 8 8 8 12"/></svg>',
    star:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    pen2:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  };

  /* ── COMMON features present in ALL packages ── */
  var COMMON_FEATURES = [
    { icon: ICON.pen,       title: 'University-Standard Handwriting',       desc: 'Clean &amp; consistent presentation throughout' },
    { icon: ICON.fileCheck, title: 'Proper Margins &amp; Formatting',        desc: 'Follows your university guidelines' },
    { icon: ICON.ink,       title: 'Blue / Black Ink Option',                desc: 'Choose your preferred ink colour' },
    { icon: ICON.barChart,  title: 'Dashboard Live Progress',                desc: 'Track your order in real-time' },
    { icon: ICON.eye,       title: 'Scan Preview Before Final Delivery',     desc: 'Review scanned pages before handover' },
    { icon: ICON.truck,     title: 'Physical Delivery Option',               desc: 'Delivered safely to your address' },

    { icon: ICON.shield,    title: '100% Confidential Service',              desc: 'Your work stays completely private' },
  ];

  /* ── BASE delivery days (pages ≤ 20); extra days added per page beyond base ── */
  var HW_DELIVERY = {
    standard:    { baseDays: 13, basePages: 20, extraPer10: 2 },
    recommended: { baseDays: 10, basePages: 20, extraPer10: 2 },
    premium:     { baseDays:  8, basePages: 20, extraPer10: 1 },
  };

  /* ── Calculate estimated delivery days from page count ── */
  function calcDeliveryDays(tierKey, pageCount) {
    var cfg = HW_DELIVERY[tierKey];
    var pages = parseInt(pageCount) || 0;
    var extra = pages > cfg.basePages
      ? Math.ceil((pages - cfg.basePages) / 10) * cfg.extraPer10
      : 0;
    return cfg.baseDays + extra;
  }

  /* ── Package definitions (DIFFERENTIATING items only; common features appended by renderHwPackage) ── */
  var hwPackages = {
    standard: {
      name:      'Standard',
      title:     'Standard Handwritten Package',
      subtitle:  'Perfect for everyday assignments, lab reports and academic work with reliable delivery.',
      price:     '৳1,500',
      bestValue: 'Great fit for everyday assignments &amp; lab reports',
      revision:  '1 Revision',
      priority:  'Standard Queue',
      delivery:  { tierKey: 'standard' },
    },
    recommended: {
      name:      'Recommended',
      title:     'Recommended Handwritten Package',
      subtitle:  'The best balance of delivery speed, revisions and value for most handwritten academic work.',
      price:     '৳2,500',
      bestValue: 'Best value for practical notebooks &amp; project copies',
      revision:  '3 Revisions',
      priority:  'High Priority Queue',
      delivery:  { tierKey: 'recommended' },
    },
    premium: {
      name:      'Premium',
      title:     'Premium Handwritten Package',
      subtitle:  'Designed for urgent, large and high-priority handwritten academic projects.',
      price:     '৳4,000',
      bestValue: 'Best for urgent, large &amp; high-priority academic projects',
      revision:  'Unlimited Revisions',
      priority:  'Highest Priority Queue',
      dedicated: true,
      delivery:  { tierKey: 'premium' },
    },
  };

  var svcTabs       = document.querySelectorAll('.svc-tab');
  var svcTitleEl    = document.getElementById('svc-pkg-title');
  var svcSubtitleEl = document.getElementById('svc-pkg-subtitle');
  var svcPriceEl    = document.getElementById('svc-pkg-price');
  var svcBestValEl  = document.getElementById('svc-pkg-bestvalue-text');
  var svcFeaturesEl = document.getElementById('svc-pkg-features');
  var svcOrderTxtEl = document.getElementById('svc-pkg-order-text');

  /* ── Store current tier key for re-render on page-count change ── */
  window._hwCurrentTierKey = 'premium';

  function buildFeatureList(pkg, pageCount) {
    var days = calcDeliveryDays(pkg.delivery.tierKey, pageCount);
    var pageLabel = (parseInt(pageCount) || 0) > 0
      ? ' (' + (parseInt(pageCount)) + ' পাতার জন্য)'
      : ' (Base)';

    var differentiatingFeatures = [
      { icon: ICON.clock, title: 'Delivery Priority',
        desc: pkg.priority },
      { icon: ICON.clock, title: 'Estimated Delivery',
        desc: days + ' Days' + pageLabel },
      { icon: ICON.infinity, title: 'Free Revision',
        desc: pkg.revision },
    ];

    if (pkg.dedicated) {
      differentiatingFeatures.push(
        { icon: ICON.star, title: 'Dedicated Project Handling', desc: 'Personal writer assigned to your project' }
      );
    }

    return differentiatingFeatures.concat(COMMON_FEATURES);
  }

  function renderHwPackage(key, pageCount) {
    var pkg = hwPackages[key];
    if (!pkg) return;

    window._opascriptSelectedPkg = pkg;
    window._hwCurrentTierKey = key;

    svcTitleEl.textContent    = pkg.title;
    svcSubtitleEl.textContent = pkg.subtitle;
    if (svcPriceEl) svcPriceEl.textContent = pkg.price;
    svcBestValEl.innerHTML    = pkg.bestValue;
    svcOrderTxtEl.textContent = 'Order ' + pkg.name + ' Package';

    var features = buildFeatureList(pkg, pageCount || 0);
    svcFeaturesEl.innerHTML = features.map(function (f) {
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
      renderHwPackage(tab.getAttribute('data-pkg'), window._hwCurrentPageCount);
    });
  });

  /* Render default active tab on load (overrides service.js render) */
  var activeTab = document.querySelector('.svc-tab.active');
  renderHwPackage(activeTab ? activeTab.getAttribute('data-pkg') : 'premium', 0);

  /* Listen for page-count changes from updateHwDelivery() */
  document.addEventListener('hw:pagecount', function (e) {
    renderHwPackage(e.detail.key, e.detail.pages);
  });

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

/* -------- LIVE DELIVERY ESTIMATE — call this from a page-count input -------- */
/* Usage: <input oninput="updateHwDelivery(this.value)"> anywhere on the page   */
function updateHwDelivery(pageCount) {
  window._hwCurrentPageCount = parseInt(pageCount) || 0;
  var activeTab = document.querySelector('.svc-tab.active');
  var key = activeTab ? activeTab.getAttribute('data-pkg') : (window._hwCurrentTierKey || 'premium');
  /* renderHwPackage is scoped inside the DOMContentLoaded closure;
     dispatch a custom event so the inner function can handle it */
  document.dispatchEvent(new CustomEvent('hw:pagecount', { detail: { key: key, pages: window._hwCurrentPageCount } }));
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
  var MINI_STAT_ICONS = {
    human:  '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    doc:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    cap:    '<path d="M22 10L12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    scan:   '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v4M17 3v4M7 17v4M17 17v4M3 7h4M17 7h4M3 17h4M17 17h4"/>',
  };
  function miniStatIcon(key) {
    return '<span class="ts-mini-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + MINI_STAT_ICONS[key] + '</svg></span>';
  }
  function actionsHtml(imgSrc) {
    return '<div class="ts-actions">' +
      '<button class="ts-btn-primary" onclick="hwOpenPreview(\'' + imgSrc + '\')">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>' +
        'Preview Full Sample' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
      '</button>' +
      '<button class="ts-btn-secondary" onclick="window.location.href=\'../Order page/order.html\'">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        'Order This Style' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
      '</button>' +
    '</div>';
  }

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
          '<span class="hw-carousel-badge ' + s.badgeCls + '">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + s.badgeIcon + '</svg>' +
            s.badge +
          '</span>' +
          '<span class="hw-carousel-badge">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
            s.type +
          '</span>' +
          '<span class="hw-carousel-badge orange">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
            'Handwritten' +
          '</span>' +
        '</div>' +
        '<h3 class="hw-carousel-title">' + s.title + '</h3>' +
        '<p class="hw-carousel-desc">' + s.desc + '</p>' +
        '<div class="ts-feature-grid">' +
          s.features.map(featureChipHtml).join('') +
        '</div>' +
        actionsHtml(s.img) +
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

  /* Create nav arrows and append to hwCarousel (position absolute, overlays img-wrap) */
  var btnPrev = document.createElement('button');
  btnPrev.className = 'hw-carousel-btn hw-carousel-prev';
  btnPrev.id = 'hwPrev';
  btnPrev.setAttribute('aria-label', 'Previous');
  btnPrev.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
  var btnNext = document.createElement('button');
  btnNext.className = 'hw-carousel-btn hw-carousel-next';
  btnNext.id = 'hwNext';
  btnNext.setAttribute('aria-label', 'Next');
  btnNext.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  hwCarousel.appendChild(btnPrev);
  hwCarousel.appendChild(btnNext);
  hwPrev = btnPrev;
  hwNext = btnNext;

  initHwCarouselBehavior();

});

/* =====================================================
   SAMPLE IMAGE PREVIEW POPUP
   ===================================================== */
function hwOpenPreview(imgSrc) {
  var overlay = document.getElementById('hwPreviewOverlay');
  if (!overlay) return;
  var img = overlay.querySelector('.hw-preview-img');
  img.src = imgSrc;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function hwClosePreview() {
  var overlay = document.getElementById('hwPreviewOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', function () {
  var overlay = document.getElementById('hwPreviewOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) hwClosePreview();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hwClosePreview();
  });
});
