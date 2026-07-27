/* =====================================================
   MOBILE SERVICE PAGE — mobile.js
   Handles: mobile navbar injection + FAQ accordion
   ===================================================== */

(function () {
  'use strict';

  /* ── INJECT MOBILE SECTIONS ── */
  function buildMobileContent() {
    var svcPage = document.querySelector('.svc-page');
    if (!svcPage) return;

    var checkSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

    var html =
      /* ── HERO ── */
      '<div class="mob-hero">' +
        '<div class="mob-hero-card">' +
          '<div class="mob-hero-card-overlay"></div>' +
          '<div class="mob-hero-card-inner">' +
            '<div class="mob-hero-badge">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' +
              '<span>Professional Thesis Writing Service</span>' +
            '</div>' +
            '<h1 class="mob-hero-card-title">Writing a Thesis is Your Defining Milestone</h1>' +
            '<p class="mob-hero-card-desc-short">Led by a Fiverr Level-2 Certified Writer, we deliver 100% flawless, AI-free, and plagiarism-free thesis support tailored to 20+ local &amp; international university guidelines—delivered right on time.</p>' +
          '</div>' +
          '<div class="mob-hero-card-cta-row">' +
            '<button class="mob-cta-primary">Start Your Project <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
            '<button class="mob-cta-outline" onclick="window.open(\'https://wa.me/8801XXXXXXXXX\',\'_blank\')">Talk to an Expert</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── STATS ── */
      '<div class="mob-stats">' +
        '<div class="mob-stat"><div class="mob-stat-icon star"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z"/></svg></div><div class="mob-stat-val">4.9/5</div><div class="mob-stat-sub">(312 Reviews)</div></div>' +
        '<div class="mob-stat"><div class="mob-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4.3M17 6h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4.3"/></svg></div><div class="mob-stat-val">500+</div><div class="mob-stat-sub">Projects</div></div>' +
        '<div class="mob-stat"><div class="mob-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg></div><div class="mob-stat-val">98%</div><div class="mob-stat-sub">On-Time</div></div>' +
        '<div class="mob-stat"><div class="mob-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div><div class="mob-stat-val">100%</div><div class="mob-stat-sub">Confidential</div></div>' +
      '</div>' +

      /* ── ABOUT ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title mob-sec-title-accent">About This Thesis Writing Service</h2>' +
        '<p class="mob-about-text">Writing a thesis is more than an academic requirement — it is a reflection of your research, dedication, and intellectual growth. Whether you are pursuing an <strong>Undergraduate, Master\'s, or PhD</strong> degree, every thesis deserves the highest standard of quality and professionalism.</p>' +
        '<div class="mob-about-highlights">' +
          [
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>', title:'Expert-Led Team', desc:'Led by a Fiverr Level-2 Certified Writer and supported by experienced academic researchers.'},
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title:'Zero-Delay Commitment', desc:'Your project is completed well ahead of schedule — without sacrificing quality.'},
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>', title:'Smart Client Dashboard', desc:'Monitor progress, review drafts, and communicate with your writer in real time.'},
          ].map(function(h){
            return '<div class="mob-about-hl"><div class="mob-about-hl-icon">' + h.icon + '</div><div><div class="mob-about-hl-title">' + h.title + '</div><div class="mob-about-hl-desc">' + h.desc + '</div></div></div>';
          }).join('') +
        '</div>' +
        '<p class="mob-about-text">Every project strictly follows your university\'s <strong>formatting guidelines, citation style, and academic requirements</strong>, resulting in a well-structured, original, <strong>AI-free and plagiarism-free</strong> thesis.</p>' +
        '<p class="mob-about-mission">At Opascript, we don\'t simply help you finish your thesis — we help you present your research with confidence.</p>' +
      '</div>' +

      /* ── WHY TRUST ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">Why Students Trust Scriptora</h2>' +
        '<ul class="mob-why-list">' +
          [
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', title:'Zero-Delay Commitment', desc:'We guarantee on-time delivery. Your university deadlines leave no room for uncertainty, and neither do we.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>', title:'Academic Excellence', desc:'Research-based workflows and styling reviewed by certified top-tier academic writers.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', title:'100% Strict Confidentiality', desc:'Your identity, research topics, and data are guarded under ironclad privacy. Zero leaks, guaranteed.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>', title:'Real-Time Live Tracking', desc:'No hidden progress. Track your thesis chapter-by-chapter and collaborate directly via your Client Dashboard.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', title:'Flawless Citation &amp; Formatting', desc:'Precision formatting across all institutional styles including APA, IEEE, Harvard, MLA, and Chicago.'},
          ].map(function(w){
            return '<li class="mob-why-item"><div class="mob-why-icon-wrap">' + w.svg + '</div><div class="mob-why-text"><div class="mob-why-title">' + w.title + '</div><div class="mob-why-desc">' + w.desc + '</div></div></li>';
          }).join('') +
        '</ul>' +
      '</div>' +

      /* ── EXPERT ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">Meet Your Academic Expert</h2>' +
        '<div class="mob-expert">' +
          '<div class="mob-expert-photo">YK</div>' +
          '<ul class="mob-expert-points">' +
            ['Level 2 Seller in Fiverr', '100+ Successfully Delivered Projects', 'Extensive Experience in Academic Writing', 'Specialized in Thesis &amp; Research Documentation'].map(function(p){
              return '<li>' + checkSVG + '<span>' + p + '</span></li>';
            }).join('') +
          '</ul>' +
        '</div>' +
        '<p class="mob-expert-tagline">Your project is in expert hands.</p>' +
      '</div>' +

      /* ── WORKFLOW ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">How Your Thesis Will Be Completed</h2>' +
        '<div class="mob-workflow">' +
          [
            {n:'1', title:'Share Your Topic', desc:'Topic, Guidelines &amp; Requirements'},
            {n:'2', title:'Planning &amp; Research', desc:'Project Planning, Research Outline Preparation'},
            {n:'3', title:'Writing', desc:'Professional Academic Writing'},
            {n:'4', title:'Review &amp; Formatting', desc:'Grammar, Formatting, Citation Quality Check'},
            {n:'5', title:'Delivery', desc:'Dashboard Notification, Preview Final Delivery'},
          ].map(function(s){
            return '<div class="mob-wf-step">' +
              '<div class="mob-wf-left"><div class="mob-wf-dot">' + s.n + '</div></div>' +
              '<div class="mob-wf-right"><div class="mob-wf-title">' + s.title + '</div><div class="mob-wf-desc">' + s.desc + '</div></div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── WHAT YOU RECEIVE ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">What You Will Receive</h2>' +
        '<div class="mob-receive-grid">' +
          ['Research-based Writing','Professional Formatting','Proper Citation','AI + Human Quality Review','Editable Source Files','Progress Dashboard','Revision Support','Secure File Delivery','Turnitin Report'].map(function(item){
            return '<div class="mob-receive-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>' + item + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── SAMPLE PREVIEW ── */
      '<div class="mob-section">' +
        '<div class="mob-sec-header">' +
          '<h2 class="mob-sec-title" style="margin-bottom:0">Sample Thesis Preview</h2>' +
          '<a class="mob-sec-link" href="#">View All Samples →</a>' +
        '</div>' +
        '<div class="mob-samples-scroll">' +
          [1,2,3,4,5].map(function(){
            return '<div class="mob-sample-card"><div class="mob-sample-card-inner">' +
              '<div class="mob-sample-line title"></div>' +
              '<div class="mob-sample-line"></div>' +
              '<div class="mob-sample-line short"></div>' +
              '<div class="mob-sample-line"></div>' +
              '<div class="mob-sample-line short"></div>' +
              '<div class="mob-sample-line"></div>' +
              '<div class="mob-sample-line short"></div>' +
            '</div></div>';
          }).join('') +
        '</div>' +
        '<div class="mob-sample-dots"><span class="mob-sample-dot active"></span><span class="mob-sample-dot"></span></div>' +
      '</div>' +

      /* ── DASHBOARD PREVIEW ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">Professional Dashboard</h2>' +
        '<p style="font-size:13px;color:var(--muted);margin-bottom:16px">Track your project progress in real time.</p>' +
        '<div class="mob-dash-card">' +
          '<div class="mob-dash-label">Project Progress</div>' +
          '<div class="mob-dash-pct">65%</div>' +
          '<div class="mob-progress-bar"><div class="mob-progress-fill"></div></div>' +
          '<div class="mob-dash-steps">' +
            [
              {icon:'✍️', label:'Writing', val:'65%'},
              {icon:'🔍', label:'Review', val:'20%'},
              {icon:'📐', label:'Formatting', val:'10%'},
              {icon:'📦', label:'Delivery', val:'Pending', cls:'pending'},
            ].map(function(s){
              return '<div class="mob-dash-step">' +
                '<div class="mob-dash-step-icon">' + s.icon + '</div>' +
                '<span class="mob-dash-step-label">' + s.label + '</span>' +
                '<span class="mob-dash-step-val' + (s.cls ? ' ' + s.cls : '') + '">' + s.val + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<div class="mob-dash-footer">' +
            '<div><div class="mob-dash-footer-label">Deadline</div><div class="mob-dash-footer-val">10 Days Left</div></div>' +
            '<div style="text-align:right"><div class="mob-dash-footer-label">Payment Status</div><div class="mob-dash-footer-val paid">Paid</div></div>' +
          '</div>' +
        '</div>' +
        '<a class="mob-open-dash" href="../Client Dashboard/dashboard.html">Open Dashboard →</a>' +
      '</div>' +

      /* ── FAQ ── */
      '<div class="mob-section">' +
        '<div class="mob-sec-header">' +
          '<h2 class="mob-sec-title" style="margin-bottom:0">Frequently Asked Questions</h2>' +
          '<a class="mob-sec-link" href="#">View All →</a>' +
        '</div>' +
        '<div class="mob-faq-list">' +
          [
            {q:'Is the content 100% original?', a:'হ্যাঁ, প্রতিটি থিসিস সম্পূর্ণ Original ও Plagiarism-free — Turnitin Report সহ Deliver করা হয়।'},
            {q:'Will I get Turnitin report?', a:'Premium Package-এর সাথে Turnitin Report Include করা থাকে।'},
            {q:'Can you follow my university guidelines?', a:'অবশ্যই — আপনার University-র নির্দিষ্ট Guideline অনুযায়ী Format করা হয়।'},
            {q:'What if I need revisions?', a:'Premium Package-এ Unlimited Revision Included।'},
            {q:'How long does it take to complete a thesis?', a:'Package অনুযায়ী 10–20 দিনের মধ্যে Deliver করা হয়।'},
          ].map(function(f){
            return '<div class="mob-faq-item">' +
              '<button class="mob-faq-q">' + f.q + '<span class="mob-faq-plus">+</span></button>' +
              '<div class="mob-faq-a">' + f.a + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── FINAL CTA ── */
      '<div class="mob-final-cta">' +
        '<span class="mob-final-cta-icon">🎓</span>' +
        '<h2>Ready to Start<br>Your Thesis?</h2>' +
        '<p>Let our experts help you achieve academic success.</p>' +
        '<button class="mob-cta-primary" onclick="orderThesisPackage && orderThesisPackage()">Start Your Project Today →</button>' +
        '<button class="mob-cta-outline" style="margin-top:10px">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
          'Talk to Expert' +
        '</button>' +
      '</div>' +

      '';

    var mobileWrapper = document.createElement('div');
    mobileWrapper.id = 'mob-content';
    mobileWrapper.innerHTML = html;
    svcPage.insertBefore(mobileWrapper, svcPage.firstChild);
  }

  /* ── FAQ ACCORDION (mobile) ── */
  function initFAQ() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.mob-faq-q');
      if (!btn) return;
      var item = btn.closest('.mob-faq-item');
      if (item) item.classList.toggle('open');
    });
  }

  /* ── INIT ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    if (window.innerWidth <= 768) {
      buildMobileContent();
    }
    initFAQ();
  }

})();
