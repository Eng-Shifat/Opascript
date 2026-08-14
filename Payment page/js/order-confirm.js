// ── Page Load ────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');

  // Order ID — human-readable order_number দেখাও, fallback এ raw UUID
  const orderId = data.orderNumber || data.orderId || '—';
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

  // Payment status — admin manually verify করবে, Client Dashboard এ গিয়ে status দেখা যাবে
  showPaymentStatus(data.paymentStatus || 'pending');

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

  const icons = {
    confirmed: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    rejected:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    pending:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  };

  if (status === 'confirmed' || status === 'approved' || status === 'paid') {
    el.innerHTML  = icons.confirmed + 'Payment Confirmed';
    el.className  = 'payment-status-badge confirmed';
    /* Step 2 → done */
    const psStep = document.getElementById('psPaymentStep');
    const psIcon = document.getElementById('psPaymentIcon');
    const psTitle = document.getElementById('psPaymentTitle');
    const psWriting = document.getElementById('psWritingStep');
    if (psStep)  { psStep.className = 'ps-item done'; }
    if (psIcon)  { psIcon.innerHTML = '✓'; }
    if (psTitle) { psTitle.textContent = 'Payment received'; }
    if (psWriting) { psWriting.className = 'ps-item active'; }
  } else if (status === 'rejected') {
    el.innerHTML  = icons.rejected + 'Payment Rejected — Admin এর সাথে যোগাযোগ করুন';
    el.className  = 'payment-status-badge rejected';
    /* Step 2 → rejected */
    const psStep = document.getElementById('psPaymentStep');
    const psIcon = document.getElementById('psPaymentIcon');
    const psTitle = document.getElementById('psPaymentTitle');
    if (psStep)  { psStep.className = 'ps-item rejected'; }
    if (psIcon)  { psIcon.innerHTML = '✗'; psIcon.style.color = '#f87171'; }
    if (psTitle) { psTitle.textContent = 'Payment Rejected'; }
  } else {
    el.innerHTML  = icons.pending + 'Payment Verification চলছে...';
    el.className  = 'payment-status-badge pending';
    /* Step 2 → pending (under_review) */
    const psStep = document.getElementById('psPaymentStep');
    if (psStep) psStep.className = 'ps-item pending';
  }
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
