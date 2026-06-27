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

    if (!window._sb() || !window._isRealUUID(window.window._currentOrderId)) {
      el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">Payment history unavailable.</div>';
      return;
    }

    try {
      const { data } = await window._sb().from('payments').select('*').eq('order_id', window.window._currentOrderId).order('paid_at', { ascending: true });
      if (!data || !data.length) {
        el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">No payment records yet.</div>';
        return;
      }

      /* Also try to load client note from latest payment */
      const latestWithNote = data.find(p => p.type === 'advance' || p.type === 'payment');
      if (latestWithNote && latestWithNote.client_note) {
        const noteEl = document.getElementById('odpClientNote');
        if (noteEl) noteEl.textContent = latestWithNote.client_note;
      }

      /* Populate client sent info in proof section */
      const clientPayment = data.find(p => p.type === 'advance' || p.type === 'payment' || p.type === 'balance');
      if (clientPayment) {
        const sentEl   = document.getElementById('odpClientSentAmount');
        const methodEl = document.getElementById('odpClientMethod');
        const txnEl    = document.getElementById('odpClientTxnId');
        const noteEl   = document.getElementById('odpClientNote');
        if (sentEl)   sentEl.textContent   = clientPayment.amount ? '৳' + Number(clientPayment.amount).toLocaleString() : '—';
        if (methodEl) methodEl.textContent = clientPayment.method || '—';
        if (txnEl)    txnEl.textContent    = clientPayment.txn_id || '—';
        if (noteEl && clientPayment.client_note) noteEl.textContent = clientPayment.client_note;

        /* ── Update Payment Summary stat cards from real DB data ── */
        const rawTotal = window.window._currentOrder ? Number(String(window.window._currentOrder.amount || '').replace(/[^\d]/g, '')) || 0 : 0;
        const clientSent = Number(clientPayment.amount || 0);
        const due = Math.max(0, rawTotal - clientSent);
        const paidPct = rawTotal > 0 ? Math.min(100, Math.round((clientSent / rawTotal) * 100)) : 0;

        const stTotal = document.getElementById('odpPaySummaryTotal');
        const stPaid  = document.getElementById('odpPaySummaryPaid');
        const stDue   = document.getElementById('odpPaySummaryDue');
        const stFill  = document.querySelector('.odp-progress-fill.pf-green');
        const stPct   = document.querySelector('.odp-pay-progress-row span[style*="font-weight:7"]');

        if (stTotal) stTotal.textContent = rawTotal ? '৳' + Number(rawTotal).toLocaleString() : '—';
        if (stPaid)  stPaid.textContent  = clientSent ? '৳' + Number(clientSent).toLocaleString() : '৳0';
        if (stDue)   stDue.textContent   = due ? '৳' + Number(due).toLocaleString() : '৳0';
        if (stFill)  stFill.style.width  = paidPct + '%';
        if (stPct)   stPct.textContent   = paidPct + '%';

        /* Pre-fill received amount with client's sent amount */
        const recvEl = document.getElementById('odpReceivedAmount');
        if (recvEl && clientPayment.amount) {
          recvEl.value = clientPayment.amount;
          odpUpdateDuePreview(clientPayment.amount);
        }
      }

      /* Also load proof screenshot if exists */
      if (latestWithNote && latestWithNote.screenshot_url) {
        const sec = document.getElementById('odpProofSection');
        if (sec) {
          const name = latestWithNote.screenshot_url.split('/').pop() || 'Payment_Receipt';
          const uploadedAt = latestWithNote.paid_at || latestWithNote.created_at;
          const dateStr = uploadedAt ? new Date(uploadedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) + ' ' + new Date(uploadedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '';
          const sizeStr = latestWithNote.screenshot_size ? (latestWithNote.screenshot_size/1024).toFixed(0)+' KB' : '';
          sec.innerHTML = `
            <div class="odp-proof-box" style="cursor:pointer" onclick="window.open('${window._esc(latestWithNote.screenshot_url)}','_blank')">
              <div class="odp-proof-icon"><i class="ti ti-file-invoice" style="color:var(--accent)"></i></div>
              <div>
                <div class="odp-proof-name">${window._esc(name)}</div>
                <div class="odp-proof-sub">Uploaded by Client · ${dateStr}${sizeStr ? ' · '+sizeStr : ''}</div>
              </div>
              <i class="ti ti-eye" style="color:var(--muted2);margin-left:auto"></i>
            </div>
            <input type="file" id="odpProofInput" style="display:none" accept="image/*,.pdf" onchange="odpUploadProof(this.files)">`;
        }
      }

      el.innerHTML = data.map((p, i) => {
        const date    = p.paid_at || p.created_at;
        const dateStr = date ? new Date(date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) + ' ' + new Date(date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '—';
        const type    = p.type === 'advance' ? 'Payment Sent<br><small style="color:var(--muted2)">(By Client)</small>'
                      : p.type === 'approval' || p.type === 'received' ? 'Payment Received<br><small style="color:var(--muted2)">(By Admin)</small>'
                      : p.type === 'balance' ? 'Balance Payment<br><small style="color:var(--muted2)">(By Client)</small>'
                      : p.type === 'note' ? 'Internal Note<br><small style="color:var(--muted2)">(Admin)</small>'
                      : window._esc(p.label || p.type || 'Payment');
        const amtStr  = p.amount && p.amount > 0 ? '৳' + Number(p.amount).toLocaleString() : '—';
        const method  = p.method || '—';
        const txnId   = p.txn_id ? `<span style="font-size:11px;color:var(--accent2);font-family:monospace">${window._esc(p.txn_id)}</span>` : '—';
        const statusCls = p.confirmed ? 'green' : (p.type==='note'?'muted':'orange');
        const statusLabel = p.confirmed ? 'Approved' : p.type==='note' ? '—' : p.type==='approval'||p.type==='received' ? 'Received' : 'Pending';
        const actionBtn = (p.type === 'advance' || p.type === 'payment' || p.type === 'balance') && !p.confirmed
          ? `<i class="ti ti-eye" style="cursor:pointer;color:var(--accent2)" title="View proof" onclick="odpViewProof('${window._esc(p.screenshot_url||'')}')"></i>
             <i class="ti ti-download" style="cursor:pointer;color:var(--muted2);margin-left:4px" title="Download proof" onclick="odpViewProof('${window._esc(p.screenshot_url||'')}')"></i>`
          : (p.type === 'advance' || p.type === 'payment') && p.confirmed
          ? `<i class="ti ti-eye" style="cursor:pointer;color:var(--muted2)" title="View proof" onclick="odpViewProof('${window._esc(p.screenshot_url||'')}')"></i>`
          : '—';
        const noteStr = p.note ? `<span style="font-size:11px;color:var(--muted2)">${window._esc(p.note)}</span>` : 'Initial payment sent';

        return `<div class="odp-pay-table-row">
          <span style="color:var(--muted2);font-size:11px">${i+1}</span>
          <span style="font-size:11px;color:var(--muted2)">${dateStr}</span>
          <span style="font-size:11.5px">${type}</span>
          <span style="font-size:12px;font-weight:600;color:var(--text)">${amtStr}</span>
          <span style="font-size:11.5px;color:var(--muted2)">${window._esc(method)}<br>${txnId}</span>
          <span class="odp-pay-status-pill ${statusCls}" style="font-size:10px">${statusLabel}</span>
          <span style="display:flex;align-items:center;gap:4px">${actionBtn}</span>
          <span style="font-size:11px;color:var(--muted2)">${noteStr}</span>
        </div>`;
      }).join('');
    } catch(e) {
      el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">Could not load payment history.</div>';
    }
  }

  window.odpViewProof = function(url) {
    if (!url) { window._toast('⚠ No proof uploaded', 'var(--muted)'); return; }
    window.open(url, '_blank');
  };

  /* Live due preview as admin types received amount */
  window.odpUpdateDuePreview = function(val) {
    const total = window.window._currentOrder ? (window.window._currentOrder.total_price || (window.window._currentOrder.detail && window.window._currentOrder.detail.financials && window.window._currentOrder.detail.financials.total) || 0) : 0;
    const received = parseFloat(val) || 0;
    const due = Math.max(0, total - received);
    const preview = document.getElementById('odpDuePreview');
    const previewVal = document.getElementById('odpDuePreviewVal');
    if (preview) preview.style.display = received > 0 ? 'block' : 'none';
    if (previewVal) {
      previewVal.textContent = due > 0 ? '৳' + Number(due).toLocaleString() : '৳0 (Full payment ✓)';
      previewVal.style.color = due === 0 ? 'var(--green)' : 'var(--red)';
    }
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
      const path = `payments/${window.window._currentOrderId}/${f.name}`;
      const { error } = await window._sb().storage.from('order-files').upload(path, f, { upsert: true });
      if (error) throw error;
      section.innerHTML = `<div class="odp-proof-box"><div class="odp-proof-icon"><i class="ti ti-file-invoice"></i></div><div><div class="odp-proof-name">${window._esc(f.name)}</div><div class="odp-proof-sub">${(f.size/1024).toFixed(0)} KB · Uploaded</div></div></div>`;
      window._toast('✓ Payment proof uploaded!', 'var(--green)');
    } catch(e) { window._toast('⚠ Upload failed', 'var(--red)'); }
  };

  window.odpApprovePayment = async function() {
    if (window._sb() && window._isRealUUID(window.window._currentOrderId)) {
      try {
        await window._sb().from('orders').update({ payment_status: 'approved', updated_at: new Date().toISOString() }).eq('id', window.window._currentOrderId);
        await window._sb().from('payments').update({ confirmed: true }).eq('order_id', window.window._currentOrderId).eq('type', 'advance');
        /* Notify client */
        await window._sb().from('client_notifications').insert({ order_id: window.window._currentOrderId, client_id: window.window._currentOrder && window.window._currentOrder.clientId, type: 'payment_approved', message: 'Your payment has been approved! Your order is now in progress.', is_read: false, created_at: new Date().toISOString() }).catch(()=>{});
      } catch(e) { console.error(e); }
    }
    window._appendPayHistoryItem({ label: 'Payment Approved', type: 'approval', method: 'Admin', amount: 0, confirmed: true, created_at: new Date().toISOString() });
    /* Update banner */
    const banner = document.querySelector('.odp-pay-banner');
    if (banner) banner.remove();
    await window._reloadPaymentFinancials();
    await window._loadPaymentHistory();
    window._toast('✓ Payment approved! Client notified.', 'var(--green)');
    window._logActivity('payment', 'Payment approved by admin');
  };

  window.odpRejectPayment = async function() {
    if (!confirm('Reject this payment? Client will need to re-submit.')) return;
    if (window._sb() && window._isRealUUID(window.window._currentOrderId)) {
      try {
        await window._sb().from('orders').update({ payment_status: 'rejected', updated_at: new Date().toISOString() }).eq('id', window.window._currentOrderId);
        await window._sb().from('client_notifications').insert({ order_id: window.window._currentOrderId, client_id: window.window._currentOrder && window.window._currentOrder.clientId, type: 'payment_rejected', message: 'Your payment could not be verified. Please re-submit with correct transaction ID.', is_read: false, created_at: new Date().toISOString() }).catch(()=>{});
      } catch(e) { console.error(e); }
    }
    await window._reloadPaymentFinancials();
    window._toast('Payment rejected. Client notified.', 'var(--red)');
    window._logActivity('payment', 'Payment rejected by admin');
  };

  window.odpMarkPaymentReceived = async function() {
    const recvEl = document.getElementById('odpReceivedAmount');
    const received = recvEl ? (parseFloat(recvEl.value) || 0) : 0;
    const total = window.window._currentOrder ? (window.window._currentOrder.total_price || (window.window._currentOrder.detail && window.window._currentOrder.detail.financials && window.window._currentOrder.detail.financials.total) || 0) : 0;
    const due = Math.max(0, total - received);

    if (received <= 0) {
      window._toast('⚠ আগে received amount টাইপ করুন', 'var(--gold)');
      document.getElementById('odpReceivedAmount')?.focus();
      return;
    }

    if (window._sb() && window._isRealUUID(window.window._currentOrderId)) {
      try {
        await window._sb().from('orders').update({
          payment_status: due === 0 ? 'paid' : 'approved',
          advance_paid:   received,
          due_amount:     due,
          updated_at:     new Date().toISOString()
        }).eq('id', window.window._currentOrderId);

        await window._sb().from('payments').insert({
          order_id:   window.window._currentOrderId,
          label:      'Payment Received',
          type:       'received',
          method:     'Admin',
          amount:     received,
          confirmed:  true,
          paid_at:    new Date().toISOString()
        });

        await window._sb().from('client_notifications').insert({
          order_id:   window.window._currentOrderId,
          client_id:  window.window._currentOrder && window.window._currentOrder.clientId,
          type:       'payment_received',
          message:    due === 0
            ? 'আপনার সম্পূর্ণ payment পাওয়া গেছে! Files এখন unlock হয়েছে।'
            : `৳${Number(received).toLocaleString()} payment পাওয়া গেছে। বাকি ৳${Number(due).toLocaleString()} পরিশোধ করুন।`,
          is_read:    false,
          created_at: new Date().toISOString()
        }).catch(()=>{});

        /* due = 0 হলে সব file এর download_allowed automatically true */
        if (due === 0) {
          await window._sb().from('order_file_access')
            .update({ download_allowed: true, updated_at: new Date().toISOString() })
            .eq('order_id', window.window._currentOrderId);
          /* local cache update */
          Object.keys(window._fileMetaCache || {}).forEach(path => {
            if (window._fileMetaCache[path]) window._fileMetaCache[path].download_allowed = true;
          });
          window._toast('✅ Due cleared! সব files download unlock হয়েছে।', 'var(--green)');
        }
      } catch(e) { console.error(e); window._toast('⚠ Error: ' + e.message, 'var(--red)'); return; }
    }

    /* Update summary stat cards live */
    const sentEl = document.querySelector('#odpClientSentAmount');
    window._appendPayHistoryItem({ label: 'Payment Received', type: 'received', method: 'Admin', amount: received, confirmed: true, created_at: new Date().toISOString() });

    /* Update due/paid display */
    const banner = document.querySelector('.odp-pay-banner');
    if (banner && due === 0) banner.remove();
    const dueNote = document.querySelector('.odp-pay-due-note');
    if (dueNote && due === 0) dueNote.remove();

    await window._reloadPaymentFinancials();
    await window._loadPaymentHistory();

    const msg = due === 0
      ? '✓ Full payment received! Files unlocked. Client notified.'
      : `✓ ৳${Number(received).toLocaleString()} received. Due: ৳${Number(due).toLocaleString()}. Client notified.`;
    window._toast(msg, due === 0 ? 'var(--green)' : 'var(--gold)');
    window._logActivity('payment', `Payment received: ৳${received}. Due: ৳${due}`);
  };

  window.odpMarkPaid = window.odpMarkPaymentReceived;

  window.odpSavePayNote = async function() {
    const note = document.getElementById('odpPayNote');
    if (!note || !note.value.trim()) return;
    const text = note.value.trim();

    /* Mock order — শুধু UI তে history add করো */
    if (!window._sb() || !window._isRealUUID(window.window._currentOrderId)) {
      window._appendPayHistoryItem({ label: 'Internal Note', type: 'note', method: 'Admin', amount: null, created_at: new Date().toISOString(), note: text });
      note.value = '';
      window._toast('✓ Note saved (mock mode)!', 'var(--green)');
      return;
    }

    /* Real order — Supabase payments table এ insert */
    try {
      const { error } = await window._sb().from('payments').insert({
        order_id:   window.window._currentOrderId,
        label:      'Internal Note',
        type:       'note',
        method:     'Admin',
        amount:     0,
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
          await _reloadPaymentFinancials();
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

window._reloadPaymentFinancials = async function() {
    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) return;
    try {
      const [{ data: ord }, { data: pays }] = await Promise.all([
        window._sb().from('orders').select('amount,advance_paid,payment_status').eq('id', window._currentOrderId).single(),
        window._sb().from('payments').select('amount,type,confirmed').eq('order_id', window._currentOrderId)
      ]);
      if (!ord || !window._currentOrder) return;

      const total = Number(ord.total_price || 0) || Number(String((window._currentOrder && window._currentOrder.amount) || "").replace(/[^\d]/g, "")) || 0;
      let paid = 0;
      if (pays && pays.length) {
        paid = pays
          .filter(p => p.confirmed && (p.type === 'received' || p.type === 'approval'))
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        if (paid === 0 && ord.advance_paid) paid = Number(ord.advance_paid);
      } else if (ord.advance_paid) {
        paid = Number(ord.advance_paid);
      }
      const due     = Math.max(0, total - paid);
      const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

      if (!window._currentOrder.detail) window._currentOrder.detail = {};
      window._currentOrder.detail.financials = { total, paid, due, paidPct };
      window._currentOrder.paymentStatus = ord.payment_status || window._currentOrder.paymentStatus;

      window._syncOrderInfoPayments(window._currentOrder);

      /* Live update stat cards inside Payments tab */
      const sp = document.getElementById('odpPaySummaryPaid');
      const sd = document.getElementById('odpPaySummaryDue');
      const st = document.getElementById('odpPaySummaryTotal');
      if (sp) sp.textContent = paid  ? '৳' + Number(paid).toLocaleString()  : '৳0';
      if (sd) sd.textContent = due   ? '৳' + Number(due).toLocaleString()   : '৳0';
      if (st) st.textContent = total ? '৳' + Number(total).toLocaleString() : '—';

      /* Live update progress bar */
      const fill = document.querySelector('.odp-progress-fill.pf-green');
      const pct  = document.querySelector('.odp-pay-progress-row span[style*="font-weight:7"]');
      if (fill) fill.style.width = paidPct + '%';
      if (pct)  pct.textContent  = paidPct + '%';

    } catch(e) { console.error('_reloadPaymentFinancials:', e); }
  }

  /* ══ THESIS DETAILS CARD — Overview tab ══
     Reads real Supabase `orders` columns and renders
     every submitted field in a clean grouped layout.
  ══════════════════════════════════════════════════ */
