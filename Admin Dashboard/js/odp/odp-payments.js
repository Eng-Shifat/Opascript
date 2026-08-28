/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — ODP Payments Tab
   Depends on: order-details-panel.js (shared state & helpers)
═══════════════════════════════════════════════════════════════════ */
'use strict';

  /* ══════════════════════════════════════════════════════════
     PAYMENTS
  ══════════════════════════════════════════════════════════ */
  window._loadPaymentHistory = async function() {
    const el = document.getElementById('odpPayHistory');
    if (!el) return;

    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) {
      el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">Payment history unavailable.</div>';
      return;
    }

    try {
      const { data } = await window._sb().from('payments')
        .select('*').eq('order_id', window._currentOrderId)
        .order('paid_at', { ascending: true });

      if (!data || !data.length) {
        el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">No payment records yet.</div>';
        return;
      }

      /* Separate pending vs approved vs rejected */
      const pending  = data.filter(p => !p.confirmed && ['pending','advance'].includes(p.type));
      const approved = data.filter(p => p.confirmed && ['received','approval'].includes(p.type));
      const rejected = data.filter(p => p.type === 'rejected');
      const notes    = data.filter(p => p.type === 'note');

      let html = '';

      /* ── PENDING VERIFICATION SECTION ── */
      if (pending.length) {
        html += `<div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:var(--gold);letter-spacing:.08em;margin-bottom:8px">
            ⏳ PENDING VERIFICATION (${pending.length})
          </div>`;
        pending.forEach((p, i) => {
          const date = p.paid_at || p.created_at;
          const dateStr = date ? new Date(date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) + ' ' + new Date(date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '—';
          const amtStr = p.amount > 0 ? '৳' + Number(p.amount).toLocaleString() : '—';
          const proofBtn = p.screenshot_url
            ? `<span style="cursor:pointer;color:var(--accent2);font-size:11px" onclick="odpViewProof('${window._esc(p.screenshot_url)}')">📷 View Proof</span>`
            : '<span style="color:var(--muted2);font-size:11px">No screenshot</span>';
          html += `<div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:10px 12px;margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
              <div>
                <div style="font-size:12px;font-weight:700;color:var(--text)">Client Submitted — ${amtStr}</div>
                <div style="font-size:11px;color:var(--muted2);margin-top:2px">${dateStr} · ${window._esc(p.method||'—')}</div>
                ${p.txn_id ? `<div style="font-size:11px;color:var(--accent2);font-family:monospace;margin-top:2px">TXN: ${window._esc(p.txn_id)}</div>` : ''}
                ${p.client_note ? `<div style="font-size:11px;color:var(--muted2);margin-top:2px;font-style:italic">"${window._esc(p.client_note)}"</div>` : ''}
              </div>
              <span style="background:rgba(245,158,11,0.15);color:var(--gold);font-size:10px;padding:2px 8px;border-radius:20px;flex-shrink:0">Pending</span>
            </div>
            <div style="margin-top:8px">${proofBtn}</div>
          </div>`;
        });
        html += '</div>';
      }

      /* ── APPROVED PAYMENT HISTORY ── */
      if (approved.length) {
        html += `<div style="margin-bottom:14px">`;
        approved.forEach((p, i) => {
          const date = p.paid_at || p.created_at;
          const dateStr = date ? new Date(date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) + '<br><small>' + new Date(date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) + '</small>' : '—';
          const amtStr = p.amount > 0 ? '৳' + Number(p.amount).toLocaleString() : '—';
          const txnId = p.txn_id ? `<span style="font-size:11px;color:var(--accent2);font-family:monospace">${window._esc(p.txn_id)}</span>` : '—';
          html += `<div class="odp-pay-table-row">
            <span style="color:var(--muted2);font-size:11px">${i+1}</span>
            <span style="font-size:11px;color:var(--muted2)">${dateStr}</span>
            <span style="font-size:13px;font-weight:700;color:var(--green)">${amtStr}</span>
            <span style="font-size:11.5px;color:var(--muted2)">${window._esc(p.method||'—')}</span>
            <span>${txnId}</span>
            <span class="odp-pay-status-pill green" style="font-size:10px">Approved</span>
            <span style="font-size:11px;color:var(--muted2)">${window._esc(p.note || 'Verified by Admin')}</span>
          </div>`;
        });
        html += '</div>';
      }

      /* ── REJECTED PAYMENTS ── */
      if (rejected.length) {
        html += `<div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:var(--red);letter-spacing:.08em;margin-bottom:8px">
            ✕ REJECTED (${rejected.length})
          </div>`;
        rejected.forEach(p => {
          const date = p.paid_at || p.created_at;
          const dateStr = date ? new Date(date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) + ' ' + new Date(date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '—';
          const amtStr = p.amount > 0 ? '৳' + Number(p.amount).toLocaleString() : '—';
          html += `<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.18);border-radius:8px;padding:10px 12px;margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
              <div>
                <div style="font-size:12px;font-weight:700;color:var(--text)">Client Submitted — ${amtStr}</div>
                <div style="font-size:11px;color:var(--muted2);margin-top:2px">${dateStr} · ${window._esc(p.method||'—')}</div>
                ${p.txn_id ? `<div style="font-size:11px;color:var(--muted2);font-family:monospace;margin-top:2px">TXN: ${window._esc(p.txn_id)}</div>` : ''}
              </div>
              <span style="background:rgba(239,68,68,0.15);color:#f87171;font-size:10px;padding:2px 8px;border-radius:20px;flex-shrink:0">Rejected</span>
            </div>
          </div>`;
        });
        html += '</div>';
      }

      /* ── INTERNAL NOTES ── */
      if (notes.length) {
        html += `<div>
          <div style="font-size:10px;font-weight:700;color:var(--muted2);letter-spacing:.08em;margin-bottom:6px">INTERNAL NOTES</div>`;
        notes.forEach(p => {
          const date = p.paid_at || p.created_at;
          const dateStr = date ? new Date(date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '';
          html += `<div style="font-size:11px;color:var(--muted2);padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04)">
            <span style="color:var(--muted2)">${dateStr}</span> — ${window._esc(p.note||'')}
          </div>`;
        });
        html += '</div>';
      }

      if (!html) {
        html = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">No payment records yet.</div>';
      }

      el.innerHTML = html;

      /* ── Populate / Clear client proof section ──
         If a pending payment exists, show its data.
         If NOT, clear the proof box completely so old approved/rejected
         data never lingers and confuses the admin. */
      const latestPending = pending.length ? pending[pending.length - 1] : null;

      const sentEl     = document.getElementById('odpClientSentAmount');
      const methodEl   = document.getElementById('odpClientMethod');
      const txnEl      = document.getElementById('odpClientTxnId');
      const noteEl     = document.getElementById('odpClientNote');
      const recvEl     = document.getElementById('odpReceivedAmount');
      const sec        = document.getElementById('odpProofSection');
      const approveBtn = document.querySelector('button[onclick="odpApprovePayment()"]');
      const rejectBtn  = document.querySelector('button[onclick="odpRejectPayment()"]');

      if (latestPending) {
        if (sentEl)   sentEl.textContent   = latestPending.amount ? '৳' + Number(latestPending.amount).toLocaleString() : '—';
        if (methodEl) methodEl.textContent = latestPending.method || '—';
        if (txnEl)    txnEl.textContent    = latestPending.txn_id || '—';
        if (noteEl)   noteEl.textContent   = latestPending.client_note || '—';

        if (recvEl) {
          recvEl.value    = latestPending.amount || '';
          recvEl.disabled = false;
          window.odpUpdateDuePreview(latestPending.amount);
        }
        if (approveBtn) approveBtn.disabled = false;
        if (rejectBtn)  rejectBtn.disabled  = false;

        if (sec) {
          if (latestPending.screenshot_url) {
            const name = latestPending.screenshot_url.split('/').pop() || 'Payment_Receipt';
            sec.innerHTML = `
              <div class="odp-proof-box" style="cursor:pointer" onclick="window.open('${window._esc(latestPending.screenshot_url)}','_blank')">
                <div class="odp-proof-icon"><i class="ti ti-file-invoice" style="color:var(--accent)"></i></div>
                <div>
                  <div class="odp-proof-name">${window._esc(name)}</div>
                  <div class="odp-proof-sub">Uploaded by Client · Pending verification</div>
                </div>
                <i class="ti ti-eye" style="color:var(--muted2);margin-left:auto"></i>
              </div>`;
          } else {
            sec.innerHTML = `
              <div class="odp-proof-box" style="opacity:.6">
                <div class="odp-proof-icon"><i class="ti ti-file-off" style="color:var(--muted2)"></i></div>
                <div>
                  <div class="odp-proof-name">No proof uploaded</div>
                  <div class="odp-proof-sub">Uploaded by Client</div>
                </div>
              </div>`;
          }
        }
      } else {
        /* No pending payment — clear everything so stale approved/rejected
           data never shows here. Admin sees a blank "waiting" state. */
        if (sentEl)   sentEl.textContent   = '—';
        if (methodEl) methodEl.textContent = '—';
        if (txnEl)    txnEl.textContent    = '—';
        if (noteEl)   noteEl.textContent   = '—';
        if (recvEl) {
          recvEl.value    = '';
          recvEl.disabled = true;
        }
        if (approveBtn) approveBtn.disabled = true;
        if (rejectBtn)  rejectBtn.disabled  = true;

        const duePreview = document.getElementById('odpDuePreview');
        if (duePreview) duePreview.style.display = 'none';

        if (sec) {
          sec.innerHTML = `
            <div class="odp-proof-box" style="opacity:.5">
              <div class="odp-proof-icon"><i class="ti ti-clock" style="color:var(--muted2)"></i></div>
              <div>
                <div class="odp-proof-name">No pending payment</div>
                <div class="odp-proof-sub">Waiting for client to submit a payment</div>
              </div>
            </div>`;
        }
      }

      /* ── Affiliate Commission Button ──────────────────────────────
         Show only when: order has referred_by_code AND no commission exists yet.
         This is a MANUAL admin action — no automatic recording.
      ── */
      const rawDB = window._currentOrder?._rawDB;
      if (rawDB?.referred_by_code && window._isRealUUID(window._currentOrderId)) {
        try {
          const { data: existingComm } = await window._sb()
            .from('affiliate_commissions')
            .select('id')
            .eq('order_id', window._currentOrderId)
            .maybeSingle();

          /* Remove any existing commission button before re-rendering */
          const oldBtn = document.getElementById('odpCommissionBtnWrap');
          if (oldBtn) oldBtn.remove();

          const commBtnWrap = document.createElement('div');
          commBtnWrap.id = 'odpCommissionBtnWrap';
          commBtnWrap.style.cssText = 'margin-top:14px;';

          if (existingComm) {
            commBtnWrap.innerHTML = `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:8px;font-size:12px;color:#34d399;">
                <i class="ti ti-circle-check"></i>
                Affiliate commission already recorded &mdash; Ref: <strong>${window._esc ? window._esc(rawDB.referred_by_code) : rawDB.referred_by_code}</strong>
              </div>`;
          } else {
            commBtnWrap.innerHTML = `
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:8px;">
                <i class="ti ti-affiliate" style="color:#a78bfa;font-size:15px;flex-shrink:0;"></i>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12px;font-weight:600;color:#a78bfa;">Affiliate Referral Detected</div>
                  <div style="font-size:11px;color:var(--muted2);margin-top:1px;">Ref code: <strong>${window._esc ? window._esc(rawDB.referred_by_code) : rawDB.referred_by_code}</strong></div>
                </div>
                <button
                  id="odpCommissionRecordBtn"
                  onclick="odpRecordCommission()"
                  style="flex-shrink:0;padding:6px 14px;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Sora',sans-serif;transition:opacity .15s;"
                  onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                  Record Commission
                </button>
              </div>`;
          }
          el.after(commBtnWrap);
        } catch (_) { /* commission check is non-fatal */ }
      }

    } catch(e) {
      el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">Could not load payment history.</div>';
      console.error('_loadPaymentHistory:', e);
    }
  }

    window.odpViewProof = function(url) {
    if (!url) { window._toast('⚠ No proof uploaded', 'var(--muted)'); return; }
    window.open(url, '_blank');
  };

  /* Live due preview as admin types received amount — accounts for already-approved payments */
  window.odpUpdateDuePreview = async function(val) {
    const received = parseFloat(val) || 0;
    const preview    = document.getElementById('odpDuePreview');
    const previewVal = document.getElementById('odpDuePreviewVal');
    if (!preview || !previewVal) return;

    if (received <= 0) { preview.style.display = 'none'; return; }

    const total = window._currentOrder
      ? (window._currentOrder.detail?.financials?.total || Number(window._currentOrder.total_price || 0) || 0)
      : 0;

    /* Sum already-approved payments from cached financials (fast path) */
    const alreadyPaid = window._currentOrder?.detail?.financials?.paid || 0;
    const due = Math.max(0, total - alreadyPaid - received);

    preview.style.display = 'block';
    previewVal.textContent = due > 0 ? '৳' + Number(due).toLocaleString() : '৳0 (Full payment ✓)';
    previewVal.style.color = due === 0 ? 'var(--green)' : 'var(--red)';
  };

  window.odpUploadProof = async function(files) {
    if (!files || !files.length) return;
    const f = files[0];
    const section = document.getElementById('odpProofSection');
    if (!section) return;
    section.innerHTML = `<div class="odp-proof-box"><div class="odp-proof-icon"><i class="ti ti-loader" style="animation:spin .7s linear infinite"></i></div><div><div class="odp-proof-name">Uploading…</div></div></div>`;

    if (!window._sb()) {
      setTimeout(() => {
        section.innerHTML = `<div class="odp-proof-box"><div class="odp-proof-icon"><i class="ti ti-file-invoice"></i></div><div><div class="odp-proof-name">${window._esc(f.name)}</div><div class="odp-proof-sub">${(f.size/1024).toFixed(0)} KB · Just uploaded</div></div></div>`;
        window._toast('✓ Proof uploaded!', 'var(--green)');
      }, 1000);
      return;
    }

    try {
      const path = `payments/${window._currentOrderId}/${f.name}`;
      const { error } = await window._sb().storage.from('order-files').upload(path, f, { upsert: true });
      if (error) throw error;
      section.innerHTML = `<div class="odp-proof-box"><div class="odp-proof-icon"><i class="ti ti-file-invoice"></i></div><div><div class="odp-proof-name">${window._esc(f.name)}</div><div class="odp-proof-sub">${(f.size/1024).toFixed(0)} KB · Uploaded</div></div></div>`;
      window._toast('✓ Payment proof uploaded!', 'var(--green)');
    } catch(e) { window._toast('⚠ Upload failed', 'var(--red)'); }
  };

  window.odpApprovePayment = async function() {
    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) {
      window._toast('⚠ Supabase not connected', 'var(--red)');
      return;
    }

    /* ── Read admin-entered received amount ── */
    const recvEl = document.getElementById('odpReceivedAmount');
    const adminReceivedAmount = recvEl ? (parseFloat(recvEl.value) || 0) : 0;

    if (adminReceivedAmount <= 0) {
      window._toast('⚠ "আমি যা পেয়েছি" field এ received amount লিখুন, তারপর Approve করুন।', 'var(--gold)');
      recvEl?.focus();
      return;
    }

    try {
      /* 1. Get current order total */
      const { data: ord } = await window._sb()
        .from('orders')
        .select('total_price')
        .eq('id', window._currentOrderId)
        .single();

      const rawTotal = Number(ord?.total_price || 0) || Number(window._currentOrder?.total_price || 0) || 0;

      /* 2. Get the latest pending payment submitted by client */
      const { data: pendingPays } = await window._sb()
        .from('payments')
        .select('id, amount, method, txn_id, client_note, client_id, screenshot_url')
        .eq('order_id', window._currentOrderId)
        .eq('confirmed', false)
        .in('type', ['pending', 'advance'])
        .order('paid_at', { ascending: false })
        .limit(1);
      const pendingPay = pendingPays && pendingPays[0];

      /* 3. Sum only admin-approved payments (confirmed=true, type received/approval) */
      const { data: approvedPays } = await window._sb()
        .from('payments')
        .select('amount')
        .eq('order_id', window._currentOrderId)
        .eq('confirmed', true)
        .in('type', ['received', 'approval']);

      const prevPaid     = (approvedPays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      /* thisAmount = what admin actually received (may differ from client claim) */
      const thisAmount   = adminReceivedAmount;
      const newTotalPaid = prevPaid + thisAmount;
      const due          = Math.max(0, rawTotal - newTotalPaid);
      const paidPct      = rawTotal > 0 ? Math.min(100, Math.round((newTotalPaid / rawTotal) * 100)) : 0;

      /* 4. Update pending payment row: mark confirmed, store ADMIN-verified amount */
      if (pendingPay) {
        await window._sb().from('payments')
          .update({
            confirmed: true,
            amount:    thisAmount,          /* override with admin-verified amount */
            type:      'received',          /* promote type so it counts in approved sum */
            note:      'Verified by Admin',
            label:     'Payment Received',
          })
          .eq('id', pendingPay.id);
      } else {
        /* No pending row — insert a standalone approved record */
        const internalNote = document.getElementById('odpPayNote')?.value?.trim() || null;
        await window._sb().from('payments').insert({
          order_id:   window._currentOrderId,
          client_id:  window._currentOrder?.clientId || window._currentOrder?._rawDB?.client_id || null,
          amount:     thisAmount,
          type:       'received',
          method:     'Admin Entry',
          confirmed:  true,
          note:       internalNote || 'Manually added by Admin',
          label:      'Payment Received',
          paid_at:    new Date().toISOString(),
        });
      }

      /* 5. If due === 0 → unlock all files + complete order */
      if (due === 0) {
        await window._sb().from('order_file_access')
          .update({ download_allowed: true, updated_at: new Date().toISOString() })
          .eq('order_id', window._currentOrderId);
        /* Revision-delivered files use the same due-based lock — unlock those too */
        await window._sb().from('revision_files')
          .update({ download_allowed: true })
          .eq('order_id', window._currentOrderId);
        await window._sb().from('orders').update({
          payment_status: 'paid',
          advance_paid:   newTotalPaid,
          status:         'completed',
          updated_at:     new Date().toISOString(),
        }).eq('id', window._currentOrderId);
        /* Invalidate file cache */
        Object.keys(window._fileMetaCache || {}).forEach(path => {
          if (window._fileMetaCache[path]) window._fileMetaCache[path].download_allowed = true;
        });
      } else {
        await window._sb().from('orders').update({
          payment_status: 'approved',
          advance_paid:   newTotalPaid,
          status:         'pending',
          updated_at:     new Date().toISOString(),
        }).eq('id', window._currentOrderId);
      }

      const newStatus = due === 0 ? 'paid' : 'approved';

      /* 6. Update local _currentOrder cache */
      if (window._currentOrder) {
        if (!window._currentOrder.detail) window._currentOrder.detail = {};
        window._currentOrder.detail.financials = { total: rawTotal, paid: newTotalPaid, due, paidPct };
        window._currentOrder.paymentStatus = newStatus;
        window._currentOrder.advance_paid  = newTotalPaid;
        window._currentOrder.due_amount    = due;
      }

      /* 7. Inject payment milestone into Order Progress timeline */
      window._injectPaymentMilestone(thisAmount, newTotalPaid, due, rawTotal);

      /* 8. Notify client */
      const clientId = window._currentOrder?.clientId
        || window._currentOrder?._rawDB?.client_id
        || pendingPay?.client_id
        || null;
      const notifyMsg = due === 0
        ? `✅ আপনার সম্পূর্ণ payment পাওয়া গেছে! Payment Confirmed. Files এখন unlock হয়েছে।`
        : `✅ ৳${Number(thisAmount).toLocaleString()} payment confirmed. বাকি ৳${Number(due).toLocaleString()} পরিশোধ করুন।`;

      try {
        await window._sb().from('client_notifications').insert({
          order_id:   window._currentOrderId,
          client_id:  clientId,
          type:       'payment_approved',
          message:    notifyMsg,
          is_read:    false,
          created_at: new Date().toISOString(),
        });
      } catch(_) {}

      try {
        await window._sb().from('messages').insert({
          order_id:   window._currentOrderId,
          text:       notifyMsg,
          from_admin: true,
          read:       false,
          sent_at:    new Date().toISOString(),
        });
      } catch(_) {}

      /* 9. Remove banner, clear input, reload UI */
      const banner = document.querySelector('.odp-pay-banner');
      if (banner) banner.remove();
      if (recvEl) recvEl.value = '';
      const duePreview = document.getElementById('odpDuePreview');
      if (duePreview) duePreview.style.display = 'none';
      const payNote = document.getElementById('odpPayNote');
      if (payNote) payNote.value = '';

      await window._reloadPaymentFinancials();
      await window._loadPaymentHistory();

      const msg = due === 0
        ? `✅ Full payment received! ৳${Number(newTotalPaid).toLocaleString()} — Files unlocked, Order completed.`
        : `✓ ৳${Number(thisAmount).toLocaleString()} approved. Total paid: ৳${Number(newTotalPaid).toLocaleString()}. Due: ৳${Number(due).toLocaleString()}.`;
      window._toast(msg, due === 0 ? 'var(--green)' : 'var(--gold)');
      window._logActivity('payment', `Payment confirmed: ৳${Number(thisAmount).toLocaleString()}. Total paid: ৳${Number(newTotalPaid).toLocaleString()}. Due: ৳${Number(due).toLocaleString()}`);

    } catch(e) {
      console.error('odpApprovePayment error:', e);
      window._toast('⚠ Error: ' + (e.message || 'Unknown'), 'var(--red)');
    }
  };

  /* ── Record Affiliate Commission — manual admin action ─────────── */
  window.odpRecordCommission = async function() {
    if (!window._currentOrderId || !window._isRealUUID(window._currentOrderId)) return;

    const btn = document.getElementById('odpCommissionRecordBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Recording…'; }

    try {
      const { data, error } = await window._sb().rpc('record_affiliate_commission', {
        p_order_id: window._currentOrderId
      });

      if (error) throw error;

      if (data?.success === false) {
        window._toast('❌ ' + (data.message || 'Commission record failed'), 'var(--red)');
        if (btn) { btn.disabled = false; btn.textContent = 'Record Commission'; }
        return;
      }

      const amt = data?.commission_amount
        ? ' — ৳' + Number(data.commission_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
        : '';
      window._toast('✅ Commission Recorded' + amt, 'var(--green)');

      /* Refresh payment history panel so button changes to "already recorded" state */
      await window._loadPaymentHistory();

    } catch(e) {
      console.error('odpRecordCommission error:', e);
      window._toast('⚠ Error: ' + (e.message || 'Unknown'), 'var(--red)');
      if (btn) { btn.disabled = false; btn.textContent = 'Record Commission'; }
    }
  };

  window.odpRejectPayment = async function() {
    if (!confirm('Reject this payment? Client will need to re-submit.')) return;
    if (window._sb() && window._isRealUUID(window._currentOrderId)) {
      try {
        /* 1. Find the latest pending payment submission */
        const { data: pendingPays } = await window._sb()
          .from('payments')
          .select('id, amount, client_id')
          .eq('order_id', window._currentOrderId)
          .eq('confirmed', false)
          .in('type', ['pending', 'advance'])
          .order('paid_at', { ascending: false })
          .limit(1);
        const pendingPay = pendingPays && pendingPays[0];

        /* 2. Mark that exact payment row as rejected — so it never shows
              as "pending" again and the client sees a clear Rejected entry */
        if (pendingPay) {
          await window._sb().from('payments')
            .update({ type: 'rejected', confirmed: false, note: 'Rejected by Admin', label: 'Payment Rejected' })
            .eq('id', pendingPay.id);
        }

        /* 3. Update order status */
        await window._sb().from('orders').update({ payment_status: 'rejected', updated_at: new Date().toISOString() }).eq('id', window._currentOrderId);

        /* 4. Notify client */
        const clientId = pendingPay?.client_id || (window._currentOrder && window._currentOrder.clientId) || null;
        try {
          await window._sb().from('client_notifications').insert({ order_id: window._currentOrderId, client_id: clientId, type: 'payment_rejected', message: 'Your payment could not be verified. Please re-submit with correct transaction ID.', is_read: false, created_at: new Date().toISOString() });
        } catch(_) {}
        try {
          await window._sb().from('messages').insert({ order_id: window._currentOrderId, text: '❌ আপনার payment verify করা যায়নি। সঠিক transaction ID দিয়ে আবার submit করুন।', from_admin: true, read: false, sent_at: new Date().toISOString() });
        } catch(_) {}

      } catch(e) { console.error(e); }
    }
    await window._reloadPaymentFinancials();
    await window._loadPaymentHistory();
    window._toast('Payment rejected. Client notified.', 'var(--red)');
    window._logActivity('payment', 'Payment rejected by admin');

    /* If this order never had any real advance paid, it now falls out
       of the admin filter (unpaid/rejected + advance_paid = 0) —
       refresh the table so it disappears immediately, and close the
       panel since the order it was showing is no longer listed. */
    const stillHasMoney = Number(window._currentOrder?.financials?.paid?.replace(/[^\d.]/g, '')) > 0
      || Number(window._currentOrder?.advance_paid) > 0;
    if (!stillHasMoney) {
      if (typeof window.closeDetail === 'function') window.closeDetail();
      if (typeof window.loadRealOrders === 'function') await window.loadRealOrders();
    }
  };

  /* "Mark as Payment Received" button — same logic as Approve, just a UI alias */
  window.odpMarkPaymentReceived = window.odpApprovePayment;
  window.odpMarkPaid            = window.odpApprovePayment;

  window.odpSavePayNote = async function() {
    const note = document.getElementById('odpPayNote');
    if (!note || !note.value.trim()) return;
    const text = note.value.trim();

    /* Mock order — শুধু UI তে history add করো */
    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) {
      window._appendPayHistoryItem({ label: 'Internal Note', type: 'note', method: 'Admin', amount: null, created_at: new Date().toISOString(), note: text });
      note.value = '';
      window._toast('✓ Note saved (mock mode)!', 'var(--green)');
      return;
    }

    /* Real order — Supabase payments table এ insert */
    try {
      const { error } = await window._sb().from('payments').insert({
        order_id:   window._currentOrderId,
        label:      'Internal Note',
        type:       'advance',
        method:     'Admin',
        amount:     0,
        confirmed:  true,
        note:       text,
        paid_at:    new Date().toISOString(),
      });
      if (error) throw error;
      window._appendPayHistoryItem({ label: 'Internal Note', type: 'note', method: 'Admin', amount: 0, created_at: new Date().toISOString(), note: text });
      note.value = '';
      window._toast('✓ Payment note saved!', 'var(--green)');
      window._logActivity('payment', 'Internal note added');
    } catch(e) {
      window._toast('⚠ Note save failed: ' + (e.message || ''), 'var(--red)');
    }
  };

  /* Payment History এ নতুন item append করার helper */
window._appendPayHistoryItem = function(p) {
    const el = document.getElementById('odpPayHistory');
    if (!el) return;
    /* যদি এখনো "unavailable / no records" দেখাচ্ছে, clear করো */
    if (el.querySelector('div[style]')) el.innerHTML = '';
    const isNote = p.type === 'note';
    const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '';
    const amtDisplay = (p.amount === 0 || p.amount === null) ? (p.note ? `<span style="font-size:11px;color:var(--muted2);font-style:italic">${window._esc(p.note.substring(0,40))}${p.note.length>40?'…':''}</span>` : '—') : `<span class="odp-pay-hist-val ${p.amount>0?'green':'orange'}">${p.amount>0?'+':''}${window._esc(String(p.amount))}</span>`;
    const row = document.createElement('div');
    row.className = 'odp-pay-hist-item';
    row.innerHTML = `
      <div>
        <div class="odp-pay-hist-label">${window._esc(p.label || p.type || 'Payment')}</div>
        <div class="odp-pay-hist-sub">${dateStr}${p.method ? ' · ' + window._esc(p.method) : ''}</div>
      </div>
      ${amtDisplay}`;
    el.insertBefore(row, el.firstChild);
  }

window._injectPaymentMilestone = function(thisAmount, newTotalPaid, due, rawTotal) {
    /* Find the vertical timeline steps container in the Overview tab */
    const vtSteps = document.querySelector('.odp-vt-steps');
    if (!vtSteps) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
      + ' ' + now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });

    const isPaid = due === 0;
    const label  = isPaid
      ? `Payment Confirmed — ৳${Number(thisAmount).toLocaleString()} (Full ✓)`
      : `Payment Confirmed — Received ৳${Number(thisAmount).toLocaleString()}`;

    /* Build new milestone node */
    const ms = document.createElement('div');
    ms.className = 'odp-vt-step';
    ms.innerHTML = `
      <div class="odp-vt-dot-wrap">
        <div class="odp-vt-dot done"><i class="ti ti-check"></i></div>
        <div class="odp-vt-line done"></div>
      </div>
      <div class="odp-vt-body">
        <div class="odp-vt-name done" style="color:var(--green)">${window._esc(label)}</div>
        <div class="odp-vt-date">${dateStr}</div>
      </div>`;

    /* Insert after the "Payment Confirmed" base milestone (index 1) */
    const baseSteps = vtSteps.querySelectorAll('.odp-vt-step');
    /* Find payment-confirmed step — it's usually the 2nd one */
    const paymentStep = Array.from(baseSteps).find(s =>
      s.querySelector('.odp-vt-name')?.textContent?.includes('Payment Confirmed')
    );
    if (paymentStep) {
      /* Mark the base "Payment Confirmed" as done */
      const dot  = paymentStep.querySelector('.odp-vt-dot');
      const name = paymentStep.querySelector('.odp-vt-name');
      const line = paymentStep.querySelector('.odp-vt-line');
      if (dot)  { dot.className  = 'odp-vt-dot done'; dot.innerHTML = '<i class="ti ti-check"></i>'; }
      if (name) { name.className = 'odp-vt-name done'; name.style.color = 'var(--green)'; }
      if (line) { line.className = 'odp-vt-line done'; }
      /* Insert new payment record after it */
      paymentStep.after(ms);
    } else {
      vtSteps.appendChild(ms);
    }
  };

