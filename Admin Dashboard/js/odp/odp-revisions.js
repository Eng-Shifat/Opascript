/* ============================================================
   SCRIPTORA — ODP Revisions Tab  (Admin Dashboard/js/odp/odp-revisions.js)
   Admin-side revision management inside Order Details Panel.
   Depends on: order-details-panel.js, revision-service.js
   ============================================================ */
'use strict';

/* ── Load revision tab ─────────────────────────────────────── */
window._loadRevisions = async function () {
  const el = document.getElementById('odpRevisionPane');
  if (!el) return;

  el.innerHTML = '<div class="rev-loading"><span></span> Loading revisions…</div>';

  try {
    const revisions = await RevisionService.getRevisions(window._currentOrderId);
    el.innerHTML = _buildRevisionTabHTML(revisions);
    _bindAdminRevisionActions(el, revisions);
  } catch (e) {
    el.innerHTML = `<div class="rev-error">Revisions লোড হয়নি: ${_esc(e.message)}</div>`;
  }
};

/* ── Build tab HTML ─────────────────────────────────────────── */
function _buildRevisionTabHTML(revisions) {
  if (!revisions.length) {
    return `
      <div class="rev-empty">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 2H3v16h5l3 3 3-3h7V2z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
        <div class="rev-empty-title">কোনো Revision Request নেই</div>
        <div class="rev-empty-sub">Client draft delivery review করার পর revision request করতে পারবেন।</div>
      </div>
    `;
  }

  const active   = revisions.filter(r => r.status !== 'approved');
  const approved = revisions.filter(r => r.status === 'approved');

  const queueHTML = active.length
    ? `<div class="rev-section-title">Active Revisions (${active.length})</div>
       ${active.reverse().map(r => _buildRevCard(r, false)).join('')}`
    : '';

  const histHTML = approved.length
    ? `<div class="rev-section-title rev-section-sep">Completed Revisions (${approved.length})</div>
       ${approved.reverse().map(r => _buildRevCard(r, true)).join('')}`
    : '';

  return `<div class="rev-tab-root">${queueHTML}${histHTML}</div>`;
}

