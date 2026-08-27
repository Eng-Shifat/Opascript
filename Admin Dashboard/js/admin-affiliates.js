/* ══════════════════════════════════════════════════════════
   SCRIPTORA — Affiliate Applications Admin
   js/admin-affiliates.js

   Reads: public.affiliate_applications (joined with clients)
   Approve: calls public.approve_affiliate_application(id) RPC
   Reject:  updates affiliate_applications directly
   Toast:   same showToast() pattern as admin-clients.js
══════════════════════════════════════════════════════════ */
'use strict';

let ALL_APPLICATIONS = [];
let CLIENT_MAP       = {};   /* client_id → { name, email } */
let CURRENT_FILTER   = 'all';

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await waitForSession();
  await loadApplications();
});

/* Reuse the same waitForSession pattern as admin-clients.js */
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

/* ── Load all applications + client info ──────────────────── */
async function loadApplications() {
  const sb = window.scriptoraSupabase;
  if (!sb) { showToast('⚠️ Supabase connected হয়নি', '#f87171'); return; }

  setTbodyLoading();

  try {
    /* 1. Fetch all applications, newest first */
    const { data: apps, error: appErr } = await sb
      .from('affiliate_applications')
      .select('id, client_id, status, applied_at, reviewed_at, admin_note')
      .order('applied_at', { ascending: false });

    if (appErr) throw appErr;
    ALL_APPLICATIONS = apps || [];

    /* 2. Fetch client names/emails for all unique client_ids */
    const clientIds = [...new Set(ALL_APPLICATIONS.map(a => a.client_id))];
    CLIENT_MAP = {};

    if (clientIds.length > 0) {
      const { data: clients } = await sb
        .from('clients')
        .select('id, name, email')
        .in('id', clientIds);

      (clients || []).forEach(c => { CLIENT_MAP[c.id] = c; });
    }

    updateStats();
    renderTable();

  } catch (err) {
    console.error('loadApplications error:', err);
    showToast('❌ Data load হয়নি: ' + err.message, '#f87171');
    setTbodyError();
  }
}

/* ── Stats row ────────────────────────────────────────────── */
function updateStats() {
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

/* ── Filter chips ─────────────────────────────────────────── */
window.setAffFilter = function(filter, btn) {
  CURRENT_FILTER = filter;
  document.querySelectorAll('.cl-filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
};

/* ── Render table ─────────────────────────────────────────── */
function renderTable() {
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

  tbody.innerHTML = rows.map(app => buildRow(app)).join('');
}

function buildRow(app) {
  const client  = CLIENT_MAP[app.client_id];
  const name    = client?.name  || '—';
  const email   = client?.email || app.client_id.slice(0, 8) + '…';
  const initials = name !== '—' ? name.slice(0, 2).toUpperCase() : '??';
  const avatarBg = stringToColor(app.client_id);

  const appliedAt   = fmtDate(app.applied_at);
  const reviewedAt  = app.reviewed_at ? fmtDate(app.reviewed_at) : '<span style="color:var(--muted)">—</span>';
  const adminNote   = app.admin_note
    ? `<span title="${esc(app.admin_note)}" style="max-width:160px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(app.admin_note)}</span>`
    : '<span style="color:var(--muted)">—</span>';

  const statusBadge = buildStatusBadge(app.status);

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
      <td>${statusBadge}</td>
      <td style="color:var(--muted2);font-size:.78rem;">${reviewedAt}</td>
      <td style="font-size:.78rem;">${adminNote}</td>
      <td>${actions}</td>
    </tr>`;
}

function buildStatusBadge(status) {
  const map = {
    pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: 'ti-clock',        label: 'Pending' },
    approved: { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: 'ti-circle-check', label: 'Approved' },
    rejected: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: 'ti-circle-x',     label: 'Rejected' },
  };
  const s = map[status] || { color: 'var(--muted2)', bg: 'transparent', icon: 'ti-help-circle', label: status };
  return `<span class="cl-badge" style="background:${s.bg};color:${s.color};">
    <i class="ti ${s.icon}"></i> ${s.label}
  </span>`;
}

/* ── Approve flow ─────────────────────────────────────────── */
window.confirmApprove = function(appId) {
  /* Uses native confirm() — same pattern as odp-payments.js */
  if (!confirm('এই affiliate application টি Approve করবেন?\n\nApprove হলে client এর জন্য একটি unique referral code তৈরি হবে।')) return;
  doApprove(appId);
};

async function doApprove(appId) {
  const sb = window.scriptoraSupabase;
  if (!sb) return;

  try {
    /* Call the DB function created in migration 20260827000001.
       All approval logic (code generation, atomicity) lives there. */
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

/* ── Reject flow ──────────────────────────────────────────── */
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
      .update({
        status:      'rejected',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', appId)
      .eq('status', 'pending');   /* safety: only reject if still pending */

    if (error) throw error;

    showToast('🚫 Application Rejected', '#f59e0b');
    await loadApplications();

  } catch (err) {
    console.error('doReject error:', err);
    showToast('❌ Error: ' + err.message, '#f87171');
  }
}

/* ── Toast (same implementation as admin-clients.js) ─────── */
function showToast(msg, color = '#34d399') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.style.cssText = `background:${color};color:#fff;padding:12px 18px;border-radius:10px;font-size:.82rem;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.3);animation:fadeIn .2s ease;`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ── Helpers ──────────────────────────────────────────────── */
function setTbodyLoading() {
  document.getElementById('aff-tbody').innerHTML = `
    <tr>
      <td colspan="6" class="cl-empty">
        <i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i>
        <p>Loading applications...</p>
      </td>
    </tr>`;
}

function setTbodyError() {
  document.getElementById('aff-tbody').innerHTML = `
    <tr>
      <td colspan="6" class="cl-empty">
        <i class="ti ti-alert-circle"></i>
        <p>Data load করতে সমস্যা হয়েছে। Refresh করুন।</p>
      </td>
    </tr>`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* Deterministic color from a UUID string — same visual trick as other admin pages */
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = Math.abs(hash) % 360;
  return `hsl(${h},55%,65%)`;
}
