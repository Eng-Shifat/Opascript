// ── Load order data from sessionStorage ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const data = JSON.parse(sessionStorage.getItem('scriptora_order') || '{}');

  // Order ID — random or from data
  const orderId = data.orderId || '#SCR-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*999)+1).padStart(3,'0');
  setText('orderId', orderId);

  // Summary fields
  setText('rTitle',    data.title    || '—');
  setText('rPkg',      data.pkg      || '—');
  setText('rDept',     (data.dept || '') + (data.university ? ' · ' + data.university : '') || '—');
  setText('rCitation', data.citation || '—');
  setText('rDeadline', data.deadline || '—');
  setText('deadlineLabel', data.deadline || '—');

  // Pricing
  const total    = data.total    || 0;
  const half     = Math.round(total / 2);
  setText('rTotal',     total ? '৳' + total.toLocaleString() : '—');
  setText('rAdvance',   half  ? '৳' + half.toLocaleString() + ' ✓' : '—');
  setText('rRemaining', half  ? '৳' + half.toLocaleString() : '—');

  // Start countdown to deadline
  if (data.deadline) {
    startCountdown(data.deadline);
  } else {
    // Demo: 20 days from now
    const demo = new Date();
    demo.setDate(demo.getDate() + 20);
    const demoStr = demo.toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric'});
    setText('deadlineLabel', demoStr);
    startCountdown(demoStr);
  }

  // Confetti burst
  runConfetti();
});

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Countdown Timer ──────────────────────────────────────────────────────────
function startCountdown(deadlineStr) {
  const target = new Date(deadlineStr);
  if (isNaN(target)) return;

  function tick() {
    const now  = new Date();
    const diff = target - now;
    if (diff <= 0) {
      setText('cdDays', '00'); setText('cdHours', '00');
      setText('cdMins',  '00'); setText('cdSecs',  '00');
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    setText('cdDays',  String(d).padStart(2,'0'));
    setText('cdHours', String(h).padStart(2,'0'));
    setText('cdMins',  String(m).padStart(2,'0'));
    setText('cdSecs',  String(s).padStart(2,'0'));
  }
  tick();
  setInterval(tick, 1000);
}

// ── Confetti ─────────────────────────────────────────────────────────────────
function runConfetti() {
  const canvas = document.getElementById('confetti');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#2d6ef7','#22c55e','#fbbf24','#ec4899','#60a5fa','#4ade80'];
  const pieces = Array.from({length: 120}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    r: Math.random() * 6 + 3,
    d: Math.random() * 120 + 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    tilt: Math.random() * 10 - 10,
    tiltSpeed: (Math.random() * 0.1) + 0.05,
    speed: Math.random() * 2 + 1,
    opacity: 1,
  }));

  let frame = 0;
  const maxFrames = 220;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    pieces.forEach(p => {
      p.y += p.speed;
      p.tilt += p.tiltSpeed;
      p.opacity = frame > maxFrames * 0.7
        ? 1 - (frame - maxFrames * 0.7) / (maxFrames * 0.3)
        : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
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