/* ── Individual revision card ───────────────────────────────── */
function _buildRevCard(rev, isCompleted) {
  const SL = RevisionService.STATUS_LABEL;
  const SC = RevisionService.STATUS_CLASS;

  return `
    <div class="rev-card ${isCompleted ? 'rev-card-done' : ''}" id="revCard_${rev.id}">
      <div class="rev-card-header">
        <div class="rev-card-num">Revision #${rev.revision_number}</div>
        <span class="rev-status-badge ${SC[rev.status] || ''}">${_esc(SL[rev.status] || rev.status)}</span>
      </div>

      <div class="rev-card-meta">
        ${rev.section    ? `<span class="rev-meta-chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> ${_esc(rev.section)}</span>` : ''}
        ${rev.page_range ? `<span class="rev-meta-chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg> Pages ${_esc(rev.page_range)}</span>` : ''}
        <span class="rev-meta-chip">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${_fmtDate(rev.created_at)}
        </span>
      </div>

      <div class="rev-desc">${_esc(rev.description)}</div>

      ${rev.additional_note ? `<div class="rev-note"><span>Note:</span> ${_esc(rev.additional_note)}</div>` : ''}
      ${rev.admin_note ? `<div class="rev-admin-note"><span>🔒 Internal Note:</span> ${_esc(rev.admin_note)}</div>` : ''}
      ${rev.admin_response ? `<div class="rev-admin-response"><span>Admin Response:</span> ${_esc(rev.admin_response)}</div>` : ''}

      <div class="rev-timestamps">
        ${rev.accepted_at  ? `<span>Accepted: ${_fmtDate(rev.accepted_at)}</span>` : ''}
        ${rev.started_at   ? `<span>Started: ${_fmtDate(rev.started_at)}</span>` : ''}
        ${rev.ready_at     ? `<span>Ready: ${_fmtDate(rev.ready_at)}</span>` : ''}
        ${rev.approved_at  ? `<span>Approved: ${_fmtDate(rev.approved_at)}</span>` : ''}
      </div>

      ${!isCompleted ? `
        <div class="rev-actions" data-rev-id="${rev.id}" data-status="${rev.status}">
          ${_buildAdminActions(rev)}
        </div>
      ` : ''}

      <!-- File upload area for in_progress -->
      ${rev.status === 'in_progress' ? `
        <div class="rev-upload-area" id="revUpload_${rev.id}">
          <div class="rev-upload-label">Revised File Upload</div>
          <div class="rev-upload-zone" data-rev-id="${rev.id}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Revised file upload করুন</span>
            <input type="file" class="rev-file-input" data-rev-id="${rev.id}" accept=".pdf,.doc,.docx">
          </div>
          <div class="rev-uploaded-files" id="revFiles_${rev.id}"></div>
          <button class="rev-btn rev-btn-accent rev-mark-ready-btn" data-rev-id="${rev.id}" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Mark Ready for Review
          </button>
        </div>
      ` : ''}

      <!-- Clarification form -->
      ${rev.status === 'requested' ? `
        <div class="rev-clarify-form" id="revClarifyForm_${rev.id}" style="display:none;">
          <textarea class="rev-clarify-input" id="revClarifyText_${rev.id}" placeholder="Client কে কী জানাতে চান?"></textarea>
          <div class="rev-clarify-btns">
            <button class="rev-btn rev-btn-ghost" id="revClarifyCancel_${rev.id}">বাতিল</button>
            <button class="rev-btn rev-btn-warn" id="revClarifySend_${rev.id}" data-rev-id="${rev.id}">Send & Request Clarification</button>
          </div>
        </div>
      ` : ''}

      <!-- Internal note form -->
      <div class="rev-note-form" id="revNoteForm_${rev.id}" style="display:none;">
        <textarea class="rev-clarify-input" id="revNoteText_${rev.id}" placeholder="Internal note (client কে দেখানো হবে না)…"></textarea>
        <div class="rev-clarify-btns">
          <button class="rev-btn rev-btn-ghost" id="revNoteCancel_${rev.id}">বাতিল</button>
          <button class="rev-btn rev-btn-accent" id="revNoteSave_${rev.id}" data-rev-id="${rev.id}">Note সেভ করুন</button>
        </div>
      </div>
    </div>
  `;
}

/* ── Admin contextual actions ───────────────────────────────── */
function _buildAdminActions(rev) {
  const s = rev.status;

  if (s === 'requested') return `
    <button class="rev-btn rev-btn-primary rev-accept-btn"  data-rev-id="${rev.id}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Accept Revision
    </button>
    <button class="rev-btn rev-btn-warn rev-clarify-btn" data-rev-id="${rev.id}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
      Need Clarification
    </button>
    <button class="rev-btn rev-btn-ghost rev-note-btn" data-rev-id="${rev.id}">+ Internal Note</button>
  `;

  if (s === 'accepted') return `
    <button class="rev-btn rev-btn-primary rev-start-btn" data-rev-id="${rev.id}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Start Revision
    </button>
    <button class="rev-btn rev-btn-ghost rev-note-btn" data-rev-id="${rev.id}">+ Internal Note</button>
  `;

  if (s === 'in_progress') return `
    <button class="rev-btn rev-btn-ghost rev-note-btn" data-rev-id="${rev.id}">+ Internal Note</button>
  `;

  if (s === 'ready_for_review') return `
    <div class="rev-client-review-notice">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Client review করছেন…
    </div>
  `;

  if (s === 'needs_clarification') return `
    <div class="rev-client-review-notice rev-warn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
      Client-এর clarification-এর জন্য অপেক্ষা করছেন…
    </div>
  `;

  return '';
}

/* ── Bind admin event listeners ─────────────────────────────── */
function _bindAdminRevisionActions(el, revisions) {
  const revMap = {};
  revisions.forEach(r => revMap[r.id] = r);

  /* Accept */
  el.querySelectorAll('.rev-accept-btn').forEach(btn => {
    btn.onclick = async () => {
      await _adminTransition(btn, btn.dataset.revId, 'accepted', el);
    };
  });

  /* Start */
  el.querySelectorAll('.rev-start-btn').forEach(btn => {
    btn.onclick = async () => {
      await _adminTransition(btn, btn.dataset.revId, 'in_progress', el);
    };
  });

  /* Need Clarification — show form */
  el.querySelectorAll('.rev-clarify-btn').forEach(btn => {
    btn.onclick = () => {
      const form = document.getElementById(`revClarifyForm_${btn.dataset.revId}`);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };
  });

  /* Send clarification */
  el.querySelectorAll('[id^="revClarifySend_"]').forEach(btn => {
    btn.onclick = async () => {
      const revId = btn.dataset.revId;
      const text  = document.getElementById(`revClarifyText_${revId}`)?.value.trim();
      if (!text) { window._toast('Clarification message লিখুন', 'var(--red)'); return; }
      await _withLoading(btn, async () => {
        await RevisionService.requestClarification(revId, text);
        window._toast('✓ Clarification পাঠানো হয়েছে', 'var(--green)');
        window._loadRevisions();
      });
    };
  });

  /* Clarification cancel */
  el.querySelectorAll('[id^="revClarifyCancel_"]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.id.replace('revClarifyCancel_', '');
      const form = document.getElementById(`revClarifyForm_${id}`);
      if (form) form.style.display = 'none';
    };
  });

  /* Internal note toggle */
  el.querySelectorAll('.rev-note-btn').forEach(btn => {
    btn.onclick = () => {
      const form = document.getElementById(`revNoteForm_${btn.dataset.revId}`);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };
  });

  /* Save internal note */
  el.querySelectorAll('[id^="revNoteSave_"]').forEach(btn => {
    btn.onclick = async () => {
      const revId = btn.dataset.revId;
      const text  = document.getElementById(`revNoteText_${revId}`)?.value.trim();
      if (!text) return;
      await _withLoading(btn, async () => {
        await window._sb().from('revisions').update({ admin_note: text }).eq('id', revId);
        window._toast('✓ Note সেভ হয়েছে', 'var(--green)');
        window._loadRevisions();
      });
    };
  });

  /* Note cancel */
  el.querySelectorAll('[id^="revNoteCancel_"]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.id.replace('revNoteCancel_', '');
      const form = document.getElementById(`revNoteForm_${id}`);
      if (form) form.style.display = 'none';
    };
  });

  /* File upload for in_progress revisions */
  el.querySelectorAll('.rev-file-input').forEach(input => {
    const revId   = input.dataset.revId;
    const listEl  = document.getElementById(`revFiles_${revId}`);
    const readyBtn = el.querySelector(`.rev-mark-ready-btn[data-rev-id="${revId}"]`);
    let uploadedFileRec = null;

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      input.disabled = true;

      listEl.innerHTML = '<span class="rev-upload-progress">Uploading…</span>';
      try {
        uploadedFileRec = await RevisionService.uploadRevisionFile(
          revId, window._currentOrderId, file, 'admin'
        );
        listEl.innerHTML = `
          <div class="rev-file-chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            ${_esc(file.name)}
            <a href="${uploadedFileRec.file_url}" target="_blank" class="rev-file-link">View</a>
          </div>
        `;
        if (readyBtn) readyBtn.disabled = false;
        window._toast('✓ File upload হয়েছে', 'var(--green)');
        window._logActivity('revision', `Revised file uploaded: ${file.name}`);
      } catch (e) {
        listEl.innerHTML = '<span class="rev-upload-error">Upload failed</span>';
        window._toast('⚠ Upload failed: ' + e.message, 'var(--red)');
        input.disabled = false;
      }
    };

    /* Mark ready for review */
    if (readyBtn) {
      readyBtn.onclick = async () => {
        await _withLoading(readyBtn, async () => {
          await RevisionService.transitionRevision(revId, 'ready_for_review');
          window._toast('✓ Client কে notify করা হয়েছে — Review-এর জন্য ready', 'var(--green)');
          window._logActivity('revision', 'Revision marked ready for client review');
          window._loadRevisions();
        });
      };
    }
  });
}

/* ── Admin transition helper ────────────────────────────────── */
async function _adminTransition(btn, revId, newStatus, el) {
  await _withLoading(btn, async () => {
    await RevisionService.transitionRevision(revId, newStatus);
    const labels = {
      accepted:    '✓ Revision accepted',
      in_progress: '✓ Revision started',
    };
    window._toast(labels[newStatus] || '✓ Updated', 'var(--green)');
    window._logActivity('revision', `Revision status → ${newStatus}`);
    window._loadRevisions();
  });
}

/* ── Helpers ────────────────────────────────────────────────── */
function _esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit',
  });
}

async function _withLoading(btn, fn) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.style.opacity = '0.7';
  try { await fn(); }
  catch (e) {
    console.error('[ODP Revisions]', e);
    window._toast('⚠ Error: ' + (e.message || 'Unknown'), 'var(--red)');
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.innerHTML = orig;
  }
}
