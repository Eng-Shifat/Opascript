/* ================================================================
   SCRIPTORA — mobile-popup.js
   Mobile: card click → slide-up bottom sheet popup
   Desktop: existing accordion/card behaviour unchanged
================================================================ */

(function () {
  if (typeof window.SCRIPTORA_CONFIG === 'undefined') return;

  const CFG     = window.SCRIPTORA_CONFIG;
  const URGENCY = CFG.urgency;
  const SERVICES = CFG.services;

  /* ── State (shared with pricing-calculator.js) ── */
  function getState(id) { return window._calcState ? window._calcState[id] : null; }

  function fmtNum(n) { return Number(n).toLocaleString('en-IN'); }
  function esc(s)    { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function fmtDays(d) {
    if (!d || d < 1) return `${Math.round((d||0.5)*24)} Hours`;
    return `${d} Day${d>1?'s':''}`;
  }

  function calcPrice(s, urgency, st) {
    const mult = URGENCY[urgency].multiplier;
    if (s.unitType === 'fixed') return Math.round(s.rate * mult);
    if (s.unitType === 'tier')  return Math.round(s.tiers[st.tierIndex].price * mult);
    return Math.round((st.qty / s.perUnit) * s.rate * mult);
  }

  /* ────────────────────────────────
     BUILD POPUP HTML
  ──────────────────────────────── */
  function buildPopup(s) {
    const st      = { qty: s.defaultQty || s.min || 0, tierIndex: s.defaultTier || 0, urgency: 'normal' };
    window._popupState = st;

    const price = calcPrice(s, st.urgency, st);
    const days  = s.deadlineDays[st.urgency];

    /* Urgency buttons */
    const urgencyBtns = Object.entries(URGENCY).map(([key, val]) => `
      <button class="mp-dl-btn${st.urgency===key?' active':''}"
        onclick="mpSetUrgency('${s.id}','${key}')">${esc(val.label)}
      </button>`).join('');

    /* Qty / Tier / Fixed block */
    let qtyBlock = '';
    if (s.unitType === 'words' || s.unitType === 'slides' || s.unitType === 'pages') {
      /* quick-pick preset values */
      const presets = [300, 500, 1000, 2000].filter(v => v >= s.min);
      const presetBtns = presets.map(v =>
        `<button class="mp-preset${st.qty===v?' active':''}" onclick="mpSetQty('${s.id}',${v})">${fmtNum(v)}</button>`
      ).join('');

      qtyBlock = `
        <div class="mp-section-label">Word Count <span class="mp-rate-badge">৳${s.rate}/${s.perUnit} ${s.unitLabel}</span></div>
        <div class="mp-counter-row">
          <button class="mp-count-btn" onclick="mpChangeQty('${s.id}',-${s.step})">−</button>
          <div class="mp-count-mid">
            <span class="mp-count-val" id="mp-qty-${s.id}">${fmtNum(st.qty)}</span>
            <span class="mp-count-unit">${esc(s.unitLabel)}</span>
          </div>
          <button class="mp-count-btn" onclick="mpChangeQty('${s.id}',${s.step})">+</button>
        </div>
        <div class="mp-presets">${presetBtns}</div>`;
    } else if (s.unitType === 'tier') {
      const tierBtns = s.tiers.map((t,i) => `
        <button class="mp-tier-btn${i===st.tierIndex?' active':''}" onclick="mpSetTier('${s.id}',${i})">
          ${esc(t.name)}<span>৳${fmtNum(t.price)}</span>
        </button>`).join('');
      qtyBlock = `
        <div class="mp-section-label">Package</div>
        <div class="mp-tier-row">${tierBtns}</div>`;
    } else {
      qtyBlock = `<div class="mp-fixed-note">✔ Fixed Price Service</div>`;
    }

    /* delivery dot color */
    const dotColor = { normal:'#22c55e', urgent:'#f59e0b', critical:'#ef4444' };

    return `
    <div class="mp-overlay" id="mpOverlay" onclick="mpClose()"></div>
    <div class="mp-sheet" id="mpSheet">

      <!-- Drag handle -->
      <div class="mp-drag-handle"></div>

      <!-- Header: icon + title + close -->
      <div class="mp-header">
        <div class="mp-header-left">
          <div class="mp-hdr-icon" style="background:${s.iconBg}">${s.icon}</div>
          <div>
            <div class="mp-hdr-title">${esc(s.title)}</div>
            <div class="mp-hdr-title-bn">${esc(s.titleBn)}</div>
          </div>
        </div>
        <button class="mp-close-btn" onclick="mpClose()">✕</button>
      </div>

      <!-- Available now badge -->
      <div class="mp-avail-badge"><span class="mp-avail-dot"></span> Available Now</div>

      <!-- Service info card -->
      <div class="mp-info-card">
        <div class="mp-info-left">
          <div class="mp-hdr-icon" style="background:${s.iconBg};width:38px;height:38px;font-size:18px;">${s.icon}</div>
          <div>
            <div class="mp-info-name">${esc(s.title)}</div>
            <div class="mp-info-desc">${esc(s.desc)}</div>
            <div class="mp-info-stats">
              <span class="mp-star">⭐ 4.9 Rating</span>
              <span class="mp-orders">✅ 2,400+ Orders</span>
            </div>
          </div>
        </div>
        <div class="mp-preselected">✓ Pre-selected</div>
      </div>

      <!-- Scrollable body -->
      <div class="mp-body">

        <!-- Price Calculator section -->
        <div class="mp-calc-head">
          <span>Price Calculator</span>
          <span class="mp-calc-sub">মূল্য নির্ধারক</span>
        </div>

        ${qtyBlock}

        <div class="mp-section-label" style="margin-top:1.1rem">Deadline <span class="mp-section-sub">সময়সীমা</span></div>
        <div class="mp-dl-row">${urgencyBtns}</div>

      </div>

      <!-- Footer: price + order -->
      <div class="mp-footer">
        <div class="mp-footer-left">
          <div class="mp-footer-label">Total Price / মোট মূল্য</div>
          <div class="mp-footer-price">৳ <span id="mp-price-${s.id}">${fmtNum(price)}</span> <span class="mp-footer-cur">BDT</span></div>
          <div class="mp-footer-meta">
            <span id="mp-qty-meta-${s.id}">${s.unitType!=='fixed'&&s.unitType!=='tier'?fmtNum(st.qty)+' '+s.unitLabel:''}</span>
            ${s.unitType!=='fixed'&&s.unitType!=='tier'?'·':''}
            <span id="mp-del-meta-${s.id}" class="mp-del-meta">${fmtDays(days)}</span>
            <span class="mp-ready-dot" style="background:${dotColor.normal}"></span>
            <span class="mp-ready-txt">Ready to order</span>
          </div>
        </div>
        <button class="mp-order-btn" onclick="mpOrder('${s.id}')">🛒 Order করুন</button>
      </div>
    </div>`;
  }

  /* ────────────────────────────────
     OPEN / CLOSE
  ──────────────────────────────── */
  window.mpOpen = function(id) {
    if (window.innerWidth > 480) return; /* desktop — skip */
    const s = SERVICES.find(x => x.id === id);
    if (!s) return;

    /* remove old */
    document.querySelectorAll('.mp-overlay,.mp-sheet').forEach(el => el.remove());

    const div = document.createElement('div');
    div.id = 'mpMount';
    div.innerHTML = buildPopup(s);
    document.body.appendChild(div);

    /* store current service */
    window._mpService = s;
    window._popupState = { qty: s.defaultQty||s.min||0, tierIndex: s.defaultTier||0, urgency:'normal' };

    /* prevent body scroll */
    document.body.style.overflow = 'hidden';

    /* animate in */
    requestAnimationFrame(() => {
      const sheet = document.getElementById('mpSheet');
      const overlay = document.getElementById('mpOverlay');
      if (sheet) sheet.classList.add('open');
      if (overlay) overlay.classList.add('open');
    });
  };

  window.mpClose = function() {
    const sheet   = document.getElementById('mpSheet');
    const overlay = document.getElementById('mpOverlay');
    if (sheet)   sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      const m = document.getElementById('mpMount');
      if (m) m.remove();
    }, 340);
  };

  /* ────────────────────────────────
     POPUP CONTROLS
  ──────────────────────────────── */
  function mpUpdatePrice() {
    const s  = window._mpService;
    const st = window._popupState;
    if (!s || !st) return;

    const price = calcPrice(s, st.urgency, st);
    const days  = s.deadlineDays[st.urgency];

    const prEl = document.getElementById(`mp-price-${s.id}`);
    if (prEl) prEl.textContent = fmtNum(price);

    const delEl = document.getElementById(`mp-del-meta-${s.id}`);
    if (delEl) delEl.textContent = fmtDays(days);

    const qmEl = document.getElementById(`mp-qty-meta-${s.id}`);
    if (qmEl && s.unitType!=='fixed'&&s.unitType!=='tier')
      qmEl.textContent = fmtNum(st.qty)+' '+s.unitLabel;
  }

  window.mpChangeQty = function(id, delta) {
    const s  = window._mpService;
    const st = window._popupState;
    if (!s||!st) return;
    st.qty = Math.max(s.min, (st.qty||s.min)+delta);
    const el = document.getElementById(`mp-qty-${id}`);
    if (el) el.textContent = fmtNum(st.qty);
    /* update presets highlight */
    document.querySelectorAll('.mp-preset').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.textContent.replace(/,/g,''))===st.qty);
    });
    mpUpdatePrice();
  };

  window.mpSetQty = function(id, val) {
    const s  = window._mpService;
    const st = window._popupState;
    if (!s||!st) return;
    st.qty = val;
    const el = document.getElementById(`mp-qty-${id}`);
    if (el) el.textContent = fmtNum(val);
    document.querySelectorAll('.mp-preset').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.textContent.replace(/,/g,''))===val);
    });
    mpUpdatePrice();
  };

  window.mpSetUrgency = function(id, level) {
    const st = window._popupState;
    if (!st) return;
    st.urgency = level;
    document.querySelectorAll('.mp-dl-btn').forEach((btn, i) => {
      btn.classList.toggle('active', Object.keys(URGENCY)[i]===level);
    });
    mpUpdatePrice();
  };

  window.mpSetTier = function(id, idx) {
    const s  = window._mpService;
    const st = window._popupState;
    if (!s||!st) return;
    st.tierIndex = idx;
    document.querySelectorAll('.mp-tier-btn').forEach((btn,i) => {
      btn.classList.toggle('active', i===idx);
    });
    mpUpdatePrice();
  };

  window.mpOrder = async function(id) {
    const s  = window._mpService;
    const st = window._popupState;
    if (!s||!st) return;

    const sb = window.scriptoraSupabase;
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = '../Register page/register.html?return=' + returnUrl;
        return;
      }
    }

    const price  = calcPrice(s, st.urgency, st);
    const params = new URLSearchParams({ service: id, price, urgency: st.urgency });

    if (s.unitType==='tier')  params.set('tier', s.tiers[st.tierIndex].name);
    else if (s.unitType!=='fixed') { params.set('qty', st.qty); params.set('unit', s.unitLabel||s.unitType); }

    window.location.href = '../Order page/order.html?' + params.toString();
  };

  /* ────────────────────────────────
     PATCH accordion items to open popup on mobile
  ──────────────────────────────── */
  function patchAccordion() {
    if (window.innerWidth > 480) return;

    /* Override toggleAcc to open popup instead */
    window.toggleAcc = function(id) {
      mpOpen(id);
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    patchAccordion();
    window.addEventListener('resize', patchAccordion);
  });

})();
