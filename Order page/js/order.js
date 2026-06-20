// ── Custom Word Count toggle ──
function toggleCustomWordCount(wrapId, val) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.style.display = val === 'custom' ? 'block' : 'none';
  if (val !== 'custom') {
    const inp = wrap.querySelector('input');
    if (inp) inp.value = '';
  }
}

let step = 1;
const total = 5;

// State
let selectedDept    = 'bba';
let selectedUrgencyVal = 'standard';
let selectedChapters = ['ch1-3'];
let activeAddons    = {};
let uploadedFiles   = [];

const pkgData = {
  bba:     { label:'📚 Honours & Masters', standard:7000,  urgent:10000, express:12000 },
  cse:     { label:'Engineering',          standard:10000, urgent:12000, express:16000 },
  premium: { label:'✨ Special Request',   standard:null,  urgent:null,  express:null  }
};

// ── Deadline → Auto urgency ──
function handleDeadlineChange() {
  const val = document.getElementById('deadlineDate').value;
  if (!val) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const deadline = new Date(val); deadline.setHours(0,0,0,0);
  const days = Math.round((deadline - today) / 864e5);

  let urgency = 'standard';
  if (days >= 7)      urgency = 'standard';
  else if (days >= 4) urgency = 'urgent';
  else                urgency = 'express';

  selectUrgency(urgency);

  const pkg = pkgData[selectedDept];
  const price = pkg[urgency] ? '৳' + pkg[urgency].toLocaleString() : '';
  const info = document.getElementById('dlInfo');
  const msgs = {
    standard: `✅ ${days} দিন বাকি — Standard delivery সম্ভব।`,
    urgent:   `⚡ ${days} দিন বাকি — Urgent delivery প্রয়োজন।`,
    express:  `🚀 ${days} দিন বাকি — Express delivery প্রয়োজন।`
  };
  if (info) info.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${msgs[urgency]}`;

  // update urgency card prices dynamically
  updateUrgencyCardPrices();
  updateCalc();
}

// ── Update urgency card prices based on selected dept ──
function updateUrgencyCardPrices() {
  const pkg = pkgData[selectedDept];
  const cards = {
    standard: { days:'৭–১৪ দিন', extra:'Base price' },
    urgent:   { days:'৪–৭ দিন',  extra:'+২০%'      },
    express:  { days:'১–৩ দিন',  extra:'+৫০%'      },
  };
  Object.entries(cards).forEach(([key, val]) => {
    const card = document.querySelector(`.uc[data-u="${key}"]`);
    if (!card) return;
    const daysEl  = card.querySelector('.uc-days');
    const extraEl = card.querySelector('.uc-extra');
    if (daysEl)  daysEl.textContent  = val.days;
    if (extraEl) extraEl.textContent = val.extra;
  });
}

const deptSubjects = {
  bba: {
    departments: [
      'BBA — Business Administration','MBA','Honours in Accounting',
      'Honours in Finance & Banking','Honours in Marketing',
      'Honours in Management','Honours in HRM','Honours in MIS',
      'Masters in Business Administration','Masters in Finance',
      'Masters in Marketing','Masters in HRM','Economics (Honours)',
      'Economics (Masters)','Sociology (Honours)','Sociology (Masters)',
      'Political Science (Honours)','Political Science (Masters)',
      'English (Honours)','English (Masters)','Bangla (Honours)',
      'Bangla (Masters)','History (Honours)','History (Masters)',
      'Islamic Studies (Honours)','Philosophy (Honours)','Psychology (Honours)',
      'অন্যান্য'
    ],
    researchAreas: [
      'Finance & Banking','Marketing Management','Human Resource Management',
      'Organizational Behavior','Supply Chain Management','E-commerce & Digital Marketing',
      'Consumer Behavior','Corporate Governance','Microeconomics','Macroeconomics',
      'Development Economics','Gender & Society','Political Theory','International Relations',
      'Linguistics & Literature','Cultural Studies','Historical Analysis','অন্যান্য'
    ]
  },
  cse: {
    departments: [
      'CSE — Computer Science & Engineering','SWE — Software Engineering',
      'EEE — Electrical & Electronic Engineering','ECE — Electronics & Communication',
      'Civil Engineering','Mechanical Engineering','IPE — Industrial & Production Engineering',
      'Architecture','Urban & Regional Planning','Naval Architecture',
      'Petroleum & Mining Engineering','Environmental Engineering',
      'Textile Engineering','Leather Engineering','Food Engineering','অন্যান্য'
    ],
    researchAreas: [
      'Machine Learning & AI','Deep Learning & Neural Networks','Computer Vision',
      'Natural Language Processing','Cybersecurity & Network Security',
      'IoT & Embedded Systems','Cloud Computing & Distributed Systems',
      'Software Architecture & Design Patterns','Database Systems',
      'Power Systems & Renewable Energy','VLSI & Semiconductor Design',
      'Signal Processing','Structural Engineering','Fluid Mechanics',
      'Robotics & Automation','Environmental & Sustainable Engineering','অন্যান্য'
    ]
  }
};

const researchTypes = {
  bba: [
    { key:'quantitative', icon:'📊', title:'Quantitative',         desc:'Survey, SPSS, Regression' },
    { key:'qualitative',  icon:'💬', title:'Qualitative',          desc:'Interview, Case Study, FGD' },
    { key:'mixed',        icon:'🔀', title:'Mixed Method',         desc:'Quantitative + Qualitative' },
  ],
  cse: [
    { key:'development',  icon:'🛠', title:'Development Project',  desc:'Web, App, Software build' },
    { key:'research',     icon:'📄', title:'Research Paper',       desc:'Journal, Conference paper' },
    { key:'thesis',       icon:'📄', title:'Thesis Paper',        desc:'Full academic thesis write-up' },
    { key:'system',       icon:'🔧', title:'System Implementation', desc:'Network, Architecture, Infra' },
  ],
  premium: [
    { key:'quantitative', icon:'📊', title:'Quantitative',         desc:'Survey, SPSS, Regression' },
    { key:'qualitative',  icon:'💬', title:'Qualitative',          desc:'Interview, Case Study' },
    { key:'mixed',        icon:'🔀', title:'Mixed Method',         desc:'Quantitative + Qualitative' },
    { key:'development',  icon:'🛠', title:'Development Project',  desc:'Web, App, Software build' },
    { key:'research',     icon:'📄', title:'Research Paper',       desc:'Journal, Conference paper' },
    { key:'other',        icon:'✨', title:'Other',                desc:'Describe in instructions' },
  ]
};

function renderResearchTypes(dept) {
  const types = researchTypes[dept] || researchTypes.bba;
  const cols  = types.length <= 3 ? types.length : 2;
  const grid  = document.getElementById('researchTypeCards');
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  grid.innerHTML = types.map(function(t, i) {
    return '<div class="rc ' + (i===0?'active':'') + '" data-rt="' + t.key + '" onclick="selectRC(\'researchTypeCards\',\'' + t.key + '\')">'
      + '<span class="rc-icon">' + t.icon + '</span>'
      + '<div class="rc-body">'
      + '<div class="rc-title">' + t.title + '</div>'
      + '<div class="rc-desc">' + t.desc + '</div>'
      + '</div></div>';
  }).join('');
}

const addonData = {
  plag:           { label:'Plagiarism Check',     price:0    },
  spss:           { label:'SPSS / Data Analysis', price:2000 },
  slides:         { label:'Presentation Slides',  price:500  },
  questionnaire:  { label:'Questionnaire Design', price:800  },
  datacollection: { label:'Data Collection',      price:1000 },
  coverpage:      { label:'Custom Cover Page',    price:100  },
  figures:        { label:'All Figures & Charts', price:300  }
};
const urgencyMul = { standard:1, urgent:1.2, express:1.5 };

// ── Dept switch ──
function switchDept(d) {
  selectedDept = d;
  document.querySelectorAll('.dept-tab').forEach(t => t.classList.toggle('active', t.dataset.dept === d));
  document.getElementById('navPkg').textContent = pkgData[d].label;

  const deptDropWrap   = document.getElementById('deptDropWrap');
  const deptSelect     = document.getElementById('department');
  const deptText       = document.getElementById('departmentText');
  const topicSelect    = document.getElementById('thesisTopic');
  const raWrap         = document.getElementById('researchAreaWrap');

  if (d === 'premium') {
    // Special Request: text input for dept, text input for research area
    deptDropWrap.style.display = 'none';
    deptText.style.display = 'block';
    raWrap.style.display = 'block';

    // Replace research area dropdown with text input
    topicSelect.style.display = 'none';
    let raText = document.getElementById('researchAreaText');
    if (!raText) {
      raText = document.createElement('input');
      raText.type = 'text';
      raText.id = 'researchAreaText';
      raText.placeholder = 'আপনার research area লিখুন… (e.g. Law, Pharmacy, Nursing, Fine Arts…)';
      topicSelect.parentNode.insertBefore(raText, topicSelect.nextSibling);
    }
    raText.style.display = 'block';
  } else {
    // Honours or Engineering: dept dropdown + research area dropdown
    deptDropWrap.style.display = 'block';
    deptText.style.display = 'none';
    raWrap.style.display = 'block';
    topicSelect.style.display = 'block';
    const raText = document.getElementById('researchAreaText');
    if (raText) raText.style.display = 'none';

    // Populate department dropdown
    const depts = deptSubjects[d].departments;
    deptSelect.innerHTML = '<option value="" disabled selected>বেছে নিন</option>' +
      depts.map(dep => `<option value="${dep}">${dep}</option>`).join('');

    // Populate research area dropdown
    const areas = deptSubjects[d].researchAreas;
    topicSelect.innerHTML = '<option value="" disabled selected>বেছে নিন</option>' +
      areas.map(a => `<option value="${a}">${a}</option>`).join('');
  }

  // Show correct scope panel in Step 2
  document.getElementById('scopeBBA').style.display     = d === 'bba'     ? 'block' : 'none';
  document.getElementById('scopeCSE').style.display     = d === 'cse'     ? 'block' : 'none';
  document.getElementById('scopePremium').style.display = d === 'premium' ? 'block' : 'none';

  // Update Step 2 subtitle
  const descs = {
    bba:     'Variables, methodology ও research details দিন',
    cse:     'Project type, tech stack ও system features বেছে নিন',
    premium: 'আপনার কাজের বিস্তারিত বর্ণনা দিন'
  };
  const descEl = document.getElementById('p2Desc');
  if (descEl) descEl.textContent = descs[d];

  // Render research types for this dept
  renderResearchTypes(d);

  // Update upload hint based on dept
  const uploadHints = {
    bba:     '💡 Supervisor guideline, collected data (Excel), university thesis template upload করুন',
    cse:     '💡 Dataset (CSV/Excel), reference IEEE paper, university thesis template upload করুন',
    premium: '💡 যেকোনো relevant document — guideline, sample, template upload করুন'
  };
  const uploadHintEl = document.getElementById('uploadDeptHint');
  if (uploadHintEl) uploadHintEl.textContent = uploadHints[d];

  // Auto-suggest citation style based on dept
  const citSel = document.getElementById('citationStyle');
  if (citSel && !citSel.value) {
    citSel.value = d === 'cse' ? 'IEEE' : 'APA';
  }

  // BBA-only fields
  toggleBBAFields();
  updateUrgencyCardPrices();
  updateCalc();
}

// ── Radio card ──
function selectRC(groupId, val) {
  document.querySelectorAll(`#${groupId} .rc`).forEach(r => r.classList.toggle('active', r.dataset[Object.keys(r.dataset)[0]] === val));
}

