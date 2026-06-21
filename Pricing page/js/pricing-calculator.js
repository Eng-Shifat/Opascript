/* ================================================================
   SCRIPTORA — pricing-calculator.js
   Config: pricing-config.js থেকে সব data আসে।
   ================================================================ */

const CFG      = window.SCRIPTORA_CONFIG;
const URGENCY  = CFG.urgency;
const SERVICES = CFG.services;
const CATS     = CFG.categories;

let activeCategory = 'all';

/* ── State ── */
const state = {};
SERVICES.forEach(s => {
  state[s.id] = {
    qty:       s.defaultQty  || s.min || 0,
    tierIndex: s.defaultTier || 0,
    urgency:   'normal',
  };
});

/* ── Helpers ── */
function fmtDays(days) {
  if (!days || days < 1) return `${Math.round((days || 0.5) * 24)} Hours Delivery`;
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

function fmtNum(n) { return Number(n).toLocaleString('en-IN'); }

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Build Card HTML ── */
function buildCard(s) {
  const st      = state[s.id];
  const urgency = st.urgency;
  const price   = calcPrice(s, urgency);
  const days    = s.deadlineDays[urgency];

  const badgeHtml = s.badge === 'popular'
    ? '<div class="osc-badge popular">POPULAR</div>'
    : s.badge === 'expert'
    ? '<div class="osc-badge expert">EXPERT</div>'
    : '';

  /* Quantity block */
  let qtyBlock = '';
  if (s.unitType === 'words' || s.unitType === 'slides' || s.unitType === 'pages') {
    const labelMap = {
      words:  `শব্দ (WORDS) — কমপক্ষে ${fmtNum(s.min)}`,
      slides: `স্লাইড (SLIDES) — কমপক্ষে ${s.min}`,
      pages:  `পৃষ্ঠা (PAGES) — কমপক্ষে ${s.min}`,
    };
    qtyBlock = `
      <div class="osc-field-label">${labelMap[s.unitType]}</div>
      <div class="osc-counter">
        <button class="osc-count-btn" onclick="changeQty('${s.id}',-${s.step})">−</button>
        <span class="osc-count-val" id="qty-${s.id}">${fmtNum(st.qty)} ${esc(s.unitLabel)}</span>
        <button class="osc-count-btn" onclick="changeQty('${s.id}',${s.step})">+</button>
      </div>`;
  } else if (s.unitType === 'tier') {
    const tierBtns = s.tiers.map((t, i) =>
      `<button class="osc-tier-btn${i === st.tierIndex ? ' active' : ''}" onclick="setTier('${s.id}',${i})">${esc(t.name)}<span style="display:block;font-size:10px;opacity:.7">৳${fmtNum(t.price)}</span></button>`
    ).join('');
    qtyBlock = `<div class="osc-field-label">প্যাকেজ (PACKAGE)</div><div class="osc-tier-btns">${tierBtns}</div>`;
  } else {
    qtyBlock = `<div class="osc-fixed-note">Fixed Price Service</div>`;
  }

  /* Urgency buttons */
  const urgencyBtns = Object.entries(URGENCY).map(([key, val]) =>
    `<button class="osc-dl-btn${urgency === key ? ' active' : ''}" onclick="setUrgency('${s.id}','${key}')">${esc(val.label)}</button>`
  ).join('');

  return `
  <div class="osc-card" id="card-${s.id}">
    ${badgeHtml}
    <div class="osc-card-head">
      <div class="osc-icon" style="background:${s.iconBg}">${s.icon}</div>
      <div>
        <div class="osc-title">${esc(s.title)}</div>
        <div class="osc-title-bn">${esc(s.titleBn)}</div>
      </div>
    </div>
    <p class="osc-desc">${esc(s.desc)}</p>
    ${qtyBlock}
    <div class="osc-field-label">ডেডলাইন (Deadline)</div>
    <div class="osc-dl-btns">${urgencyBtns}</div>
    <div class="osc-footer">
      <div>
        <div class="osc-from">Starting from</div>
        <div class="osc-price">৳<span id="price-${s.id}">${fmtNum(price)}</span></div>
        <div class="osc-delivery" id="del-${s.id}">${fmtDays(days)}</div>
      </div>
      <button class="osc-order-btn" onclick="orderFromCard('${s.id}')">Order Now →</button>
    </div>
  </div>`;
}

/* ── Update card (no re-render, just update values) ── */
function updateCard(id) {
  const s  = SERVICES.find(x => x.id === id);
  if (!s) return;
  const st = state[id];

  /* Price */
  const priceEl = document.getElementById(`price-${id}`);
  if (priceEl) priceEl.textContent = fmtNum(calcPrice(s, st.urgency));

  /* Delivery */
  const delEl = document.getElementById(`del-${id}`);
  if (delEl) delEl.textContent = fmtDays(s.deadlineDays[st.urgency]);

  /* Qty display */
  const qtyEl = document.getElementById(`qty-${id}`);
  if (qtyEl) qtyEl.textContent = `${fmtNum(st.qty)} ${s.unitLabel || ''}`;

  /* Urgency buttons */
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.querySelectorAll('.osc-dl-btn').forEach((btn, i) => {
      btn.classList.toggle('active', Object.keys(URGENCY)[i] === st.urgency);
    });
    card.querySelectorAll('.osc-tier-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === st.tierIndex);
    });
  }
}

