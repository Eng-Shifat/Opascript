function switchTab(name, btn) {
  document.querySelectorAll('.odp-tab').forEach(t => t.classList.remove('odp-active'));
  document.querySelectorAll('.odp-pane').forEach(p => p.classList.remove('odp-pane-active'));
  btn.classList.add('odp-active');
  document.getElementById('pane-' + name).classList.add('odp-pane-active');
  if (name === 'revisions' && typeof window._loadRevisions === 'function') {
    window._loadRevisions();
  }
}
