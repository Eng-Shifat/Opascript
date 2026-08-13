/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — ODP Activity Tab
   Depends on: order-details-panel.js (shared state & helpers)
═══════════════════════════════════════════════════════════════════ */
'use strict';

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
window._renderOvTimeline = function(order) {
    const el = document.getElementById('odpOvTimeline');
    if (!el) return;
    const d = order.detail || {};
    const milestones = d.milestones || [
      { name:'Order Created',      state:'pending', date:'' },
      { name:'Payment Received',   state:'pending', date:'' },
      { name:'Topic Approved',     state:'pending', date:'' },
      { name:'Writing in Progress',state:'pending', date:'' },
      { name:'Review Phase',       state:'pending', date:'' },
      { name:'Final Delivery',     state:'pending', date:'' },
    ];
    el.innerHTML = milestones.map(ms => {
      const cls = ms.state === 'done' ? 'done' : ms.state === 'active' ? 'active' : '';
      const icon = ms.state === 'done' ? '<i class="ti ti-check"></i>' : ms.state === 'active' ? '<i class="ti ti-writing"></i>' : '<i class="ti ti-clock"></i>';
      return `<div class="odp-ov-tl-item">
        <div class="odp-ov-tl-dot ${cls}">${icon}</div>
        <div class="odp-ov-tl-lbl ${cls}">${window._esc(ms.name)}</div>
        <div class="odp-ov-tl-date">${window._esc(ms.date||'Pending')}</div>
      </div>`;
    }).join('');
  }

  /* In-memory activity log for current session */
  /* global — defined in order-details-panel.js */
window._logActivity = function(type, text) {
    const colorMap = { status:'green', milestone:'yellow', file_upload:'green', payment:'green', confirm:'purple', message:'blue' };
    window._activityLog.unshift({ color: colorMap[type]||'blue', time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), text, sub:'' });
    /* Re-render activity if tab is active */
    const actPane = document.querySelector('.odp-pane[data-odp-pane="activity"]');
    if (actPane && actPane.classList.contains('odp-pane-active')) window._loadActivity();
  }

  /* ══════════════════════════════════════════════════════════
     LOAD CLIENT ORDER COUNT
  ══════════════════════════════════════════════════════════ */
window._loadClientOrderCount = async function() {
    if (!window._sb() || !window._currentOrder) return;
    const clientId = window._currentOrder.clientId || window._currentOrder.rawClientId || '';
    if (!clientId || !window._isRealUUID(window._currentOrderId)) return;

    try {
      /* Total orders count */
      const { count } = await window._sb()
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);

      const elOrders = document.getElementById('odpClientOrders');
      if (elOrders && count !== null) elOrders.textContent = count;

      /* Active orders */
      const { count: activeCount } = await window._sb()
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .in('status', ['pending', 'confirmed', 'writing', 'draft_ready']);

      const elActive = document.getElementById('odpClientActive');
      if (elActive && activeCount !== null) elActive.textContent = activeCount;

      /* Total spend — advance_paid থেকে actual paid amount নাও (paid + approved উভয় ক্ষেত্রে) */
      const { data: spendData } = await window._sb()
        .from('orders')
        .select('advance_paid, total_price, payment_status')
        .eq('client_id', clientId)
        .in('payment_status', ['paid', 'approved']);

      const elSpend = document.getElementById('odpClientSpend');
      if (elSpend && spendData) {
        const total = spendData.reduce((s, o) => {
          const paid = Number(o.advance_paid) || 0;
          const full = Number(o.total_price)  || 0;
          /* paid status মানে full paid, approved মানে advance_paid amount */
          return s + (o.payment_status === 'paid' ? full : paid);
        }, 0);
        elSpend.textContent = total > 0 ? '৳' + total.toLocaleString() : '৳0';
      }

      /* Client ID short display */
      const elId = document.getElementById('odpClientId');
      if (elId) elId.textContent = clientId.slice(0, 8).toUpperCase();

    } catch(e) { console.error('client stats error', e); }
  }


/* ── Client-uploaded files count for Order Summary ─────────────── */
window._loadClientFilesCount = async function() {
  if (!window._sb() || !window._isRealUUID(window._currentOrderId)) return;
  try {
    const safeId = window._currentOrderId.replace(/[#?&=\s]/g, '_');
    const path   = `orders/${safeId}`;

    /* Storage থেকে file list নাও */
    const { data: storageFiles } = await window._sb()
      .storage.from('order-files').list(path, { limit: 100 });

    const totalFiles = storageFiles ? storageFiles.length : 0;

    /* order_file_access থেকে uploaded_by চেক করার চেষ্টা (column না থাকলেও চলবে) */
    let clientCount = 0;
    try {
      const { data: accessRows } = await window._sb()
        .from('order_file_access')
        .select('uploaded_by')
        .eq('order_id', window._currentOrderId);
      if (accessRows) {
        clientCount = accessRows.filter(r => r.uploaded_by === 'Client').length;
      }
    } catch(_) { /* uploaded_by column নেই — ignore */ }

    const elAttach = document.getElementById('odpClientAttachCount');
    if (elAttach) {
      if (totalFiles === 0) {
        elAttach.textContent = 'No files yet';
      } else if (clientCount > 0) {
        elAttach.textContent = `${clientCount} client file${clientCount > 1 ? 's' : ''} (${totalFiles} total)`;
      } else {
        elAttach.textContent = `${totalFiles} file${totalFiles > 1 ? 's' : ''}`;
      }
    }
  } catch(e) { 
    console.warn('[FilesCount]', e);
    const elAttach = document.getElementById('odpClientAttachCount');
    if (elAttach) elAttach.textContent = '—';
  }
};
