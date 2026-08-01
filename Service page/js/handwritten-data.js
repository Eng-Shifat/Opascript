/* =====================================================
   HANDWRITTEN SERVICE PAGE — handwritten-data.js
   Content data for mobile.js (shared template).
   Only change THIS file for handwritten page content.
   ===================================================== */

/* Shared feature-chip lookup used by the samples carousel.
   Slide objects only list feature KEYS (see samples.slides
   below) — label + icon live here once, so adding a slide
   never means re-pasting icon markup. */
window.HW_FEATURE_MAP = {
  blueInk:          { label: 'Blue Ink',            icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>' },
  universityFormat: { label: 'University Format',   icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>' },
  neatHandwriting:  { label: 'Neat Handwriting',    icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/><path d="M15 5l3 3"/>' },
  tablesIncluded:   { label: 'Tables Included',     icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>' },
  diagramIncluded:  { label: 'Diagram Included',    icon: '<circle cx="11" cy="11" r="3"/><path d="M11 11l2 2"/><rect x="2" y="2" width="20" height="20" rx="2"/>' },
  originalWork:     { label: 'Original Work',       icon: '<path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z"/>' },
  ruledNotebook:    { label: 'Ruled Notebook',      icon: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>' },
  handDrawnDiagram: { label: 'Hand-drawn Diagram',  icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
  circuitDiagram:   { label: 'Circuit Diagram',     icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  gridNotebook:     { label: 'Grid Notebook',       icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>' },
  chemicalEquation: { label: 'Chemical Equation',   icon: '<line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8a6 6 0 0 0-6-6 6 6 0 0 0-6 6 4.65 4.65 0 0 0 1.5 3.5c.76.76 1.23 1.52 1.41 2.5"/>' },
};

window.PAGE_DATA = {

  hero: {
    badge:            'Human Written Service',
    title:            'Handwritten Assignments<br>Done Right, On Time',
    desc:             'Deadline কাল, সময় নেই? চিন্তা নেই — আমরা আছি। Assignment থেকে lab report, সব কিছু সুন্দর হাতের লেখায়, university format মেনে তৈরি করে দিই।',
    primaryBtn:       'এখনই শুরু করো',
    primaryOnClick:   '',
    secondaryBtn:     'আগে কথা বলি',
    secondaryOnClick: "window.open('https://wa.me/8801XXXXXXXXX','_blank')",
  },

  stats: [
    { star: true, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z"/></svg>', val: '4.9/5', sub: '(312 Reviews)' },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4.3M17 6h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4.3"/></svg>', val: '500+', sub: 'Projects' },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>', val: '98%', sub: 'On-Time' },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>', val: '100%', sub: 'Human Written' },
  ],

  about: {
    title: 'Why Students Trust Scriptora for Handwritten Academic Work',
    paras: [
      'Handwritten academic work represents more than neatly written pages — it reflects your dedication, professionalism, and attention to detail. At Scriptora, we prepare assignments, lab reports, practical notebooks, record books, and project copies with <strong>clear handwriting, consistent presentation, and university-standard formatting</strong>, helping you submit every document with confidence.',
    ],
    highlights: [
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>', title: 'Professional Handwriting Specialists', desc: 'Experienced in university-standard academic documents with consistent handwriting and clean margins.' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title: 'Reliable &amp; On-Time Delivery', desc: 'Every project is carefully scheduled and delivered within your requested timeline.' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>', title: 'Smart Client Dashboard', desc: 'Track progress, review scanned previews, and receive your final files securely.' },
    ],
    parasAfter: [
      'Every document is completed according to your university\'s requirements and remains <strong>completely confidential</strong>. Track your project through your <strong>Scriptora dashboard</strong>, review scanned previews, and receive your handwritten work within your requested deadline.',
    ],
    mission: null,
  },

  why: {
    title: 'Why Students Choose Scriptora',
    items: [
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>', title: 'Natural Human Handwriting', desc: 'Every page carefully handwritten by real professionals — consistent spacing, clean presentation from first to last.' },
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>', title: 'Beautiful Presentation', desc: 'Clean headings, balanced spacing, neat borders — professional presentation ready for university submission.' },
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', title: 'Complete Privacy', desc: 'Your identity, order details, and academic documents remain completely confidential.' },
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>', title: 'Smart Client Dashboard', desc: 'Track your project, review scanned previews, and receive your final files securely.' },
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/></svg>', title: 'University Standards', desc: 'Every document follows your university\'s academic requirements — margins, headings, spacing, and page structure.' },
    ],
  },

  expert: null,

  workflow: {
    title: 'How Your Handwritten Work Gets Delivered',
    steps: [
      { title: 'Submit Requirement',   desc: 'Subject, page count, ink preference, university guidelines &amp; deadline' },
      { title: 'Review Instructions', desc: 'Our team reviews your format rules, margin specs, and heading structure' },
      { title: 'Handwriting Begins',  desc: 'Skilled professionals write your document neatly page by page' },
      { title: 'Quality Check',       desc: 'Every page inspected for neatness, margins, headings &amp; ink consistency' },
      { title: 'Delivery',            desc: 'High-quality scanned copies on your dashboard. Physical delivery available on request' },
    ],
  },

  deliverables: {
    title: 'Our Quality Commitment',
    items: ['100% Human Written', 'No Printed Text', 'Professional Presentation', 'Proper Margins', 'Correct Heading Style', 'University Standard', 'Confidential Handling', 'On-Time Delivery'],
  },

  samples: {
    title: 'Handwriting Samples',
    photo: 'assets/Handwritten/HSS-chemistry-lab.png',
    photoAlt: 'Chemistry Lab Report — handwritten by Scriptora',
    slides: [
      {
        img: 'assets/Handwritten/HSS-chemistry-lab.png',
        alt: 'Chemistry Lab Report',
        badge: 'Chemistry',
        badgeCls: 'blue',
        badgeIcon: '<path d="M9 2v6.34a2 2 0 0 1-.4 1.2L4.3 15.7A2 2 0 0 0 6 19h12a2 2 0 0 0 1.7-3.3l-4.3-6.16a2 2 0 0 1-.4-1.2V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
        type: 'Lab Report',
        title: 'Chemistry Lab Report',
        desc: 'Aspirin synthesis experiment — aim, procedure, observation table আর chemical equation সহ সম্পূর্ণ lab report। University format মেনে neat handwriting এ লেখা।',
        features: ['blueInk', 'universityFormat', 'neatHandwriting', 'tablesIncluded', 'diagramIncluded', 'originalWork'],
      },
      {
        img: 'assets/Handwritten/HSS-Assignment.png',
        alt: 'Physics Assignment',
        badge: 'Physics',
        badgeCls: 'purple',
        badgeIcon: '<circle cx="12" cy="12" r="1"/><ellipse cx="12" cy="12" rx="10" ry="4.5"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)"/>',
        type: 'Assignment',
        title: 'Physics Assignment',
        desc: 'Projectile Motion — theory, formula, hand-drawn diagram সহ পুরো assignment। Proper margin, clear handwriting, neat diagram।',
        features: ['blueInk', 'universityFormat', 'neatHandwriting', 'ruledNotebook', 'handDrawnDiagram', 'originalWork'],
      },
      {
        img: 'assets/Handwritten/HSS-Circuit-diagram.png',
        alt: 'EEE Circuit Diagram',
        badge: 'EEE',
        badgeCls: 'cyan',
        badgeIcon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
        type: 'Practical',
        title: 'EEE Circuit Diagram & Practical',
        desc: 'Half Wave Rectifier practical — circuit diagram, observation table আর result সহ complete practical। Circuit hand-drawn, সব component labeled।',
        features: ['blueInk', 'universityFormat', 'neatHandwriting', 'tablesIncluded', 'circuitDiagram', 'originalWork'],
      },
      {
        img: 'assets/Handwritten/HSS-lab-report.png',
        alt: 'Rate of Reaction Lab Report',
        badge: 'Chemistry',
        badgeCls: 'green',
        badgeIcon: '<path d="M9 2v6.34a2 2 0 0 1-.4 1.2L4.3 15.7A2 2 0 0 0 6 19h12a2 2 0 0 0 1.7-3.3l-4.3-6.16a2 2 0 0 1-.4-1.2V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
        type: 'Lab Report',
        title: 'Rate of Reaction — Lab Report',
        desc: 'HCl reaction rate experiment — objective, materials, procedure আর chemical equation সহ। Grid paper এ neat formatting, submit করতে ready।',
        features: ['blueInk', 'universityFormat', 'neatHandwriting', 'gridNotebook', 'chemicalEquation', 'originalWork'],
      },
    ],
    items: [
      { dot: 'purple', title: 'Assignment & Practical Notebooks',  desc: 'Ruled pages, proper headings, balanced line spacing.' },
      { dot: 'blue',   title: 'Lab Reports & Record Books',        desc: 'Experiment tables, results, conclusions — neatly formatted.' },
      { dot: 'cyan',   title: 'Project Copies & Class Notes',      desc: 'Cover page, index, and full document in your university format.' },
      { dot: 'green',  title: 'Engineering & CSE Practicals',      desc: 'Diagrams, circuit drawings, and code blocks written clearly by hand.' },
    ],
  },
  dashboard: null,

  faq: [
    { q: 'Can you follow my university\'s exact format and margin rules?',  a: 'হ্যাঁ, আপনার University-র নির্দিষ্ট Margin, Heading Format, এবং Page Structure অনুযায়ী Document তৈরি করা হয়।' },
    { q: 'Which ink color do you use — blue or black?',                      a: 'আপনার পছন্দ অনুযায়ী Blue বা Black উভয় Ink-ই Available। Order-এর সময় উল্লেখ করুন।' },
    { q: 'What type of notebook or paper do you write on?',                  a: 'Standard A4 Lined Paper, Lab Notebook, Practical Copy এবং আপনার University-র Specific Format-এ লিখি।' },
    { q: 'How long does delivery take?',                                      a: 'সাধারণত ২৪ থেকে ৭২ ঘণ্টার মধ্যে Deliver করা হয়। Urgent Delivery-ও Available।' },
    { q: 'Is my assignment kept confidential?',                              a: 'হ্যাঁ, আপনার Assignment এবং Personal Details সম্পূর্ণ গোপনীয় রাখা হয়।' },
  ],

  cta: {
    icon:           '✍️',
    title:          'Need Professional<br>Handwritten Academic Work?',
    desc:           'Upload your assignment today and let our experts prepare neat, university-standard handwritten documents delivered on time.',
    primaryBtn:     'Start Your Order →',
    primaryOnClick: 'orderHandwrittenPackage && orderHandwrittenPackage()',
  },

};
