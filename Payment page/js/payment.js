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
let _ssFile = null; // selected file global রেখে দেব

function handleSSfile(input) {
  if (!input.files[0]) return;
  _ssFile = input.files[0];
  showSS(_ssFile);
}

function handleSSdrop(e) {
  e.preventDefault();
  document.getElementById('ssZone').classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) {
    _ssFile = f;
    showSS(_ssFile);
  }
}

function showSS(file) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('ssImg').src              = e.target.result;
    document.getElementById('ssZone').style.display   = 'none';
    document.getElementById('ssPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function removeScreenshot() {
  _ssFile = null;
  document.getElementById('ssZone').style.display    = 'block';
  document.getElementById('ssPreview').style.display = 'none';
  document.getElementById('ssInput').value           = '';
}

// ── Screenshot → Supabase upload ─────────────────────────────────────────────
async function uploadScreenshot(order_id, file) {
  if (!file) return null;

  const sb = window.scriptoraSupabase;
  if (!sb) return null;

  // File extension বের করো
  const ext  = file.name.split('.').pop() || 'jpg';
  const path = `${order_id}/proof_${Date.now()}.${ext}`;

  const { data, error } = await sb.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('Screenshot upload failed:', error);
    return null;
  }

  // Public URL বানাও
  const { data: urlData } = sb.storage
    .from('payment-proofs')
    .getPublicUrl(path);

  return urlData?.publicUrl || null;
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
  const order_id  = data.orderId;

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
  const amount = data.advance || Math.round(total / 2);

  // Button loading state
  const btn = document.querySelector('.pay-btn');
  btn.disabled    = true;
  btn.textContent = '⏳ Screenshot upload হচ্ছে...';

  try {
    // ── Step 1: Screenshot upload (থাকলে) ──────────────────────────────────
    let screenshot_url = '';
    if (_ssFile) {
      screenshot_url = (await uploadScreenshot(order_id, _ssFile)) || '';
    }

    // ── Step 2: payments table এ insert ────────────────────────────────────
    btn.textContent = '⏳ Submit হচ্ছে...';

    const { error: payErr } = await window.scriptoraSupabase.from('payments').insert({
      order_id,
      client_id,
      amount,
      type:            'advance',
      txn_id:          txn,
      method,
      confirmed:       false,
      paid_at:         new Date().toISOString(),
      screenshot_url,
      screenshot_size: _ssFile ? _ssFile.size : null,
    });

    if (payErr) throw payErr;

    // ── Step 3: orders.payment_status → under_review ────────────────────────
    const { error: updErr } = await window.scriptoraSupabase
      .from('orders')
      .update({ payment_status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', order_id);

    if (updErr) throw updErr;

    // ── Step 4: sessionStorage update ───────────────────────────────────────
    data.txnId          = txn;
    data.paymentMethod  = method;
    data.paidAt         = new Date().toISOString();
    data.paymentStatus  = 'under_review';
    data.screenshotUrl  = screenshot_url;
    sessionStorage.setItem('scriptora_order', JSON.stringify(data));

    // ── Step 5: Redirect ─────────────────────────────────────────────────────
    window.location.href = './order-confirm.html';

  } catch (err) {
    console.error(err);
    errEl.textContent = '❌ ' + (err.message || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    btn.disabled    = false;
    btn.textContent = '💳 Payment নিশ্চিত করুন';
  }
}
