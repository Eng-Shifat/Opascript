/* ============================================================
   SCRIPTORA — pricing-calculator.js (New Card Design)
   ============================================================ */

const URGENCY = {
  normal:   { label: "Standard", multiplier: 1 },
  urgent:   { label: "Express",  multiplier: 1.4 },
  critical: { label: "Rush",     multiplier: 1.8 }
};

const SERVICES = [
  {
    id: "assignment-writing", badge: "popular",
    icon: "📝", iconBg: "rgba(45,110,247,0.18)",
    title: "Assignment Writing", titleBn: "অ্যাসাইনমেন্ট রাইটিং",
    description: "Our experts craft your assignments with precision.",
    unitType: "words", unitLabel: "words", perUnit: 500, rate: 200,
    step: 500, min: 500, defaultQty: 500,
    deadlineDays: { normal: 4, urgent: 2, critical: 1 }
  },
  {
    id: "presentation-slides", badge: null,
    icon: "🖥️", iconBg: "rgba(236,72,153,0.18)",
    title: "Presentation Slides", titleBn: "প্রেজেন্টেশন স্লাইড",
    description: "Professional decks that impress professors.",
    unitType: "slides", unitLabel: "slides", perUnit: 1, rate: 60,
    step: 1, min: 5, defaultQty: 10,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 }
  },
  {
    id: "proofreading", badge: null,
    icon: "🔍", iconBg: "rgba(96,165,250,0.18)",
    title: "Proofreading", titleBn: "প্রুফরিডিং সার্ভিস",
    description: "Eliminate errors and polish your academic writing.",
    unitType: "words", unitLabel: "words", perUnit: 1000, rate: 100,
    step: 500, min: 1000, defaultQty: 1000,
    deadlineDays: { normal: 3, urgent: 1, critical: 0.5 }
  },
  {
    id: "apa-mla-formatting", badge: null,
    icon: "📑", iconBg: "rgba(245,158,11,0.18)",
    title: "Formatting (APA/MLA)", titleBn: "ফরম্যাটিং সার্ভিস",
    description: "Perfect citation styles: APA, MLA, Chicago & Harvard.",
    unitType: "pages", unitLabel: "pages", perUnit: 1, rate: 20,
    step: 1, min: 1, defaultQty: 5,
    deadlineDays: { normal: 2, urgent: 1, critical: 0.5 }
  },
  {
    id: "plagiarism-reduction", badge: null,
    icon: "🛡️", iconBg: "rgba(34,197,94,0.18)",
    title: "Plagiarism Reduction", titleBn: "প্লেজিয়ারিজম রিডাকশন",
    description: "Guaranteed below 15% similarity with Turnitin report.",
    unitType: "words", unitLabel: "words", perUnit: 1000, rate: 200,
    step: 500, min: 500, defaultQty: 1000,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 }
  },
  {
    id: "spss-analysis", badge: "expert",
    icon: "📊", iconBg: "rgba(139,92,246,0.18)",
    title: "SPSS Analysis", titleBn: "এসপিএসএস বিশ্লেষণ",
    description: "Statistical analysis with full interpretation report.",
    unitType: "tier",
    tiers: [{ name: "Basic", price: 1500 }, { name: "Intermediate", price: 2500 }, { name: "Advanced", price: 3000 }],
    defaultTier: 0,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 }
  },
  {
    id: "research-proposal", badge: null,
    icon: "🔎", iconBg: "rgba(20,184,166,0.18)",
    title: "Research Proposal", titleBn: "রিসার্চ প্রপোজাল",
    description: "Structured proposals that get approved on the first try.",
    unitType: "pages", unitLabel: "pages", perUnit: 1, rate: 149,
    step: 1, min: 1, defaultQty: 5,
    deadlineDays: { normal: 5, urgent: 3, critical: 2 }
  },
  {
    id: "case-study-report", badge: null,
    icon: "📁", iconBg: "rgba(251,113,133,0.18)",
    title: "Case Study Report", titleBn: "কেস স্টাডি রিপোর্ট",
    description: "In-depth case study reports with real-world analysis.",
    unitType: "words", unitLabel: "words", perUnit: 1000, rate: 399,
    step: 500, min: 500, defaultQty: 1000,
    deadlineDays: { normal: 4, urgent: 2, critical: 1 }
  },
  {
    id: "cv-writing", badge: null,
    icon: "📄", iconBg: "rgba(99,102,241,0.18)",
    title: "CV Writing", titleBn: "সিভি লেখার সার্ভিস",
    description: "Professional CVs that highlight your strengths.",
    unitType: "fixed", rate: 600,
    deadlineDays: { normal: 2, urgent: 1, critical: 0.5 }
  },
  {
    id: "ai-plagiarism-remover", badge: null,
    icon: "🧠", iconBg: "rgba(168,85,247,0.18)",
    title: "AI Plagiarism Remover", titleBn: "এআই কনটেন্ট হিউম্যানাইজেশন",
    description: "Make AI-generated content undetectable.",
    unitType: "words", unitLabel: "words", perUnit: 1000, rate: 600,
    step: 1000, min: 1000, defaultQty: 2000,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 }
  },
  {
    id: "sop-writing", badge: null,
    icon: "📜", iconBg: "rgba(244,114,182,0.18)",
    title: "SOP Writing", titleBn: "স্টেটমেন্ট অফ পারপাস",
    description: "Compelling statements of purpose for your target university.",
    unitType: "fixed", rate: 900,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 }
  },
  {
    id: "lab-report-writing", badge: null,
    icon: "🧪", iconBg: "rgba(34,211,238,0.18)",
    title: "Lab Report Writing", titleBn: "ল্যাব রিপোর্ট লেখার সার্ভিস",
    description: "Accurate lab reports with proper data analysis.",
    unitType: "words", unitLabel: "words", perUnit: 1000, rate: 450,
    step: 1000, min: 1000, defaultQty: 1000,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 }
  },
  {
    id: "project-planning", badge: null,
    icon: "🧭", iconBg: "rgba(132,204,22,0.18)",
    title: "Project/Assignment Planning", titleBn: "প্রজেক্ট প্ল্যানিং সার্ভিস",
    description: "Clear outlines and roadmaps to kickstart your project.",
    unitType: "fixed", rate: 350,
    deadlineDays: { normal: 2, urgent: 1, critical: 0.5 }
  },
  {
    id: "ai-detection-report", badge: null,
    icon: "🕵️", iconBg: "rgba(250,204,21,0.18)",
    title: "AI Detection Report", titleBn: "এআই ডিটেকশন রিপোর্ট",
    description: "Instant AI-content detection scoring with a detailed report.",
    unitType: "fixed", rate: 150,
    deadlineDays: { normal: 1, urgent: 0.5, critical: 0.25 }
  },
  {
    id: "research-article", badge: null,
    icon: "📰", iconBg: "rgba(217,70,239,0.18)",
    title: "Research Article/Journal Paper", titleBn: "রিসার্চ আর্টিকেল লেখার সার্ভিস",
    description: "Publication-ready research articles crafted to journal standards.",
    unitType: "words", unitLabel: "words", perUnit: 1000, rate: 1000,
    step: 1000, min: 1000, defaultQty: 3000,
    deadlineDays: { normal: 7, urgent: 4, critical: 2 }
  }
];

