/* ============================================================
   SCRIPTORA — ODP Revisions Tab  (Admin Dashboard/js/odp/odp-revisions.js)
   Admin-side revision management inside Order Details Panel.
   Depends on: order-details-panel.js, revision-service.js
   ============================================================ */
'use strict';

/* ── Live due amount for the currently open order ────────────
   window._currentOrder is a display-transformed object (order-management.js)
   that does NOT carry a raw numeric due_amount/total_price — only
   pre-formatted strings — so reading it directly under-detects due
   amount. Compute the real due straight from the DB, the same way
   the client dashboard does (total_price − sum of confirmed payments). */
window._revLiveDue = 0;
async function _fetchLiveDueAmount(orderId) {
  if (!orderId || !window._sb) return 0;
  try {
    const { data: orderRow } = await window._sb()
      .from('orders')
      .select('total_price')
      .eq('id', orderId)
      .single();
    const total = Number(orderRow?.total_price || 0);

    const { data: pays } = await window._sb()
      .from('payments')
      .select('amount')
      .eq('order_id', orderId)
      .eq('confirmed', true)
      .in('type', ['received', 'approval']);
    const paid = (pays || []).reduce((s, p) => s + Number(p.amount || 0), 0);

    return Math.max(0, total - paid);
  } catch (e) {
    console.warn('[Revisions] live due fetch failed', e);
    return 0;
  }
}

/* ── Realtime: auto-refresh when client acts on a revision ────
   (submits a new request, responds to clarification, approves, etc.)
   so admin sees it live without reopening the tab. */
