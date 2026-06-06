const API = 'http://localhost:5000';

// ── Page Load — order summary দেখাও ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');

  setText('sumTitle',    data.title    || 'Thesis Order');
  setText('sumSub',      (data.dept || '') + (data.university ? ' · ' + data.university : ''));
  setText('sumPkg',      data.pkg      || '—');
  setText('sumResearch', data.research || '—');
  setText('sumPages',    data.pages    || '—');
  setText('sumCitation', data.citation || '—');
  setText('sumUrgency',  data.urgency  || '—');
  setText('sumDeadline', data.deadline || '—');

  // Addons
  if (data.addons && data.addons.length > 0) {
    const addonsRow = document.getElementById('sumAddonsRow');
    if (addonsRow) addonsRow.style.display = 'flex';
    setText('sumAddons', data.addons.join(', '));
  }

  // Pricing
  const total    = data.total    || 0;
  const discount = data.discount || 0;
  const coupon   = data.coupon   || null;
  const half     = Math.round(total / 2);

  setText('sumTotal',   total ? '৳' + total.toLocaleString() + '+' : '—');
  setText('splitNow',   half  ? '৳' + half.toLocaleString()        : '—');
  setText('splitLater', half  ? '৳' + half.toLocaleString()        : '—');

  const payAmountEl = document.getElementById('payAmount');
  if (payAmountEl && half) {
    payAmountEl.value = '৳ ' + half.toLocaleString() + ' (৫০% Advance)';
  }

  // Coupon row
  const couponRow = document.getElementById('sumCouponRow');
  if (coupon && discount > 0 && couponRow) {
    couponRow.style.display = 'flex';
    setText('sumCoupon', '🎟️ ' + coupon + ' (−৳' + discount.toLocaleString() + ')');
  }
});

// ── Helper ───────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Payment Method Select ────────────────────────────────────────────────────
function selectMethod(m, el) {
  document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.method-detail').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('detail-' + m).classList.add('active');
}

// ── Screenshot Upload ────────────────────────────────────────────────────────
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
    document.getElementById('ssImg').src          = e.target.result;
    document.getElementById('ssZone').style.display    = 'none';
    document.getElementById('ssPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function removeScreenshot() {
  document.getElementById('ssZone').style.display    = 'block';
  document.getElementById('ssPreview').style.display = 'none';
  document.getElementById('ssInput').value           = '';
}

// ── Payment Submit ───────────────────────────────────────────────────────────
async function submitPayment() {
  const txnInput = document.getElementById('txnId');
  const errEl    = document.getElementById('err-txnId');
  const txn      = txnInput.value.trim();

  // Validation
  if (!txn) {
    errEl.textContent = 'Transaction ID দিন';
    txnInput.focus();
    return;
  }
  errEl.textContent = '';

  // Session data
  const data      = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');
  const client_id = localStorage.getItem('scriptora_client_id');
  const order_id  = data.dbOrderId; // order form submit এর সময় save হয়েছে

  // Login check
  if (!client_id) {
    window.location.href = '../Login page/login.html';
    return;
  }

  // Order id check
  if (!order_id) {
    errEl.textContent = 'Order পাওয়া যায়নি। আবার order করুন।';
    return;
  }

  // Selected method
  const activeMethod = document.querySelector('.method-tab.active');
  const method       = activeMethod ? activeMethod.getAttribute('data-method') : 'bkash';

  // Amount = ৫০% advance
  const total  = data.total || 0;
  const amount = Math.round(total / 2);

  // Button loading state
  const btn = document.querySelector('.pay-btn');
  btn.disabled     = true;
  btn.textContent  = '⏳ Submit হচ্ছে...';

  try {
    const res = await fetch(`${API}/api/payments`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id,
        client_id,
        amount,
        method,
        txn_id:         txn,
        screenshot_url: '',  // future: Supabase storage upload
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Payment submit failed');
    }

    // Payment id save করো (order-confirm page এ status check করবে)
    data.paymentId     = result.id;
    data.txnId         = txn;
    data.paymentMethod = method;
    data.paidAt        = new Date().toISOString();
    data.paymentStatus = 'pending'; // admin verify করবে
    sessionStorage.setItem('scriptora_order', JSON.stringify(data));

    // Redirect to confirmation page
    window.location.href = './order-confirm.html';

  } catch (err) {
    console.error(err);
    errEl.textContent = '❌ ' + (err.message || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    btn.disabled    = false;
    btn.textContent = '💳 Payment নিশ্চিত করুন';
  }
}
