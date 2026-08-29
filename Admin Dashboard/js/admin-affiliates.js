/* ══════════════════════════════════════════════════════════
   SCRIPTORA — Affiliate Management Admin
   js/admin-affiliates.js

   TAB 1 — Applications
     Reads: public.affiliate_applications (joined with clients)
     Approve: calls public.approve_affiliate_application(id) RPC
     Reject:  updates affiliate_applications directly

   TAB 2 — Commissions
     Reads: public.affiliate_commissions
     Record: calls public.record_affiliate_commission(order_id) RPC
     Filter: all / earned / withdrawn / cancelled

   TAB 3 — Withdrawals
     Reads: public.affiliate_withdrawals
     Approve: admin_approve_affiliate_withdrawal(id)
     Reject:  admin_reject_affiliate_withdrawal(id)
     Payout:  admin_confirm_affiliate_payout(id, txn_id)

   Toast: same showToast() pattern as admin-clients.js
══════════════════════════════════════════════════════════ */
'use strict';

/* ── Shared state ─────────────────────────────────────────── */
let ALL_APPLICATIONS = [];
let CLIENT_MAP       = {};   /* client_id → { name, email } */
let CURRENT_FILTER   = 'all';

let ALL_COMMISSIONS    = [];
let AFF_MAP            = {};  /* affiliate_id → { name, email, referral_code } */
let REFERRED_CLIENT_MAP= {};  /* client_id → { name, email } — referred clients */
let CM_FILTER          = 'all';
let CURRENT_TAB        = 'applications';

let ALL_WITHDRAWALS    = [];
let WD_AFF_MAP         = {};  /* client_id → { name, email } */
let WD_FILTER          = 'all';

let ALL_REFERRALS      = [];
let REF_SEARCH         = '';

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  await loadApplications();
  /* Commissions load lazily on first tab switch */
});

/* ── Tab switching ────────────────────────────────────────── */
window.switchTab = function(tab) {
  CURRENT_TAB = tab;

  document.getElementById('tabApplications').style.display  = tab === 'applications' ? '' : 'none';
  document.getElementById('tabCommissions').style.display   = tab === 'commissions'  ? '' : 'none';
  document.getElementById('tabWithdrawals').style.display   = tab === 'withdrawals'  ? '' : 'none';
  document.getElementById('tabReferrals').style.display     = tab === 'referrals'    ? '' : 'none';
  document.getElementById('tabAnalytics').style.display     = tab === 'analytics'    ? '' : 'none';

  document.getElementById('tabBtnApplications').classList.toggle('aff-tab-active', tab === 'applications');
  document.getElementById('tabBtnCommissions').classList.toggle('aff-tab-active',  tab === 'commissions');
  document.getElementById('tabBtnWithdrawals').classList.toggle('aff-tab-active',  tab === 'withdrawals');
  document.getElementById('tabBtnReferrals').classList.toggle('aff-tab-active',    tab === 'referrals');
  document.getElementById('tabBtnAnalytics').classList.toggle('aff-tab-active',    tab === 'analytics');

  if (tab === 'commissions' && ALL_COMMISSIONS.length === 0) loadCommissions();
  if (tab === 'withdrawals' && ALL_WITHDRAWALS.length === 0) loadWithdrawals();
  if (tab === 'referrals'   && ALL_REFERRALS.length   === 0) loadReferrals();
  if (tab === 'analytics'   && ANALYTICS_AFF_LIST.length === 0) loadAnalytics();
};

window.refreshCurrentTab = function() {
  if      (CURRENT_TAB === 'applications') loadApplications();
  else if (CURRENT_TAB === 'commissions')  loadCommissions();
  else if (CURRENT_TAB === 'referrals')    { ALL_REFERRALS = []; loadReferrals(); }
  else if (CURRENT_TAB === 'analytics')   { ANALYTICS_AFF_LIST = []; loadAnalytics(); }
  else                                     loadWithdrawals();
};

/* ── Session helper ───────────────────────────────────────── */
async function waitForSession(maxWait = 5000) {
  const interval = 100;
  let waited = 0;
  while (waited < maxWait) {
    const sb = window.scriptoraSupabase;
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (session) return session;
    }
    await new Promise(r => setTimeout(r, interval));
    waited += interval;
  }
  return null;
}

/* ══════════════════════════════════════════════════════════
   TAB 1 — APPLICATIONS
══════════════════════════════════════════════════════════ */

async function loadApplications() {
  const sb = window.scriptoraSupabase;
  if (!sb) { showToast('⚠️ Supabase connected হয়নি', '#f87171'); return; }

  setTbodyLoading('aff-tbody', 6);

  try {
    const { data: apps, error: appErr } = await sb
      .from('affiliate_applications')
      .select('id, client_id, status, applied_at, reviewed_at, admin_note')
      .order('applied_at', { ascending: false });

    if (appErr) throw appErr;
    ALL_APPLICATIONS = apps || [];

    const clientIds = [...new Set(ALL_APPLICATIONS.map(a => a.client_id))];
    CLIENT_MAP = {};

    if (clientIds.length > 0) {
      const { data: clients } = await sb
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds);
      (clients || []).forEach(c => { CLIENT_MAP[c.id] = c; });
    }

    updateAppStats();
    renderAppTable();

  } catch (err) {
    console.error('loadApplications error:', err);
    showToast('❌ Data load হয়নি: ' + err.message, '#f87171');
    setTbodyError('aff-tbody', 6);
  }
}

