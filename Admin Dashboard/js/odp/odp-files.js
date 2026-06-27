/* ═══════════════════════════════════════════════════════════════════
   SCRIPTORA — ODP Files Tab
   Depends on: order-details-panel.js (shared state & helpers)
═══════════════════════════════════════════════════════════════════ */
'use strict';

  /* ══════════════════════════════════════════════════════════
     FILES — Supabase Storage + Access Control
  ══════════════════════════════════════════════════════════ */

  /* In-memory file metadata cache for current order */
  /* global — defined in order-details-panel.js */

  window._loadFilesMeta = async function(orderId) {
    window._fileMetaCache = {};
    if (!window._sb() || !window._isRealUUID(orderId)) return;
    try {
      const { data } = await window._sb()
        .from('order_file_access')
        .select('storage_path, is_visible, download_allowed, client_notified')
        .eq('order_id', orderId);
      if (data) data.forEach(r => { window._fileMetaCache[r.storage_path] = r; });
    } catch(e) { console.warn('[Files] meta load error', e); }
  }

  window._loadFiles = async function() {
    const list   = document.getElementById('odpFileList');
    const listOv = document.getElementById('odpFileListOverview');
    if (!list && !listOv) return;

    await window._loadFilesMeta(window._currentOrderId);

    /* Static files from order.detail */
    const d = window._currentOrder && window._currentOrder.detail;
    if (d && d.files && d.files.length) {
      const tableHeader = window._buildFileTableHeader();
      const html = d.files.map(f => window._renderFileRow(f)).join('');
      if (list) list.innerHTML = tableHeader + html;
      if (listOv) listOv.innerHTML = tableHeader + html;
    }

    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) {
      if (list && !(d && d.files && d.files.length)) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">No files uploaded yet.</div>';
      }
      return;
    }

    try {
      const safeOrderId = (window._currentOrderId || '').replace(/[#?&=\s]/g, '_');
      const path = `orders/${safeOrderId}`;
      const { data, error } = await window._sb().storage.from('order-files').list(path, { limit: 100 });
      if (error || !data || !data.length) {
        if (!d || !d.files || !d.files.length) list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px">No files uploaded yet.</div>';
        return;
      }
      const tableHeader = window._buildFileTableHeader();
      const html = data.map(f => {
        /* Check cache for uploaded_by — admin upload shows 'Admin', else 'Writer' */
        const storagePath = `${path}/${f.name}`;
        const cachedMeta = window._fileMetaCache[storagePath] || {};
        const uploader = cachedMeta.uploaded_by || 'Writer';
        return window._renderFileRow({
          name: f.name,
          size: f.metadata?.size,
          updated_at: f.updated_at,
          supabasePath: storagePath,
          uploaded_by: uploader
        });
      }).join('');
      if (list) list.innerHTML = tableHeader + html;
      if (listOv) listOv.innerHTML = tableHeader + html;
    } catch(e) {
      if (!d || !d.files || !d.files.length) {
        if (list) list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Could not load files.</div>';
      }
    }

    /* Load client submitted files */
    await window._loadClientFiles();
  }

/* ── Client submitted files (uploaded via order form) ─────────── */
window._loadClientFiles = async function() {
  const el = document.getElementById('odpClientFileList');
  if (!el) return;

  if (!window._sb() || !window._isRealUUID(window._currentOrderId)) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">No client files.</div>';
    return;
  }

  try {
    /* order_file_access থেকে Client uploaded files নাও */
    const { data: accessRows } = await window._sb()
      .from('order_file_access')
      .select('storage_path, is_visible, download_allowed, client_notified, uploaded_by')
      .eq('order_id', window._currentOrderId)
      .eq('uploaded_by', 'Client');

    if (!accessRows || !accessRows.length) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px"><i class="ti ti-paperclip" style="font-size:20px;display:block;margin-bottom:6px;opacity:0.4"></i>Client has not submitted any files.</div>';
      return;
    }

    const tableHeader = window._buildFileTableHeader();
    const rows = await Promise.all(accessRows.map(async (row) => {
      const parts = row.storage_path.split('/');
      const name  = parts[parts.length - 1];

      /* file metadata — size & date from Storage */
      let size, updated_at;
      try {
        const folder = parts.slice(0, -1).join('/');
        const { data: ls } = await window._sb().storage.from('order-files').list(folder, { limit: 100 });
        const meta = ls && ls.find(f => f.name === name);
        size       = meta?.metadata?.size;
        updated_at = meta?.updated_at;
      } catch(_) {}

      /* update cache so access control works */
      window._fileMetaCache[row.storage_path] = row;

      return window._renderFileRow({
        name,
        size,
        updated_at,
        supabasePath: row.storage_path,
        uploaded_by: 'Client'
      });
    }));

    el.innerHTML = tableHeader + rows.join('');
  } catch(e) {
    console.warn('[ClientFiles]', e);
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Could not load client files.</div>';
  }
};

