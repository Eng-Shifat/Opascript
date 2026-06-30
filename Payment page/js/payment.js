// ── Method Switch — সবার আগে define করি যাতে Supabase error হলেও কাজ করে ──
function selectMethod(m, el) {
  document.querySelectorAll('.method-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.method-detail').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');
  const detail = document.getElementById('detail-' + m);
  if (detail) detail.classList.add('active');
}

// ── Global state for "existing order due payment" mode ──────────────────────
let _payMode = 'new';   // 'new' = fresh order (sessionStorage flow) | 'due' = existing order due payment
let _dueOrderId = null;
let _dueOrderData = null;    // { total, paid, due, title, dept, client_id }
let _dueAmount = 0;

// ── Page Load ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id');

  if (orderId) {
    _payMode = 'due';
    _dueOrderId = orderId;
    await loadDuePaymentMode(orderId);
  } else {
    _payMode = 'new';
    loadNewOrderMode();
  }
});

// ── MODE A: Fresh order — use sessionStorage data (existing behaviour) ──────
function loadNewOrderMode() {
  const data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');

  setText('sumTitle', data.title || 'Thesis Order');
  setText('sumSub', (data.dept || '') + (data.university ? ' · ' + data.university : ''));
  setText('sumPkg', data.pkg || '—');
  setText('sumResearch', data.research || '—');
  setText('sumPages', data.pages || '—');
  setText('sumCitation', data.citation || '—');
  setText('sumUrgency', data.urgency || '—');
  setText('sumDeadline', data.deadline || '—');

  if (data.addons && data.addons.length > 0) {
    const addonsRow = document.getElementById('sumAddonsRow');
    if (addonsRow) addonsRow.style.display = 'flex';
    setText('sumAddons', data.addons.join(', '));
  }

  const total = data.total || 0;
  const discount = data.discount || 0;
  const coupon = data.coupon || null;
  const half = Math.round(total / 2);

  setText('sumTotal', total ? '৳' + total.toLocaleString() + '+' : '—');
  setText('splitNow', half ? '৳' + half.toLocaleString() : '—');
  setText('splitLater', half ? '৳' + half.toLocaleString() : '—');

  const payAmountEl = document.getElementById('payAmount');
  if (payAmountEl && half) {
    payAmountEl.value = '৳ ' + half.toLocaleString() + ' (৫০% Advance)';
  }
  _dueAmount = half;

  const couponRow = document.getElementById('sumCouponRow');
  if (coupon && discount > 0 && couponRow) {
    couponRow.style.display = 'flex';
    setText('sumCoupon', '🎟️ ' + coupon + ' (−৳' + discount.toLocaleString() + ')');
  }
}

// ── MODE B: Existing order — fetch live due amount from Supabase ────────────
async function loadDuePaymentMode(orderId) {
  const sb = window.scriptoraSupabase;
  if (!sb) {
    setText('sumTitle', 'Error loading order');
    return;
  }

  try {
    const { data: ord, error } = await sb
      .from('orders')
      .select('id, title, department, university, total_price, client_id')
      .eq('id', orderId)
      .single();

    if (error || !ord) {
      setText('sumTitle', 'Order পাওয়া যায়নি');
      return;
    }

    const { data: approvedPays } = await sb
      .from('payments')
      .select('amount')
      .eq('order_id', orderId)
      .eq('confirmed', true)
      .in('type', ['received', 'approval']);

    const total = Number(ord.total_price || 0);
    const paid = (approvedPays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const due = Math.max(0, total - paid);

    _dueOrderData = { total, paid, due, title: ord.title, dept: ord.department, client_id: ord.client_id };
    _dueAmount = due;

    setText('sumTitle', ord.title || 'Thesis Order');
    setText('sumSub', (ord.department || '') + (ord.university ? ' · ' + ord.university : ''));

    const rowsToHide = ['sumPkg', 'sumResearch', 'sumPages', 'sumCitation', 'sumUrgency'];
    rowsToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.closest('.sum-row')) el.closest('.sum-row').style.display = 'none';
    });
    const addonsRow = document.getElementById('sumAddonsRow');
    if (addonsRow) addonsRow.style.display = 'none';
    const couponRow = document.getElementById('sumCouponRow');
    if (couponRow) couponRow.style.display = 'none';

    setText('sumTotal', total ? '৳' + total.toLocaleString() : '—');

    const splitHead = document.querySelector('.split-head');
    if (splitHead) splitHead.textContent = 'Payment Status';
    setText('splitNow', paid ? '৳' + paid.toLocaleString() : '৳0');
    setText('splitLater', due ? '৳' + due.toLocaleString() : '৳0');
    const splitRows = document.querySelectorAll('.split-row span:first-child');
    if (splitRows[0]) splitRows[0].textContent = 'এখন পর্যন্ত পরিশোধ';
    if (splitRows[1]) splitRows[1].textContent = 'বাকি (Due)';

    const deadlineInfo = document.querySelector('.sum-info.deadline');
    if (deadlineInfo) deadlineInfo.style.display = 'none';

    const payAmountEl = document.getElementById('payAmount');
    if (payAmountEl) {
      payAmountEl.value = due > 0 ? '৳ ' + due.toLocaleString() + ' (সম্পূর্ণ বাকি)' : '৳ 0 (সম্পূর্ণ পরিশোধিত)';
    }

    if (due === 0) {
      const payBtn = document.querySelector('.pay-btn');
      if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = '✅ ইতিমধ্যে সম্পূর্ণ পরিশোধিত';
      }
    }

  } catch (e) {
    console.error('loadDuePaymentMode error:', e);
    setText('sumTitle', 'কিছু একটা সমস্যা হয়েছে');
  }
}

