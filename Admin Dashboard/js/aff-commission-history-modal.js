/* ══════════════════════════════════════════════════════════
   SCRIPTORA — Affiliate Order/Commission History Modal
   js/aff-commission-history-modal.js

   Admin Commissions tab-এ যেকোনো affiliate-এর row click করলে
   এই modal খুলবে — সেই নির্দিষ্ট affiliate-এর সব order/commission
   history একসাথে দেখাবে (আলাদা কোনো query ছাড়াই — admin-affiliates.js
   ইতিমধ্যে ALL_COMMISSIONS/AFF_MAP/window._cmOrderInfo লোড করে রাখে,
   এই modal শুধু সেটা filter করে reuse করে)।

   Dependencies (from admin-affiliates.js, loaded after this file but
   called only on click — i.e. well after both scripts have run):
     ALL_COMMISSIONS, AFF_MAP, window._cmOrderMap, window._cmOrderInfo,
     esc(), fmtDate(), buildStatusBadge(), stringToColor(), esAvatarHtml(),
     window.buildPaidPctCell()
══════════════════════════════════════════════════════════ */
'use strict';

/* ── Inject modal HTML + CSS ────────────────────────────── */
(function injectModal() {
  const css = document.createElement('style');
  css.textContent = `
#cmHistoryOverlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(7, 5, 15, 0.82);
  backdrop-filter: blur(6px);
  z-index: 8000;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}
#cmHistoryOverlay.open { display: flex; }

#cmHistoryPanel {
  background: var(--card, #161229);
  border: 1px solid var(--border, rgba(167,139,250,.1));
  border-radius: 18px;
  width: 100%;
  max-width: 760px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.6);
  animation: cmhPanelPop .2s ease;
  margin: auto;
}
@keyframes cmhPanelPop {
  from { opacity:0; transform:scale(.96) translateY(8px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}

.cmh-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--card2, #1c1733);
}
.cmh-topbar-title { font-size: .85rem; font-weight: 700; color: var(--text); }
.cmh-close-btn {
  width: 30px; height: 30px;
  background: rgba(167,139,250,.1);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--muted2);
  font-size: .9rem;
  transition: all .15s;
}
.cmh-close-btn:hover { background: rgba(248,113,113,.15); color: #f87171; border-color: rgba(248,113,113,.3); }

.cmh-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}
.cmh-hero-name { font-size: 1rem; font-weight: 700; color: var(--text); }
.cmh-hero-email { font-size: .78rem; color: var(--muted2); }

.cmh-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.cmh-stat { background: var(--card2, #1c1733); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
.cmh-stat-label { font-size: .65rem; color: var(--muted2); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
.cmh-stat-val { font-size: 1rem; font-weight: 700; margin-top: 4px; }

.cmh-body { padding: 16px 20px 22px; }
.cmh-section-label { font-size: .72rem; font-weight: 700; color: var(--muted2); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }

.cmh-row {
  display: grid;
  grid-template-columns: 1.1fr .9fr .8fr .8fr;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 8px;
  background: var(--card2, #1c1733);
}
.cmh-row-order { font-size: .78rem; font-weight: 700; color: var(--accent-light); font-family: 'Sora', monospace; }
.cmh-row-client { font-size: .72rem; color: var(--muted2); margin-top: 2px; }
.cmh-row-amt { font-size: .82rem; font-weight: 600; color: var(--text); }
.cmh-row-comm { font-size: .82rem; font-weight: 700; color: #34d399; }
.cmh-empty { text-align: center; padding: 30px 10px; color: var(--muted2); font-size: .82rem; }
  `;
  document.head.appendChild(css);

  const html = `
<div id="cmHistoryOverlay">
  <div id="cmHistoryPanel">
    <div class="cmh-topbar">
      <div class="cmh-topbar-title">Affiliate Order History</div>
      <button class="cmh-close-btn" onclick="cmHistoryClose()"><i class="ti ti-x"></i></button>
    </div>

    <div class="cmh-hero">
      <div id="cmhAvatarWrap"></div>
      <div>
        <div class="cmh-hero-name" id="cmhName">—</div>
        <div class="cmh-hero-email" id="cmhEmail">—</div>
      </div>
    </div>

    <div class="cmh-stats">
      <div class="cmh-stat">
        <div class="cmh-stat-label">Total Orders</div>
        <div class="cmh-stat-val" id="cmhTotalOrders" style="color:var(--text);">—</div>
      </div>
      <div class="cmh-stat">
        <div class="cmh-stat-label">Commission Cleared</div>
        <div class="cmh-stat-val" id="cmhClearedComm" style="color:#34d399;">—</div>
      </div>
      <div class="cmh-stat">
        <div class="cmh-stat-label">Cancelled</div>
        <div class="cmh-stat-val" id="cmhCancelledCount" style="color:#f87171;">—</div>
      </div>
    </div>

    <div class="cmh-body">
      <div class="cmh-section-label">Order History</div>
      <div id="cmhList"></div>
    </div>

  </div>
</div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
})();

/* ── Open ───────────────────────────────────────────────── */
window.cmHistoryOpen = function(affiliateId) {
  if (!affiliateId) return;
  document.getElementById('cmHistoryOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  _renderHistory(affiliateId);
};

window.cmHistoryClose = function() {
  document.getElementById('cmHistoryOverlay').classList.remove('open');
  document.body.style.overflow = '';
};

/* Close on backdrop click (not when clicking inside the panel) */
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('cmHistoryOverlay');
  if (e.target === overlay) window.cmHistoryClose();
});

/* ── Render ─────────────────────────────────────────────── */
function _renderHistory(affiliateId) {
  const aff      = (typeof AFF_MAP !== 'undefined' && AFF_MAP[affiliateId]) || {};
  const affName  = aff.name  || '—';
  const affEmail = aff.email || '—';
  const affColor = typeof stringToColor === 'function' ? stringToColor(affiliateId) : '#a78bfa';
  const initials = affName !== '—' ? affName.slice(0, 2).toUpperCase() : '??';

  document.getElementById('cmhAvatarWrap').innerHTML =
    typeof esAvatarHtml === 'function' ? esAvatarHtml(affName, aff.avatar_url, affColor, initials) : '';
  document.getElementById('cmhName').textContent  = affName;
  document.getElementById('cmhEmail').textContent = affEmail;

  const rows = (typeof ALL_COMMISSIONS !== 'undefined' ? ALL_COMMISSIONS : [])
    .filter(c => c.affiliate_id === affiliateId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const cancelledCount = rows.filter(c => c.status === 'cancelled').length;

  /* "Commission Cleared" here — the amount actually cleared out of pending
     clearance for this affiliate, same live-proportional logic as the main
     Commissions tab stat cards: full commission once earned/withdrawn,
     proportional to advance_paid while still pending, 0 if cancelled or
     the underlying order itself was cancelled. */
  let clearedTotal = 0;
  rows.forEach(c => {
    const info = (window._cmOrderInfo || {})[c.order_id] || {};
    if (info.status === 'cancelled' || c.status === 'cancelled') return;
    const totalPrice  = Number(info.total_price ?? c.order_amount ?? 0);
    const advancePaid = Math.min(Math.max(Number(info.advance_paid || 0), 0), totalPrice);
    const commAmt      = Number(c.commission_amount || 0);
    if (c.status === 'earned' || c.status === 'withdrawn') {
      clearedTotal += commAmt;
    } else if (totalPrice > 0) {
      clearedTotal += Math.round((commAmt * advancePaid / totalPrice) * 100) / 100;
    }
  });

  document.getElementById('cmhTotalOrders').textContent    = rows.length;
  document.getElementById('cmhClearedComm').textContent    = '৳' + clearedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  document.getElementById('cmhCancelledCount').textContent = cancelledCount;

  const listEl = document.getElementById('cmhList');
  if (rows.length === 0) {
    listEl.innerHTML = `<div class="cmh-empty"><i class="ti ti-inbox"></i><p>এই affiliate-এর কোনো order/commission নেই</p></div>`;
    return;
  }

  listEl.innerHTML = rows.map(c => {
    const orderNum  = (window._cmOrderMap || {})[c.order_id] || c.order_id?.slice(0,8).toUpperCase() || '—';
    const refClient = (typeof REFERRED_CLIENT_MAP !== 'undefined' && REFERRED_CLIENT_MAP[c.client_id]) || {};
    const refName   = refClient.name || '—';
    const orderAmt  = '৳' + Number(c.order_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const commAmt   = '৳' + Number(c.commission_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const date      = typeof fmtDate === 'function' ? fmtDate(c.created_at) : (c.created_at || '—');
    const paidPct   = typeof window.buildPaidPctCell === 'function' ? window.buildPaidPctCell(c) : '';
    const badge     = typeof buildStatusBadge === 'function' ? buildStatusBadge(c.status) : c.status;
    const eName     = typeof esc === 'function' ? esc : (s) => s;

    return `
      <div class="cmh-row">
        <div>
          <div class="cmh-row-order">${eName(orderNum)}</div>
          <div class="cmh-row-client">${eName(refName)} · ${eName(date)}</div>
        </div>
        <div>
          <div class="cmh-row-amt">${orderAmt}</div>
          ${paidPct}
        </div>
        <div class="cmh-row-comm">${commAmt}</div>
        <div>${badge}</div>
      </div>`;
  }).join('');
}
