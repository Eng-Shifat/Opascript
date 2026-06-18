/* ============================================================
   SCRIPTORA — pricing-calculator.js
   Interactive "Pricing & Quote Calculator" section
   ------------------------------------------------------------
   HOW TO EDIT PRICES / SERVICES
   Everything lives in the SERVICES array below. To change a
   rate, add a service, or rename something — edit ONLY the
   SERVICES array. The rendering + price-calculation logic
   below it does not need to change.
   ============================================================ */

/* ---------- 1. URGENCY SETTINGS ---------- */
// multiplier applied to the base price for each urgency level
// (delivery day-count now comes from each service's own `deadlineDays`,
// not from here — every service can have a different turnaround time)
const URGENCY = {
  normal:   { label: "Standard", icon: "🕐", multiplier: 1 },
  urgent:   { label: "Express",  icon: "⚡", multiplier: 1.4 },
  critical: { label: "Rush",     icon: "🚀", multiplier: 1.8 }
};

/* ---------- 2. SERVICE CONFIG ---------- */
// unitType options: "words" | "slides" | "pages" | "tier" | "fixed"
//   words/slides/pages -> +/- quantity stepper, price = (qty / perUnit) * rate
//   tier               -> Basic/Intermediate/Advanced pill selector, fixed prices
//   fixed              -> flat one-time price, no quantity selector
//
// deadlineDays: turnaround time (in days) for each urgency level.
//   Use a decimal < 1 for sub-day delivery, e.g. 0.5 = 12 hours, 0.25 = 6 hours.
// freebies: short list of what's included free with every order (shown under "Included").
const SERVICES = [
  {
    id: "assignment-writing",
    badge: "popular",                 // "popular" | "expert" | null
    icon: "📝",
    iconBg: "rgba(45,110,247,0.18)",
    title: "Assignment Writing",
    titleBn: "অ্যাসাইনমেন্ট রাইটিং সার্ভিস",
    description: "Our experts craft your assignments with precision.",
    unitType: "words",
    unitLabel: "words",
    perUnit: 500,                    // rate is "per 500 words"
    rate: 200,                        // ৳600 per 1000 words
    step: 500,
    min: 500,
    defaultQty: 500,
    deadlineDays: { normal: 4, urgent: 2, critical: 1 },
    freebies: ["Plagiarism Report", "Turnitin Certificate", "Unlimited Revisions"]
  },
  {
    id: "presentation-slides",
    badge: null,
    icon: "🖥️",
    iconBg: "rgba(236,72,153,0.18)",
    title: "Presentation Slides",
    titleBn: "প্রেজেন্টেশন স্লাইড ডিজাইন",
    description: "Professional decks that impress professors.",
    unitType: "slides",
    unitLabel: "slides",
    perUnit: 1,                       // rate is "per slide"
    rate: 60,
    step: 1,
    min: 5,
    defaultQty: 10,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    freebies: ["Design Template", "Speaker Notes", "1 Free Revision"]
  },
  {
    id: "proofreading",
    badge: null,
    icon: "🔍",
    iconBg: "rgba(96,165,250,0.18)",
    title: "Proofreading",
    titleBn: "প্রুফরিডিং সার্ভিস",
    description: "Eliminate errors and polish your academic writing.",
    unitType: "words",
    unitLabel: "words",
    perUnit: 1000,
    rate: 100,
    step: 500,
    min: 1000,
    defaultQty: 1000,
    deadlineDays: { normal: 3, urgent: 1, critical: 0.5 },
    freebies: ["Grammar Report", "Plagiarism Check"]
  },
  {
    id: "apa-mla-formatting",
    badge: null,
    icon: "📑",
    iconBg: "rgba(245,158,11,0.18)",
    title: "Formatting (APA/MLA)",
    titleBn: "ফরম্যাটিং সার্ভিস",
    description: "Perfect citation styles: APA, MLA, Chicago & Harvard.",
    unitType: "pages",
    unitLabel: "pages",
    perUnit: 1,                       // rate is "per page"
    rate: 20,
    step: 1,
    min: 1,
    defaultQty: 5,
    deadlineDays: { normal: 2, urgent: 1, critical: 0.5 },
    freebies: ["Auto-Generated Reference List", "1 Free Revision"]
  },
  {
    id: "plagiarism-reduction",
    badge: null,
    icon: "🛡️",
    iconBg: "rgba(34,197,94,0.18)",
    title: "Plagiarism Reduction",
    titleBn: "প্লেজিয়ারিজম রিডাকশন সার্ভিস",
    description: "Guaranteed below 15% similarity with Turnitin report.",
    unitType: "words",
    unitLabel: "words",
    perUnit: 1000,
    rate: 200,
    step: 500,
    min: 500,
    defaultQty: 1000,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    freebies: ["Before/After Similarity Report", "Turnitin Certificate"]
  },
  {
    id: "spss-analysis",
    badge: "expert",
    icon: "📊",
    iconBg: "rgba(139,92,246,0.18)",
    title: "SPSS Analysis",
    titleBn: "এসপিএসএস বিশ্লেষণ সার্ভিস",
    description: "Statistical analysis with full interpretation report.",
    unitType: "tier",
    tiers: [
      { name: "Basic",        price: 1500 },
      { name: "Intermediate", price: 2500 },
      { name: "Advanced",     price: 3000 }
    ],
    defaultTier: 0,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    freebies: ["Result Interpretation Write-up", "Charts & Tables"]
  },
  {
    id: "research-proposal",
    badge: null,
    icon: "🔎",
    iconBg: "rgba(20,184,166,0.18)",
    title: "Research Proposal",
    titleBn: "রিসার্চ প্রপোজাল সার্ভিস",
    description: "Structured proposals that get approved on the first try.",
    unitType: "pages",
    unitLabel: "pages",
    perUnit: 1,
    rate: 149,
    step: 1,
    min: 1,
    defaultQty: 5,
    deadlineDays: { normal: 5, urgent: 3, critical: 2 },
    freebies: ["Methodology Outline", "Literature Review Outline"]
  },
  {
    id: "case-study-report",
    badge: null,
    icon: "📁",
    iconBg: "rgba(251,113,133,0.18)",
    title: "Case Study Report",
    titleBn: "কেস স্টাডি রিপোর্ট সার্ভিস",
    description: "In-depth case study reports with real-world analysis.",
    unitType: "words",
    unitLabel: "words",
    perUnit: 1000,
    rate: 399,
    step: 500,
    min: 500,
    defaultQty: 1000,
    deadlineDays: { normal: 4, urgent: 2, critical: 1 },
    freebies: ["Executive Summary", "Analysis Framework"]
  },
  {
    id: "cv-writing",
    badge: null,
    icon: "📄",
    iconBg: "rgba(99,102,241,0.18)",
    title: "CV Writing",
    titleBn: "সিভি লেখার সার্ভিস",
    description: "Professional CVs that highlight your strengths and stand out to recruiters.",
    unitType: "fixed",
    rate: 600,
    deadlineDays: { normal: 2, urgent: 1, critical: 0.5 },
    freebies: ["Cover Letter Outline", "1 Free Revision"]
  },
  {
    id: "ai-plagiarism-remover",
    badge: null,
    icon: "🧠",
    iconBg: "rgba(168,85,247,0.18)",
    title: "AI Plagiarism Remover",
    titleBn: "এআই কনটেন্ট হিউম্যানাইজেশন সার্ভিস",
    description: "Make AI-generated content undetectable while keeping the original meaning intact.",
    unitType: "words",
    unitLabel: "words",
    perUnit: 1000,
    rate: 600,
    step: 1000,
    min: 1000,
    defaultQty: 2000,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    freebies: ["Before/After AI-Detection Score Report"]
  },
  {
    id: "sop-writing",
    badge: null,
    icon: "📜",
    iconBg: "rgba(244,114,182,0.18)",
    title: "SOP Writing",
    titleBn: "স্টেটমেন্ট অফ পারপাস লেখার সার্ভিস",
    description: "Compelling statements of purpose tailored to your target university or program.",
    unitType: "fixed",
    rate: 900,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    freebies: ["1 Free Revision", "Formatting Check"]
  },
  {
    id: "lab-report-writing",
    badge: null,
    icon: "🧪",
    iconBg: "rgba(34,211,238,0.18)",
    title: "Lab Report Writing",
    titleBn: "ল্যাব রিপোর্ট লেখার সার্ভিস",
    description: "Accurate lab reports with proper data analysis and structured findings.",
    unitType: "words",
    unitLabel: "words",
    perUnit: 1000,
    rate: 450,
    step: 1000,
    min: 1000,
    defaultQty: 1000,
    deadlineDays: { normal: 3, urgent: 2, critical: 1 },
    freebies: ["Data Table Formatting"]
  },
  {
    id: "project-assignment-planning",
    badge: null,
    icon: "🧭",
    iconBg: "rgba(132,204,22,0.18)",
    title: "Project/Assignment Planning",
    titleBn: "প্রজেক্ট প্ল্যানিং সার্ভিস",
    description: "Clear outlines and roadmaps to kickstart your project or assignment.",
    unitType: "fixed",
    rate: 350,
    deadlineDays: { normal: 2, urgent: 1, critical: 0.5 },
    freebies: ["1 Free Revision"]
  },
  {
    id: "ai-detection-report",
    badge: null,
    icon: "🕵️",
    iconBg: "rgba(250,204,21,0.18)",
    title: "AI Detection Report",
    titleBn: "এআই ডিটেকশন রিপোর্ট সার্ভিস",
    description: "Instant AI-content detection scoring with a detailed report.",
    unitType: "fixed",
    rate: 150,
    deadlineDays: { normal: 1, urgent: 0.5, critical: 0.25 },
    freebies: ["Instant Report Delivery"]
  },
  {
    id: "research-article-writing",
    badge: null,
    icon: "📰",
    iconBg: "rgba(217,70,239,0.18)",
    title: "Research Article/Journal Paper",
    titleBn: "রিসার্চ আর্টিকেল লেখার সার্ভিস",
    description: "Publication-ready research articles crafted to journal standards.",
    unitType: "words",
    unitLabel: "words",
    perUnit: 1000,
    rate: 1000,
    step: 1000,
    min: 1000,
    defaultQty: 3000,
    deadlineDays: { normal: 7, urgent: 4, critical: 2 },
    freebies: ["Plagiarism Check", "Journal Formatting"]
  }
];

