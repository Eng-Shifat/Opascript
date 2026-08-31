/* ================================================================
   SCRIPTORA — order-popup.js
   "Order করুন" click → Order Details bottom sheet
   Frontend only — no backend
================================================================ */

(function () {

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtNum(n) { return Number(n).toLocaleString('en-IN'); }

  /* ── Referral code — URL ?ref= অথবা sessionStorage থেকে ── */
  const _urlRef = new URLSearchParams(window.location.search).get('ref') || '';
  if (_urlRef) sessionStorage.setItem('op_ref_code', _urlRef.toUpperCase());
  function getRefCode() {
    return (document.getElementById('opRefCode')?.value.trim().toUpperCase()) ||
           sessionStorage.getItem('op_ref_code') || '';
  }

  /* ── Click tracking — ?ref= থাকলে affiliate_clicks এ insert ── */
  async function trackAffiliateClick(refCode) {
    try {
      const sb = window.scriptoraSupabase;
      if (!sb || !refCode) return;

      /* আগে clicked কিনা check — same session এ duplicate avoid */
      if (sessionStorage.getItem('op_click_tracked_' + refCode)) return;

      /* affiliate_id বের করো referral_code দিয়ে */
      const { data: aff } = await sb
        .from('affiliates')
        .select('id')
        .eq('referral_code', refCode)
        .maybeSingle();

      if (!aff?.id) return;

      /* IP hash — privacy-safe fingerprint */
      const ua = navigator.userAgent || '';
      const raw = ua + (screen.width || '') + (screen.height || '') + (navigator.language || '');
      const msgBuffer = new TextEncoder().encode(raw);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const ipHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);

      await sb.from('affiliate_clicks').insert({
        referral_code: refCode,
        affiliate_id:  aff.id,
        ip_hash:       ipHash,
        user_agent:    ua.slice(0, 300),
        landed_at:     new Date().toISOString(),
        converted:     false,
      });

      sessionStorage.setItem('op_click_tracked_' + refCode, '1');
    } catch (_) {}
  }

  /* URL-এ ?ref= থাকলে page load-এ immediately track করো */
  if (_urlRef) trackAffiliateClick(_urlRef.toUpperCase());

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

    if (opts.serviceId === 'assignment-writing') {
      /* ── Interactive calculator for assignment writing ── */
      const initQty   = opts.qty   || 500;
      const initRate  = opts.rate  || 200;
      const initPer   = opts.perUnit || 500;
      const initPrice = Math.round((initQty / initPer) * initRate);
      summaryRows = `
        <div class="op-calc-block">
          <div class="op-calc-label">Word Count / শব্দ সংখ্যা</div>
          <div class="op-calc-stepper">
            <button class="op-calc-btn" onclick="opCalcStep(-500)" aria-label="কমাও">−</button>
            <span class="op-calc-qty" id="opCalcQty">${fmtNum(initQty)}</span>
            <span class="op-calc-unit">words</span>
            <button class="op-calc-btn" onclick="opCalcStep(500)" aria-label="বাড়াও">+</button>
          </div>
          <div class="op-calc-hint">সর্বনিম্ন ৫০০ শব্দ · প্রতি ৫০০ শব্দে ৳${fmtNum(initRate)}</div>
        </div>
        <div class="op-calc-block" style="margin-top:14px;">
          <div class="op-calc-label">Deadline / সময়সীমা</div>
          <div class="op-calc-urgency">
            <button class="op-urg-btn active" data-urg="normal"   data-mul="1.0" onclick="opCalcUrgency(this)">
              <span class="op-urg-name">Standard</span>
              <span class="op-urg-days">৪ দিন</span>
            </button>
            <button class="op-urg-btn" data-urg="urgent"   data-mul="1.4" onclick="opCalcUrgency(this)">
              <span class="op-urg-name">Express</span>
              <span class="op-urg-days">২ দিন</span>
            </button>
            <button class="op-urg-btn" data-urg="critical" data-mul="1.8" onclick="opCalcUrgency(this)">
              <span class="op-urg-name">Rush</span>
              <span class="op-urg-days">১ দিন</span>
            </button>
          </div>
        </div>
        <div class="op-divider" style="margin:16px 0 12px;"></div>
        <div class="op-row"><span>Rate / রেট</span><strong>৳${fmtNum(initRate)}/${initPer} words</strong></div>`;
    } else if (opts.unitType === 'words' || opts.unitType === 'slides' || opts.unitType === 'pages') {
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
            <strong class="op-total-price" id="opTotalPrice">৳ ${fmtNum(opts.price)}</strong>
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

        ${opts.serviceId === 'cv-writing' ? `

        <div class="op-field-group">
          <label class="op-field-label">CV Type <span style="color:#ef4444">*</span></label>
          <div class="op-input-wrap">
            <select class="op-input" id="opCvType" style="cursor:pointer;">
              <option value="" disabled selected>Select CV type</option>
              <option value="Job CV">Job CV</option>
              <option value="Internship CV">Internship CV</option>
              <option value="Academic CV">Academic CV</option>
              <option value="Freshers CV">Freshers CV</option>
            </select>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Target Job / Position</label>
          <div class="op-input-wrap">
            <span class="op-input-icon">🎯</span>
            <input class="op-input" id="opTargetJob" type="text" placeholder="e.g. Software Engineer at Google"/>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Degree & University <span style="color:#ef4444">*</span></label>
          <div class="op-input-wrap">
            <span class="op-input-icon">🎓</span>
            <input class="op-input" id="opEducation" type="text" placeholder="e.g. BSc in CSE, Daffodil International University"/>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Technical Skills</label>
          <div class="op-input-wrap">
            <span class="op-input-icon">💻</span>
            <input class="op-input" id="opSkills" type="text" placeholder="e.g. Python, React, Figma, MS Office"/>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Work / Internship Experience</label>
          <div class="op-input-wrap op-textarea-wrap">
            <span class="op-input-icon op-ta-icon">💼</span>
            <textarea class="op-input op-textarea" id="opExperience" placeholder="Company, Role, Duration... (Fresher? Write internship/project)" rows="3"></textarea>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Special Notes <span class="op-optional">(Optional)</span></label>
          <div class="op-input-wrap op-textarea-wrap">
            <span class="op-input-icon op-ta-icon">📋</span>
            <textarea class="op-input op-textarea" id="opNotes" placeholder="Any specific format or requirements..." rows="2"></textarea>
          </div>
        </div>

        ` : `

        <div class="op-field-group">
          <label class="op-field-label">${topicLabel}</label>
          <div class="op-input-wrap op-textarea-wrap">
            <span class="op-input-icon op-ta-icon">📝</span>
            <textarea class="op-input op-textarea" id="opTopic" placeholder="Describe your ${opts.title.toLowerCase()} topic..." rows="3"></textarea>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Department / বিভাগ <span class="op-optional">(Optional)</span></label>
          <div class="op-input-wrap">
            <span class="op-input-icon">🏛️</span>
            <input class="op-input" id="opDepartment" type="text" placeholder="e.g. CSE, BBA, EEE, Pharmacy..."/>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">University / Institution <span class="op-optional">(Optional)</span></label>
          <div class="op-input-wrap">
            <span class="op-input-icon">🎓</span>
            <input class="op-input" id="opUniversity" type="text" placeholder="e.g. BUET, DU, NSU, BRACU..."/>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Language / ভাষা <span class="op-optional">(Optional)</span></label>
          <div class="op-input-wrap">
            <select class="op-input" id="opLanguage" style="cursor:pointer;background:#1e1e2e;color:inherit;">
              <option value="">Select language</option>
              <option value="English">English</option>
              <option value="Bengali">Bengali / বাংলা</option>
              <option value="Both">Both / উভয়</option>
            </select>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Pages / Word Count <span class="op-optional">(Optional)</span></label>
          <div class="op-input-wrap">
            <span class="op-input-icon">📄</span>
            <input class="op-input" id="opPages" type="text" placeholder="e.g. 10 pages or 2500 words"/>
          </div>
        </div>

        <div class="op-field-group">
          <label class="op-field-label">Special Notes / বিশেষ নির্দেশনা <span class="op-optional">(Optional)</span></label>
          <div class="op-input-wrap op-textarea-wrap">
            <span class="op-input-icon op-ta-icon">📋</span>
            <textarea class="op-input op-textarea" id="opNotes" placeholder="Formatting requirements, references, citation style, supervisor guidelines, etc." rows="3"></textarea>
          </div>
        </div>

        `}

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

        <!-- Referral code -->
        <div class="op-field-group">
          <label class="op-field-label">Referral Code <span class="op-optional">(Optional)</span></label>
          <div class="op-input-wrap" style="border:1.5px solid rgba(139,92,246,0.45);border-radius:10px;background:rgba(139,92,246,0.07);">
            <span class="op-input-icon">🎟️</span>
            <input class="op-input" id="opRefCode" type="text" placeholder="Enter referral code (if any)"
              value="${esc(getRefCode())}"
              oninput="this.value=this.value.toUpperCase()"
              style="background:transparent;letter-spacing:0.05em;font-family:monospace;font-size:.92rem;"/>
          </div>
          <div style="font-size:.72rem;color:rgba(139,92,246,0.8);margin-top:5px;padding-left:2px;">
            🎁 কারো referral link থেকে এসে থাকলে তার code এখানে দিন
          </div>
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
    document.querySelectorAll('.op-overlay,.op-sheet:not(.mp-sheet),[id="opMount"]').forEach(el => el.remove());

    const div = document.createElement('div');
    div.id = 'opMount';
    div.innerHTML = buildOrderPopup(opts);
    document.body.appendChild(div);

    window._opOpts = opts;

    /* Reset calculator state for assignment-writing */
    if (opts.serviceId === 'assignment-writing') {
      window._opCalcQty      = opts.qty          || 500;
      window._opCalcMul      = 1.0;
      window._opCalcUrgLabel = 'Standard';
      window._opCalcUrgKey   = 'normal';
    }

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
    setTimeout(() => {
      const m = document.getElementById('opMount');
      if (m) m.remove();
      /* mobile sheet এখনও open থাকলে overflow hidden রাখো */
      const mpSheet = document.querySelector('.mp-sheet.open');
      if (!mpSheet) document.body.style.overflow = '';
    }, 340);
  };

  /* ── Assignment Writing Calculator ── */
  window._opCalcQty = 500;
  window._opCalcMul = 1.0;
  window._opCalcUrgLabel = 'Standard';
  window._opCalcUrgKey   = 'normal';

  function opCalcUpdatePrice() {
    const opts  = window._opOpts || {};
    const rate  = opts.rate    || 200;
    const per   = opts.perUnit || 500;
    const price = Math.round((window._opCalcQty / per) * rate * window._opCalcMul);

    const qtyEl   = document.getElementById('opCalcQty');
    const totalEl = document.getElementById('opTotalPrice');

    function fmtN(n) { return Number(n).toLocaleString('en-IN'); }

    if (qtyEl)   qtyEl.textContent   = fmtN(window._opCalcQty);
    if (totalEl) totalEl.textContent = '৳ ' + fmtN(price);

    /* sync back to opts so opConfirm uses updated values */
    if (window._opOpts) {
      window._opOpts.qty          = window._opCalcQty;
      window._opOpts.price        = price;
      window._opOpts.urgencyLabel = window._opCalcUrgLabel;
      window._opOpts.urgency      = window._opCalcUrgKey;
    }
  }

  window.opCalcStep = function(delta) {
    const min = 500;
    const next = (window._opCalcQty || 500) + delta;
    window._opCalcQty = Math.max(min, next);
    opCalcUpdatePrice();
  };

  window.opCalcUrgency = function(btn) {
    document.querySelectorAll('.op-urg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window._opCalcMul      = parseFloat(btn.dataset.mul) || 1.0;
    window._opCalcUrgLabel = btn.querySelector('.op-urg-name')?.textContent || 'Standard';
    window._opCalcUrgKey   = btn.dataset.urg || 'normal';
    opCalcUpdatePrice();
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

    // CV Writing এর জন্য আলাদা validation
    const isCV = (window._opOpts?.serviceId === 'cv-writing');
    if (isCV) {
      const cvType = document.getElementById('opCvType')?.value;
      const cvEdu  = document.getElementById('opEducation')?.value.trim();
      if (!cvType) { highlight('opCvType', 'CV Type select করুন'); return; }
      if (!cvEdu)  { highlight('opEducation', 'Education details দিন'); return; }
    } else {
      if (!topic) { highlight('opTopic', 'Topic লিখুন'); return; }
    }

    const btn = document.querySelector('.op-confirm-btn');
    if (btn) { btn.innerHTML = '⏳ Processing...'; btn.disabled = true; }

    try {
      const db   = window.scriptoraSupabase;
      const opts = window._opOpts || {};

      /* ── Auth check — লগইন না থাকলে login page এ পাঠাও ── */
      let clientId = localStorage.getItem('scriptora_client_id') || null;
      if (!clientId && db) {
        try {
          const { data } = await db.auth.getUser();
          if (data?.user) {
            clientId = data.user.id;
            localStorage.setItem('scriptora_client_id', clientId);
          }
        } catch (_) {}
      }
      if (!clientId) {
        if (btn) { btn.disabled = false; btn.innerHTML = '📱 Confirm Order / অর্ডার নিশ্চিত করুন'; }
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = '../Login page/login.html?return=' + returnUrl;
        return;
      }

      /* ── Order number — same sequential RPC as order.js to keep prefix consistent ── */
      const now     = new Date();
      const yyyymm  = now.toISOString().slice(0, 7).replace('-', '');   // e.g. "202608"
      const { data: seqData, error: seqErr } = await db
        .rpc('get_next_order_number', { p_yyyymm: yyyymm });
      if (seqErr || !seqData) {
        console.error('Order number RPC failed:', seqErr);
        if (btn) { btn.disabled = false; btn.innerHTML = '📱 Confirm Order / অর্ডার নিশ্চিত করুন'; }
        alert('Order number তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        return;
      }
      const orderNumber = seqData;   // e.g. "OPA-202608-004"

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
      // Map serviceId to a readable package label so the dashboard filter always has a value
      const SERVICE_PKG_MAP = {
        'thesis':                   'Thesis Writing',
        'handwritten':              'Handwritten Assignment',
        'assignment-writing':       'Assignment Writing',
        'presentation-slides':      'Presentation Slides',
        'proofreading':             'Proofreading',
        'apa-mla-formatting':       'APA/MLA Formatting',
        'plagiarism-reduction':     'Plagiarism Reduction',
        'spss-analysis':            'SPSS Analysis',
        'research-proposal':        'Research Proposal',
        'case-study-report':        'Case Study Report',
        'cv-writing':               'CV Writing',
        'ai-plagiarism-remover':    'AI Plagiarism Remover',
        'sop-writing':              'SOP Writing',
        'lab-report-writing':       'Lab Report Writing',
        'project-assignment-planning': 'Project Planning',
        'ai-detection-report':      'AI Detection Report',
        'research-article-writing': 'Research Article',
      };
      let pkg = '';
      if (opts.unitType === 'tier' && opts.tiers?.[opts.tierIndex]) {
        pkg = opts.tiers[opts.tierIndex].name;
      } else if (opts.thesisType) {
        pkg = opts.thesisType;
      } else if (sid && SERVICE_PKG_MAP[sid]) {
        pkg = SERVICE_PKG_MAP[sid];
      } else if (opts.title) {
        pkg = opts.title;
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
        research_area: (() => {
          if (opts.serviceId === 'cv-writing') {
            return document.getElementById('opTargetJob')?.value.trim() || 'CV Writing';
          }
          return topic;
        })(),
        page_count:           pageCount,
        pages:                document.getElementById('opPages')?.value.trim() || (pageCount ? String(pageCount) : null),
        department:           document.getElementById('opDepartment')?.value.trim() || null,
        university:           document.getElementById('opUniversity')?.value.trim() || null,
        language:             document.getElementById('opLanguage')?.value || null,
        special_instructions: (() => {
          const isCV = (opts.serviceId === 'cv-writing');
          if (isCV) {
            const cvType    = document.getElementById('opCvType')?.value || '';
            const targetJob = document.getElementById('opTargetJob')?.value.trim() || '';
            const education = document.getElementById('opEducation')?.value.trim() || '';
            const skills    = document.getElementById('opSkills')?.value.trim() || '';
            const exp       = document.getElementById('opExperience')?.value.trim() || '';
            const cvNotes   = document.getElementById('opNotes')?.value.trim() || '';
            return [
              `Name: ${name}`, `Phone: ${phone}`,
              `CV Type: ${cvType}`,
              targetJob ? `Target Job: ${targetJob}` : '',
              `Education: ${education}`,
              skills ? `Skills: ${skills}` : '',
              exp ? `Experience: ${exp}` : '',
              cvNotes ? `Notes: ${cvNotes}` : '',
            ].filter(Boolean).join('\n');
          }
          const dept  = document.getElementById('opDepartment')?.value.trim() || '';
          const uni   = document.getElementById('opUniversity')?.value.trim() || '';
          const lang  = document.getElementById('opLanguage')?.value || '';
          const pages = document.getElementById('opPages')?.value.trim() || '';
          return [
            `Name: ${name}`, `Phone: ${phone}`,
            dept  ? `Department: ${dept}`   : '',
            uni   ? `University: ${uni}`    : '',
            lang  ? `Language: ${lang}`     : '',
            pages ? `Pages/Words: ${pages}` : '',
            notes ? `Notes: ${notes}`       : '',
          ].filter(Boolean).join('\n');
        })(),
        referred_by_code: getRefCode() || null,
      };

      const { data: insertData, error } = await db.from('orders').insert(row).select('id').single();
      if (error) throw error;

      const orderId = insertData.id;

      /* ── Mark affiliate click as converted ── */
      const _trackedRef = getRefCode();
      if (_trackedRef) {
        try {
          await db.from('affiliate_clicks')
            .update({ converted: true, converted_at: new Date().toISOString() })
            .eq('referral_code', _trackedRef)
            .eq('converted', false);
        } catch (_) {}
      }

      /* ── Ensure scriptora_client_id is persisted in localStorage ── */
      if (clientId) localStorage.setItem('scriptora_client_id', clientId);

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
