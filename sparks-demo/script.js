/* ---------------------------------------------------------
   Precision Biometric Scanner — login animation
   Replaces all previous wave/ripple sweep logic.

   Flow:
     handleScan()   -> morph button, sweep laser scan line for 1500ms
     showSuccess()  -> hide fingerprint, fade+pulse in the success tick,
                       hold 500ms, then redirect to /dashboard

   The canvas sits above the (dimmed) fingerprint icon with
   mix-blend-mode:screen (see style.css), so the bright cyan scan
   line visually brightens/glows the strokes it sweeps over.

   Public hooks: startScanner() / stopScanner()
--------------------------------------------------------- */

const Scanner = (function () {
  let canvas, ctx, wrap;
  let rafId = null;
  let running = false;
  let dpr = window.devicePixelRatio || 1;
  let resizeObserver = null;
  let startTime = 0;

  const SWEEP_PERIOD_MS = 650;   // one top -> bottom pass
  const LINE_COLOR = '0, 242, 255'; // #00f2ff

  function init() {
    canvas = document.getElementById('scannerCanvas');
    wrap = document.getElementById('scannerWrap');
    if (!canvas || !wrap) return false;
    ctx = canvas.getContext('2d');
    resize();

    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(wrap);
    } else {
      window.addEventListener('resize', resize);
    }
    return true;
  }

  function resize() {
    if (!canvas || !wrap) return;
    dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth || 56;
    const h = wrap.clientHeight || 56;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(timestamp) {
    if (!ctx || !canvas) return;
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Repeating top -> bottom sweep (sawtooth, not a bounce)
    const t = (elapsed % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS; // 0..1
    const y = t * h;

    // Fade the previous frame toward black instead of a hard clear —
    // combined with mix-blend-mode:screen on the canvas element, this
    // leaves a short glowing trail behind the laser line (black fades
    // to nothing under "screen", so it never dirties the page below).
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, w, h);

    // Bright crisp laser line
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.strokeStyle = `rgba(${LINE_COLOR}, 0.95)`;
    ctx.lineWidth = 1.3;
    ctx.shadowColor = `rgba(${LINE_COLOR}, 1)`;
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (running) rafId = requestAnimationFrame(draw);
  }

  function start() {
    if (!canvas && !init()) return;
    if (!running) {
      running = true;
      startTime = 0;
      rafId = requestAnimationFrame(draw);
    }
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { start, stop };
})();

function startScanner() { Scanner.start(); }
function stopScanner() { Scanner.stop(); }

// ---------------------------------------------------------
// Step 1: click -> morph button, run the laser scan for 1500ms
// ---------------------------------------------------------
function handleScan() {
  const btn = document.getElementById('loginBtn');
  if (!btn || btn.classList.contains('is-scanning')) return; // ignore repeat clicks

  btn.classList.add('is-scanning');
  startScanner();

  setTimeout(showSuccess, 1500);
}

// ---------------------------------------------------------
// Step 2: scan complete -> swap fingerprint for the success tick,
// hold 500ms, then redirect
// ---------------------------------------------------------
function showSuccess() {
  stopScanner();

  const fp = document.getElementById('fpIcon');
  const tick = document.getElementById('successTick');

  if (fp) fp.style.display = 'none';
  if (tick) tick.classList.add('show');

  setTimeout(() => {
    window.location.href = '/dashboard';
  }, 500);
}

document.getElementById('loginBtn').addEventListener('click', handleScan);