// ── Helper ───────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Screenshot Upload ────────────────────────────────────────────────────────
let _ssFile = null;

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
    document.getElementById('ssImg').src = e.target.result;
    document.getElementById('ssZone').style.display = 'none';
    document.getElementById('ssPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function removeScreenshot() {
  _ssFile = null;
  document.getElementById('ssZone').style.display = 'block';
  document.getElementById('ssPreview').style.display = 'none';
  document.getElementById('ssInput').value = '';
}

// ── Screenshot → Supabase upload ─────────────────────────────────────────────
async function uploadScreenshot(order_id, file) {
  if (!file) return null;
  const sb = window.scriptoraSupabase;
  if (!sb) return null;

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${order_id}/proof_${Date.now()}.${ext}`;

  const { data, error } = await sb.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('Screenshot upload failed:', error);
    return null;
  }

  const { data: urlData } = sb.storage
    .from('payment-proofs')
    .getPublicUrl(path);

  return urlData?.publicUrl || null;
}

// ── Payment Submit ───────────────────────────────────────────────────────────
async function submitPayment() {
  const txnInput = document.getElementById('txnId');
  const errEl = document.getElementById('err-txnId');
  const txn = txnInput.value.trim();

  if (!txn) {
    errEl.textContent = 'Transaction ID দিন';
    txnInput.focus();
    return;
  }
  errEl.textContent = '';

  const client_id = localStorage.getItem('scriptora_client_id');
  if (!client_id) {
    window.location.href = '../Login page/login.html';
    return;
  }

  const activeMethod = document.querySelector('.method-tab.active');
  const method = activeMethod ? activeMethod.getAttribute('data-method') : 'bkash';

  let order_id, amount, data = null;

  if (_payMode === 'due') {
    order_id = _dueOrderId;
    amount = _dueAmount;

    if (!order_id) {
      errEl.textContent = 'Order পাওয়া যায়নি।';
      return;
    }
    if (amount <= 0) {
      errEl.textContent = 'এই order সম্পূর্ণ পরিশোধিত — নতুন payment প্রয়োজন নেই।';
      return;
    }
  } else {
    data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');
    order_id = data.orderId;
    amount = data.advance || _dueAmount || 0;

    if (!order_id) {
      errEl.textContent = 'Order পাওয়া যায়নি। আবার order করুন।';
      return;
    }
  }

  const btn = document.querySelector('.pay-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Screenshot upload হচ্ছে...';

  try {
    let screenshot_url = '';
    if (_ssFile) {
      screenshot_url = (await uploadScreenshot(order_id, _ssFile)) || '';
    }

    btn.textContent = '⏳ Submit হচ্ছে...';

    const paymentType = _payMode === 'due' ? 'pending' : 'advance';

    const { error: payErr } = await window.scriptoraSupabase.from('payments').insert({
      order_id,
      client_id,
      amount,
      type: paymentType,
      txn_id: txn,
      method,
      confirmed: false,
      paid_at: new Date().toISOString(),
      screenshot_url,
      screenshot_size: _ssFile ? _ssFile.size : null,
    });

    if (payErr) throw payErr;

    const { error: updErr } = await window.scriptoraSupabase
      .from('orders')
      .update({ payment_status: 'under_review', updated_at: new Date().toISOString() })
      .eq('id', order_id);

    if (updErr) throw updErr;

    if (_payMode === 'new' && data) {
      data.txnId = txn;
      data.paymentMethod = method;
      data.paidAt = new Date().toISOString();
      data.paymentStatus = 'under_review';
      data.screenshotUrl = screenshot_url;
      sessionStorage.setItem('scriptora_order', JSON.stringify(data));
      window.location.href = './order-confirm.html';
    } else {
      const overlay = document.getElementById('successOverlay');
      const successBox = overlay ? overlay.querySelector('.success-box') : null;
      if (successBox) {
        const h2El = successBox.querySelector('h2');
        const pEl = successBox.querySelector('p');
        if (h2El) h2El.textContent = 'Payment Submitted!';
        if (pEl) pEl.textContent = 'আপনার ৳' + Number(amount).toLocaleString() + ' payment information পাঠানো হয়েছে। Admin verify করার পর due amount update হবে।';
        const btnEl = successBox.querySelector('button');
        if (btnEl) {
          btnEl.textContent = 'Dashboard এ ফিরে যান →';
          btnEl.onclick = () => { window.location.href = `../Client Dashboard/dashboard.html?order=${order_id}`; };
        }
      }
      if (overlay) overlay.classList.add('show');
    }

  } catch (err) {
    console.error(err);
    errEl.textContent = '❌ ' + (err.message || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    btn.disabled = false;
    btn.textContent = '💳 Payment নিশ্চিত করুন';
  }
}
