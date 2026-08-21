/* =====================================================
   THESIS WRITING PAGE — thesis-data.js
   Content data for mobile.js (shared template).
   Only change THIS file for thesis page content.
   ===================================================== */

window.PAGE_DATA = {

  hero: {
    badge:           'Professional Thesis Writing Service',
    title:           'Writing a Thesis is Your Defining Milestone',
    desc:            'Led by a Fiverr Level-2 Certified Writer, we deliver 100% flawless, AI-free, and plagiarism-free thesis support tailored to 20+ local &amp; international university guidelines—delivered right on time.',
    primaryBtn:      'Start Your Project',
    primaryOnClick:  'openThesisOrderPopup()',
    secondaryBtn:    'Talk to an Expert',
    secondaryOnClick: "window.open('https://wa.me/8801881870349','_blank')",
  },

  stats: [
    { star: true, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z"/></svg>', val: '4.9/5', sub: '(312 Reviews)' },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 1.5 4 4 4.3M17 6h3a1 1 0 0 1 1 1c0 2.5-1.5 4-4 4.3"/></svg>', val: '500+', sub: 'Projects' },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>', val: '98%', sub: 'On-Time' },
    { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>', val: '100%', sub: 'Confidential' },
  ],

  about: {
    title: 'About This Thesis Writing Service',
    paras: [
      'Writing a thesis is more than an academic requirement — it is a reflection of your research, dedication, and intellectual growth. Whether you are pursuing an <strong>Undergraduate, Master\'s, or PhD</strong> degree, every thesis deserves the highest standard of quality and professionalism.',
    ],
    highlights: [
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>', title: 'Expert-Led Team', desc: 'Led by a Fiverr Level-2 Certified Writer and supported by experienced academic researchers.' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title: 'Zero-Delay Commitment', desc: 'Your project is completed well ahead of schedule — without sacrificing quality.' },
      { icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>', title: 'Smart Client Dashboard', desc: 'Monitor progress, review drafts, and communicate with your writer in real time.' },
    ],
    parasAfter: [
      'Every project strictly follows your university\'s <strong>formatting guidelines, citation style, and academic requirements</strong>, resulting in a well-structured, original, <strong>AI-free and plagiarism-free</strong> thesis.',
    ],
    mission: 'At Scriptora, we don\'t simply help you finish your thesis — we help you present your research with confidence.',
  },

  why: {
    title: 'Why Students Trust Scriptora',
    items: [
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', title: 'Zero-Delay Commitment', desc: 'We guarantee on-time delivery. Your university deadlines leave no room for uncertainty, and neither do we.' },
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>', title: 'Academic Excellence', desc: 'Research-based workflows and styling reviewed by certified top-tier academic writers.' },
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', title: '100% Strict Confidentiality', desc: 'Your identity, research topics, and data are guarded under ironclad privacy. Zero leaks, guaranteed.' },
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>', title: 'Real-Time Live Tracking', desc: 'No hidden progress. Track your thesis chapter-by-chapter and collaborate directly via your Client Dashboard.' },
      { svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', title: 'Flawless Citation &amp; Formatting', desc: 'Precision formatting across all institutional styles including APA, IEEE, Harvard, MLA, and Chicago.' },
    ],
  },

  expert: {
    headIcon:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z"/><path d="m12 8 1.1 2.3 2.5.35-1.8 1.8.45 2.5L12 13.7l-2.25 1.25.45-2.5-1.8-1.8 2.5-.35L12 8Z"/></svg>',
    heading:    'Meet Your <span class="grad">Academic Expert</span>',
    subheading: 'Your research is guided by experience, expertise, and a commitment to excellence.',
    photo:      'assets/expert-photo.jpg',
    name:       'Yeasin Kabir Shifat',
    badge:      'Fiverr Level 2 Seller',
    role:       'Professional Ghostwriter & Academic Specialist',
    ministats: [
      { cls: 'blue', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', val: '500+', label: 'Projects' },
      { cls: 'gold', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg>', val: '8+', label: 'Years Exp.' },
    ],
    features: [
      { cls: 'green',  svg: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>', title: 'Fiverr Level 2 Certified Seller', desc: 'Verified, trusted & top-rated on Fiverr' },
      { cls: 'blue',   svg: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>', title: '500+ Delivered Projects', desc: 'Successfully completed academic projects' },
      { cls: 'purple', svg: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>', title: '8+ Years Experience', desc: 'Extensive experience in academic ghostwriting' },
      { cls: 'orange', svg: '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/>', title: 'Thesis &amp; Research Specialist', desc: 'Expert in thesis writing &amp; research documentation' },
    ],
    quote: 'I help students transform their ideas into well-researched, plagiarism-free academic work with clarity and precision.',
  },

  workflow: {
    title: 'How Your Thesis Will Be Completed',
    steps: [
      { title: 'Share Your Topic',       desc: 'Topic, Guidelines &amp; Requirements' },
      { title: 'Planning &amp; Research', desc: 'Project Planning, Research Outline Preparation' },
      { title: 'Writing',                desc: 'Professional Academic Writing' },
      { title: 'Review &amp; Formatting', desc: 'Grammar, Formatting, Citation Quality Check' },
      { title: 'Delivery',               desc: 'Dashboard Notification, Preview Final Delivery' },
    ],
  },

  deliverables: {
    title: 'What You Will Receive',
    items: ['Research-based Writing', 'Professional Formatting', 'Proper Citation', 'AI + Human Quality Review', 'Editable Source Files', 'Progress Dashboard', 'Revision Support', 'Secure File Delivery', 'Turnitin Report'],
  },

  samples: null,

  dashboard: null,


  faq: [
    { q: 'Is the content 100% original?',              a: 'হ্যাঁ, প্রতিটি থিসিস সম্পূর্ণ Original ও Plagiarism-free — Turnitin Report সহ Deliver করা হয়।' },
    { q: 'Will I get Turnitin report?',                 a: 'Premium Package-এর সাথে Turnitin Report Include করা থাকে।' },
    { q: 'Can you follow my university guidelines?',   a: 'অবশ্যই — আপনার University-র নির্দিষ্ট Guideline অনুযায়ী Format করা হয়।' },
    { q: 'What if I need revisions?',                  a: 'Premium Package-এ Unlimited Revision Included।' },
    { q: 'How long does it take to complete a thesis?', a: 'Package অনুযায়ী 10–20 দিনের মধ্যে Deliver করা হয়।' },
  ],

  cta: {
    icon:          '🎓',
    title:         'Ready to Start<br>Your Thesis?',
    desc:          'Let our experts help you achieve academic success.',
    primaryBtn:    'Start Your Project Today →',
    primaryOnClick: 'orderThesisPackage && orderThesisPackage()',
  },

};
