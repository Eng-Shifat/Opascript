/* ================================================================
   SCRIPTORA — pricing.js
   Config: pricing-config.js থেকে সব data আসে।
   এই ফাইলে শুধু UI logic আছে — price পরিবর্তন করতে
   pricing-config.js এ যান।
   ================================================================ */

/* ── Thesis state ── */
const THC = window.SCRIPTORA_CONFIG.thesis;
let _thesisWords    = THC.minWords;
let _thesisDl       = THC.defaultDeadline;
let _thesisType     = THC.defaultType;

/* ── FAQ Accordion ── */
function toggleFaq(item) {
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.pr-faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* ── Thesis Price Calculator ── */
function calcThesisPrice() {
  const base  = _thesisWords * THC.pricePerWord[_thesisType];
  const total = Math.round(base * THC.deadlineMultiplier[_thesisDl]);

  /* HTML এ id="thesisPrice" */
  const priceEl = document.getElementById('thesisPrice');
  if (priceEl) priceEl.textContent = total.toLocaleString('en-IN');
}

function changeThesisWords(delta) {
  _thesisWords = Math.max(THC.minWords, _thesisWords + THC.wordStep * delta);
  window._thesisWords = _thesisWords;
  const el = document.getElementById('thesisWords');
  if (el) el.textContent = _thesisWords.toLocaleString('en-IN') + ' words';
  calcThesisPrice();
}

function setThesisDl(btn, type) {
  _thesisDl = type;
  window._thesisDl    = _thesisDl;
  window._thesisWords = _thesisWords;
  document.querySelectorAll('.tc-dl').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const del = document.getElementById('thesisDelivery');
  if (del) del.textContent = THC.deliveryText[type];
  /* Sync mobile badge */
  const badge = document.getElementById('thesisPriceBadge');
  if (badge) badge.textContent = THC.deliveryText[type];
  calcThesisPrice();
}

/* Thesis type select change */
function onThesisTypeChange() {
  const sel = document.getElementById('thesisType');
  if (sel) _thesisType = sel.value;
  calcThesisPrice();
}

/* ── Scroll Animation ── */
function initScrollAnim() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.pr-card, .pr-add-item, .osc-card, .pr-faq-item')
    .forEach(el => observer.observe(el));
}

/* ── DOMContentLoaded ── */
document.addEventListener('DOMContentLoaded', () => {
  /* Init thesis type select listener */
  const sel = document.getElementById('thesisType');
  if (sel) sel.addEventListener('change', onThesisTypeChange);

  calcThesisPrice();
  initScrollAnim();
});

/* Global expose (HTML onclick attributes) */
window.toggleFaq        = toggleFaq;
window.calcThesisPrice  = calcThesisPrice;
window.changeThesisWords = changeThesisWords;
window.setThesisDl      = setThesisDl;
