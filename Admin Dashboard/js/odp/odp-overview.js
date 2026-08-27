/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — ODP Overview Tab
   Depends on: order-details-panel.js (shared state & helpers)
═══════════════════════════════════════════════════════════════════ */
'use strict';

window._renderThesisDetailsCard = function(ord, client) {
    const el = document.getElementById('odpThesisDetailsCard');
    if (!el || !ord) return;
    el.innerHTML = window._buildAcademicSummaryHTML(window._currentOrder || {}, ord, client);
  }

window._renderClientInfoFromDB = function(ord, client) {
    if (!client && !ord) return;

    /* ── Sync _currentOrder so Summary tab rebuild uses correct values ── */
    if (client && window._currentOrder) {
      if (client.name)  window._currentOrder.client = client.name;
      if (client.email && window._currentOrder.detail) window._currentOrder.detail.email = client.email;
      const phone = client.phone || client.whatsapp || ord.phone || ord.whatsapp || '';
      if (phone && window._currentOrder.detail) window._currentOrder.detail.phone = phone;
      const uni = client.University || client.university || ord.university || '';
      if (uni) window._currentOrder.uni = uni;
      /* initials + avatarColor */
      const parts = client.name ? client.name.trim().split(/\s+/) : [];
      if (parts.length) {
        window._currentOrder.initials = parts.map(w => w[0]).join('').substring(0,2).toUpperCase();
      }
    }

    /* ── Client name ── */
    if (client && client.name) {
      document.querySelectorAll('.odp-cc-name').forEach(el => {
        el.innerHTML = `${client.name} <span class="odp-cc-badge-verified"><i class="ti ti-shield-check"></i> Verified</span>`;
      });
      const headerClient = document.getElementById('odpHeaderClient');
      if (headerClient) headerClient.innerHTML = `<i class="ti ti-user"></i> Client: <b>${client.name}</b>`;
      /* Messages tab placeholder */
      document.querySelectorAll('.odp-msg-textarea').forEach(el => {
        el.placeholder = el.placeholder.replace((window._currentOrder && window._currentOrder.client) || 'Client', client.name);
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

window._renderClientSubmission = function(ord, client) {
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

