/* ================================================================
   SCRIPTORA — PRICING CONFIGURATION (pricing-config.js)
   ================================================================
   ⚙️  এই ফাইলে শুধু price আর settings পরিবর্তন করুন।
   বাকি কোনো ফাইল ছুঁতে হবে না।

   HTML load order:
   <script src="js/pricing-config.js"></script>   ← আগে
   <script src="js/pricing.js"></script>
   <script src="js/pricing-calculator.js"></script>
   ================================================================ */

window.SCRIPTORA_CONFIG = {

  /* ────────────────────────────────────────────
     THESIS / FULL SERVICE — Hero card
  ──────────────────────────────────────────── */
  thesis: {
    /* প্রতি ১০০০ শব্দে দাম (৳) — type অনুযায়ী */
    pricePerWord: {
      full:     1.0,   /* Full Thesis      — ৳১.০০/word  */
      chapter:  1.2,   /* Single Chapter   — ৳১.২০/word  */
      proposal: 1.5,   /* Proposal Only    — ৳১.৫০/word  */
    },

    /* Deadline multiplier */
    deadlineMultiplier: {
      standard: 1.0,
      express:  1.3,   /* +৩০% */
      rush:     1.6,   /* +৬০% */
    },

    /* Delivery time text */
    deliveryText: {
      standard: '10 – 15 Days',
      express:  '5 – 7 Days',
      rush:     '2 – 3 Days',
    },

    minWords:    5000,
    wordStep:    1000,
    defaultType: 'full',
    defaultDeadline: 'standard',
  },

  /* ────────────────────────────────────────────
     OTHER SERVICES — Cards
     rate: base price (৳)
     perUnit: কত unit এর জন্য rate প্রযোজ্য
  ──────────────────────────────────────────── */
  services: [
    {
      id: 'assignment-writing', category: 'writing', badge: 'popular',
      icon: '📝', iconBg: 'rgba(45,110,247,0.18)',
      title: 'Assignment Writing', titleBn: 'অ্যাসাইনমেন্ট রাইটিং',
      desc: 'Our experts craft your assignments with precision.',
      unitType: 'words', unitLabel: 'words', perUnit: 500, rate: 200,
      step: 500, min: 500, defaultQty: 500,
      deadlineDays: { normal: 4, urgent: 2, critical: 1 },
    },
    {
      id: 'presentation-slides', category: 'writing', badge: null,
      icon: '🖥️', iconBg: 'rgba(236,72,153,0.18)',
      title: 'Presentation Slides', titleBn: 'প্রেজেন্টেশন স্লাইড',
      desc: 'Professional decks that impress professors.',
      unitType: 'slides', unitLabel: 'slides', perUnit: 1, rate: 60,
      step: 1, min: 5, defaultQty: 10,
      deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    },
    {
      id: 'proofreading', category: 'editing', badge: null,
      icon: '🔍', iconBg: 'rgba(96,165,250,0.18)',
      title: 'Proofreading', titleBn: 'প্রুফরিডিং সার্ভিস',
      desc: 'Eliminate errors and polish your academic writing.',
      unitType: 'words', unitLabel: 'words', perUnit: 1000, rate: 100,
      step: 500, min: 1000, defaultQty: 1000,
      deadlineDays: { normal: 3, urgent: 1, critical: 0.5 },
    },
    {
      id: 'apa-mla-formatting', category: 'editing', badge: null,
      icon: '📑', iconBg: 'rgba(245,158,11,0.18)',
      title: 'Formatting (APA/MLA)', titleBn: 'ফরম্যাটিং সার্ভিস',
      desc: 'Perfect citation styles: APA, MLA, Chicago & Harvard.',
      unitType: 'pages', unitLabel: 'pages', perUnit: 1, rate: 20,
      step: 1, min: 1, defaultQty: 5,
      deadlineDays: { normal: 2, urgent: 1, critical: 0.5 },
    },
    {
      id: 'plagiarism-reduction', category: 'editing', badge: null,
      icon: '🛡️', iconBg: 'rgba(34,197,94,0.18)',
      title: 'Plagiarism Reduction', titleBn: 'প্লেজিয়ারিজম রিডাকশন',
      desc: 'Guaranteed below 15% similarity with Turnitin report.',
      unitType: 'words', unitLabel: 'words', perUnit: 1000, rate: 200,
      step: 500, min: 500, defaultQty: 1000,
      deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    },
    {
      id: 'spss-analysis', category: 'research', badge: 'expert',
      icon: '📊', iconBg: 'rgba(139,92,246,0.18)',
      title: 'SPSS Analysis', titleBn: 'এসপিএসএস বিশ্লেষণ',
      desc: 'Statistical analysis with full interpretation report.',
      unitType: 'tier',
      tiers: [
        { name: 'Basic',        price: 1500 },
        { name: 'Intermediate', price: 2500 },
        { name: 'Advanced',     price: 3000 },
      ],
      defaultTier: 0,
      deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    },
    {
      id: 'research-proposal', category: 'research', badge: null,
      icon: '🔎', iconBg: 'rgba(20,184,166,0.18)',
      title: 'Research Proposal', titleBn: 'রিসার্চ প্রপোজাল',
      desc: 'Structured proposals that get approved on the first try.',
      unitType: 'pages', unitLabel: 'pages', perUnit: 1, rate: 149,
      step: 1, min: 1, defaultQty: 5,
      deadlineDays: { normal: 5, urgent: 3, critical: 2 },
    },
    {
      id: 'case-study-report', category: 'writing', badge: null,
      icon: '📁', iconBg: 'rgba(251,113,133,0.18)',
      title: 'Case Study Report', titleBn: 'কেস স্টাডি রিপোর্ট',
      desc: 'In-depth case study reports with real-world analysis.',
      unitType: 'words', unitLabel: 'words', perUnit: 1000, rate: 399,
      step: 500, min: 500, defaultQty: 1000,
      deadlineDays: { normal: 4, urgent: 2, critical: 1 },
    },
    {
      id: 'cv-writing', category: 'writing', badge: null,
      icon: '📄', iconBg: 'rgba(99,102,241,0.18)',
      title: 'CV Writing', titleBn: 'সিভি লেখার সার্ভিস',
      desc: 'Professional CVs that highlight your strengths.',
      unitType: 'fixed', rate: 600,
      deadlineDays: { normal: 2, urgent: 1, critical: 0.5 },
    },
    {
      id: 'ai-plagiarism-remover', category: 'editing', badge: null,
      icon: '🧠', iconBg: 'rgba(168,85,247,0.18)',
      title: 'AI Plagiarism Remover', titleBn: 'এআই কনটেন্ট হিউম্যানাইজেশন',
      desc: 'Make AI-generated content undetectable.',
      unitType: 'words', unitLabel: 'words', perUnit: 1000, rate: 600,
      step: 1000, min: 1000, defaultQty: 2000,
      deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    },
    {
      id: 'sop-writing', category: 'writing', badge: null,
      icon: '📜', iconBg: 'rgba(244,114,182,0.18)',
      title: 'SOP Writing', titleBn: 'স্টেটমেন্ট অফ পারপাস',
      desc: 'Compelling statements of purpose for your target university.',
      unitType: 'fixed', rate: 900,
      deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    },
    {
      id: 'lab-report-writing', category: 'research', badge: null,
      icon: '🧪', iconBg: 'rgba(34,211,238,0.18)',
      title: 'Lab Report Writing', titleBn: 'ল্যাব রিপোর্ট লেখার সার্ভিস',
      desc: 'Accurate lab reports with proper data analysis.',
      unitType: 'words', unitLabel: 'words', perUnit: 1000, rate: 450,
      step: 1000, min: 1000, defaultQty: 1000,
      deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    },
    {
      id: 'project-planning', category: 'research', badge: null,
      icon: '🧭', iconBg: 'rgba(132,204,22,0.18)',
      title: 'Project/Assignment Planning', titleBn: 'প্রজেক্ট প্ল্যানিং সার্ভিস',
      desc: 'Clear outlines and roadmaps to kickstart your project.',
      unitType: 'fixed', rate: 350,
      deadlineDays: { normal: 2, urgent: 1, critical: 0.5 },
    },
    {
      id: 'ai-detection-report', category: 'editing', badge: null,
      icon: '🕵️', iconBg: 'rgba(250,204,21,0.18)',
      title: 'AI Detection Report', titleBn: 'এআই ডিটেকশন রিপোর্ট',
      desc: 'Instant AI-content detection scoring with a detailed report.',
      unitType: 'fixed', rate: 150,
      deadlineDays: { normal: 1, urgent: 0.5, critical: 0.25 },
    },
    {
      id: 'research-article', category: 'writing', badge: null,
      icon: '📰', iconBg: 'rgba(217,70,239,0.18)',
      title: 'Research Article / Journal Paper', titleBn: 'রিসার্চ আর্টিকেল লেখার সার্ভিস',
      desc: 'Publication-ready research articles crafted to journal standards.',
      unitType: 'words', unitLabel: 'words', perUnit: 1000, rate: 1000,
      step: 1000, min: 1000, defaultQty: 3000,
      deadlineDays: { normal: 7, urgent: 4, critical: 2 },
    },
  ],

  /* ────────────────────────────────────────────
     URGENCY MULTIPLIERS (services cards)
  ──────────────────────────────────────────── */
  urgency: {
    normal:   { label: 'Standard', multiplier: 1.0 },
    urgent:   { label: 'Express',  multiplier: 1.4 },
    critical: { label: 'Rush',     multiplier: 1.8 },
  },

  /* ────────────────────────────────────────────
     CATEGORIES
  ──────────────────────────────────────────── */
  categories: [
    { id: 'writing',  label: 'Writing & Content',   icon: '✍️' },
    { id: 'editing',  label: 'Editing & Plagiarism', icon: '🔍' },
    { id: 'research', label: 'Research & Analysis',  icon: '📊' },
  ],
};
