/* =====================================================
   MOBILE SERVICE PAGE — mobile.js
   SHARED across all service pages.
   Reads content from window.PAGE_DATA (defined in each
   page's own *-data.js file, loaded before this file).
   DO NOT put page-specific content here.
   ===================================================== */

(function () {
  'use strict';

  var D = window.PAGE_DATA;
  if (!D) {
    console.warn('mobile.js: window.PAGE_DATA not found. Load a *-data.js file before mobile.js.');
    return;
  }

  /* ── HELPERS ── */
  var ARROW_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var STAR_SVG  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  /* ── BUILD ── */
  function buildMobileContent() {
    var svcPage = document.querySelector('.svc-page');
    if (!svcPage) return;

    var html =

      /* ── HERO ── */
      '<div class="mob-hero">' +
        '<div class="mob-hero-card">' +
          '<div class="mob-hero-card-overlay"></div>' +
          '<div class="mob-hero-card-inner">' +
            '<div class="mob-hero-badge">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
              '<span>' + D.hero.badge + '</span>' +
            '</div>' +
            '<h1 class="mob-hero-card-title">' + D.hero.title + '</h1>' +
            '<p class="mob-hero-card-desc-short">' + D.hero.desc + '</p>' +
          '</div>' +
          '<div class="mob-hero-card-cta-row">' +
            '<button class="mob-cta-primary" onclick="' + (D.hero.primaryOnClick || '') + '">' + D.hero.primaryBtn + ' ' + ARROW_SVG + '</button>' +
            '<button class="mob-cta-outline" onclick="' + (D.hero.secondaryOnClick || '') + '">' + D.hero.secondaryBtn + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── STATS ── */
      '<div class="mob-stats">' +
        D.stats.map(function (s) {
          return '<div class="mob-stat">' +
            '<div class="mob-stat-icon' + (s.star ? ' star' : '') + '">' + s.icon + '</div>' +
            '<div class="mob-stat-val">' + s.val + '</div>' +
            '<div class="mob-stat-sub">' + s.sub + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      /* ── ABOUT ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title mob-sec-title-accent">' + D.about.title + '</h2>' +
        D.about.paras.map(function (p) { return '<p class="mob-about-text">' + p + '</p>'; }).join('') +
        '<div class="mob-about-highlights">' +
          D.about.highlights.map(function (h) {
            return '<div class="mob-about-hl">' +
              '<div class="mob-about-hl-icon">' + h.icon + '</div>' +
              '<div>' +
                '<div class="mob-about-hl-title">' + h.title + '</div>' +
                '<div class="mob-about-hl-desc">' + h.desc + '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        (D.about.parasAfter || []).map(function (p) { return '<p class="mob-about-text">' + p + '</p>'; }).join('') +
        (D.about.mission ? '<p class="mob-about-mission">' + D.about.mission + '</p>' : '') +
      '</div>' +

      /* ── WHY ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">' + D.why.title + '</h2>' +
        '<ul class="mob-why-list">' +
          D.why.items.map(function (w) {
            return '<li class="mob-why-item">' +
              '<div class="mob-why-icon-wrap">' + w.svg + '</div>' +
              '<div class="mob-why-text">' +
                '<div class="mob-why-title">' + w.title + '</div>' +
                '<div class="mob-why-desc">' + w.desc + '</div>' +
              '</div>' +
            '</li>';
          }).join('') +
        '</ul>' +
      '</div>' +

      /* ── EXPERT ── */
      (D.expert ?
      '<div class="mob-section">' +
        '<div class="mob-exp2-head">' +
          '<div class="mob-exp2-head-icon">' + D.expert.headIcon + '</div>' +
          '<div class="mob-exp2-head-text">' +
            '<h2 class="mob-exp2-heading">' + D.expert.heading + '</h2>' +
            '<p class="mob-exp2-sub">' + D.expert.subheading + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="mob-exp2-card">' +
          '<div class="mob-exp2-main">' +
            '<div class="mob-exp2-left">' +
              '<div class="mob-exp2-avatar-wrap">' +
                '<div class="mob-exp2-avatar"><img src="' + D.expert.photo + '" alt="' + D.expert.name + '"></div>' +
                '<span class="mob-exp2-online"></span>' +
                '<span class="mob-exp2-lvl-badge">' + D.expert.badge + '</span>' +
              '</div>' +
              '<div class="mob-exp2-name">' + D.expert.name + '</div>' +
              '<div class="mob-exp2-role">' + D.expert.role + '</div>' +
              '<div class="mob-exp2-ministats">' +
                D.expert.ministats.map(function (m) {
                  return '<div class="mob-exp2-ministat mob-exp2-ministat--' + m.cls + '">' +
                    '<span class="mob-exp2-ministat-icon">' + m.icon + '</span>' +
                    '<div>' +
                      '<div class="mob-exp2-ministat-val">' + m.val + '</div>' +
                      '<div class="mob-exp2-ministat-label">' + m.label + '</div>' +
                    '</div>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="mob-exp2-divider"></div>' +
            '<div class="mob-exp2-right">' +
              '<div class="mob-exp2-features">' +
                D.expert.features.map(function (f) {
                  return '<div class="mob-exp2-feature mob-exp2-feature--' + f.cls + '">' +
                    '<span class="mob-exp2-feat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + f.svg + '</svg></span>' +
                    '<div>' +
                      '<div class="mob-exp2-feat-title">' + f.title + '</div>' +
                      '<div class="mob-exp2-feat-desc">' + f.desc + '</div>' +
                    '</div>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="mob-exp2-quote">' +
            '<p>&ldquo;' + D.expert.quote + '&rdquo;</p>' +
            '<span class="mob-exp2-quote-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z"/><path d="m9.2 12 1.9 1.9 3.7-3.8"/></svg></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '' : '') +

      /* ── WORKFLOW ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">' + D.workflow.title + '</h2>' +
        '<div class="mob-workflow">' +
          D.workflow.steps.map(function (s, i) {
            return '<div class="mob-wf-step">' +
              '<div class="mob-wf-left"><div class="mob-wf-dot">' + (i + 1) + '</div></div>' +
              '<div class="mob-wf-right">' +
                '<div class="mob-wf-title">' + s.title + '</div>' +
                '<div class="mob-wf-desc">' + s.desc + '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── DELIVERABLES ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">' + D.deliverables.title + '</h2>' +
        '<div class="mob-receive-grid">' +
          D.deliverables.items.map(function (item) {
            return '<div class="mob-receive-item">' + STAR_SVG + '<span>' + item + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── SAMPLE PREVIEW — Carousel ── */
      (D.samples ? (
        '<div class="mob-section">' +
          '<div class="mob-sec-header" style="margin-bottom:14px">' +
            '<h2 class="mob-sec-title" style="margin-bottom:0">' + D.samples.title + '</h2>' +
            '<a class="mob-sec-link" href="#">Free Sample →</a>' +
          '</div>' +
          (D.samples.slides ? (
            '<div class="mob-sample-carousel" id="mobSampleCarousel">' +
              '<div class="mob-sample-track" id="mobSampleTrack">' +
                D.samples.slides.map(function (s, i) {
                  return '<div class="mob-sample-slide' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
                    '<div class="mob-sample-img-wrap">' +
                      '<img src="' + s.img + '" alt="' + s.alt + '" loading="lazy">' +
                    '</div>' +
                    '<div class="mob-sample-info">' +
                      '<div class="mob-sample-badges">' +
                        '<span class="mob-sample-badge">' + s.badge + '</span>' +
                        '<span class="mob-sample-badge ' + s.badgeCls + '">' + s.type + '</span>' +
                      '</div>' +
                      '<div class="mob-sample-title">' + s.title + '</div>' +
                      '<div class="mob-sample-desc">' + s.desc + '</div>' +
                      '<div class="mob-sample-tags">' +
                        s.tags.map(function(t){ return '<span>' + t + '</span>'; }).join('') +
                      '</div>' +
                    '</div>' +
                  '</div>';
                }).join('') +
              '</div>' +
              '<div class="mob-sample-nav">' +
                '<button class="mob-sample-btn mob-sample-prev" id="mobSamplePrev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>' +
                '<div class="mob-sample-dots" id="mobSampleDots">' +
                  D.samples.slides.map(function (s, i) {
                    return '<button class="mob-sdot' + (i === 0 ? ' active' : '') + '" data-sidx="' + i + '"></button>';
                  }).join('') +
                '</div>' +
                '<button class="mob-sample-btn mob-sample-next" id="mobSampleNext"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
              '</div>' +
            '</div>'
          ) : '') +
        '</div>'
      ) : '') +

      /* ── DASHBOARD PREVIEW (optional) ── */
      (D.dashboard ? (
        '<div class="mob-section">' +
          '<h2 class="mob-sec-title">Professional Dashboard</h2>' +
          '<p style="font-size:13px;color:var(--muted);margin-bottom:16px">Track your project progress in real time.</p>' +
          '<div class="mob-dash-card">' +
            '<div class="mob-dash-head">' +
              '<div><div class="mob-dash-label">Project Progress</div><div class="mob-dash-pct">65<span>%</span></div></div>' +
              '<span class="mob-dash-badge">In Progress</span>' +
            '</div>' +
            '<div class="mob-progress-bar"><div class="mob-progress-fill"></div></div>' +
            '<div class="mob-dash-steps">' +
              D.dashboard.steps.map(function (s) {
                return '<div class="mob-dash-step">' +
                  '<div class="mob-dash-step-icon mob-dash-step-icon--' + s.cls + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + s.svg + '</svg></div>' +
                  '<span class="mob-dash-step-label">' + s.label + '</span>' +
                  '<span class="mob-dash-step-val' + (s.pending ? ' pending' : '') + '">' + s.val + '</span>' +
                '</div>';
              }).join('') +
            '</div>' +
            '<div class="mob-dash-footer">' +
              '<div><div class="mob-dash-footer-label">Deadline</div><div class="mob-dash-footer-val">' + D.dashboard.deadline + '</div></div>' +
              '<div style="text-align:right"><div class="mob-dash-footer-label">Payment Status</div><div class="mob-dash-footer-val paid">Paid</div></div>' +
            '</div>' +
          '</div>' +
          '<a class="mob-open-dash" href="../Client Dashboard/dashboard.html">Open Dashboard<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg></a>' +
        '</div>'
      ) : '') +

      /* ── FAQ ── */
      '<div class="mob-section">' +
        '<div class="mob-sec-header">' +
          '<h2 class="mob-sec-title" style="margin-bottom:0">Frequently Asked Questions</h2>' +
          '<a class="mob-sec-link" href="#">View All →</a>' +
        '</div>' +
        '<div class="mob-faq-list">' +
          D.faq.map(function (f) {
            return '<div class="mob-faq-item">' +
              '<button class="mob-faq-q">' + f.q + '<span class="mob-faq-plus">+</span></button>' +
              '<div class="mob-faq-a">' + f.a + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── FINAL CTA ── */
      '<div class="mob-final-cta">' +
        '<span class="mob-final-cta-icon">' + D.cta.icon + '</span>' +
        '<h2>' + D.cta.title + '</h2>' +
        '<p>' + D.cta.desc + '</p>' +
        '<button class="mob-cta-primary" onclick="' + D.cta.primaryOnClick + '">' + D.cta.primaryBtn + '</button>' +
        '<button class="mob-cta-outline" style="margin-top:10px">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
          'Talk to Expert' +
        '</button>' +
      '</div>' +

      '';

    var wrapper = document.createElement('div');
    wrapper.id = 'mob-content';
    wrapper.innerHTML = html;
    svcPage.insertBefore(wrapper, svcPage.firstChild);
  }

  /* ── FAQ ACCORDION ── */
  function initFAQ() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.mob-faq-q');
      if (!btn) return;
      var item = btn.closest('.mob-faq-item');
      if (item) item.classList.toggle('open');
    });
  }

  /* ── Mobile Sample Carousel ── */
  function initMobSampleCarousel() {
    var slides = document.querySelectorAll('.mob-sample-slide');
    var dots   = document.querySelectorAll('.mob-sdot');
    var prev   = document.getElementById('mobSamplePrev');
    var next   = document.getElementById('mobSampleNext');
    if (!slides.length) return;
    var cur = 0, total = slides.length;

    function goTo(idx) {
      slides[cur].classList.remove('active');
      dots[cur].classList.remove('active');
      cur = (idx + total) % total;
      slides[cur].classList.add('active');
      dots[cur].classList.add('active');
    }
    if (prev) prev.addEventListener('click', function(){ goTo(cur - 1); });
    if (next) next.addEventListener('click', function(){ goTo(cur + 1); });
    dots.forEach(function(d){
      d.addEventListener('click', function(){ goTo(parseInt(d.getAttribute('data-sidx'))); });
    });
    /* swipe */
    var sx = 0, el = document.getElementById('mobSampleCarousel');
    if (el) {
      el.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, {passive:true});
      el.addEventListener('touchend',   function(e){ var d = sx - e.changedTouches[0].clientX; if(Math.abs(d)>40) goTo(d>0?cur+1:cur-1); }, {passive:true});
    }
  }

  /* ── INIT ── */
  function init() {
    if (window.innerWidth <= 768) { buildMobileContent(); initMobSampleCarousel(); }
    initFAQ();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
