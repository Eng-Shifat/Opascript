/* ====================
   SCRIPTORA — pricing.js
   ==================== */

/* ── PRICE TOGGLE (One-time / Monthly) ── */
function switchToggle(type) {
  document.getElementById('togOnce').classList.toggle('active', type === 'once');
  document.getElementById('togMonthly').classList.toggle('active', type === 'monthly');

  document.querySelectorAll('.price-val').forEach(el => {
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = type === 'once' ? el.dataset.once : el.dataset.monthly;
      el.style.opacity = '1';
    }, 180);
  });
}

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
