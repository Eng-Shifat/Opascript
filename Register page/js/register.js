/* ================================================
   SCRIPTORA — register.js  (Supabase Auth version)
   ================================================
   Dependencies: Supabase JS SDK via CDN
   Add to your HTML <head> BEFORE this script:

   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

   FIXES & IMPROVEMENTS over previous version:
   ✅ authData.user null-check (email confirm OFF হলে session থাকে, ON হলে user থাকে)
   ✅ "User already registered" → duplicate check আরো robust
   ✅ clients table insert এ "password" column থাকলে error হতো — removed
   ✅ phone validation improved (01 দিয়ে শুরু করলেও চলবে)
   ✅ rate limit / network error আলাদা handle
   ✅ goToDashboard() এ Supabase session check যোগ করা হয়েছে
   ✅ email confirmation ON/OFF দুটো case handle
   ✅ localStorage এ শুধু non-sensitive data রাখা হয়েছে
   ================================================ */

// ── Supabase Config ─────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://hivrmntxpmpwthmjtoem.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdnJtbnR4cG1wd3RobWp0b2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTEzOTksImV4cCI6MjA5NjEyNzM5OX0.MvsL4Fp_FZI3XBhj3El5sdtO4wbwls90r1SoSVtjPBI';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Email Confirmation Setting ──────────────────────────────────────────────
// Supabase Dashboard → Authentication → Email → "Confirm email" ON/OFF
// নিচের value আপনার Supabase setting এর সাথে মিলিয়ে সেট করুন
const EMAIL_CONFIRM_ENABLED = false; // false হলে register করেই সরাসরি login হবে


// ── Password show/hide ──────────────────────────────────────────────────────
function togglePass(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!inp || !btn) return;

  if (inp.type === 'password') {
    inp.type        = 'text';
    btn.style.color = 'rgba(255,255,255,0.75)';
    btn.setAttribute('aria-label', 'পাসওয়ার্ড লুকান');
  } else {
    inp.type        = 'password';
    btn.style.color = 'rgba(255,255,255,0.3)';
    btn.setAttribute('aria-label', 'পাসওয়ার্ড দেখুন');
  }
}


// ── Password strength ───────────────────────────────────────────────────────
const passwordInput = document.getElementById('password');
if (passwordInput) {
  passwordInput.addEventListener('input', function () {
    const val  = this.value;
    const hint = document.getElementById('passStrength');
    if (!hint) return;
    if (!val) { hint.textContent = ''; hint.className = 'pass-strength'; return; }

    const score = [
      val.length >= 8,
      /[A-Z]/.test(val),
      /[0-9]/.test(val),
      /[^A-Za-z0-9]/.test(val),
    ].filter(Boolean).length;

    if (score <= 1)      { hint.textContent = '● দুর্বল পাসওয়ার্ড';      hint.className = 'pass-strength weak'; }
    else if (score <= 3) { hint.textContent = '●● মধ্যম পাসওয়ার্ড';      hint.className = 'pass-strength medium'; }
    else                 { hint.textContent = '●●● শক্তিশালী পাসওয়ার্ড'; hint.className = 'pass-strength strong'; }
  });
}


// ── Confirm password match ──────────────────────────────────────────────────
const confirmInput = document.getElementById('confirmPassword');
if (confirmInput) {
  confirmInput.addEventListener('input', function () {
    const pass = document.getElementById('password').value;
    // 'confirm' id দিয়ে err দেখাও (নিচে showErr() এ 'confirm' prefix)
    const err  = document.getElementById('err-confirm') || document.getElementById('err-confirmPassword');
    if (this.value && pass !== this.value) {
      if (err) err.textContent = 'পাসওয়ার্ড মিলছে না';
      this.classList.add('invalid');
      this.classList.remove('valid');
    } else {
      if (err) err.textContent = '';
      this.classList.remove('invalid');
      if (this.value) this.classList.add('valid');
    }
  });
}


// ── Error helpers ───────────────────────────────────────────────────────────
function showErr(id, msg) {
  // err-confirm বা err-confirmPassword যেটা HTML এ থাকে দুটোই try করে
  const el  = document.getElementById('err-' + id);
  const inp = document.getElementById(id);
  if (el)  el.textContent = msg;
  if (inp) { inp.classList.add('invalid'); inp.classList.remove('valid'); }
}