/* ── STATE ── */
const state = {};
SERVICES.forEach(s => {
  state[s.id] = {
    qty: s.defaultQty || (s.tiers ? 0 : 0),
    tierIndex: s.defaultTier || 0,
    urgency: 'normal'
  };
});

/* ── HELPERS ── */
function fmtDays(days) {
  if (days < 1) return `${Math.round(days * 24)} Hours Delivery`;
  return `${days} Days Delivery`;
}
function calcPrice(s, urgency) {
  const mult = URGENCY[urgency].multiplier;
  if (s.unitType === 'fixed') return Math.round(s.rate * mult);
  if (s.unitType === 'tier') {
    const tier = s.tiers[state[s.id].tierIndex];
    return Math.round(tier.price * mult);
  }
  const qty = state[s.id].qty;
  return Math.round((qty / s.perUnit) * s.rate * mult);
}
function getStartingPrice(s) {
  if (s.unitType === 'fixed') return s.rate;
  if (s.unitType === 'tier') return s.tiers[0].price;
  return Math.round((s.min / s.perUnit) * s.rate);
}
function fmtNum(n) { return n.toLocaleString('en-IN'); }

/* ── BUILD CARD ── */
function buildCard(s) {
  const st = state[s.id];
  const urgency = st.urgency;
  const price = calcPrice(s, urgency);
  const days = s.deadlineDays[urgency];
  const badgeHtml = s.badge === 'popular'
    ? '<div class="osc-badge popular">POPULAR</div>'
    : s.badge === 'expert'
    ? '<div class="osc-badge expert">EXPERT</div>'
    : '';

  // quantity block
  let qtyBlock = '';
  if (s.unitType === 'words' || s.unitType === 'slides' || s.unitType === 'pages') {
    const unitLabel = s.unitLabel || s.unitType;
    const label = s.unitType === 'words' ? `শব্দ (WORDS) (কমপক্ষে ${fmtNum(s.min)})`
                : s.unitType === 'slides' ? `স্লাইড (SLIDES) (কমপক্ষে ${s.min})`
                : `পৃষ্ঠা (PAGES) (কমপক্ষে ${s.min})`;
    qtyBlock = `
      <div class="osc-field-label">${label}</div>
      <div class="osc-counter">
        <button class="osc-count-btn" onclick="changeQty('${s.id}',-${s.step})">−</button>
        <span class="osc-count-val" id="qty-${s.id}">${fmtNum(st.qty)} ${unitLabel}</span>
        <button class="osc-count-btn" onclick="changeQty('${s.id}',${s.step})">+</button>
      </div>`;
  } else if (s.unitType === 'tier') {
    const tierBtns = s.tiers.map((t, i) =>
      `<button class="osc-tier-btn${i === st.tierIndex ? ' active' : ''}" onclick="setTier('${s.id}',${i})">${t.name}</button>`
    ).join('');
    qtyBlock = `<div class="osc-field-label">প্যাকেজ (PACKAGE)</div><div class="osc-tier-btns">${tierBtns}</div>`;
  } else {
    qtyBlock = `<div class="osc-fixed-note">Fixed Price Service</div>`;
  }

  const urgencyBtns = Object.entries(URGENCY).map(([key, val]) =>
    `<button class="osc-dl-btn${urgency === key ? ' active' : ''}" onclick="setUrgency('${s.id}','${key}')">${val.label}</button>`
  ).join('');

  return `
    <div class="osc-card" id="card-${s.id}">
      ${badgeHtml}
      <div class="osc-card-head">
        <div class="osc-icon" style="background:${s.iconBg}">${s.icon}</div>
        <div>
          <div class="osc-title">${s.title}</div>
          <div class="osc-title-bn">${s.titleBn}</div>
        </div>
      </div>
      <p class="osc-desc">${s.description}</p>
      ${qtyBlock}
      <div class="osc-field-label">ডেডলাইন (Deadline)</div>
      <div class="osc-dl-btns">${urgencyBtns}</div>
      <div class="osc-footer">
        <div>
          <div class="osc-from">From</div>
          <div class="osc-price">৳<span id="price-${s.id}">${fmtNum(price)}</span></div>
          <div class="osc-delivery" id="del-${s.id}">${fmtDays(days)}</div>
        </div>
        <button class="osc-order-btn" onclick="window.location.href='../Order page/order.html'">Order Now →</button>
      </div>
    </div>`;
}