window._buildFileTableHeader = function() {
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

window._renderFileRow = function(f) {
    const ext        = (f.name || '').split('.').pop().toLowerCase();
    const pillCls    = ext==='pdf' ? 'pdf' : (ext==='docx'||ext==='doc') ? 'docx' : ext==='zip' ? 'zip' : ext.match(/png|jpg|jpeg|gif|webp/) ? 'img' : 'other';
    const icon       = ext==='pdf' ? 'ti-file-type-pdf' : (ext==='docx'||ext==='doc') ? 'ti-file-type-doc' : ext==='zip' ? 'ti-file-zip' : ext.match(/png|jpg|jpeg|gif|webp/) ? 'ti-photo' : 'ti-file';
    const size       = f.size ? (f.size/1024 < 1024 ? (f.size/1024).toFixed(0)+' KB' : (f.size/1024/1024).toFixed(1)+' MB') : '—';
    const uploadedAt = f.updated_at ? new Date(f.updated_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) + ' ' + new Date(f.updated_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '—';
    const uploader   = f.uploaded_by || (f.supabasePath ? 'Writer' : 'Client');
    const path       = f.supabasePath || '';
    const isClient   = uploader === 'Client';

    /* ── Client-submitted files: View + Download only, no access controls ── */
    if (isClient) {
      return `
      <div class="odp-file-row" data-path="${window._esc(path)}">
        <div class="odp-file-name-cell">
          <i class="ti ${icon}"></i>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${window._esc(f.name)}</span>
        </div>
        <span class="odp-file-type-pill ${pillCls}">${ext}</span>
        <span style="color:var(--muted2);font-size:11.5px">${window._esc(uploader)}</span>
        <span style="color:var(--muted2);font-size:11px">${uploadedAt}</span>
        <span style="color:var(--muted2);font-size:11.5px">${size}</span>
        <span style="color:var(--muted);font-size:11px;font-style:italic">Client owned</span>
        <div class="odp-file-actions">
          <button class="odp-file-action-btn" title="View file" onclick="odpViewFile('${window._esc(path)}','${window._esc(f.name)}')"><i class="ti ti-eye"></i></button>
          <button class="odp-file-action-btn" title="Download file" onclick="odpDownloadFile('${window._esc(path)}','${window._esc(f.name)}')"><i class="ti ti-download"></i></button>
        </div>
      </div>`;
    }

    /* ── Writer/Admin files: full access controls ── */
    const meta       = window._fileMetaCache[path] || {};
    const isVisible  = meta.is_visible  !== undefined ? meta.is_visible  : true;
    const dlAllowed  = meta.download_allowed !== undefined ? meta.download_allowed : true;
    const notified   = meta.client_notified || false;
    const chkId      = 'vis_' + path.replace(/[^a-z0-9]/gi, '_');
    const notifBadge = notified ? `<span class="odp-notif-sent">✓ Notified</span>` : '';

    return `
    <div class="odp-file-row${isVisible ? '' : ' client-hidden'}" data-path="${window._esc(path)}" data-dl="${dlAllowed}" data-vis="${isVisible}">
      <div class="odp-file-name-cell">
        <i class="ti ${icon}"></i>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${window._esc(f.name)}</span>
        ${notifBadge}
      </div>
      <span class="odp-file-type-pill ${pillCls}">${ext}</span>
      <span style="color:var(--muted2);font-size:11.5px">${window._esc(uploader)}</span>
      <span style="color:var(--muted2);font-size:11px">${uploadedAt}</span>
      <span style="color:var(--muted2);font-size:11.5px">${size}</span>
      <div class="odp-access-cell">
        <span class="odp-access-badge ${isVisible ? 'viewable' : 'hidden'}" id="badge_${chkId}">${isVisible ? '● Viewable' : '○ Hidden'}</span>
        <label class="odp-mini-toggle" title="Toggle client visibility">
          <input type="checkbox" ${isVisible ? 'checked' : ''} onchange="odpToggleVisibility('${window._esc(path)}','${window._esc(f.name)}',this)">
          <div class="odp-mini-track"></div>
          <div class="odp-mini-thumb"></div>
        </label>
      </div>
      <div class="odp-file-actions">
        <button class="odp-file-action-btn" title="Download file (admin)" onclick="odpDownloadFile('${window._esc(path)}','${window._esc(f.name)}')"><i class="ti ti-download"></i></button>
        <button class="odp-file-action-btn${dlAllowed ? '' : ' locked-dl'}" title="${dlAllowed ? 'Client download allowed — click to lock' : 'Client download locked — click to unlock'}" onclick="odpToggleDownload('${window._esc(path)}',this)"><i class="ti ${dlAllowed ? 'ti-lock-open' : 'ti-lock'}"></i></button>
        <button class="odp-file-action-btn" title="Send notification to client" onclick="odpNotifyClient('${window._esc(path)}','${window._esc(f.name)}',this)"><i class="ti ti-bell"></i></button>
        <button class="odp-file-action-btn danger" title="Delete file" onclick="odpDeleteFile('${window._esc(path)}',this)"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
  }

  /* Save access meta to Supabase */
  window._saveFileMeta = async function(storagePath, updates) {
    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) return;
    try {
      await window._sb().from('order_file_access').upsert({
        order_id: window._currentOrderId,
        storage_path: storagePath,
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'order_id,storage_path' });
      /* update local cache */
      window._fileMetaCache[storagePath] = { ...window._fileMetaCache[storagePath], ...updates };
    } catch(e) { console.error('[Files] meta save error', e); }
  }

  window.odpUploadFiles = async function(files) {
    if (!files || !files.length) return;
    const list = document.getElementById('odpFileList');
    const existing = list ? list.querySelector('.odp-loading, div[style*="text-align:center"]') : null;
    if (existing) existing.remove();

    const safeOrderId = (window._currentOrderId || 'unknown').replace(/[#?&=\s]/g, '_');

    for (const f of Array.from(files)) {
      const safeName = f.name.replace(/[#?&=]/g, '_');
      const placeholder = document.createElement('div');
      placeholder.className = 'odp-file-row';
      placeholder.innerHTML = `<div style="flex:1;font-size:12px;color:var(--muted2)"><i class="ti ti-loader" style="animation:spin .7s linear infinite"></i> Uploading ${window._esc(f.name)}…</div>`;
      if (list) list.appendChild(placeholder);

      if (!window._sb()) {
        await new Promise(res => setTimeout(res, 1200));
        const fakeRow = document.createElement('div');
        fakeRow.innerHTML = window._renderFileRow({ name: f.name, size: f.size, updated_at: new Date().toISOString(), supabasePath: `orders/${safeOrderId}/${safeName}`, uploaded_by: 'Writer' });
        placeholder.replaceWith(fakeRow.firstElementChild);
        window._toast(`✓ ${f.name} uploaded!`, 'var(--green)');
        window._logActivity('file_upload', `File uploaded: ${f.name}`);
        continue;
      }

      try {
        const path = `orders/${safeOrderId}/${safeName}`;
        const { error } = await window._sb().storage.from('order-files').upload(path, f, { upsert: true });
        if (error) throw error;
        /* Create default access record — hidden from client until admin enables */
        await window._saveFileMeta(path, { is_visible: false, download_allowed: true, client_notified: false, uploaded_by: 'Admin' });
        placeholder.remove();
        window._toast(`✓ ${f.name} uploaded! Set Client Access to show it.`, 'var(--green)');
        window._logActivity('file_upload', `File uploaded: ${f.name}`);
      } catch(e) {
        console.error('Upload error:', e);
        placeholder.innerHTML = `<div style="color:var(--red);font-size:12px;padding:8px 0">⚠ Upload failed: ${window._esc(f.name)} — ${window._esc(e.message||'Unknown error')}</div>`;
        window._toast(`⚠ Upload failed: ${f.name} — ${e.message||''}`, 'var(--red)');
      }
    }
    await window._loadFiles();
  };

  window.odpDragOver = function(e) { e.preventDefault(); document.getElementById('odpDropZone').style.borderColor='var(--accent)'; };
  window.odpDrop = function(e) { e.preventDefault(); document.getElementById('odpDropZone').style.borderColor=''; odpUploadFiles(e.dataTransfer.files); };

  window.odpDownloadFile = async function(path, name) {
    if (!path || !window._sb()) { window._toast('⚠ Download not available', 'var(--red)'); return; }
    try {
      const { data, error } = await window._sb().storage.from('order-files').download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { window._toast('⚠ Download failed', 'var(--red)'); }
  };

  /* View file in new tab */
  window.odpViewFile = async function(path, name) {
    if (!path || !window._sb()) { window._toast('⚠ View not available', 'var(--red)'); return; }
    try {
      const { data, error } = await window._sb().storage.from('order-files').createSignedUrl(path, 300);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch(e) { window._toast('⚠ Could not open file', 'var(--red)'); }
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

    await window._saveFileMeta(path, { is_visible: isVisible });
    window._toast(isVisible ? `✓ "${name}" is now visible to client` : `"${name}" hidden from client`, isVisible ? 'var(--green)' : 'var(--muted)');
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

    await window._saveFileMeta(path, { download_allowed: nowAllowed });
    window._toast(nowAllowed ? '🔓 Download unlocked for client' : '🔒 Download locked for client', nowAllowed ? 'var(--green)' : 'var(--yellow)');
  };

  /* Send notification to client about new file */
  window.odpNotifyClient = async function(path, name, btn) {
    if (!window._sb() || !window._isRealUUID(window._currentOrderId)) {
      window._toast('⚠ Cannot send notification (no Supabase)', 'var(--red)');
      return;
    }
    try {
      /* Insert notification into client_notifications table */
      await window._sb().from('client_notifications').insert({
        order_id: window._currentOrderId,
        type: 'file_uploaded',
        message: `A new file "${name}" is available for your order.`,
        storage_path: path,
        is_read: false,
        created_at: new Date().toISOString()
      });
      /* Mark as notified in file meta */
      await window._saveFileMeta(path, { client_notified: true });

      /* Update UI badge */
      const row = btn.closest('.odp-file-row');
      const nameCell = row ? row.querySelector('.odp-file-name-cell') : null;
      if (nameCell && !nameCell.querySelector('.odp-notif-sent')) {
        nameCell.insertAdjacentHTML('beforeend', '<span class="odp-notif-sent">✓ Notified</span>');
      }
      btn.style.color = 'var(--green)';
      window._toast(`✓ Client notified about "${name}"`, 'var(--green)');
    } catch(e) {
      console.error('[Notify] error:', e);
      window._toast('⚠ Notification failed: ' + (e.message || 'Unknown'), 'var(--red)');
    }
  };

  window.odpDeleteFile = async function(path, btn) {
    if (!confirm('Delete this file? This cannot be undone.')) return;
    const row = btn.closest('.odp-file-row');
    if (window._sb() && path) {
      try {
        await window._sb().storage.from('order-files').remove([path]);
        /* Also remove access meta */
        if (window._isRealUUID(window._currentOrderId)) {
          await window._sb().from('order_file_access').delete()
            .eq('order_id', window._currentOrderId)
            .eq('storage_path', path);
        }
      } catch(e) { console.warn('[Files] delete error', e); }
    }
    if (row) row.remove();
    delete window._fileMetaCache[path];
    window._toast('File deleted', 'var(--red)');
  };

