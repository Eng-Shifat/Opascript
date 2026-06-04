/* order-detail.js */

document.addEventListener('DOMContentLoaded', () => {

  const data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');

  const orderId     = data.orderId  || '#SCR-2026-005';
  const deadlineStr = data.deadline || '2026-06-20';
  const total       = data.total    || 16000;
  const advance     = Math.round(total / 2);
  const due         = total - advance;
  const deadlineFmt = formatDeadline(deadlineStr);

  setText('bcOrderId',  orderId);
  setText('odTitle',    data.title    || 'Impact of AI on Software Development in Bangladesh');
  setText('odMeta',     `${orderId} · ${data.pkg || 'CSE/SWE Research'} · Order: ${formatDate(data.orderDate || new Date())}`);
  setText('odTotal',   '৳' + total.toLocaleString('en-BD'));
  setText('odAdvance', '৳' + advance.toLocaleString('en-BD'));
  setText('odDue',     '৳' + due.toLocaleString('en-BD'));
  setText('odDeadline', deadlineFmt);

  const daysLeft = getDaysLeft(deadlineStr);
  if (daysLeft !== null) setText('odDaysLeft', `· আর মাত্র ${daysLeft} দিন বাকি`);

  startOrderCountdown(deadlineStr);

  if (due <= 0) {
    const tag = document.getElementById('odDueTag');
    const dueEl = document.getElementById('odDue');
    if (tag)   tag.style.display = 'none';
    if (dueEl) { dueEl.textContent = '৳0 ✓'; dueEl.className = 'od-pay-val green'; }
  }
});

function startOrderCountdown(dateStr) {
  const target = new Date(dateStr);
  target.setHours(23, 59, 59, 0);
  const ids = ['ocdDays','ocdHours','ocdMins','ocdSecs'];
  const divs = [86400000, 3600000, 60000, 1000];

  (function tick() {
    const diff = target - new Date();
    if (diff <= 0) return ids.forEach(id => setText(id, '00'));
    ids.forEach((id, i) => setText(id, pad(Math.floor((diff % (divs[i-1]||Infinity)) / divs[i]))));
    setTimeout(tick, 1000);
  })();
}

function simulateDownload(btn) {
  btn.disabled = true;
  btn.innerHTML = '⏳ Downloading...';
  setTimeout(() => {
    btn.innerHTML = '✓ Downloaded';
    btn.style.cssText += ';background:rgba(34,197,94,0.18);color:#4ade80;border-color:rgba(34,197,94,0.35)';
    btn.disabled = false;
  }, 1800);
}

function formatDate(d)     { return new Date(d).toLocaleDateString('en-BD', { day:'numeric', month:'short', year:'numeric' }); }
function formatDeadline(s) { return new Date(s).toLocaleDateString('en-BD', { day:'numeric', month:'long', year:'numeric' }); }
function getDaysLeft(s)    { const d = new Date(s) - new Date(); return d > 0 ? Math.ceil(d / 86400000) : 0; }
