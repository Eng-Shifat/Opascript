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
      if (sheet)   sheet.classList.add('open');
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
  window.opConfirm = function() {
    const name  = document.getElementById('opName')?.value.trim();
    const phone = document.getElementById('opPhone')?.value.trim();
    const topic = document.getElementById('opTopic')?.value.trim();

    if (!name)  { highlight('opName',  'Name লিখুন'); return; }
    if (!phone) { highlight('opPhone', 'WhatsApp নম্বর লিখুন'); return; }
    if (!topic) { highlight('opTopic', 'Topic লিখুন'); return; }

    /* TODO: backend integration here */
    const btn = document.querySelector('.op-confirm-btn');
    if (btn) {
      btn.textContent = '✅ Order Confirmed!';
      btn.style.background = 'linear-gradient(135deg,#16a34a,#22c55e)';
      btn.disabled = true;
    }
    setTimeout(opClose, 1800);
  };

  function highlight(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.borderColor = '#ef4444';
    el.focus();
    el.setAttribute('placeholder', msg);
    setTimeout(() => { el.style.borderColor = ''; }, 2000);
  }

  /* ────────────────────────────────
     PATCH mpOrder to open order popup
  ──────────────────────────────── */
  window.mpOrder = async function(id) {
    const CFG      = window.SCRIPTORA_CONFIG;
    const URGENCY  = CFG.urgency;
    const SERVICES = CFG.services;

    const s  = SERVICES.find(x => x.id === id);
    const st = window._popupState;
    if (!s || !st) return;

    function calcPrice(s, urgency, st) {
      const mult = URGENCY[urgency].multiplier;
      if (s.unitType === 'fixed') return Math.round(s.rate * mult);
      if (s.unitType === 'tier')  return Math.round(s.tiers[st.tierIndex].price * mult);
      return Math.round((st.qty / s.perUnit) * s.rate * mult);
    }

    const price        = calcPrice(s, st.urgency, st);
    const urgencyLabel = URGENCY[st.urgency]?.label || st.urgency;

    opOpen({
        serviceId:    id,
        title:        s.title,
        titleBn:      s.titleBn,
        icon:         s.icon,
        iconBg:       s.iconBg,
        unitType:     s.unitType,
        qty:          st.qty,
        unitLabel:    s.unitLabel || '',
        urgencyLabel: urgencyLabel,
        rate:         s.rate,
        perUnit:      s.perUnit,
        tiers:        s.tiers,
        tierIndex:    st.tierIndex,
        price:        price,
    });
  };

})();