/* ---------- 3. STATE ---------- */
// holds the current selection for every card: { qty or tierIndex, urgency }
const calcState = {};

SERVICES.forEach(service => {
  calcState[service.id] = {
    qty: service.unitType === "tier" ? null : service.defaultQty,
    tierIndex: service.unitType === "tier" ? service.defaultTier : null,
    urgency: "normal"
  };
});

/* ---------- 4. PRICE LOGIC ---------- */
function getBasePrice(service, state) {
  if (service.unitType === "tier") {
    return service.tiers[state.tierIndex].price;
  }
  if (service.unitType === "fixed") {
    return service.rate;
  }
  return (state.qty / service.perUnit) * service.rate;
}

function getTotalPrice(service, state) {
  const base = getBasePrice(service, state);
  const multiplier = URGENCY[state.urgency].multiplier;
  return Math.round(base * multiplier);
}

function formatTaka(amount) {
  return Math.round(amount).toLocaleString("en-US");
}

// the lowest possible price for a service (min quantity / cheapest tier / flat rate, Standard speed)
function getStartingPrice(service) {
  if (service.unitType === "tier") return service.tiers[0].price;
  if (service.unitType === "fixed") return service.rate;
  return (service.min / service.perUnit) * service.rate;
}

// human-readable delivery time for the currently selected urgency level
function getDeliveryText(service, urgencyKey) {
  const days = service.deadlineDays[urgencyKey];
  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours} ঘণ্টায় ডেলিভারি`;
  }
  return `${days} দিনে ডেলিভারি`;
}

/* ---------- 5. RENDERING ---------- */
const UNIT_LABEL_BN = { words: "শব্দ (Words)", slides: "স্লাইড (Slides)", pages: "পৃষ্ঠা (Pages)" };

function buildQuantityBlock(service) {
  const label = UNIT_LABEL_BN[service.unitType] || service.unitLabel.toUpperCase();
  const minNote = service.min ? ` (কমপক্ষে ${service.min.toLocaleString("en-US")})` : "";

  return `
    <div class="pr-calc-qty">
      <div class="pr-calc-label">${label}${minNote}</div>
      <div class="pr-calc-stepper">
        <button class="pr-calc-step-btn" data-action="dec" type="button">−</button>
        <div class="pr-calc-qty-display"><span data-role="qty">0</span> ${service.unitLabel}</div>
        <button class="pr-calc-step-btn" data-action="inc" type="button">+</button>
      </div>
    </div>`;
}

function buildTierBlock(service) {
  const pills = service.tiers.map((tier, i) => `
    <button class="pr-calc-pill" data-tier-index="${i}" type="button"><span>${tier.name}</span></button>
  `).join("");
  const rateLine = service.tiers.map(t => `৳${formatTaka(t.price)}`).join(" · ");

  return `
    <div class="pr-calc-qty">
      <div class="pr-calc-label">অ্যানালাইসিস লেভেল (Analysis Level)</div>
      <div class="pr-calc-pills" data-role="tier-pills">${pills}</div>
      <div class="pr-calc-rate">${rateLine}</div>
    </div>`;
}

function buildFixedBlock(service) {
  return `
    <div class="pr-calc-qty">
      <div class="pr-calc-label">প্যাকেজ মূল্য (Package Price)</div>
      <div class="pr-calc-fixed-price">৳${formatTaka(service.rate)} <span>flat rate</span></div>
    </div>`;
}

function buildUrgencyPills() {
  return Object.entries(URGENCY).map(([key, u]) => {
    return `<button class="pr-calc-pill" data-level="${key}" type="button">${u.label}</button>`;
  }).join("");
}

// NOTE: freebies/"Included" block is currently not rendered in the card
// (removed per request). The function is kept here in case it's needed again later.
function buildFreebiesBlock(service) {
  if (!service.freebies || !service.freebies.length) return "";
  const items = service.freebies
    .map(f => `<div class="pr-calc-freebie-item"><span class="pr-calc-freebie-check">✓</span>${f}</div>`)
    .join("");

  return `
    <div class="pr-calc-freebies">
      <div class="pr-calc-label">অন্তর্ভুক্ত সুবিধা (Included)</div>
      <div class="pr-calc-freebie-list">${items}</div>
    </div>`;
}

function buildCard(service) {
  const badgeHtml = service.badge
    ? `<div class="pr-calc-badge ${service.badge}">${service.badge}</div>`
    : "";

  const mainBlock = service.unitType === "tier"
    ? buildTierBlock(service)
    : service.unitType === "fixed"
      ? buildFixedBlock(service)
      : buildQuantityBlock(service);

  const startingPrice = formatTaka(getStartingPrice(service));

  return `
    <div class="pr-calc-card" data-service-id="${service.id}">
      ${badgeHtml}

      <button class="pr-calc-card-toggle" type="button" data-role="toggle">
        <div class="pr-calc-card-head">
          <div class="pr-calc-icon" style="background:${service.iconBg}">${service.icon}</div>
          <div>
            <div class="pr-calc-title">${service.title}</div>
            <div class="pr-calc-titlebn">${service.titleBn}</div>
          </div>
        </div>
        <div class="pr-calc-toggle-right">
          <div class="pr-calc-start-block">
            <div class="pr-calc-start-label">শুরু থেকে</div>
            <div class="pr-calc-start-amount">৳${startingPrice}</div>
          </div>
          <span class="pr-calc-chevron" data-role="chevron">⌄</span>
        </div>
      </button>

      <div class="pr-calc-body" data-role="body">
        <p class="pr-calc-desc">${service.description}</p>

        ${mainBlock}

        <div class="pr-calc-urgency">
          <div class="pr-calc-label">ডেডলাইন (Deadline)</div>
          <div class="pr-calc-pills" data-role="urgency-pills">${buildUrgencyPills()}</div>
        </div>

        <div class="pr-calc-footer">
          <div>
            <div class="pr-calc-label">মোট মূল্য (Total Price)</div>
            <div class="pr-calc-total">৳<span data-role="total">0</span></div>
            <div class="pr-calc-delivery" data-role="delivery">—</div>
          </div>
          <button class="pr-btn filled pr-calc-order" data-role="order" type="button">Order করুন →</button>
        </div>
      </div>
    </div>`;
}

function renderAllCards() {
  const grid = document.getElementById("prCalcGrid");
  if (!grid) return;
  grid.innerHTML = SERVICES.map(buildCard).join("");
}

/* ---------- 6. UPDATE A SINGLE CARD'S DISPLAY ---------- */
function updateCard(service) {
  const card = document.querySelector(`.pr-calc-card[data-service-id="${service.id}"]`);
  if (!card) return;
  const state = calcState[service.id];

  // quantity display (words/slides/pages)
  if (service.unitType !== "tier") {
    const qtyEl = card.querySelector('[data-role="qty"]');
    if (qtyEl) qtyEl.textContent = state.qty.toLocaleString("en-US");

    const decBtn = card.querySelector('[data-action="dec"]');
    if (decBtn) decBtn.disabled = state.qty <= service.min;
  } else {
    // highlight active tier pill
    card.querySelectorAll('[data-tier-index]').forEach(btn => {
      btn.classList.toggle("active", Number(btn.dataset.tierIndex) === state.tierIndex);
    });
  }

  // highlight active urgency pill
  card.querySelectorAll('[data-level]').forEach(btn => {
    btn.classList.toggle("active", btn.dataset.level === state.urgency);
  });

  // total price + delivery text
  const total = getTotalPrice(service, state);
  const totalEl = card.querySelector('[data-role="total"]');
  if (totalEl) totalEl.textContent = formatTaka(total);

  const deliveryEl = card.querySelector('[data-role="delivery"]');
  if (deliveryEl) deliveryEl.textContent = getDeliveryText(service, state.urgency);

  updateCombinedTotal();
}

/* ---------- 7. COMBINED TOTAL BAR ---------- */
function updateCombinedTotal() {
  const sum = SERVICES.reduce((acc, service) => acc + getTotalPrice(service, calcState[service.id]), 0);
  const totalEl = document.getElementById("prCombinedTotal");
  if (totalEl) totalEl.textContent = formatTaka(sum);

  const countEl = document.getElementById("prServiceCount");
  if (countEl) countEl.textContent = SERVICES.length;

  return sum;
}

/* ---------- 8. NAVIGATE TO ORDER PAGE ---------- */
function goToOrderPage(service, state, total) {
  const params = new URLSearchParams();
  params.set("service", service.id);
  params.set("urgency", state.urgency);
  params.set("price", total);

  if (service.unitType === "tier") {
    params.set("tier", service.tiers[state.tierIndex].name);
  } else {
    params.set("qty", state.qty);
    params.set("unit", service.unitType);
  }

  window.location.href = `../Order page/order.html?${params.toString()}`;
}

function goToFullQuote() {
  const params = new URLSearchParams();
  SERVICES.forEach(service => {
    const state = calcState[service.id];
    const total = getTotalPrice(service, state);
    params.set(`${service.id}_price`, total);
    if (service.unitType === "tier") {
      params.set(`${service.id}_tier`, service.tiers[state.tierIndex].name);
    } else {
      params.set(`${service.id}_qty`, state.qty);
    }
    params.set(`${service.id}_urgency`, state.urgency);
  });
  params.set("combined_total", updateCombinedTotal());
  window.location.href = `../Order page/order.html?${params.toString()}`;
}

function goToBundleOrder() {
  const combinedTotal = updateCombinedTotal();
  const bundlePrice = Math.round(combinedTotal * 0.85); // 15% off
  const params = new URLSearchParams();
  params.set("bundle", "true");
  params.set("original_total", combinedTotal);
  params.set("bundle_total", bundlePrice);
  window.location.href = `../Order page/order.html?${params.toString()}`;
}

/* ---------- 9. EVENT BINDING ---------- */
function bindCardEvents() {
  const grid = document.getElementById("prCalcGrid");
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".pr-calc-card");
    if (!card) return;

    const serviceId = card.dataset.serviceId;
    const service = SERVICES.find(s => s.id === serviceId);
    const state = calcState[serviceId];

    // mobile accordion: expand/collapse this card, close the others
    const toggleBtn = e.target.closest('[data-role="toggle"]');
    if (toggleBtn) {
      const wasExpanded = card.classList.contains("expanded");
      grid.querySelectorAll(".pr-calc-card.expanded").forEach(c => c.classList.remove("expanded"));
      if (!wasExpanded) card.classList.add("expanded");
      return;
    }

    // quantity stepper +/-
    const stepBtn = e.target.closest("[data-action]");
    if (stepBtn) {
      if (stepBtn.dataset.action === "inc") {
        state.qty += service.step;
      } else if (stepBtn.dataset.action === "dec") {
        state.qty = Math.max(service.min, state.qty - service.step);
      }
      updateCard(service);
      return;
    }

    // tier pill (SPSS Analysis)
    const tierBtn = e.target.closest("[data-tier-index]");
    if (tierBtn) {
      state.tierIndex = Number(tierBtn.dataset.tierIndex);
      updateCard(service);
      return;
    }

    // urgency pill
    const urgencyBtn = e.target.closest("[data-level]");
    if (urgencyBtn) {
      state.urgency = urgencyBtn.dataset.level;
      updateCard(service);
      return;
    }

    // order button
    const orderBtn = e.target.closest('[data-role="order"]');
    if (orderBtn) {
      const total = getTotalPrice(service, state);
      goToOrderPage(service, state, total);
    }
  });
}

function bindSummaryEvents() {
  const quoteBtn = document.getElementById("prGetQuoteBtn");
  if (quoteBtn) quoteBtn.addEventListener("click", goToFullQuote);

  const bundleBtn = document.getElementById("prBundleBtn");
  if (bundleBtn) bundleBtn.addEventListener("click", goToBundleOrder);
}

/* ---------- 10. INIT ---------- */
function initPricingCalculator() {
  renderAllCards();
  SERVICES.forEach(updateCard); // set initial displayed values for every card
  bindCardEvents();
  bindSummaryEvents();
}

document.addEventListener("DOMContentLoaded", initPricingCalculator);
