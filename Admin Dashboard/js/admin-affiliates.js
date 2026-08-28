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

  document.getElementById('tabBtnApplications').classList.toggle('aff-tab-active', tab === 'applications');
  document.getElementById('tabBtnCommissions').classList.toggle('aff-tab-active',  tab === 'commissions');

  if (tab === 'commissions' && ALL_COMMISSIONS.length === 0) {
    loadCommissions();
  }
};

window.refreshCurrentTab = function() {
  if (CURRENT_TAB === 'applications') loadApplications();
  else loadCommissions();
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

    /* If commissions tab is open, refresh it */
    if (CURRENT_TAB === 'commissions') await loadCommissions();

  } catch (err) {
    console.error('adminRecordCommission error:', err);
    showToast('❌ Error: ' + err.message, '#f87171');
  }
};

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
