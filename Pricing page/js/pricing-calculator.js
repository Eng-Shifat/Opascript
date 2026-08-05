/* ================================================================
   SCRIPTORA — pricing-calculator.js
   Config: pricing-config.js থেকে সব data আসে।
   ================================================================ */

const CFG      = window.SCRIPTORA_CONFIG;
const URGENCY  = CFG.urgency;
const SERVICES = CFG.services;
const CATS     = CFG.categories;

let activeCategory = 'all';

/* Service availability — loaded from Supabase on init */
const availability = {};
SERVICES.forEach(s => { availability[s.id] = true; }); // default: all available

/* Fetch availability from Supabase */
async function loadAvailability() {
  try {
    const sb = window.scriptoraSupabase;
    if (!sb) return;
    const { data } = await sb
      .from('service_availability')
      .select('service_id, is_available');
    if (data) {
      data.forEach(row => {
        availability[row.service_id] = row.is_available;
      });
    }
    /* Expose to mobile-popup.js */
    window.scriptoraAvailability = { ...availability };
  } catch (e) {
    console.warn('Availability fetch failed:', e);
  }
}

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

  /* Availability check */
  const isAvail = availability[s.id] !== false;
  const unavailOverlay = !isAvail ? `
    <div class="osc-unavail-overlay">
      <div class="osc-unavail-badge">🚫 Currently Unavailable</div>
      <div class="osc-unavail-note">This service is temporarily paused.</div>
    </div>` : '';

  return `
  <div class="osc-card-wrap${!isAvail ? ' osc-unavail' : ''}">
  ${badgeHtml}
  ${!isAvail ? '<div class="osc-badge unavail">UNAVAILABLE</div>' : ''}
  <div class="osc-card" id="card-${s.id}"${!isAvail ? ' style="pointer-events:none;opacity:0.45;filter:grayscale(0.5)"' : ''}>
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
        <div class="osc-delivery" id="del-${s.id}" style="color:#2d6ef7">${fmtDays(days)}</div>
      </div>
      <button class="osc-order-btn"${!isAvail ? ' disabled' : ''} onclick="orderFromCard('${s.id}')">Order Now →</button>
    </div>
    ${unavailOverlay}
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
  if (delEl) {
    delEl.textContent = fmtDays(s.deadlineDays[st.urgency]);
    const dlColors = { normal: '#2d6ef7', urgent: '#f59e0b', critical: '#ef4444' };
    delEl.style.color = dlColors[st.urgency] || '#2d6ef7';
  }

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

/* ── Order Now — auth check + open order popup ── */
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

  const st           = state[id];
  const price        = calcPrice(s, st.urgency);
  const urgencyLabel = URGENCY[st.urgency]?.label || st.urgency;

  /* Open order popup */
  if (typeof window.opOpen === 'function') {
    window._popupState = {
      qty:       st.qty,
      tierIndex: st.tierIndex,
      urgency:   st.urgency,
    };
    window.opOpen({
      serviceId:    id,
      title:        s.title,
      titleBn:      s.titleBn,
      icon:         s.icon,
      iconBg:       s.iconBg,
      unitType:     s.unitType,
      qty:          st.qty,
      unitLabel:    s.unitLabel || '',
      urgencyLabel: urgencyLabel,
      rate:         s.rate,
      perUnit:      s.perUnit,
      tiers:        s.tiers,
      tierIndex:    st.tierIndex,
      price:        price,
    });
  }
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

  const urgLabel = { standard: 'Standard (10–15 Days)', express: 'Express (5–7 Days)', rush: 'Rush (2–3 Days)' };
  const typeLabel = { full: 'Full Thesis', chapter: 'Single Chapter', proposal: 'Proposal Only' };

  window._popupState = {
    qty:       words,
    tierIndex: 0,
    urgency:   urgMap[dl] || 'normal',
    thesisType: type,
  };

  if (typeof window.opOpen === 'function') {
    window.opOpen({
      serviceId:    'thesis-writing',
      title:        'Thesis Writing',
      titleBn:      'থিসিস রাইটিং',
      icon:         '🎓',
      iconBg:       'rgba(99,102,241,0.2)',
      unitType:     'words',
      qty:          words,
      unitLabel:    'words',
      urgencyLabel: urgLabel[dl] || dl,
      rate:         THC.pricePerWord[type] * 1000,
      perUnit:      1000,
      tiers:        null,
      tierIndex:    0,
      price:        price,
      thesisType:   type,
    });
  }
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  /* Load availability from Supabase first, then render */
  await loadAvailability();
  buildTabs();
  renderGrid();
});

/* ══════════════════════════════════════════
   MOBILE ACCORDION
══════════════════════════════════════════ */

function buildAccordion(services) {
  return services.map(s => {
    const st    = state[s.id];
    const price = calcPrice(s, st.urgency);
    const days  = s.deadlineDays[st.urgency];

    /* qty block */
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
          <button class="osc-count-btn" onclick="accChangeQty('${s.id}',-${s.step})">−</button>
          <span class="osc-count-val" id="acc-qty-${s.id}">${fmtNum(st.qty)} ${esc(s.unitLabel)}</span>
          <button class="osc-count-btn" onclick="accChangeQty('${s.id}',${s.step})">+</button>
        </div>`;
    } else if (s.unitType === 'tier') {
      const tierBtns = s.tiers.map((t, i) =>
        `<button class="osc-tier-btn${i === st.tierIndex ? ' active' : ''}" onclick="accSetTier('${s.id}',${i})">${esc(t.name)}<span style="display:block;font-size:10px;opacity:.7">৳${fmtNum(t.price)}</span></button>`
      ).join('');
      qtyBlock = `<div class="osc-field-label">প্যাকেজ (PACKAGE)</div><div class="osc-tier-btns">${tierBtns}</div>`;
    } else {
      qtyBlock = `<div class="acc-fixed-note">Fixed Price Service</div>`;
    }

    const urgencyBtns = Object.entries(URGENCY).map(([key, val]) =>
      `<button class="osc-dl-btn${st.urgency === key ? ' active' : ''}" onclick="accSetUrgency('${s.id}','${key}')">${esc(val.label)}</button>`
    ).join('');

    return `
    <div class="acc-item" id="acc-${s.id}">
      ${s.badge ? `<div class="acc-badge ${s.badge}">${s.badge.toUpperCase()}</div>` : ""}

      <div class="acc-header" onclick="toggleAcc('${s.id}')">
        <div class="acc-icon" style="background:${s.iconBg}">${s.icon}</div>
        <div class="acc-info">
          <div class="acc-title">${esc(s.title)}</div>
          <div class="acc-title-bn">${esc(s.titleBn)}</div>
        </div>

        <div class="acc-right">
          <div class="acc-price-lbl">শুরু থেকে</div>
          <div class="acc-price-val">৳<span id="acc-price-${s.id}">${fmtNum(price)}</span></div>
        </div>
      </div>
      <div class="acc-body">
        <div class="acc-body-inner">
          <p class="osc-desc">${esc(s.desc)}</p>
          ${qtyBlock}
          <div class="osc-field-label">ডেডলাইন (Deadline)</div>
          <div class="osc-dl-btns">${urgencyBtns}</div>
          <div class="acc-footer">
            <div class="acc-del-wrap"><span class="acc-del-dot" id="acc-del-dot-${s.id}"></span><span class="acc-del-txt standard"  id="acc-del-${s.id}">${fmtDays(days)}</span></div>
            <button class="acc-order-btn" onclick="orderFromCard('${s.id}')">Order Now →</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

window.toggleAcc = function(id) {
  const item = document.getElementById(`acc-${id}`);
  if (!item) return;
  const isOpen = item.classList.contains('open');
  /* close all */
  document.querySelectorAll('.acc-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
};

window.accChangeQty = function(id, delta) {
  const s = SERVICES.find(x => x.id === id);
  if (!s) return;
  state[id].qty = Math.max(s.min, (state[id].qty || s.min) + delta);
  const el = document.getElementById(`acc-qty-${id}`);
  if (el) el.textContent = `${fmtNum(state[id].qty)} ${s.unitLabel || ''}`;
  /* update price in header */
  const prEl = document.getElementById(`acc-price-${id}`);
  if (prEl) prEl.textContent = fmtNum(calcPrice(s, state[id].urgency));
  /* sync desktop card too */
  updateCard(id);
};

window.accSetUrgency = function(id, level) {
  if (!URGENCY[level]) return;
  state[id].urgency = level;
  const item = document.getElementById(`acc-${id}`);
  if (item) {
    item.querySelectorAll('.osc-dl-btn').forEach((btn, i) => {
      btn.classList.toggle('active', Object.keys(URGENCY)[i] === level);
    });
  }
  const prEl = document.getElementById(`acc-price-${id}`);
  const s = SERVICES.find(x => x.id === id);
  if (prEl && s) prEl.textContent = fmtNum(calcPrice(s, level));
  updateCard(id);
};

window.accSetTier = function(id, index) {
  const s = SERVICES.find(x => x.id === id);
  if (!s || !s.tiers || index >= s.tiers.length) return;
  state[id].tierIndex = index;
  const item = document.getElementById(`acc-${id}`);
  if (item) {
    item.querySelectorAll('.osc-tier-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  }
  const prEl = document.getElementById(`acc-price-${id}`);
  if (prEl) prEl.textContent = fmtNum(calcPrice(s, state[id].urgency));
  updateCard(id);
};

/* Inject accordion container after grid, render on DOMContentLoaded */
function renderAccordion(list) {
  let acc = document.getElementById('oasAccordion');
  if (!acc) {
    acc = document.createElement('div');
    acc.id = 'oasAccordion';
    acc.className = 'oas-accordion';
    const grid = document.getElementById('prCalcGrid');
    if (grid) grid.parentNode.insertBefore(acc, grid.nextSibling);
  }
  acc.innerHTML = buildAccordion(list);
}

/* Patch renderGrid to also rebuild accordion */
const _origRenderGrid = window.setCategory;
window.setCategory = function(id) {
  activeCategory = id;
  buildTabs();
  renderGrid();
  const list = id === 'all' ? SERVICES : SERVICES.filter(s => s.category === id);
  renderAccordion(list);
};

document.addEventListener('DOMContentLoaded', () => {
  renderAccordion(SERVICES);
});

/* ── Patch accSetUrgency to update delivery text + dot color ── */
const _origAccSetUrgency = window.accSetUrgency;
window.accSetUrgency = function(id, level) {
  _origAccSetUrgency(id, level);
  const s = SERVICES.find(x => x.id === id);
  if (!s) return;
  const delEl  = document.getElementById(`acc-del-${id}`);
  const dotEl  = document.getElementById(`acc-del-dot-${id}`);
  const colorMap = { normal: 'standard', urgent: 'express', critical: 'rush' };
  if (delEl) {
    delEl.textContent = fmtDays(s.deadlineDays[level]);
    delEl.className = `acc-del-txt ${colorMap[level] || 'standard'}`;
  }
  if (dotEl) {
    const colors = { normal: '#22c55e', urgent: '#f59e0b', critical: '#ef4444' };
    dotEl.style.background = colors[level] || '#22c55e';
  }
};

/* Init dots on load */
document.addEventListener('DOMContentLoaded', () => {
  SERVICES.forEach(s => {
    const dotEl = document.getElementById(`acc-del-dot-${s.id}`);
    if (dotEl) dotEl.style.background = '#22c55e';
  });
});