function updateCard(id) {
  const s = SERVICES.find(x => x.id === id);
  if (!s) return;
  const st = state[id];
  const price = calcPrice(s, st.urgency);
  const days = s.deadlineDays[st.urgency];

  const priceEl = document.getElementById(`price-${id}`);
  if (priceEl) priceEl.textContent = fmtNum(price);
  const delEl = document.getElementById(`del-${id}`);
  if (delEl) delEl.textContent = fmtDays(days);

  // update qty display
  const qtyEl = document.getElementById(`qty-${id}`);
  if (qtyEl) qtyEl.textContent = `${fmtNum(st.qty)} ${s.unitLabel || ''}`;

  // update urgency buttons
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.querySelectorAll('.osc-dl-btn').forEach((btn, i) => {
      const key = Object.keys(URGENCY)[i];
      btn.classList.toggle('active', key === st.urgency);
    });
    card.querySelectorAll('.osc-tier-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === st.tierIndex);
    });
  }
}

window.changeQty = function(id, delta) {
  const s = SERVICES.find(x => x.id === id);
  state[id].qty = Math.max(s.min, state[id].qty + delta);
  updateCard(id);
};
window.setUrgency = function(id, level) {
  state[id].urgency = level;
  updateCard(id);
};
window.setTier = function(id, index) {
  state[id].tierIndex = index;
  updateCard(id);
};

function renderAllCards() {
  const grid = document.getElementById('prCalcGrid');
  if (!grid) return;
  grid.innerHTML = SERVICES.map(buildCard).join('');
}

document.addEventListener('DOMContentLoaded', renderAllCards);
