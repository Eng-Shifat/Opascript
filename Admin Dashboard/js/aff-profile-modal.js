/* ══════════════════════════════════════════════════════════
   SCRIPTORA — Affiliate Profile Detail Modal
   js/aff-profile-modal.js

   Admin Applications tab-এ যেকোনো affiliate row click করলে
   এই modal খুলবে — application-এর সব details একসাথে দেখাবে।

   Dependencies: window._supabase, showToast() from admin-affiliates.js
   Table: public.affiliate_applications
══════════════════════════════════════════════════════════ */
'use strict';

/* ── Inject modal HTML + CSS ────────────────────────────── */
(function injectModal() {
  const css = document.createElement('style');
  css.textContent = `
/* ── Overlay ───────────────────────────────────────────── */
#affProfileOverlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(7, 5, 15, 0.82);
  backdrop-filter: blur(6px);
  z-index: 8000;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 16px;
  overflow-y: auto;
}
#affProfileOverlay.open {
  display: flex;
}

/* ── Panel ─────────────────────────────────────────────── */
#affProfilePanel {
  background: var(--card, #161229);
  border: 1px solid var(--border, rgba(167,139,250,.1));
  border-radius: 18px;
  width: 100%;
  max-width: 560px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,.6);
  animation: panelSlide .22s ease;
  margin: auto 0;
}
@keyframes panelSlide {
  from { opacity:0; transform:translateX(30px); }
  to   { opacity:1; transform:translateX(0); }
}

/* ── Panel top header ──────────────────────────────────── */
.afp-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--card2, #1c1733);
}
.afp-topbar-title {
  font-size: .85rem;
  font-weight: 700;
  color: var(--text);
}
.afp-close-btn {
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
.afp-close-btn:hover { background: rgba(248,113,113,.15); color: #f87171; border-color: rgba(248,113,113,.3); }

/* ── Profile hero ──────────────────────────────────────── */
.afp-hero {
  padding: 24px 24px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  background:
    radial-gradient(ellipse 80% 60% at 10% 0%, rgba(124,92,255,.08), transparent 60%),
    var(--card);
  border-bottom: 1px solid var(--border);
}
.afp-avatar {
  width: 70px; height: 70px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--accent, #7c5cff);
  box-shadow: 0 0 0 4px rgba(124,92,255,.15);
  flex-shrink: 0;
}
.afp-avatar-fallback {
  width: 70px; height: 70px;
  border-radius: 50%;
  background: rgba(124,92,255,.2);
  border: 2px solid var(--accent, #7c5cff);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; font-weight: 700;
  color: var(--accent2, #b69dfd);
  flex-shrink: 0;
}
.afp-hero-info { flex: 1; min-width: 0; }
.afp-hero-name {
  font-size: 1.05rem; font-weight: 700;
  color: var(--text); margin-bottom: 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.afp-hero-uni {
  font-size: .78rem; color: var(--muted2); margin-bottom: 8px;
}
.afp-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 50px;
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .04em;
}
.afp-status-badge.pending  { background: rgba(245,158,11,.12); color: #f59e0b; border: 1px solid rgba(245,158,11,.3); }
.afp-status-badge.approved { background: rgba(52,211,153,.12); color: #34d399; border: 1px solid rgba(52,211,153,.3); }
.afp-status-badge.rejected { background: rgba(248,113,113,.12); color: #f87171; border: 1px solid rgba(248,113,113,.3); }

/* ── Section ───────────────────────────────────────────── */
.afp-section {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border);
}
.afp-section:last-of-type { border-bottom: none; }
.afp-section-label {
  font-size: .68rem;
  font-weight: 700;
  color: var(--muted, #6f6a85);
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.afp-section-label .ti { font-size: .8rem; color: var(--accent2, #b69dfd); }

/* ── Info rows ─────────────────────────────────────────── */
.afp-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
  font-size: .82rem;
}
.afp-row:last-child { margin-bottom: 0; }
.afp-row-label {
  color: var(--muted2);
  min-width: 130px;
  flex-shrink: 0;
  padding-top: 1px;
}
.afp-row-val {
  color: var(--text);
  font-weight: 500;
  word-break: break-all;
  flex: 1;
}
.afp-row-val a {
  color: var(--accent2, #b69dfd);
  text-decoration: none;
}
.afp-row-val a:hover { text-decoration: underline; }

/* ── Payment chip ──────────────────────────────────────── */
.afp-pay-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(212,175,106,.1);
  border: 1px solid rgba(212,175,106,.25);
  color: var(--gold, #d4af6a);
  border-radius: 7px;
  padding: 3px 10px;
  font-size: .76rem;
  font-weight: 600;
}

/* ── Skills chips ──────────────────────────────────────── */
.afp-tags-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.afp-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: .73rem;
  font-weight: 600;
}
.afp-tag.skill    { background: rgba(124,92,255,.15); color: var(--accent2, #b69dfd); border: 1px solid rgba(124,92,255,.25); }
.afp-tag.service  { background: rgba(52,211,153,.1);  color: #34d399; border: 1px solid rgba(52,211,153,.2); }

/* ── NID image ─────────────────────────────────────────── */
.afp-nid-img {
  width: 100%; max-width: 380px;
  border-radius: 10px;
  border: 1px solid var(--border);
  cursor: zoom-in;
  transition: opacity .2s;
}
.afp-nid-img:hover { opacity: .85; }

/* ── About text ────────────────────────────────────────── */
.afp-about-text {
  font-size: .82rem;
  color: var(--muted2);
  line-height: 1.7;
  white-space: pre-wrap;
}

/* ── Action bar ────────────────────────────────────────── */
.afp-action-bar {
  padding: 16px 24px;
  background: var(--card2);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.afp-btn {
  padding: 9px 18px;
  border-radius: 9px;
  font-size: .8rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  transition: opacity .15s, transform .12s;
  font-family: 'Sora', sans-serif;
}
.afp-btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.afp-btn:disabled { opacity: .4; cursor: not-allowed; }
.afp-btn.approve { background: linear-gradient(135deg, #34d399, #10b981); color: #fff; }
.afp-btn.reject  { background: none; border: 1px solid rgba(248,113,113,.5); color: #f87171; }
.afp-btn.note    { background: var(--card); border: 1px solid var(--border); color: var(--muted2); margin-left: auto; }

/* ── Admin note textarea ───────────────────────────────── */
.afp-note-wrap {
  display: none;
  padding: 0 24px 16px;
}
.afp-note-wrap.open { display: block; }
.afp-note-wrap textarea {
  width: 100%;
  background: var(--card);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  padding: 10px 14px;
  font-size: .82rem;
  font-family: 'Sora', sans-serif;
  resize: vertical;
  min-height: 80px;
  outline: none;
}
.afp-note-wrap textarea:focus { border-color: rgba(124,92,255,.5); }
  `;
  document.head.appendChild(css);

  const html = `
<div id="affProfileOverlay" onclick="affProfileClose(event)">
  <div id="affProfilePanel">

    <!-- Top bar -->
    <div class="afp-topbar">
      <div class="afp-topbar-title">Affiliate Profile</div>
      <button class="afp-close-btn" onclick="affProfileHide()">
        <i class="ti ti-x"></i>
      </button>
    </div>

    <!-- Hero -->
    <div class="afp-hero">
      <div id="afpAvatarWrap">
        <div class="afp-avatar-fallback" id="afpAvatarFallback">??</div>
      </div>
      <div class="afp-hero-info">
        <div class="afp-hero-name" id="afpName">—</div>
        <div class="afp-hero-uni" id="afpUni">—</div>
        <span class="afp-status-badge pending" id="afpStatusBadge">Pending</span>
        <div style="font-size:.7rem;color:var(--muted);margin-top:6px;" id="afpAppliedAt">—</div>
      </div>
    </div>

    <!-- Contact info -->
    <div class="afp-section">
      <div class="afp-section-label"><i class="ti ti-address-book"></i> Contact</div>
      <div class="afp-row">
        <span class="afp-row-label">📧 Email</span>
        <span class="afp-row-val" id="afpEmail">—</span>
      </div>
      <div class="afp-row">
        <span class="afp-row-label">📞 Phone</span>
        <span class="afp-row-val" id="afpPhone">—</span>
      </div>
      <div class="afp-row">
        <span class="afp-row-label">💬 WhatsApp</span>
        <span class="afp-row-val" id="afpWhatsapp">—</span>
      </div>
      <div class="afp-row">
        <span class="afp-row-label">🔵 Facebook</span>
        <span class="afp-row-val" id="afpFacebook">—</span>
      </div>
    </div>

    <!-- Payment -->
    <div class="afp-section">
      <div class="afp-section-label"><i class="ti ti-wallet"></i> Payment Method</div>
      <div class="afp-row">
        <span class="afp-row-label">Method</span>
        <span class="afp-row-val" id="afpPayMethod">—</span>
      </div>
      <div class="afp-row">
        <span class="afp-row-label">Account</span>
        <span class="afp-row-val" id="afpPayNumber">—</span>
      </div>
    </div>

    <!-- Identity -->
    <div class="afp-section">
      <div class="afp-section-label"><i class="ti ti-id-badge"></i> Identity</div>
      <div class="afp-row">
        <span class="afp-row-label">NID Number</span>
        <span class="afp-row-val" id="afpNidNum">—</span>
      </div>
      <div class="afp-row" style="flex-direction:column;gap:8px;">
        <span class="afp-row-label">NID Photo</span>
        <div id="afpNidPhotoWrap" style="display:none;">
          <img class="afp-nid-img" id="afpNidPhoto" src="" alt="NID" onclick="window.open(this.src,'_blank')"/>
        </div>
        <span id="afpNidPhotoNA" style="color:var(--muted);font-size:.8rem;">Not provided</span>
      </div>
    </div>

    <!-- Skills & Services -->
    <div class="afp-section">
      <div class="afp-section-label"><i class="ti ti-bulb"></i> Skills & Preferred Services</div>
      <div class="afp-row" style="flex-direction:column;gap:6px;">
        <span class="afp-row-label">Marketing Skills</span>
        <div class="afp-tags-wrap" id="afpSkills"></div>
      </div>
      <div class="afp-row" style="flex-direction:column;gap:6px;margin-top:12px;">
        <span class="afp-row-label">Service Sectors</span>
        <div class="afp-tags-wrap" id="afpServices"></div>
      </div>
    </div>

    <!-- Referrer -->
    <div class="afp-section" id="afpRefSection" style="display:none;">
      <div class="afp-section-label"><i class="ti ti-link"></i> Referrer</div>
      <div class="afp-row">
        <span class="afp-row-label">Referred by</span>
        <span class="afp-row-val" id="afpReferrer">—</span>
      </div>
    </div>

    <!-- About -->
    <div class="afp-section">
      <div class="afp-section-label"><i class="ti ti-message-2"></i> About Self</div>
      <div class="afp-about-text" id="afpAbout">—</div>
    </div>

    <!-- Admin note area (toggles) -->
    <div class="afp-note-wrap" id="afpNoteWrap">
      <label style="font-size:.73rem;color:var(--muted2);font-weight:600;display:block;margin-bottom:6px;">Admin Note (optional — reject করলে affiliate কে জানানো হবে)</label>
      <textarea id="afpNoteInput" placeholder="কারণ বা note লিখুন…"></textarea>
    </div>

    <!-- Action bar -->
    <div class="afp-action-bar" id="afpActionBar">
      <button class="afp-btn approve" id="afpApproveBtn" onclick="affProfileAction('approve')">
        <i class="ti ti-check"></i> Approve
      </button>
      <button class="afp-btn reject" id="afpRejectBtn" onclick="affProfileToggleNote()">
        <i class="ti ti-x"></i> Reject
      </button>
      <button class="afp-btn note" id="afpConfirmRejectBtn" onclick="affProfileAction('reject')" style="display:none;">
        <i class="ti ti-send"></i> Confirm Reject
      </button>
    </div>

  </div>
</div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
})();

/* ── State ──────────────────────────────────────────────── */
let _currentAffId = null;

/* ── Open profile ───────────────────────────────────────── */
window.affProfileOpen = async function(appId) {
  _currentAffId = appId;
  document.getElementById('affProfileOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Reset note state
  document.getElementById('afpNoteWrap').classList.remove('open');
  document.getElementById('afpConfirmRejectBtn').style.display = 'none';
  document.getElementById('afpNoteInput').value = '';

  // Load data
  try {
    const { data, error } = await window._supabase
      .from('affiliate_applications')
      .select('*')
      .eq('id', appId)
      .single();

    if (error || !data) throw new Error(error?.message || 'Not found');
    _populateProfile(data);
  } catch (e) {
    if (typeof showToast === 'function') showToast('Profile load করতে সমস্যা হয়েছে', 'error');
  }
};

/* ── Populate ───────────────────────────────────────────── */
function _populateProfile(d) {
  // Avatar
  const avatarWrap = document.getElementById('afpAvatarWrap');
  if (d.photo_url) {
    avatarWrap.innerHTML = `<img class="afp-avatar" src="${_esc(d.photo_url)}" alt="Photo" onerror="this.style.display='none'"/>`;
  } else {
    const initials = (d.full_name || '?').slice(0, 2).toUpperCase();
    document.getElementById('afpAvatarFallback').textContent = initials;
    avatarWrap.innerHTML = `<div class="afp-avatar-fallback">${_esc(initials)}</div>`;
  }

  // Basic info
  document.getElementById('afpName').textContent     = d.full_name  || '—';
  document.getElementById('afpUni').textContent      = d.university || '—';
  document.getElementById('afpEmail').textContent    = d.email      || '—';
  document.getElementById('afpPhone').textContent    = d.phone      || '—';
  document.getElementById('afpWhatsapp').textContent = d.whatsapp   || '—';
  document.getElementById('afpNidNum').textContent   = d.nid_number || '—';
  document.getElementById('afpAbout').textContent    = d.about_self || '—';

  // Facebook link
  const fb = document.getElementById('afpFacebook');
  if (d.facebook_url) {
    fb.innerHTML = `<a href="${_esc(d.facebook_url)}" target="_blank" rel="noopener">${_esc(d.facebook_url)}</a>`;
  } else { fb.textContent = '—'; }

  // Status badge
  const badge = document.getElementById('afpStatusBadge');
  badge.className = `afp-status-badge ${d.status || 'pending'}`;
  const statusLabels = { pending: '🕐 Pending', approved: '✅ Approved', rejected: '❌ Rejected' };
  badge.textContent = statusLabels[d.status] || d.status;

  // Applied at
  const at = d.created_at ? new Date(d.created_at).toLocaleString('bn-BD') : '—';
  document.getElementById('afpAppliedAt').textContent = `Applied: ${at}`;

  // Payment
  const payLabels = { bkash:'bKash', nagad:'Nagad', upay:'Upay', banktransfer:'Bank Transfer' };
  const payEl = document.getElementById('afpPayMethod');
  if (d.payment_method) {
    payEl.innerHTML = `<span class="afp-pay-chip">💳 ${_esc(payLabels[d.payment_method] || d.payment_method)}</span>`;
  } else { payEl.textContent = '—'; }
  document.getElementById('afpPayNumber').textContent = d.payment_number || '—';

  // NID photo
  const nidWrap = document.getElementById('afpNidPhotoWrap');
  const nidNA   = document.getElementById('afpNidPhotoNA');
  if (d.nid_photo_url) {
    document.getElementById('afpNidPhoto').src = d.nid_photo_url;
    nidWrap.style.display = '';
    nidNA.style.display   = 'none';
  } else {
    nidWrap.style.display = 'none';
    nidNA.style.display   = '';
  }

  // Skills
  const skillsWrap = document.getElementById('afpSkills');
  skillsWrap.innerHTML = '';
  const skills = Array.isArray(d.skills) ? d.skills : (d.skills ? JSON.parse(d.skills) : []);
  skills.forEach(sk => {
    const tag = document.createElement('span');
    tag.className = 'afp-tag skill';
    tag.textContent = sk;
    skillsWrap.appendChild(tag);
  });
  if (!skills.length) skillsWrap.innerHTML = '<span style="color:var(--muted);font-size:.8rem;">কোনো skill দেয়নি</span>';

  // Services
  const svcWrap = document.getElementById('afpServices');
  svcWrap.innerHTML = '';
  const svcs = Array.isArray(d.preferred_services)
    ? d.preferred_services
    : (d.preferred_services ? JSON.parse(d.preferred_services) : []);
  svcs.forEach(svc => {
    const tag = document.createElement('span');
    tag.className = 'afp-tag service';
    tag.textContent = svc;
    svcWrap.appendChild(tag);
  });
  if (!svcs.length) svcWrap.innerHTML = '<span style="color:var(--muted);font-size:.8rem;">কোনো sector select করেনি</span>';

  // Referrer
  const refSection = document.getElementById('afpRefSection');
  if (d.referrer_code) {
    refSection.style.display = '';
    document.getElementById('afpReferrer').textContent = d.referrer_code;
  } else {
    refSection.style.display = 'none';
  }

  // Action bar — hide approve/reject if already decided
  const actionBar = document.getElementById('afpActionBar');
  const approveBtn = document.getElementById('afpApproveBtn');
  const rejectBtn  = document.getElementById('afpRejectBtn');
  if (d.status === 'pending') {
    actionBar.style.display = '';
    approveBtn.style.display = '';
    rejectBtn.style.display  = '';
    approveBtn.disabled = false;
    rejectBtn.disabled  = false;
  } else {
    // Already decided — still show bar but buttons disabled
    actionBar.style.display = '';
    approveBtn.style.display = '';
    rejectBtn.style.display  = '';
    approveBtn.disabled = true;
    rejectBtn.disabled  = true;
    if (d.admin_note) {
      document.getElementById('afpNoteInput').value = d.admin_note;
    }
  }
}

/* ── Toggle note field for reject ──────────────────────── */
window.affProfileToggleNote = function() {
  const noteWrap = document.getElementById('afpNoteWrap');
  const confirmBtn = document.getElementById('afpConfirmRejectBtn');
  noteWrap.classList.toggle('open');
  const isOpen = noteWrap.classList.contains('open');
  confirmBtn.style.display = isOpen ? 'inline-flex' : 'none';
  if (isOpen) document.getElementById('afpNoteInput').focus();
};

/* ── Approve / Reject ───────────────────────────────────── */
window.affProfileAction = async function(action) {
  if (!_currentAffId) return;

  const approveBtn = document.getElementById('afpApproveBtn');
  const rejectBtn  = document.getElementById('afpRejectBtn');
  const confirmBtn = document.getElementById('afpConfirmRejectBtn');
  approveBtn.disabled = rejectBtn.disabled = confirmBtn.disabled = true;

  try {
    const supabase = window._supabase;

    if (action === 'approve') {
      const { error } = await supabase.rpc('approve_affiliate_application', { app_id: _currentAffId });
      if (error) throw new Error(error.message);
      if (typeof showToast === 'function') showToast('Affiliate approve হয়েছে ✅', 'success');
    } else {
      const note = document.getElementById('afpNoteInput').value.trim();
      const { error } = await supabase
        .from('affiliate_applications')
        .update({ status: 'rejected', admin_note: note || null, reviewed_at: new Date().toISOString() })
        .eq('id', _currentAffId);
      if (error) throw new Error(error.message);
      if (typeof showToast === 'function') showToast('Application reject করা হয়েছে', 'warning');
    }

    affProfileHide();
    // Refresh parent table
    if (typeof loadApplications === 'function') loadApplications();

  } catch (e) {
    if (typeof showToast === 'function') showToast('Error: ' + e.message, 'error');
    approveBtn.disabled = rejectBtn.disabled = confirmBtn.disabled = false;
  }
};

/* ── Close ──────────────────────────────────────────────── */
window.affProfileHide = function() {
  document.getElementById('affProfileOverlay').classList.remove('open');
  document.body.style.overflow = '';
  _currentAffId = null;
};

window.affProfileClose = function(e) {
  if (e.target === document.getElementById('affProfileOverlay')) affProfileHide();
};

/* ── Escape helper ──────────────────────────────────────── */
function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