window._revRealtimeChannel = null;
window._subscribeRevisionsRealtime = function () {
  if (!window._sb() || !window._isRealUUID(window._currentOrderId)) return;
  if (window._revRealtimeChannel) {
    window._sb().removeChannel(window._revRealtimeChannel);
    window._revRealtimeChannel = null;
  }
  window._revRealtimeChannel = window._sb()
    .channel(`odp_rev_${window._currentOrderId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'revisions', filter: `order_id=eq.${window._currentOrderId}` },
      async () => {
        /* Only refresh if the Revisions tab is actually the visible pane —
           avoids wasted work / DOM churn while admin is on another tab. */
        const pane = document.getElementById('odpRevisionPane');
        if (pane) await window._loadRevisions();
      }
    )
    .subscribe();
};

/* ── Load revision tab ─────────────────────────────────────── */
window._loadRevisions = async function () {
  const el = document.getElementById('odpRevisionPane');
  if (!el) return;

  el.innerHTML = '<div class="rev-loading"><span></span> Loading revisions…</div>';

  try {
    const orderId = window._currentOrderId;
    if (!orderId) {
      el.innerHTML = '<div class="rev-error">Order ID পাওয়া যায়নি। Panel আবার খুলুন।</div>';
      return;
    }

    window._revLiveDue = await _fetchLiveDueAmount(orderId);

    const revisions = await RevisionService.getRevisions(orderId);

    if (!revisions.length) {
      const { data: allRevs, error: allErr } = await window._sb()
        .from('revisions')
        .select('id, order_id, revision_number')
        .limit(10);

      const dbIds = (allRevs || []).map(r => r.order_id).join('<br>');
      const errMsg = allErr ? 'DB Error: ' + allErr.message : '';
      el.innerHTML = '<div class="rev-error" style="font-size:12px;line-height:1.8">'
        + '<b>Debug — order_id mismatch check</b><br>'
        + 'Panel order_id: <code style="color:#f97316;word-break:break-all">' + _esc(orderId) + '</code><br><br>'
        + (errMsg ? errMsg + '<br>' : '')
        + 'DB revisions order_id গুলো:<br>'
        + '<code style="color:#22c55e;word-break:break-all">' + (dbIds || '(table খালি বা RLS block)') + '</code>'
        + '</div>';
      return;
    }

    el.innerHTML = _buildFinalDeliverySectionHTML(orderId) + _buildRevisionTabHTML(revisions);
    _bindAdminRevisionActions(el, revisions);
    _bindFinalDeliveryActions(el);
    _loadFinalDeliveryFiles(orderId);

    /* Pre-load existing uploaded files for in_progress revisions */
    for (const rev of revisions) {
      if (rev.status === 'in_progress') {
        _loadExistingRevFiles(rev.id, el);
      }
    }
  } catch (e) {
    el.innerHTML = `<div class="rev-error">Revisions লোড হয়নি: ${_esc(e.message)}</div>`;
  }
};

/* ── Final Delivery — the definitive, post-revision file to the client ──
   Separate from per-revision uploads: this is what client sees as
   "Final Delivery পাঠানো হয়েছে!" and approving it completes the order. */
const FINAL_DELIVERY_PREFIX = 'final_delivery';

function _buildFinalDeliverySectionHTML(orderId) {
  const alreadySent = window._currentOrder?.status === 'delivered' || window._currentOrder?.status === 'completed';
  return `
    <div class="rev-final-delivery-card">
      <div class="rev-final-delivery-header">
        <span class="rev-final-delivery-icon">🚚</span>
        <div>
          <div class="rev-final-delivery-title">Final Delivery</div>
          <div class="rev-final-delivery-sub">Client-এর সব revision দেখে নেওয়ার পর, চূড়ান্ত file এখানে পাঠান — client approve করলে order complete হয়ে যাবে।</div>
        </div>
        ${alreadySent ? `<span class="rev-final-delivery-sent-badge">✓ পাঠানো হয়েছে</span>` : ''}
      </div>
      <div class="rev-upload-zone" id="finalDeliveryZone" onclick="document.getElementById('finalDeliveryInput').click()" style="cursor:pointer;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span>Final file upload করুন</span>
        <input type="file" id="finalDeliveryInput" class="rev-file-input" accept=".pdf,.doc,.docx">
      </div>
      <div class="rev-uploaded-files" id="finalDeliveryFiles"></div>
      <button class="rev-btn rev-btn-accent rev-final-delivery-btn" id="sendFinalDeliveryBtn" disabled>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>
        Send Final Delivery
      </button>
    </div>
  `;
}

async function _loadFinalDeliveryFiles(orderId) {
  const listEl = document.getElementById('finalDeliveryFiles');
  const sendBtn = document.getElementById('sendFinalDeliveryBtn');
  if (!listEl) return;
  try {
    const { data, error } = await window._sb()
      .from('order_file_access')
      .select('*')
      .eq('order_id', orderId)
      .eq('uploaded_by', 'admin')
      .ilike('storage_path', `%/${FINAL_DELIVERY_PREFIX}/%`)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    if (!data || !data.length) { listEl.innerHTML = ''; return; }

    listEl.innerHTML = data.map(f => {
      const name = f.storage_path.split('/').pop();
      return `
      <div class="rev-file-chip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
        ${_esc(name)}
      </div>`;
    }).join('');
    if (sendBtn) sendBtn.disabled = false;
  } catch (e) {
    console.warn('[FinalDelivery] load error', e);
  }
}

function _bindFinalDeliveryActions(orderId) {
  const input   = document.getElementById('finalDeliveryInput');
  const listEl  = document.getElementById('finalDeliveryFiles');
  const sendBtn = document.getElementById('sendFinalDeliveryBtn');
  if (!input) return;

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    input.disabled = true;
    listEl.innerHTML = '<span class="rev-upload-progress">Uploading…</span>';
    try {
      const safeOrderId = (orderId || '').replace(/[#?&=\s]/g, '_');
      const storagePath = `orders/${safeOrderId}/${FINAL_DELIVERY_PREFIX}/${Date.now()}_${file.name}`;

      const { error: upErr } = await window._sb().storage
        .from('order-files')
        .upload(storagePath, file, { upsert: false });
      if (upErr) throw upErr;

      const { error: rowErr } = await window._sb()
        .from('order_file_access')
        .upsert({
          order_id:         orderId,
          storage_path:     storagePath,
          is_visible:       true,
          download_allowed: true,
          uploaded_by:       'admin',
          updated_at:        new Date().toISOString(),
        });
      if (rowErr) throw rowErr;

      window._toast('✓ Final file uploaded', 'var(--green)');
      await _loadFinalDeliveryFiles(orderId);
    } catch (e) {
      console.error('[FinalDelivery] upload error', e);
      listEl.innerHTML = `<span class="rev-upload-error">Upload ব্যর্থ: ${_esc(e.message || '')}</span>`;
      window._toast('⚠ Final file upload ব্যর্থ হয়েছে', 'var(--red)');
    } finally {
      input.disabled = false;
      input.value = '';
    }
  };

  if (sendBtn) {
    sendBtn.onclick = async () => {
      if (!confirm('Final Delivery পাঠাবেন? এটা client-কে notify করবে এবং তাদের approve করার জন্য অপেক্ষা করবে।')) return;
      sendBtn.disabled = true;
      try {
        await window.odpUpdateStatus('delivered');
        if (typeof window._loadRevisions === 'function') await window._loadRevisions();
      } catch (e) {
        console.error('[FinalDelivery] send error', e);
        window._toast('⚠ পাঠানো যায়নি', 'var(--red)');
        sendBtn.disabled = false;
      }
    };
  }
}

/* ── Load already-uploaded files for a revision card ────────── */
async function _loadExistingRevFiles(revId, el) {
  const listEl   = el.querySelector(`#revFiles_${revId}`);
  const readyBtn = el.querySelector(`.rev-mark-ready-btn[data-rev-id="${revId}"]`);
  if (!listEl) return;

  try {
    const files = await RevisionService.getRevisionFiles(revId);
    if (!files.length) return;

    listEl.innerHTML = files.map(f => {
      const dlOk = f.download_allowed !== false;
      return `
      <div class="rev-file-chip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
        ${_esc(f.file_name)}
        <a href="${_esc(f.file_url)}" target="_blank" class="rev-file-link">View</a>
        <button type="button" class="rev-file-dl-toggle" data-dl="${dlOk ? '1' : '0'}"
          title="${dlOk ? 'Client download allowed — click to lock' : 'Client download locked — click to unlock'}"
          onclick="odpToggleRevFileDownload('${f.id}', this)">${dlOk ? '🔓' : '🔒'}</button>
      </div>
    `;
    }).join('');

    /* Enable ready button since file already exists */
    if (readyBtn) readyBtn.disabled = false;
  } catch (e) {
    console.warn('[ODP Revisions] existing files load error', e);
  }
}

/* ── Toggle lock/unlock on an already-uploaded revision file ──── */
window.odpToggleRevFileDownload = async function (fileId, btn) {
  const nowAllowed = btn.dataset.dl !== '1';
  const prevHTML = btn.innerHTML;
  btn.disabled = true;
  try {
    const { error } = await window._sb()
      .from('revision_files')
      .update({ download_allowed: nowAllowed })
      .eq('id', fileId);
    if (error) throw error;

    btn.dataset.dl = nowAllowed ? '1' : '0';
    btn.title = nowAllowed ? 'Client download allowed — click to lock' : 'Client download locked — click to unlock';
    btn.innerHTML = nowAllowed ? '🔓' : '🔒';
    window._toast(nowAllowed ? '✓ Client-এর জন্য Unlocked' : '✓ Client-এর জন্য Locked', 'var(--green)');
  } catch (e) {
    console.error('[ODP Revisions] toggle download error', e);
    btn.innerHTML = prevHTML;
    window._toast('⚠ Toggle failed: ' + (e.message || ''), 'var(--red)');
  } finally {
    btn.disabled = false;
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

  const active   = revisions.filter(r => r.status !== 'approved' && r.status !== 'superseded');
  const done     = revisions.filter(r => r.status === 'approved' || r.status === 'superseded');

  const queueHTML = active.length
    ? `<div class="rev-section-title">Active Revisions (${active.length})</div>
       ${active.reverse().map(r => _buildRevCard(r, false)).join('')}`
    : '';

  const histHTML = done.length
    ? `<div class="rev-section-title rev-section-sep">Completed Revisions (${done.length})</div>
       ${done.reverse().map(r => _buildRevCard(r, true)).join('')}`
    : '';

  const finalDeliveryHTML = _buildFinalDeliverySection(revisions);

  return `<div class="rev-tab-root">${finalDeliveryHTML}${queueHTML}${histHTML}</div>`;
}

/* ── Final Delivery section ─────────────────────────────────────
   Shows once at least one revision is approved and none are still
   active — i.e. the client has signed off on all requested changes
   and admin can now send the definitive final file. Uploading here
   uses the same order_file_access mechanism as the normal Files tab
   (so it shows in My Files automatically) but sets order.status to
   'delivered' instead of 'draft_ready', which is what unlocks the
   "Delivery" step on the client's Progress Status stepper. */
function _buildFinalDeliverySection(revisions) {
  const order = window._currentOrder;
  if (!order) return '';

  const hasApproved = revisions.some(r => r.status === 'approved');
  const hasActive   = revisions.some(r => !['approved', 'superseded'].includes(r.status));
  const alreadySent = ['delivered', 'completed'].includes(order.status);

  if (!hasApproved || hasActive) return '';

  if (alreadySent) {
    return `
      <div class="rev-final-delivery rev-final-delivery-sent">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Final Delivery ${order.status === 'completed' ? 'client Approve করেছেন — Order Completed' : 'পাঠানো হয়েছে — Client review করছেন…'}
      </div>
    `;
  }

  return `
    <div class="rev-final-delivery">
      <div class="rev-final-delivery-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        সব Revision approved — Final Delivery পাঠান
      </div>
      <div class="rev-final-delivery-sub">Client সব revision approve করেছেন। এখন চূড়ান্ত file upload করে Final Delivery পাঠান — client approve করলে Order Completed হয়ে যাবে।</div>
      <div class="rev-upload-zone" data-final="1" onclick="document.getElementById('revFinalFileInput').click()" style="cursor:pointer;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span>Final file upload করুন</span>
        <input type="file" id="revFinalFileInput" accept=".pdf,.doc,.docx">
      </div>
      <div class="rev-uploaded-files" id="revFinalFileChip"></div>
      <button class="rev-btn rev-btn-accent" id="revSendFinalBtn" disabled style="width:100%;justify-content:center;margin-top:8px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>
        Send Final Delivery
      </button>
    </div>
  `;
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
          <div class="rev-upload-zone" data-rev-id="${rev.id}" onclick="document.getElementById('revFileInput_${rev.id}').click()" style="cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Revised file upload করুন</span>
            <input type="file" id="revFileInput_${rev.id}" class="rev-file-input" data-rev-id="${rev.id}" accept=".pdf,.doc,.docx">
          </div>
          <label class="rev-dl-toggle-row" title="Due amount থাকলে default lock থাকবে, due 0 হলে default unlock — চাইলে এখানে override করুন">
            <input type="checkbox" id="revDlAllowed_${rev.id}" ${(window._revLiveDue <= 0) ? 'checked' : ''}>
            <span>Client-কে এখনই download করতে দিন (Unlock)</span>
          </label>
          <div class="rev-uploaded-files" id="revFiles_${rev.id}"></div>
          <button class="rev-btn rev-btn-accent rev-mark-ready-btn" data-rev-id="${rev.id}" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Mark Ready for Review
          </button>
        </div>
      ` : ''}

      <!-- Show uploaded files for completed/other statuses -->
      ${rev.status !== 'in_progress' && !isCompleted ? `
        <div class="rev-uploaded-files" id="revFiles_${rev.id}"></div>
      ` : ''}
      ${isCompleted ? `
        <div class="rev-uploaded-files" id="revFiles_${rev.id}"></div>
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

      <!-- Admin message form (for ready_for_review) -->
      ${rev.status === 'ready_for_review' ? `
        <div class="rev-note-form" id="revAdminMsgForm_${rev.id}" style="display:none;margin-top:8px;">
          <textarea class="rev-clarify-input" id="revAdminMsgText_${rev.id}" placeholder="Client কে কী message পাঠাতে চান?…"></textarea>
          <div class="rev-clarify-btns">
            <button class="rev-btn rev-btn-ghost" id="revAdminMsgCancel_${rev.id}">বাতিল</button>
            <button class="rev-btn rev-btn-accent" id="revAdminMsgSend_${rev.id}" data-rev-id="${rev.id}">Message পাঠান</button>
          </div>
        </div>
      ` : ''}
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
    <button class="rev-btn rev-btn-ghost rev-note-btn" data-rev-id="${rev.id}" style="margin-top:8px">+ Internal Note</button>
    <button class="rev-btn rev-btn-accent rev-admin-msg-btn" data-rev-id="${rev.id}" style="margin-top:8px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Client কে Message পাঠান
    </button>
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
/* ── Bind Final Delivery upload + send ──────────────────────── */
let _finalDeliveryFile = null;

function _bindFinalDeliveryActions(el) {
  const input   = el.querySelector('#revFinalFileInput');
  const chipEl  = el.querySelector('#revFinalFileChip');
  const sendBtn = el.querySelector('#revSendFinalBtn');
  if (!input || !sendBtn) return;

  _finalDeliveryFile = null;

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    _finalDeliveryFile = file;
    if (chipEl) {
      chipEl.innerHTML = `
        <div class="rev-file-chip">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          ${_esc(file.name)}
        </div>
      `;
    }
    sendBtn.disabled = false;
  };

  sendBtn.onclick = async () => {
    if (!_finalDeliveryFile) return;
    if (!confirm('Final Delivery পাঠাবেন? এর পর client approve করলেই Order Completed হয়ে যাবে।')) return;

    const orderId = window._currentOrderId;
    const orig = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="rev-upload-progress">পাঠানো হচ্ছে…</span>';

    try {
      const safeOrderId = (orderId || 'unknown').replace(/[#?&=\s]/g, '_');
      const safeName    = _finalDeliveryFile.name.replace(/[#?&=]/g, '_');
      const path         = `orders/${safeOrderId}/final_${Date.now()}_${safeName}`;

      const { error: upErr } = await window._sb().storage
        .from('order-files')
        .upload(path, _finalDeliveryFile, { upsert: true });
      if (upErr) throw upErr;

      const dlAllowed = window._revLiveDue <= 0;
      const { error: metaErr } = await window._sb()
        .from('order_file_access')
        .upsert({
          order_id:         orderId,
          storage_path:     path,
          is_visible:       true,
          download_allowed: dlAllowed,
          client_notified:  true,
          uploaded_by:      'Admin',
          updated_at:       new Date().toISOString(),
        }, { onConflict: 'order_id,storage_path' });
      if (metaErr) throw metaErr;

      const { error: statusErr } = await window._sb()
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);
      if (statusErr) throw statusErr;
      if (window._currentOrder) window._currentOrder.status = 'delivered';

      await window._sb().from('messages').insert({
        order_id:   orderId,
        text:       `📦 Final Delivery পাঠানো হয়েছে: ${_finalDeliveryFile.name}`,
        from_admin: true,
        read:       false,
        sent_at:    new Date().toISOString(),
      });

      window._toast('✅ Final Delivery পাঠানো হয়েছে!', 'var(--green)');
      _finalDeliveryFile = null;
      await window._loadRevisions();
      if (typeof window._loadFiles === 'function') await window._loadFiles();
    } catch (e) {
      console.error('[Final Delivery] send error', e);
      window._toast('⚠ পাঠানো যায়নি: ' + (e.message || ''), 'var(--red)');
      sendBtn.disabled = false;
      sendBtn.innerHTML = orig;
    }
  };
}

/* ── Bind admin revision card actions ───────────────────────── */
function _bindAdminRevisionActions(el, revisions) {
  const revMap = {};
  revisions.forEach(r => revMap[r.id] = r);

  _bindFinalDeliveryActions(el);

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

  /* ── File upload for in_progress revisions ────────────────── */
  el.querySelectorAll('.rev-file-input').forEach(input => {
    const revId    = input.dataset.revId;
    const listEl   = document.getElementById(`revFiles_${revId}`);
    const readyBtn = el.querySelector(`.rev-mark-ready-btn[data-rev-id="${revId}"]`);

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      input.disabled = true;

      const dlToggle = document.getElementById(`revDlAllowed_${revId}`);
      const downloadAllowed = dlToggle ? dlToggle.checked : (window._revLiveDue <= 0);

      listEl.innerHTML = '<span class="rev-upload-progress">Uploading…</span>';
      try {
        const rec = await RevisionService.uploadRevisionFile(
          revId, window._currentOrderId, file, 'admin', downloadAllowed
        );
        listEl.innerHTML = `
          <div class="rev-file-chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
            ${_esc(file.name)}
            <a href="${_esc(rec.file_url)}" target="_blank" class="rev-file-link">View</a>
            <button type="button" class="rev-file-dl-toggle" data-dl="${downloadAllowed ? '1' : '0'}"
              title="${downloadAllowed ? 'Client download allowed — click to lock' : 'Client download locked — click to unlock'}"
              onclick="odpToggleRevFileDownload('${rec.id}', this)">${downloadAllowed ? '🔓' : '🔒'}</button>
          </div>
        `;
        if (readyBtn) readyBtn.disabled = false;
        if (dlToggle) dlToggle.disabled = true;
        window._toast('✓ File upload হয়েছে', 'var(--green)');
        window._logActivity('revision', `Revised file uploaded: ${file.name}`);

        /* Refresh admin files tab if visible */
        if (typeof window._loadFiles === 'function') window._loadFiles();
      } catch (e) {
        listEl.innerHTML = '<span class="rev-upload-error">Upload failed: ' + _esc(e.message) + '</span>';
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

  /* ── Admin message button (ready_for_review state) ────────── */
  el.querySelectorAll('.rev-admin-msg-btn').forEach(btn => {
    btn.onclick = () => {
      const form = document.getElementById(`revAdminMsgForm_${btn.dataset.revId}`);
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };
  });

  /* Send admin message */
  el.querySelectorAll('[id^="revAdminMsgSend_"]').forEach(btn => {
    btn.onclick = async () => {
      const revId = btn.dataset.revId;
      const text  = document.getElementById(`revAdminMsgText_${revId}`)?.value.trim();
      if (!text) { window._toast('Message লিখুন', 'var(--red)'); return; }
      await _withLoading(btn, async () => {
        /* Insert into messages table so client sees it in chat */
        await window._sb().from('messages').insert({
          order_id:   window._currentOrderId,
          text:       text,
          from_admin: true,
          read:       false,
          sent_at:    new Date().toISOString(),
        });
        /* Also save as admin_response on revision */
        await window._sb().from('revisions')
          .update({ admin_response: text })
          .eq('id', revId);
        /* Notify client */
        const rev = revisions.find(r => r.id === revId) || {};
        if (window._isRealUUID(window._currentOrderId)) {
          await window._sb().from('client_notifications').insert({
            order_id:   window._currentOrderId,
            client_id:  rev.client_id || null,
            type:       'revision_message',
            message:    `💬 Admin message (Revision #${rev.revision_number || ''}): ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`,
            is_read:    false,
            created_at: new Date().toISOString(),
          });
        }
        window._toast('✓ Message পাঠানো হয়েছে', 'var(--green)');
        const form = document.getElementById(`revAdminMsgForm_${revId}`);
        if (form) { form.style.display = 'none'; }
        const ta = document.getElementById(`revAdminMsgText_${revId}`);
        if (ta) ta.value = '';
        window._loadRevisions();
      });
    };
  });

  /* Admin message cancel */
  el.querySelectorAll('[id^="revAdminMsgCancel_"]').forEach(btn => {
    btn.onclick = () => {
      const id   = btn.id.replace('revAdminMsgCancel_', '');
      const form = document.getElementById(`revAdminMsgForm_${id}`);
      if (form) form.style.display = 'none';
    };
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