// ── Chapter toggle ──
function toggleChapter(el) {
  el.classList.toggle('active');
}

// ── Chapter dropdown ──
function syncChapterFromDropdown(val) {
  const wrap = document.getElementById('chapterCustomWrap');
  if (wrap) wrap.style.display = val === 'custom' ? 'block' : 'none';
}


// ── Custom Word Count toggle ──
function toggleCustomWordCount(wrapId, val) {
  const wrap = document.getElementById(wrapId);
  if (!wrap) return;
  wrap.style.display = val === 'custom' ? 'block' : 'none';
  if (val !== 'custom') {
    const inp = wrap.querySelector('input');
    if (inp) inp.value = '';
  }
}

// ── Get actual word count value (custom or selected) ──
function getWordCount(selectId, customInputId) {
  const sel = document.getElementById(selectId);
  if (!sel) return '';
  if (sel.value === 'custom') {
    return document.getElementById(customInputId)?.value.trim() || '';
  }
  return sel.value;
}

// ── Variable fields toggle (BBA — Survey/Mixed only) ──
function toggleVariableFields(method) {
  const wrap = document.getElementById('variableFields');
  if (!wrap) return;
  const show = method === 'survey' || method === 'mixed';
  wrap.style.display = show ? 'block' : 'none';
  if (!show) {
    document.getElementById('indepVar').value = '';
    document.getElementById('depVar').value   = '';
  }
}

