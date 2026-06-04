window.addEventListener('DOMContentLoaded', () => {
  const user     = JSON.parse(localStorage.getItem('scriptora_user') || '{}');
  const name     = user.name  || 'Rahim';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  setText('sbName',       name);
  setText('sbEmail',      user.email || 'rahim@email.com');
  setText('sbAvatar',     initials);
  setText('mobileAvatar', initials);
  setText('headerName',   name.split(' ')[0]);
  setText('headerAvatar', initials);

  startCountdown('2026-06-20', 'cd1D','cd1H','cd1M','cd1S');
  startCountdown('2026-07-03', 'cd2D','cd2H','cd2M','cd2S');
});

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function pad(n)           { return String(n).padStart(2, '0'); }

function startCountdown(dateStr, dId, hId, mId, sId) {
  const target = new Date(dateStr);
  target.setHours(23, 59, 59, 0);
  (function tick() {
    const diff = target - new Date();
    if (diff <= 0) return [dId,hId,mId,sId].forEach(id => setText(id,'00'));
    setText(dId, pad(Math.floor(diff / 86400000)));
    setText(hId, pad(Math.floor((diff % 86400000) / 3600000)));
    setText(mId, pad(Math.floor((diff % 3600000)  / 60000)));
    setText(sId, pad(Math.floor((diff % 60000)    / 1000)));
    setTimeout(tick, 1000);
  })();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay')?.classList.toggle('show');
}

/* ── SIDEBAR INJECT ── */
(function() {
  const NAV = [
    { href:'dashboard.html', label:'Dashboard', svg:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' },
    { href:'orders.html',    label:'আমার Order', svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>', badge:'sbOrderBadge', badgeVal:'3' },
    { href:'downloads.html', label:'Downloads',   svg:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' },
    { divider: true },
    { href:'profile.html',   label:'Profile',     svg:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
    { href:'help.html',      label:'সাহায্য',     svg:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
  ];
  const cur = location.pathname.split('/').pop() || 'dashboard.html';
  const icon = (d) => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
  const navHTML = NAV.map(n => {
    if (n.divider) return '<div class="sb-divider"></div>';
    const active = cur === n.href ? ' active' : '';
    const badge  = n.badge ? `<span class="sb-badge" id="${n.badge}">${n.badgeVal}</span>` : '';
    return `<a href="${n.href}" class="sb-link${active}">${icon(n.svg)} ${n.label}${badge}</a>`;
  }).join('');

  const sidebarHTML = `
<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>
<aside class="sidebar" id="sidebar">
  <div class="sb-logo"><div class="logo-icon">S</div><span>Scriptora</span></div>
  <nav class="sb-nav">${navHTML}</nav>
  <div class="sb-bottom">
    <div class="sb-user">
      <div class="sb-avatar" id="sbAvatar">RH</div>
      <div class="sb-userinfo">
        <div class="sb-name" id="sbName">Rahim</div>
        <div class="sb-email" id="sbEmail">rahim@email.com</div>
      </div>
    </div>
    <button class="sb-logout" onclick="window.location.href='../Login page/login.html'">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Logout
    </button>
  </div>
</aside>
<div class="mobile-topbar">
  <button class="menu-btn" onclick="toggleSidebar()">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  </button>
  <div class="mobile-logo"><div class="logo-icon">S</div> Scriptora</div>
  <div class="sb-avatar sm" id="mobileAvatar">RH</div>
</div>`;

  const mount = document.getElementById('sidebarMount');
  if (mount) mount.outerHTML = sidebarHTML;
})();
