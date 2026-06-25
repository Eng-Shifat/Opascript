const SERVICES = [
  { id: 'assignment-writing',   icon: '📝', iconBg: 'rgba(45,110,247,0.18)',   name: 'Assignment Writing',            cat: 'Writing & Content' },
  { id: 'presentation-slides',  icon: '🖥️', iconBg: 'rgba(236,72,153,0.18)',   name: 'Presentation Slides',           cat: 'Writing & Content' },
  { id: 'case-study-report',    icon: '📁', iconBg: 'rgba(251,113,133,0.18)',   name: 'Case Study Report',             cat: 'Writing & Content' },
  { id: 'cv-writing',           icon: '📄', iconBg: 'rgba(99,102,241,0.18)',    name: 'CV Writing',                    cat: 'Writing & Content' },
  { id: 'sop-writing',          icon: '📜', iconBg: 'rgba(244,114,182,0.18)',   name: 'SOP Writing',                   cat: 'Writing & Content' },
  { id: 'research-article',     icon: '📰', iconBg: 'rgba(217,70,239,0.18)',    name: 'Research Article / Journal',    cat: 'Writing & Content' },
  { id: 'proofreading',         icon: '🔍', iconBg: 'rgba(96,165,250,0.18)',    name: 'Proofreading',                  cat: 'Editing & Plagiarism' },
  { id: 'apa-mla-formatting',   icon: '📑', iconBg: 'rgba(245,158,11,0.18)',    name: 'Formatting (APA/MLA)',           cat: 'Editing & Plagiarism' },
  { id: 'plagiarism-reduction', icon: '🛡️', iconBg: 'rgba(34,197,94,0.18)',    name: 'Plagiarism Reduction',          cat: 'Editing & Plagiarism' },
  { id: 'ai-plagiarism-remover',icon: '🧠', iconBg: 'rgba(168,85,247,0.18)',   name: 'AI Plagiarism Remover',         cat: 'Editing & Plagiarism' },
  { id: 'ai-detection-report',  icon: '🕵️', iconBg: 'rgba(250,204,21,0.18)',  name: 'AI Detection Report',           cat: 'Editing & Plagiarism' },
  { id: 'spss-analysis',        icon: '📊', iconBg: 'rgba(139,92,246,0.18)',   name: 'SPSS Analysis',                 cat: 'Research & Analysis' },
  { id: 'research-proposal',    icon: '🔎', iconBg: 'rgba(20,184,166,0.18)',   name: 'Research Proposal',             cat: 'Research & Analysis' },
  { id: 'lab-report-writing',   icon: '🧪', iconBg: 'rgba(34,211,238,0.18)',   name: 'Lab Report Writing',            cat: 'Research & Analysis' },
  { id: 'project-planning',     icon: '🧭', iconBg: 'rgba(132,204,22,0.18)',   name: 'Project / Assignment Planning', cat: 'Research & Analysis' },
];

const avail = {};
SERVICES.forEach(s => { avail[s.id] = true; });

async function loadData() {
  const sb = window.scriptoraSupabase;
  if (!sb) { showError('Supabase not connected'); return; }

  const { data, error } = await sb
    .from('service_availability')
    .select('service_id, is_available');

  if (error) { showError('Failed to load: ' + error.message); return; }

  if (data) {
    data.forEach(row => { avail[row.service_id] = row.is_available; });
  }

  document.getElementById('loadingWrap').style.display = 'none';
  renderBoard();
  document.getElementById('serviceBoard').style.display = 'block';
}

function renderBoard() {
  const board = document.getElementById('serviceBoard');
  const cats  = [...new Set(SERVICES.map(s => s.cat))];
  board.innerHTML = cats.map(cat => {
    const services = SERVICES.filter(s => s.cat === cat);
    return `
      <div class="cat-group">
        <div class="cat-label">${cat}</div>
        <div class="service-list">
          ${services.map(s => renderRow(s)).join('')}
        </div>
      </div>`;
  }).join('');
}

function renderRow(s) {
  const on = avail[s.id] !== false;
  return `
    <div class="service-row" id="row-${s.id}">
      <div class="svc-icon" style="background:${s.iconBg}">${s.icon}</div>
      <div class="svc-info">
        <div class="svc-name">${s.name}</div>
        <div class="svc-desc">${s.id}</div>
      </div>
      <div class="svc-status ${on ? 'available' : 'unavailable'}" id="status-${s.id}">
        ${on ? '● Available' : '○ Unavailable'}
      </div>
      <label class="toggle toggle-wrap">
        <input type="checkbox" ${on ? 'checked' : ''} onchange="toggleService('${s.id}', this.checked)">
        <div class="toggle-track"></div>
        <div class="toggle-thumb"></div>
      </label>
    </div>`;
}

async function toggleService(id, isAvailable) {
  showStatus('saving', 'Saving...');
  const sb = window.scriptoraSupabase;
  if (!sb) { showStatus('error', 'Not connected'); return; }

  const { error } = await sb
    .from('service_availability')
    .upsert({ service_id: id, is_available: isAvailable, updated_at: new Date().toISOString() },
             { onConflict: 'service_id' });

  if (error) { showStatus('error', 'Failed to save'); console.error(error); return; }

  avail[id] = isAvailable;
  const pill = document.getElementById('status-' + id);
  if (pill) {
    pill.className = 'svc-status ' + (isAvailable ? 'available' : 'unavailable');
    pill.textContent = isAvailable ? '● Available' : '○ Unavailable';
  }
  showStatus('saved', '✓ Saved');
  setTimeout(() => hideStatus(), 2000);
}

function showStatus(type, msg) {
  const el = document.getElementById('saveStatus');
  el.className = 'save-status ' + type;
  el.textContent = msg;
}
function hideStatus() { document.getElementById('saveStatus').style.display = 'none'; }
function showError(msg) {
  document.getElementById('loadingWrap').innerHTML = `<div style="color:#f87171;font-size:14px">⚠️ ${msg}</div>`;
}

document.addEventListener('DOMContentLoaded', loadData);
