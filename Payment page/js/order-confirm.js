const API = 'http://localhost:5000';

// ── Page Load ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');

  // Order ID
  const orderId = data.orderId || '—';
  setText('orderId', orderId);

  // Summary fields
  setText('rTitle',    data.title    || '—');
  setText('rPkg',      data.pkg      || '—');
  setText('rCitation', data.citation || '—');
  setText('rDeadline', data.deadline || '—');
  setText('deadlineLabel', data.deadline || '—');

  const dept = (data.dept || '') + (data.university ? ' · ' + data.university : '');
  setText('rDept', dept || '—');

  // Pricing
  const total = data.total || 0;
  const half  = Math.round(total / 2);
  setText('rTotal',     total ? '৳' + total.toLocaleString() : '—');
  setText('rAdvance',   half  ? '৳' + half.toLocaleString()  : '—');
  setText('rRemaining', half  ? '৳' + half.toLocaleString()  : '—');

  // Countdown
  if (data.deadline) {
    startCountdown(data.deadline);
  } else {
    const demo = new Date();
    demo.setDate(demo.getDate() + 20);
    const demoStr = demo.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    setText('deadlineLabel', demoStr);
    startCountdown(demoStr);
  }

  // Payment status check
  showPaymentStatus(data.paymentStatus || 'pending');
  if (data.paymentId) {
    pollPaymentStatus(data.paymentId);
  }

  // Confetti
  runConfetti();
});

// ── Helper ───────────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Payment Status UI ────────────────────────────────────────────────────────
function showPaymentStatus(status) {
  const el = document.getElementById('paymentStatusBadge');
  if (!el) return;

  if (status === 'confirmed') {
    el.innerHTML  = '✅ Payment Confirmed';
    el.className  = 'payment-status-badge confirmed';
  } else if (status === 'rejected') {
    el.innerHTML  = '❌ Payment Rejected — Admin এর সাথে যোগাযোগ করুন';
    el.className  = 'payment-status-badge rejected';
  } else {
    el.innerHTML  = '⏳ Payment Verification চলছে...';
    el.className  = 'payment-status-badge pending';
  }
}

// ── Poll payment status every 15 seconds ─────────────────────────────────────
function pollPaymentStatus(paymentId) {
  const interval = setInterval(async () => {
    try {
      const data      = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');
      const order_id  = data.dbOrderId;
      if (!order_id) return;

      const res    = await fetch(`${API}/api/payments/${order_id}`);
      const payments = await res.json();

      // এই payment খোঁজো
      const payment = Array.isArray(payments)
        ? payments.find(p => p.id === paymentId)
        : null;

      if (!payment) return;

      if (payment.confirmed === true) {
        showPaymentStatus('confirmed');
        data.paymentStatus = 'confirmed';
        sessionStorage.setItem('scriptora_order', JSON.stringify(data));
        clearInterval(interval);
      } else if (payment.confirmed === false && payment.rejected) {
        showPaymentStatus('rejected');
        data.paymentStatus = 'rejected';
        sessionStorage.setItem('scriptora_order', JSON.stringify(data));
        clearInterval(interval);
      }
    } catch (err) {
      // silent — network error হলে আবার try করবে
    }
  }, 15000); // ১৫ সেকেন্ড পরপর check
}

// ── Countdown Timer ──────────────────────────────────────────────────────────
function startCountdown(deadlineStr) {
  const target = new Date(deadlineStr);
  if (isNaN(target)) return;

  function tick() {
    const now  = new Date();
    const diff = target - now;

    if (diff <= 0) {
      setText('cdDays',  '00');
      setText('cdHours', '00');
      setText('cdMins',  '00');
      setText('cdSecs',  '00');
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    setText('cdDays',  String(d).padStart(2, '0'));
    setText('cdHours', String(h).padStart(2, '0'));
    setText('cdMins',  String(m).padStart(2, '0'));
    setText('cdSecs',  String(s).padStart(2, '0'));
  }

  tick();
  setInterval(tick, 1000);
}

// ── Confetti ─────────────────────────────────────────────────────────────────
function runConfetti() {
  const canvas = document.getElementById('confetti');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#2d6ef7', '#22c55e', '#fbbf24', '#ec4899', '#60a5fa', '#4ade80'];
  const pieces = Array.from({ length: 120 }, () => ({
    x:         Math.random() * canvas.width,
    y:         Math.random() * -canvas.height,
    r:         Math.random() * 6 + 3,
    color:     COLORS[Math.floor(Math.random() * COLORS.length)],
    tilt:      Math.random() * 10 - 10,
    tiltSpeed: Math.random() * 0.1 + 0.05,
    speed:     Math.random() * 2 + 1,
    opacity:   1,
  }));

  let frame = 0;
  const maxFrames = 220;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    pieces.forEach(p => {
      p.y    += p.speed;
      p.tilt += p.tiltSpeed;
      p.opacity = frame > maxFrames * 0.7
        ? 1 - (frame - maxFrames * 0.7) / (maxFrames * 0.3)
        : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x + Math.sin(p.tilt) * 10, p.y, p.r, p.r * 0.4, p.tilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    if (frame < maxFrames) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

window.addEventListener('resize', () => {
  const canvas = document.getElementById('confetti');
  if (canvas) {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});
