/* Core app — navigation, shared UI, helpers */

const TABS = ['agenda', 'clients', 'articles', 'devis', 'facturation'];
const today = new Date().toISOString().split('T')[0];
let notifPanelOpen = false;

// --- Helpers ---
function sv(id, v) { const el = document.getElementById(id); if (el) el.value = (v == null) ? '' : v; }
function gv(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function fmt(n) { return Number(n).toLocaleString('fr-FR'); }
function dStr(d) { return d.toISOString().split('T')[0]; }
function fmtDate(s) { if (!s) return ''; const p = s.split('-'); return p[2] + '/' + p[1]; }
function daysBetween(s1, s2) { return Math.floor((new Date(s2) - new Date(s1)) / (86400000)); }

function toast(msg, isError = false) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (isError) el.style.background = '#dc2626';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

async function withLoading(el, fn) {
  el.classList.add('loading');
  try { await fn(); } finally { el.classList.remove('loading'); }
}

// --- Navigation ---
function switchTab(n) {
  TABS.forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === n);
  });
  document.querySelectorAll('.nav-item').forEach((b, i) => b.classList.toggle('active', TABS[i] === n));
  document.querySelectorAll('.bottom-nav button').forEach((b, i) => b.classList.toggle('active', TABS[i] === n));
  if (n === 'agenda') window.AgendaModule && AgendaModule.load();
  if (n === 'clients') window.ClientsModule && ClientsModule.load();
  if (n === 'articles') window.ArticlesModule && ArticlesModule.load();
  if (n === 'devis') window.DevisModule && DevisModule.load();
  if (n === 'facturation') window.FacturationModule && FacturationModule.load();
}

// --- Overlays ---
function closeOv(t) { document.getElementById('ov-' + t).classList.remove('open'); }
document.querySelectorAll('.overlay,.det-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// --- Badges ---
function bC(s) { const m = { actif: 'gr', prospect: 'ye', inactif: 'gy' }, l = { actif: 'Actif', prospect: 'Prospect', inactif: 'Inactif' }; return `<span class="badge ${m[s] || 'gy'}">${l[s] || s}</span>`; }
function bD(s) { const m = { brouillon: 'gy', envoye: 'ye', accepte: 'gr', refuse: 're' }, l = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé' }; return `<span class="badge ${m[s] || 'gy'}">${l[s] || s}</span>`; }
function bI(s) { const m = { planifie: 'bg', en_cours: 'ye', termine: 'gr', annule: 'gy' }, l = { planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' }; return `<span class="badge ${m[s] || 'gy'}">${l[s] || s}</span>`; }
function bF(s) { const m = { en_attente: 'bg', payee: 'gr', en_retard: 're', annulee: 'gy' }, l = { en_attente: 'En attente', payee: 'Payée', en_retard: 'En retard', annulee: 'Annulée' }; return `<span class="badge ${m[s] || 'gy'}">${l[s] || s}</span>`; }

// --- Filter toggle ---
function toggleFilters(name) {
  const fb = document.getElementById('fb-' + name);
  if (!fb) return;
  fb.style.display = fb.style.display !== 'none' ? 'none' : 'flex';
}
function updateFilterBtn(name) {
  const btn = document.getElementById('ft-' + name);
  if (!btn) return;
  const q = (document.getElementById('fq-' + name) || { value: '' }).value;
  const st = (document.getElementById('fs-' + name) || { value: '' }).value;
  btn.classList.toggle('has-active', !!(q || st));
}

// --- Notification panel ---
function toggleNotifPanel(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('notif-panel');
  notifPanelOpen = !notifPanelOpen;
  panel.style.display = notifPanelOpen ? 'block' : 'none';
}
document.addEventListener('click', () => {
  if (notifPanelOpen) {
    notifPanelOpen = false;
    const panel = document.getElementById('notif-panel');
    if (panel) panel.style.display = 'none';
  }
});

// --- Date header ---
try {
  document.getElementById('hDate').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('tph-date').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
} catch (_) {}

// --- Service Worker (PWA) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch(() => {});
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  AgendaModule.load();
});