function updateAppStats() {
  const total    = ALL_APPLICATIONS.length;
  const pending  = ALL_APPLICATIONS.filter(a => a.status === 'pending').length;
  const approved = ALL_APPLICATIONS.filter(a => a.status === 'approved').length;
  const rejected = ALL_APPLICATIONS.filter(a => a.status === 'rejected').length;

  document.getElementById('st-total').textContent    = total;
  document.getElementById('st-pending').textContent  = pending;
  document.getElementById('st-approved').textContent = approved;
  document.getElementById('st-rejected').textContent = rejected;
  document.getElementById('aff-subtitle').textContent =
    `${total} টি আবেদন — ${pending} টি pending`;
}

window.setAffFilter = function(filter, btn) {
  CURRENT_FILTER = filter;
  document.querySelectorAll('.cl-filter-chip[data-filter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAppTable();
};

function renderAppTable() {
  const tbody = document.getElementById('aff-tbody');
  const rows = CURRENT_FILTER === 'all'
    ? ALL_APPLICATIONS
    : ALL_APPLICATIONS.filter(a => a.status === CURRENT_FILTER);

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="cl-empty">
          <i class="ti ti-inbox"></i>
          <p>${CURRENT_FILTER === 'all' ? 'কোনো আবেদন নেই' : `কোনো ${CURRENT_FILTER} আবেদন নেই`}</p>
        </td>
      </tr>`;
    return;
  }
  tbody.innerHTML = rows.map(app => buildAppRow(app)).join('');
}

function buildAppRow(app) {
  const client   = CLIENT_MAP[app.client_id];
  const name     = client?.name  || '—';
  const email    = client?.email || app.client_id.slice(0, 8) + '…';
  const initials = name !== '—' ? name.slice(0, 2).toUpperCase() : '??';
  const avatarBg = stringToColor(app.client_id);

  const appliedAt  = fmtDate(app.applied_at);
  const reviewedAt = app.reviewed_at
    ? fmtDate(app.reviewed_at)
    : '<span style="color:var(--muted)">—</span>';
  const adminNote  = app.admin_note
    ? `<span title="${esc(app.admin_note)}" style="max-width:160px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(app.admin_note)}</span>`
    : '<span style="color:var(--muted)">—</span>';

  const actions = app.status === 'pending'
    ? `<div class="cl-actions">
         <button class="cl-act-btn" title="Approve"
           onclick="confirmApprove('${app.id}')"
           style="color:#34d399;border-color:rgba(52,211,153,.3);">
           <i class="ti ti-check"></i>
         </button>
         <button class="cl-act-btn" title="Reject"
           onclick="confirmReject('${app.id}')"
           style="color:#f87171;border-color:rgba(248,113,113,.3);">
           <i class="ti ti-x"></i>
         </button>
       </div>`
    : '<span style="color:var(--muted);font-size:.75rem;">—</span>';

  return `
    <tr>
      <td>
        <div class="cl-name-cell">
          <div class="cl-avatar" style="background:${avatarBg}20;color:${avatarBg};">${initials}</div>
          <div>
            <strong>${esc(name)}</strong>
            <span>${esc(email)}</span>
          </div>
        </div>
      </td>
      <td style="color:var(--muted2);font-size:.78rem;">${appliedAt}</td>
      <td>${buildStatusBadge(app.status)}</td>
      <td style="color:var(--muted2);font-size:.78rem;">${reviewedAt}</td>
      <td style="font-size:.78rem;">${adminNote}</td>
      <td>${actions}</td>
    </tr>`;
}

function buildStatusBadge(status) {
  const map = {
    pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: 'ti-clock',        label: 'Pending'   },
    approved:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: 'ti-circle-check', label: 'Approved'  },
    rejected:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: 'ti-circle-x',     label: 'Rejected'  },
    earned:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: 'ti-circle-check', label: 'Earned'    },
    withdrawn: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: 'ti-cash',         label: 'Withdrawn' },
    cancelled: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: 'ti-circle-x',     label: 'Cancelled' },
    paid:      { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: 'ti-circle-check', label: 'Paid'      },
  };
  const s = map[status] || { color: 'var(--muted2)', bg: 'transparent', icon: 'ti-help-circle', label: status };
  return `<span class="cl-badge" style="background:${s.bg};color:${s.color};">
    <i class="ti ${s.icon}"></i> ${s.label}
  </span>`;
}

/* ── Approve ──────────────────────────────────────────────── */
window.confirmApprove = function(appId) {
  if (!confirm('এই affiliate application টি Approve করবেন?\n\nApprove হলে client এর জন্য একটি unique referral code তৈরি হবে।')) return;
  doApprove(appId);
};

async function doApprove(appId) {
  const sb = window.scriptoraSupabase;
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc('approve_affiliate_application', {
      p_application_id: appId
    });
    if (error) throw error;
    if (data?.success === false) {
      showToast('❌ ' + (data.message || 'Approval failed'), '#f87171');
      return;
    }
    const code = data?.referral_code ? ` — Code: ${data.referral_code}` : '';
    showToast(`✅ Affiliate Approved${code}`, '#34d399');

    /* Phase 7: notify affiliate */
    const app = ALL_APPLICATIONS.find(a => a.id === appId);
    if (app) {
      let affId = data?.affiliate_id || null;
      if (!affId) {
        const { data: affRow } = await sb.from('affiliates').select('id').eq('client_id', app.client_id).maybeSingle();
        affId = affRow?.id || null;
      }
      notifyAffiliate({
        clientId: app.client_id,
        affiliateId: affId,
        type: 'application_approved',
        title: 'Affiliate Application Approved 🎉',
        message: data?.referral_code
          ? `Congratulations! আপনার Affiliate Application Approve হয়েছে। আপনার Referral Code: ${data.referral_code}`
          : 'Congratulations! আপনার Affiliate Application Approve হয়েছে।'
      });
    }

    await loadApplications();
  } catch (err) {
    console.error('doApprove error:', err);
    showToast('❌ Error: ' + err.message, '#f87171');
  }
}

