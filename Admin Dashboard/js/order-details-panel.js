/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — Order Details Panel (order-details-panel.js)
   Full functional: real Supabase data, file upload, messages, payments
═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  let _timerInterval = null;
  let _currentOrderId = null;
  let _currentOrder = null;

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
    const pkgDisplay = order.pkg || 'Thesis';

    return `
<div class="odp-overlay" id="odpOverlay">

  <!-- TOPBAR -->
  <div class="odp-topbar">
    <button class="odp-back" onclick="closeOrderDetailsPanel()"><i class="ti ti-arrow-left"></i> Orders</button>
    <span class="odp-breadcrumb"><span>Orders</span><span class="sep"> › </span><span class="cur">${esc(order.id)}</span></span>
    <div class="odp-spacer"></div>
    <div class="odp-countdown" id="odpCountdownWrap">
      <i class="ti ti-alarm"></i>
      <span id="odpCountdown">—</span>
      <span style="opacity:0.5;font-size:10px">to deadline</span>
    </div>
    <div class="odp-topbar-actions">
      <button class="odp-icon-btn" title="Print" onclick="window.print()"><i class="ti ti-printer"></i></button>
      <button class="odp-icon-btn" title="More"><i class="ti ti-dots"></i></button>
    </div>
  </div>

  <!-- HEADER CARD -->
  <div class="odp-header-card">
    <div class="odp-header-left">
      <div class="odp-title-row">
        <div class="odp-title">${esc(order.topic)}</div>
        <span class="odp-status-pill ${statusClass}">${esc(statusLabel)}</span>
      </div>
      <div class="odp-meta-row">
        <span class="odp-meta-item"><i class="ti ti-user"></i> ${esc(order.client)}</span>
        <span class="odp-meta-item"><i class="ti ti-building"></i> ${esc(order.uni)}</span>
        <span class="odp-meta-item"><i class="ti ti-book"></i> ${esc(pkgDisplay)}</span>
        <span class="odp-meta-item"><i class="ti ti-calendar"></i> Deadline: ${esc(order.deadline)} ${esc(order.deadlineTime)}</span>
        <span class="odp-meta-item"><i class="ti ti-cash"></i> ${esc(order.amount)}</span>
      </div>
    </div>
    <div class="odp-header-right">
      <button class="odp-btn odp-btn-sm" onclick="odpSwitchTab('messages')"><i class="ti ti-message-circle"></i> Message</button>
      <button class="odp-btn odp-btn-sm" onclick="odpSwitchTab('files')"><i class="ti ti-upload"></i> Upload</button>
    </div>
  </div>

  <!-- TABS -->
  <div class="odp-tabs-wrap">
    <div class="odp-tabs">
      <button class="odp-tab odp-active" data-odp-tab="overview"  onclick="odpSwitchTab('overview')"><i class="ti ti-layout-2"></i> Overview</button>
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
    const pfClass = pct >= 80 ? 'pf-green' : pct >= 40 ? 'pf-yellow' : 'pf-red';
    const pctColor = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--yellow)' : 'var(--red)';

    const chapters = (d.chapterBreakdown || []).map(ch => {
      const pf = ch.pct >= 80 ? 'pf-green' : ch.pct >= 40 ? 'pf-yellow' : 'pf-red';
      return `<div class="odp-chapter-item">
        <span class="odp-ch-name">${esc(ch.name)}</span>
        <div class="odp-ch-bar-wrap"><div class="odp-ch-bar ${pf}" style="width:${ch.pct}%"></div></div>
        <span class="odp-ch-lbl">${esc(ch.label)}</span>
      </div>`;
    }).join('');


    return `
    <div class="odp-grid-2">
      <!-- Client Info -->
      <div class="odp-card">
        <div class="odp-card-title"><i class="ti ti-user-circle"></i> Client Information</div>
        <div class="odp-client-row">
          <div class="odp-client-av" style="background:${esc(order.avatarColor)}">${esc(order.initials)}</div>
          <div style="flex:1">
            <div class="odp-client-name">${esc(order.client)}</div>
            <div class="odp-client-sub">${esc(order.uni)}</div>
          </div>
          <span class="odp-client-badge">Client</span>
        </div>
        <div class="odp-grid-2" style="gap:10px">
          <div class="odp-field"><label>Email</label>
            <div class="odp-field-val"><a href="mailto:${esc(d.email||'')}">${esc(d.email||'Not provided')}</a></div></div>
          <div class="odp-field"><label>Total Orders</label>
            <div class="odp-field-val muted" id="odpClientOrders">—</div></div>
          <div class="odp-field"><label>University</label>
            <div class="odp-field-val muted">${esc(order.uni)}</div></div>
          <div class="odp-field"><label>Verification</label>
            <div class="odp-field-val" style="color:var(--green)"><i class="ti ti-shield-check" style="font-size:13px;vertical-align:-1px"></i> Verified</div></div>
        </div>
      </div>

      <!-- Order Info -->
      <div class="odp-card">
        <div class="odp-card-title"><i class="ti ti-clipboard-text"></i> Order Information</div>
        <div class="odp-grid-2" style="gap:10px">
          <div class="odp-field"><label>Service Type</label><div class="odp-field-val">${esc(order.pkg)}</div></div>
          <div class="odp-field"><label>Chapters</label><div class="odp-field-val">${esc(order.chapters)} chapters</div></div>
          <div class="odp-field"><label>Word Count</label><div class="odp-field-val muted">${esc(order.wordcount)}</div></div>
          <div class="odp-field"><label>Citation Style</label><div class="odp-field-val muted">${esc(d.citationStyle||order.citationStyle||'APA 7th Ed.')}</div></div>
          <div class="odp-field"><label>Amount</label><div class="odp-field-val" style="color:var(--accent2)">${esc(order.amount)}</div></div>
          <div class="odp-field"><label>Deadline</label><div class="odp-field-val muted">${esc(order.deadline)} ${esc(order.deadlineTime)}</div></div>
        </div>
      </div>
    </div>

    <div class="odp-grid-2">
      <!-- Thesis Details — dynamic, filled by renderThesisDetailsCard() -->
      <div class="odp-card" id="odpThesisDetailsCard">
        <div class="odp-card-title"><i class="ti ti-forms"></i> Client Submission Details</div>
        <div class="odp-loading"><div class="odp-spinner"></div> Loading...</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        <!-- Status & Milestone -->
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-adjustments-horizontal"></i> Status & Milestone</div>
          <div class="odp-field"><label>Order Status</label>
            <select class="odp-select" id="odpStatusSelect">
              <option value="writing"     ${statusClass==='s-inprogress'?'selected':''}>🔵 In Progress</option>
              <option value="completed"   ${statusClass==='s-completed' ?'selected':''}>🟢 Completed</option>
              <option value="pending"     ${statusClass==='s-pending'   ?'selected':''}>🟡 Pending</option>
              <option value="draft_ready" ${statusClass==='s-review'    ?'selected':''}>🔷 In Review</option>
              <option value="overdue"     ${statusClass==='s-overdue'   ?'selected':''}>🔴 Overdue</option>
              <option value="hold">⚫ On Hold</option>
            </select>
          </div>
          <div class="odp-confirm-row" style="justify-content:flex-end">
            <button class="odp-btn odp-btn-accent odp-btn-sm" onclick="odpUpdateStatus(document.getElementById('odpStatusSelect').value)"><i class="ti ti-check"></i> Update Status</button>
          </div>
        </div>

      </div>
    </div>
