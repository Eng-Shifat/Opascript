/* ============================================================
   SCRIPTORA — Client Revision Center  (Client Dashboard/js/revision-center.js)
   Renders the Revision Center inside an order detail panel.
   Depends on: revision-service.js, dashboard.js (sb, showToast)
   ============================================================ */
'use strict';

/* ── Entry point: call this after openOrderDetail() renders ── */
window.initRevisionCenter = async function (order) {
  const wrap = document.getElementById('revisionCenterWrap');
  if (!wrap) return;

  /* Only show for orders that are past payment stage */
  const showableStatuses = [
    'writing', 'draft_sent', 'draft_ready', 'in_review',
    'revision', 'completed',
  ];
  if (!showableStatuses.includes(order.status)) {
    wrap.innerHTML = '';
    return;
  }

  wrap.innerHTML = '<div class="rc-loading"><span class="rc-spinner"></span> Loading revision info…</div>';

  try {
    const revisions = await RevisionService.getRevisions(order.id);
    renderRevisionCenter(wrap, order, revisions);
  } catch (e) {
    console.error('[RevisionCenter] load error', e);
    wrap.innerHTML = '<div class="rc-error">Revision info লোড হয়নি। Refresh করুন।</div>';
  }
};

/* ── Main renderer ──────────────────────────────────────────── */
function renderRevisionCenter(wrap, order, revisions) {
  const active = revisions.filter(r =>
    !['approved'].includes(r.status)
  );
  const activeRev = active[active.length - 1] || null;
  const approved  = revisions.filter(r => r.status === 'approved');

  wrap.innerHTML = `
    <div class="rc-root">
      <div class="rc-header">
        <div class="rc-header-left">
          <span class="rc-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2H3v16h5l3 3 3-3h7V2z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></span>
          <span class="rc-title">Revision Center</span>
        </div>
        <div class="rc-header-right">
          ${revisions.length > 0
            ? `<span class="rc-count-badge">${revisions.length} Revision${revisions.length > 1 ? 's' : ''}</span>`
            : ''}
          ${approved.length > 0
            ? `<span class="rc-approved-badge">✓ ${approved.length} Approved</span>`
            : ''}
        </div>
      </div>

      ${activeRev ? renderActiveRevision(activeRev, order) : renderNoActiveRevision(order)}
    </div>
  `;

  /* Bind action buttons */
  _bindClientActions(wrap, order, activeRev, revisions);

  /* Load files for all non-approved revisions */
  for (const rev of revisions) {
    _loadClientRevisionFiles(rev.id);
  }
}