/* ── Reject ───────────────────────────────────────────────── */
window.confirmReject = function(appId) {
  if (!confirm('এই affiliate application টি Reject করবেন?\n\nClient পরে নতুনভাবে apply করতে পারবে।')) return;
  doReject(appId);
};

async function doReject(appId) {
  const sb = window.scriptoraSupabase;
  if (!sb) return;
  try {
    const { error } = await sb
      .from('affiliate_applications')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', appId)
      .eq('status', 'pending');
    if (error) throw error;
    showToast('🚫 Application Rejected', '#f59e0b');

    /* Phase 7: notify affiliate */
    const app = ALL_APPLICATIONS.find(a => a.id === appId);
    if (app) {
      notifyAffiliate({
        clientId: app.client_id,
        type: 'application_rejected',
        title: 'Affiliate Application Update',
        message: 'দুঃখিত, আপনার Affiliate Application এই মুহূর্তে Approve করা যায়নি। আপনি পরবর্তীতে আবার Apply করতে পারবেন।'
      });
    }

    await loadApplications();
  } catch (err) {
    console.error('doReject error:', err);
    showToast('❌ Error: ' + err.message, '#f87171');
  }
}

/* ══════════════════════════════════════════════════════════
   TAB 2 — COMMISSIONS
══════════════════════════════════════════════════════════ */

async function loadCommissions() {
  const sb = window.scriptoraSupabase;
  if (!sb) { showToast('⚠️ Supabase connected হয়নি', '#f87171'); return; }

  setTbodyLoading('cm-tbody', 8);

  try {
    /* 1. Fetch all commission records */
    const { data: comms, error: cmErr } = await sb
      .from('affiliate_commissions')
      .select('id, affiliate_id, order_id, client_id, referral_code, order_amount, commission_rate, commission_amount, status, created_at, order_paid_at')
      .order('created_at', { ascending: false });

    if (cmErr) throw cmErr;
    ALL_COMMISSIONS = comms || [];

    /* 2. Fetch affiliate owner info (via affiliates → clients) */
    const affIds = [...new Set(ALL_COMMISSIONS.map(c => c.affiliate_id))];
    AFF_MAP = {};
    if (affIds.length > 0) {
      const { data: affs } = await sb
        .from('affiliates')
        .select('id, client_id, referral_code')
        .in('id', affIds);

      if (affs && affs.length) {
        const affClientIds = [...new Set(affs.map(a => a.client_id))];
        const { data: affClients } = await sb
          .from('clients')
          .select('id, name, email')
          .in('id', affClientIds);

        const affClientMap = {};
        (affClients || []).forEach(c => { affClientMap[c.id] = c; });
        affs.forEach(a => {
          const cl = affClientMap[a.client_id] || {};
          AFF_MAP[a.id] = { name: cl.name || '—', email: cl.email || '—', referral_code: a.referral_code };
        });
      }
    }

    /* 3. Fetch referred client info */
    const refClientIds = [...new Set(ALL_COMMISSIONS.map(c => c.client_id))];
    REFERRED_CLIENT_MAP = {};
    if (refClientIds.length > 0) {
      const { data: refClients } = await sb
        .from('clients')
        .select('id, name, email')
        .in('id', refClientIds);
      (refClients || []).forEach(c => { REFERRED_CLIENT_MAP[c.id] = c; });
    }

    /* 4. Fetch order numbers for display */
    const orderIds = [...new Set(ALL_COMMISSIONS.map(c => c.order_id))];
    window._cmOrderMap = {};
    if (orderIds.length > 0) {
      const { data: orders } = await sb
        .from('orders')
        .select('id, order_number')
        .in('id', orderIds);
      (orders || []).forEach(o => { window._cmOrderMap[o.id] = o.order_number || o.id.slice(0,8).toUpperCase(); });
    }

    updateCmStats();
    renderCmTable();

  } catch (err) {
    console.error('loadCommissions error:', err);
    showToast('❌ Commission data load হয়নি: ' + err.message, '#f87171');
    setTbodyError('cm-tbody', 8);
  }
}

function updateCmStats() {
  const total     = ALL_COMMISSIONS.length;
  const earned    = ALL_COMMISSIONS.filter(c => c.status === 'earned');
  const withdrawn = ALL_COMMISSIONS.filter(c => c.status === 'withdrawn').length;
  const cancelled = ALL_COMMISSIONS.filter(c => c.status === 'cancelled').length;
  const earnedAmt = earned.reduce((s, c) => s + Number(c.commission_amount || 0), 0);

  document.getElementById('cm-total').textContent         = total;
  document.getElementById('cm-earned-amount').textContent = '৳' + earnedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('cm-withdrawn').textContent     = withdrawn;
  document.getElementById('cm-cancelled').textContent     = cancelled;
  document.getElementById('cm-subtitle').textContent =
    `${total} টি commission — মোট earned ৳${earnedAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

window.setCmFilter = function(filter, btn) {
  CM_FILTER = filter;
  document.querySelectorAll('.cl-filter-chip[data-cm-filter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCmTable();
};

function renderCmTable() {
  const tbody = document.getElementById('cm-tbody');
  const rows = CM_FILTER === 'all'
    ? ALL_COMMISSIONS
    : ALL_COMMISSIONS.filter(c => c.status === CM_FILTER);

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="cl-empty">
          <i class="ti ti-inbox"></i>
          <p>${CM_FILTER === 'all' ? 'কোনো commission নেই' : `কোনো ${CM_FILTER} commission নেই`}</p>
        </td>
      </tr>`;
    return;
  }
  tbody.innerHTML = rows.map(c => buildCmRow(c)).join('');
}

