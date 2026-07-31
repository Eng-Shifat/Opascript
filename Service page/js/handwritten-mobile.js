/* =====================================================
   HANDWRITTEN SERVICE PAGE — handwritten-mobile.js
   Overrides mobile.js content for handwritten-service.html
   Must load AFTER mobile.js.
   ===================================================== */

(function () {
  'use strict';

  /* ── REMOVE thesis mobile content injected by mobile.js ── */
  function removeMobileContent() {
    var existing = document.getElementById('mob-content');
    if (existing) existing.remove();
  }

  /* ── INJECT HANDWRITTEN MOBILE SECTIONS ── */
  function buildHandwrittenMobileContent() {
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
              '<span>University-Standard Handwritten Documents</span>' +
            '</div>' +
            '<h1 class="mob-hero-card-title">Professional Handwritten Academic Documents</h1>' +
            '<p class="mob-hero-card-desc-short">Assignments, lab reports, practical notebooks, record books, and project copies — written neatly by hand, following your university formatting, and delivered on time.</p>' +
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
        '<h2 class="mob-sec-title mob-sec-title-accent">Why Students Trust Opascript for Handwritten Work</h2>' +
        '<p class="mob-about-text">Handwritten academic work represents more than neatly written pages — it reflects your effort, discipline, and presentation skills. Whether you need an assignment, lab report, practical notebook, record book, or project copy, every page deserves clean handwriting and proper formatting.</p>' +
        '<div class="mob-about-highlights">' +
          [
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>', title:'Professional Handwriting Specialists', desc:'Every page is written by experienced specialists trained in university-standard academic handwriting.'},
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title:'On-Time Delivery', desc:'Your project is completed and delivered within your deadline — without compromise.'},
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>', title:'Live Progress Dashboard', desc:'Track your handwriting project page by page through your Opascript client dashboard.'},
          ].map(function(h){
            return '<div class="mob-about-hl"><div class="mob-about-hl-icon">' + h.icon + '</div><div><div class="mob-about-hl-title">' + h.title + '</div><div class="mob-about-hl-desc">' + h.desc + '</div></div></div>';
          }).join('') +
        '</div>' +
        '<p class="mob-about-text">Every document is written according to your university\'s <strong>specific formatting requirements</strong> — proper margins, consistent spacing, neat headings, and correct ink presentation throughout.</p>' +
        '<p class="mob-about-mission">At Opascript, we don\'t just write your pages — we make sure every page represents you well.</p>' +
      '</div>' +

      /* ── WHY TRUST ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">Why Students Choose Opascript</h2>' +
        '<ul class="mob-why-list">' +
          [
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', title:'On-Time Delivery', desc:'We guarantee delivery within your deadline. Every submission date is treated with full seriousness.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>', title:'University-Standard Handwriting', desc:'Neat, consistent handwriting with proper margins, spacing, and formatting across every page.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', title:'100% Confidential', desc:'Your identity and academic documents are kept completely private. No exceptions.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>', title:'Live Progress Tracking', desc:'Monitor every stage of your handwritten project through your personal Opascript dashboard.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>', title:'Scanned Preview Before Delivery', desc:'Review a scanned preview of your completed document before final delivery.'},
          ].map(function(w){
            return '<li class="mob-why-item"><div class="mob-why-icon-wrap">' + w.svg + '</div><div class="mob-why-text"><div class="mob-why-title">' + w.title + '</div><div class="mob-why-desc">' + w.desc + '</div></div></li>';
          }).join('') +
        '</ul>' +
      '</div>' +

      /* ── EXPERT ── */
      '<div class="mob-section">' +
        '<div class="mob-exp2-head">' +
          '<div class="mob-exp2-head-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z"/><path d="m12 8 1.1 2.3 2.5.35-1.8 1.8.45 2.5L12 13.7l-2.25 1.25.45-2.5-1.8-1.8 2.5-.35L12 8Z"/></svg></div>' +
          '<div class="mob-exp2-head-text">' +
            '<h2 class="mob-exp2-heading">Meet Your <span class="grad">Handwriting Specialist</span></h2>' +
            '<p class="mob-exp2-sub">Your documents are prepared by specialists trained in university-standard academic handwriting.</p>' +
          '</div>' +
        '</div>' +
        '<div class="mob-exp2-card">' +
          '<div class="mob-exp2-main">' +
            '<div class="mob-exp2-left">' +
              '<div class="mob-exp2-avatar-wrap">' +
                '<div class="mob-exp2-avatar"><img src="assets/expert-photo.jpg" alt="Yeasin Kabir"></div>' +
                '<span class="mob-exp2-online"></span>' +
                '<span class="mob-exp2-lvl-badge">Level 2</span>' +
              '</div>' +
              '<div class="mob-exp2-name">Yeasin Kabir</div>' +
              '<div class="mob-exp2-role">Handwriting & Academic Specialist</div>' +
              '<div class="mob-exp2-ministats">' +
                '<div class="mob-exp2-ministat mob-exp2-ministat--blue"><span class="mob-exp2-ministat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span><div><div class="mob-exp2-ministat-val">500+</div><div class="mob-exp2-ministat-label">Projects</div></div></div>' +
                '<div class="mob-exp2-ministat mob-exp2-ministat--gold"><span class="mob-exp2-ministat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg></span><div><div class="mob-exp2-ministat-val">5+</div><div class="mob-exp2-ministat-label">Years Exp.</div></div></div>' +
              '</div>' +
            '</div>' +
            '<div class="mob-exp2-divider"></div>' +
            '<div class="mob-exp2-right">' +
              '<div class="mob-exp2-features">' +
                [
                  {cls:'green', svg:'<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>', title:'Handwriting Specialist', desc:'Trained in neat, university-standard academic handwriting'},
                  {cls:'blue', svg:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>', title:'500+ Completed Projects', desc:'Successfully delivered handwritten academic documents'},
                  {cls:'purple', svg:'<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>', title:'5+ Years Experience', desc:'Extensive experience in academic handwriting services'},
                  {cls:'orange', svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>', title:'All Document Types', desc:'Assignments, lab reports, notebooks, record books &amp; more'}
                ].map(function(f){
                  return '<div class="mob-exp2-feature mob-exp2-feature--' + f.cls + '"><span class="mob-exp2-feat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + f.svg + '</svg></span><div><div class="mob-exp2-feat-title">' + f.title + '</div><div class="mob-exp2-feat-desc">' + f.desc + '</div></div></div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="mob-exp2-quote">' +
            '<p>&ldquo;I help students present their academic work with clean, consistent handwriting that meets university standards — every time.&rdquo;</p>' +
            '<span class="mob-exp2-quote-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z"/><path d="m9.2 12 1.9 1.9 3.7-3.8"/></svg></span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── WORKFLOW ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">How Your Document Will Be Completed</h2>' +
        '<div class="mob-workflow">' +
          [
            {n:'1', title:'Share Your Requirements', desc:'Topic, Format, Page Count &amp; University Guidelines'},
            {n:'2', title:'Planning &amp; Preparation', desc:'Notebook &amp; Ink Selection, Layout Planning'},
            {n:'3', title:'Handwriting', desc:'Neat, Consistent, University-Standard Writing'},
            {n:'4', title:'Quality Check', desc:'Margin, Spacing, Presentation &amp; Consistency Review'},
            {n:'5', title:'Delivery', desc:'Scanned Preview, Dashboard Notification, Final Delivery'},
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
          ['University-Standard Handwriting','Proper Margins & Formatting','Neat & Consistent Presentation','High-Quality Ink & Notebook','Live Progress Dashboard','Scanned Preview Before Delivery','Free Revisions','Secure & Confidential Service'].map(function(item){
            return '<div class="mob-receive-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>' + item + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── SAMPLE PREVIEW ── */
      '<div class="mob-section">' +
        '<div class="mob-sec-header">' +
          '<h2 class="mob-sec-title" style="margin-bottom:0">Handwriting Sample Preview</h2>' +
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
        '<p style="font-size:13px;color:var(--muted);margin-bottom:16px">Track your handwritten document progress in real time.</p>' +
        '<div class="mob-dash-card">' +
          '<div class="mob-dash-head">' +
            '<div>' +
              '<div class="mob-dash-label">Project Progress</div>' +
              '<div class="mob-dash-pct">65<span>%</span></div>' +
            '</div>' +
            '<span class="mob-dash-badge">In Progress</span>' +
          '</div>' +
          '<div class="mob-progress-bar"><div class="mob-progress-fill"></div></div>' +
          '<div class="mob-dash-steps">' +
            [
              {cls:'blue', svg:'<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>', label:'Writing', val:'65%'},
              {cls:'purple', svg:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', label:'Review', val:'20%'},
              {cls:'cyan', svg:'<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/>', label:'Formatting', val:'10%'},
              {cls:'orange', svg:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>', label:'Delivery', val:'Pending', cls2:'pending'},
            ].map(function(s){
              return '<div class="mob-dash-step">' +
                '<div class="mob-dash-step-icon mob-dash-step-icon--' + s.cls + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + s.svg + '</svg></div>' +
                '<span class="mob-dash-step-label">' + s.label + '</span>' +
                '<span class="mob-dash-step-val' + (s.cls2 ? ' ' + s.cls2 : '') + '">' + s.val + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +
          '<div class="mob-dash-footer">' +
            '<div><div class="mob-dash-footer-label">Deadline</div><div class="mob-dash-footer-val">5 Days Left</div></div>' +
            '<div style="text-align:right"><div class="mob-dash-footer-label">Payment Status</div><div class="mob-dash-footer-val paid">Paid</div></div>' +
          '</div>' +
        '</div>' +
        '<a class="mob-open-dash" href="../Client Dashboard/dashboard.html">Open Dashboard<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg></a>' +
      '</div>' +

      /* ── FAQ ── */
      '<div class="mob-section">' +
        '<div class="mob-sec-header">' +
          '<h2 class="mob-sec-title" style="margin-bottom:0">Frequently Asked Questions</h2>' +
          '<a class="mob-sec-link" href="#">View All →</a>' +
        '</div>' +
        '<div class="mob-faq-list">' +
          [
            {q:'Is the handwriting 100% human?', a:'হ্যাঁ — প্রতিটি পৃষ্ঠা সম্পূর্ণ হাতে লেখা। কোনো Printing, Tracing বা Digital Shortcut নেই।'},
            {q:'Can you follow my university formatting?', a:'অবশ্যই — আপনার University-র নির্দিষ্ট Margin, Spacing ও Format অনুযায়ী লেখা হয়।'},
            {q:'Will I get a preview before delivery?', a:'হ্যাঁ — Final Delivery-র আগে Scanned Preview দেওয়া হয়, যাতে আপনি নিশ্চিত হতে পারেন।'},
            {q:'What if I need revisions?', a:'Free Revision Include করা আছে — আপনার Requirements পূরণ না হওয়া পর্যন্ত আমরা সংশোধন করব।'},
            {q:'How long does it take to complete?', a:'Package অনুযায়ী 3–7 দিনের মধ্যে Deliver করা হয়। Rush Delivery-ও Available।'},
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
        '<span class="mob-final-cta-icon">✍️</span>' +
        '<h2>Need Handwritten<br>Academic Documents?</h2>' +
        '<p>Let our specialists prepare neat, university-standard handwritten work — delivered on time.</p>' +
        '<button class="mob-cta-primary" onclick="orderHandwrittenPackage && orderHandwrittenPackage()">Start Your Order Today →</button>' +
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

  /* ── INIT ── */
  function init() {
    if (window.innerWidth <= 768) {
      removeMobileContent();
      buildHandwrittenMobileContent();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
