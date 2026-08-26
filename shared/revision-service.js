/* ============================================================
   SCRIPTORA — Revision Service  (shared/revision-service.js)
   Central DB layer for all revision operations.
   Used by: Client Dashboard, Admin ODP
   Depends on: window.scriptoraSupabase
   ============================================================ */
'use strict';

(function () {

  function sb() {
    const s = window.scriptoraSupabase;
    if (!s) throw new Error('[RevisionService] Supabase not initialised');
    return s;
  }

  /* ── State machine: valid transitions ─────────────────────── */
  const VALID_TRANSITIONS = {
    requested:           ['accepted', 'needs_clarification'],
    accepted:            ['in_progress'],
    in_progress:         ['ready_for_review'],
    ready_for_review:    ['approved', 'requested'],   // "requested" = client requests another
    needs_clarification: ['requested'],
    approved:            [],
  };

  function canTransition(from, to) {
    return (VALID_TRANSITIONS[from] || []).includes(to);
  }

  /* ── STATUS LABELS (client-facing) ───────────────────────── */
  const STATUS_LABEL = {
    requested:           'Revision Requested',
    accepted:            'Revision Accepted',
    in_progress:         'Revision In Progress',
    ready_for_review:    'Ready for Your Review',
    approved:            'Approved',
    needs_clarification: 'Clarification Needed',
  };

  const STATUS_CLASS = {
    requested:           'rev-status-requested',
    accepted:            'rev-status-accepted',
    in_progress:         'rev-status-progress',
    ready_for_review:    'rev-status-ready',
    approved:            'rev-status-approved',
    needs_clarification: 'rev-status-clarify',
  };

  /* ── FETCH revisions for an order ───────────────────────── */
  async function getRevisions(orderId) {
    const { data, error } = await sb()
      .from('revisions')
      .select('*')
      .eq('order_id', orderId)
      .order('revision_number', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /* ── FETCH files for a revision ─────────────────────────── */
  async function getRevisionFiles(revisionId) {
    const { data, error } = await sb()
      .from('revision_files')
      .select('*')
      .eq('revision_id', revisionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  /* ── GET next revision number for an order ──────────────── */
  async function getNextRevisionNumber(orderId) {
    const { data } = await sb()
      .from('revisions')
      .select('revision_number')
      .eq('order_id', orderId)
      .order('revision_number', { ascending: false })
      .limit(1);
    return data && data.length ? (data[0].revision_number + 1) : 1;
  }

  /* ── CLIENT: Submit revision request ────────────────────── */
  async function submitRevision(orderId, clientId, formData) {
    const { description, section, page_range, additional_note } = formData;
    if (!description || !description.trim()) {
      throw new Error('Revision description is required');
    }

    const revNum = await getNextRevisionNumber(orderId);

    const { data, error } = await sb()
      .from('revisions')
      .insert({
        order_id:        orderId,
        revision_number: revNum,
        status:          'requested',
        description:     description.trim(),
        section:         section?.trim() || null,
        page_range:      page_range?.trim() || null,
        additional_note: additional_note?.trim() || null,
        requested_by:    clientId,
        client_id:       clientId,
      })
      .select()
      .single();

    if (error) throw error;

    /* Notify admin */
    await _notifyAdmin(orderId, revNum, data.id);

    /* Notify client (confirmation) */
    await _notifyClient(orderId, clientId, {
      type:    'revision_submitted',
      message: `✅ Revision Request #${revNum} সফলভাবে পাঠানো হয়েছে।`,
    });

    return data;
  }

  /* ── Upload revision attachment (client or admin) ────────── */
  async function uploadRevisionFile(revisionId, orderId, file, uploadedBy) {
    const ext         = file.name.split('.').pop();
    const storagePath = `revisions/${orderId}/${revisionId}/${uploadedBy}_${Date.now()}.${ext}`;

    const { error: upErr } = await sb().storage
      .from('order-files')
      .upload(storagePath, file, { upsert: false });
    if (upErr) throw upErr;

    /* Signed URL — 7 days. storage_path saved for re-signing later. */
    const { data: signedData } = await sb().storage
      .from('order-files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    const fileUrl = signedData && signedData.signedUrl ? signedData.signedUrl : '';

    const { data, error } = await sb()
      .from('revision_files')
      .insert({
        revision_id:  revisionId,
        order_id:     orderId,
        file_name:    file.name,
        file_url:     fileUrl,
        storage_path: storagePath,
        file_size:    file.size,
        uploaded_by:  uploadedBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /* Re-generate a fresh signed URL for any revision file */
  async function getRevisionFileUrl(storagePath, expiresIn) {
    const secs = expiresIn || 3600;
    const { data, error } = await sb().storage
      .from('order-files')
      .createSignedUrl(storagePath, secs);
    if (error) throw error;
    return data.signedUrl;
  }

  /* ── ADMIN: Transition revision status ──────────────────── */
  async function transitionRevision(revisionId, newStatus, opts = {}) {
    /* Fetch current */
    const { data: rev, error: fetchErr } = await sb()
      .from('revisions')
      .select('*')
      .eq('id', revisionId)
      .single();
    if (fetchErr) throw fetchErr;

    if (!canTransition(rev.status, newStatus)) {
      throw new Error(`Invalid transition: ${rev.status} → ${newStatus}`);
    }

    /* Build update payload */
    const now = new Date().toISOString();
    const update = { status: newStatus };

    if (newStatus === 'accepted')         update.accepted_at  = now;
    if (newStatus === 'in_progress')      update.started_at   = now;
    if (newStatus === 'ready_for_review') update.ready_at     = now;
    if (newStatus === 'approved')         update.approved_at  = now;
    if (opts.adminResponse)               update.admin_response = opts.adminResponse;
    if (opts.adminNote)                   update.admin_note   = opts.adminNote;

    /* If client requests another revision from ready_for_review → create new revision */
    if (newStatus === 'requested' && rev.status === 'ready_for_review') {
      return await submitRevision(rev.order_id, rev.client_id, {
        description:     opts.description || 'Further revision requested',
        section:         opts.section,
        page_range:      opts.page_range,
        additional_note: opts.additional_note,
      });
    }

    const { data, error } = await sb()
      .from('revisions')
      .update(update)
      .eq('id', revisionId)
      .select()
      .single();
    if (error) throw error;

    /* Notify client based on new status */
    const clientMsgs = {
      accepted:            `✅ আপনার Revision Request #${rev.revision_number} accepted হয়েছে।`,
      in_progress:         `⚙️ আপনার Revision #${rev.revision_number} এখন in progress।`,
      ready_for_review:    `📄 আপনার Revision #${rev.revision_number} ready — এখন review করুন।`,
      approved:            `🎉 Revision #${rev.revision_number} সম্পন্ন হয়েছে!`,
      needs_clarification: `❓ Revision #${rev.revision_number} এর জন্য কিছু information দরকার।`,
    };
    if (clientMsgs[newStatus]) {
      await _notifyClient(rev.order_id, rev.client_id, {
        type:    'revision_' + newStatus,
        message: clientMsgs[newStatus],
      });
    }

    return data;
  }

  /* ── ADMIN: needs clarification message ────────────────── */
  async function requestClarification(revisionId, clarificationText) {
    const { data: rev } = await sb()
      .from('revisions')
      .select('*')
      .eq('id', revisionId)
      .single();

    await sb().from('messages').insert({
      order_id:   rev.order_id,
      text:       `[REVISION_CLARIFICATION] Revision #${rev.revision_number}: ${clarificationText}`,
      from_admin: true,
      read:       false,
      sent_at:    new Date().toISOString(),
    });

    return await transitionRevision(revisionId, 'needs_clarification', {
      adminResponse: clarificationText,
    });
  }

  /* ── Internal: notify client ────────────────────────────── */
  async function _notifyClient(orderId, clientId, { type, message }) {
    try {
      await sb().from('client_notifications').insert({
        order_id:   orderId,
        client_id:  clientId,
        type:       type,
        message:    message,
        is_read:    false,
        created_at: new Date().toISOString(),
      });
    } catch (e) { console.warn('[RevisionService] client notify failed', e); }
  }

  /* ── Internal: notify admin ─────────────────────────────── */
  async function _notifyAdmin(orderId, revNum, revisionId) {
    try {
      /* Use messages table so admin sees it in chat panel too */
      await sb().from('messages').insert({
        order_id:   orderId,
        text:       `[REVISION_REQUEST] Revision #${revNum} request পাঠানো হয়েছে।`,
        from_admin: false,
        read:       false,
        sent_at:    new Date().toISOString(),
      });

      /* Admin notification bell */
      if (window.topbarPushNotif) {
        window.topbarPushNotif({
          id:      'rev_' + revisionId,
          icon:    '🔁',
          color:   'var(--accent)',
          text:    `New Revision Request — Order`,
          sub:     `Revision #${revNum} submitted`,
          time:    new Date().toISOString(),
          onclick: `window.location.href='order-management.html'`,
        });
      }
    } catch (e) { console.warn('[RevisionService] admin notify failed', e); }
  }

  /* ── Expose public API ──────────────────────────────────── */
  window.RevisionService = {
    getRevisions,
    getRevisionFiles,
    getRevisionFileUrl,
    submitRevision,
    uploadRevisionFile,
    transitionRevision,
    requestClarification,
    STATUS_LABEL,
    STATUS_CLASS,
    canTransition,
  };

})();
