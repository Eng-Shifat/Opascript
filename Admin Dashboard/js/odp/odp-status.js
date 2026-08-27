/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — ODP Status & Milestone
   Depends on: order-details-panel.js (shared state & helpers)
═══════════════════════════════════════════════════════════════════ */
'use strict';

  /* ══════════════════════════════════════════════════════════
     STATUS & MILESTONE UPDATE
  ══════════════════════════════════════════════════════════ */
  const STATUS_LABELS = {
    'writing':     'In Progress',
    'completed':   'Completed',
    'pending':     'Pending',
    'draft_ready': 'Delivered',
    'in_review':   'Client Review',
    'overdue':     'Overdue',
    'hold':        'On Hold',
    'revision':    'Revision in Progress',
    'delivered':   'Final Delivery Sent',
  };

  const STATUS_EMOJI = {
    'writing':     '🔵',
    'completed':   '🟢',
    'pending':     '🟡',
    'draft_ready': '🔷',
    'in_review':   '🔶',
    'overdue':     '🔴',
    'hold':        '⚫',
    'revision':    '✏️',
    'delivered':   '🚚',
  };

  window.odpMarkCompleted = function() {
    if (confirm('Mark this order as Completed?')) {
      window.odpUpdateStatus('completed');
    }
  };

  window.odpUpdateStatus = async function(val) {
    if (!window._sb()) {
      window._toast('⚠ Supabase not connected', 'var(--red)');
      return;
    }

    const sel = document.getElementById('odpStatusSelect');
    const btn = document.querySelector('.odp-btn-accent.odp-btn-sm');
    if (sel) sel.disabled = true;
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

    /* Mock order — শুধু UI update, DB skip */
    if (!window._isRealUUID(window._currentOrderId)) {
      const label = STATUS_LABELS[val] || val;
      const cls = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', delivered:'s-review', revision:'s-revision', overdue:'s-overdue', hold:'s-pending' }[val] || 's-pending';
      document.querySelectorAll('.odp-status-pill').forEach(pill => {
        pill.className = 'odp-status-pill ' + cls;
        pill.textContent = label;
      });
      /* Update mock ORDERS array in order-management.js if accessible */
      if (window.ORDERS && window._currentOrder) {
        const o = window.ORDERS.find(x => x.id === window._currentOrderId);
        if (o) {
          const clsMap = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', delivered:'s-review', overdue:'s-overdue', hold:'s-pending' };
          const lblMap = STATUS_LABELS;
          o.status = lblMap[val] || val;
          o.statusClass = clsMap[val] || 's-pending';
          if (typeof renderTable === 'function') renderTable();
        }
      }
      if (sel) sel.disabled = false;
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      window._toast(`✓ Status → "${label}" (mock mode — DB update বাদ)`, 'var(--green)');
      return;
    }

    try {
      /* 1. Update order status in DB */
      const { error: orderErr } = await window._sb()
        .from('orders')
        .update({ status: val, updated_at: new Date().toISOString() })
        .eq('id', window._currentOrderId);

      if (orderErr) throw orderErr;

      /* 2. Update ALL status pills in the panel immediately */
      const cls = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', delivered:'s-review', in_review:'s-review', revision:'s-revision', overdue:'s-overdue', hold:'s-pending' }[val] || 's-pending';
      document.querySelectorAll('.odp-status-pill').forEach(pill => {
        pill.className = 'odp-status-pill ' + cls;
        pill.textContent = STATUS_LABELS[val] || val;
      });

      /* 3. Send notification message to client via messages table */
      const label = STATUS_LABELS[val] || val;
      const emoji = STATUS_EMOJI[val] || '📋';
      const notifyText = `${emoji} আপনার অর্ডারের status update হয়েছে: "${label}"\n\nযেকোনো প্রশ্ন থাকলে আমাদের জানান।`;

      await window._sb().from('messages').insert({
        order_id:   window._currentOrderId,
        text:       notifyText,
        from_admin: true,
        read:       false,
        sent_at:    new Date().toISOString(),
      });

      /* 3b. Insert into client_notifications for bell icon */
      try {
        await window._sb().from('client_notifications').insert({
          order_id:   window._currentOrderId,
          client_id:  window._currentOrder?.clientId || null,
          type:       'status_change',
          message:    `${emoji} আপনার অর্ডারের status update হয়েছে: "${label}"`,
          is_read:    false,
          created_at: new Date().toISOString(),
        });
      } catch(_ne) {}

      /* 4. Log in activity */
      window._logActivity('status', `Status changed to: ${label}`);

      /* 5. Update order-management table row badge if visible */
      const rowEl = document.querySelector(`tr[data-order-id="${window._currentOrderId}"] .status-badge, .order-row-${window._currentOrderId} .status-badge`);
      if (rowEl) {
        rowEl.className = 'status-badge s-' + (val === 'writing' ? 'inprogress' : val === 'draft_ready' ? 'review' : val);
        rowEl.textContent = label;
      }

      window._toast(`✓ Status → "${label}" · Client কে notification পাঠানো হয়েছে`, 'var(--green)');

      /* Refresh ORDER PROGRESS sidebar immediately */
      if (window._currentOrder) {
        window._currentOrder.status = val;
        window._currentOrder.statusClass = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', delivered:'s-review', in_review:'s-review', revision:'s-revision', overdue:'s-overdue', hold:'s-pending' }[val] || 's-pending';
        if (window._currentOrder._rawDB) window._currentOrder._rawDB.status = val;
      }
      if (typeof _refreshOverviewSidebar === 'function') _refreshOverviewSidebar();

    } catch(e) {
      console.error('Status update error:', e);
      window._toast('⚠ Update failed: ' + (e.message || 'Unknown error'), 'var(--red)');
    } finally {
      if (sel) sel.disabled = false;
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    }
  };

  window.odpUpdateMilestone = async function(val) {
    if (window._sb()) {
      try {
        await window._sb().from('orders').update({
          current_milestone: val,
          updated_at: new Date().toISOString()
        }).eq('id', window._currentOrderId);

        /* Notify client about milestone change */
        await window._sb().from('messages').insert({
          order_id:   window._currentOrderId,
          text:       `📌 Milestone update: আপনার thesis এখন "${val}" পর্যায়ে আছে।`,
          from_admin: true,
          read:       false,
          sent_at:    new Date().toISOString(),
        });
        await window._sb().from('client_notifications').insert({
          order_id:   window._currentOrderId,
          client_id:  window._currentOrder?.clientId || null,
          type:       'status_change',
          message:    `📌 Milestone update: আপনার thesis এখন "${val}" পর্যায়ে আছে।`,
          is_read:    false,
          created_at: new Date().toISOString(),
        });
      } catch(e) {}
    }
    window._toast(`✓ Milestone → "${val}" · Client notified`, 'var(--accent)');
    window._logActivity('milestone', `Milestone updated: ${val}`);
  };

  window.odpConfirmOrder = async function() {
    if (window._sb()) {
      try { await window._sb().from('orders').update({ confirmed_at: new Date().toISOString() }).eq('id', window._currentOrderId); } catch(e) {}
    }
    window._toast('✓ Order confirmed and activated!', 'var(--green)');
    window._logActivity('confirm', 'Order confirmed by admin');
  };

  /* ══════════════════════════════════════════════════════════
     CLIENT REVIEW REQUEST BANNER
     in_review status এ client এর message দেখায়
  ══════════════════════════════════════════════════════════ */
  window._loadClientReviewRequest = async function() {
    const wrap = document.getElementById('odpClientReviewWrap');
    if (!wrap) return;
    wrap.innerHTML = '';

    if (!window._currentOrder || window._currentOrder.status !== 'in_review') return;
    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) return;

    try {
      const { data } = await window._sb()
        .from('messages')
        .select('text, sent_at')
        .eq('order_id', window._currentOrderId)
        .eq('from_admin', false)
        .ilike('text', '🔄 Review Request:%')
        .order('sent_at', { ascending: false })
        .limit(1);

      const reviewText = data && data.length
        ? (data[0].text || '').replace('🔄 Review Request:\n\n', '')
        : '(Client কোনো বিবরণ দেননি)';

      wrap.innerHTML = `
        <div style="
          background:linear-gradient(135deg,rgba(251,191,36,0.1) 0%,rgba(217,119,6,0.07) 100%);
          border:1px solid rgba(251,191,36,0.35);border-radius:12px;
          padding:16px 18px;margin-top:10px;
        ">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:18px;">🔶</span>
            <span style="font-size:13px;font-weight:700;color:#fbbf24;">Client Review Request</span>
          </div>
          <div style="font-size:12px;color:#e2e8f0;background:rgba(0,0,0,0.2);border-radius:8px;padding:10px 12px;line-height:1.7;white-space:pre-wrap;">${window._esc ? window._esc(reviewText) : reviewText}</div>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="window.odpUpdateStatus('draft_ready')" style="
              width:100%;padding:9px 14px;border-radius:8px;border:none;cursor:pointer;
              background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;
              font-size:12px;font-weight:700;
            ">📦 সমাধান করে আবার Deliver করুন</button>
            <button onclick="window.odpUpdateStatus('writing')" style="
              width:100%;padding:9px 14px;border-radius:8px;border:1px solid rgba(99,102,241,0.3);cursor:pointer;
              background:transparent;color:#94a3b8;font-size:12px;font-weight:600;
            ">🔵 Writing এ ফিরিয়ে নিন</button>
          </div>
        </div>
      `;
    } catch(e) {
      console.warn('[ReviewBanner]', e);
    }
  };

  /* ══════════════════════════════════════════════════════════
     ACTIVITY TIMELINE
  ══════════════════════════════════════════════════════════ */
  window._loadActivity = async function() {
    const el = document.getElementById('odpActivityList');
    if (!el) return;

    /* Build from messages + static events */
    const staticEvents = [
      { color:'yellow', time: window._currentOrder ? (window._currentOrder.deadline ? `Deadline: ${window._currentOrder.deadline}` : '') : '', text:'Order created', sub:`${window._currentOrder?.pkg||'Thesis'} · Deadline: ${window._currentOrder?.deadline||''} ${window._currentOrder?.deadlineTime||''}` },
      { color:'purple', time:'', text:'Writer assigned', sub:'Assigned by Admin' },
      { color:'green',  time:'', text:'Payment received', sub:`Amount: ${window._currentOrder?.amount||'—'}` },
      { color:'blue',   time:'', text:'Brief submitted', sub:'Client uploaded research brief' },
    ];

    let extraEvents = [];
    if (window._sb() && window._isRealUUID(window._currentOrderId)) {
      try {
        const { data } = await window._sb().from('messages').select('sent_at,from_admin,text').eq('order_id', window._currentOrderId).order('sent_at',{ascending:false}).limit(5);
        extraEvents = (data||[]).map(m => ({
          color: m.from_admin ? 'blue' : 'purple',
          time: m.sent_at ? new Date(m.sent_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '',
          text: m.from_admin ? 'Message sent by admin' : 'Message received from client',
          sub: (m.text||'').substring(0,60) + ((m.text||'').length>60?'…':''),
        }));
      } catch(e) {}
    }

    const allEvents = [...window._activityLog, ...extraEvents, ...staticEvents];
    if (!allEvents.length) { el.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px 0">No activity recorded yet.</div>'; return; }

    el.innerHTML = `<div class="odp-timeline">${allEvents.map(ev => `
      <div class="odp-tl-item">
        <div class="odp-tl-dot ${ev.color}"></div>
        ${ev.time ? `<div class="odp-tl-time">${window._esc(ev.time)}</div>` : ''}
        <div class="odp-tl-text"><span class="tl-em" style="color:var(--${ev.color==='blue'?'accent2':ev.color==='yellow'?'yellow':ev.color==='red'?'red':'green'})">${window._esc(ev.text)}</span></div>
        ${ev.sub ? `<div class="odp-tl-sub">${window._esc(ev.sub)}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }

  /* ── Render overview horizontal timeline ── */
