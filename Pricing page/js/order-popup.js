/* ================================================================
   SCRIPTORA — order-popup.js
   "Order করুন" click → Order Details bottom sheet
   Frontend only — no backend
================================================================ */

(function () {

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtNum(n) { return Number(n).toLocaleString('en-IN'); }

  /* ────────────────────────────────
     BUILD ORDER POPUP HTML
  ──────────────────────────────── */
  function buildOrderPopup(opts) {
    /*
      opts = {
        title, titleBn, iconBg, icon,
        qty, unitLabel, urgencyLabel, rate, perUnit, unitType,
        price, tiers, tierIndex
      }
    */

    /* Summary rows */
    let summaryRows = '';

    if (opts.unitType === 'words' || opts.unitType === 'slides' || opts.unitType === 'pages') {
      const labelMap = { words: 'Word Count / শব্দ সংখ্যা', slides: 'Slide Count / স্লাইড', pages: 'Page Count / পৃষ্ঠা' };
      summaryRows += `
        <div class="op-row"><span>${labelMap[opts.unitType]||'Quantity'}</span><strong>${fmtNum(opts.qty)} ${esc(opts.unitLabel)}</strong></div>
        <div class="op-row"><span>Deadline / সময়সীমা</span><strong>${esc(opts.urgencyLabel)}</strong></div>
        <div class="op-row"><span>Rate / রেট</span><strong>৳${fmtNum(opts.rate)}/${opts.perUnit} ${esc(opts.unitLabel)}</strong></div>`;
    } else if (opts.unitType === 'tier') {
      const tierName = opts.tiers && opts.tiers[opts.tierIndex] ? opts.tiers[opts.tierIndex].name : '';
      summaryRows += `
        <div class="op-row"><span>Package / প্যাকেজ</span><strong>${esc(tierName)}</strong></div>
        <div class="op-row"><span>Deadline / সময়সীমা</span><strong>${esc(opts.urgencyLabel)}</strong></div>`;
    } else {
      summaryRows += `
        <div class="op-row"><span>Service Type</span><strong>Fixed Price</strong></div>
        <div class="op-row"><span>Deadline / সময়সীমা</span><strong>${esc(opts.urgencyLabel)}</strong></div>`;
    }

    /* Topic field label based on service */
    const topicLabels = {
      'assignment-writing':   'Assignment Topic / বিষয়বস্তু',
      'presentation-slides':  'Presentation Topic / বিষয়',
      'proofreading':         'Document Type / ডকুমেন্ট ধরন',
      'apa-mla-formatting':   'Citation Style / সাইটেশন স্টাইল',
      'plagiarism-reduction': 'Document Topic / বিষয়',
      'spss-analysis':        'Research Topic / গবেষণার বিষয়',
      'research-proposal':    'Research Topic / গবেষণার বিষয়',
      'case-study-report':    'Case Study Topic / বিষয়',
      'cv-writing':           'Target Role / লক্ষ্য পদ',
      'sop-writing':          'University & Program / বিশ্ববিদ্যালয় ও প্রোগ্রাম',
      'ai-plagiarism-remover':'Document Topic / বিষয়',
      'lab-report-writing':   'Lab Experiment Topic / বিষয়',
      'research-article':     'Research Topic / গবেষণার বিষয়',
      'project-planning':     'Project Topic / প্রজেক্ট বিষয়',
      'ai-detection-report':  'Document Description / বিবরণ',
    };
    const topicLabel = topicLabels[opts.serviceId] || 'Topic / বিষয়বস্তু';

    return `
    <div class="op-overlay" id="opOverlay" onclick="opClose()"></div>
    <div class="op-sheet" id="opSheet">

      <!-- Drag handle -->
      <div class="op-drag-handle"></div>

      <!-- Header -->
      <div class="op-header">
        <div>
          <div class="op-header-title">Order Details</div>
          <div class="op-header-sub">অর্ডারের বিবরণ</div>
        </div>
        <button class="op-close-btn" onclick="opClose()">✕</button>
      </div>

      <!-- Scrollable body -->
      <div class="op-body">

        <!-- Step 1: Order Summary -->
        <div class="op-step-label">
          <span class="op-step-num">1</span>
          <span class="op-step-title">Order Summary</span>
          <span class="op-step-bn">অর্ডারের সারসংক্ষেপ</span>
        </div>

        <div class="op-summary-card">
          <div class="op-summary-head">
            <div class="op-s-icon" style="background:${opts.iconBg}">${opts.icon}</div>
            <div>
              <div class="op-s-title">${esc(opts.title)}</div>
              <div class="op-s-sub">Academic · ${esc(opts.titleBn)}</div>
            </div>
          </div>
          <div class="op-divider"></div>
          ${summaryRows}
          <div class="op-divider"></div>
          <div class="op-row op-total-row">
            <span>Total Price / মোট মূল্য</span>
            <strong class="op-total-price">৳ ${fmtNum(opts.price)}</strong>
          </div>
        </div>

        <!-- Step 2: Contact Info -->
        <div class="op-step-label" style="margin-top:1.2rem">
          <span class="op-step-num">2</span>
          <span class="op-step-title">Contact Info</span>
          <span class="op-step-bn">যোগাযোগের তথ্য</span>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Full Name / আপনার নাম</label>
          <div class="op-input-wrap">
            <span class="op-input-icon">👤</span>
            <input class="op-input" id="opName" type="text" placeholder="Enter your full name" autocomplete="name"/>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">WhatsApp Number / হোয়াটসঅ্যাপ নম্বর</label>
          <div class="op-input-wrap">
            <span class="op-input-icon">📱</span>
            <input class="op-input" id="opPhone" type="tel" placeholder="+880 1XXX-XXXXXX" autocomplete="tel"/>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">${topicLabel}</label>
          <div class="op-input-wrap op-textarea-wrap">
            <span class="op-input-icon op-ta-icon">📝</span>
            <textarea class="op-input op-textarea" id="opTopic" placeholder="Describe your ${opts.title.toLowerCase()} topic..." rows="3"></textarea>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Special Notes / বিশেষ নির্দেশনা <span class="op-optional">(Optional)</span></label>
          <div class="op-input-wrap op-textarea-wrap">
            <span class="op-input-icon op-ta-icon">📋</span>
            <textarea class="op-input op-textarea" id="opNotes" placeholder="Any formatting requirements, references, etc." rows="3"></textarea>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Attach File / ফাইল সংযুক্ত করুন <span class="op-optional">(Optional)</span></label>
          <div class="op-file-drop" id="opFileDrop" onclick="document.getElementById('opFileInput').click()">
            <input type="file" id="opFileInput" multiple accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg" style="display:none" onchange="opFileSelected(this)"/>
            <div class="op-file-icon">📎</div>
            <div class="op-file-text">Tap to attach files</div>
            <div class="op-file-sub">PDF, Word, PPT, Excel, Images</div>
          </div>
          <div class="op-file-list" id="opFileList"></div>
        </div>

        <!-- Privacy note -->
        <div class="op-privacy-note">
          <span class="op-privacy-icon">🔒</span>
          <div>
            <div>Your information is 100% private and secure.</div>
            <div class="op-privacy-bn">আপনার তথ্য সম্পূর্ণ গোপনীয়।</div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="op-footer">
        <button class="op-confirm-btn" onclick="opConfirm()">
          <span>📱</span> Confirm Order / অর্ডার নিশ্চিত করুন
        </button>
        <div class="op-terms">By confirming, you agree to our <a class="op-terms-link" href="#">Terms of Service</a></div>
      </div>

    </div>`;
  }

  /* ────────────────────────────────
     SWIPE TO DISMISS (drag handle)
  ──────────────────────────────── */
  function initSwipeDismiss(sheet) {
    const body = sheet.querySelector('.op-body');

    let startY      = 0;
    let currentY    = 0;
    let dragging    = false;
    let sheetHeight = 0;
    let startBodyScroll = 0;
    let intentDecided   = false;
    let isSwipeIntent   = false;

    function onStart(e) {
      /* Never hijack interactive elements */
      const t = e.target;
      if (t.closest && (
        t.closest('.op-close') ||
        t.closest('button') ||
        t.closest('input') ||
        t.closest('textarea') ||
        t.closest('select') ||
        t.closest('a')
      )) return;

      startY          = e.touches[0].clientY;
      currentY        = startY;
      sheetHeight     = sheet.offsetHeight;
      startBodyScroll = body ? body.scrollTop : 0;
      dragging        = true;
      intentDecided   = false;
      isSwipeIntent   = false;
      sheet.style.transition = 'none';
    }

    function onMove(e) {
      if (!dragging) return;
      currentY     = e.touches[0].clientY;
      const deltaY = currentY - startY;

      /* Decide intent once we have 6px of movement */
      if (!intentDecided && Math.abs(deltaY) > 6) {
        intentDecided = true;
        /* Swipe down = dismiss intent IF body is scrolled to top */
        isSwipeIntent = deltaY > 0 && startBodyScroll <= 0;
      }

      if (!intentDecided) return;

      if (isSwipeIntent) {
        /* Follow finger — prevent page scroll */
        if (e.cancelable) e.preventDefault();
        if (deltaY < 0) {
          const r = Math.min(Math.abs(deltaY) * 0.15, 30);
          sheet.style.transform = `translateY(${-r}px)`;
        } else {
          sheet.style.transform = `translateY(${deltaY}px)`;
        }
      }
      /* else: normal body scroll — don't interfere */
    }

    function onEnd() {
      if (!dragging) return;
      dragging      = false;
      intentDecided = false;
      sheet.style.transition = '';

      const deltaY = currentY - startY;

      if (isSwipeIntent && deltaY > sheetHeight * 0.20) {
        sheet.style.transform = `translateY(100%)`;
        const overlay = document.getElementById('opOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => {
          const m = document.getElementById('opMount');
          if (m) m.remove();
        }, 340);
      } else {
        sheet.style.transform = 'translateY(0)';
      }

      isSwipeIntent = false;
    }

    /* Prevent background page scroll — but allow body scroll inside sheet */
    sheet.addEventListener('touchstart', onStart, { passive: true });
    sheet.addEventListener('touchmove',  onMove,  { passive: false });
    sheet.addEventListener('touchend',   onEnd,   { passive: true });
  }

  /* ────────────────────────────────
     OPEN / CLOSE
  ──────────────────────────────── */
  window.opOpen = function(opts) {
    /* remove old */
    document.querySelectorAll('.op-overlay,.op-sheet,[id="opMount"]').forEach(el => el.remove());

    const div = document.createElement('div');
    div.id = 'opMount';
    div.innerHTML = buildOrderPopup(opts);
    document.body.appendChild(div);

    window._opOpts = opts;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      const sheet   = document.getElementById('opSheet');
      const overlay = document.getElementById('opOverlay');
      if (sheet)   { sheet.classList.add('open'); initSwipeDismiss(sheet); }
      if (overlay) overlay.classList.add('open');
    });
  };

  window.opClose = function() {
    const sheet   = document.getElementById('opSheet');
    const overlay = document.getElementById('opOverlay');
    if (sheet)   sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      const m = document.getElementById('opMount');
      if (m) m.remove();
    }, 340);
  };

  /* ── File Upload ── */
  window._opFiles = [];

  window.opFileSelected = function(input) {
    const files = Array.from(input.files);
    files.forEach(f => {
      if (!window._opFiles.find(x => x.name === f.name)) {
        window._opFiles.push(f);
      }
    });
    renderFileList();
    /* reset input so same file can be re-added if removed */
    input.value = '';
  };

  window.opRemoveFile = function(name) {
    window._opFiles = window._opFiles.filter(f => f.name !== name);
    renderFileList();
  };

  function renderFileList() {
    const list = document.getElementById('opFileList');
    if (!list) return;

    if (window._opFiles.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = window._opFiles.map(f => {
      const kb   = (f.size / 1024).toFixed(0);
      const ext  = f.name.split('.').pop().toUpperCase();
      const icon = { PDF:'📄', DOC:'📝', DOCX:'📝', PPT:'📊', PPTX:'📊',
                     XLS:'📈', XLSX:'📈', PNG:'🖼️', JPG:'🖼️', JPEG:'🖼️', TXT:'📃' }[ext] || '📎';
      return `
        <div class="op-file-item">
          <span class="op-file-item-icon">${icon}</span>
          <div class="op-file-item-info">
            <div class="op-file-item-name">${esc(f.name)}</div>
            <div class="op-file-item-size">${kb} KB · ${ext}</div>
          </div>
          <button class="op-file-remove" onclick="opRemoveFile('${esc(f.name)}')">✕</button>
        </div>`;
    }).join('');
  }

  /* ── Validation + Confirm ── */
  window.opConfirm = async function() {
    const name  = document.getElementById('opName')?.value.trim();
    const phone = document.getElementById('opPhone')?.value.trim();
    const topic = document.getElementById('opTopic')?.value.trim();
    const notes = document.getElementById('opNotes')?.value.trim();

    if (!name)  { highlight('opName',  'Name লিখুন'); return; }
    if (!phone) { highlight('opPhone', 'WhatsApp নম্বর লিখুন'); return; }
    if (!topic) { highlight('opTopic', 'Topic লিখুন'); return; }

    const btn = document.querySelector('.op-confirm-btn');
    if (btn) { btn.innerHTML = '⏳ Processing...'; btn.disabled = true; }

    try {
      const db   = window.scriptoraSupabase;
      const opts = window._opOpts || {};

      /* ── Logged-in user ── */
      let clientId = null;
      try {
        const { data } = await db.auth.getUser();
        if (data?.user) clientId = data.user.id;
      } catch (_) {}

      /* ── Order number ── */
      const now         = new Date();
      const datePart    = now.toISOString().slice(0,10).replace(/-/g,'');
      const rand        = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `SCR-${datePart}-${rand}`;

      /* ── Deadline ── */
      const urgencyDays = { normal:15, urgent:7, critical:3, standard:15, express:7, rush:3 };
      const daysAhead   = urgencyDays[(opts.urgency||'normal').toLowerCase()] || 15;
      const deadline    = new Date(now.getTime() + daysAhead * 86400000).toISOString().slice(0,10);

      /* ── service_type ── */
      const sid = opts.serviceId || '';
      let serviceType = 'other';
      if (sid.includes('thesis'))       serviceType = 'thesis';
      else if (sid.includes('handwritten')) serviceType = 'handwritten';
      else if (sid.includes('assignment'))  serviceType = 'writing';

      /* ── Package ── */
      let pkg = '';
      if (opts.unitType === 'tier' && opts.tiers?.[opts.tierIndex]) {
        pkg = opts.tiers[opts.tierIndex].name;
      } else if (opts.thesisType) {
        pkg = opts.thesisType;
      }

      const pageCount = opts.unitType === 'words' && opts.qty
        ? Math.ceil(opts.qty / 250) : null;

      const advance = Math.round((opts.price || 0) / 2);

      /* ── Insert order (pending payment) ── */
      const row = {
        order_number:         orderNumber,
        client_id:            clientId,
        title:                opts.title || '',
        service_type:         serviceType,
        package:              pkg,
        urgency:              opts.urgencyLabel || '',
        total_price:          opts.price || 0,
        advance_paid:         0,
        status:               'pending',
        payment_status:       'unpaid',
        progress:             0,
        deadline:             deadline,
        research_area:        topic,
        page_count:           pageCount,
        pages:                pageCount ? String(pageCount) : null,
        special_instructions: `Name: ${name}\nPhone: ${phone}` + (notes ? `\n\n${notes}` : ''),
      };

      const { data: insertData, error } = await db.from('orders').insert(row).select('id').single();
      if (error) throw error;

      const orderId = insertData.id;

      /* ── Upload attached files ── */
      if (orderId && window._opFiles?.length > 0) {
        for (const file of window._opFiles) {
          try {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path     = `orders/${orderId}/${Date.now()}_${safeName}`;
            await db.storage.from('order-files').upload(path, file, { upsert: false });
          } catch (e) { console.warn('[Scriptora] File upload skipped:', file.name); }
        }
        window._opFiles = [];
      }

      /* ── Save to sessionStorage for payment page ── */
      sessionStorage.setItem('scriptora_order', JSON.stringify({
        orderId:    orderId,
        orderNumber: orderNumber,
        title:      opts.title || '',
        pkg:        pkg,
        urgency:    opts.urgencyLabel || '',
        deadline:   deadline,
        total:      opts.price || 0,
        advance:    advance,
        clientId:   clientId,
        name:       name,
        phone:      phone,
      }));

      if (btn) { btn.innerHTML = '✅ Order Created!'; btn.style.background = 'linear-gradient(135deg,#16a34a,#22c55e)'; }

      /* ── Redirect to payment page ── */
      setTimeout(() => {
        opClose();
        window.location.href = '../Payment page/payment.html';
      }, 900);

    } catch (err) {
      console.error('[Scriptora] Order error:', err);
      if (btn) {
        btn.innerHTML = '❌ Error — আবার চেষ্টা করুন';
        btn.style.background = 'linear-gradient(135deg,#dc2626,#ef4444)';
        btn.disabled = false;
        setTimeout(() => {
          btn.innerHTML = '📱 Confirm Order / অর্ডার নিশ্চিত করুন';
          btn.style.background = '';
        }, 2500);
      }
    }
  };

  function highlight(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = '#ef4444';
    el.focus();
    el.setAttribute('placeholder', msg);
    setTimeout(() => { el.style.borderColor = ''; }, 2000);
  }

  /* mpOrder is defined in mobile-popup.js */

})();
