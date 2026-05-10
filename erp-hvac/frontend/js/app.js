'use strict';

// ---- Auth guard ----
const _user = (() => {
  const token = localStorage.getItem('erp_token');
  if (!token) { window.location.href = 'index.html'; return null; }
  try { return JSON.parse(localStorage.getItem('erp_user') || '{}'); } catch { return {}; }
})();

if (!_user) throw new Error('Not authenticated');

// ---- Init UI ----
document.getElementById('topbar-date').textContent = todayStr();
document.getElementById('avatar-btn').textContent = (_user.prenom?.[0] || '') + (_user.nom?.[0] || '?');
document.getElementById('avatar-btn').title = `${_user.prenom || ''} ${_user.nom || ''} — ${_user.role}`;

// ---- Role-based nav visibility ----
document.querySelectorAll('[data-roles]').forEach(el => {
  const allowed = el.dataset.roles.split(',');
  if (!allowed.includes(_user.role)) el.style.display = 'none';
});

// ---- Logout on long-press avatar ----
let avatarTimer;
document.getElementById('avatar-btn').addEventListener('mousedown', () => {
  avatarTimer = setTimeout(() => {
    if (confirm('Se déconnecter ?')) api.logout();
  }, 1200);
});
document.getElementById('avatar-btn').addEventListener('mouseup', () => clearTimeout(avatarTimer));

// ---- Tab navigation ----
const tabs = {};
let activeTab = 'dashboard';

function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById(`tab-${name}`);
  const btn   = document.querySelector(`.nav-item[data-tab="${name}"]`);
  if (!panel) return;
  panel.classList.add('active');
  if (btn) btn.classList.add('active');
  activeTab = name;
  if (!tabs[name]) {
    tabs[name] = true;
    const loader = window[`init_${name}`];
    if (typeof loader === 'function') loader(panel, _user);
  }
}

document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ---- Init dashboard ----
switchTab('dashboard');

// ---- Notification bell ----
const bellBtn  = document.getElementById('bell-btn');
const notifPanel = document.getElementById('notif-panel');
const notifClose = document.getElementById('notif-close');
bellBtn.addEventListener('click', (e) => { e.stopPropagation(); notifPanel.classList.toggle('open'); });
notifClose.addEventListener('click', () => notifPanel.classList.remove('open'));
document.addEventListener('click', (e) => {
  if (!notifPanel.contains(e.target) && e.target !== bellBtn) notifPanel.classList.remove('open');
});

// ---- Expose switchTab globally for inter-module navigation ----
window.switchTab = switchTab;
window._user = _user;