window._reloadPaymentFinancials = async function() {
    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) return;
    try {
      const [{ data: ord }, { data: pays }] = await Promise.all([
        window._sb().from('orders').select('total_price,payment_status').eq('id', window._currentOrderId).single(),
        window._sb().from('payments').select('amount,type,confirmed').eq('order_id', window._currentOrderId)
      ]);
      if (!ord || !window._currentOrder) return;

      const total = Number(ord?.total_price || 0);

      /* CRITICAL: only count admin-approved payments — never fall back to advance_paid column */
      const paid = (pays || [])
        .filter(p => p.confirmed === true && ['received', 'approval'].includes(p.type))
        .reduce((s, p) => s + Number(p.amount || 0), 0);

      const due     = Math.max(0, total - paid);
      const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

      if (!window._currentOrder.detail) window._currentOrder.detail = {};
      window._currentOrder.detail.financials = { total, paid, due, paidPct };
      window._currentOrder.paymentStatus = ord.payment_status || window._currentOrder.paymentStatus;
      window._currentOrder.advance_paid  = paid;
      window._currentOrder.due_amount    = due;

      window._syncOrderInfoPayments(window._currentOrder);

      /* Live update stat cards inside Payments tab */
      const sp = document.getElementById('odpPaySummaryPaid');
      const sd = document.getElementById('odpPaySummaryDue');
      const st = document.getElementById('odpPaySummaryTotal');
      if (sp) sp.textContent = '\u09F3' + Number(paid).toLocaleString();
      if (sd) sd.textContent = '\u09F3' + Number(due).toLocaleString();
      if (st) st.textContent = total ? '\u09F3' + Number(total).toLocaleString() : '\u2014';

      /* Live update progress bar */
      const fill = document.querySelector('.odp-progress-fill.pf-green');
      const pct  = document.querySelector('.odp-pay-progress-row span[style*="font-weight:7"]');
      if (fill) fill.style.width = paidPct + '%';
      if (pct)  pct.textContent  = paidPct + '%';

      /* Update payment status pill */
      const statusPill = document.querySelector('.odp-pay-status-pill');
      if (statusPill) {
        const ps  = ord.payment_status || 'pending';
        const lbl = { pending:'Pending', under_review:'Pending', approved:'Approved', paid:'Paid', rejected:'Rejected' }[ps] || 'Pending';
        const cls = { pending:'orange', under_review:'orange', approved:'green', paid:'green', rejected:'red' }[ps] || 'orange';
        statusPill.textContent = lbl;
        statusPill.className   = 'odp-pay-status-pill ' + cls;
      }

    } catch(e) { console.error('_reloadPaymentFinancials:', e); }
  }

