/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — ODP Build — HTML Templates
   Depends on: order-details-panel.js (shared state & helpers)
═══════════════════════════════════════════════════════════════════ */
'use strict';

window._buildShell = function(order) {
    const d = order.detail || {};
    const statusClass = order.statusClass || 's-pending';
    const statusLabel = { 's-inprogress':'In Progress','s-completed':'Completed','s-overdue':'Overdue','s-pending':'Pending','s-review':'In Review' }[statusClass] || order.status;

    return `
<div class="odp-overlay" id="odpOverlay">

  <!-- TOPBAR -->
  <div class="odp-topbar">
    <button class="odp-back" onclick="closeOrderDetailsPanel()">
      <i class="ti ti-arrow-left"></i> Back to Orders
    </button>
    <div class="odp-spacer"></div>
    <div class="odp-topbar-actions">
      <button class="odp-btn odp-btn-sm" onclick="odpSwitchTab('messages')">
        <i class="ti ti-message-circle"></i> Message
      </button>
      <button class="odp-btn odp-btn-accent odp-btn-sm" onclick="odpSwitchTab('files')">
        <i class="ti ti-upload"></i> Upload
      </button>
      <button class="odp-icon-btn" title="More"><i class="ti ti-dots"></i></button>
    </div>
  </div>

  <!-- HEADER CARD -->
  <div class="odp-header-card">
    <div class="odp-header-icon-wrap">
      <div class="odp-header-icon"><i class="ti ti-file-description"></i></div>
    </div>
    <div class="odp-header-left">
      <div class="odp-title-row">
        <div class="odp-title">${window._esc(order.topic)}</div>
        <span class="odp-status-pill ${statusClass}">${window._esc(statusLabel)}</span>
      </div>
      <div class="odp-meta-row">
        <span class="odp-meta-item"><i class="ti ti-file-invoice"></i> Order ID: <b>${window._esc(order.orderId||order.id)}</b></span>
        <span class="odp-meta-sep">·</span>
        <span class="odp-meta-item" id="odpHeaderClient"><i class="ti ti-user"></i> Client: <b>${window._esc(order.client || order.uni || '—')}</b></span>
        <span class="odp-meta-sep">·</span>
        <span class="odp-meta-item"><i class="ti ti-building"></i> Department: <b>${window._esc(order.pkg)}</b></span>
        <span class="odp-meta-sep">·</span>
        <span class="odp-meta-item odp-meta-deadline"><i class="ti ti-alarm"></i> Deadline: <b>${window._esc(order.deadline)} ${window._esc(order.deadlineTime)}</b></span>
        <span class="odp-meta-sep">·</span>
        <span class="odp-meta-item odp-meta-amount"><i class="ti ti-cash"></i> <b>${window._esc(order.amount)}</b></span>
      </div>
    </div>
  </div>

  <!-- TABS -->
  <div class="odp-tabs-wrap">
    <div class="odp-tabs">
      <button class="odp-tab odp-active" data-odp-tab="overview"  onclick="odpSwitchTab('overview')"><i class="ti ti-layout-2"></i> Overview</button>
      <button class="odp-tab"            data-odp-tab="summary"   onclick="odpSwitchTab('summary')"><i class="ti ti-clipboard-list"></i> Order Summary</button>
      <button class="odp-tab"            data-odp-tab="files"     onclick="odpSwitchTab('files')"><i class="ti ti-files"></i> Files</button>
      <button class="odp-tab"            data-odp-tab="payments"  onclick="odpSwitchTab('payments')"><i class="ti ti-credit-card"></i> Payments</button>
      <button class="odp-tab"            data-odp-tab="messages"  onclick="odpSwitchTab('messages')"><i class="ti ti-message-dots"></i> Messages</button>
      <button class="odp-tab"            data-odp-tab="activity"  onclick="odpSwitchTab('activity')"><i class="ti ti-timeline"></i> Activity</button>
    </div>
  </div>

  <!-- BODY -->
  <div class="odp-body" id="odpBody">

    <!-- ══ OVERVIEW ══ -->
    <div class="odp-pane odp-pane-active" data-odp-pane="overview">
      ${window._buildOverviewHTML(order, statusClass)}
    </div>

    <!-- ══ ORDER SUMMARY ══ -->
    <div class="odp-pane" data-odp-pane="summary">
      ${window._buildOrderSummaryHTML(order)}
    </div>

    <!-- ══ FILES ══ -->
    <div class="odp-pane" data-odp-pane="files">
      <div class="odp-upload-zone" id="odpDropZone" onclick="document.getElementById('odpFileInput').click()" ondragover="odpDragOver(event)" ondrop="odpDrop(event)">
        <i class="ti ti-cloud-upload"></i>
        <p>Drag & drop files here, or <span>browse to upload</span></p>
        <p style="margin-top:4px;font-size:11px;color:var(--muted)">PDF, DOCX, ZIP, Images — max 50MB</p>
      </div>
      <input type="file" id="odpFileInput" style="display:none" multiple onchange="odpUploadFiles(this.files)">
      <div class="odp-card">
        <div class="odp-card-title"><i class="ti ti-folder-open"></i> Uploaded Files</div>
        <div class="odp-file-list" id="odpFileList">
          <div class="odp-loading"><div class="odp-spinner"></div> Loading files…</div>
        </div>
      </div>
    </div>

    <!-- ══ PAYMENTS ══ -->
    <div class="odp-pane" data-odp-pane="payments">
      ${window._buildPaymentsHTML(order)}
    </div>

    <!-- ══ MESSAGES ══ -->
    <div class="odp-pane" data-odp-pane="messages">
      <div class="odp-card">
        <div class="odp-card-title"><i class="ti ti-messages"></i> Conversation with ${window._esc(order.client)}</div>
        <div class="odp-msg-list" id="odpMsgList">
          <div class="odp-loading"><div class="odp-spinner"></div> Loading messages…</div>
        </div>
        <div class="odp-msg-input-area">
          <textarea class="odp-msg-textarea" id="odpMsgInput" placeholder="Type your message to ${window._esc(order.client)}…"></textarea>
          <div class="odp-msg-footer">
            <label class="odp-notify-check"><input type="checkbox" id="odpNotifyCheck" checked> Send email notification to client</label>
            <button class="odp-btn odp-btn-accent odp-btn-sm" onclick="odpSendMessage()"><i class="ti ti-send"></i> Send</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ ACTIVITY ══ -->
    <div class="odp-pane" data-odp-pane="activity">
      <div class="odp-card">
        <div class="odp-card-title"><i class="ti ti-activity"></i> Order Activity Timeline</div>
        <div id="odpActivityList">
          <div class="odp-loading"><div class="odp-spinner"></div> Loading activity…</div>
        </div>
      </div>
    </div>

  </div><!-- /odp-body -->
</div>`;
  }


  /* ══ OVERVIEW HTML ══ */
