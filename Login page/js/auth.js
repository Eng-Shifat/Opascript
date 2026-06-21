/* ============================================
   SCRIPTORA — auth.js  (Supabase Auth version)
   ============================================
   HTML <head> এ আগে যোগ করো:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
   ============================================ */

// ── Supabase Client ──────────────────────────────────────────────────────
// ⚠️ এখানে আর createClient() কল করা হচ্ছে না — supabaseClient.js এ বানানো
// একমাত্র shared client-টাই reuse করা হচ্ছে (multiple GoTrueClient ইস্যু
// এড়ানোর জন্য, যেটা login ↔ admin loop-এর কারণ ছিল)।
const sb = window.scriptoraSupabase;

// ── Admin email ──────────────────────────────────────────────────────────
// এই email-টা Supabase Authentication → Users এ login দিয়েই admin হিসেবে
// গণ্য হবে (আলাদা password hardcode করা নিরাপদ না, তাই বাদ দেওয়া হয়েছে)।
const ADMIN_EMAIL = 'yeasinkabirshifat@gmail.com';


// ════════════════════════════════════════════════════════════════
//  DOM Ready
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async function () {

  // ── Already logged in? Redirect করো ──────────────────────────────────
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const isAdmin = session.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      if (isAdmin) { window.location.href = '../Admin Dashboard/admin.html'; return; }
      window.location.href = '../Client Dashboard/dashboard.html';
      return;
    }
  } catch (e) { /* ignore */ }

  // ── Password show/hide ────────────────────────────────────────────────
  const eyeBtn = document.getElementById('eyeBtn');
  const passInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');

  const eyeOffPath = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  const eyeOnPath = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;

  let passVisible = false;
  if (eyeBtn) {
    eyeBtn.addEventListener('click', () => {
      passVisible = !passVisible;
      passInput.type = passVisible ? 'text' : 'password';
      eyeIcon.innerHTML = passVisible ? eyeOffPath : eyeOnPath;
    });
  }

  // ── Input এ error clear ───────────────────────────────────────────────
  document.getElementById('email')?.addEventListener('input', () => {
    showError('emailError', '');
    document.getElementById('email').classList.remove('input-error');
  });

  document.getElementById('password')?.addEventListener('input', () => {
    showError('passError', '');
    document.getElementById('password').classList.remove('input-error');
  });

  // ── Enter key → login ─────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

});


// ════════════════════════════════════════════════════════════════
//  Helper Functions
// ════════════════════════════════════════════════════════════════
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function clearErrors() {
  ['emailError', 'passError', 'authError'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
  });
  document.getElementById('email')?.classList.remove('input-error');
  document.getElementById('password')?.classList.remove('input-error');
}

function setLoading(on) {
  if (on) {
    showScanning();
  } else {
    hideScanning();
  }
}

// Login submit হলে button circle-এ morph করে fingerprint scan দেখায়
function showScanning() {
  const btnText = document.getElementById('loginBtnText');
  const fp = document.getElementById('loginFingerprint');
  const check = document.getElementById('loginSuccessCheck');
  const btn = document.getElementById('loginBtn');

  if (btnText) btnText.style.display = 'none';
  if (check) check.style.display = 'none';
  if (fp) {
    fp.style.display = 'flex';
    fp.querySelector('.auth-fp-icon')?.classList.remove('fp-fade-out');
  }
  if (btn) {
    btn.classList.add('morph', 'scanning');
    btn.disabled = true;
  }
}

// Login fail হলে button আগের shape-এ ফিরে আসবে
function hideScanning() {
  const btnText = document.getElementById('loginBtnText');
  const fp = document.getElementById('loginFingerprint');
  const btn = document.getElementById('loginBtn');

  if (btnText) btnText.style.display = 'inline';
  if (fp) fp.style.display = 'none';
  if (btn) {
    btn.classList.remove('morph', 'scanning');
    btn.disabled = false;
  }
}

// Login সফল হলে fingerprint scan বন্ধ হয়ে blue tick draw হয়, তারপর redirect করে
function showLoginSuccess(redirectFn, delay = 750) {
  const fp = document.getElementById('loginFingerprint');
  const fpIcon = fp?.querySelector('.auth-fp-icon');
  const check = document.getElementById('loginSuccessCheck');
  const btn = document.getElementById('loginBtn');

  if (btn) {
    btn.classList.add('morph');
    btn.classList.remove('scanning'); // pulse বন্ধ, scan confirmed
    btn.disabled = true;
  }
  if (fpIcon) fpIcon.classList.add('fp-fade-out');

  setTimeout(() => {
    if (fp) fp.style.display = 'none';
    if (check) check.style.display = 'block';
  }, 200);

  setTimeout(redirectFn, delay);
}

function saveClientSession(user, name, email) {
  localStorage.setItem('scriptora_client_id', user.id);
  localStorage.setItem('scriptora_name', name || user.user_metadata?.full_name || '');
  localStorage.setItem('scriptora_email', email || user.email);
  localStorage.setItem('scriptora_role', 'client');
}