/* ── Active revision card ───────────────────────────────────── */
function renderActiveRevision(rev, order) {
  const SL = RevisionService.STATUS_LABEL;
  const SC = RevisionService.STATUS_CLASS;

  const steps = [
    { key: 'requested',        label: 'Revision Requested' },
    { key: 'accepted',         label: 'Request Accepted' },
    { key: 'in_progress',      label: 'Revision In Progress' },
    { key: 'ready_for_review', label: 'Ready for Your Review' },
    { key: 'approved',         label: 'Approved' },
  ];

  const statusOrder = steps.map(s => s.key);
  const currentIdx  = statusOrder.indexOf(
    rev.status === 'needs_clarification' ? 'requested' : rev.status
  );

  const stepHTML = steps.map((s, i) => {
    const done    = i < currentIdx;
    const current = i === currentIdx;
    const cls     = done ? 'rc-step-done' : current ? 'rc-step-current' : 'rc-step-pending';
    return `
      <div class="rc-step ${cls}">
        <div class="rc-step-dot">
          ${done ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </div>
        <div class="rc-step-label">${_esc(s.label)}</div>
        ${i < steps.length - 1 ? '<div class="rc-step-line"></div>' : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="rc-active-card">
      <div class="rc-active-header">
        <div class="rc-rev-num">Revision #${rev.revision_number}</div>
        <span class="rc-status-badge ${SC[rev.status] || ''}">${_esc(SL[rev.status] || rev.status)}</span>
      </div>

      ${rev.status === 'needs_clarification' ? `
        <div class="rc-clarify-banner">
          <span>❓</span>
          <div>
            <div class="rc-clarify-title">Additional Information Needed</div>
            ${rev.admin_response ? `<div class="rc-clarify-text">${_esc(rev.admin_response)}</div>` : ''}
          </div>
        </div>
      ` : ''}

      <div class="rc-stepper">${stepHTML}</div>

      <div class="rc-detail-grid">
        ${rev.section ? `
          <div class="rc-detail-item">
            <div class="rc-detail-label">Section / Chapter</div>
            <div class="rc-detail-val">${_esc(rev.section)}</div>
          </div>` : ''}
        ${rev.page_range ? `
          <div class="rc-detail-item">
            <div class="rc-detail-label">Page Range</div>
            <div class="rc-detail-val">${_esc(rev.page_range)}</div>
          </div>` : ''}
        <div class="rc-detail-item rc-detail-full">
          <div class="rc-detail-label">Revision Description</div>
          <div class="rc-detail-val rc-detail-desc">${_esc(rev.description)}</div>
        </div>
        ${rev.additional_note ? `
          <div class="rc-detail-item rc-detail-full">
            <div class="rc-detail-label">Additional Note</div>
            <div class="rc-detail-val">${_esc(rev.additional_note)}</div>
          </div>` : ''}
        <div class="rc-detail-item">
          <div class="rc-detail-label">Submitted</div>
          <div class="rc-detail-val">${_fmtDate(rev.created_at)}</div>
        </div>
        ${rev.admin_response && rev.status !== 'needs_clarification' ? `
          <div class="rc-detail-item rc-detail-full">
            <div class="rc-detail-label">Admin Response</div>
            <div class="rc-detail-val">${_esc(rev.admin_response)}</div>
          </div>` : ''}
      </div>

      <!-- Revision Files (admin uploaded) -->
      <div class="rc-files-section" id="rcRevFiles_${rev.id}">
        <div class="rc-files-loading" style="font-size:11px;color:var(--muted,#64748b);padding:6px 0">Loading files…</div>
      </div>

      <div class="rc-actions" id="rcActionWrap" data-rev-id="${rev.id}" data-order-id="${order.id}" data-status="${rev.status}">
        ${_buildClientActions(rev, order)}
      </div>
    </div>
  `;
}

/* ── No active revision ─────────────────────────────────────── */
function renderNoActiveRevision(order) {
  const canRequest = ['draft_ready', 'writing', 'draft_sent', 'in_review', 'revision', 'completed'].includes(order.status);
  return `
    <div class="rc-empty">
      <div class="rc-empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></div>
      <div class="rc-empty-title">কোনো active revision নেই</div>
      <div class="rc-empty-sub">Delivered draft review করার পর revision request করতে পারবেন।</div>
      ${canRequest ? `<button class="rc-btn rc-btn-primary" id="rcOpenFormBtn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Revision Request করুন
      </button>` : ''}
    </div>
  `;
}

/* ── Build contextual action buttons ───────────────────────── */
function _buildClientActions(rev, order) {
  const s = rev.status;

  if (s === 'ready_for_review') {
    return `
      <div class="rc-ready-banner">
        <div class="rc-ready-banner-top">
          <span class="rc-ready-banner-icon">🔁</span>
          <div>
            <div class="rc-ready-banner-title">Revision ফাইল পাঠানো হয়েছে!</div>
            <div class="rc-ready-banner-sub">ফাইলগুলো দেখুন (উপরে ও My Files-এ) এবং আপনার সিদ্ধান্ত জানান।</div>
          </div>
        </div>
        <div class="rc-ready-banner-btns">
          <button class="rc-btn rc-btn-success" id="rcApproveBtn" data-rev-id="${rev.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            সব ঠিক আছে, Approve করুন
          </button>
          <button class="rc-btn rc-btn-warn-outline" id="rcAnotherRevBtn" data-rev-id="${rev.id}" data-order-id="${order.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            সমস্যা আছে, আরেকটি Revision চাই
          </button>
        </div>
      </div>
    `;
  }

  if (s === 'approved') {
    return `<div class="rc-approved-msg">✓ Revision সম্পন্ন হয়েছে</div>`;
  }

  if (['requested', 'accepted', 'in_progress', 'needs_clarification'].includes(s)) {
    return `<div class="rc-waiting-msg">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      Admin কাজ করছেন…
    </div>`;
  }

  return '';
}

/* ── Bind event listeners ──────────────────────────────────── */
function _bindClientActions(wrap, order, activeRev, revisions) {
  /* Request Revision button (from empty state or no-active) */
  const openFormBtn = wrap.querySelector('#rcOpenFormBtn');
  if (openFormBtn) openFormBtn.onclick = () => openRevisionModal(order.id);

  /* Also check for "Request Revision" button inside delivery banner replacement */
  const drRevBtn = document.getElementById('drBtnProblem');
  if (drRevBtn) {
    drRevBtn.onclick = () => openRevisionModal(order.id);
  }

  if (!activeRev) return;

  /* Approve */
  const approveBtn = wrap.querySelector('#rcApproveBtn');
  if (approveBtn) {
    approveBtn.onclick = async () => {
      if (!confirm('Revision approve করবেন?')) return;
      await _withLoading(approveBtn, async () => {
        await RevisionService.transitionRevision(activeRev.id, 'approved');
        showToast('✅ Revision approved!', 'success');
        await window.initRevisionCenter(order);
      });
    };
  }

  /* Request Another Revision */
  const anotherBtn = wrap.querySelector('#rcAnotherRevBtn');
  if (anotherBtn) {
    anotherBtn.onclick = () => openRevisionModal(order.id);
  }
}

/* ── Revision Request Modal ────────────────────────────────── */
window.openRevisionModal = function (orderId) {
  /* Remove any stale modal */
  document.getElementById('rcModal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'rcModal';
  modal.className = 'rc-modal-backdrop';
  modal.innerHTML = `
    <div class="rc-modal">
      <div class="rc-modal-header">
        <div class="rc-modal-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2H3v16h5l3 3 3-3h7V2z"/></svg>
          Revision Request
        </div>
        <button class="rc-modal-close" id="rcModalClose">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="rc-modal-body">
        <div class="rc-field">
          <label class="rc-label">কী পরিবর্তন করতে হবে? <span class="rc-required">*</span></label>
          <textarea id="rcDesc" class="rc-textarea" placeholder="বিস্তারিত লিখুন — কোন অংশে কী সমস্যা আছে..." rows="4"></textarea>
          <div class="rc-field-err" id="rcDescErr"></div>
        </div>
        <div class="rc-field-row">
          <div class="rc-field">
            <label class="rc-label">Section / Chapter</label>
            <input id="rcSection" class="rc-input" type="text" placeholder="যেমন: Chapter 3, Methodology...">
          </div>
          <div class="rc-field">
            <label class="rc-label">Page Range</label>
            <input id="rcPageRange" class="rc-input" type="text" placeholder="যেমন: 18–24">
          </div>
        </div>
        <div class="rc-field">
          <label class="rc-label">Additional Note</label>
          <textarea id="rcNote" class="rc-textarea rc-textarea-sm" placeholder="যেকোনো অতিরিক্ত তথ্য..." rows="2"></textarea>
        </div>
        <div class="rc-field">
          <label class="rc-label">Reference File (Optional)</label>
          <div class="rc-upload-zone" id="rcUploadZone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>ফাইল drag করুন বা <label for="rcFileInput" class="rc-upload-link">browse করুন</label></span>
            <input id="rcFileInput" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display:none">
          </div>
          <div class="rc-file-list" id="rcFileList"></div>
        </div>
      </div>
      <div class="rc-modal-footer">
        <button class="rc-btn rc-btn-ghost" id="rcModalCancelBtn">বাতিল</button>
        <button class="rc-btn rc-btn-primary" id="rcSubmitBtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Submit Revision Request
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  /* File input handler */
  const fileInput = modal.querySelector('#rcFileInput');
  const fileList  = modal.querySelector('#rcFileList');
  let selectedFiles = [];

  function updateFileList() {
    fileList.innerHTML = selectedFiles.map((f, i) => `
      <div class="rc-file-item">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>${_esc(f.name)}</span>
        <button class="rc-file-remove" data-idx="${i}">×</button>
      </div>
    `).join('');
    fileList.querySelectorAll('.rc-file-remove').forEach(btn => {
      btn.onclick = () => {
        selectedFiles.splice(parseInt(btn.dataset.idx), 1);
        updateFileList();
      };
    });
  }

  fileInput.onchange = () => {
    selectedFiles = [...selectedFiles, ...Array.from(fileInput.files)];
    updateFileList();
    fileInput.value = '';
  };

  /* Drag and drop */
  const uploadZone = modal.querySelector('#rcUploadZone');
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    selectedFiles = [...selectedFiles, ...Array.from(e.dataTransfer.files)];
    updateFileList();
  });

  /* Close handlers */
  const closeModal = () => modal.remove();
  modal.querySelector('#rcModalClose').onclick     = closeModal;
  modal.querySelector('#rcModalCancelBtn').onclick = closeModal;
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  /* Submit */
  modal.querySelector('#rcSubmitBtn').onclick = async () => {
    const desc    = modal.querySelector('#rcDesc').value.trim();
    const descErr = modal.querySelector('#rcDescErr');

    if (!desc) {
      descErr.textContent = 'এই field টি required।';
      modal.querySelector('#rcDesc').focus();
      return;
    }
    descErr.textContent = '';

    const submitBtn = modal.querySelector('#rcSubmitBtn');
    await _withLoading(submitBtn, async () => {
      const user = (await window.scriptoraSupabase.auth.getUser()).data.user;

      const rev = await RevisionService.submitRevision(orderId, user.id, {
        description:     desc,
        section:         modal.querySelector('#rcSection').value.trim(),
        page_range:      modal.querySelector('#rcPageRange').value.trim(),
        additional_note: modal.querySelector('#rcNote').value.trim(),
      });

      /* Upload attachments */
      for (const file of selectedFiles) {
        try {
          await RevisionService.uploadRevisionFile(rev.id, orderId, file, 'client');
        } catch (e) {
          console.warn('File upload failed:', e);
        }
      }

      closeModal();
      showToast('✅ Revision Request পাঠানো হয়েছে!', 'success');

      /* Refresh the order detail */
      const o = allOrders.find(x => String(x.id) === String(orderId));
      if (o) await window.initRevisionCenter(o);
    });
  };
};

/* ── Load & render revision files for client ────────────────── */
async function _loadClientRevisionFiles(revisionId) {
  const el = document.getElementById('rcRevFiles_' + revisionId);
  if (!el) return;

  try {
    /* Fetch files from revision_files table */
    const { data: files, error } = await window.scriptoraSupabase
      .from('revision_files')
      .select('*')
      .eq('revision_id', revisionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    /* Show admin-uploaded files (is_client_visible not explicitly false) */
    const visible = (files || []).filter(function(f) {
      return f.uploaded_by === 'admin' && f.is_client_visible !== false;
    });

    if (!visible.length) {
      el.innerHTML = '';
      return;
    }

    /* Generate fresh signed URLs for each file (1-hour validity) */
    const rows = await Promise.all(visible.map(async function(f) {
      const ext   = (f.file_name || '').split('.').pop().toLowerCase();
      const icon  = ext === 'pdf' ? '📄' : (ext === 'docx' || ext === 'doc') ? '📝' : '📎';
      const dlOk  = f.download_allowed !== false;

      let viewUrl = f.file_url || '';
      /* If storage_path exists, get a fresh signed URL so it always works */
      if (f.storage_path) {
        try {
          viewUrl = await RevisionService.getRevisionFileUrl(f.storage_path, 3600);
        } catch(e) {
          console.warn('[RevisionCenter] sign url failed, falling back', e);
        }
      }

      const escapedUrl  = viewUrl.replace(/"/g, '&quot;');
      const escapedName = (f.file_name || 'file').replace(/"/g, '&quot;');

      return '<div class="rc-file-row">'
        + '<span class="rc-file-icon">' + icon + '</span>'
        + '<span class="rc-file-name">' + _esc(f.file_name || 'file') + '</span>'
        + '<div class="rc-file-actions">'
        + '<a href="' + escapedUrl + '" target="_blank" class="rc-file-btn rc-file-view">'
        + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
        + ' View</a>'
        + (dlOk
          ? '<a href="' + escapedUrl + '" download="' + escapedName + '" class="rc-file-btn rc-file-dl">'
            + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
            + ' Download</a>'
          : '<span class="rc-file-locked">🔒 Locked</span>')
        + '</div></div>';
    }));

    el.innerHTML = '<div class="rc-files-title">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>'
      + ' Revised File' + (visible.length > 1 ? 's' : '') + '</div>'
      + '<div class="rc-files-list">' + rows.join('') + '</div>';

  } catch (e) {
    console.warn('[RevisionCenter] file load error', e);
    el.innerHTML = '';
  }
}

/* ── Helpers ────────────────────────────────────────────────── */
function _esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

async function _withLoading(btn, fn) {
  const orig = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="rc-spin">⟳</span> Loading…';
  try { await fn(); }
  catch (e) {
    console.error('[RevisionCenter]', e);
    showToast('Error: ' + (e.message || 'কিছু একটা ভুল হয়েছে'), 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

/* ============================================================
   STANDALONE REVISION HISTORY CARD  (mirrors Payment History card)
   Renders into #clientRevHistoryCard / #clientRevHistoryList
   Call window.renderClientRevisionHistory(orderId) after order load.
   ============================================================ */
let _revHistAllData  = [];
let _revHistFilter   = 'all';
let _revHistExpanded = false;
const REV_HIST_COLLAPSED_COUNT = 3;

const _REV_HIST_META = {
  requested:           { color: '#fbbf24', icon: 'hourglass' },
  accepted:            { color: '#818cf8', icon: 'hourglass' },
  in_progress:         { color: '#60a5fa', icon: 'hourglass' },
  ready_for_review:    { color: '#34d399', icon: 'check' },
  approved:            { color: '#4ade80', icon: 'check' },
  needs_clarification: { color: '#f87171', icon: 'x' },
};

function _revHistIconSvg(icon, color) {
  if (icon === 'check') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><circle cx="12" cy="12" r="10" fill="${color}22"/><polyline points="8 12 11 15 16 9"/></svg>`;
  }
  if (icon === 'x') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><circle cx="12" cy="12" r="10" fill="${color}22"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>`;
  }
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="10" fill="${color}22"/><path d="M8 7h8M8 17h8M9 7c0 3 3 3.5 3 5s-3 2-3 5M15 7c0-3-3-3.5-3-5"/></svg>`;
}

window.renderClientRevisionHistory = async function (orderId) {
  const wrap = document.getElementById('clientRevHistoryList');
  const card = document.getElementById('clientRevHistoryCard');
  if (!wrap || !card) return;

  wrap.innerHTML = '<div class="rev-hist-loading">লোড হচ্ছে...</div>';
  _revHistExpanded = false;
  _revHistFilter   = 'all';
  const filterSel = document.getElementById('revHistFilterSelect');
  if (filterSel) filterSel.value = 'all';

  try {
    const revisions = await RevisionService.getRevisions(orderId);
    if (!revisions.length) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'block';
    /* newest first, like payment history */
    _revHistAllData = [...revisions].reverse();
    _drawRevHistList();
  } catch (e) {
    console.error('[RevisionHistoryCard] load error', e);
    card.style.display = 'block';
    wrap.innerHTML = '<div class="rev-hist-empty">Revision history লোড করতে সমস্যা হয়েছে।</div>';
  }
};

function _drawRevHistList() {
  const wrap = document.getElementById('clientRevHistoryList');
  if (!wrap) return;

  const SL = RevisionService.STATUS_LABEL;

  let list = _revHistAllData;
  if (_revHistFilter !== 'all') {
    list = list.filter(r => r.status === _revHistFilter);
  }

  if (!list.length) {
    wrap.innerHTML = `<div class="rev-hist-empty">${_revHistFilter === 'all' ? 'এখনো কোনো revision request করা হয়নি।' : 'এই status এ কোনো revision নেই।'}</div>`;
    _updateRevHistViewAllLink(0, 0);
    return;
  }

  const visibleList = _revHistExpanded ? list : list.slice(0, REV_HIST_COLLAPSED_COUNT);

  wrap.innerHTML = visibleList.map(r => {
    const meta = _REV_HIST_META[r.status] || { color: '#9ca3af', icon: 'hourglass' };
    const dateStr = _fmtDate(r.created_at);

    return `
      <div class="rev-hist-card">
        <div class="rev-hist-icon-circle" style="background:${meta.color}18;border-color:${meta.color}30">
          ${_revHistIconSvg(meta.icon, meta.color)}
        </div>
        <div class="rev-hist-card-body">
          <div class="rev-hist-card-top">
            <span class="rev-hist-card-title">Revision #${r.revision_number}</span>
          </div>
          <div class="rev-hist-card-meta">
            <span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${dateStr}</span>
          </div>
          <div class="rev-hist-card-desc" title="${_esc(r.description || '')}">${_esc(r.description || '—')}</div>
        </div>
        <div class="rev-hist-card-right">
          <span class="rev-hist-card-badge" style="color:${meta.color};border-color:${meta.color}44;background:${meta.color}12">
            ${_esc(SL[r.status] || r.status)}
          </span>
          <button class="rev-hist-view-btn" onclick="_openRevHistDetail(${r.revision_number})">বিস্তারিত</button>
        </div>
      </div>`;
  }).join('');

  _updateRevHistViewAllLink(list.length, visibleList.length);
}

function _updateRevHistViewAllLink(totalCount, shownCount) {
  const linkWrap = document.getElementById('clientRevHistoryViewAll');
  if (!linkWrap) return;

  if (totalCount <= REV_HIST_COLLAPSED_COUNT) {
    linkWrap.style.display = 'none';
    return;
  }

  linkWrap.style.display = 'block';
  linkWrap.innerHTML = _revHistExpanded
    ? `<button class="rev-hist-viewall-btn" onclick="_toggleRevHistExpand()">কম দেখান ↑</button>`
    : `<button class="rev-hist-viewall-btn" onclick="_toggleRevHistExpand()">সব Revision দেখুন (${totalCount}) →</button>`;
}

window._toggleRevHistExpand = function () {
  _revHistExpanded = !_revHistExpanded;
  _drawRevHistList();
};

window._setRevHistFilter = function (val) {
  _revHistFilter   = val;
  _revHistExpanded = false;
  _drawRevHistList();
};

/* Scroll the existing Revision Center into view as the "detail" action —
   keeps a single source of truth for full revision detail instead of
   duplicating the whole active-card markup here. */
window._openRevHistDetail = function (revisionNumber) {
  const el = document.getElementById('revisionCenterWrap');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
