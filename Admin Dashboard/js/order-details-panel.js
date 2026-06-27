/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — Order Details Panel (order-details-panel.js)
   Full functional: real Supabase data, file upload, messages, payments
═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  let _timerInterval = null;
  let _currentOrderId = null;
  let _currentOrder = null;
  let _payRealtimeChannel = null;

  /* ── SUPABASE HELPER ── */
  function sb() { return window.scriptoraSupabase; }

  /* ── UUID VALIDATION ──
     Mock orders use '#SCR-XXXX' style IDs, not real UUIDs.
     Supabase UUID columns reject these with "invalid input syntax for type uuid".
     Any function that does .eq('id', _currentOrderId) must call this first.
  ── */
  function isRealUUID(id) {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  /* ── ESCAPE HTML ── */
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getPageCount(order) {
    if (!order) return null;
    if (Number.isFinite(Number(order.pages)) && Number(order.pages) > 0) return Number(order.pages);
    const d = order.detail || {};
    const fromDetail = parseInt(String(d.pages || ''), 10);
    if (Number.isFinite(fromDetail) && fromDetail > 0) return fromDetail;
    const m = String(d.pages || order.wordcount || '').match(/(\d[\d,]*)/);
    if (!m) return null;
    const n = parseInt(m[1].replace(/,/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function getWordCount(order) {
    const pages = getPageCount(order);
    if (pages) return pages * 250;
    const n = parseFloat(String(order.wordcount || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  function formatWordCountDisplay(order) {
    const words = getWordCount(order);
    return words ? words.toLocaleString() + ' w' : '—';
  }

  function formatWordHint(order) {
    const words = getWordCount(order);
    return words ? '(~' + words.toLocaleString() + ' words)' : '';
  }

  function clipText(str, maxLen) {
    if (str == null || str === '') return '—';
    const clean = String(str).trim().replace(/\s+/g, ' ');
    if (!clean) return '—';
    return clean.length > maxLen ? clean.slice(0, maxLen - 1) + '…' : clean;
  }

  function buildOrderInformationHTML(order, d, pageCount) {
    const amount   = clipText(order.amount, 14);
    const deadline = clipText(order.deadline, 12);
    const time     = clipText(order.deadlineTime, 10);
    const service  = clipText(order.pkg, 22);
    const citation = clipText(d.citationStyle || 'APA', 12);
    const chapters = clipText(String(order.chapters || '—'), 16);
    const pages    = pageCount ? pageCount + ' Pages' : '— Pages';
    const orderId  = clipText(order.orderId || order.id, 24);

    return `
        <div class="odp-card odp-oi-card">
          <div class="odp-card-title"><i class="ti ti-clipboard-data"></i> Order Information</div>

          <div class="odp-oi-tiles">
            <div class="odp-oi-tile odp-oi-tile-blue">
              <div class="odp-oi-tile-icon"><i class="ti ti-currency-taka"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Total Amount</div>
                <div class="odp-oi-tile-val" title="${esc(order.amount || '')}">${esc(amount)}</div>
              </div>
            </div>
            <div class="odp-oi-tile odp-oi-tile-orange">
              <div class="odp-oi-tile-icon"><i class="ti ti-calendar-due"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Deadline</div>
                <div class="odp-oi-tile-val odp-oi-tile-deadline">
                  <span>${esc(deadline)}</span>
                  <span class="odp-oi-tile-time">${esc(time)}</span>
                </div>
                <div class="odp-oi-tile-sub" id="odpDaysLeft">—</div>
              </div>
            </div>
            <div class="odp-oi-tile odp-oi-tile-teal">
              <div class="odp-oi-tile-icon"><i class="ti ti-file-description"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Word Count</div>
                <div class="odp-oi-tile-val">${esc(formatWordCountDisplay(order))}</div>
                <div class="odp-oi-tile-sub">${esc(formatWordHint(order))}</div>
              </div>
            </div>
            <div class="odp-oi-tile odp-oi-tile-purple">
              <div class="odp-oi-tile-icon"><i class="ti ti-blockquote"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Citation Style</div>
                <div class="odp-oi-tile-val odp-oi-badge-wrap"><span class="odp-oi-badge">${esc(citation)}</span></div>
              </div>
            </div>
            <div class="odp-oi-tile odp-oi-tile-green">
              <div class="odp-oi-tile-icon"><i class="ti ti-award"></i></div>
              <div class="odp-oi-tile-body">
                <div class="odp-oi-tile-lbl">Service Type</div>
                <div class="odp-oi-tile-val" title="${esc(order.pkg || '')}">${esc(service)}</div>
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
                  <div class="odp-oi-pay-sub-val" id="odpOiDue">${esc(amount)}</div>
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
                <div class="odp-oi-meta-val">${esc(chapters)}</div>
              </div>
            </div>
            <div class="odp-oi-meta-item">
              <div class="odp-oi-meta-icon-box odp-oi-meta-icon-teal"><i class="ti ti-file-description"></i></div>
              <div class="odp-oi-meta-body">
                <div class="odp-oi-meta-lbl">Pages (est.)</div>
                <div class="odp-oi-meta-val" id="odpOiPages">${esc(pages)}</div>
              </div>
            </div>
            <div class="odp-oi-meta-item">
              <div class="odp-oi-meta-icon-box odp-oi-meta-icon-blue"><i class="ti ti-hash"></i></div>
              <div class="odp-oi-meta-body">
                <div class="odp-oi-meta-lbl">Order ID</div>
                <div class="odp-oi-meta-val odp-oi-meta-mono" title="${esc(order.orderId || order.id || '')}">${esc(orderId)}</div>
              </div>
            </div>
          </div>
        </div>`;
  }

  function buildAcademicSummaryHTML(order, ord, client) {
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
        return `<div class="odp-info-item"><div class="odp-info-lbl">${esc(f.label)}</div><div class="odp-info-val"><span class="odp-oi-badge">${esc(value === '—' ? 'APA' : value)}</span></div></div>`;
      }
      return `<div class="odp-info-item"><div class="odp-info-lbl">${esc(f.label)}</div><div class="odp-info-val">${esc(value)}</div></div>`;
    }).join('');
  }

  function syncOrderInfoPayments(order) {
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
  function toast(msg, color) {
    color = color || 'var(--accent)';
    let el = document.getElementById('odpToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'odpToast';
      el.style.cssText = `position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(16px);
        background:#1a1e30;border:1px solid rgba(255,255,255,0.1);border-left:3px solid ${color};
        border-radius:10px;padding:10px 18px;font-size:12.5px;color:#e8eaf6;min-width:220px;
        text-align:center;opacity:0;pointer-events:none;transition:all 0.25s;z-index:9999;
        font-family:'Sora',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.5);`;
      document.body.appendChild(el);
    }
    el.style.borderLeftColor = color;
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(16px)';
    }, 3000);
  }

  /* ── DEADLINE TIMER ── */
  function startTimer(deadlineStr) {
    const el = document.getElementById('odpCountdown');
    const wrap = el ? el.closest('.odp-countdown') : null;
    if (!el) return;
    if (_timerInterval) clearInterval(_timerInterval);

    const deadline = new Date(deadlineStr);
    if (isNaN(deadline)) { el.textContent = 'No deadline'; return; }

    function tick() {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        el.textContent = 'OVERDUE';
        if (wrap) { wrap.style.background='rgba(248,113,113,0.15)'; wrap.style.borderColor='rgba(248,113,113,0.4)'; }
        clearInterval(_timerInterval);
        return;
      }
      /* Not overdue — show green/yellow */
      if (wrap) {
        const hrs = diff / 3600000;
        if (hrs < 24) { wrap.style.background='rgba(245,158,11,0.1)'; wrap.style.borderColor='rgba(245,158,11,0.3)'; wrap.style.color='var(--yellow)'; }
        else { wrap.style.background='rgba(52,211,153,0.08)'; wrap.style.borderColor='rgba(52,211,153,0.2)'; wrap.style.color='var(--green)'; }
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }
    tick();
    _timerInterval = setInterval(tick, 1000);
  }

  /* ── PARSE DEADLINE → ISO date ── */
  function parseDeadline(label, time) {
    if (!label || !time) return null;
    const t = time.trim();
    const now = new Date();
    const yr = now.getFullYear();

    if (label === 'Today') return new Date(`${now.toDateString()} ${t}`);

    /* "Jun 8", "Jun 14" etc */
    const m = label.match(/^([A-Za-z]+)\s+(\d+)$/);
    if (m) {
      const attempt = new Date(`${m[1]} ${m[2]}, ${yr} ${t}`);
      if (!isNaN(attempt)) return attempt;
    }
    /* ISO or full date string */
    const d = new Date(`${label} ${t}`);
    return isNaN(d) ? null : d;
  }

  /* ══════════════════════════════════════════════════════════
     PANEL HTML SKELETON (tabs + static shell)
  ══════════════════════════════════════════════════════════ */
  function buildShell(order) {
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
        <div class="odp-title">${esc(order.topic)}</div>
        <span class="odp-status-pill ${statusClass}">${esc(statusLabel)}</span>
      </div>
      <div class="odp-meta-row">
        <span class="odp-meta-item"><i class="ti ti-file-invoice"></i> Order ID: <b>${esc(order.orderId||order.id)}</b></span>
        <span class="odp-meta-sep">·</span>
        <span class="odp-meta-item" id="odpHeaderClient"><i class="ti ti-user"></i> Client: <b>${esc(order.client || order.uni || '—')}</b></span>
        <span class="odp-meta-sep">·</span>
        <span class="odp-meta-item"><i class="ti ti-building"></i> Department: <b>${esc(order.pkg)}</b></span>
        <span class="odp-meta-sep">·</span>
        <span class="odp-meta-item odp-meta-deadline"><i class="ti ti-alarm"></i> Deadline: <b>${esc(order.deadline)} ${esc(order.deadlineTime)}</b></span>
        <span class="odp-meta-sep">·</span>
        <span class="odp-meta-item odp-meta-amount"><i class="ti ti-cash"></i> <b>${esc(order.amount)}</b></span>
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
      ${buildOverviewHTML(order, statusClass)}
    </div>

    <!-- ══ ORDER SUMMARY ══ -->
    <div class="odp-pane" data-odp-pane="summary">
      ${buildOrderSummaryHTML(order)}
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
      ${buildPaymentsHTML(order)}
    </div>

    <!-- ══ MESSAGES ══ -->
    <div class="odp-pane" data-odp-pane="messages">
      <div class="odp-card">
        <div class="odp-card-title"><i class="ti ti-messages"></i> Conversation with ${esc(order.client)}</div>
        <div class="odp-msg-list" id="odpMsgList">
          <div class="odp-loading"><div class="odp-spinner"></div> Loading messages…</div>
        </div>
        <div class="odp-msg-input-area">
          <textarea class="odp-msg-textarea" id="odpMsgInput" placeholder="Type your message to ${esc(order.client)}…"></textarea>
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
  function buildOverviewHTML(order, statusClass) {
    const d = order.detail || {};
    statusClass = statusClass || order.statusClass || 's-pending';
    const pct = d.overall || order.progressPct || 0;
    const pctColor = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';
    const pfClass  = pct >= 80 ? 'pf-green'    : pct >= 40 ? 'pf-yellow'     : 'pf-red';
    const pageCount = getPageCount(order);

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
          <div class="${nameCls}">${esc(ms.name)}</div>
          <div class="odp-ms-date">${esc(ms.date||'Pending')}</div>
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
              <div class="odp-cc-av" style="background:${esc(order.avatarColor)}">${esc(order.initials)}</div>
              <div class="odp-cc-info">
                <div class="odp-cc-name">${esc(order.client)} <span class="odp-cc-badge-verified"><i class="ti ti-shield-check"></i> Verified</span></div>
                <div class="odp-cc-uni">${esc(order.uni)}</div>
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
                <a class="odp-cc-contact-val" href="mailto:${esc(d.email||'')} " id="odpClientEmail">${esc(d.email||'—')}</a>
              </div>
              <div class="odp-cc-contact-row">
                <i class="ti ti-device-mobile odp-cc-contact-icon"></i>
                <span class="odp-cc-contact-val" id="odpClientPhone">${esc(d.phone||'—')}</span>
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
            <div class="odp-info-grid odp-info-grid-2col" id="odpThesisDetailsCard">${buildAcademicSummaryHTML(order)}</div>
          </div>

        </div><!-- /odp-ov-top-row -->

        <!-- Order Information — full width of main column -->
        ${buildOrderInformationHTML(order, d, pageCount)}

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
                  <div class="odp-vt-name ${dotCls}">${esc(ms.name)}</div>
                  <div class="odp-vt-date">${esc(ms.date || 'Pending')}</div>
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
  function buildOrderSummaryHTML(order) {
    const d = order.detail || {};
    const fin = d.financials || {};
    const pageCount = getPageCount(order);
    const wordCount = getWordCount(order);
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
              <div class="odp-summ-icon-wrap"><i class="ti ${esc(r.icon)}"></i></div>
              <div class="odp-summ-lbl">${esc(r.label)}</div>
              <div class="odp-summ-val">${r.badge ? `<span class="odp-oi-badge">${esc(r.val)}</span>` : esc(r.val)}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-notes"></i> Additional Notes</div>
          <div class="odp-summ-notes-box">${esc(d.notes || order.note || 'No additional notes provided.')}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-info-circle"></i> Order Status</div>
          <div class="odp-summ-status-wrap">
            <span class="odp-status-pill ${esc(statusClass)}">${esc(statusLabel)}</span>
            <div class="odp-summ-status-sub">Order ID: <span class="odp-oi-meta-mono">${esc(order.orderId || order.id || '—')}</span></div>
          </div>
        </div>
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-report-money"></i> Payment Summary</div>
          <div class="odp-amount-row"><span class="odp-amount-label">Total Amount</span><span class="odp-amount-val total">${esc(total)}</span></div>
          <div class="odp-amount-row"><span class="odp-amount-label">Paid Amount</span><span class="odp-amount-val paid">${esc(paid)}</span></div>
          <div class="odp-amount-row"><span class="odp-amount-label">Due Amount</span><span class="odp-amount-val due">${esc(due)}</span></div>
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
            <div class="odp-cc-av" style="background:${esc(order.avatarColor)};width:36px;height:36px;font-size:14px;flex-shrink:0">${esc(order.initials)}</div>
            <div>
              <div style="font-weight:700;font-size:13px;color:var(--text)">${esc(order.client || '—')}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(d.email || '—')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ══ PAYMENTS HTML ══ */
  function buildPaymentsHTML(order) {
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
      <button class="odp-pay-how" onclick="toast('Verify txn ID, check screenshot, then Approve or Reject.','var(--accent)')"><i class="ti ti-info-circle"></i> How it works?</button>
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
  window.openOrderDetailsPanel = function(order) {
    const existing = document.getElementById('odpOverlay');
    if (existing) existing.remove();
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }

    /* Hide old panel */
    const oldPanel = document.getElementById('detailPanel');
    if (oldPanel) { oldPanel.classList.remove('open'); oldPanel.style.visibility='hidden'; }

    _currentOrder = order;
    _currentOrderId = order.id;

    document.body.classList.add('odp-panel-open');
    document.body.insertAdjacentHTML('beforeend', buildShell(order));

    /* Sync status select IMMEDIATELY after HTML is in DOM */
    const _statusSel = document.getElementById('odpStatusSelect');
    if (_statusSel && order.statusClass) {
      const _valMap = { 's-inprogress':'writing', 's-completed':'completed', 's-pending':'pending', 's-review':'draft_ready', 's-overdue':'overdue' };
      const _val = _valMap[order.statusClass];
      if (_val) _statusSel.value = _val;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ov = document.getElementById('odpOverlay');
        if (ov) ov.classList.add('odp-open');
      });
    });

    /* Start timer */
    const dl = parseDeadline(order.deadline, order.deadlineTime);
    if (dl) startTimer(dl);

    /* Days Left badge inside Order Information card */
    const daysEl = document.getElementById("odpDaysLeft");
    if (daysEl && dl) {
      const diffMs = dl - Date.now();
      const diffD  = Math.ceil(diffMs / 86400000);
      if (diffMs <= 0) {
        daysEl.innerHTML = '<span class="odp-oi-days-badge" style="background:rgba(248,113,113,0.18);color:#f87171">Overdue</span>';
      } else {
        daysEl.innerHTML = '<span class="odp-oi-days-badge">' + diffD + ' Day' + (diffD === 1 ? '' : 's') + ' Left</span>';
      }
    }

    /* Load async data */
    loadFullOrderData();
    loadMessages();
    loadFiles();
    loadActivity();
    loadPaymentHistory();
    loadClientOrderCount();
    if (_currentOrder) syncOrderInfoPayments(_currentOrder);
  };

  /* ══ LOAD FULL ORDER DATA FROM SUPABASE ══ */
  async function loadFullOrderData() {
    if (!sb()) return;
    /* Mock orders (e.g. '#SCR-2891') are not real UUIDs — skip DB query */
    if (!isRealUUID(_currentOrderId)) {
      if (_currentOrder && _currentOrder.detail) {
        renderThesisDetailsCard(_currentOrder, null);
      }
      return;
    }
    try {
      const [{ data: ord }, { data: payments }] = await Promise.all([
        sb().from('orders').select('*').eq('id', _currentOrderId).single(),
        sb().from('payments').select('amount,type,confirmed').eq('order_id', _currentOrderId)
      ]);

      if (!ord) return;
      if (_currentOrder) _currentOrder.clientId = ord.client_id || _currentOrder.clientId || '';

      /* ── Payment financials compute ── */
      const total = Number(ord.total_price || 0);
      let paid = 0;
      if (payments && payments.length) {
        paid = payments
          .filter(p => p.confirmed && (p.type === 'received' || p.type === 'approval'))
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        if (paid === 0 && ord.advance_paid) paid = Number(ord.advance_paid);
      } else if (ord.advance_paid) {
        paid = Number(ord.advance_paid);
      }
      const due = Math.max(0, total - paid);
      const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

      if (!_currentOrder.detail) _currentOrder.detail = {};
      _currentOrder.detail.financials = { total, paid, due, paidPct };
      _currentOrder.paymentStatus = ord.payment_status || _currentOrder.paymentStatus;

      /* ── Client data ── */
      let client = null;
      if (ord.client_id) {
        const { data: cl } = await sb().from('clients').select('*').eq('id', ord.client_id).single();
        client = cl;
      }

      renderClientSubmission(ord, client);
      renderClientInfoFromDB(ord, client);
      renderThesisDetailsCard(ord, client);
      syncOrderInfoPayments(_currentOrder);

      /* Sync status select from DB */
      const clsMap = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', overdue:'s-overdue', hold:'s-pending' };
      const lblMap = { writing:'In Progress', completed:'Completed', pending:'Pending', draft_ready:'In Review', overdue:'Overdue', hold:'On Hold' };
      document.querySelectorAll('.odp-status-pill').forEach(pill => {
        pill.className = 'odp-status-pill ' + (clsMap[ord.status] || 's-pending');
        pill.textContent = lblMap[ord.status] || ord.status;
      });
      const statusSel = document.getElementById('odpStatusSelect');
      if (statusSel && ord.status) statusSel.value = ord.status;

      /* ── Subscribe to payments realtime ── */
      _subscribePaymentsRealtime();

    } catch(e) { console.error('loadFullOrderData:', e); }
  }

  /* ══ PAYMENTS REALTIME SUBSCRIPTION ══════════════════════════════════════ */
  function _subscribePaymentsRealtime() {
    if (!sb() || !isRealUUID(_currentOrderId)) return;
    if (_payRealtimeChannel) {
      sb().removeChannel(_payRealtimeChannel);
      _payRealtimeChannel = null;
    }
    _payRealtimeChannel = sb()
      .channel(`odp_pay_${_currentOrderId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `order_id=eq.${_currentOrderId}` },
        async () => {
          await _reloadPaymentFinancials();
          await loadPaymentHistory();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${_currentOrderId}` },
        async (payload) => {
          if (!_currentOrder) return;
          _currentOrder.paymentStatus = payload.new.payment_status || _currentOrder.paymentStatus;
          syncOrderInfoPayments(_currentOrder);
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

  async function _reloadPaymentFinancials() {
    if (!sb() || !isRealUUID(_currentOrderId)) return;
    try {
      const [{ data: ord }, { data: pays }] = await Promise.all([
        sb().from('orders').select('amount,advance_paid,payment_status').eq('id', _currentOrderId).single(),
        sb().from('payments').select('amount,type,confirmed').eq('order_id', _currentOrderId)
      ]);
      if (!ord || !_currentOrder) return;

      const total = Number(ord.total_price || 0) || Number(String((_currentOrder && _currentOrder.amount) || "").replace(/[^\d]/g, "")) || 0;
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

      if (!_currentOrder.detail) _currentOrder.detail = {};
      _currentOrder.detail.financials = { total, paid, due, paidPct };
      _currentOrder.paymentStatus = ord.payment_status || _currentOrder.paymentStatus;

      syncOrderInfoPayments(_currentOrder);

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
  function renderThesisDetailsCard(ord, client) {
    const el = document.getElementById('odpThesisDetailsCard');
    if (!el || !ord) return;
    el.innerHTML = buildAcademicSummaryHTML(_currentOrder || {}, ord, client);
  }

  function renderClientInfoFromDB(ord, client) {
    if (!client && !ord) return;

    /* ── Client name ── */
    if (client && client.name) {
      document.querySelectorAll('.odp-cc-name').forEach(el => {
        el.innerHTML = `${client.name} <span class="odp-cc-badge-verified"><i class="ti ti-shield-check"></i> Verified</span>`;
      });
      const headerClient = document.getElementById('odpHeaderClient');
      if (headerClient) headerClient.innerHTML = `<i class="ti ti-user"></i> Client: <b>${client.name}</b>`;
      /* Messages tab placeholder */
      document.querySelectorAll('.odp-msg-textarea').forEach(el => {
        el.placeholder = el.placeholder.replace(order && order.client || 'Client', client.name);
      });
    }

    const emailEl = document.getElementById('odpClientEmail');
    const phoneEl = document.getElementById('odpClientPhone');
    if (emailEl && client && client.email) {
      emailEl.href = 'mailto:' + client.email;
      emailEl.textContent = client.email;
    }
    if (phoneEl) {
      const phone = (client && (client.phone || client.whatsapp)) || ord.phone || ord.whatsapp || '';
      if (phone) phoneEl.textContent = phone;
    }
    if ((client && client.University) || ord.university) {
      document.querySelectorAll('.odp-cc-uni').forEach(el => {
        el.textContent = (client && client.University) || ord.university || el.textContent;
      });
    }
  }

  function renderClientSubmission(ord, client) {
    const el = document.getElementById('odpClientSubmission2');
    if (!el) return;

    // Map Supabase columns → order.js field names exactly as submitted
    const fields = [
      { g:'Academic Details', icon:'ti-school', items: [
        { label:'Thesis / Topic Title',       val: ord.title },
        { label:'Package / Service',          val: ord.pkg || ord.dept || ord.service_type },
        { label:'Department / Subject',       val: ord.department || ord.dept_label },
        { label:'University / Institution',   val: (client && client.university) || ord.university },
        { label:'Research Area',              val: ord.research || ord.research_area || ord.thesis_topic },
        { label:'Methodology',               val: ord.methodology || ord.method },
        { label:'Independent Variable',      val: ord.indep_var || ord.independent_variable },
        { label:'Dependent Variable',        val: ord.dep_var || ord.dependent_variable },
        { label:'Special Instructions',      val: ord.special_instructions || ord.special_instructions_premium },
      ]},
      { g:'Scope & Format', icon:'ti-ruler-2', items: [
        { label:'Chapter Scope',              val: ord.chapters || ord.chapter_scope },
        { label:'Word Count (Target)',        val: ord.pages || ord.word_count_pages },
        { label:'Citation Style',             val: ord.citation || ord.citation_style },
        { label:'Urgency Level',             val: ord.urgency },
        { label:'Add-ons',                   val: Array.isArray(ord.addons) ? ord.addons.join(', ') : ord.addons },
      ]},
      { g:'Timeline & Payment', icon:'ti-calendar-event', items: [
        { label:'Submission Deadline',        val: ord.deadline },
        { label:'Estimated Total',            val: ord.total ? '৳' + Number(ord.total).toLocaleString() : null },
        { label:'Coupon Applied',             val: ord.coupon },
        { label:'Discount',                   val: ord.discount ? '৳' + Number(ord.discount).toLocaleString() : null },
      ]},
      { g:'Contact Info', icon:'ti-address-book', items: [
        { label:'Email',                      val: (client && client.email) || ord.email },
        { label:'Phone / WhatsApp',           val: (client && (client.phone || client.whatsapp)) || ord.phone || ord.whatsapp },
      ]},
    ];

    function esc2(s) { return s==null?'':String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    let html = '';
    let hasAny = false;
    fields.forEach(group => {
      const visible = group.items.filter(f => f.val != null && String(f.val).trim() !== '' && String(f.val) !== 'undefined');
      if (!visible.length) return;
      hasAny = true;
      html += '<div class="odp-sub-group">';
      html += '<div class="odp-sub-group-title"><i class="ti ' + (group.icon||'ti-list') + '"></i>' + esc2(group.g) + '</div>';
      html += '<div class="odp-sub-grid">';
      visible.forEach(f => {
        const isLong = f.label.includes('Instructions') || f.label.includes('Requirements') || f.label.includes('Variable') || (f.val && String(f.val).length > 80);
        html += '<div class="odp-field' + (isLong ? ' odp-field-full' : '') + '">'
          + '<label>' + esc2(f.label) + '</label>'
          + '<div class="odp-field-val' + (isLong ? ' muted' : '') + '"'
          + (isLong ? ' style="font-size:11.5px;line-height:1.6"' : '') + '>'
          + esc2(String(f.val)) + '</div></div>';
      });
      html += '</div></div>';
    });

    if (!hasAny) {
      el.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:16px 0;text-align:center"><i class="ti ti-info-circle" style="font-size:18px;display:block;margin-bottom:6px"></i>Database-এ submission data পাওয়া যায়নি।<br><span style="font-size:11px;opacity:0.6">Order manually created হতে পারে।</span></div>';
      return;
    }
    el.innerHTML = html;
  }

  window.closeOrderDetailsPanel = function() {
    const ov = document.getElementById('odpOverlay');
    if (ov) { ov.classList.remove('odp-open'); setTimeout(() => { ov.remove(); }, 240); }
    document.body.classList.remove('odp-panel-open');
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const oldPanel = document.getElementById('detailPanel');
    if (oldPanel) oldPanel.style.visibility = '';
    if (_payRealtimeChannel) {
      if (sb()) sb().removeChannel(_payRealtimeChannel);
      _payRealtimeChannel = null;
    }
    _currentOrderId = null; _currentOrder = null;
  };

  /* ══════════════════════════════════════════════════════════
     TAB SWITCH
  ══════════════════════════════════════════════════════════ */
  window.odpSwitchTab = function(name) {
    document.querySelectorAll('.odp-tab').forEach(t => t.classList.remove('odp-active'));
    document.querySelectorAll('.odp-pane').forEach(p => p.classList.remove('odp-pane-active'));
    const tab  = document.querySelector(`.odp-tab[data-odp-tab="${name}"]`);
    const pane = document.querySelector(`.odp-pane[data-odp-pane="${name}"]`);
    if (tab)  tab.classList.add('odp-active');
    if (pane) pane.classList.add('odp-pane-active');
    const body = document.getElementById('odpBody');
    if (body) body.scrollTop = 0;
  };

  /* ══════════════════════════════════════════════════════════
     MESSAGES — real Supabase
  ══════════════════════════════════════════════════════════ */
  async function loadMessages() {
    const list = document.getElementById('odpMsgList');
    if (!list) return;

    if (!sb() || !isRealUUID(_currentOrderId)) {
      list.innerHTML = renderFallbackMessages();
      return;
    }

    try {
      const { data, error } = await sb()
        .from('messages')
        .select('*')
        .eq('order_id', _currentOrderId)
        .order('sent_at', { ascending: true });

      if (error || !data || !data.length) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">No messages yet. Start the conversation below.</div>';
        return;
      }

      /* Mark client messages as read */
      sb().from('messages').update({ read: true }).eq('order_id', _currentOrderId).eq('from_admin', false);

      list.innerHTML = data.map(m => renderBubble(m)).join('');
      list.scrollTop = list.scrollHeight;

      /* Realtime subscription */
      sb().channel(`odp_msgs_${_currentOrderId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${_currentOrderId}` }, payload => {
          const el = document.getElementById('odpMsgList');
          if (el) { el.insertAdjacentHTML('beforeend', renderBubble(payload.new)); el.scrollTop = el.scrollHeight; }
        })
        .subscribe();

    } catch(e) {
      list.innerHTML = renderFallbackMessages();
    }
  }

  function renderBubble(m) {
    const isAdmin = m.from_admin;
    const initials = isAdmin ? 'SA' : (_currentOrder ? _currentOrder.initials : 'CL');
    const avClass  = isAdmin ? 'admin' : 'client';
    const dir      = isAdmin ? 'out' : 'in';
    const time = m.sent_at ? new Date(m.sent_at).toLocaleString('en-GB',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Just now';
    return `
    <div class="odp-msg ${dir}">
      <div class="odp-msg-av ${avClass}">${esc(initials)}</div>
      <div>
        <div class="odp-bubble">${esc(m.text||m.content||'')}</div>
        <div class="odp-bubble-time">${time}</div>
      </div>
    </div>`;
  }

  function renderFallbackMessages() {
    const initials = _currentOrder ? _currentOrder.initials : 'CL';
    return `
    <div class="odp-msg in">
      <div class="odp-msg-av client">${esc(initials)}</div>
      <div><div class="odp-bubble">Hello! I've uploaded my research brief. Please let me know the next steps.</div>
      <div class="odp-bubble-time">Recently</div></div>
    </div>
    <div class="odp-msg out">
      <div class="odp-msg-av admin">SA</div>
      <div><div class="odp-bubble">Thanks! We've assigned a specialist writer to your order. You'll receive the Chapter 1 outline within 48 hours.</div>
      <div class="odp-bubble-time">Recently</div></div>
    </div>`;
  }

  window.odpSendMessage = async function() {
    const input = document.getElementById('odpMsgInput');
    const notify = document.getElementById('odpNotifyCheck');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';

    if (!sb()) {
      /* Optimistic UI fallback */
      const list = document.getElementById('odpMsgList');
      if (list) {
        list.insertAdjacentHTML('beforeend', renderBubble({ from_admin: true, text, sent_at: new Date().toISOString() }));
        list.scrollTop = list.scrollHeight;
      }
      toast('✓ Message sent!', 'var(--accent)');
      return;
    }

    try {
      const { error } = await sb().from('messages').insert({
        order_id: _currentOrderId,
        text,
        from_admin: true,
        read: false,
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
      const notifyMsg = notify && notify.checked ? 'Message sent + email notification!' : 'Message sent!';
      toast('✓ ' + notifyMsg, 'var(--accent)');
    } catch(e) {
      toast('⚠ Failed to send message', 'var(--red)');
    }
  };

  /* ══════════════════════════════════════════════════════════
     FILES — Supabase Storage + Access Control
  ══════════════════════════════════════════════════════════ */

  /* In-memory file metadata cache for current order */
  let _fileMetaCache = {}; /* key: storagePath → { is_visible, download_allowed, notified } */

  async function loadFilesMeta(orderId) {
    _fileMetaCache = {};
    if (!sb() || !isRealUUID(orderId)) return;
    try {
      const { data } = await sb()
        .from('order_file_access')
        .select('storage_path, is_visible, download_allowed, client_notified')
        .eq('order_id', orderId);
      if (data) data.forEach(r => { _fileMetaCache[r.storage_path] = r; });
    } catch(e) { console.warn('[Files] meta load error', e); }
  }

  async function loadFiles() {
    const list   = document.getElementById('odpFileList');
    const listOv = document.getElementById('odpFileListOverview');
    if (!list && !listOv) return;

    await loadFilesMeta(_currentOrderId);

    /* Static files from order.detail */
    const d = _currentOrder && _currentOrder.detail;
    if (d && d.files && d.files.length) {
      const tableHeader = buildFileTableHeader();
      const html = d.files.map(f => renderFileRow(f)).join('');
      if (list) list.innerHTML = tableHeader + html;
      if (listOv) listOv.innerHTML = tableHeader + html;
    }

    if (!sb() || !isRealUUID(_currentOrderId)) {
      if (list && !(d && d.files && d.files.length)) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">No files uploaded yet.</div>';
      }
      return;
    }

    try {
      const safeOrderId = (_currentOrderId || '').replace(/[#?&=\s]/g, '_');
      const path = `orders/${safeOrderId}`;
      const { data, error } = await sb().storage.from('order-files').list(path, { limit: 100 });
      if (error || !data || !data.length) {
        if (!d || !d.files || !d.files.length) list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">No files uploaded yet.</div>';
        return;
      }
      const tableHeader = buildFileTableHeader();
      const html = data.map(f => renderFileRow({
        name: f.name,
        size: f.metadata?.size,
        updated_at: f.updated_at,
        supabasePath: `${path}/${f.name}`,
        uploaded_by: 'Writer'
      })).join('');
      if (list) list.innerHTML = tableHeader + html;
      if (listOv) listOv.innerHTML = tableHeader + html;
    } catch(e) {
      if (!d || !d.files || !d.files.length) {
        if (list) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Could not load files.</div>';
      }
    }
  }

  function buildFileTableHeader() {
    return `<div class="odp-file-row-head">
      <span>File Name</span>
      <span>Type</span>
      <span>Uploaded By</span>
      <span>Uploaded At</span>
      <span>Size</span>
      <span>Client Access</span>
      <span>Actions</span>
    </div>`;
  }

  function renderFileRow(f) {
    const ext        = (f.name || '').split('.').pop().toLowerCase();
    const pillCls    = ext==='pdf' ? 'pdf' : (ext==='docx'||ext==='doc') ? 'docx' : ext==='zip' ? 'zip' : ext.match(/png|jpg|jpeg|gif|webp/) ? 'img' : 'other';
    const icon       = ext==='pdf' ? 'ti-file-type-pdf' : (ext==='docx'||ext==='doc') ? 'ti-file-type-doc' : ext==='zip' ? 'ti-file-zip' : ext.match(/png|jpg|jpeg|gif|webp/) ? 'ti-photo' : 'ti-file';
    const size       = f.size ? (f.size/1024 < 1024 ? (f.size/1024).toFixed(0)+' KB' : (f.size/1024/1024).toFixed(1)+' MB') : '—';
    const uploadedAt = f.updated_at ? new Date(f.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) + ' ' + new Date(f.updated_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '—';
    const uploader   = f.uploaded_by || (f.supabasePath ? 'Writer' : 'Client');
    const path       = f.supabasePath || '';

    /* Access control defaults from DB meta, fallback: visible=true, download=true */
    const meta       = _fileMetaCache[path] || {};
    const isVisible  = meta.is_visible  !== undefined ? meta.is_visible  : true;
    const dlAllowed  = meta.download_allowed !== undefined ? meta.download_allowed : true;
    const notified   = meta.client_notified || false;
    const chkId      = 'vis_' + path.replace(/[^a-z0-9]/gi, '_');
    const notifBadge = notified ? `<span class="odp-notif-sent">✓ Notified</span>` : '';

    return `
    <div class="odp-file-row${isVisible ? '' : ' client-hidden'}" data-path="${esc(path)}" data-dl="${dlAllowed}" data-vis="${isVisible}">
      <div class="odp-file-name-cell">
        <i class="ti ${icon}"></i>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span>
        ${notifBadge}
      </div>
      <span class="odp-file-type-pill ${pillCls}">${ext}</span>
      <span style="color:var(--muted2);font-size:11.5px">${esc(uploader)}</span>
      <span style="color:var(--muted2);font-size:11px">${uploadedAt}</span>
      <span style="color:var(--muted2);font-size:11.5px">${size}</span>
      <div class="odp-access-cell">
        <span class="odp-access-badge ${isVisible ? 'viewable' : 'hidden'}" id="badge_${chkId}">${isVisible ? '● Viewable' : '○ Hidden'}</span>
        <label class="odp-mini-toggle" title="Toggle client visibility">
          <input type="checkbox" ${isVisible ? 'checked' : ''} onchange="odpToggleVisibility('${esc(path)}','${esc(f.name)}',this)">
          <div class="odp-mini-track"></div>
          <div class="odp-mini-thumb"></div>
        </label>
      </div>
      <div class="odp-file-actions">
        <button class="odp-file-action-btn" title="Download file (admin)" onclick="odpDownloadFile('${esc(path)}','${esc(f.name)}')"><i class="ti ti-download"></i></button>
        <button class="odp-file-action-btn${dlAllowed ? '' : ' locked-dl'}" title="${dlAllowed ? 'Client download allowed — click to lock' : 'Client download locked — click to unlock'}" onclick="odpToggleDownload('${esc(path)}',this)"><i class="ti ${dlAllowed ? 'ti-lock-open' : 'ti-lock'}"></i></button>
        <button class="odp-file-action-btn" title="Send notification to client" onclick="odpNotifyClient('${esc(path)}','${esc(f.name)}',this)"><i class="ti ti-bell"></i></button>
        <button class="odp-file-action-btn danger" title="Delete file" onclick="odpDeleteFile('${esc(path)}',this)"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
  }

  /* Save access meta to Supabase */
  async function saveFileMeta(storagePath, updates) {
    if (!sb() || !isRealUUID(_currentOrderId)) return;
    try {
      await sb().from('order_file_access').upsert({
        order_id: _currentOrderId,
        storage_path: storagePath,
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'order_id,storage_path' });
      /* update local cache */
      _fileMetaCache[storagePath] = { ..._fileMetaCache[storagePath], ...updates };
    } catch(e) { console.error('[Files] meta save error', e); }
  }

  window.odpUploadFiles = async function(files) {
    if (!files || !files.length) return;
    const list = document.getElementById('odpFileList');
    const existing = list ? list.querySelector('.odp-loading, div[style*="text-align:center"]') : null;
    if (existing) existing.remove();

    const safeOrderId = (_currentOrderId || 'unknown').replace(/[#?&=\s]/g, '_');

    for (const f of Array.from(files)) {
      const safeName = f.name.replace(/[#?&=]/g, '_');
      const placeholder = document.createElement('div');
      placeholder.className = 'odp-file-row';
      placeholder.innerHTML = `<div style="flex:1;font-size:12px;color:var(--muted2)"><i class="ti ti-loader" style="animation:spin .7s linear infinite"></i> Uploading ${esc(f.name)}…</div>`;
      if (list) list.appendChild(placeholder);

      if (!sb()) {
        await new Promise(res => setTimeout(res, 1200));
        const fakeRow = document.createElement('div');
        fakeRow.innerHTML = renderFileRow({ name: f.name, size: f.size, updated_at: new Date().toISOString(), supabasePath: `orders/${safeOrderId}/${safeName}`, uploaded_by: 'Writer' });
        placeholder.replaceWith(fakeRow.firstElementChild);
        toast(`✓ ${f.name} uploaded!`, 'var(--green)');
        logActivity('file_upload', `File uploaded: ${f.name}`);
        continue;
      }

      try {
        const path = `orders/${safeOrderId}/${safeName}`;
        const { error } = await sb().storage.from('order-files').upload(path, f, { upsert: true });
        if (error) throw error;
        /* Create default access record — hidden from client until admin enables */
        await saveFileMeta(path, { is_visible: false, download_allowed: true, client_notified: false });
        placeholder.remove();
        toast(`✓ ${f.name} uploaded! Set Client Access to show it.`, 'var(--green)');
        logActivity('file_upload', `File uploaded: ${f.name}`);
      } catch(e) {
        console.error('Upload error:', e);
        placeholder.innerHTML = `<div style="color:var(--red);font-size:12px;padding:8px 0">⚠ Upload failed: ${esc(f.name)} — ${esc(e.message||'Unknown error')}</div>`;
        toast(`⚠ Upload failed: ${f.name} — ${e.message||''}`, 'var(--red)');
      }
    }
    await loadFiles();
  };

  window.odpDragOver = function(e) { e.preventDefault(); document.getElementById('odpDropZone').style.borderColor='var(--accent)'; };
  window.odpDrop = function(e) { e.preventDefault(); document.getElementById('odpDropZone').style.borderColor=''; odpUploadFiles(e.dataTransfer.files); };

  window.odpDownloadFile = async function(path, name) {
    if (!path || !sb()) { toast('⚠ Download not available', 'var(--red)'); return; }
    try {
      const { data, error } = await sb().storage.from('order-files').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { toast('⚠ Download failed', 'var(--red)'); }
  };

  /* Toggle client visibility (Viewable/Hidden) */
  window.odpToggleVisibility = async function(path, name, checkbox) {
    const isVisible = checkbox.checked;
    const row = checkbox.closest('.odp-file-row');
    const badge = row ? row.querySelector('.odp-access-badge') : null;

    /* Optimistic UI */
    if (badge) {
      badge.className = 'odp-access-badge ' + (isVisible ? 'viewable' : 'hidden');
      badge.textContent = isVisible ? '● Viewable' : '○ Hidden';
    }
    if (row) {
      row.classList.toggle('client-hidden', !isVisible);
      row.dataset.vis = isVisible;
    }

    await saveFileMeta(path, { is_visible: isVisible });
    toast(isVisible ? `✓ "${name}" is now visible to client` : `"${name}" hidden from client`, isVisible ? 'var(--green)' : 'var(--muted)');
  };

  /* Toggle download lock */
  window.odpToggleDownload = async function(path, btn) {
    const row = btn.closest('.odp-file-row');
    const currentlyAllowed = row ? row.dataset.dl === 'true' : true;
    const nowAllowed = !currentlyAllowed;

    /* Optimistic UI */
    btn.classList.toggle('locked-dl', !nowAllowed);
    btn.title = nowAllowed ? 'Download allowed — click to lock' : 'Download locked — click to unlock';
    btn.querySelector('i').className = 'ti ' + (nowAllowed ? 'ti-lock-open' : 'ti-lock');
    if (row) row.dataset.dl = nowAllowed;

    await saveFileMeta(path, { download_allowed: nowAllowed });
    toast(nowAllowed ? '🔓 Download unlocked for client' : '🔒 Download locked for client', nowAllowed ? 'var(--green)' : 'var(--yellow)');
  };

  /* Send notification to client about new file */
  window.odpNotifyClient = async function(path, name, btn) {
    if (!sb() || !isRealUUID(_currentOrderId)) {
      toast('⚠ Cannot send notification (no Supabase)', 'var(--red)');
      return;
    }
    try {
      /* Insert notification into client_notifications table */
      await sb().from('client_notifications').insert({
        order_id: _currentOrderId,
        type: 'file_uploaded',
        message: `A new file "${name}" is available for your order.`,
        storage_path: path,
        is_read: false,
        created_at: new Date().toISOString()
      });
      /* Mark as notified in file meta */
      await saveFileMeta(path, { client_notified: true });

      /* Update UI badge */
      const row = btn.closest('.odp-file-row');
      const nameCell = row ? row.querySelector('.odp-file-name-cell') : null;
      if (nameCell && !nameCell.querySelector('.odp-notif-sent')) {
        nameCell.insertAdjacentHTML('beforeend', '<span class="odp-notif-sent">✓ Notified</span>');
      }
      btn.style.color = 'var(--green)';
      toast(`✓ Client notified about "${name}"`, 'var(--green)');
    } catch(e) {
      console.error('[Notify] error:', e);
      toast('⚠ Notification failed: ' + (e.message || 'Unknown'), 'var(--red)');
    }
  };

  window.odpDeleteFile = async function(path, btn) {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    const row = btn.closest('.odp-file-row');
    if (sb() && path) {
      try {
        await sb().storage.from('order-files').remove([path]);
        /* Also remove access meta */
        if (isRealUUID(_currentOrderId)) {
          await sb().from('order_file_access').delete()
            .eq('order_id', _currentOrderId)
            .eq('storage_path', path);
        }
      } catch(e) { console.warn('[Files] delete error', e); }
    }
    if (row) row.remove();
    delete _fileMetaCache[path];
    toast('File deleted', 'var(--red)');
  };

  /* ══════════════════════════════════════════════════════════
     PAYMENTS
  ══════════════════════════════════════════════════════════ */
  async function loadPaymentHistory() {
    const el = document.getElementById('odpPayHistory');
    if (!el) return;

    if (!sb() || !isRealUUID(_currentOrderId)) {
      el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">Payment history unavailable.</div>';
      return;
    }

    try {
      const { data } = await sb().from('payments').select('*').eq('order_id', _currentOrderId).order('paid_at', { ascending: true });
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
        const rawTotal = _currentOrder ? Number(String(_currentOrder.amount || '').replace(/[^\d]/g, '')) || 0 : 0;
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
            <div class="odp-proof-box" style="cursor:pointer" onclick="window.open('${esc(latestWithNote.screenshot_url)}','_blank')">
              <div class="odp-proof-icon"><i class="ti ti-file-invoice" style="color:var(--accent)"></i></div>
              <div>
                <div class="odp-proof-name">${esc(name)}</div>
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
                      : esc(p.label || p.type || 'Payment');
        const amtStr  = p.amount && p.amount > 0 ? '৳' + Number(p.amount).toLocaleString() : '—';
        const method  = p.method || '—';
        const txnId   = p.txn_id ? `<span style="font-size:11px;color:var(--accent2);font-family:monospace">${esc(p.txn_id)}</span>` : '—';
        const statusCls = p.confirmed ? 'green' : (p.type==='note'?'muted':'orange');
        const statusLabel = p.confirmed ? 'Approved' : p.type==='note' ? '—' : p.type==='approval'||p.type==='received' ? 'Received' : 'Pending';
        const actionBtn = (p.type === 'advance' || p.type === 'payment' || p.type === 'balance') && !p.confirmed
          ? `<i class="ti ti-eye" style="cursor:pointer;color:var(--accent2)" title="View proof" onclick="odpViewProof('${esc(p.screenshot_url||'')}')"></i>
             <i class="ti ti-download" style="cursor:pointer;color:var(--muted2);margin-left:4px" title="Download proof" onclick="odpViewProof('${esc(p.screenshot_url||'')}')"></i>`
          : (p.type === 'advance' || p.type === 'payment') && p.confirmed
          ? `<i class="ti ti-eye" style="cursor:pointer;color:var(--muted2)" title="View proof" onclick="odpViewProof('${esc(p.screenshot_url||'')}')"></i>`
          : '—';
        const noteStr = p.note ? `<span style="font-size:11px;color:var(--muted2)">${esc(p.note)}</span>` : 'Initial payment sent';

        return `<div class="odp-pay-table-row">
          <span style="color:var(--muted2);font-size:11px">${i+1}</span>
          <span style="font-size:11px;color:var(--muted2)">${dateStr}</span>
          <span style="font-size:11.5px">${type}</span>
          <span style="font-size:12px;font-weight:600;color:var(--text)">${amtStr}</span>
          <span style="font-size:11.5px;color:var(--muted2)">${esc(method)}<br>${txnId}</span>
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
    if (!url) { toast('⚠ No proof uploaded', 'var(--muted)'); return; }
    window.open(url, '_blank');
  };

  /* Live due preview as admin types received amount */
  window.odpUpdateDuePreview = function(val) {
    const total = _currentOrder ? (_currentOrder.total_price || (_currentOrder.detail && _currentOrder.detail.financials && _currentOrder.detail.financials.total) || 0) : 0;
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

    if (!sb()) {
      setTimeout(() => {
        section.innerHTML = `<div class="odp-proof-box"><div class="odp-proof-icon"><i class="ti ti-file-invoice"></i></div><div><div class="odp-proof-name">${esc(f.name)}</div><div class="odp-proof-sub">${(f.size/1024).toFixed(0)} KB · Just uploaded</div></div></div>`;
        toast('✓ Proof uploaded!', 'var(--green)');
      }, 1000);
      return;
    }

    try {
      const path = `payments/${_currentOrderId}/${f.name}`;
      const { error } = await sb().storage.from('order-files').upload(path, f, { upsert: true });
      if (error) throw error;
      section.innerHTML = `<div class="odp-proof-box"><div class="odp-proof-icon"><i class="ti ti-file-invoice"></i></div><div><div class="odp-proof-name">${esc(f.name)}</div><div class="odp-proof-sub">${(f.size/1024).toFixed(0)} KB · Uploaded</div></div></div>`;
      toast('✓ Payment proof uploaded!', 'var(--green)');
    } catch(e) { toast('⚠ Upload failed', 'var(--red)'); }
  };

  window.odpApprovePayment = async function() {
    if (sb() && isRealUUID(_currentOrderId)) {
      try {
        await sb().from('orders').update({ payment_status: 'approved', updated_at: new Date().toISOString() }).eq('id', _currentOrderId);
        await sb().from('payments').update({ confirmed: true }).eq('order_id', _currentOrderId).eq('type', 'advance');
        /* Notify client */
        await sb().from('client_notifications').insert({ order_id: _currentOrderId, client_id: _currentOrder && _currentOrder.clientId, type: 'payment_approved', message: 'Your payment has been approved! Your order is now in progress.', is_read: false, created_at: new Date().toISOString() }).catch(()=>{});
      } catch(e) { console.error(e); }
    }
    _appendPayHistoryItem({ label: 'Payment Approved', type: 'approval', method: 'Admin', amount: 0, confirmed: true, created_at: new Date().toISOString() });
    /* Update banner */
    const banner = document.querySelector('.odp-pay-banner');
    if (banner) banner.remove();
    await _reloadPaymentFinancials();
    await loadPaymentHistory();
    toast('✓ Payment approved! Client notified.', 'var(--green)');
    logActivity('payment', 'Payment approved by admin');
  };

  window.odpRejectPayment = async function() {
    if (!confirm('Reject this payment? Client will need to re-submit.')) return;
    if (sb() && isRealUUID(_currentOrderId)) {
      try {
        await sb().from('orders').update({ payment_status: 'rejected', updated_at: new Date().toISOString() }).eq('id', _currentOrderId);
        await sb().from('client_notifications').insert({ order_id: _currentOrderId, client_id: _currentOrder && _currentOrder.clientId, type: 'payment_rejected', message: 'Your payment could not be verified. Please re-submit with correct transaction ID.', is_read: false, created_at: new Date().toISOString() }).catch(()=>{});
      } catch(e) { console.error(e); }
    }
    await _reloadPaymentFinancials();
    toast('Payment rejected. Client notified.', 'var(--red)');
    logActivity('payment', 'Payment rejected by admin');
  };

  window.odpMarkPaymentReceived = async function() {
    const recvEl = document.getElementById('odpReceivedAmount');
    const received = recvEl ? (parseFloat(recvEl.value) || 0) : 0;
    const total = _currentOrder ? (_currentOrder.total_price || (_currentOrder.detail && _currentOrder.detail.financials && _currentOrder.detail.financials.total) || 0) : 0;
    const due = Math.max(0, total - received);

    if (received <= 0) {
      toast('⚠ আগে received amount টাইপ করুন', 'var(--gold)');
      document.getElementById('odpReceivedAmount')?.focus();
      return;
    }

    if (sb() && isRealUUID(_currentOrderId)) {
      try {
        await sb().from('orders').update({
          payment_status: due === 0 ? 'paid' : 'approved',
          advance_paid:   received,
          due_amount:     due,
          updated_at:     new Date().toISOString()
        }).eq('id', _currentOrderId);

        await sb().from('payments').insert({
          order_id:   _currentOrderId,
          label:      'Payment Received',
          type:       'received',
          method:     'Admin',
          amount:     received,
          confirmed:  true,
          paid_at:    new Date().toISOString()
        });

        await sb().from('client_notifications').insert({
          order_id:   _currentOrderId,
          client_id:  _currentOrder && _currentOrder.clientId,
          type:       'payment_received',
          message:    due === 0
            ? 'আপনার সম্পূর্ণ payment পাওয়া গেছে! Files এখন unlock হয়েছে।'
            : `৳${Number(received).toLocaleString()} payment পাওয়া গেছে। বাকি ৳${Number(due).toLocaleString()} পরিশোধ করুন।`,
          is_read:    false,
          created_at: new Date().toISOString()
        }).catch(()=>{});
      } catch(e) { console.error(e); toast('⚠ Error: ' + e.message, 'var(--red)'); return; }
    }

    /* Update summary stat cards live */
    const sentEl = document.querySelector('#odpClientSentAmount');
    _appendPayHistoryItem({ label: 'Payment Received', type: 'received', method: 'Admin', amount: received, confirmed: true, created_at: new Date().toISOString() });

    /* Update due/paid display */
    const banner = document.querySelector('.odp-pay-banner');
    if (banner && due === 0) banner.remove();
    const dueNote = document.querySelector('.odp-pay-due-note');
    if (dueNote && due === 0) dueNote.remove();

    await _reloadPaymentFinancials();
    await loadPaymentHistory();

    const msg = due === 0
      ? '✓ Full payment received! Files unlocked. Client notified.'
      : `✓ ৳${Number(received).toLocaleString()} received. Due: ৳${Number(due).toLocaleString()}. Client notified.`;
    toast(msg, due === 0 ? 'var(--green)' : 'var(--gold)');
    logActivity('payment', `Payment received: ৳${received}. Due: ৳${due}`);
  };

  window.odpMarkPaid = window.odpMarkPaymentReceived;

  window.odpSavePayNote = async function() {
    const note = document.getElementById('odpPayNote');
    if (!note || !note.value.trim()) return;
    const text = note.value.trim();

    /* Mock order — শুধু UI তে history add করো */
    if (!sb() || !isRealUUID(_currentOrderId)) {
      _appendPayHistoryItem({ label: 'Internal Note', type: 'note', method: 'Admin', amount: null, created_at: new Date().toISOString(), note: text });
      note.value = '';
      toast('✓ Note saved (mock mode)!', 'var(--green)');
      return;
    }

    /* Real order — Supabase payments table এ insert */
    try {
      const { error } = await sb().from('payments').insert({
        order_id:   _currentOrderId,
        label:      'Internal Note',
        type:       'note',
        method:     'Admin',
        amount:     0,
        note:       text,
        paid_at:    new Date().toISOString(),
      });
      if (error) throw error;
      _appendPayHistoryItem({ label: 'Internal Note', type: 'note', method: 'Admin', amount: 0, created_at: new Date().toISOString(), note: text });
      note.value = '';
      toast('✓ Payment note saved!', 'var(--green)');
      logActivity('payment', 'Internal note added');
    } catch(e) {
      toast('⚠ Note save failed: ' + (e.message || ''), 'var(--red)');
    }
  };

  /* Payment History এ নতুন item append করার helper */
  function _appendPayHistoryItem(p) {
    const el = document.getElementById('odpPayHistory');
    if (!el) return;
    /* যদি এখনো "unavailable / no records" দেখাচ্ছে, clear করো */
    if (el.querySelector('div[style]')) el.innerHTML = '';
    const isNote = p.type === 'note';
    const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '';
    const amtDisplay = (p.amount === 0 || p.amount === null) ? (p.note ? `<span style="font-size:11px;color:var(--muted2);font-style:italic">${esc(p.note.substring(0,40))}${p.note.length>40?'…':''}</span>` : '—') : `<span class="odp-pay-hist-val ${p.amount>0?'green':'orange'}">${p.amount>0?'+':''}${esc(String(p.amount))}</span>`;
    const row = document.createElement('div');
    row.className = 'odp-pay-hist-item';
    row.innerHTML = `
      <div>
        <div class="odp-pay-hist-label">${esc(p.label || p.type || 'Payment')}</div>
        <div class="odp-pay-hist-sub">${dateStr}${p.method ? ' · ' + esc(p.method) : ''}</div>
      </div>
      ${amtDisplay}`;
    el.insertBefore(row, el.firstChild);
  }

  /* ══════════════════════════════════════════════════════════
     STATUS & MILESTONE UPDATE
  ══════════════════════════════════════════════════════════ */
  const STATUS_LABELS = {
    'writing':     'In Progress',
    'completed':   'Completed',
    'pending':     'Pending',
    'draft_ready': 'In Review',
    'overdue':     'Overdue',
    'hold':        'On Hold',
  };

  const STATUS_EMOJI = {
    'writing':     '🔵',
    'completed':   '🟢',
    'pending':     '🟡',
    'draft_ready': '🔷',
    'overdue':     '🔴',
    'hold':        '⚫',
  };

  window.odpMarkCompleted = function() {
    if (confirm('Mark this order as Completed?')) {
      window.odpUpdateStatus('completed');
    }
  };

  window.odpUpdateStatus = async function(val) {
    if (!sb()) {
      toast('⚠ Supabase not connected', 'var(--red)');
      return;
    }

    const sel = document.getElementById('odpStatusSelect');
    const btn = document.querySelector('.odp-btn-accent.odp-btn-sm');
    if (sel) sel.disabled = true;
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

    /* Mock order — শুধু UI update, DB skip */
    if (!isRealUUID(_currentOrderId)) {
      const label = STATUS_LABELS[val] || val;
      const pill = document.querySelector('.odp-status-pill');
      if (pill) {
        pill.className = 'odp-status-pill';
        const cls = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', overdue:'s-overdue', hold:'s-pending' }[val] || 's-pending';
        pill.classList.add(cls);
        pill.textContent = label;
      }
      /* Update mock ORDERS array in order-management.js if accessible */
      if (window.ORDERS && _currentOrder) {
        const o = window.ORDERS.find(x => x.id === _currentOrderId);
        if (o) {
          const clsMap = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', overdue:'s-overdue', hold:'s-pending' };
          const lblMap = STATUS_LABELS;
          o.status = lblMap[val] || val;
          o.statusClass = clsMap[val] || 's-pending';
          if (typeof renderTable === 'function') renderTable();
        }
      }
      if (sel) sel.disabled = false;
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      toast(`✓ Status → "${label}" (mock mode — DB update বাদ)`, 'var(--green)');
      return;
    }

    try {
      /* 1. Update order status in DB */
      const { error: orderErr } = await sb()
        .from('orders')
        .update({ status: val, updated_at: new Date().toISOString() })
        .eq('id', _currentOrderId);

      if (orderErr) throw orderErr;

      /* 2. Update pill in the panel header immediately */
      const pill = document.querySelector('.odp-status-pill');
      if (pill) {
        pill.className = 'odp-status-pill';
        const cls = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', overdue:'s-overdue', hold:'s-pending' }[val] || 's-pending';
        pill.classList.add(cls);
        pill.textContent = STATUS_LABELS[val] || val;
      }

      /* 3. Send notification message to client via messages table */
      const label = STATUS_LABELS[val] || val;
      const emoji = STATUS_EMOJI[val] || '📋';
      const notifyText = `${emoji} আপনার অর্ডারের status update হয়েছে: "${label}"\n\nযেকোনো প্রশ্ন থাকলে আমাদের জানান।`;

      await sb().from('messages').insert({
        order_id:   _currentOrderId,
        text:       notifyText,
        from_admin: true,
        read:       false,
        sent_at:    new Date().toISOString(),
      });

      /* 4. Log in activity */
      logActivity('status', `Status changed to: ${label}`);

      /* 5. Update order-management table row badge if visible */
      const rowEl = document.querySelector(`tr[data-order-id="${_currentOrderId}"] .status-badge, .order-row-${_currentOrderId} .status-badge`);
      if (rowEl) {
        rowEl.className = 'status-badge s-' + (val === 'writing' ? 'inprogress' : val === 'draft_ready' ? 'review' : val);
        rowEl.textContent = label;
      }

      toast(`✓ Status → "${label}" · Client কে notification পাঠানো হয়েছে`, 'var(--green)');

    } catch(e) {
      console.error('Status update error:', e);
      toast('⚠ Update failed: ' + (e.message || 'Unknown error'), 'var(--red)');
    } finally {
      if (sel) sel.disabled = false;
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    }
  };

  window.odpUpdateMilestone = async function(val) {
    if (sb()) {
      try {
        await sb().from('orders').update({
          current_milestone: val,
          updated_at: new Date().toISOString()
        }).eq('id', _currentOrderId);

        /* Notify client about milestone change */
        await sb().from('messages').insert({
          order_id:   _currentOrderId,
          text:       `📌 Milestone update: আপনার thesis এখন "${val}" পর্যায়ে আছে।`,
          from_admin: true,
          read:       false,
          sent_at:    new Date().toISOString(),
        });
      } catch(e) {}
    }
    toast(`✓ Milestone → "${val}" · Client notified`, 'var(--accent)');
    logActivity('milestone', `Milestone updated: ${val}`);
  };

  window.odpConfirmOrder = async function() {
    if (sb()) {
      try { await sb().from('orders').update({ confirmed_at: new Date().toISOString() }).eq('id', _currentOrderId); } catch(e) {}
    }
    toast('✓ Order confirmed and activated!', 'var(--green)');
    logActivity('confirm', 'Order confirmed by admin');
  };

  /* ══════════════════════════════════════════════════════════
     ACTIVITY TIMELINE
  ══════════════════════════════════════════════════════════ */
  async function loadActivity() {
    const el = document.getElementById('odpActivityList');
    if (!el) return;

    /* Build from messages + static events */
    const staticEvents = [
      { color:'yellow', time: _currentOrder ? (_currentOrder.deadline ? `Deadline: ${_currentOrder.deadline}` : '') : '', text:'Order created', sub:`${_currentOrder?.pkg||'Thesis'} · Deadline: ${_currentOrder?.deadline||''} ${_currentOrder?.deadlineTime||''}` },
      { color:'purple', time:'', text:'Writer assigned', sub:'Assigned by Admin' },
      { color:'green',  time:'', text:'Payment received', sub:`Amount: ${_currentOrder?.amount||'—'}` },
      { color:'blue',   time:'', text:'Brief submitted', sub:'Client uploaded research brief' },
    ];

    let extraEvents = [];
    if (sb() && isRealUUID(_currentOrderId)) {
      try {
        const { data } = await sb().from('messages').select('sent_at,from_admin,text').eq('order_id', _currentOrderId).order('sent_at',{ascending:false}).limit(5);
        extraEvents = (data||[]).map(m => ({
          color: m.from_admin ? 'blue' : 'purple',
          time: m.sent_at ? new Date(m.sent_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '',
          text: m.from_admin ? 'Message sent by admin' : 'Message received from client',
          sub: (m.text||'').substring(0,60) + ((m.text||'').length>60?'…':''),
        }));
      } catch(e) {}
    }

    const allEvents = [..._activityLog, ...extraEvents, ...staticEvents];
    if (!allEvents.length) { el.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px 0">No activity recorded yet.</div>'; return; }

    el.innerHTML = `<div class="odp-timeline">${allEvents.map(ev => `
      <div class="odp-tl-item">
        <div class="odp-tl-dot ${ev.color}"></div>
        ${ev.time ? `<div class="odp-tl-time">${esc(ev.time)}</div>` : ''}
        <div class="odp-tl-text"><span class="tl-em" style="color:var(--${ev.color==='blue'?'accent2':ev.color==='yellow'?'yellow':ev.color==='red'?'red':'green'})">${esc(ev.text)}</span></div>
        ${ev.sub ? `<div class="odp-tl-sub">${esc(ev.sub)}</div>` : ''}
      </div>`).join('')}
    </div>`;
  }

  /* ── Render overview horizontal timeline ── */
  function _renderOvTimeline(order) {
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
        <div class="odp-ov-tl-lbl ${cls}">${esc(ms.name)}</div>
        <div class="odp-ov-tl-date">${esc(ms.date||'Pending')}</div>
      </div>`;
    }).join('');
  }

  /* In-memory activity log for current session */
  let _activityLog = [];
  function logActivity(type, text) {
    const colorMap = { status:'green', milestone:'yellow', file_upload:'green', payment:'green', confirm:'purple', message:'blue' };
    _activityLog.unshift({ color: colorMap[type]||'blue', time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), text, sub:'' });
    /* Re-render activity if tab is active */
    const actPane = document.querySelector('.odp-pane[data-odp-pane="activity"]');
    if (actPane && actPane.classList.contains('odp-pane-active')) loadActivity();
  }

  /* ══════════════════════════════════════════════════════════
     LOAD CLIENT ORDER COUNT
  ══════════════════════════════════════════════════════════ */
  async function loadClientOrderCount() {
    if (!sb() || !_currentOrder) return;
    const clientId = _currentOrder.clientId || _currentOrder.rawClientId || '';
    if (!clientId || !isRealUUID(_currentOrderId)) return;

    try {
      /* Total orders count */
      const { count } = await sb()
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId);

      const elOrders = document.getElementById('odpClientOrders');
      if (elOrders && count !== null) elOrders.textContent = count;

      /* Active orders */
      const { count: activeCount } = await sb()
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .in('status', ['pending', 'confirmed', 'writing', 'draft_ready']);

      const elActive = document.getElementById('odpClientActive');
      if (elActive && activeCount !== null) elActive.textContent = activeCount;

      /* Total spend */
      const { data: spendData } = await sb()
        .from('orders')
        .select('total_price')
        .eq('client_id', clientId)
        .eq('payment_status', 'paid');

      const elSpend = document.getElementById('odpClientSpend');
      if (elSpend && spendData) {
        const total = spendData.reduce((s, o) => s + (Number(o.total_price) || 0), 0);
        elSpend.textContent = total > 0 ? '৳' + total.toLocaleString() : '৳0';
      }

      /* Client ID short display */
      const elId = document.getElementById('odpClientId');
      if (elId) elId.textContent = clientId.slice(0, 8).toUpperCase();

    } catch(e) { console.error('client stats error', e); }
  }

})();