/* ── Public functions (HTML onclick) ── */
window.changeQty = function(id, delta) {
  const s = SERVICES.find(x => x.id === id);
  if (!s) return;
  state[id].qty = Math.max(s.min, (state[id].qty || s.min) + delta);
  updateCard(id);
};

window.setUrgency = function(id, level) {
  if (!URGENCY[level]) return;
  state[id].urgency = level;
  updateCard(id);
};

window.setTier = function(id, index) {
  const s = SERVICES.find(x => x.id === id);
  if (!s || !s.tiers || index >= s.tiers.length) return;
  state[id].tierIndex = index;
  updateCard(id);
};

/* ── Tabs ── */
function buildTabs() {
  const tabsEl = document.getElementById('oasTabs');
  if (!tabsEl) return;

  const allBtn = `<button class="oas-tab${activeCategory === 'all' ? ' active' : ''}" onclick="setCategory('all')">
    <span class="oas-tab-icon">🗂️</span> All Services
  </button>`;

  const catBtns = CATS.map(c => `
    <button class="oas-tab${activeCategory === c.id ? ' active' : ''}" onclick="setCategory('${c.id}')">
      <span class="oas-tab-icon">${c.icon}</span> ${esc(c.label)}
    </button>`).join('');

  tabsEl.innerHTML = allBtn + catBtns;
}

window.setCategory = function(id) {
  activeCategory = id;
  buildTabs();
  renderGrid();
};

function renderGrid() {
  const grid = document.getElementById('prCalcGrid');
  if (!grid) return;

  const list = activeCategory === 'all'
    ? SERVICES
    : SERVICES.filter(s => s.category === activeCategory);

  grid.style.opacity = '0';
  setTimeout(() => {
    grid.innerHTML = list.map(buildCard).join('');
    grid.style.transition = 'opacity .25s ease';
    grid.style.opacity = '1';
  }, 150);
}

/* ── Order Now — auth check + pricing data সহ Order page এ যাও ── */
window.orderFromCard = async function(id) {
  const s  = SERVICES.find(x => x.id === id);
  if (!s) return;

  /* Auth check */
  const sb = window.scriptoraSupabase;
  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = '../Register page/register.html?return=' + returnUrl;
      return;
    }
  }

  const st    = state[id];
  const price = calcPrice(s, st.urgency);

  const params = new URLSearchParams({
    service: id,
    price:   price,
    urgency: st.urgency,
  });

  if (s.unitType === 'tier') {
    params.set('tier', s.tiers[st.tierIndex].name);
  } else if (s.unitType !== 'fixed') {
    params.set('qty',  st.qty);
    params.set('unit', s.unitLabel || s.unitType);
  }

  window.location.href = '../Order page/order.html?' + params.toString();
};

/* Thesis hero card এর জন্য */
window.orderThesis = async function() {
  /* Auth check */
  const sb = window.scriptoraSupabase;
  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = '../Register page/register.html?return=' + returnUrl;
      return;
    }
  }

  const THC   = window.SCRIPTORA_CONFIG.thesis;
  const type  = document.getElementById('thesisType')?.value || 'full';
  const dl    = window._thesisDl || 'standard';
  const words = window._thesisWords || THC.minWords;
  const price = Math.round(words * THC.pricePerWord[type] * THC.deadlineMultiplier[dl]);

  const urgMap = { standard:'normal', express:'urgent', rush:'critical' };

  const params = new URLSearchParams({
    service: 'thesis',
    price:   price,
    urgency: urgMap[dl] || 'normal',
    qty:     words,
    unit:    'words',
    tier:    type,
  });
  window.location.href = '../Order page/order.html?' + params.toString();
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  buildTabs();
  renderGrid();
});