function buildCmRow(cm) {
  const aff         = AFF_MAP[cm.affiliate_id] || {};
  const affName     = aff.name  || '—';
  const affEmail    = aff.email || '—';
  const affInitials = affName !== '—' ? affName.slice(0,2).toUpperCase() : '??';
  const affBg       = stringToColor(cm.affiliate_id);

  const refClient   = REFERRED_CLIENT_MAP[cm.client_id] || {};
  const refName     = refClient.name  || cm.client_id?.slice(0,8) + '…' || '—';
  const refEmail    = refClient.email || '—';

  const orderNum    = (window._cmOrderMap || {})[cm.order_id] || cm.order_id?.slice(0,8).toUpperCase() || '—';
  const orderAmt    = '৳' + Number(cm.order_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const rate        = (Number(cm.commission_rate) * 100).toFixed(0) + '%';
  const commAmt     = '৳' + Number(cm.commission_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const date        = fmtDate(cm.created_at);

  return `
    <tr>
      <td>
        <div class="cl-name-cell">
          <div class="cl-avatar" style="background:${affBg}20;color:${affBg};">${affInitials}</div>
          <div>
            <strong>${esc(affName)}</strong>
            <span>${esc(affEmail)}</span>
          </div>
        </div>
      </td>
      <td style="font-size:.78rem;font-weight:600;color:var(--accent-light);font-family:'Sora',monospace;">${esc(orderNum)}</td>
      <td>
        <div style="font-size:.8rem;">
          <strong>${esc(refName)}</strong>
          <div style="font-size:.72rem;color:var(--muted2);">${esc(refEmail)}</div>
        </div>
      </td>
      <td style="font-size:.82rem;font-weight:600;">${orderAmt}</td>
      <td style="font-size:.78rem;color:var(--muted2);">${rate}</td>
      <td style="font-size:.85rem;font-weight:700;color:#34d399;">${commAmt}</td>
      <td>${buildStatusBadge(cm.status)}</td>
      <td style="color:var(--muted2);font-size:.78rem;">${date}</td>
    </tr>`;
}

/* ── Record Commission (called from odp-payments.js) ──────── */
window.adminRecordCommission = async function(orderId) {
  if (!confirm('এই order-এর জন্য affiliate commission record করবেন?\n\nএকটি order-এর জন্য শুধুমাত্র একবার commission record করা যাবে।')) return;

  const sb = window.scriptoraSupabase;
  if (!sb) { showToast('⚠️ Supabase connected হয়নি', '#f87171'); return; }

  try {
    const { data, error } = await sb.rpc('record_affiliate_commission', {
      p_order_id: orderId
    });
    if (error) throw error;

    if (data?.success === false) {
      showToast('❌ ' + (data.message || 'Commission record failed'), '#f87171');
      return;
    }

    const amt = data?.commission_amount
      ? ` — ৳${Number(data.commission_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : '';
    showToast(`✅ Commission Recorded${amt}`, '#34d399');

    /* Phase 7: notify affiliate — look up who earned it for this order */
    (async () => {
      try {
        const { data: cmRow } = await sb
          .from('affiliate_commissions')
          .select('affiliate_id, commission_amount')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cmRow?.affiliate_id) return;

        const { data: affRow } = await sb
          .from('affiliates')
          .select('client_id')
          .eq('id', cmRow.affiliate_id)
          .maybeSingle();
        if (!affRow?.client_id) return;

        const amtVal = data?.commission_amount ?? cmRow.commission_amount;
        notifyAffiliate({
          clientId: affRow.client_id,
          affiliateId: cmRow.affiliate_id,
          type: 'commission_earned',
          title: 'নতুন Commission Earn হয়েছে 💰',
          message: `একটি সফল Referral Order-এর জন্য আপনার Wallet-এ ৳${Number(amtVal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Commission যোগ হয়েছে।`,
          amount: amtVal
        });
      } catch (e) {
        console.error('[Affiliate Notify] commission lookup failed:', e);
      }
    })();

    /* If commissions tab is open, refresh it */
    if (CURRENT_TAB === 'commissions') await loadCommissions();

  } catch (err) {
    console.error('adminRecordCommission error:', err);
    showToast('❌ Error: ' + err.message, '#f87171');
  }
};

/* ══════════════════════════════════════════════════════════
   TAB 3 — WITHDRAWALS
══════════════════════════════════════════════════════════ */

async function loadWithdrawals() {
  const sb = window.scriptoraSupabase;
  if (!sb) { showToast('⚠️ Supabase connected হয়নি', '#f87171'); return; }

  setTbodyLoading('wd-tbody', 6);

  try {
    const { data: rows, error } = await sb
      .from('affiliate_withdrawals')
      .select('id, affiliate_id, client_id, amount, status, payment_method, payment_number, payment_name, admin_note, payout_txn_id, requested_at, reviewed_at, paid_at')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    ALL_WITHDRAWALS = rows || [];

    const clientIds = [...new Set(ALL_WITHDRAWALS.map(w => w.client_id))];
    WD_AFF_MAP = {};
    if (clientIds.length > 0) {
      const { data: clients } = await sb
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds);
      (clients || []).forEach(c => { WD_AFF_MAP[c.id] = c; });
    }

    updateWdStats();
    renderWdTable();

  } catch (err) {
    console.error('loadWithdrawals error:', err);
    showToast('❌ Withdrawal data load হয়নি: ' + err.message, '#f87171');
    setTbodyError('wd-tbody', 6);
  }
}

function updateWdStats() {
  const pending  = ALL_WITHDRAWALS.filter(w => w.status === 'pending').length;
  const approved = ALL_WITHDRAWALS.filter(w => w.status === 'approved').length;
  const paid     = ALL_WITHDRAWALS.filter(w => w.status === 'paid').length;
  const rejected = ALL_WITHDRAWALS.filter(w => w.status === 'rejected').length;

  document.getElementById('wd-pending').textContent  = pending;
  document.getElementById('wd-approved').textContent = approved;
  document.getElementById('wd-paid').textContent     = paid;
  document.getElementById('wd-rejected').textContent = rejected;
  document.getElementById('wd-subtitle').textContent =
    `${ALL_WITHDRAWALS.length} টি withdrawal — ${pending} টি pending review`;
}

window.setWdFilter = function(filter, btn) {
  WD_FILTER = filter;
  document.querySelectorAll('.cl-filter-chip[data-wd-filter]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderWdTable();
};

function renderWdTable() {
  const tbody = document.getElementById('wd-tbody');
  const rows = WD_FILTER === 'all'
    ? ALL_WITHDRAWALS
    : ALL_WITHDRAWALS.filter(w => w.status === WD_FILTER);

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="cl-empty">
          <i class="ti ti-inbox"></i>
          <p>${WD_FILTER === 'all' ? 'কোনো withdrawal নেই' : `কোনো ${WD_FILTER} withdrawal নেই`}</p>
        </td>
      </tr>`;
    return;
  }
  tbody.innerHTML = rows.map(w => buildWdRow(w)).join('');
}

function buildWdRow(w) {
  const client   = WD_AFF_MAP[w.client_id] || {};
  const name     = client.name  || '—';
  const email    = client.email || w.client_id?.slice(0, 8) + '…';
  const initials = name !== '—' ? name.slice(0, 2).toUpperCase() : '??';
  const avatarBg = stringToColor(w.client_id);

  const amt    = '৳' + Number(w.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const method = (w.payment_method || '—').toUpperCase();
  const payInfo = `
    <div style="font-size:.78rem;">
      <strong>${esc(method)}</strong>
      <div style="font-family:monospace;color:var(--accent2);margin-top:2px;">${esc(w.payment_number || '—')}</div>
      ${w.payment_name ? `<div style="color:var(--muted2);font-size:.72rem;margin-top:2px;">${esc(w.payment_name)}</div>` : ''}
      ${w.payout_txn_id ? `<div style="color:var(--green);font-size:.72rem;margin-top:4px;">TXN: ${esc(w.payout_txn_id)}</div>` : ''}
    </div>`;

  const requested = fmtDate(w.requested_at);

  let actions = '<span style="color:var(--muted);font-size:.75rem;">—</span>';
  if (w.status === 'pending') {
    actions = `<div class="cl-actions">
      <button class="cl-act-btn" title="Approve" onclick="confirmWdApprove('${w.id}')"
        style="color:#34d399;border-color:rgba(52,211,153,.3);"><i class="ti ti-check"></i></button>
      <button class="cl-act-btn" title="Reject" onclick="confirmWdReject('${w.id}')"
        style="color:#f87171;border-color:rgba(248,113,113,.3);"><i class="ti ti-x"></i></button>
    </div>`;
  } else if (w.status === 'approved') {
    actions = `<button class="cl-act-btn" title="Confirm Payout" onclick="confirmWdPayout('${w.id}')"
      style="color:#60a5fa;border-color:rgba(96,165,250,.3);padding:4px 10px;font-size:.72rem;font-weight:700;">
      <i class="ti ti-cash"></i> Pay Out
    </button>`;
  }

  return `
    <tr>
      <td>
        <div class="cl-name-cell">
          <div class="cl-avatar" style="background:${avatarBg}20;color:${avatarBg};">${initials}</div>
          <div>
            <strong>${esc(name)}</strong>
            <span>${esc(email)}</span>
          </div>
        </div>
      </td>
      <td style="font-size:.85rem;font-weight:700;color:#34d399;">${amt}</td>
      <td>${payInfo}</td>
      <td>${buildStatusBadge(w.status)}</td>
      <td style="color:var(--muted2);font-size:.78rem;">${requested}</td>
      <td>${actions}</td>
    </tr>`;
}

window.confirmWdApprove = function(id) {
  const note = prompt('Admin note (optional):');
  if (note === null) return; // Cancel pressed → abort
  doWdApprove(id, note);
};

async function doWdApprove(id, note) {
  const sb = window.scriptoraSupabase;
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc('admin_approve_affiliate_withdrawal', {
      p_withdrawal_id: id,
      p_admin_note: note || null,
    });
    if (error) throw error;
    if (data?.success === false) {
      showToast('❌ ' + (data.message || 'Approval failed'), '#f87171');
      return;
    }
    showToast('✅ Withdrawal Approved', '#34d399');

    /* Phase 7: notify affiliate */
    const w = ALL_WITHDRAWALS.find(x => x.id === id);
    if (w) {
      notifyAffiliate({
        clientId: w.client_id,
        affiliateId: w.affiliate_id,
        type: 'withdrawal_approved',
        title: 'Withdrawal Request Approved ✅',
        message: `আপনার ৳${Number(w.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Withdrawal Request Approve হয়েছে। খুব শীঘ্রই Payout করা হবে।`,
        amount: w.amount
      });
    }

    await loadWithdrawals();
  } catch (err) {
    showToast('❌ Error: ' + err.message, '#f87171');
  }
}

window.confirmWdReject = function(id) {
  const note = prompt('Reject reason (optional):');
  if (note === null) return; // Cancel pressed → abort
  if (!confirm('এই withdrawal request reject করবেন?')) return;
  doWdReject(id, note);
};

async function doWdReject(id, note) {
  const sb = window.scriptoraSupabase;
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc('admin_reject_affiliate_withdrawal', {
      p_withdrawal_id: id,
      p_admin_note: note || null,
    });
    if (error) throw error;
    if (data?.success === false) {
      showToast('❌ ' + (data.message || 'Reject failed'), '#f87171');
      return;
    }
    showToast('🚫 Withdrawal Rejected', '#f59e0b');

    /* Phase 7: notify affiliate */
    const w = ALL_WITHDRAWALS.find(x => x.id === id);
    if (w) {
      notifyAffiliate({
        clientId: w.client_id,
        affiliateId: w.affiliate_id,
        type: 'withdrawal_rejected',
        title: 'Withdrawal Request Rejected',
        message: note
          ? `আপনার ৳${Number(w.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Withdrawal Request Reject হয়েছে। কারণ: ${note}`
          : `আপনার ৳${Number(w.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Withdrawal Request Reject হয়েছে। বিস্তারিত জানতে Support-এ যোগাযোগ করুন।`,
        amount: w.amount
      });
    }

    await loadWithdrawals();
  } catch (err) {
    showToast('❌ Error: ' + err.message, '#f87171');
  }
}

window.confirmWdPayout = function(id) {
  const txn = prompt('Payout Transaction ID (required):');
  if (txn === null) return;
  if (!txn.trim()) { showToast('❌ Transaction ID দিন', '#f87171'); return; }
  const note = prompt('Admin note (optional):');
  if (note === null) return; // Cancel pressed → abort
  if (!confirm(`৳ payout confirm করবেন?\n\nTXN: ${txn.trim()}`)) return;
  doWdPayout(id, txn.trim(), note);
};

async function doWdPayout(id, txn, note) {
  const sb = window.scriptoraSupabase;
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc('admin_confirm_affiliate_payout', {
      p_withdrawal_id: id,
      p_payout_txn_id: txn,
      p_admin_note: note || null,
    });
    if (error) throw error;
    if (data?.success === false) {
      showToast('❌ ' + (data.message || 'Payout failed'), '#f87171');
      return;
    }
    showToast('✅ Payout Confirmed', '#34d399');

    /* Phase 7: notify affiliate */
    const w = ALL_WITHDRAWALS.find(x => x.id === id);
    if (w) {
      notifyAffiliate({
        clientId: w.client_id,
        affiliateId: w.affiliate_id,
        type: 'withdrawal_paid',
        title: 'Payout সম্পন্ন হয়েছে 🎉',
        message: `আপনার ৳${Number(w.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Withdrawal সফলভাবে Pay করা হয়েছে। TXN ID: ${txn}`,
        amount: w.amount
      });
    }

    await loadWithdrawals();
    if (ALL_COMMISSIONS.length > 0) await loadCommissions();
  } catch (err) {
    showToast('❌ Error: ' + err.message, '#f87171');
  }
}

/* ══════════════════════════════════════════════════════════
   PHASE 7 — AFFILIATE NOTIFICATIONS
   Fire-and-forget: never blocks or breaks the primary action
   (approve/reject/record/withdraw) if the insert fails.
══════════════════════════════════════════════════════════ */
async function notifyAffiliate({ clientId, affiliateId = null, type, title, message, amount = null }) {
  const sb = window.scriptoraSupabase;
  if (!sb || !clientId || !type) return;
  try {
    await sb.from('affiliate_notifications').insert({
      client_id: clientId,
      affiliate_id: affiliateId,
      type,
      title,
      message,
      amount
    });
  } catch (err) {
    console.error('[Affiliate Notify] failed:', err);
    /* Silent — notification failures must never surface to the admin
       as if the underlying action (approve/reject/payout) failed. */
  }
}

/* ── Toast ────────────────────────────────────────────────── */
function showToast(msg, color = '#34d399') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.style.cssText = `background:${color};color:#fff;padding:12px 18px;border-radius:10px;font-size:.82rem;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.3);animation:fadeIn .2s ease;`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ── Table helpers ────────────────────────────────────────── */
function setTbodyLoading(tbodyId, cols) {
  const el = document.getElementById(tbodyId);
  if (!el) return;
  el.innerHTML = `
    <tr>
      <td colspan="${cols}" class="cl-empty">
        <i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i>
        <p>Loading...</p>
      </td>
    </tr>`;
}

function setTbodyError(tbodyId, cols) {
  const el = document.getElementById(tbodyId);
  if (!el) return;
  el.innerHTML = `
    <tr>
      <td colspan="${cols}" class="cl-empty">
        <i class="ti ti-alert-circle"></i>
        <p>Data load করতে সমস্যা হয়েছে। Refresh করুন।</p>
      </td>
    </tr>`;
}

/* ── Date / String helpers ────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < String(str).length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h},55%,65%)`;
}

/* ══════════════════════════════════════════════════════════
   TAB 4 — REFERRED CLIENTS
══════════════════════════════════════════════════════════ */

async function loadReferrals() {
  const tbody = document.getElementById('refTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted2);font-size:.82rem;">লোড হচ্ছে…</td></tr>';

  const sb = window.scriptoraSupabase;
  if (!sb) { tbody.innerHTML = errorRow(6); return; }

  try {
    const { data, error } = await sb
      .from('v_referred_clients')
      .select('*')
      .order('registered_at', { ascending: false });

    if (error) throw error;

    ALL_REFERRALS = data || [];
    renderReferrals();
    updateRefStats();

  } catch (err) {
    console.error('loadReferrals error:', err);
    tbody.innerHTML = errorRow(6);
  }
}

function updateRefStats() {
  const total      = ALL_REFERRALS.length;
  const orders     = ALL_REFERRALS.reduce((s, r) => s + Number(r.order_count || 0), 0);
  const value      = ALL_REFERRALS.reduce((s, r) => s + Number(r.total_order_value || 0), 0);
  const fmt        = v => '৳' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0 });

  const el = id => document.getElementById(id);
  if (el('ref-total'))  el('ref-total').textContent  = total;
  if (el('ref-orders')) el('ref-orders').textContent = orders;
  if (el('ref-value'))  el('ref-value').textContent  = fmt(value);
}

function renderReferrals() {
  const tbody  = document.getElementById('refTbody');
  if (!tbody) return;

  const q      = (REF_SEARCH || '').toLowerCase();
  const rows   = q
    ? ALL_REFERRALS.filter(r =>
        (r.client_name  || '').toLowerCase().includes(q) ||
        (r.client_email || '').toLowerCase().includes(q) ||
        (r.affiliate_name  || '').toLowerCase().includes(q) ||
        (r.affiliate_email || '').toLowerCase().includes(q) ||
        (r.referral_code   || '').toLowerCase().includes(q)
      )
    : ALL_REFERRALS;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted2);font-size:.82rem;">কোনো referred client নেই।</td></tr>`;
    return;
  }

  const fmt = v => '৳' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0 });

  tbody.innerHTML = rows.map(r => `
    <tr style="border-bottom:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background='rgba(255,255,255,.03)'" onmouseout="this.style.background=''">
      <td style="padding:12px 14px;">
        <div style="font-weight:600;font-size:.88rem;">${esc(r.client_name || '—')}</div>
        <div style="color:var(--muted2);font-size:.75rem;">${esc(r.client_email || '')}</div>
      </td>
      <td style="padding:12px 14px;">
        <div style="font-weight:600;font-size:.88rem;">${esc(r.affiliate_name || '—')}</div>
        <div style="color:var(--muted2);font-size:.75rem;">${esc(r.affiliate_email || '')}</div>
      </td>
      <td style="padding:12px 14px;">
        <span style="background:rgba(52,211,153,.12);color:#34d399;font-size:.78rem;font-weight:700;padding:3px 10px;border-radius:6px;font-family:monospace;letter-spacing:.04em;">${esc(r.referral_code || '—')}</span>
      </td>
      <td style="padding:12px 14px;color:var(--muted2);font-size:.8rem;">${fmtDate(r.registered_at)}</td>
      <td style="padding:12px 14px;font-weight:700;text-align:center;">${r.order_count || 0}</td>
      <td style="padding:12px 14px;font-weight:700;color:#34d399;">${fmt(r.total_order_value || 0)}</td>
    </tr>`).join('');
}

