// Bootstrap — appelé au chargement de app.html
(function () {
  requireAuth();

  const user = getCurrentUser();

  // Initiales avatar
  const initEl = document.getElementById('avatar-initials');
  if (user && initEl) {
    initEl.textContent = ((user.prenom || '').charAt(0) + (user.nom || '').charAt(0)).toUpperCase() || '?';
  }

  // Date topbar
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // Filtrer sidebar selon rôle
  document.querySelectorAll('.nav-item[data-roles]').forEach(btn => {
    const roles = btn.dataset.roles.split(',');
    if (!hasRole(...roles)) btn.style.display = 'none';
  });

  // Navigation onglets
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Bell notifications
  document.getElementById('bell-btn').addEventListener('click', () => {
    document.getElementById('notif-panel').classList.toggle('open');
  });

  // Overlay ferme toutes les modals
  document.getElementById('overlay').addEventListener('click', () => closeModal());

  // Charger dashboard + notifications
  switchTab('dashboard');
  loadNotifications();

  // Service Worker PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();

let currentTab = 'dashboard';

function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-tab]').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById(`tab-${tab}`);
  const btn = document.querySelector(`.nav-item[data-tab="${tab}"]`);
  if (!panel) return;

  panel.classList.add('active');
  if (btn) btn.classList.add('active');
  currentTab = tab;

  // Charger le module si pas encore chargé
  switch (tab) {
    case 'dashboard': loadDashboard(); break;
    case 'clients':   loadClients(); break;
    case 'articles':  loadArticles(); break;
    case 'devis':     loadDevis(); break;
    case 'interventions': loadInterventions(); break;
    case 'factures':  loadFactures(); break;
    case 'rh':        loadRH(); break;
    case 'vehicules': loadVehicules(); break;
    default:
      if (!panel.dataset.loaded) {
        panel.innerHTML = `<div class="empty"><div class="empty-icon">🚧</div><p>Module en cours de développement (Phase suivante)</p></div>`;
        panel.dataset.loaded = '1';
      }
  }

  // Fermer notif panel
  document.getElementById('notif-panel').classList.remove('open');
}

async function loadNotifications() {
  try {
    const stats = await api.get('/dashboard');
    const items = [];

    if (stats.factures_en_retard > 0) {
      items.push({ type: 'urgent', msg: `${stats.factures_en_retard} facture(s) en retard de paiement` });
    }
    if (stats.stock_alertes > 0) {
      items.push({ type: 'warning', msg: `${stats.stock_alertes} article(s) en stock critique` });
    }

    const badge = document.getElementById('bell-badge');
    const list = document.getElementById('notif-list');

    if (items.length > 0) {
      badge.style.display = 'flex';
      badge.textContent = items.length;
      list.innerHTML = items.map(i =>
        `<div class="notif-item">
          <span class="notif-dot ${i.type}"></span>
          <span class="notif-msg">${escapeHtml(i.msg)}</span>
        </div>`
      ).join('');
    } else {
      badge.style.display = 'none';
      list.innerHTML = '<div class="notif-empty">Aucune notification</div>';
    }
  } catch (err) {
    console.error('Notifications:', err);
  }
}