// ── Project type (Engineering) ──
function selectProjectType(el) {
  document.querySelectorAll('#projectTypeCards .pc').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

// ── Addon toggle ──
function toggleAddon(key) {
  activeAddons[key] = !activeAddons[key];
  const item = document.getElementById('addon-' + key);
  if (item) item.classList.toggle('active', activeAddons[key]);
  ['', '-cse', '-premium'].forEach(suffix => {
    const chk = document.getElementById('ac-' + key + suffix);
    if (chk) chk.classList.toggle('addon-checked', activeAddons[key]);
  });
  updateCalc();
}

// ── Urgency (one-way: can upgrade, cannot downgrade) ──
const urgencyOrder = ['standard','urgent','express'];
function selectUrgency(u) {
  selectedUrgencyVal = u;
  document.querySelectorAll('.uc').forEach(c => {
    c.classList.toggle('active', c.dataset.u === u);
    c.style.opacity = '1';
    c.style.cursor  = 'pointer';
  });
  updateCalc();
}

// ── Selected pricing card ──
let selectedPricingCard = 'popular';

const pricingCardData = {
  bba: [
    { id:'basic',   title:'BBA Basic',    sub:'Assignment ও ছোট project',       standard:7000,  urgent:9100,  express:10500, features:['Research Proposal','Literature Review','APA Formatting','১ বার Free Revision','Plagiarism-Free'],               days:{ standard:'৭–১৪ দিন', urgent:'৪–৭ দিন', express:'১–৩ দিন' } },
    { id:'popular', title:'BBA Standard', sub:'Thesis ও research paper',         standard:10000, urgent:13000, express:15000, features:['Full Thesis Writing','Methodology','Data Analysis','২ বার Free Revision','Plagiarism Report'],                  days:{ standard:'৭–১৪ দিন', urgent:'৪–৭ দিন', express:'১–৩ দিন' } },
    { id:'premium', title:'BBA Premium',  sub:'Complex research & full support',  standard:null,  urgent:null,  express:null,  features:['End-to-end Support','SPSS / Data Analysis','Presentation Slides','Unlimited Revision','Priority Support'],    days:{ standard:'Custom',    urgent:'Custom',    express:'Custom'    } },
  ],
  cse: [
    { id:'basic',   title:'CSE Basic',    sub:'Documentation ও report',          standard:8000,  urgent:10400, express:12000, features:['Technical Documentation','UML / ER Diagram','IEEE Formatting','১ বার Free Revision','Plagiarism-Free'],        days:{ standard:'৭–১৪ দিন', urgent:'৪–৭ দিন', express:'১–৩ দিন' } },
    { id:'popular', title:'CSE Standard', sub:'Thesis ও software project',        standard:12000, urgent:15600, express:18000, features:['Full Thesis Writing','Source Code Explanation','System Analysis','২ বার Free Revision','Plagiarism Report'],  days:{ standard:'৭–১৪ দিন', urgent:'৪–৭ দিন', express:'১–৩ দিন' } },
    { id:'premium', title:'CSE Premium',  sub:'Complete project support',         standard:null,  urgent:null,  express:null,  features:['End-to-end Support','Software Project Report','Research Paper Writing','Unlimited Revision','Priority Support'], days:{ standard:'Custom', urgent:'Custom', express:'Custom' } },
  ],
  premium: [
    { id:'basic',   title:'Premium Basic',    sub:'ছোট custom project',   standard:null, urgent:null, express:null, features:['Custom Research','Flexible Scope','APA/IEEE Formatting','১ বার Free Revision','Plagiarism-Free'],            days:{ standard:'Custom', urgent:'Custom', express:'Custom' } },
    { id:'popular', title:'Premium Standard', sub:'মাঝারি custom project', standard:null, urgent:null, express:null, features:['Full Custom Writing','Methodology','Data Analysis','২ বার Free Revision','Plagiarism Report'],               days:{ standard:'Custom', urgent:'Custom', express:'Custom' } },
    { id:'premium', title:'Premium Advanced', sub:'Full custom support',   standard:null, urgent:null, express:null, features:['End-to-end Support','SPSS / Data Analysis','Presentation Slides','Unlimited Revision','Priority Support'], days:{ standard:'Custom', urgent:'Custom', express:'Custom' } },
  ]
};

// ── Pricing Calculator ──
const bbaRates  = { 5000:2500, 10000:5000, 15000:7500, 20000:10000 };
const cseRates  = { 5000:3500, 10000:7000, 15000:10500, 20000:14000 };
const urgMul    = { standard:1, urgent:1.2, express:1.5 };
const urgRevision = { standard:'৩টি free revision', urgent:'Unlimited revision', express:'Unlimited — until satisfaction' };
const urgDelivery = { standard:'৭–১৪ দিন', urgent:'৩–৭ দিন', express:'১–৩ দিন' };
const addonPrices = { spss:2000, slides:500, questionnaire:800, datacollection:1000, coverpage:100, figures:300 };

// ── Word count display update ──
function updateWcDisplay(val) {
  const n = parseInt(val);
  const pages = Math.round(n / 250);
  const bn = n.toLocaleString('bn-BD');
  document.getElementById('wcDisplay').textContent = `${bn} words — প্রায় ${pages} পাতা`;
}

function getSelectedWordCount() {
  const el = document.getElementById('wordCount');
  if (!el) return null;
  return el.value || null;
}

function calcBase(wc) {
  const n = parseInt(wc);
  if (!n) return null;
  if (selectedDept === 'bba') {
    return bbaRates[n] || Math.round(n * 0.5);
  }
  if (selectedDept === 'cse') {
    return cseRates[n] || Math.round(n * 0.7);
  }
  return null; // premium = custom
}

function updateCalc() {
  const wc   = getSelectedWordCount();
  const base = calcBase(wc);
  const mul  = urgMul[selectedUrgencyVal] || 1;
  const after = base ? Math.round(base * mul) : null;

  // base price
  const baseEl = document.getElementById('calc-base');
  if (baseEl) baseEl.textContent = base ? '৳' + base.toLocaleString() : (selectedDept==='premium'?'আলোচনা সাপেক্ষে':'Word count দিন');

  // page count (250 words = 1 page)
  const pagesEl = document.getElementById('calc-pages');
  if (pagesEl) {
    const pages = wc ? Math.round(parseInt(wc) / 250) : null;
    pagesEl.innerHTML = pages
      ? `প্রায় <strong>${pages}</strong> পাতা <span style="font-size:11px;color:rgba(255,255,255,0.35)">(250 words = 1 page)</span>`
      : `— পাতা <span style="font-size:11px;color:rgba(255,255,255,0.35)">(250 words = 1 page)</span>`;
  }

  // urgency
  const urgEl = document.getElementById('calc-urgency-val');
  const labels = { standard:'Standard', urgent:'Urgent (+২০%)', express:'Express (+৫০%)' };
  if (urgEl) urgEl.textContent = labels[selectedUrgencyVal];

  // addon rows
  let addonTotal = 0;
  let addonHTML  = '';
  Object.entries(addonPrices).forEach(([key, price]) => {
    if (activeAddons[key]) {
      addonTotal += price;
      addonHTML += `<div class="calc-row"><span class="calc-label">${addonData[key]?.label || key}</span><span class="calc-val">+৳${price.toLocaleString()}</span></div>`;
    }
  });
  const addonEl = document.getElementById('calc-addon-rows');
  if (addonEl) addonEl.innerHTML = addonHTML;

  // revision & delivery
  const revEl = document.getElementById('calc-revision');
  const delEl = document.getElementById('calc-delivery');
  if (revEl) revEl.textContent = urgRevision[selectedUrgencyVal];
  if (delEl) delEl.textContent = urgDelivery[selectedUrgencyVal];

  // total
  const totEl  = document.getElementById('calc-total');
  const noteEl = document.getElementById('calc-note');
  if (after) {
    const grand = after + addonTotal;
    if (totEl)  totEl.textContent  = '৳' + grand.toLocaleString() + '+';
    if (noteEl) noteEl.textContent = selectedUrgencyVal !== 'standard' ? 'Urgency charge included.' : '';
  } else {
    if (totEl)  totEl.textContent  = selectedDept === 'premium' ? 'আলোচনা সাপেক্ষে' : '—';
    if (noteEl) noteEl.textContent = selectedDept !== 'premium' ? 'Word count বেছে নিলে price দেখাবে' : '';
  }
}

// Keep compatibility
function updatePricingCards() { updateCalc(); }
function selectPricingCard(id) { }
function updateSelectButtons() { }

// ── File upload ──
function dragOver(e)  { e.preventDefault(); document.getElementById('uploadZone').classList.add('drag'); }
function dragLeave(e) { document.getElementById('uploadZone').classList.remove('drag'); }
function dropFile(e)  { e.preventDefault(); document.getElementById('uploadZone').classList.remove('drag'); addFiles(Array.from(e.dataTransfer.files)); }
function fileSelect(e){ addFiles(Array.from(e.target.files)); }
function addFiles(files) {
  files.forEach(f => { if (!uploadedFiles.find(x=>x.name===f.name)) uploadedFiles.push(f); });
  renderFiles();
}
function removeFile(name) { uploadedFiles = uploadedFiles.filter(f=>f.name!==name); renderFiles(); }
function renderFiles() {
  const list = document.getElementById('fileList');
  list.innerHTML = uploadedFiles.map(f => {
    const ext  = f.name.split('.').pop().toUpperCase();
    const icon = ext==='PDF'?'📄':ext==='DOCX'||ext==='DOC'?'📝':'🖼️';
    const size = f.size<1048576?(f.size/1024).toFixed(0)+' KB':(f.size/1048576).toFixed(1)+' MB';
    return `<div class="fi">
      <div class="fi-left"><span class="fi-icon">${icon}</span><div><div class="fi-name">${f.name}</div><div class="fi-size">${size}</div></div></div>
      <button class="fi-rm" onclick="removeFile('${f.name}')">✕</button>
    </div>`;
  }).join('');
}

// ── Progress ──
function updateProgress() {
  const fill = ((step-1)/(total-1))*100;
  document.getElementById('pFill').style.width = fill+'%';
  const bn = ['১','২','৩','৪','৫'];
  document.getElementById('stepLabel').textContent = bn[step-1];
  for (let i=1;i<=total;i++) {
    const sn = document.getElementById('sn'+i);
    const sc = document.getElementById('sc'+i);
    sn.classList.remove('active','done');
    if (i<step) { sn.classList.add('done'); sc.textContent='✓'; }
    else if (i===step) { sn.classList.add('active'); sc.textContent=i; }
    else sc.textContent=i;
  }
  document.getElementById('btnPrev').style.display = step>1?'flex':'none';
  const btn = document.getElementById('btnNext');
  if (step===total) {
    btn.innerHTML='💳 Pay Now';
    btn.classList.add('green');
  } else {
    btn.innerHTML=`পরবর্তী <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
    btn.classList.remove('green');
  }
}

// ── Validation ──
function gv(id) { return document.getElementById(id)?.value.trim()||''; }
function se(id,msg) {
  const e=document.getElementById('err-'+id); if(e) e.textContent=msg;
  const i=document.getElementById(id); if(i) i.classList.add('invalid');
}
function ce(id) {
  const e=document.getElementById('err-'+id); if(e) e.textContent='';
  const i=document.getElementById(id); if(i) i.classList.remove('invalid');
}
function validate(s) {
  let ok=true;
  if (s===1) {
    ['thesisTitle','university'].forEach(id => { ce(id); if(!gv(id)){se(id, id==='thesisTitle'?'Thesis শিরোনাম দিন':'বিশ্ববিদ্যালয়ের নাম দিন'); ok=false; }});

    // Department validation
    ce('department');
    if (selectedDept === 'premium') {
      const dText = document.getElementById('departmentText').value.trim();
      if (!dText) { se('department','বিভাগ লিখুন'); ok=false; }
    } else {
      if (!gv('department')) { se('department','বিভাগ বেছে নিন'); ok=false; }
    }

    // Research area: required for honours & engineering (dropdown), special request (text)
    ce('thesisTopic');
    if (selectedDept === 'premium') {
      const raText = document.getElementById('researchAreaText');
      if (!raText || !raText.value.trim()) { se('thesisTopic','Research Area লিখুন'); ok=false; }
    } else {
      if (!gv('thesisTopic')) { se('thesisTopic','Research Area বেছে নিন'); ok=false; }
    }
  }
  if (s===2) {
    if (selectedDept === 'bba') {
      // Variable fields only required if survey or mixed method selected
      const method = document.querySelector('#methodCards .rc.active')?.dataset.m;
      if (method === 'survey' || method === 'mixed') {
        [['indepVar','গবেষণার বিষয় লিখুন'],['depVar','প্রভাবের বিষয় লিখুন']
        ].forEach(([id,msg])=>{ ce(id); if(!gv(id)){se(id,msg);ok=false;} });
      }
    } else if (selectedDept === 'premium') {
      ce('specialInstructionsPremium');
      if(!gv('specialInstructionsPremium')){se('specialInstructionsPremium','কাজের বিবরণ লিখুন');ok=false;}
    }
  }
  if (s===3) {
    ce('deadlineDate'); if(!gv('deadlineDate')){se('deadlineDate','Deadline date নির্বাচন করুন');ok=false;}
    // Word Count + Citation now in Step 3
    ce('wordCount');
    const wcVal = document.getElementById('wordCount')?.value;
    if (!wcVal) { se('wordCount','Word count সেট করুন'); ok=false; }
    ce('citationStyle'); if(!gv('citationStyle')){se('citationStyle','Citation style বেছে নিন');ok=false;}
  }
  if (s===5) {
    const te=document.getElementById('err-terms');
    if (!document.getElementById('termsChk').checked) { te.textContent='Terms সম্মত হতে হবে'; ok=false; }
    else te.textContent='';
  }
  return ok;
}

// ── Build Review ──
function buildReview() {
  const chSel = document.getElementById('chapterSelect');
  const chapterVal = chSel.value === 'custom' ? (gv('chapterCustom') || 'Custom') : (chSel.options[chSel.selectedIndex]?.text || '—');
  const method = document.querySelector('#methodCards .rc.active')?.dataset.m || document.querySelector('#engMethodCards .rc.active')?.dataset.et || '—';
  const dept = selectedDept === 'premium' ? document.getElementById('departmentText')?.value.trim() : gv('department');
  const researchArea = selectedDept === 'premium' ? (document.getElementById('researchAreaText')?.value.trim() || '—') : gv('thesisTopic');
  const wc = getSelectedWordCount();
  const pages = wc ? Math.round(parseInt(wc) / 250) : null;
  const urgBadge = { standard:'Standard', urgent:'Urgent +২০%', express:'Express +৫০%' }[selectedUrgencyVal];
  const urgColor = { standard:'green', urgent:'amber', express:'red' }[selectedUrgencyVal];

  const row = (label, val, colorClass) =>
    '<div class="rv-row">'
    + '<span class="rv-label">' + label + '</span>'
    + '<span class="rv-val' + (colorClass ? ' ' + colorClass : '') + '">' + val + '</span>'
    + '</div>';

  const section = (icon, title, rows) =>
    '<div class="rv-section">'
    + '<div class="rv-sec-head"><i class="ti ti-' + icon + '" aria-hidden="true"></i><span>' + title + '</span></div>'
    + rows
    + '</div>';

  document.getElementById('reviewGrid').innerHTML =
    section('file-text', 'Thesis Information',
      row('Thesis শিরোনাম', gv('thesisTitle'))
      + row('Package', pkgData[selectedDept].label, 'clr-blue')
      + row('বিভাগ', dept)
      + row('বিশ্ববিদ্যালয়', gv('university'))
    )
    + section('microscope', 'Research Details',
      row('Research Area', researchArea)
      + row('Chapter Scope', chapterVal)
      + row('Methodology', method.charAt(0).toUpperCase() + method.slice(1))
      + row('Citation Style', gv('citationStyle'))
      + (selectedDept === 'bba' && gv('indepVar') ? row('গবেষণার বিষয়', gv('indepVar')) : '')
      + (selectedDept === 'bba' && gv('depVar') ? row('প্রভাবের বিষয়', gv('depVar')) : '')
    )
    + section('calendar-time', 'Timeline',
      row('Submission Deadline', gv('deadlineDate'))
      + row('Word Count', (wc ? parseInt(wc).toLocaleString() + ' words' : '—') + (pages ? ' — প্রায় ' + pages + ' পাতা' : ''))
      + row('Urgency Level', '<span class="rv-badge ' + urgColor + '">' + urgBadge + '</span>')
    )
    + (uploadedFiles.length ? section('paperclip', 'Uploaded Files', row('Files', uploadedFiles.map(f => f.name).join(', '))) : '');

  // Price Receipt
  const base  = calcBase(wc);
  const mul   = urgMul[selectedUrgencyVal] || 1;
  const after = base ? Math.round(base * mul) : null;
  let addonTotal = 0, addonLines = '';
  Object.entries(addonPrices).forEach(([key, price]) => {
    if (activeAddons[key]) {
      addonTotal += price;
      addonLines += '<div class="pr-row addon"><span class="pr-row-label">' + (addonData[key]?.label || key) + '</span><span class="pr-row-val">+৳' + price.toLocaleString() + '</span></div>';
    }
  });
  const grand = after ? after + addonTotal : null;
  discountAmount = calcDiscount(grand);
  const finalTotal = grand ? grand - discountAmount : null;
  const urgLabel = { standard:'Standard', urgent:'Urgent (+২০%)', express:'Express (+৫০%)' }[selectedUrgencyVal];

  document.getElementById('priceBox').innerHTML =
    '<div class="rv-sec-head" style="padding:10px 16px;background:var(--glass2);border-bottom:0.5px solid var(--border)">'
    + '<i class="ti ti-receipt" aria-hidden="true"></i><span>মূল্য বিবরণী</span>'
    + '<span style="margin-left:auto;font-size:11px;color:var(--muted)">অনুমানিত</span>'
    + '</div>'
    + '<div class="pr-row"><span class="pr-row-label">Base Price — ' + pkgData[selectedDept].label.replace(/[📚⚙✨]\s?/g,'') + '</span><span class="pr-row-val">' + (base ? '৳' + base.toLocaleString() : '—') + '</span></div>'
    + (selectedUrgencyVal !== 'standard' && after && base ? '<div class="pr-row"><span class="pr-row-label">Urgency — ' + urgLabel + '</span><span class="pr-row-val clr-amber">+৳' + (after - base).toLocaleString() + '</span></div>' : '')
    + '<div class="pr-row free"><span class="pr-row-label">Plagiarism Check</span><span class="pr-row-val clr-green">FREE</span></div>'
    + addonLines
    + (discountAmount > 0 ? '<div class="pr-row"><span class="pr-row-label">🎟️ Coupon (' + appliedCoupon + ')</span><span class="pr-row-val clr-green">−৳' + discountAmount.toLocaleString() + '</span></div>' : '')
    + '<div class="pr-total"><span class="pr-total-label">মোট অনুমানিত মূল্য</span><span class="pr-total-val">' + (finalTotal ? '৳' + finalTotal.toLocaleString() + '+' : 'আলোচনা সাপেক্ষে') + '</span></div>';
}

// ── Coupon System ──
const COUPONS = {
  'SCRIPTORA10': { type:'percent', value:10, label:'১০% ছাড়' },
  'WELCOME15':   { type:'percent', value:15, label:'১৫% ছাড়' },
  'FLAT500':     { type:'flat',    value:500, label:'৳৫০০ ছাড়' },
  'THESIS20':    { type:'percent', value:20, label:'২০% ছাড়' },
};
let appliedCoupon = null;
let discountAmount = 0;

function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  const btn  = document.getElementById('couponApplyBtn');
  if (!code) { showCouponMsg('Coupon code লিখুন', 'error'); return; }
  if (appliedCoupon && code === appliedCoupon) { removeCoupon(); return; }
  const coupon = COUPONS[code];
  if (!coupon) { showCouponMsg('Invalid coupon code', 'error'); appliedCoupon = null; discountAmount = 0; buildReview(); return; }
  appliedCoupon = code;
  btn.textContent = 'Remove';
  btn.classList.add('remove');
  buildReview();
  showCouponMsg('✓ ' + coupon.label + ' সফলভাবে apply হয়েছে!', 'success');
}
function removeCoupon() {
  appliedCoupon = null; discountAmount = 0;
  document.getElementById('couponInput').value = '';
  const btn = document.getElementById('couponApplyBtn');
  btn.textContent = 'Apply'; btn.classList.remove('remove');
  showCouponMsg('', ''); buildReview();
}
function showCouponMsg(text, type) {
  const el = document.getElementById('couponMsg');
  if (!el) return; el.textContent = text; el.className = 'coupon-msg ' + type;
}
function calcDiscount(grand) {
  if (!appliedCoupon || !grand) return 0;
  const coupon = COUPONS[appliedCoupon];
  if (!coupon) return 0;
  if (coupon.type === 'percent') return Math.round(grand * coupon.value / 100);
  if (coupon.type === 'flat')    return Math.min(coupon.value, grand);
  return 0;
}

// ── BBA fields show/hide ──
function toggleBBAFields() {
  const show = selectedDept === 'bba';
  const el = document.getElementById('bbaFields');
  if (el) el.style.display = show ? 'block' : 'none';
}

// ── Next/Prev ──
function jumpToStep(target) {
  // Only allow jumping to completed steps or current step
  if (target >= step) return;
  document.getElementById('p'+step).classList.remove('active');
  step = target;
  const tp = document.getElementById('p'+step);
  tp.style.animation = 'slideInBk .3s ease';
  tp.classList.add('active');
  updateProgress();
  document.querySelector('.modal-body').scrollTop = 0;
}

async function nextStep() {
  if (step===total) {
    if (!validate(step)) return;

    // Login check — orders.client_id লাগবে, লগইন ছাড়া order করা যাবে না
    const client_id = localStorage.getItem('scriptora_client_id');
    if (!client_id) {
      window.location.href = '../Login page/login.html';
      return;
    }

    // Save order data for payment page
    const wc = getSelectedWordCount();
    const base = calcBase(wc);
    const mul  = urgMul[selectedUrgencyVal] || 1;
    const after = base ? Math.round(base * mul) : null;
    let addonTotal = 0;
    Object.entries(addonPrices).forEach(([k,p]) => { if (activeAddons[k]) addonTotal += p; });
    const grand = after ? after + addonTotal : null;
    const finalTotal = grand ? grand - discountAmount : null;
    const pages = wc ? Math.round(parseInt(wc) / 250) : null;

    // Collect active addons labels
    const addonLabels = Object.entries(activeAddons)
      .filter(([k, v]) => v && addonData[k])
      .map(([k]) => addonData[k].label);

    // Research area
    const researchArea = selectedDept === 'premium'
      ? (document.getElementById('researchAreaText')?.value.trim() || '—')
      : (document.getElementById('thesisTopic')?.options?.[document.getElementById('thesisTopic')?.selectedIndex]?.text || document.getElementById('thesisTopic')?.value || '—');

    const dept = selectedDept === 'premium'
      ? (document.getElementById('departmentText')?.value.trim() || '—')
      : (document.getElementById('department')?.value || '—');

    const titleVal      = document.getElementById('thesisTitle')?.value.trim() || '';
    const universityVal = document.getElementById('university')?.value.trim() || '';
    const packageVal    = pkgData[selectedDept]?.label || '';
    const citationVal   = document.getElementById('citationStyle')?.value || '—';
    const urgencyLabel  = { standard:'Standard', urgent:'Urgent +২০%', express:'Express +৫০%' }[selectedUrgencyVal];
    const deadlineVal   = document.getElementById('deadlineDate')?.value || null;
    const totalVal      = finalTotal || grand || 0;
    const advanceVal    = Math.round(totalVal / 2);
    const dueVal        = totalVal - advanceVal;
    const pagesVal      = pages ? pages + ' পাতা (~' + wc + ' words)' : '—';
    const orderNumber   = 'SCR-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);

    if (!deadlineVal) { se('deadlineDate','Deadline date নির্বাচন করুন'); return; }

    // Button loading state
    const btn = document.getElementById('btnNext');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Order করা হচ্ছে...'; }

    // ── Real Supabase insert — orders table এর actual column অনুযায়ী ──
    const { data: orderRow, error } = await window.scriptoraSupabase
      .from('orders')
      .insert({
        client_id:    client_id,
        order_number: orderNumber,
        title:        titleVal,
        package:      packageVal,
        pages:        pagesVal,
        citation:     citationVal,
        department:   dept,
        university:   universityVal,
        total_price:  totalVal,
        advance_paid: 0,
        status:       'pending',
        payment_status: 'unpaid',
        deadline:     deadlineVal,
        order_date:   new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      if (btn) { btn.disabled = false; btn.innerHTML = '💳 Pay Now'; }
      alert('Order সেভ করতে সমস্যা হয়েছে: ' + error.message);
      return;
    }

    // sessionStorage — UI display এর জন্য (পরবর্তী page গুলোতে দেখানোর জন্য, এগুলো DB column না)
    sessionStorage.setItem('scriptora_order', JSON.stringify({
      orderId:     orderRow.id,           // real UUID — payments.order_id এ যাবে
      orderNumber: orderRow.order_number, // human-readable, badge এ দেখানোর জন্য
      title:    titleVal,
      dept:     dept,
      university: universityVal,
      pkg:      packageVal,
      research: researchArea,
      pages:    pagesVal,
      citation: citationVal,
      urgency:  urgencyLabel,
      deadline: deadlineVal,
      addons:   addonLabels,
      total:    totalVal,
      advance:  advanceVal,
      due:      dueVal,
      coupon:   appliedCoupon || null,
      discount: discountAmount || 0
    }));
    window.location.href = '../Payment page/payment.html';
    return;
  }
  if (!validate(step)) return;
  if (step===total-1) buildReview();

  document.getElementById('p'+step).classList.remove('active');
  step++;
  if (step===2) toggleBBAFields();
  const np = document.getElementById('p'+step);
  np.style.animation='slideIn .3s ease';
  np.classList.add('active');
  updateProgress();
  document.querySelector('.modal-body').scrollTop=0;
}

function prevStep() {
  if (step===1) return;
  document.getElementById('p'+step).classList.remove('active');
  step--;
  const pp = document.getElementById('p'+step);
  pp.style.animation='slideInBk .3s ease';
  pp.classList.add('active');
  updateProgress();
  document.querySelector('.modal-body').scrollTop=0;
}

// ════════════════════════════════════════════════════
// SERVICE-AWARE ORDER FORM
// Reads URL params sent by pricing-calculator.js and
// customises the order form for each of the 15 services.
// ════════════════════════════════════════════════════

const SERVICE_CONFIG = {
  // step1Heading : replaces "Academic Details" heading
  // step1Desc    : replaces subtitle under heading
  // navLabel     : replaces the nav pill text
  // step2Desc    : replaces Step 2 subtitle
  // uploadHint   : shown in the file upload zone (Step 4)
  // citationAuto : citation style to pre-select (optional)

  "assignment-writing": {
    navLabel:    "📝 Assignment Writing",
    step1Heading:"Assignment Details",
    step1Desc:   "আপনার assignment-এর topic, university ও guidelines দিন",
    step2Desc:   "Assignment-এর scope ও special requirements জানান",
    uploadHint:  "Assignment brief, reference list, বা instructor guideline আপলোড করুন"
  },
  "presentation-slides": {
    navLabel:    "🖥️ Presentation Slides",
    step1Heading:"Presentation Details",
    step1Desc:   "প্রেজেন্টেশনের topic ও design preference জানান",
    step2Desc:   "Slide content ও structure সম্পর্কে বিস্তারিত দিন",
    uploadHint:  "Content file, notes, বা reference slides আপলোড করুন"
  },
  "proofreading": {
    navLabel:    "🔍 Proofreading",
    step1Heading:"Proofreading Details",
    step1Desc:   "কোন document proofread করতে চান তা জানান",
    step2Desc:   "Tone, style এবং specific requirements বলুন",
    uploadHint:  "Proofread করার document এখানে আপলোড করুন (DOCX/PDF)"
  },
  "apa-mla-formatting": {
    navLabel:    "📑 APA/MLA Formatting",
    step1Heading:"Formatting Details",
    step1Desc:   "কোন citation style চান এবং document-এর ধরন জানান",
    step2Desc:   "Formatting requirements ও special instructions দিন",
    uploadHint:  "Format করার document আপলোড করুন",
    citationAuto:"APA"
  },
  "plagiarism-reduction": {
    navLabel:    "🛡️ Plagiarism Reduction",
    step1Heading:"Plagiarism Reduction Details",
    step1Desc:   "Document জমা দিন — আমরা similarity কমিয়ে দেব",
    step2Desc:   "Target similarity % ও special requirements জানান",
    uploadHint:  "Plagiarism কমাতে হবে এমন document আপলোড করুন"
  },
  "spss-analysis": {
    navLabel:    "📊 SPSS Analysis",
    step1Heading:"SPSS Analysis Details",
    step1Desc:   "আপনার dataset ও analysis requirements জানান",
    step2Desc:   "Variables, hypothesis ও test type বিস্তারিত দিন",
    uploadHint:  "Dataset বা Excel file আপলোড করুন (.xlsx/.csv)"
  },
  "research-proposal": {
    navLabel:    "🔎 Research Proposal",
    step1Heading:"Research Proposal Details",
    step1Desc:   "আপনার research topic ও supervisor-এর requirements জানান",
    step2Desc:   "Methodology ও scope বিস্তারিত দিন",
    uploadHint:  "Supervisor guidelines বা reference proposal আপলোড করুন"
  },
  "case-study-report": {
    navLabel:    "📁 Case Study Report",
    step1Heading:"Case Study Details",
    step1Desc:   "Case study-র topic ও analysis framework জানান",
    step2Desc:   "Analysis scope ও requirements বিস্তারিত দিন",
    uploadHint:  "Reference material বা case data আপলোড করুন"
  },
  "cv-writing": {
    navLabel:    "📄 CV Writing",
    step1Heading:"CV Details",
    step1Desc:   "আপনার career লক্ষ্য ও background জানান",
    step2Desc:   "Education, experience ও skills বিস্তারিত দিন",
    uploadHint:  "পুরনো CV বা reference format আপলোড করুন (optional)"
  },
  "ai-plagiarism-remover": {
    navLabel:    "🧠 AI Plagiarism Remover",
    step1Heading:"AI Content Details",
    step1Desc:   "AI-generated text জমা দিন — human-written করে দেওয়া হবে",
    step2Desc:   "Tone, style ও target requirements বলুন",
    uploadHint:  "AI-generated document আপলোড করুন (DOCX/PDF/TXT)"
  },
  "sop-writing": {
    navLabel:    "📜 SOP Writing",
    step1Heading:"SOP Details",
    step1Desc:   "Target university, program ও background জানান",
    step2Desc:   "Motivation, goals ও special requirements দিন",
    uploadHint:  "University guideline বা sample SOP আপলোড করুন (optional)"
  },
  "lab-report-writing": {
    navLabel:    "🧪 Lab Report Writing",
    step1Heading:"Lab Report Details",
    step1Desc:   "Experiment-এর বিস্তারিত ও data জানান",
    step2Desc:   "Lab data, results ও instructor requirements দিন",
    uploadHint:  "Lab data sheet বা experiment notes আপলোড করুন"
  },
  "project-assignment-planning": {
    navLabel:    "🧭 Project Planning",
    step1Heading:"Project Details",
    step1Desc:   "Project বা assignment-এর topic ও scope জানান",
    step2Desc:   "Requirements ও deliverables বিস্তারিত দিন",
    uploadHint:  "Project brief বা assignment guidelines আপলোড করুন"
  },
  "ai-detection-report": {
    navLabel:    "🕵️ AI Detection Report",
    step1Heading:"AI Detection Details",
    step1Desc:   "কোন document check করতে চান তা জমা দিন",
    step2Desc:   "Detection scope ও requirements জানান",
    uploadHint:  "Check করার document আপলোড করুন (DOCX/PDF)"
  },
  "research-article-writing": {
    navLabel:    "📰 Research Article / Journal Paper",
    step1Heading:"Research Article Details",
    step1Desc:   "আপনার research topic, target journal ও requirements জানান",
    step2Desc:   "Methodology, scope ও journal guidelines দিন",
    uploadHint:  "Reference papers বা data file আপলোড করুন (optional)"
  }
};

function initServiceAware() {
  const params   = new URLSearchParams(window.location.search);
  const serviceId = params.get("service");
  const price     = parseInt(params.get("price") || "0", 10);
  const urgency   = params.get("urgency")   || "normal";
  const qty       = parseInt(params.get("qty") || "0", 10);
  const unit      = params.get("unit")      || "";
  const tier      = params.get("tier")      || "";

  const cfg = serviceId ? SERVICE_CONFIG[serviceId] : null;

  // ── 1. Nav pill label ──
  if (cfg) {
    const navPkg = document.getElementById("navPkg");
    if (navPkg) navPkg.textContent = cfg.navLabel;
  }

  // ── 2. Step 1 heading + subtitle ──
  if (cfg) {
    const h2 = document.querySelector("#p1 .panel-head h2");
    const p  = document.querySelector("#p1 .panel-head p");
    if (h2) h2.textContent = cfg.step1Heading;
    if (p)  p.textContent  = cfg.step1Desc;
  }

  // ── 3. Step 2 subtitle ──
  if (cfg) {
    const p2desc = document.getElementById("p2Desc");
    if (p2desc) p2desc.textContent = cfg.step2Desc;
  }

  // ── 4. File upload hint (Step 4) ──
  if (cfg) {
    const hint = document.getElementById("uploadDeptHint");
    if (hint) hint.textContent = cfg.uploadHint || "";
  }

  // ── 5. Pre-select citation style if specified ──
  if (cfg && cfg.citationAuto) {
    const sel = document.getElementById("citationStyle");
    if (sel) {
      [...sel.options].forEach(o => {
        if (o.text === cfg.citationAuto) o.selected = true;
      });
    }
  }

  // ── 6. Pre-fill price from pricing calculator ──
  if (price > 0) {
    // override pkgData pricing with the exact price from the card
    // store in a global so updateCalc() can use it
    window._svcBasePrice = price;

    // show qty/tier info in the calc note
    let qtyNote = "";
    if (qty && unit) qtyNote = ` · ${qty.toLocaleString("en-US")} ${unit}`;
    else if (tier)   qtyNote = ` · ${tier} tier`;
    const note = document.getElementById("calc-note");
    if (note) note.textContent = `Pricing Calculator থেকে নির্বাচিত মূল্য${qtyNote}`;

    // patch updateCalc to use service price
    const _origUpdateCalc = window.updateCalc;
    window.updateCalc = function() {
      if (window._svcBasePrice) {
        const urgencyMap   = { standard: 1, urgent: 1.2, express: 1.5 };
        const addOnTotal   = Object.entries(activeAddons)
          .filter(([,v]) => v)
          .reduce((sum, [k]) => {
            const priceMap = { slides: 500, datacollection: 1000, coverpage: 100, figures: 300 };
            return sum + (priceMap[k] || 0);
          }, 0);
        const multiplier   = urgencyMap[selectedUrgencyVal] || 1;
        const total        = Math.round(window._svcBasePrice * multiplier) + addOnTotal;

        const baseEl   = document.getElementById("calc-base");
        const totalEl  = document.getElementById("calc-total");
        const pagesEl  = document.getElementById("calc-pages");
        const urgEl    = document.getElementById("calc-urgency-val");

        if (baseEl)  baseEl.textContent  = "৳" + window._svcBasePrice.toLocaleString("en-US");
        if (pagesEl) pagesEl.textContent = qty ? `${Math.ceil(qty / 250)} পাতা (আনুমানিক)` : "—";
        if (urgEl)   urgEl.textContent   = selectedUrgencyVal.charAt(0).toUpperCase() + selectedUrgencyVal.slice(1);
        if (totalEl) totalEl.textContent = "৳" + total.toLocaleString("en-US");

        // update addon rows
        const addonRows = document.getElementById("calc-addon-rows");
        if (addonRows) {
          addonRows.innerHTML = Object.entries(activeAddons)
            .filter(([,v]) => v)
            .map(([k]) => {
              const labels = { slides:"Presentation Slides", datacollection:"Data Collection", coverpage:"Custom Cover Page", figures:"Figures & Charts" };
              const prices = { slides:500, datacollection:1000, coverpage:100, figures:300 };
              return `<div class="calc-row"><span class="calc-label">${labels[k]||k}</span><span class="calc-val">+৳${(prices[k]||0).toLocaleString("en-US")}</span></div>`;
            }).join("");
        }
      } else {
        _origUpdateCalc && _origUpdateCalc();
      }
    };
  }

  // ── 7. Pre-select urgency from card selection ──
  const urgencyMap = { normal: "standard", urgent: "urgent", critical: "express" };
  const mappedUrgency = urgencyMap[urgency] || "standard";
  selectUrgency(mappedUrgency);

  // trigger recalc with new base price
  updateCalc();
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  switchDept('bba');
  toggleVariableFields('survey');
  updateWcDisplay(5000);
  updateUrgencyCardPrices();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('deadlineDate').min = today;
  updateProgress();
  initServiceAware(); // must come after base init so updateCalc can be patched
});