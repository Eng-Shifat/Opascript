/* ====================
   SCRIPTORA — pricing.js
   ==================== */

/* ── FAQ ACCORDION ── */
function toggleFaq(item) {
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.pr-faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* ── SCROLL ANIMATION ── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.pr-card, .pr-add-item, .pr-trust-card, .pr-faq-item')
  .forEach(el => observer.observe(el));

/* ── THESIS PRICE CALCULATOR ── */
let thesisWords = 5000;
let thesisDeadlineType = 'standard';

const thesisPricePerWord = { full: 1.0, chapter: 1.2, proposal: 1.5 };
const thesisDeadlineMultiplier = { standard: 1, express: 1.3, rush: 1.6 };
const thesisDeliveryText = {
  standard: '10 – 15 Days',
  express: '5 – 7 Days',
  rush: '2 – 3 Days'
};

function calcThesisPrice() {
  const type = document.getElementById('thesisType')?.value || 'full';
  const base = thesisWords * thesisPricePerWord[type];
  const total = Math.round(base * thesisDeadlineMultiplier[thesisDeadlineType]);
  const el = document.getElementById('thesisTotalPrice');
  if (el) el.textContent = total.toLocaleString('en-IN');
}

function changeThesisWords(delta) {
  thesisWords = Math.max(5000, thesisWords + delta);
  const el = document.getElementById('thesisWordsDisplay');
  if (el) el.textContent = thesisWords.toLocaleString('en-IN') + ' words';
  calcThesisPrice();
}

function setThesisDeadline(btn, type) {
  thesisDeadlineType = type;
  document.querySelectorAll('.th-dl').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const del = document.getElementById('thesisDelivery');
  if (del) del.textContent = thesisDeliveryText[type];
  calcThesisPrice();
}

document.addEventListener('DOMContentLoaded', calcThesisPrice);