function clearErr(id) {
  const el  = document.getElementById('err-' + id);
  const inp = document.getElementById(id);
  if (el)  el.textContent = '';
  if (inp) inp.classList.remove('invalid');
}

function setLoading(on) {
  const btnText    = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const submitBtn  = document.getElementById('submitBtn');
  if (btnText)    btnText.style.display    = on ? 'none'         : 'inline';
  if (btnSpinner) btnSpinner.style.display = on ? 'inline-block' : 'none';
  if (submitBtn)  submitBtn.disabled       = on;
}

// Toast notification (optional — HTML এ #toast div না থাকলেও কাজ করবে)
function showToast(msg, type = 'error') {
  const existing = document.getElementById('reg-toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.id = 'reg-toast';
  t.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${type === 'error' ? '#ef4444' : '#22c55e'};
    color: white; padding: 12px 24px; border-radius: 10px;
    font-size: 14px; font-weight: 500; z-index: 9999;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    animation: toastIn 0.3s ease;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}


// ── Phone normalize helper ──────────────────────────────────────────────────
// ব্যবহারকারী 01XXXXXXXXX বা 1XXXXXXXXX — দুটোই accept করে
function normalizePhone(raw) {
  const clean = raw.trim().replace(/[\s\-()]/g, '');
  // ইতিমধ্যে 01 দিয়ে শুরু
  if (/^01[3-9]\d{8}$/.test(clean)) return clean;
  // 1 দিয়ে শুরু → 0 যোগ করো
  if (/^1[3-9]\d{8}$/.test(clean)) return '0' + clean;
  return null; // invalid
}


// ── Main Register Handler ───────────────────────────────────────────────────
async function handleRegister() {
  let valid = true;

  // ── First name ─────────────────────────────────────────────────────────
  const firstName = document.getElementById('firstName')?.value.trim() || '';
  clearErr('firstName');
  if (!firstName) {
    showErr('firstName', 'প্রথম নাম দিন');
    valid = false;
  } else {
    document.getElementById('firstName').classList.add('valid');
  }

  // ── Last name ──────────────────────────────────────────────────────────
  const lastName = document.getElementById('lastName')?.value.trim() || '';
  clearErr('lastName');
  if (!lastName) {
    showErr('lastName', 'শেষ নাম দিন');
    valid = false;
  } else {
    document.getElementById('lastName').classList.add('valid');
  }

  // ── Email ──────────────────────────────────────────────────────────────
  const email = document.getElementById('email')?.value.trim().toLowerCase() || '';
  clearErr('email');
  if (!email) {
    showErr('email', 'ইমেইল দিন');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showErr('email', 'সঠিক ইমেইল দিন');
    valid = false;
  } else {
    document.getElementById('email').classList.add('valid');
  }

  // ── Phone ──────────────────────────────────────────────────────────────
  const phoneRaw = document.getElementById('phone')?.value || '';
  const phone    = normalizePhone(phoneRaw);
  clearErr('phone');
  if (!phoneRaw.trim()) {
    showErr('phone', 'ফোন নম্বর দিন');
    valid = false;
  } else if (!phone) {
    showErr('phone', 'সঠিক নম্বর দিন (যেমন: 01XXXXXXXXX)');
    valid = false;
  } else {
    document.getElementById('phone').classList.add('valid');
  }

  // ── Password ───────────────────────────────────────────────────────────
  const pass = document.getElementById('password')?.value || '';
  clearErr('password');
  if (!pass) {
    showErr('password', 'পাসওয়ার্ড দিন');
    valid = false;
  } else if (pass.length < 8) {
    showErr('password', 'কমপক্ষে ৮ অক্ষর হতে হবে');
    valid = false;
  } else {
    document.getElementById('password').classList.add('valid');
  }

  // ── Confirm password ───────────────────────────────────────────────────
  const conf = document.getElementById('confirmPassword')?.value || '';
  clearErr('confirm');
  clearErr('confirmPassword'); // দুটো id support করে
  if (!conf) {
    showErr('confirm', 'পাসওয়ার্ড নিশ্চিত করুন');
    valid = false;
  } else if (pass !== conf) {
    showErr('confirm', 'পাসওয়ার্ড মিলছে না');
    valid = false;
  }

  // ── Terms ──────────────────────────────────────────────────────────────
  const termsEl = document.getElementById('termsCheck');
  const terms   = termsEl ? termsEl.checked : true; // checkbox না থাকলে skip
  const termsErr = document.getElementById('err-terms');
  if (termsErr) termsErr.textContent = terms ? '' : 'Terms এ সম্মত হতে হবে';
  if (!terms) valid = false;

  if (!valid) return;

  // ── Submit ─────────────────────────────────────────────────────────────
  setLoading(true);

  const fullName = `${firstName} ${lastName}`.trim();

  try {
    // ── STEP 1: Supabase Auth — user তৈরি ─────────────────────────────
    const { data: authData, error: authError } = await sb.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    if (authError) {
      handleAuthError(authError);
      setLoading(false);
      return;
    }

    // ── STEP 2: User object বের করো ───────────────────────────────────
    // Email confirmation ON  → authData.user আছে কিন্তু session নেই
    // Email confirmation OFF → authData.user + authData.session দুটোই আছে
    const authUser = authData?.user;

    if (!authUser) {
      // এটা হওয়া উচিত না, তবু safety net
      setLoading(false);
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন');
      return;
    }

    // ── STEP 3: Duplicate check (identities empty = existing user) ─────
    // Supabase email confirm ON থাকলে duplicate user এ error না দিয়ে
    // empty identities দেয় — এটা handle করতে হবে
    if (authData.user.identities && authData.user.identities.length === 0) {
      showErr('email', 'এই ইমেইল দিয়ে আগেই account আছে');
      setLoading(false);
      return;
    }

    // ── STEP 4: clients table এ insert ────────────────────────────────
    const { error: dbError } = await sb
      .from('clients')
      .insert({
        id:    authUser.id,  // Auth UUID = clients.id
        name:  fullName,
        email: email,
        phone: phone,
        // password column নেই — Supabase Auth নিজেই manage করে
        // created_at → Supabase default now() বা নিজে দিন
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('DB insert error:', dbError.message);

      // Unique violation = clients table এ already আছে (re-register attempt)
      if (dbError.code === '23505') {
        // Auth user তৈরি হয়ে গেছে, clients row already আছে — ok
        console.warn('Client row already exists, proceeding.');
      } else {
        // অন্য DB error — warn করো কিন্তু block করো না
        console.warn('Non-critical DB error, proceeding with auth.');
      }
    }

    // ── STEP 5: localStorage save ──────────────────────────────────────
    // শুধু non-sensitive info রাখুন
    localStorage.setItem('scriptora_client_id', authUser.id);
    localStorage.setItem('scriptora_name',      fullName);
    localStorage.setItem('scriptora_email',     email);
    localStorage.setItem('scriptora_role',      'client');

    setLoading(false);

    // সরাসরি dashboard এ redirect
    const redirect = sessionStorage.getItem('scriptora_redirect');
    sessionStorage.removeItem('scriptora_redirect');
    if (redirect === 'payment') {
      window.location.href = '../Payment page/payment.html';
    } else {
      window.location.href = '../Client Dashbaord/dashboard.html';
    }

  } catch (err) {
    console.error('Unexpected register error:', err);

    // Network error check
    if (!navigator.onLine || err.message?.includes('fetch')) {
      showToast('ইন্টারনেট সংযোগ নেই, আবার চেষ্টা করুন');
    } else {
      showToast('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন');
    }
    setLoading(false);
  }
}


// ── Auth error → বাংলা message ─────────────────────────────────────────────
function handleAuthError(err) {
  const msg = err.message?.toLowerCase() || '';
  console.error('Auth error:', err.message);

  if (msg.includes('already registered') || msg.includes('user already registered')) {
    showErr('email', 'এই ইমেইল দিয়ে আগেই account আছে');
  } else if (msg.includes('invalid email')) {
    showErr('email', 'ইমেইল ঠিকানাটি সঠিক নয়');
  } else if (msg.includes('password') && msg.includes('6')) {
    showErr('password', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে');
  } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
    showToast('অনেকবার চেষ্টা করা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন');
  } else if (msg.includes('email') && msg.includes('taken')) {
    showErr('email', 'এই ইমেইল দিয়ে আগেই account আছে');
  } else if (msg.includes('signup')) {
    showToast('Registration বন্ধ আছে, Admin এর সাথে যোগাযোগ করুন');
  } else {
    showErr('email', err.message || 'কিছু একটা সমস্যা হয়েছে');
  }
}


// ── Success overlay ─────────────────────────────────────────────────────────
function showSuccess(name, needsEmailVerify = true) {
  const overlay = document.createElement('div');
  overlay.id = 'reg-success-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(10,5,20,0.92);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const verifyNote = needsEmailVerify
    ? `<div style="
        background: rgba(124,58,237,0.12);
        border: 1px solid rgba(124,58,237,0.3);
        border-radius: 8px;
        padding: 10px 14px;
        margin: 12px 0 20px;
        font-size: 12.5px;
        color: rgba(255,255,255,0.6);
        line-height: 1.6;
      ">
        📧 <strong style="color:rgba(255,255,255,0.85);">${name.split(' ')[0]}</strong>,
        আপনার inbox এ একটি verification email পাঠানো হয়েছে।<br>
        Email verify করার পর login করতে পারবেন।
      </div>`
    : `<div style="
        background: rgba(34,197,94,0.1);
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 8px;
        padding: 10px 14px;
        margin: 12px 0 20px;
        font-size: 12.5px;
        color: rgba(255,255,255,0.6);
      ">
        ✅ Account সফলভাবে তৈরি হয়েছে! এখন dashboard এ যেতে পারবেন।
      </div>`;

  overlay.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #0d1b3e, #111e3f);
      border: 1px solid rgba(124,58,237,0.35);
      border-radius: 20px;
      padding: 3rem 2.5rem;
      text-align: center;
      max-width: 360px;
      width: 100%;
      animation: popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow: 0 0 80px rgba(124,58,237,0.2), 0 0 0 1px rgba(255,255,255,0.04);
    ">
      <div style="font-size:56px;margin-bottom:1rem;line-height:1;">🎉</div>
      <div style="font-size:21px;font-weight:700;color:white;margin-bottom:6px;letter-spacing:-0.3px;">
        Account তৈরি হয়েছে!
      </div>
      <div style="font-size:14px;color:rgba(255,255,255,0.45);margin-bottom:4px;">
        স্বাগতম, <strong style="color:rgba(255,255,255,0.85);">${name}</strong>
      </div>

      ${verifyNote}

      <button
        onclick="goToDashboard()"
        style="
          width: 100%;
          padding: 13px 28px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          font-size: 14.5px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.2px;
        "
        onmouseover="this.style.opacity='0.85';this.style.transform='translateY(-1px)'"
        onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'"
      >
        ${needsEmailVerify ? 'Login পেজে যান →' : 'Dashboard এ যান →'}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Overlay click করে close করা যাবে না (intentional)
  // keyboard escape দিয়ে close করা যাবে না (intentional — redirect enforce করতে)
}


// ── Dashboard / Login redirect ──────────────────────────────────────────────
async function goToDashboard() {
  // Email confirmation ON → login page এ পাঠাও
  if (EMAIL_CONFIRM_ENABLED) {
    const redirect = sessionStorage.getItem('scriptora_redirect');
    sessionStorage.removeItem('scriptora_redirect');
    window.location.href = redirect === 'payment'
      ? '../Payment page/payment.html'
      : '../Login page/login.html';
    return;
  }

  // Email confirmation OFF → session check করে dashboard এ যাও
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = '../Login page/login.html';
    return;
  }

  const redirect = sessionStorage.getItem('scriptora_redirect');
  sessionStorage.removeItem('scriptora_redirect');

  if (redirect === 'payment') {
    window.location.href = '../Payment page/payment.html';
  } else {
    window.location.href = '../Client Dashbaord/dashboard.html';
  }
}


// ── keyframe animation inject ────────────────────────────────────────────────
(function injectStyles() {
  if (document.getElementById('reg-styles')) return; // double inject বন্ধ
  const style = document.createElement('style');
  style.id = 'reg-styles';
  style.textContent = `
    @keyframes popIn {
      from { transform: scale(0.85); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }
    @keyframes toastIn {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();


// ── Input এ typing শুরু হলে error clear ────────────────────────────────────
['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => clearErr(id));
});


// ── Enter key দিয়ে submit ────────────────────────────────────────────────────
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const active = document.activeElement?.tagName;
    // Textarea তে Enter চাপলে submit হবে না
    if (active !== 'TEXTAREA') {
      handleRegister();
    }
  }
});


// Session check removed — register page loads always
