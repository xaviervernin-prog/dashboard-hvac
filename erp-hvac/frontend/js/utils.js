'use strict';

// ---- Formatting ----
function fmtAED(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(+n || 0) + ' AED';
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDatetime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDateInput(d) {
  if (!d) return '';
  return d.slice(0, 10);
}

function clientNom(c) {
  if (!c) return '—';
  return c.type === 'particulier' || c.type === 'copropriete'
    ? [c.prenom, c.nom].filter(Boolean).join(' ')
    : (c.entreprise || c.nom);
}

function escape(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Badges ----
const STATUT_DEVIS = {
  brouillon: ['gy','Brouillon'], envoye: ['bg','Envoyé'], accepte: ['gr','Accepté'],
  refuse: ['re','Refusé'], expire: ['or','Expiré'],
};
const STATUT_FACTURE = {
  brouillon: ['gy','Brouillon'], envoyee: ['bg','Envoyée'], partiellement_payee: ['ye','Partiel'],
  payee: ['gr','Payée'], en_retard: ['re','En retard'], annulee: ['gy','Annulée'],
};
const STATUT_INTERVENTION = {
  planifiee: ['bg','Planifiée'], en_cours: ['ye','En cours'], terminee: ['gr','Terminée'], annulee: ['gy','Annulée'],
};
const TYPE_INTERVENTION = {
  installation: ['pu','Installation'], maintenance: ['bg','Maintenance'],
  depannage: ['or','Dépannage'], renovation: ['ye','Rénovation'],
};

function badge(cls, label) {
  return `<span class="badge ${cls}">${escape(label)}</span>`;
}
function badgeDevis(s)        { const [c,l] = STATUT_DEVIS[s] || ['gy',s];        return badge(c,l); }
function badgeFacture(s)      { const [c,l] = STATUT_FACTURE[s] || ['gy',s];      return badge(c,l); }
function badgeIntervention(s) { const [c,l] = STATUT_INTERVENTION[s] || ['gy',s]; return badge(c,l); }
function typeIntervention(s)  { const [c,l] = TYPE_INTERVENTION[s] || ['gy',s];   return badge(c,l); }

// ---- Toast ----
function toast(msg, type = 'default') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success:'✅', error:'❌', warning:'⚠️', default:'ℹ️' };
  el.innerHTML = `<span>${icons[type] || ''}</span><span>${escape(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove());
  }, 3500);
}

// ---- Modal helpers ----
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.querySelector('.modal')?.scrollTo(0,0); }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ---- Loading state ----
function loadingRow(colspan) {
  return `<tr class="loading-row"><td colspan="${colspan}"><div class="spinner"></div> Chargement…</td></tr>`;
}
function emptyRow(colspan, msg = 'Aucun résultat') {
  return `<tr><td colspan="${colspan}" class="no-results">${msg}</td></tr>`;
}

// ---- Today formatted ----
function todayStr() {
  return new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(new Date());
}