window.filterReferrals = function() {
  REF_SEARCH = (document.getElementById('refSearch')?.value || '').trim();
  renderReferrals();
};

/* ══════════════════════════════════════════════════════════════
   TAB 5 — ANALYTICS (Phase 6)
══════════════════════════════════════════════════════════════ */

let ANALYTICS_AFF_LIST = [];
let ANALYTICS_CURRENT_AFF_ID = null;

async function loadAnalytics() {
  const sb = window.scriptoraSupabase;
  if (!sb) return;

  const tbody = document.getElementById('analyticsAffTbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted2);font-size:.82rem;">লোড হচ্ছে…</td></tr>`;

  try {
    const { data: rows, error } = await sb.rpc('admin_list_affiliates_with_stats');
    if (error) throw error;

    ANALYTICS_AFF_LIST = rows || [];
    renderAnalyticsList();
  } catch (err) {
    console.error('[Analytics] load error:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:#f87171;font-size:.82rem;">Load error: ${esc(String(err.message || err))}</td></tr>`;
  }
}

function renderAnalyticsList() {
  const tbody = document.getElementById('analyticsAffTbody');
  if (!tbody) return;

  if (!ANALYTICS_AFF_LIST.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted2);font-size:.82rem;">কোনো affiliate নেই।</td></tr>`;
    return;
  }

  const fmtAmt = v => '৳' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

  tbody.innerHTML = ANALYTICS_AFF_LIST.map(r => {
    const isActive = r.status === 'active';
    const tierEmoji = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Diamond: '💎' }[r.tier_name] || '🏅';

    return `
      <tr style="border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.03)'"
          onmouseout="this.style.background=''"
          onclick="loadAnalyticsDetail('${r.affiliate_id}')">
        <td style="padding:12px 16px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">${isActive ? '✅' : '⏸️'}</span>
            <div>
              <div style="font-weight:600;font-size:.88rem;color:var(--accent);font-family:'Sora',monospace;">${esc(r.referral_code || '—')}</div>
              <div style="color:var(--muted2);font-size:.72rem;">${fmtDate(r.joined_at)}</div>
            </div>
          </div>
        </td>
        <td style="padding:12px 12px;">
          <span style="font-size:.82rem;font-weight:700;padding:3px 10px;border-radius:20px;background:${r.badge_color || '#cd7f32'}22;color:${r.badge_color || '#cd7f32'};">
            ${tierEmoji} ${esc(r.tier_name || 'Bronze')}
          </span>
        </td>
        <td style="padding:12px 12px;font-weight:700;color:var(--accent-light);font-size:.9rem;">${r.commission_rate || 10}%</td>
        <td style="padding:12px 12px;text-align:right;font-weight:700;font-size:.9rem;">${r.total_referrals || 0}</td>
        <td style="padding:12px 12px;text-align:right;color:var(--muted2);font-size:.85rem;">${r.total_clicks || 0}</td>
        <td style="padding:12px 12px;text-align:right;font-weight:700;color:#34d399;font-size:.9rem;">${fmtAmt(r.total_earned)}</td>
      </tr>`;
  }).join('');
}

