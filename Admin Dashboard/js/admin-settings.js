/* ═══════════════════════════════════════════
   SCRIPTORA — Admin Settings
   admin-settings.js
═══════════════════════════════════════════ */
'use strict';

/* ── Init ── */
document.addEventListener('DOMContentLoaded', async () => {
  const sb = window.scriptoraSupabase;
  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      document.getElementById('s-email').value = session.user.email || '';
    }
  }
  loadSaved();
});

/* ── Load saved settings from localStorage ── */
function loadSaved() {
  const d = JSON.parse(localStorage.getItem('scriptora_admin_settings') || '{}');
  if (d.displayName)  setVal('s-display-name',  d.displayName);
  if (d.phone)        setVal('s-phone',          d.phone);
  if (d.platformName) setVal('s-platform-name',  d.platformName);
  if (d.contactEmail) setVal('s-contact-email',  d.contactEmail);
  if (d.waNumber)     setVal('s-wa-number',       d.waNumber);
  if (d.monthlyGoal)  setVal('s-monthly-goal',    d.monthlyGoal);

  ['new-order', 'payment', 'message', 'overdue'].forEach(k => {
    const el = document.getElementById('n-' + k);
    if (el && d['notif_' + k] !== undefined) el.checked = d['notif_' + k];
  });
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && !el.value) el.value = val;
}

/* ── Save Profile ── */
async function saveProfile() {
  persist({
    displayName: getVal('s-display-name'),
    phone:       getVal('s-phone'),
  });
  showMsg('profile-msg', 'ok', '✓ Saved');
  toast('✅ Profile updated!', '#34d399');
}

/* ── Change Password ── */
async function changePassword() {
  const pw1 = getVal('s-new-pw');
  const pw2 = getVal('s-confirm-pw');

  if (!pw1)          return showMsg('pw-msg', 'err', '⚠ Password দিন');
  if (pw1.length < 8) return showMsg('pw-msg', 'err', '⚠ কমপক্ষে ৮ character');
  if (pw1 !== pw2)   return showMsg('pw-msg', 'err', '⚠ Password মিলছে না');

  const btn = document.getElementById('pw-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i> Updating...';

  try {
    const sb = window.scriptoraSupabase;
    if (!sb) throw new Error('Supabase connected নয়');
    const { error } = await sb.auth.updateUser({ password: pw1 });
    if (error) throw error;
    showMsg('pw-msg', 'ok', '✓ Password updated!');
    toast('✅ Password পরিবর্তন হয়েছে!', '#34d399');
    document.getElementById('s-new-pw').value    = '';
    document.getElementById('s-confirm-pw').value = '';
  } catch (e) {
    showMsg('pw-msg', 'err', '❌ ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-refresh"></i> Update Password';
  }
}

/* ── Save Business Settings ── */
function saveBizSettings() {
  persist({
    platformName:  getVal('s-platform-name'),
    contactEmail:  getVal('s-contact-email'),
    waNumber:      getVal('s-wa-number'),
    monthlyGoal:   getVal('s-monthly-goal'),
  });
  showMsg('biz-msg', 'ok', '✓ Saved');
  toast('✅ Business settings saved!', '#34d399');
}

/* ── Save Notification Settings ── */
function saveNotifSettings() {
  const d = {};
  ['new-order', 'payment', 'message', 'overdue'].forEach(k => {
    d['notif_' + k] = document.getElementById('n-' + k).checked;
  });
  persist(d);
  showMsg('notif-msg', 'ok', '✓ Saved');
  toast('✅ Notification settings updated!', '#34d399');
}

/* ── Helpers ── */
function getVal(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function persist(obj) {
  const cur = JSON.parse(localStorage.getItem('scriptora_admin_settings') || '{}');
  localStorage.setItem('scriptora_admin_settings', JSON.stringify({ ...cur, ...obj }));
}

function togglePw(id, icon) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
  icon.classList.toggle('ti-eye');
  icon.classList.toggle('ti-eye-off');
}

function showMsg(id, type, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'stg-inline-msg ' + type;
  el.textContent = msg;
  setTimeout(() => { el.className = 'stg-inline-msg'; el.textContent = ''; }, 3500);
}

function toast(msg, color = '#34d399') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.style.cssText = `background:${color};color:#fff;padding:12px 18px;border-radius:10px;font-size:.82rem;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.3);`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