window._subscribePaymentsRealtime = function() {
    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) return;
    if (window._payRealtimeChannel) {
      window._sb().removeChannel(window._payRealtimeChannel);
      window._payRealtimeChannel = null;
    }
    window._payRealtimeChannel = window._sb()
      .channel(`odp_pay_${window._currentOrderId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `order_id=eq.${window._currentOrderId}` },
        async () => {
          await window._reloadPaymentFinancials();
          await window._loadPaymentHistory();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${window._currentOrderId}` },
        async (payload) => {
          if (!window._currentOrder) return;
          window._currentOrder.paymentStatus = payload.new.payment_status || window._currentOrder.paymentStatus;
          window._syncOrderInfoPayments(window._currentOrder);
          const payPill = document.getElementById('odpOiPayStatus');
          if (payPill) {
            const ps  = payload.new.payment_status || 'pending';
            const lbl = { pending:'Unpaid', under_review:'Pending', approved:'Approved', paid:'Paid', rejected:'Rejected' }[ps] || 'Pending';
            const cls = { pending:'odp-oi-pay-unpaid', under_review:'odp-oi-pay-partial', approved:'odp-oi-pay-paid', paid:'odp-oi-pay-paid', rejected:'odp-oi-pay-unpaid' }[ps] || 'odp-oi-pay-unpaid';
            payPill.textContent = lbl;
            payPill.className   = 'odp-oi-pay-pill ' + cls;
          }
        }
      )
      .subscribe();
  }

  /* ══ THESIS DETAILS CARD — Overview tab ══
     Reads real Supabase `orders` columns and renders
     every submitted field in a clean grouped layout.
  ══════════════════════════════════════════════════ */