function redirectAfterLogin() {
  const redirect = sessionStorage.getItem('scriptora_redirect');
  if (redirect === 'payment') {
    sessionStorage.removeItem('scriptora_redirect');
    window.location.href = '../Payment page/payment.html';
  } else {
    window.location.href = '../Client Dashboard/dashboard.html';
  }
}


// ════════════════════════════════════════════════════════════════
//  Main Login Handler
// ════════════════════════════════════════════════════════════════
async function handleLogin() {
  clearErrors();

  const email = document.getElementById('email').value.trim().toLowerCase();
  const pass = document.getElementById('password').value;
  let valid = true;

  // ── Validation ────────────────────────────────────────────────────────
  if (!email) {
    showError('emailError', 'ইমেইল ঠিকানা দিন');
    document.getElementById('email').classList.add('input-error');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('emailError', 'সঠিক ইমেইল ফরম্যাট দিন');
    document.getElementById('email').classList.add('input-error');
    valid = false;
  }

  if (!pass) {
    showError('passError', 'পাসওয়ার্ড দিন');
    document.getElementById('password').classList.add('input-error');
    valid = false;
  } else if (pass.length < 6) {
    showError('passError', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
    document.getElementById('password').classList.add('input-error');
    valid = false;
  }

  if (!valid) return;

  setLoading(true);

  // ── REAL Supabase Auth login (admin ও client দুজনেই এই পথেই যাবে) ──────
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });

    if (error) {
      // Supabase error → বাংলা message
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
        showError('authError', 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।');
      } else if (error.message.includes('Email not confirmed')) {
        showError('authError', 'আপনার ইমেইল verify করা হয়নি। Inbox চেক করুন।');
      } else if (error.message.includes('Too many requests')) {
        showError('authError', 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।');
      } else {
        showError('authError', error.message || 'Login করা যাচ্ছে না।');
      }
      setLoading(false);
      return;
    }

    const authUser = data.user;

    // ── এই email-টা admin email কিনা চেক করুন ───────────────────────────
    if (authUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      localStorage.setItem('scriptora_role', 'admin');
      localStorage.setItem('scriptora_email', authUser.email);
      showLoginSuccess(() => { window.location.href = '../Admin Dashboard/admin.html'; });
      return;
    }

    // ── CLIENT — clients table থেকে name নিয়ে আসো ───────────────────────
    const { data: clientData } = await sb
      .from('clients')
      .select('name, email, phone')
      .eq('id', authUser.id)
      .single();

    saveClientSession(
      authUser,
      clientData?.name || authUser.user_metadata?.full_name,
      clientData?.email || authUser.email
    );

    showLoginSuccess(redirectAfterLogin);

  } catch (err) {
    console.error('Login error:', err);
    showError('authError', 'কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    setLoading(false);
  }
}


// ════════════════════════════════════════════════════════════════
//  Google OAuth Login
// ════════════════════════════════════════════════════════════════
async function handleGoogleLogin() {
  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/Client%20Dashbaord/dashboard.html',
      },
    });
    if (error) {
      showError('authError', 'Google Login এ সমস্যা হয়েছে।');
      console.error(error);
    }
    // Supabase নিজেই Google এ redirect করবে → callback এ dashboard
  } catch (err) {
    showError('authError', 'Google Login করা যাচ্ছে না।');
  }
}


// ════════════════════════════════════════════════════════════════
//  Forgot Password
// ════════════════════════════════════════════════════════════════
async function handleForgotPassword() {
  const email = document.getElementById('email')?.value.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('emailError', 'আগে সঠিক ইমেইল দিন, তারপর Forgot Password চাপুন');
    document.getElementById('email')?.classList.add('input-error');
    return;
  }

  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/Login Page/reset-password.html',
    });

    if (error) {
      showError('authError', 'Password reset email পাঠানো যায়নি।');
    } else {
      // Success toast
      showToast('✉️ Password reset email পাঠানো হয়েছে। Inbox চেক করুন।', 'success');
    }
  } catch (err) {
    showError('authError', 'কিছু একটা সমস্যা হয়েছে।');
  }
}


// ════════════════════════════════════════════════════════════════
//  WhatsApp Support
// ════════════════════════════════════════════════════════════════
function handleWhatsApp() {
  const msg = encodeURIComponent('আমি Scriptora-তে login করতে সমস্যায় পড়েছি। সাহায্য করুন।');
  window.open(`https://wa.me/8801XXXXXXXXX?text=${msg}`, '_blank');
}


// ════════════════════════════════════════════════════════════════
//  Toast Notification (success/error)
// ════════════════════════════════════════════════════════════════
function showToast(msg, type = 'success') {
  const existing = document.getElementById('scriptora-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'scriptora-toast';
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 9999;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    color: white;
    max-width: 320px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    animation: slideInToast 0.3s ease;
    background: ${type === 'success' ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#dc2626,#b91c1c)'};
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOutToast 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Toast animations
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideInToast {
    from { transform: translateX(110%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes fadeOutToast {
    from { opacity: 1; }
    to   { opacity: 0; transform: translateX(110%); }
  }
`;
document.head.appendChild(toastStyle);