window.loadAnalyticsDetail = async function(affiliateId) {
  const sb = window.scriptoraSupabase;
  if (!sb) return;

  ANALYTICS_CURRENT_AFF_ID = affiliateId;
  const panel = document.getElementById('analyticsDetailPanel');
  if (panel) panel.style.display = 'block';

  // Find affiliate in list for quick display
  const aff = ANALYTICS_AFF_LIST.find(a => a.affiliate_id === affiliateId);
  if (aff) {
    const codeEl = document.getElementById('analyticsDetailCode');
    const tierEl = document.getElementById('analyticsDetailTier');
    const selEl  = document.getElementById('analyticsSetTierSelect');
    if (codeEl) codeEl.textContent = aff.referral_code || '—';
    if (tierEl) tierEl.textContent = `${aff.tier_name || 'Bronze'} · ${aff.commission_rate || 10}% commission · ${aff.total_referrals || 0} paid referrals`;
    if (selEl)  selEl.value = String(aff.tier_id || 1);
  }

  // Set loading state
  const mTbody = document.getElementById('analyticsMonthlyTbody');
  const cTbody = document.getElementById('analyticsClicksTbody');
  if (mTbody) mTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--muted2);">লোড হচ্ছে…</td></tr>`;
  if (cTbody) cTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted2);">লোড হচ্ছে…</td></tr>`;

  try {
    const { data: detail, error } = await sb.rpc('admin_get_affiliate_analytics', { p_affiliate_id: affiliateId });
    if (error) throw error;

    const fmtAmt = v => '৳' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

    // Monthly stats
    const monthly = detail.monthly_stats || [];
    if (mTbody) {
      if (!monthly.length) {
        mTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--muted2);">কোনো monthly data নেই।</td></tr>`;
      } else {
        mTbody.innerHTML = monthly.map(m => `
          <tr style="border-bottom:1px solid var(--border);">
            <td style="padding:9px 12px;font-size:.83rem;">${esc(m.month || '—')}</td>
            <td style="padding:9px 12px;text-align:right;font-weight:600;">${m.orders || 0}</td>
            <td style="padding:9px 12px;text-align:right;font-weight:700;color:#34d399;">${fmtAmt(m.earned)}</td>
          </tr>`).join('');
      }
    }

    // Daily clicks
    const daily = detail.daily_clicks || [];
    if (cTbody) {
      if (!daily.length) {
        cTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--muted2);">গত ৩০ দিনে কোনো click নেই।</td></tr>`;
      } else {
        cTbody.innerHTML = daily.map(d => {
          const convRate = d.total_clicks > 0 ? Math.round((d.conversions / d.total_clicks) * 100) : 0;
          return `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:9px 12px;font-size:.83rem;color:var(--muted2);">${esc(String(d.day || '—'))}</td>
              <td style="padding:9px 12px;text-align:right;font-weight:600;">${d.total_clicks || 0}</td>
              <td style="padding:9px 12px;text-align:right;color:#34d399;font-weight:600;">${d.conversions || 0}</td>
              <td style="padding:9px 12px;text-align:right;color:#60a5fa;">${convRate}%</td>
            </tr>`;
        }).join('');
      }
    }

    // Update tier display from detail
    const tier = detail.tier || {};
    const codeEl = document.getElementById('analyticsDetailCode');
    const tierEl = document.getElementById('analyticsDetailTier');
    if (codeEl) codeEl.textContent = detail.referral_code || '—';
    if (tierEl) tierEl.textContent = `${tier.name || 'Bronze'} · ${tier.commission_rate || 10}% commission · ${detail.total_referrals || 0} paid referrals`;

    // Scroll to panel
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('[Analytics] detail error:', err);
    if (mTbody) mTbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:20px;color:#f87171;">Error: ${esc(String(err.message || err))}</td></tr>`;
    if (cTbody) cTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#f87171;">Error loading data.</td></tr>`;
  }
};

window.adminSetAffiliateTier = async function() {
  const sb = window.scriptoraSupabase;
  if (!sb || !ANALYTICS_CURRENT_AFF_ID) return;

  const tierId = parseInt(document.getElementById('analyticsSetTierSelect')?.value || '1');
  try {
    const { data, error } = await sb.rpc('admin_set_affiliate_tier', {
      p_affiliate_id: ANALYTICS_CURRENT_AFF_ID,
      p_tier_id:      tierId
    });
    if (error) throw error;
    if (data?.success === false) throw new Error(data.message);
    showToast('✅ Tier updated successfully', '#34d399');
    // Reload list to reflect change
    ANALYTICS_AFF_LIST = [];
    loadAnalytics();
  } catch (err) {
    showToast('❌ ' + (err.message || 'Tier update failed'), '#f87171');
  }
};