window._buildOverviewHTML = function(order, statusClass) {
    const d = order.detail || {};
    statusClass = statusClass || order.statusClass || 's-pending';
    const pct = d.overall || order.progressPct || 0;
    const pctColor = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';
    const pfClass  = pct >= 80 ? 'pf-green'    : pct >= 40 ? 'pf-yellow'     : 'pf-red';
    const pageCount = window._getPageCount(order);

    /* Milestone steps */
    const milestones = d.milestones || [
      { name:'Order Placed',       state:'pending' },
      { name:'Payment Confirmed',  state:'pending' },
      { name:'Topic Approved',     state:'pending' },
      { name:'Writing in Progress',state:'pending' },
      { name:'Review Phase',       state:'pending' },
      { name:'Final Delivery',     state:'pending' },
    ];

    const msHTML = milestones.map((ms, i) => {
      const isDone   = ms.state === 'done';
      const isActive = ms.state === 'active';
      const dotCls   = isDone ? 'odp-ms-dot done' : isActive ? 'odp-ms-dot active' : 'odp-ms-dot';
      const nameCls  = isActive ? 'odp-ms-name active' : isDone ? 'odp-ms-name done' : 'odp-ms-name';
      const icon     = isDone ? '<i class="ti ti-check"></i>' : isActive ? '<i class="ti ti-writing"></i>' : '';
      return `<div class="odp-ms-item">
        <div class="${dotCls}">${icon}</div>
        ${i < milestones.length - 1 ? '<div class="odp-ms-line"></div>' : ''}
        <div class="odp-ms-label">
          <div class="${nameCls}">${window._esc(ms.name)}</div>
          <div class="odp-ms-date">${window._esc(ms.date||'Pending')}</div>
        </div>
      </div>`;
    }).join('');

    return `
    <!-- 2-col layout: [main content] | [right sidebar: progress + quick actions] -->
    <div class="odp-ov-grid odp-ov-grid-sidebar">

      <!-- ── LEFT / MAIN COLUMN ── -->
      <div class="odp-ov-main-col">

        <!-- Top row: Client Info + Academic Summary side by side -->
        <div class="odp-ov-top-row">

          <!-- Client Info -->
          <div class="odp-card odp-client-card">
            <div class="odp-card-title"><i class="ti ti-user-circle"></i> Client Information</div>
            <div class="odp-cc-header">
              <div class="odp-cc-av" style="background:${window._esc(order.avatarColor)}">${window._esc(order.initials)}</div>
              <div class="odp-cc-info">
                <div class="odp-cc-name">${window._esc(order.client)} <span class="odp-cc-badge-verified"><i class="ti ti-shield-check"></i> Verified</span></div>
                <div class="odp-cc-uni">${window._esc(order.uni)}</div>
              </div>
              <div class="odp-cc-icon-actions">
                <button class="odp-cc-icon-btn" title="Message" onclick="odpSwitchTab('messages')"><i class="ti ti-message-circle"></i></button>
                <button class="odp-cc-icon-btn" title="Call"><i class="ti ti-phone"></i></button>
                <button class="odp-cc-icon-btn" title="View Profile"><i class="ti ti-user"></i></button>
              </div>
            </div>
            <div class="odp-cc-contact-rows">
              <div class="odp-cc-contact-row">
                <i class="ti ti-mail odp-cc-contact-icon"></i>
                <a class="odp-cc-contact-val" href="mailto:${window._esc(d.email||'')} " id="odpClientEmail">${window._esc(d.email||'—')}</a>
              </div>
              <div class="odp-cc-contact-row">
                <i class="ti ti-device-mobile odp-cc-contact-icon"></i>
                <span class="odp-cc-contact-val" id="odpClientPhone">${window._esc(d.phone||'—')}</span>
              </div>
            </div>
            <div class="odp-cc-divider"></div>
            <div class="odp-cc-stats">
              <div class="odp-cc-stat">
                <div class="odp-cc-stat-val" id="odpClientOrders">—</div>
                <div class="odp-cc-stat-lbl">Total Orders</div>
              </div>
              <div class="odp-cc-stat-sep"></div>
              <div class="odp-cc-stat">
                <div class="odp-cc-stat-val" id="odpClientSpend">—</div>
                <div class="odp-cc-stat-lbl">Total Spent</div>
              </div>
              <div class="odp-cc-stat-sep"></div>
              <div class="odp-cc-stat">
                <div class="odp-cc-stat-val odp-cc-stat-active" id="odpClientRating">4.9 ★</div>
                <div class="odp-cc-stat-lbl">Client Rating</div>
              </div>
            </div>
          </div>

          <!-- Academic Summary -->
          <div class="odp-card odp-academic-card">
            <div class="odp-card-title"><i class="ti ti-book"></i> Academic Summary</div>
            <div class="odp-info-grid odp-info-grid-2col" id="odpThesisDetailsCard">${window._buildAcademicSummaryHTML(order)}</div>
          </div>

        </div><!-- /odp-ov-top-row -->

        <!-- Order Information — full width of main column -->
        ${window._buildOrderInformationHTML(order, d, pageCount)}

      </div><!-- /odp-ov-main-col -->

      <!-- ── RIGHT SIDEBAR ── -->
      <div class="odp-ov-sidebar">

        <!-- Order Progress — vertical timeline -->
        <div class="odp-card odp-progress-card odp-vt-card">
          <div class="odp-card-title"><i class="ti ti-chart-bar"></i> Order Progress</div>
          <div class="odp-vt-steps">
            ${milestones.map((ms, i) => {
              const isDone   = ms.state === 'done';
              const isActive = ms.state === 'active';
              const dotCls   = isDone ? 'done' : isActive ? 'active' : '';
              const icon     = isDone ? '<i class="ti ti-check"></i>' : isActive ? '<div class="odp-vt-pulse"></div>' : '';
              return `<div class="odp-vt-step">
                <div class="odp-vt-dot-wrap">
                  <div class="odp-vt-dot ${dotCls}">${icon}</div>
                  ${i < milestones.length - 1 ? `<div class="odp-vt-line ${isDone ? 'done' : isActive ? 'active' : ''}"></div>` : ''}
                </div>
                <div class="odp-vt-body">
                  <div class="odp-vt-name ${dotCls}">${window._esc(ms.name)}</div>
                  <div class="odp-vt-date">${window._esc(ms.date || 'Pending')}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
          <div class="odp-prog-label-row" style="margin-top:16px">
            <span>Overall Progress</span>
            <span style="color:${pctColor};font-weight:800">${pct}%</span>
          </div>
          <div class="odp-progress-track" style="margin:6px 0 4px">
            <div class="odp-progress-fill ${pfClass}" style="width:${pct}%"></div>
          </div>
          <div class="odp-prog-phase-pill">
            <span class="odp-prog-dot ${pfClass}"></span>
            ${statusClass === 's-inprogress' ? 'In Progress' : statusClass === 's-review' ? 'Review Phase' : statusClass === 's-completed' ? 'Completed' : 'Pending'}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="odp-card odp-qa-card">
          <div class="odp-card-title"><i class="ti ti-bolt"></i> Quick Actions</div>
          <div class="odp-qa-list">
            <button class="odp-qa-btn odp-qa-primary" onclick="odpSwitchTab('files')">
              <i class="ti ti-upload"></i> Upload / Submit Draft
            </button>
            <button class="odp-qa-btn" onclick="odpSwitchTab('messages')">
              <i class="ti ti-message-circle"></i> Send Message to Client
            </button>
            <div class="odp-qa-select-wrap">
              <i class="ti ti-edit"></i>
              <select class="odp-qa-select" id="odpStatusSelect" onchange="odpUpdateStatus(this.value)">
                <option value="" disabled selected>Update Order Status</option>
                <option value="writing"     ${order.statusClass==='s-inprogress'?'selected':''}>🔵 In Progress</option>
                <option value="completed"   ${order.statusClass==='s-completed' ?'selected':''}>🟢 Completed</option>
                <option value="pending"     ${order.statusClass==='s-pending'   ?'selected':''}>🟡 Pending</option>
                <option value="draft_ready" ${order.statusClass==='s-review'    ?'selected':''}>🔷 Draft Ready</option>
                <option value="overdue"     ${order.statusClass==='s-overdue'   ?'selected':''}>🔴 Overdue</option>
                <option value="hold">⚫ On Hold</option>
              </select>
            </div>
            <button class="odp-qa-btn odp-qa-danger" onclick="odpMarkCompleted()">
              <i class="ti ti-circle-check"></i> Mark as Completed
            </button>
          </div>
        </div>

      </div><!-- /odp-ov-sidebar -->

    </div><!-- /odp-ov-grid -->`;
  }

  /* ══ ORDER SUMMARY HTML ══ */
window._buildOrderSummaryHTML = function(order) {
    const d = order.detail || {};
    const fin = d.financials || {};
    const pageCount = window._getPageCount(order);
    const wordCount = window._getWordCount(order);
    const total   = fin.total   || order.total_price || '—';
    const paid    = fin.paid    || '৳0';
    const due     = fin.due     || order.total_price || '—';
    const paidPct = fin.paidPct || 0;
    const pctColor = paidPct >= 100 ? 'var(--green)' : paidPct > 0 ? 'var(--yellow)' : 'var(--red)';
    const statusClass = order.statusClass || 's-pending';
    const statusLabel = { 's-inprogress':'In Progress','s-completed':'Completed','s-overdue':'Overdue','s-pending':'Pending','s-review':'In Review' }[statusClass] || order.status || '—';
    const rows = [
      { icon:'ti-file-description', label:'Topic / Title',       val: order.topic || '—' },
      { icon:'ti-award',            label:'Service Package',     val: order.pkg   || '—' },
      { icon:'ti-building',         label:'University',          val: order.uni   || '—' },
      { icon:'ti-book',             label:'Department',          val: d.subject   || '—' },
      { icon:'ti-language',         label:'Language',            val: d.language  || '—' },
      { icon:'ti-blockquote',       label:'Citation Style',      val: d.citationStyle || 'APA', badge: true },
      { icon:'ti-layout-list',      label:'Chapters / Sections', val: order.chapters ? String(order.chapters) : '—' },
      { icon:'ti-file-text',        label:'Pages (est.)',        val: pageCount ? pageCount + ' Pages' : '—' },
      { icon:'ti-letter-case',      label:'Word Count (est.)',   val: wordCount ? wordCount.toLocaleString() + ' words' : '—' },
      { icon:'ti-calendar-due',     label:'Deadline',            val: [order.deadline, order.deadlineTime].filter(Boolean).join(' ') || '—' },
    ];
    return `
    <div class="odp-summ-grid">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-clipboard-list"></i> Order Details</div>
          <div class="odp-summ-rows">
            ${rows.map(r => `
            <div class="odp-summ-row">
              <div class="odp-summ-icon-wrap"><i class="ti ${window._esc(r.icon)}"></i></div>
              <div class="odp-summ-lbl">${window._esc(r.label)}</div>
              <div class="odp-summ-val">${r.badge ? `<span class="odp-oi-badge">${window._esc(r.val)}</span>` : window._esc(r.val)}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-notes"></i> Additional Notes</div>
          <div class="odp-summ-notes-box">${window._esc(d.notes || order.note || 'No additional notes provided.')}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-info-circle"></i> Order Status</div>
          <div class="odp-summ-status-wrap">
            <span class="odp-status-pill ${window._esc(statusClass)}">${window._esc(statusLabel)}</span>
            <div class="odp-summ-status-sub">Order ID: <span class="odp-oi-meta-mono">${window._esc(order.orderId || order.id || '—')}</span></div>
          </div>
        </div>
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-report-money"></i> Payment Summary</div>
          <div class="odp-amount-row"><span class="odp-amount-label">Total Amount</span><span class="odp-amount-val total">${window._esc(total)}</span></div>
          <div class="odp-amount-row"><span class="odp-amount-label">Paid Amount</span><span class="odp-amount-val paid">${window._esc(paid)}</span></div>
          <div class="odp-amount-row"><span class="odp-amount-label">Due Amount</span><span class="odp-amount-val due">${window._esc(due)}</span></div>
          <div class="odp-pay-progress-wrap">
            <div class="odp-pay-progress-row"><span>Payment Progress</span><span style="color:${pctColor};font-weight:600">${paidPct}% paid</span></div>
            <div class="odp-progress-track"><div class="odp-progress-fill pf-green" style="width:${paidPct}%"></div></div>
          </div>
          <button type="button" class="odp-oi-pay-btn" style="margin-top:10px;width:100%" onclick="odpSwitchTab('payments')">
            <i class="ti ti-credit-card"></i> View Full Payment Details
          </button>
        </div>
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-user-circle"></i> Client</div>
          <div class="odp-summ-client-row">
            <div class="odp-cc-av" style="background:${window._esc(order.avatarColor)};width:36px;height:36px;font-size:14px;flex-shrink:0">${window._esc(order.initials)}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13px;color:var(--text)">${window._esc(order.client || '—')}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${window._esc(d.email || '—')}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="odp-cc-icon-btn" title="Message client" onclick="odpSwitchTab('messages')"><i class="ti ti-message-circle"></i></button>
              <button class="odp-cc-icon-btn" title="View client profile" onclick="window.open('/admin/client-profile.html?id=' + (window._currentOrder && window._currentOrder.clientId || ''), '_blank')"><i class="ti ti-user"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ══ PAYMENTS HTML ══ */
window._buildPaymentsHTML = function(order) {
    const d   = order.detail || {};
    const fin = d.financials || {};
    const paid      = fin.paid || 0;
    const paidPct   = fin.paidPct || 0;
    const payStatus = order.paymentStatus || 'pending';

    const totalFmt = order.amount || '—';
    const paidFmt  = paid ? '৳' + Number(paid).toLocaleString() : '৳0';
    const dueFmt   = '—';
    const pctColor = paidPct >= 100 ? 'var(--green)' : paidPct > 0 ? 'var(--gold)' : 'var(--red)';
    const isLocked = payStatus !== 'paid';

    const statusLabel = { pending:'Pending', under_review:'Pending', approved:'Approved', paid:'Paid', rejected:'Rejected' }[payStatus] || 'Pending';
    const statusCls   = { pending:'orange', under_review:'orange', approved:'green', paid:'green', rejected:'red' }[payStatus] || 'orange';

    return `
    <!-- Payment Pending Warning Banner -->
    ${payStatus === 'under_review' || payStatus === 'pending' ? `
    <div class="odp-pay-banner">
      <i class="ti ti-alert-circle" style="color:var(--gold);font-size:15px;flex-shrink:0"></i>
      <div>
        <div style="font-weight:700;font-size:12.5px;color:var(--gold)">Payment Pending</div>
        <div style="font-size:11.5px;color:var(--muted2);margin-top:2px">Please verify the payment to proceed. Files are locked until payment is confirmed.</div>
      </div>
      <button class="odp-pay-how" onclick="window._toast('Verify txn ID, check screenshot, then Approve or Reject.','var(--accent)')"><i class="ti ti-info-circle"></i> How it works?</button>
    </div>` : ''}

    <div class="odp-row-2">

      <!-- LEFT COLUMN -->
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- Payment Summary -->
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-report-money"></i> Payment Summary</div>
          <div class="odp-pay-stat-row">
            <div class="odp-pay-stat">
              <div class="odp-pay-stat-icon blue"><i class="ti ti-receipt"></i></div>
              <div><div class="odp-pay-stat-num" id="odpPaySummaryTotal">${totalFmt}</div><div class="odp-pay-stat-lbl">Total Amount</div></div>
            </div>
            <div class="odp-pay-stat">
              <div class="odp-pay-stat-icon green"><i class="ti ti-arrow-up"></i></div>
              <div><div class="odp-pay-stat-num" id="odpPaySummaryPaid" style="color:var(--green)">${paidFmt}</div><div class="odp-pay-stat-lbl">Sent Amount</div></div>
            </div>
            <div class="odp-pay-stat">
              <div class="odp-pay-stat-icon red"><i class="ti ti-pig-money"></i></div>
              <div><div class="odp-pay-stat-num" id="odpPaySummaryDue" style="color:var(--red)">${dueFmt}</div><div class="odp-pay-stat-lbl">Due Amount</div></div>
            </div>
          </div>
          <div style="margin-top:12px">
            <div class="odp-pay-progress-row">
              <span style="font-size:11px;color:var(--muted2)">Payment Status</span>
              <span class="odp-pay-status-pill ${statusCls}">${statusLabel}</span>
            </div>
            <div class="odp-pay-progress-row" style="margin-top:6px">
              <span style="font-size:11px;color:var(--muted2)">Payment Progress</span>
              <span style="color:${pctColor};font-weight:700;font-size:12px">${paidPct}%</span>
            </div>
            <div class="odp-progress-track" style="margin-top:6px">
              <div class="odp-progress-fill pf-green" style="width:${paidPct}%"></div>
            </div>
          </div>
          ${isLocked ? `
          <div class="odp-pay-locked-info">
            <div class="odp-pay-locked-left">
              <i class="ti ti-lock" style="color:var(--gold);font-size:18px"></i>
              <div>
                <div style="font-size:12px;font-weight:700">Files are locked</div>
                <div style="font-size:11px;color:var(--muted2);margin-top:2px">Files will be unlocked automatically once the payment is fully received.</div>
              </div>
            </div>
            <div class="odp-pay-locked-right">
              <div style="font-size:11.5px;font-weight:600;color:var(--red-light)">You can't complete this order</div>
              <div style="font-size:11px;color:var(--muted2);margin-top:2px">Complete button will be enabled automatically after full payment.</div>
            </div>
          </div>
          <div class="odp-pay-due-note"><i class="ti ti-info-circle"></i> Due amount must be ৳0 to mark as completed and unlock all files.</div>
          ` : ''}
        </div>

        <!-- Payment History Table -->
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-history"></i> Payment History</div>
          <div class="odp-pay-table-head">
            <span>#</span><span>Date</span><span>Type</span><span>Amount</span><span>Method</span><span>Status</span><span>Action</span><span>Note</span>
          </div>
          <div id="odpPayHistory"><div class="odp-loading"><div class="odp-spinner"></div> Loading…</div></div>
        </div>

      </div>

      <!-- RIGHT COLUMN -->
      <div style="display:flex;flex-direction:column;gap:14px">

        <!-- Payment Proof -->
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-file-invoice"></i> Payment Proof</div>
          <div id="odpProofSection">
            <div class="odp-proof-box" onclick="document.getElementById('odpProofInput').click()" style="cursor:pointer">
              <div class="odp-proof-icon"><i class="ti ti-file-invoice"></i></div>
              <div>
                <div class="odp-proof-name">No proof uploaded</div>
                <div class="odp-proof-sub">Uploaded by Client</div>
              </div>
            </div>
            <input type="file" id="odpProofInput" style="display:none" accept="image/*,.pdf" onchange="odpUploadProof(this.files)">
          </div>

          <!-- Client Sent Amount (from DB) -->
          <div class="odp-pay-verify-row" style="margin-top:12px">
            <div class="odp-pay-verify-item">
              <div class="odp-pay-verify-lbl">Client Sent Amount</div>
              <div class="odp-pay-verify-val" id="odpClientSentAmount" style="color:var(--green)">—</div>
            </div>
            <div class="odp-pay-verify-item">
              <div class="odp-pay-verify-lbl">Payment Method</div>
              <div class="odp-pay-verify-val" id="odpClientMethod">—</div>
            </div>
            <div class="odp-pay-verify-item">
              <div class="odp-pay-verify-lbl">Transaction ID</div>
              <div class="odp-pay-verify-val" id="odpClientTxnId" style="font-family:monospace;font-size:11px;color:var(--accent2)">—</div>
            </div>
          </div>

          <!-- Admin: I received amount -->
          <div class="odp-field" style="margin-top:12px">
            <label style="font-size:11px;color:var(--muted2);font-weight:600;text-transform:uppercase;letter-spacing:.05em">আমি যা পেয়েছি (Received Amount)</label>
            <div style="display:flex;gap:8px;margin-top:6px;align-items:center">
              <span style="font-size:13px;color:var(--muted2);flex-shrink:0">৳</span>
              <input type="number" id="odpReceivedAmount" placeholder="0"
                style="flex:1;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:13px;color:var(--text);outline:none"
                oninput="odpUpdateDuePreview(this.value)">
            </div>
            <div id="odpDuePreview" style="margin-top:6px;font-size:11.5px;color:var(--muted2);display:none">
              Due after this: <span id="odpDuePreviewVal" style="font-weight:700;color:var(--red)">—</span>
            </div>
          </div>

          <div class="odp-field" style="margin-top:10px">
            <label style="font-size:11px;color:var(--muted2);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Client Note (Optional)</label>
            <div id="odpClientNote" style="margin-top:6px;font-size:12px;color:var(--muted2);padding:8px 10px;background:var(--card2);border-radius:8px;border:1px solid var(--border);min-height:36px">—</div>
          </div>

          <div class="odp-field" style="margin-top:10px">
            <label style="font-size:11px;color:var(--muted2);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Internal Note (Only for Admin)</label>
            <textarea class="odp-msg-textarea" id="odpPayNote" style="min-height:55px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12px;background:var(--card2);margin-top:6px" placeholder="Add an internal note…"></textarea>
          </div>

          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="odp-btn odp-btn-green" style="flex:1;justify-content:center" onclick="odpApprovePayment()">
              <i class="ti ti-circle-check"></i> Approve Payment
            </button>
            <button class="odp-btn" style="flex:1;justify-content:center;background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.2)" onclick="odpRejectPayment()">
              <i class="ti ti-circle-x"></i> Reject Payment
            </button>
          </div>

          <button class="odp-btn odp-btn-accent" style="margin-top:8px;width:100%;justify-content:center" onclick="odpMarkPaymentReceived()">
            <i class="ti ti-cash"></i> Mark as Payment Received
          </button>
          <div style="text-align:center;font-size:10.5px;color:var(--muted);margin-top:6px">After verification, client will be notified automatically.</div>
        </div>

      </div>
    </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════ */
window._buildAcademicSummaryHTML = function(order, ord, client) {
    const d = order.detail || {};
    const src = ord || {};
    const fields = [
      { label: 'Thesis / Topic Title', val: src.title || order.topic },
      { label: 'Package',              val: src.package || order.pkg },
      { label: 'Department',           val: src.department || d.subject },
      { label: 'University',           val: src.university || (client && client.university) || order.uni },
      { label: 'Language',             val: src.language || d.language },
      { label: 'Citation Style',       val: src.citation || d.citationStyle, badge: true },
    ];

    return fields.map(f => {
      const value = f.val != null && String(f.val).trim() !== '' ? String(f.val) : '—';
      if (f.badge) {
        return `<div class="odp-info-item"><div class="odp-info-lbl">${window._esc(f.label)}</div><div class="odp-info-val"><span class="odp-oi-badge">${window._esc(value === '—' ? 'APA' : value)}</span></div></div>`;
      }
      return `<div class="odp-info-item"><div class="odp-info-lbl">${window._esc(f.label)}</div><div class="odp-info-val">${window._esc(value)}</div></div>`;
    }).join('');
  }

window._syncOrderInfoPayments = function(order) {
    const fin = (order && order.detail && order.detail.financials) || {};
    const paidPct = fin.paidPct || 0;
    const paid = fin.paid || '৳0';
    const due = fin.due || order.total_price || '—';
    const statusEl = document.getElementById('odpOiPayStatus');
    const paidEl = document.getElementById('odpOiPaid');
    const dueEl = document.getElementById('odpOiDue');
    const pctEl = document.getElementById('odpOiPaidPct');
    const fillEl = document.getElementById('odpOiPayFill');

    if (paidEl) paidEl.textContent = paid;
    if (dueEl) dueEl.textContent = due;
    if (pctEl) pctEl.textContent = paidPct + '%';
    if (fillEl) fillEl.style.width = paidPct + '%';
    if (statusEl) {
      statusEl.textContent = paidPct >= 100 ? 'Paid' : paidPct > 0 ? 'Partial' : 'Unpaid';
      statusEl.className = 'odp-oi-pay-pill ' + (paidPct >= 100 ? 'odp-oi-pay-paid' : paidPct > 0 ? 'odp-oi-pay-partial' : 'odp-oi-pay-unpaid');
    }
  }

  /* ── TOAST ── */
window._buildOrderInformationHTML = function(order, d, pageCount) {
    const amount   = window._clipText(order.amount, 14);
    const deadline = window._clipText(order.deadline, 12);
    const time     = window._clipText(order.deadlineTime, 10);
    const service  = window._clipText(order.pkg, 22);
    const citation = window._clipText(d.citationStyle || 'APA', 12);
    const chapters = window._clipText(String(order.chapters || '—'), 16);
    const pages    = pageCount ? pageCount + ' Pages' : '— Pages';
    const orderId  = window._clipText(order.orderId || order.id, 24);

    return `
        <div class="odp-card odp-oi-card">
          <div class="odp-card-title"><i class="ti ti-clipboard-data"></i> Order Information</div>

          <div class="odp-oi-tiles">
            <div class="odp-oi-tile odp-oi-tile-blue">
              <div class="odp-oi-tile-icon"><i class="ti ti-currency-taka"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Total Amount</div>
                <div class="odp-oi-tile-val" title="${window._esc(order.amount || '')}">${window._esc(amount)}</div>
              </div>
            </div>
            <div class="odp-oi-tile odp-oi-tile-orange">
              <div class="odp-oi-tile-icon"><i class="ti ti-calendar-due"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Deadline</div>
                <div class="odp-oi-tile-val odp-oi-tile-deadline">
                  <span>${window._esc(deadline)}</span>
                  <span class="odp-oi-tile-time">${window._esc(time)}</span>
                </div>
                <div class="odp-oi-tile-sub" id="odpDaysLeft">—</div>
              </div>
            </div>
            <div class="odp-oi-tile odp-oi-tile-teal">
              <div class="odp-oi-tile-icon"><i class="ti ti-file-description"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Word Count</div>
                <div class="odp-oi-tile-val">${window._esc(window._formatWordCount(order))}</div>
                <div class="odp-oi-tile-sub">${window._esc(window._formatWordHint(order))}</div>
              </div>
            </div>
            <div class="odp-oi-tile odp-oi-tile-purple">
              <div class="odp-oi-tile-icon"><i class="ti ti-blockquote"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Citation Style</div>
                <div class="odp-oi-tile-val odp-oi-badge-wrap"><span class="odp-oi-badge">${window._esc(citation)}</span></div>
              </div>
            </div>
            <div class="odp-oi-tile odp-oi-tile-green">
              <div class="odp-oi-tile-icon"><i class="ti ti-award"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Service Type</div>
                <div class="odp-oi-tile-val" title="${window._esc(order.pkg || '')}">${window._esc(service)}</div>
              </div>
            </div>
          </div>

          <div class="odp-oi-pay-block">
            <!-- Row 1: Status label -->
            <div class="odp-oi-pay-top-row">
              <span class="odp-oi-pay-label">Payment Status</span>
              <span class="odp-oi-pay-pill odp-oi-pay-unpaid" id="odpOiPayStatus">Unpaid</span>
            </div>
            <!-- Row 2: Amounts + Bar + Button -->
            <div class="odp-oi-pay-bottom-row">
              <div class="odp-oi-pay-amounts">
                <div class="odp-oi-pay-amount-item">
                  <div class="odp-oi-pay-sub-lbl">Paid Amount</div>
                  <div class="odp-oi-pay-sub-val" id="odpOiPaid">৳0</div>
                </div>
                <div class="odp-oi-pay-amount-sep"></div>
                <div class="odp-oi-pay-amount-item">
                  <div class="odp-oi-pay-sub-lbl">Due Amount</div>
                  <div class="odp-oi-pay-sub-val" id="odpOiDue">${window._esc(amount)}</div>
                </div>
              </div>
              <div class="odp-oi-pay-bar-wrap">
                <div class="odp-oi-pay-bar-label">
                  <span id="odpOiPaidPct">0%</span>
                  <span class="odp-oi-pay-paid-lbl">Paid</span>
                </div>
                <div class="odp-oi-pay-track"><div class="odp-oi-pay-fill" id="odpOiPayFill" style="width:0%"></div></div>
              </div>
              <button type="button" class="odp-oi-pay-btn" onclick="odpSwitchTab('payments')">View Payments</button>
            </div>
          </div>

          <div class="odp-oi-meta-row">
            <div class="odp-oi-meta-item">
              <div class="odp-oi-meta-icon-box odp-oi-meta-icon-purple"><i class="ti ti-layout-list"></i></div>
              <div class="odp-oi-meta-body">
                <div class="odp-oi-meta-lbl">Chapters / Pages</div>
                <div class="odp-oi-meta-val">${window._esc(chapters)}</div>
              </div>
            </div>
            <div class="odp-oi-meta-item">
              <div class="odp-oi-meta-icon-box odp-oi-meta-icon-teal"><i class="ti ti-file-description"></i></div>
              <div class="odp-oi-meta-body">
                <div class="odp-oi-meta-lbl">Pages (est.)</div>
                <div class="odp-oi-meta-val" id="odpOiPages">${window._esc(pages)}</div>
              </div>
            </div>
            <div class="odp-oi-meta-item">
              <div class="odp-oi-meta-icon-box odp-oi-meta-icon-blue"><i class="ti ti-hash"></i></div>
              <div class="odp-oi-meta-body">
                <div class="odp-oi-meta-lbl">Order ID</div>
                <div class="odp-oi-meta-val odp-oi-meta-mono" title="${window._esc(order.orderId || order.id || '')}">${window._esc(orderId)}</div>
              </div>
            </div>
          </div>
        </div>`;
  }

