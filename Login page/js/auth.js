// =====================
// SCRIPTORA - auth.js
// Login page JavaScript
// =====================

document.addEventListener('DOMContentLoaded', function () {

  // ---- Password show/hide toggle ----
  const eyeBtn    = document.getElementById('eyeBtn');
  const passInput = document.getElementById('password');
  const eyeIcon   = document.getElementById('eyeIcon');

  const eyeOffPath = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  const eyeOnPath  = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;

  let passVisible = false;
  if (eyeBtn) {
    eyeBtn.addEventListener('click', () => {
      passVisible = !passVisible;
      passInput.type = passVisible ? 'text' : 'password';
      eyeIcon.innerHTML = passVisible ? eyeOffPath : eyeOnPath;
    });
  }

  // ---- Type করলে error সরে যাবে ----
  const emailInp = document.getElementById('email');
  const passInp  = document.getElementById('password');

  if (emailInp) {
    emailInp.addEventListener('input', () => {
      showError('emailError', '');
      emailInp.classList.remove('input-error');
    });
  }
  if (passInp) {
    passInp.addEventListener('input', () => {
      showError('passError', '');
      passInp.classList.remove('input-error');
    });
  }

  // ---- Enter key দিয়ে login ----
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

});

// ---- Admin emails ----
const ADMIN_EMAILS = ['admin@scriptora.com', 'hello@scriptora.com'];

// ---- Error show/hide ----
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
  const e = document.getElementById('email');
  const p = document.getElementById('password');
  if (e) e.classList.remove('input-error');
  if (p) p.classList.remove('input-error');
}

// ---- Login handler ----
function handleLogin() {
  clearErrors();
  const email = document.getElementById('email').value.trim();
  const pass  = document.getElementById('password').value;
  let valid = true;

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

  document.getElementById('loginBtnText').style.display = 'none';
  document.getElementById('loginSpinner').style.display = 'inline-block';
  document.getElementById('loginBtn').disabled = true;

  setTimeout(() => {
    document.getElementById('loginBtnText').style.display = 'inline';
    document.getElementById('loginSpinner').style.display = 'none';
    document.getElementById('loginBtn').disabled = false;

    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      window.location.href = 'admin-dashboard.html';
    } else {
      const authError = document.getElementById('authError');
      authError.textContent = 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।';
      authError.style.display = 'flex';
    }
  }, 1400);
}

// ---- Google Login ----
function handleGoogleLogin() {
  alert("Google Login শীঘ্রই আসছে! Site deploy করার পর activate হবে।");
}

// ---- WhatsApp ----
function handleWhatsApp() {
  const waNumber = '8801XXXXXXXXX';
  const msg = encodeURIComponent('আমি Scriptora-তে login করতে চাই।');
  window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank');
}
