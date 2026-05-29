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
    btn.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg> Confirm Order`;
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
  // Chapter from dropdown
  const chSel = document.getElementById('chapterSelect');
  const chOpt = chSel.options[chSel.selectedIndex];
  const chapterVal = chSel.value === 'custom'
    ? (gv('chapterCustom') || 'Custom')
    : (chOpt.text || '—');

  const rt = document.querySelector('#researchTypeCards .rc.active')?.dataset.rt || '—';
  const method = document.querySelector('#methodCards .rc.active')?.dataset.m || '—';

  document.getElementById('reviewGrid').innerHTML = `
    <div class="rv full"><div class="rv-label">Thesis শিরোনাম</div><div class="rv-val">${gv('thesisTitle')}</div></div>
    <div class="rv"><div class="rv-label">Topic</div><div class="rv-val">${gv('thesisTopic')}</div></div>
    <div class="rv"><div class="rv-label">Package</div><div class="rv-val">${pkgData[selectedDept].label}</div></div>
    <div class="rv"><div class="rv-label">বিভাগ</div><div class="rv-val">${selectedDept === 'premium' ? document.getElementById('departmentText').value.trim() : gv('department')}</div></div>
    <div class="rv"><div class="rv-label">বিশ্ববিদ্যালয়</div><div class="rv-val">${gv('university')}</div></div>
    <div class="rv"><div class="rv-label">Chapter Scope</div><div class="rv-val">${chapterVal}</div></div>
    <div class="rv"><div class="rv-label">Research Area</div><div class="rv-val">${selectedDept === 'premium' ? (document.getElementById('researchAreaText')?.value.trim() || '—') : gv('thesisTopic')}</div></div>
    <div class="rv"><div class="rv-label">Word Count</div><div class="rv-val">${getWordCount('wordCount','wordCountCustom') || getWordCount('wordCountCSE','wordCountCSECustom') || getWordCount('wordCountPremium','wordCountPremiumCustom')} words</div></div>
    <div class="rv"><div class="rv-label">Citation Style</div><div class="rv-val">${gv('citationStyle')}</div></div>
    ${selectedDept==='bba'?`<div class="rv"><div class="rv-label">Independent Variable</div><div class="rv-val">${gv('indepVar')}</div></div><div class="rv"><div class="rv-label">Dependent Variable</div><div class="rv-val">${gv('depVar')}</div></div><div class="rv"><div class="rv-label">Methodology</div><div class="rv-val" style="text-transform:capitalize">${method}</div></div>`:''}
    <div class="rv"><div class="rv-label">Deadline</div><div class="rv-val">${gv('deadlineDate')}</div></div>
    <div class="rv"><div class="rv-label">Urgency</div><div class="rv-val" style="text-transform:capitalize">${selectedUrgencyVal}</div></div>
    ${uploadedFiles.length?`<div class="rv full"><div class="rv-label">Uploaded Files</div><div class="rv-val">${uploadedFiles.map(f=>f.name).join(', ')}</div></div>`:''}
  `;

  // ── Price Summary ──
  const wc   = getSelectedWordCount();
  const base = calcBase(wc);
  const mul  = urgMul[selectedUrgencyVal] || 1;
  const after = base ? Math.round(base * mul) : null;
  let addonTotal = 0;
  let addonLines = '';
  Object.entries(addonPrices).forEach(([key, price]) => {
    if (activeAddons[key]) {
      addonTotal += price;
      addonLines += `<div class="pr"><span class="pr-label">${addonData[key]?.label || key}</span><span class="pr-amt">+৳${price.toLocaleString()}</span></div>`;
    }
  });
  const grand = after ? after + addonTotal : null;
  const urgLabel = { standard:'Standard', urgent:'Urgent (+২০%)', express:'Express (+৫০%)' }[selectedUrgencyVal];
  document.getElementById('priceBox').innerHTML = `
    <div class="receipt-head">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span class="receipt-head-title">মূল্য বিবরণী</span>
    </div>
    <div class="receipt-body">
      <div class="pr"><div class="pr-label"><span>Base Price</span><span class="pr-sub">${wc} words</span></div><span class="pr-amt">${base?'৳'+base.toLocaleString():'—'}</span></div>
      ${selectedUrgencyVal!=='standard'&&after&&base?`<div class="pr"><span class="pr-label">Delivery (${urgLabel})</span><span class="pr-amt">+৳${(after-base).toLocaleString()}</span></div>`:''}
      ${addonLines}
      <div class="pr"><span class="pr-label">Plagiarism Check</span><span class="pr-amt free-tag">FREE</span></div>
      <div class="pr"><span class="pr-label">Formatting</span><span class="pr-amt free-tag">FREE</span></div>
      <div class="pr"><span class="pr-label">Revisions</span><span class="pr-amt">${urgRevision[selectedUrgencyVal]}</span></div>
    </div>
    <div class="pr total"><span>মোট মূল্য</span><span>${grand?'৳'+grand.toLocaleString()+'+':'আলোচনা সাপেক্ষে'}</span></div>
  `;
}

// ── BBA fields show/hide ──
function toggleBBAFields() {
  const show = selectedDept === 'bba';
  const el = document.getElementById('bbaFields');
  if (el) el.style.display = show ? 'block' : 'none';
}

// ── Next/Prev ──
function nextStep() {
  if (step===total) {
    if (!validate(step)) return;
    document.getElementById('overlay').classList.add('show');
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

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  switchDept('bba');
  toggleVariableFields('survey');
  updateWcDisplay(5000);
  updateUrgencyCardPrices();
  updateCalc();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('deadlineDate').min = today;
  updateProgress();
});