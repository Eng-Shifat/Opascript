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
  function buildPopup(s, isAvail = true) {
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
        <div class="mp-avail-badge-inline ${isAvail ? 'available' : 'unavailable'}">
          <span class="mp-avail-dot-inline"></span>
          ${isAvail ? 'Available Now' : 'Unavailable'}
        </div>
      </div>

      <!-- Scrollable body -->
      <div class="mp-body">

        <!-- Service Trust Card -->
        ${(s.includes||[]).length ? `
        <div class="mp-trust-card">
          <div class="mp-trust-col">
            <div class="mp-trust-col-head"><span class="mp-trust-icon">✅</span> What's Included</div>
            <ul class="mp-trust-list">${(s.includes||[]).map(i=>`<li>${i}</li>`).join('')}</ul>
          </div>
          <div class="mp-trust-divider"></div>
          <div class="mp-trust-col">
            <div class="mp-trust-col-head"><span class="mp-trust-icon">📦</span> You'll Receive</div>
            <ul class="mp-trust-list">${(s.delivery||[]).map(i=>`<li>${i}</li>`).join('')}</ul>
          </div>
        </div>` : ''}

        <!-- Price Calculator section -->
        <div class="mp-calc-head">
          <span>Price Calculator</span>
          <span class="mp-calc-sub">মূল্য নির্ধারক</span>
        </div>

        ${qtyBlock}

        <div class="mp-section-label" style="margin-top:0.6rem">Deadline <span class="mp-section-sub">সময়সীমা</span></div>
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
        ${isAvail
          ? `<button class="mp-order-btn" onclick="mpOrder('${s.id}')">🛒 Order করুন</button>`
          : `<button class="mp-order-btn mp-order-btn--unavail" disabled>🚫 Currently Unavailable</button>`}
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

    /* Check availability — block if unavailable */
    const isAvail = (window.scriptoraAvailability || {})[id] !== false;

    /* remove old */
    document.querySelectorAll('.mp-overlay,.mp-sheet').forEach(el => el.remove());

    const div = document.createElement('div');
    div.id = 'mpMount';
    div.innerHTML = buildPopup(s, isAvail);
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
      if (sheet) { sheet.classList.add('open'); initSwipeDismiss(sheet); }
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
     SWIPE TO DISMISS (drag handle)
  ──────────────────────────────── */
  function initSwipeDismiss(sheet) {
    const body = sheet.querySelector('.mp-body');

    let startY          = 0;
    let currentY        = 0;
    let dragging        = false;
    let sheetHeight     = 0;
    let startBodyScroll = 0;
    let intentDecided   = false;
    let isSwipeIntent   = false;

    function onStart(e) {
      const t = e.target;
      /* Never hijack interactive elements */
      if (t.closest && (
        t.closest('.mp-close') ||
        t.closest('button') ||
        t.closest('input') ||
        t.closest('textarea') ||
        t.closest('select') ||
        t.closest('a')
      )) return;

      startY          = e.touches[0].clientY;
      currentY        = startY;
      sheetHeight     = sheet.offsetHeight;
      startBodyScroll = body ? body.scrollTop : 0;
      dragging        = true;
      intentDecided   = false;
      isSwipeIntent   = false;
      sheet.style.transition = 'none';
    }

    function onMove(e) {
      if (!dragging) return;
      currentY     = e.touches[0].clientY;
      const deltaY = currentY - startY;

      /* Decide intent once 6px moved */
      if (!intentDecided && Math.abs(deltaY) > 6) {
        intentDecided = true;
        isSwipeIntent = deltaY > 0 && startBodyScroll <= 0;
      }

      if (!intentDecided) return;

      if (isSwipeIntent) {
        if (e.cancelable) e.preventDefault();
        if (deltaY < 0) {
          const r = Math.min(Math.abs(deltaY) * 0.15, 30);
          sheet.style.transform = `translateY(${-r}px)`;
        } else {
          sheet.style.transform = `translateY(${deltaY}px)`;
        }
      }
    }

    function onEnd() {
      if (!dragging) return;
      dragging      = false;
      intentDecided = false;
      sheet.style.transition = '';

      const deltaY = currentY - startY;

      if (isSwipeIntent && deltaY > sheetHeight * 0.20) {
        sheet.style.transform = `translateY(100%)`;
        const overlay = document.getElementById('mpOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => {
          const m = document.getElementById('mpMount');
          if (m) m.remove();
        }, 340);
      } else {
        sheet.style.transform = 'translateY(0)';
      }

      isSwipeIntent = false;
    }

    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove',  onMove,  { passive: false });
    sheet.addEventListener('touchend',   onEnd,   { passive: true });
  }

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
    if (!s || !st) return;

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

    const price        = calcPrice(s, st.urgency, st);
    const urgencyLabel = URGENCY[st.urgency]?.label || st.urgency;

    /* Close mobile sheet first, then open order popup */
    mpClose();

    setTimeout(() => {
      if (typeof window.opOpen === 'function') {
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
    }, 360); /* sheet close animation শেষ হওয়ার পর */
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
