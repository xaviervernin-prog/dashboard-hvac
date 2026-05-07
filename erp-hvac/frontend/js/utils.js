function fmt(n) {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' AED';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function isOverdue(dateStr) {
  return dateStr && new Date(dateStr) < new Date();
}

function badge(text, cls) {
  return `<span class="badge ${cls}">${text}</span>`;
}

function statutDevis(s) {
  const map = { brouillon: ['gy','Brouillon'], en_attente: ['ye','En attente'], accepte: ['gr','Accepté'], refuse: ['re','Refusé'], expire: ['or','Expiré'] };
  const [cls, lbl] = map[s] || ['gy', s];
  return badge(lbl, cls);
}

function statutFacture(s) {
  const map = { brouillon: ['gy','Brouillon'], en_attente: ['ye','En attente'], partielle: ['or','Partielle'], payee: ['gr','Payée'], annulee: ['re','Annulée'] };
  const [cls, lbl] = map[s] || ['gy', s];
  return badge(lbl, cls);
}

function statutIntervention(s) {
  const map = { planifiee: ['bg','Planifiée'], en_cours: ['or','En cours'], terminee: ['gr','Terminée'], annulee: ['re','Annulée'] };
  const [cls, lbl] = map[s] || ['gy', s];
  return badge(lbl, cls);
}

function statutClient(s) {
  const map = { prospect: ['ye','Prospect'], actif: ['gr','Actif'], inactif: ['gy','Inactif'] };
  const [cls, lbl] = map[s] || ['gy', s];
  return badge(lbl, cls);
}

function clientNom(c) {
  if (!c) return '—';
  const parts = [c.entreprise || '', `${c.prenom || ''} ${c.nom || ''}`.trim()].filter(Boolean);
  return parts.join(' — ') || '—';
}

function showToast(msg, type = '') {
  const container = document.getElementById('toast');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function openModal(id) {
  document.getElementById('overlay').classList.add('open');
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById('overlay').classList.remove('open');
  if (id) document.getElementById(id).classList.remove('open');
  else document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
