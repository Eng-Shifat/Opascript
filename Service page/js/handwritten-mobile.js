/* =====================================================
   MOBILE SERVICE PAGE — handwritten-mobile.js
   Handles: mobile content injection for handwritten-service.html
   Thesis mobile.js is NOT touched — this is fully separate.
   ===================================================== */

(function () {
  'use strict';

  /* ── INJECT MOBILE SECTIONS ── */
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
              '<span>University-Standard Handwritten Documents</span>' +

            '</div>' +
            '<h1 class="mob-hero-card-title">Handwritten Academic Documents — Ready for Submission</h1>' +
            '<p class="mob-hero-card-desc-short">Whether you need handwritten assignments, lab reports, practical notebooks, record books, project copies, or class notes, our handwriting specialists prepare every page with clean handwriting, proper formatting, and consistent presentation.</p>' +
          '</div>' +
          '<div class="mob-hero-card-cta-row">' +
            '<button class="mob-cta-primary">Start Your Handwritten Project <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
            '<button class="mob-cta-outline" onclick="window.open(\'https://wa.me/8801XXXXXXXXX\',\'_blank\')">Discuss Your Requirements</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── STATS ── */
      '<div class="mob-stats">' +
        '<div class="mob-stat"><div class="mob-stat-icon star"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z"/></svg></div><div class="mob-stat-val">4.9/5</div><div class="mob-stat-sub">(312 Reviews)</div></div>' +
        '<div class="mob-stat"><div class="mob-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4.3M17 6h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4.3"/></svg></div><div class="mob-stat-val">500+</div><div class="mob-stat-sub">Projects</div></div>' +
        '<div class="mob-stat"><div class="mob-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg></div><div class="mob-stat-val">98%</div><div class="mob-stat-sub">On-Time</div></div>' +
        '<div class="mob-stat"><div class="mob-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div><div class="mob-stat-val">100%</div><div class="mob-stat-sub">Human Written</div></div>' +
      '</div>' +

      /* ── ABOUT ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title mob-sec-title-accent">Why Students Trust Scriptora for Handwritten Academic Work</h2>' +
        '<p class="mob-about-text">Handwritten academic work represents more than neatly written pages — it reflects your dedication, professionalism, and attention to detail. At Scriptora, we prepare assignments, lab reports, practical notebooks, record books, and project copies with <strong>clear handwriting, consistent presentation, and university-standard formatting</strong>, helping you submit every document with confidence.</p>' +
        '<div class="mob-about-highlights">' +
          [
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>', title:'Professional Handwriting Specialists', desc:'Experienced in university-standard academic documents with consistent handwriting, balanced spacing, and clean margins.'},
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title:'Reliable & On-Time Delivery', desc:'Every project is carefully scheduled and delivered within your requested timeline while maintaining excellent quality.'},
            {icon:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>', title:'Smart Client Dashboard', desc:'Track progress, review uploaded previews, communicate directly with our team, and receive real-time updates.'},
          ].map(function(h){
            return '<div class="mob-about-hl"><div class="mob-about-hl-icon">' + h.icon + '</div><div><div class="mob-about-hl-title">' + h.title + '</div><div class="mob-about-hl-desc">' + h.desc + '</div></div></div>';
          }).join('') +
        '</div>' +
        '<p class="mob-about-text">Every document is prepared according to your university\'s formatting guidelines — from <strong>page margins and headings to spacing, page structure, and ink preferences</strong>. Before delivery, each page is carefully reviewed.</p>' +
        '<p class="mob-about-mission">Every page we write reflects the care, precision, and professionalism your academic work deserves.</p>' +
      '</div>' +

      /* ── WHY CHOOSE ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">Why Students Choose Scriptora</h2>' +
        '<ul class="mob-why-list">' +
          [
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>', title:'Natural Human Handwriting', desc:'Every page carefully handwritten by real professionals — natural handwriting, consistent spacing, clean presentation from first to last.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>', title:'Beautiful Presentation', desc:'Clean headings, balanced spacing, neat borders, and a professional presentation that is ready for university submission.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', title:'Complete Privacy', desc:'Your identity, order details, and academic documents remain completely confidential. Never shared, resold, or accessed by anyone outside our team.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="10" r="1"/><circle cx="16" cy="10" r="1"/></svg>', title:'Smart Client Dashboard', desc:'Track your project, review scanned previews, communicate directly with our team, and receive your final files securely.'},
            {svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/></svg>', title:'University Standards', desc:'Every handwritten document follows your university\'s academic requirements — margins, headings, spacing, and page structure.'},
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
            '<h2 class="mob-exp2-heading">Meet Your <span class="grad">Handwriting Expert</span></h2>' +
            '<p class="mob-exp2-sub">Your documents are prepared with experience, precision, and a commitment to neat presentation.</p>' +
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
              '<div class="mob-exp2-role">Handwriting &amp; Presentation Specialist</div>' +
              '<div class="mob-exp2-ministats">' +
                '<div class="mob-exp2-ministat mob-exp2-ministat--blue"><span class="mob-exp2-ministat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span><div><div class="mob-exp2-ministat-val">500+</div><div class="mob-exp2-ministat-label">Projects</div></div></div>' +
                '<div class="mob-exp2-ministat mob-exp2-ministat--gold"><span class="mob-exp2-ministat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg></span><div><div class="mob-exp2-ministat-val">5+</div><div class="mob-exp2-ministat-label">Years Exp.</div></div></div>' +
              '</div>' +
            '</div>' +
            '<div class="mob-exp2-divider"></div>' +
            '<div class="mob-exp2-right">' +
              '<div class="mob-exp2-features">' +
                [
                  {cls:'green',   svg:'<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',                                                                                                   title:'Fiverr Level 2 Seller',            desc:'Verified &amp; trusted by Fiverr'},
                  {cls:'blue',    svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',title:'500+ Delivered Projects',           desc:'Successfully completed academic documents'},
                  {cls:'purple',  svg:'<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',                                                                                                        title:'5+ Years Experience',              desc:'Specialized in university-standard handwriting'},
                  {cls:'orange',  svg:'<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>',                                                                                               title:'100% Human Written',               desc:'No printing, no tracing, no digital shortcuts'},
                ].map(function(f){
                  return '<div class="mob-exp2-feature mob-exp2-feature--' + f.cls + '"><span class="mob-exp2-feat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + f.svg + '</svg></span><div><div class="mob-exp2-feat-title">' + f.title + '</div><div class="mob-exp2-feat-desc">' + f.desc + '</div></div></div>';
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="mob-exp2-quote">' +
            '<p>&ldquo;My goal is to deliver perfectly handwritten academic documents — neat, professional, and ready for submission.&rdquo;</p>' +
            '<span class="mob-exp2-quote-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z"/><path d="m9.2 12 1.9 1.9 3.7-3.8"/></svg></span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ── WORKFLOW ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">How Your Handwritten Work Gets Delivered</h2>' +
        '<div class="mob-workflow">' +
          [
            {n:'1', title:'Submit Requirement',  desc:'Subject, page count, ink preference, university guidelines &amp; deadline'},
            {n:'2', title:'Review Instructions', desc:'Our team reviews your format rules, margin specs, and heading structure'},
            {n:'3', title:'Handwriting Begins',  desc:'Skilled professionals write your document neatly page by page'},
            {n:'4', title:'Quality Check',        desc:'Every page inspected for neatness, margins, headings &amp; ink consistency'},
            {n:'5', title:'Delivery',             desc:'High-quality scanned copies on your dashboard. Physical delivery available on request'},
          ].map(function(s){
            return '<div class="mob-wf-step">' +
              '<div class="mob-wf-left"><div class="mob-wf-dot">' + s.n + '</div></div>' +
              '<div class="mob-wf-right"><div class="mob-wf-title">' + s.title + '</div><div class="mob-wf-desc">' + s.desc + '</div></div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── WRITING STYLE OPTIONS ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">Choose Your Preferred Writing Style</h2>' +
        '<div class="mob-included-grid">' +
          [
            {svg:'<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>',                                                                                                                     label:'Blue Ink'},
            {svg:'<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>',                                                                                                                     label:'Black Ink'},
            {svg:'<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',                                                                                         label:'Ruled Book'},
            {svg:'<rect x="3" y="3" width="18" height="18" rx="2"/>',                                                                                                                                                          label:'Plain Paper'},
            {svg:'<path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>',                                                                                        label:'Practical Copy'},
            {svg:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',                      label:'Lab Record'},
            {svg:'<path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z"/><path d="M9 12l2 2 4-4"/>',                                                                                                                  label:'Custom Format'},
          ].map(function(item){
            return '<div class="mob-inc-item"><div class="mob-inc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + item.svg + '</svg></div><div class="mob-inc-label">' + item.label + '</div></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── QUALITY GUARANTEE ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">Our Quality Commitment</h2>' +
        '<div class="mob-receive-grid">' +
          ['100% Human Written','No Printed Text','Professional Presentation','Proper Margins','Correct Heading Style','University Standard','Confidential Handling','On-Time Delivery'].map(function(item){
            return '<div class="mob-receive-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>' + item + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── DELIVERY OPTIONS ── */
      '<div class="mob-section">' +
        '<h2 class="mob-sec-title">Flexible Delivery Options</h2>' +
        '<div class="mob-why-list" style="gap:14px">' +
          [
            {svg:'<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h5l2 2v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',  title:'Courier Delivery',       desc:'Physical documents delivered safely to your address anywhere in Bangladesh.'},
            {svg:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/>',                              title:'Scanned PDF Preview',    desc:'High-resolution scans uploaded directly to your dashboard for review.'},
            {svg:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',                                                                                                      title:'Express Delivery',       desc:'Urgent orders completed within 12–24 hours with priority handling.'},
            {svg:'<path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',             title:'Bulk Order Support',     desc:'Multiple notebooks or assignments handled simultaneously with consistent style.'},
          ].map(function(w){
            return '<li class="mob-why-item"><div class="mob-why-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + w.svg + '</svg></div><div class="mob-why-text"><div class="mob-why-title">' + w.title + '</div><div class="mob-why-desc">' + w.desc + '</div></div></li>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── FAQ ── */
      '<div class="mob-section">' +
        '<div class="mob-sec-header">' +
          '<h2 class="mob-sec-title" style="margin-bottom:0">Frequently Asked Questions</h2>' +
          '<a class="mob-sec-link" href="#">View All →</a>' +
        '</div>' +
        '<div class="mob-faq-list">' +
          [
            {q:'Can you follow my university\'s exact format and margin rules?',   a:'হ্যাঁ, আপনার University-র নির্দিষ্ট Margin, Heading Format, এবং Page Structure অনুযায়ী Document তৈরি করা হয়। Order করার সময় আপনার গাইডলাইন বা নমুনা কপি শেয়ার করুন।'},
            {q:'Which ink color do you use — blue or black?',                       a:'আপনার পছন্দ অনুযায়ী Blue বা Black উভয় Ink-ই Available। Order-এর সময় উল্লেখ করুন; না করলে University-র Standard অনুসরণ করা হয়।'},
            {q:'What type of notebook or paper do you write on?',                   a:'আমরা Standard A4 Lined Paper, Lab Notebook, Practical Copy এবং আপনার University-র Specific Copy Format-এ লিখি। Custom Paper বা Notebook-ও Provide করা সম্ভব।'},
            {q:'How long does delivery take?',                                       a:'সাধারণত ২৪ থেকে ৭২ ঘণ্টার মধ্যে Deliver করা হয়, নির্ভর করে Page Count এবং Complexity-র উপর। Urgent Delivery-ও Available — Order-এ Deadline উল্লেখ করুন।'},
            {q:'Is my assignment kept confidential?',                               a:'হ্যাঁ, আপনার Assignment, Personal Details এবং Order সম্পর্কিত সকল তথ্য সম্পূর্ণ গোপনীয় রাখা হয়। আমরা কোনো তৃতীয় পক্ষের সাথে কখনো Share করি না।'},
          ].map(function(f){
            return '<div class="mob-faq-item">' +
              '<button class="mob-faq-q">' + f.q + '<span class="mob-faq-plus">+</span></button>' +
              '<div class="mob-faq-a">' + f.a + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── REVIEWS ── */
      '<div class="mob-section">' +
        '<div class="mob-sec-header">' +
          '<h2 class="mob-sec-title" style="margin-bottom:0">What Our Clients Say</h2>' +
          '<a class="mob-sec-link" href="#">View All →</a>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:12px">' +
          [
            {init:'FT', name:'Farhan T.',  uni:'University of Dhaka',  text:'The handwriting was incredibly neat and my professor was impressed. Margins and headings were exactly as required. Delivered on time!'},
            {init:'AR', name:'Ahmed R.',   uni:'BRAC University',       text:'Ordered a practical notebook and got it back in less than 48 hours. Clean, readable handwriting — exactly what I needed for submission.'},
            {init:'NJ', name:'Nusrat J.',  uni:'North South University', text:'Lab report and record book done perfectly. Blue ink, proper format, every page was spotless. Will definitely order again!'},
          ].map(function(r){
            return '<div style="background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:16px">' +
              '<div style="color:#fbbf24;font-size:14px;margin-bottom:8px">★★★★★</div>' +
              '<p style="font-size:13px;line-height:1.6;color:rgba(var(--text-rgb),0.85);margin-bottom:12px">' + r.text + '</p>' +
              '<div style="display:flex;align-items:center;gap:10px">' +
                '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--color-violet));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">' + r.init + '</div>' +
                '<div><div style="font-size:13px;font-weight:700">' + r.name + '</div><div style="font-size:11px;color:var(--muted)">' + r.uni + '</div></div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* ── FINAL CTA ── */
      '<div class="mob-final-cta">' +
        '<span class="mob-final-cta-icon">✍️</span>' +
        '<h2>Need Professional<br>Handwritten Academic Work?</h2>' +
        '<p>Upload your assignment today and let our experts prepare neat, university-standard handwritten documents delivered on time.</p>' +
        '<button class="mob-cta-primary" onclick="orderHandwrittenPackage && orderHandwrittenPackage()">Start Your Order →</button>' +
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
