// Load order summary from sessionStorage
window.addEventListener('DOMContentLoaded', () => {
  const data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');

  setText('sumTitle',    data.title      || 'Thesis Order');
  setText('sumSub',      (data.dept || '') + (data.university ? ' · ' + data.university : ''));
  setText('sumPkg',      data.pkg        || '—');
  setText('sumResearch', data.research   || '—');
  setText('sumPages',    data.pages      || '—');
  setText('sumCitation', data.citation   || '—');
  setText('sumUrgency',  data.urgency    || '—');

  // Addons
  if (data.addons && data.addons.length > 0) {
    const addonsRow = document.getElementById('sumAddonsRow');
    if (addonsRow) addonsRow.style.display = 'flex';
    setText('sumAddons', data.addons.join(', '));
  }

  const total    = data.total    || 0;
  const discount = data.discount || 0;
  const coupon   = data.coupon   || null;
  const half     = Math.round(total / 2);

  setText('sumTotal',   total ? '৳' + total.toLocaleString() + '+' : '—');
  setText('splitNow',   half  ? '৳' + half.toLocaleString()  : '—');
  setText('splitLater', half  ? '৳' + half.toLocaleString()  : '—');
  setText('sumDeadline', data.deadline  || '—');

  if (half) document.getElementById('payAmount').value = '৳ ' + half.toLocaleString() + ' (৫০% Advance)';

  // Coupon
  const couponRow = document.getElementById('sumCouponRow');
  if (coupon && discount > 0 && couponRow) {
    couponRow.style.display = 'flex';
    setText('sumCoupon', '🎟️ ' + coupon + ' (−৳' + discount.toLocaleString() + ')');
  }
});

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// Method select
function selectMethod(m, el) {
  document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.method-detail').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('detail-' + m).classList.add('active');
}

// Screenshot
function handleSSfile(input) {
  if (!input.files[0]) return;
  showSS(input.files[0]);
}
function handleSSdrop(e) {
  e.preventDefault();
  document.getElementById('ssZone').classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) showSS(f);
}
function showSS(file) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('ssImg').src = e.target.result;
    document.getElementById('ssZone').style.display    = 'none';
    document.getElementById('ssPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}
function removeScreenshot() {
  document.getElementById('ssZone').style.display    = 'block';
  document.getElementById('ssPreview').style.display = 'none';
  document.getElementById('ssInput').value = '';
}

// Submit
function submitPayment() {
  const txn = document.getElementById('txnId').value.trim();
  const err = document.getElementById('err-txnId');
  if (!txn) { err.textContent = 'Transaction ID দিন'; return; }
  err.textContent = '';

  // Save transaction ID & generate order ID into sessionStorage
  const data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');
  data.txnId   = txn;
  data.orderId = '#SCR-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*999)+1).padStart(3,'0');
  data.paidAt  = new Date().toISOString();
  sessionStorage.setItem('scriptora_order', JSON.stringify(data));

  // Redirect to confirmation page
  window.location.href = './order-confirm.html';
}
