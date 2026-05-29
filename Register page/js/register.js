/* ========================
   SCRIPTORA — register.js
   ======================== */

function togglePass(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.style.color = 'rgba(255,255,255,0.75)';
  } else {
    inp.type = 'password';
    btn.style.color = 'rgba(255,255,255,0.3)';
  }
}

// Password strength
document.getElementById('password').addEventListener('input', function () {
  const val = this.value;
  const hint = document.getElementById('passStrength');
  if (!val) { hint.textContent = ''; hint.className = 'pass-strength'; return; }
  const score = [val.length >= 8, /[A-Z]/.test(val), /[0-9]/.test(val), /[^A-Za-z0-9]/.test(val)].filter(Boolean).length;
  if (score <= 1) { hint.textContent = '● Weak password'; hint.className = 'pass-strength weak'; }
  else if (score <= 3) { hint.textContent = '●● Medium password'; hint.className = 'pass-strength medium'; }
  else { hint.textContent = '●●● Strong password'; hint.className = 'pass-strength strong'; }
});

// Confirm match
document.getElementById('confirmPassword').addEventListener('input', function () {
  const pass = document.getElementById('password').value;
  const err = document.getElementById('err-confirm');
  if (this.value && pass !== this.value) {
    err.textContent = 'পাসওয়ার্ড মিলছে না';
    this.classList.add('invalid');
  } else {
    err.textContent = '';
    this.classList.remove('invalid');
    if (this.value) this.classList.add('valid');
  }
});

function showErr(id, msg) {
  const el = document.getElementById('err-' + id);
  if (el) el.textContent = msg;
  const inp = document.getElementById(id);
  if (inp) { inp.classList.add('invalid'); inp.classList.remove('valid'); }
}
function clearErr(id) {
  const el = document.getElementById('err-' + id);
  if (el) el.textContent = '';
  const inp = document.getElementById(id);
  if (inp) inp.classList.remove('invalid');
}

function handleRegister() {
  let valid = true;

  // First Name
  const firstName = document.getElementById('firstName').value.trim();
  clearErr('firstName');
  if (!firstName) { showErr('firstName', 'প্রথম নাম দিন'); valid = false; }
  else document.getElementById('firstName').classList.add('valid');

  // Last Name
  const lastName = document.getElementById('lastName').value.trim();
  clearErr('lastName');
  if (!lastName) { showErr('lastName', 'শেষ নাম দিন'); valid = false; }
  else document.getElementById('lastName').classList.add('valid');

  // Email
  const email = document.getElementById('email').value.trim();
  clearErr('email');
  if (!email) { showErr('email', 'ইমেইল দিন'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('email', 'সঠিক ইমেইল দিন'); valid = false; }
  else document.getElementById('email').classList.add('valid');

  // Phone
  const phone = document.getElementById('phone').value.trim();
  clearErr('phone');
  if (!phone) { showErr('phone', 'ফোন নম্বর দিন'); valid = false; }
  else if (!/^1[3-9]\d{8}$/.test(phone.replace(/\s|-/g,''))) { showErr('phone', 'সঠিক নম্বর দিন (1XXXXXXXXX)'); valid = false; }
  else document.getElementById('phone').classList.add('valid');

  // Password
  const pass = document.getElementById('password').value;
  clearErr('password');
  if (!pass) { showErr('password', 'পাসওয়ার্ড দিন'); valid = false; }
  else if (pass.length < 8) { showErr('password', 'কমপক্ষে ৮ অক্ষর হতে হবে'); valid = false; }
  else document.getElementById('password').classList.add('valid');

  // Confirm
  const conf = document.getElementById('confirmPassword').value;
  clearErr('confirm');
  if (!conf) { showErr('confirm', 'পাসওয়ার্ড নিশ্চিত করুন'); valid = false; }
  else if (pass !== conf) { showErr('confirm', 'পাসওয়ার্ড মিলছে না'); valid = false; }

  // Terms
  const terms = document.getElementById('termsCheck').checked;
  document.getElementById('err-terms').textContent = terms ? '' : 'Terms এ সম্মত হতে হবে';
  if (!terms) valid = false;

  if (!valid) return;

  // Loading
  document.getElementById('btnText').style.display = 'none';
  document.getElementById('btnSpinner').style.display = 'inline-block';
  document.getElementById('submitBtn').disabled = true;

  setTimeout(() => {
    document.getElementById('btnText').style.display = 'inline';
    document.getElementById('btnSpinner').style.display = 'none';
    document.getElementById('submitBtn').disabled = false;
    showSuccess(firstName + ' ' + lastName);
  }, 1600);
}

function showSuccess(name) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,5,20,0.9);backdrop-filter:blur(8px);z-index:999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:#111e3f;border:1px solid rgba(124,58,237,0.3);border-radius:20px;padding:3rem 2.5rem;text-align:center;max-width:340px;animation:popIn 0.3s ease;">
      <div style="font-size:52px;margin-bottom:1rem;">🎉</div>
      <div style="font-size:20px;font-weight:700;color:white;margin-bottom:8px;">Account তৈরি হয়েছে!</div>
      <div style="font-size:13.5px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:1.5rem;">স্বাগতম, <strong style="color:white;">${name}</strong>!<br>আপনার account সফলভাবে তৈরি হয়েছে।</div>
      <button onclick="window.location.href='../Login page/login.html'" style="padding:11px 28px;border-radius:10px;border:none;background:#7c3aed;color:white;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;">Login করুন →</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

const style = document.createElement('style');
style.textContent = `@keyframes popIn { from { transform:scale(0.88);opacity:0; } to { transform:scale(1);opacity:1; } }`;
document.head.appendChild(style);

['firstName','lastName','email','phone','password'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => clearErr(id));
});