`;
  }

  /* ══ PAYMENTS HTML ══ */
  function buildPaymentsHTML(order) {
    const total   = order.amount || '—';

    return `
    <div class="odp-row-2">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-report-money"></i> Payment Summary</div>
          <div class="odp-amount-row"><span class="odp-amount-label">Total Amount</span><span class="odp-amount-val total" id="odpTotalAmt">${esc(total)}</span></div>
          <div class="odp-amount-row"><span class="odp-amount-label">Advance Paid</span><span class="odp-amount-val paid" id="odpAdvanceAmt">—</span></div>
          <div class="odp-amount-row"><span class="odp-amount-label">Due Amount</span><span class="odp-amount-val due" id="odpDueAmt">—</span></div>
          <div class="odp-pay-progress-wrap">
            <div class="odp-pay-progress-row"><span>Payment Progress</span><span style="color:var(--green);font-weight:600" id="odpPaidPct">0% paid</span></div>
            <div class="odp-progress-track"><div class="odp-progress-fill pf-green" id="odpPayBar" style="width:0%"></div></div>
          </div>
          <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
            <div id="odpPaymentStatusBadge" style="font-size:12px;color:var(--muted2)">Loading…</div>
          </div>
        </div>
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-history"></i> Payment History</div>
          <div id="odpPayHistory"><div class="odp-loading"><div class="odp-spinner"></div> Loading…</div></div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-photo"></i> Client Payment Proof</div>
          <div id="odpClientProof">
            <div class="odp-loading"><div class="odp-spinner"></div> Loading proof…</div>
          </div>
        </div>

        <div class="odp-card">
          <div class="odp-card-title"><i class="ti ti-settings-2"></i> Admin Actions</div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
            <button class="odp-btn odp-btn-green" style="justify-content:center" onclick="odpReceivePayment()">
              <i class="ti ti-cash"></i> Receive Payment
            </button>
            <button class="odp-btn" style="justify-content:center;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff" onclick="odpConfirmOrderFull()">
              <i class="ti ti-circle-check"></i> Confirm Order
            </button>
          </div>
          <div class="odp-field">
            <label>Internal Note</label>
            <textarea class="odp-msg-textarea" id="odpPayNote" style="min-height:55px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12px;background:var(--card2)" placeholder="Internal payment note…"></textarea>
          </div>
          <button class="odp-btn odp-btn-sm" style="margin-top:8px;width:100%;justify-content:center" onclick="odpSavePayNote()">
            <i class="ti ti-device-floppy"></i> Save Note
          </button>
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

    const area = document.querySelector('.content-area');
    if (!area) return;
    area.insertAdjacentHTML('beforeend', buildShell(order));

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

    /* Load async data */
    loadFullOrderData();
    loadMessages();
    loadFiles();
    loadActivity();
    loadPaymentHistory();
    loadClientOrderCount();
  };

  /* ══ LOAD FULL ORDER DATA FROM SUPABASE ══ */
  async function loadFullOrderData() {
    if (!sb()) return;
    /* Mock orders (e.g. '#SCR-2891') are not real UUIDs — skip DB query */
    if (!isRealUUID(_currentOrderId)) {
      /* Still render the thesis details card from mock detail data */
      if (_currentOrder && _currentOrder.detail) {
        renderThesisDetailsCard(_currentOrder, null);
      } else {
        const el = document.getElementById('odpThesisDetailsCard');
        if (el) el.innerHTML = `<div class="odp-card-title"><i class="ti ti-forms"></i> Client Submission Details</div>
          <div style="font-size:12px;color:var(--muted);padding:16px 0;text-align:center">
            <i class="ti ti-info-circle" style="font-size:18px;display:block;margin-bottom:6px"></i>
            Mock order — real Supabase data নেই।
          </div>`;
      }
      return;
    }
    try {
      const { data: ord } = await sb().from('orders').select('*').eq('id', _currentOrderId).single();
      if (!ord) return;
      let client = null;
      if (ord.client_id) {
        const { data: cl } = await sb().from('clients').select('*').eq('id', ord.client_id).single();
        client = cl;
      }
      renderClientSubmission(ord, client);
      renderClientInfoFromDB(ord, client);
      renderThesisDetailsCard(ord, client);

      /* Sync status select from DB */
      const statusSel = document.getElementById('odpStatusSelect');
      if (statusSel && ord.status) {
        statusSel.value = ord.status;
        /* Also update header pill */
        const pill = document.querySelector('.odp-status-pill');
        if (pill) {
          const clsMap = { writing:'s-inprogress', completed:'s-completed', pending:'s-pending', draft_ready:'s-review', overdue:'s-overdue', hold:'s-pending' };
          const lblMap = { writing:'In Progress', completed:'Completed', pending:'Pending', draft_ready:'In Review', overdue:'Overdue', hold:'On Hold' };
          pill.className = 'odp-status-pill ' + (clsMap[ord.status] || 's-pending');
          pill.textContent = lblMap[ord.status] || ord.status;
        }
      }
    } catch(e) {}
  }

  /* ══ THESIS DETAILS CARD — Overview tab ══
     Reads real Supabase `orders` columns and renders
     every submitted field in a clean grouped layout.
  ══════════════════════════════════════════════════ */
  function renderThesisDetailsCard(ord, client) {
    const el = document.getElementById('odpThesisDetailsCard');
    if (!el) return;

    function e2(s) { return s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function val(v) { return v != null && String(v).trim() !== '' && String(v) !== 'undefined' && String(v) !== 'null'; }

    /* ── Field groups matching order.js form fields ── */
    const groups = [
      {
        icon: 'ti-book-2',
        title: 'Thesis / Academic Details',
        fields: [
          { label: 'Thesis / Topic Title',       v: ord.title },
          { label: 'Package',                    v: ord.package },
          { label: 'Department',                 v: ord.department },
          { label: 'University',                 v: ord.university || (client && client.university) },
          { label: 'Research Area',              v: ord.research || ord.research_area },
          { label: 'Language',                   v: ord.language },
          { label: 'Citation Style',             v: ord.citation },
        ]
      },
      {
        icon: 'ti-microscope',
        title: 'Scope & Methodology',
        fields: [
          { label: 'Chapter Scope',              v: ord.pages },
          { label: 'Methodology / Research Type',v: ord.methodology || ord.method },
          { label: 'Independent Variable',       v: ord.indep_var },
          { label: 'Dependent Variable',         v: ord.dep_var },
          { label: 'Project Type (CSE)',         v: ord.project_type },
          { label: 'Tech Stack / Tools',         v: ord.tech_stack },
          { label: 'Special Instructions',       v: ord.special_instructions, long: true },
        ]
      },
      {
        icon: 'ti-calendar-event',
        title: 'Timeline & Pricing',
        fields: [
          { label: 'Deadline',                   v: ord.deadline },
          { label: 'Urgency',                    v: ord.urgency },
          { label: 'Advance Paid',               v: ord.advance_paid != null ? '৳' + Number(ord.advance_paid).toLocaleString() : null },
          { label: 'Due Amount',                 v: ord.due_amount != null ? '৳' + Number(ord.due_amount).toLocaleString() : null },
          { label: 'Total Price',                v: ord.total_price != null ? '৳' + Number(ord.total_price).toLocaleString() : null },
          { label: 'Add-ons',                    v: Array.isArray(ord.addons) ? ord.addons.join(', ') : ord.addons },
          { label: 'Coupon Applied',             v: ord.coupon },
        ]
      },
      {
        icon: 'ti-address-book',
        title: 'Contact Info',
        fields: [
          { label: 'Email',                      v: (client && client.email) || ord.email, link: 'mailto' },
          { label: 'Phone / WhatsApp',           v: (client && (client.phone || client.whatsapp)) || ord.phone || ord.whatsapp },
        ]
      },
    ];

    let html = '';
    let hasAny = false;

    groups.forEach(group => {
      const visible = group.fields.filter(f => val(f.v));
      if (!visible.length) return;
      hasAny = true;

      html += `<div class="odp-sub-group">
        <div class="odp-sub-group-title"><i class="ti ${e2(group.icon)}"></i> ${e2(group.title)}</div>
        <div class="odp-sub-grid">`;

      visible.forEach(f => {
        const isLong = f.long || String(f.v).length > 80;
        const displayVal = f.link === 'mailto'
          ? `<a href="${f.link}:${e2(String(f.v))}" style="color:var(--accent2)">${e2(String(f.v))}</a>`
          : e2(String(f.v));

        html += `<div class="odp-field${isLong ? ' odp-field-full' : ''}">
          <label>${e2(f.label)}</label>
          <div class="odp-field-val${isLong ? ' muted' : ''}"${isLong ? ' style="font-size:11.5px;line-height:1.6"' : ''}>${displayVal}</div>
        </div>`;
      });

      html += `</div></div>`;
    });

    if (!hasAny) {
      html = `<div style="font-size:12px;color:var(--muted);padding:16px 0;text-align:center">
        <i class="ti ti-info-circle" style="font-size:18px;display:block;margin-bottom:6px"></i>
        Submission data পাওয়া যায়নি।<br>
        <span style="font-size:11px;opacity:0.6">Order manually তৈরি হতে পারে।</span>
      </div>`;
    }

    el.innerHTML = `<div class="odp-card-title"><i class="ti ti-forms"></i> Client Submission Details</div>${html}`;
  }

  function renderClientInfoFromDB(ord, client) {
    if (!client) return;
    const emailEl = document.querySelector('.odp-field-val a[href^="mailto:"]');
    if (emailEl && client.email) { emailEl.href = 'mailto:' + client.email; emailEl.textContent = client.email; }
    if ((client.university || ord.university) && _currentOrder) {
      document.querySelectorAll('.odp-client-sub').forEach(el => {
        if (el.textContent === _currentOrder.uni) el.textContent = client.university || ord.university || _currentOrder.uni;
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
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    const oldPanel = document.getElementById('detailPanel');
    if (oldPanel) oldPanel.style.visibility = '';
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
     FILES — Supabase Storage
  ══════════════════════════════════════════════════════════ */
  async function loadFiles() {
    const list = document.getElementById('odpFileList');
    if (!list) return;

    /* Check if order has static files in detail */
    const d = _currentOrder && _currentOrder.detail;
    if (d && d.files && d.files.length) {
      list.innerHTML = d.files.map(f => renderFileRow(f)).join('');
    }

    if (!sb() || !isRealUUID(_currentOrderId)) return;

    try {
      const path = `orders/${_currentOrderId}`;
      const { data, error } = await sb().storage.from('order-files').list(path, { limit: 100 });
      if (error || !data || !data.length) {
        if (!d || !d.files || !d.files.length) list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">No files uploaded yet.</div>';
        return;
      }
      list.innerHTML = data.map(f => renderFileRow({ name: f.name, size: f.metadata?.size, updated_at: f.updated_at, supabasePath: `${path}/${f.name}` })).join('');
    } catch(e) {
      if (!d || !d.files || !d.files.length) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Could not load files.</div>';
    }
  }

  function renderFileRow(f) {
    const ext = (f.name || '').split('.').pop().toLowerCase();
    const iconClass = ext==='pdf' ? 'pdf' : ext==='docx'||ext==='doc' ? 'doc' : ext==='zip' ? 'zip' : 'img';
    const icon = ext==='pdf' ? 'ti-file-type-pdf' : ext==='docx'||ext==='doc' ? 'ti-file-type-doc' : ext==='zip' ? 'ti-file-zip' : 'ti-file';
    const size = f.size ? (f.size/1024 < 1024 ? (f.size/1024).toFixed(0)+' KB' : (f.size/1024/1024).toFixed(1)+' MB') : '';
    const date = f.updated_at ? new Date(f.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';
    const path = f.supabasePath || '';
    return `
    <div class="odp-file-row" data-path="${esc(path)}">
      <div class="odp-file-icon ${iconClass}"><i class="ti ${icon}"></i></div>
      <div style="flex:1;min-width:0">
        <div class="odp-file-name">${esc(f.name)}</div>
        <div class="odp-file-meta">${[size,date].filter(Boolean).join(' · ')}</div>
      </div>
      <span class="odp-vis-badge vis-client">Client visible</span>
      <div class="odp-file-actions">
        <button class="odp-file-btn" title="Download" onclick="odpDownloadFile('${esc(path)}','${esc(f.name)}')"><i class="ti ti-download"></i></button>
        <button class="odp-file-btn" title="Toggle Lock" onclick="odpToggleLock(this)"><i class="ti ti-lock-open"></i></button>
        <button class="odp-file-btn" title="Toggle Visibility" onclick="odpToggleVisibility(this)"><i class="ti ti-eye"></i></button>
        <button class="odp-file-btn danger" title="Delete" onclick="odpDeleteFile('${esc(path)}',this)"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
  }

  window.odpUploadFiles = async function(files) {
    if (!files || !files.length) return;
    const list = document.getElementById('odpFileList');
    const existing = list ? list.querySelector('.odp-loading, div[style*="text-align:center"]') : null;
    if (existing) existing.remove();

    for (const f of Array.from(files)) {
      const placeholder = document.createElement('div');
      placeholder.className = 'odp-file-row';
      placeholder.innerHTML = `<div style="flex:1;font-size:12px;color:var(--muted2)"><i class="ti ti-loader" style="animation:spin .7s linear infinite"></i> Uploading ${esc(f.name)}…</div>`;
      if (list) list.appendChild(placeholder);

      if (!sb()) {
        /* Simulate upload */
        setTimeout(() => {
          placeholder.outerHTML = renderFileRow({ name: f.name, size: f.size, updated_at: new Date().toISOString(), supabasePath: `orders/${_currentOrderId}/${f.name}` });
          toast(`✓ ${f.name} uploaded!`, 'var(--green)');
          logActivity('file_upload', `File uploaded: ${f.name}`);
        }, 1200);
        continue;
      }

      try {
        const path = `orders/${_currentOrderId}/${f.name}`;
        const { error } = await sb().storage.from('order-files').upload(path, f, { upsert: true });
        if (error) throw error;
        placeholder.outerHTML = renderFileRow({ name: f.name, size: f.size, updated_at: new Date().toISOString(), supabasePath: path });
        toast(`✓ ${f.name} uploaded!`, 'var(--green)');
        logActivity('file_upload', `File uploaded: ${f.name}`);
      } catch(e) {
        placeholder.innerHTML = `<div style="color:var(--red);font-size:12px">⚠ Upload failed: ${esc(f.name)}</div>`;
        toast(`⚠ Upload failed: ${f.name}`, 'var(--red)');
      }
    }
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

  window.odpToggleLock = function(btn) {
    const icon = btn.querySelector('i');
    const locked = icon.classList.contains('ti-lock');
    icon.className = locked ? 'ti ti-lock-open' : 'ti ti-lock';
    btn.style.color = locked ? '' : 'var(--yellow)';
    toast(locked ? 'File unlocked' : 'File locked', locked ? 'var(--muted)' : 'var(--yellow)');
  };

  window.odpToggleVisibility = function(btn) {
    const icon = btn.querySelector('i');
    const row = btn.closest('.odp-file-row');
    const badge = row ? row.querySelector('.odp-vis-badge') : null;
    const hidden = icon.classList.contains('ti-eye-off');
    icon.className = hidden ? 'ti ti-eye' : 'ti ti-eye-off';
    if (badge) {
      badge.className = hidden ? 'odp-vis-badge vis-client' : 'odp-vis-badge vis-admin';
      badge.textContent = hidden ? 'Client visible' : 'Admin only';
    }
    toast(hidden ? 'Visible to client' : 'Hidden from client', hidden ? 'var(--green)' : 'var(--muted)');
  };

  window.odpDeleteFile = async function(path, btn) {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    const row = btn.closest('.odp-file-row');
    if (sb() && path) {
      try { await sb().storage.from('order-files').remove([path]); } catch(e) {}
    }
    if (row) row.remove();
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
      loadClientProofMock();
      loadPaymentSummaryFromOrder();
      return;
    }

    /* Load payment summary from orders table */
    loadPaymentSummaryFromOrder();

    /* Load client submitted proof */
    loadClientProof();

    try {
      const { data } = await sb().from('payments').select('*').eq('order_id', _currentOrderId).order('created_at', { ascending: false });
      if (!data || !data.length) { el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">No payment records yet.</div>'; return; }
      el.innerHTML = data.map(p => `
        <div class="odp-pay-hist-item">
          <div>
            <div class="odp-pay-hist-label">${esc(p.label||p.type||'Payment')}</div>
            <div class="odp-pay-hist-sub">${p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : ''} · ${esc(p.method||'')}</div>
          </div>
          <span class="odp-pay-hist-val ${p.amount>0?'green':'orange'}">${p.amount>0?'+':''}${esc(String(p.amount||'—'))}</span>
        </div>`).join('');
    } catch(e) { el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">Could not load payment history.</div>'; }
  }

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
        await sb().from('orders').update({ payment_status: 'approved' }).eq('id', _currentOrderId);
        await sb().from('payments').insert({ order_id: _currentOrderId, label: 'Payment Approved', type: 'approval', method: 'Admin', amount: 0, created_at: new Date().toISOString() });
      } catch(e) {}
    }
    _appendPayHistoryItem({ label: 'Payment Approved', type: 'approval', method: 'Admin', amount: 0, created_at: new Date().toISOString() });
    toast('✓ Payment approved!', 'var(--green)');
    logActivity('payment', 'Payment approved by admin');
  };

  window.odpMarkPaid = async function() {
    if (sb() && isRealUUID(_currentOrderId)) {
      try {
        await sb().from('orders').update({ payment_status: 'paid' }).eq('id', _currentOrderId);
        await sb().from('payments').insert({ order_id: _currentOrderId, label: 'Marked as Paid', type: 'paid', method: 'Admin', amount: 0, created_at: new Date().toISOString() });
      } catch(e) {}
    }
    _appendPayHistoryItem({ label: 'Marked as Paid', type: 'paid', method: 'Admin', amount: 0, created_at: new Date().toISOString() });
    toast('✓ Order marked as paid!', 'var(--accent)');
    logActivity('payment', 'Order marked as fully paid');
  };

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
        created_at: new Date().toISOString(),
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
      try { await sb().from('orders').update({ confirmed: true }).eq('id', _currentOrderId); } catch(e) {}
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
    const el = document.getElementById('odpClientOrders');
    if (!el || !sb() || !_currentOrder || !isRealUUID(_currentOrderId)) return;
    try {
      const { count } = await sb().from('orders').select('id',{count:'exact',head:true}).eq('client_id', _currentOrder.clientId || '');
      if (count !== null) el.textContent = count + ' orders';
    } catch(e) {}
  }

  /* ══════════════════════════════════════════════════════════
     PAYMENT SUMMARY FROM ORDERS TABLE
  ══════════════════════════════════════════════════════════ */
  async function loadPaymentSummaryFromOrder() {
    if (!sb() || !isRealUUID(_currentOrderId)) {
      /* Mock order — use detail data */
      const d = _currentOrder?.detail?.financials || {};
      _updatePaySummaryUI(
        _currentOrder?.amount || '—',
        d.paid || '—',
        d.due  || '—',
        d.paidPct || 0,
        _currentOrder?.status || 'pending'
      );
      return;
    }
    try {
      const { data: ord } = await sb().from('orders').select('total_price,advance_paid,due_amount,payment_status,status').eq('id', _currentOrderId).single();
      if (!ord) return;
      const total    = ord.total_price  ? '৳' + Number(ord.total_price).toLocaleString()  : '—';
      const advance  = ord.advance_paid ? '৳' + Number(ord.advance_paid).toLocaleString() : '—';
      const due      = ord.due_amount   ? '৳' + Number(ord.due_amount).toLocaleString()   : '—';
      const paidPct  = ord.total_price  ? Math.round((ord.advance_paid / ord.total_price) * 100) : 0;
      _updatePaySummaryUI(total, advance, due, paidPct, ord.payment_status || ord.status);
    } catch(e) {}
  }

  function _updatePaySummaryUI(total, advance, due, paidPct, payStatus) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('odpTotalAmt',  total);
    set('odpAdvanceAmt', advance);
    set('odpDueAmt',    due);
    set('odpPaidPct',   paidPct + '% paid');
    const bar = document.getElementById('odpPayBar');
    if (bar) bar.style.width = paidPct + '%';

    const statusEl = document.getElementById('odpPaymentStatusBadge');
    if (statusEl) {
      const statusMap = {
        'pending':      { label: '⏳ Pending — proof আসেনি',        color: '#f59e0b' },
        'under_review': { label: '🔍 Under Review — proof এসেছে',   color: '#6366f1' },
        'received':     { label: '✅ Payment Received',              color: '#22c987' },
        'confirmed':    { label: '🎉 Order Confirmed',               color: '#22c987' },
      };
      const s = statusMap[payStatus] || { label: payStatus || 'Unknown', color: 'var(--muted2)' };
      statusEl.innerHTML = `<span style="color:${s.color};font-weight:600">${s.label}</span>`;
    }
  }

  /* ══════════════════════════════════════════════════════════
     CLIENT PROOF VIEWER (admin side)
  ══════════════════════════════════════════════════════════ */
  async function loadClientProof() {
    const el = document.getElementById('odpClientProof');
    if (!el) return;

    if (!sb() || !isRealUUID(_currentOrderId)) { loadClientProofMock(); return; }

    try {
      const { data: proofs } = await sb()
        .from('payments')
        .select('id,txn_id,screenshot_url,amount,paid_at,confirmed')
        .eq('order_id', _currentOrderId)
        .order('paid_at', { ascending: false });

      if (!proofs || !proofs.length) {
        el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:12px 0;text-align:center"><i class="ti ti-clock" style="font-size:18px;display:block;margin-bottom:6px"></i>Client এখনো proof পাঠায়নি।</div>';
        return;
      }

      el.innerHTML = proofs.map(p => `
        <div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
          ${p.screenshot_url ? `<img src="${esc(p.screenshot_url)}" style="width:100%;border-radius:8px;margin-bottom:8px;cursor:pointer" onclick="window.open('${esc(p.screenshot_url)}','_blank')" title="Click to open full size"/>` : ''}
          <div style="font-size:11.5px;color:var(--muted2)">
            ${p.txn_id ? `<div style="margin-bottom:4px"><b style="color:var(--text)">TXN ID:</b> ${esc(p.txn_id)}</div>` : ''}
            <div style="margin-bottom:4px"><b style="color:var(--text)">Amount:</b> ${p.amount ? '৳' + Number(p.amount).toLocaleString() : '—'}</div>
            <div><b style="color:var(--text)">Submitted:</b> ${p.paid_at ? new Date(p.paid_at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</div>
          </div>
          <div style="margin-top:8px">
            <span style="font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600;${p.confirmed ? 'background:#052e16;color:#4ade80' : 'background:#2d1b07;color:#fbbf24'}">
              ${p.confirmed ? '✓ Confirmed' : '⏳ Pending review'}
            </span>
          </div>
        </div>`).join('');
    } catch(e) {
      el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:8px 0">Could not load proof.</div>';
    }
  }

  function loadClientProofMock() {
    const el = document.getElementById('odpClientProof');
    if (el) el.innerHTML = '<div style="font-size:12px;color:var(--muted2);padding:12px 0;text-align:center"><i class="ti ti-clock" style="font-size:18px;display:block;margin-bottom:6px"></i>Mock order — proof নেই।</div>';
  }

  /* ══════════════════════════════════════════════════════════
     RECEIVE PAYMENT — Admin confirms payment received
  ══════════════════════════════════════════════════════════ */
  window.odpReceivePayment = async function() {
    if (!sb() || !isRealUUID(_currentOrderId)) {
      _updatePaySummaryUI('—', '—', '—', 0, 'received');
      toast('✓ Payment received (mock mode)', 'var(--green)');
      return;
    }
    try {
      /* Update payment record as confirmed */
      await sb().from('payments').update({ confirmed: true }).eq('order_id', _currentOrderId);
      /* Update order payment_status */
      await sb().from('orders').update({ payment_status: 'received', updated_at: new Date().toISOString() }).eq('id', _currentOrderId);
      /* Notify client */
      await sb().from('messages').insert({
        order_id:   _currentOrderId,
        text:       '✅ আপনার payment receive হয়েছে! আমরা শীঘ্রই order confirm করব।',
        from_admin: true,
        read:       false,
        sent_at:    new Date().toISOString(),
      });
      _updatePaySummaryUI('—', '—', '—', 0, 'received');
      /* Reload proof to show confirmed badge */
      loadClientProof();
      toast('✓ Payment received! Client কে notification পাঠানো হয়েছে।', 'var(--green)');
      logActivity('payment', 'Payment received and confirmed');
      _appendPayHistoryItem({ label: 'Payment Received', type: 'received', method: 'Admin', amount: 0, created_at: new Date().toISOString() });
      /* Reload summary */
      setTimeout(loadPaymentSummaryFromOrder, 500);
    } catch(e) {
      toast('⚠ Error: ' + (e.message || ''), 'var(--red)');
    }
  };

  /* ══════════════════════════════════════════════════════════
     CONFIRM ORDER — Admin fully confirms, client gets popup
  ══════════════════════════════════════════════════════════ */
  window.odpConfirmOrderFull = async function() {
    const btn = document.querySelector('[onclick="odpConfirmOrderFull()"]');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

    if (!sb() || !isRealUUID(_currentOrderId)) {
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      toast('✓ Order confirmed (mock mode)', 'var(--green)');
      return;
    }

    try {
      /* 1. Update order status → confirmed, payment_status → confirmed */
      const { error } = await sb().from('orders').update({
        status:         'confirmed',
        payment_status: 'confirmed',
        confirmed_at:   new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      }).eq('id', _currentOrderId);
      if (error) throw error;

      /* 2. Update status pill */
      const pill = document.querySelector('.odp-status-pill');
      if (pill) { pill.className = 'odp-status-pill s-inprogress'; pill.textContent = 'Confirmed'; }

      /* 3. Notify client — এই message client dashboard এ realtime toast দেবে + popup trigger করবে */
      await sb().from('messages').insert({
        order_id:   _currentOrderId,
        text:       '🎉 আপনার order confirm হয়েছে! আমরা এখনই কাজ শুরু করছি। যেকোনো আপডেটের জন্য Messages চেক করুন।',
        from_admin: true,
        read:       false,
        sent_at:    new Date().toISOString(),
      });

      _updatePaySummaryUI('—', '—', '—', 0, 'confirmed');
      logActivity('confirm', 'Order confirmed by admin — client notified');
      _appendPayHistoryItem({ label: 'Order Confirmed', type: 'confirmed', method: 'Admin', amount: 0, created_at: new Date().toISOString() });
      toast('🎉 Order confirmed! Client এর dashboard এ popup দেখাবে।', 'var(--green)');

    } catch(e) {
      toast('⚠ Confirm failed: ' + (e.message || ''), 'var(--red)');
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    }
  };

})();
