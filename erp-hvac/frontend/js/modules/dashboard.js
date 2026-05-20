async function loadDashboard() {
  const panel = document.getElementById('tab-dashboard');
  panel.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement…</div>';

  try {
    const stats = await api.get('/dashboard');
    panel.innerHTML = `
      <h2 class="page-title">Tableau de bord</h2>
      <div class="stats-row">
        <div class="stat-card">
          <div class="lbl">CA ce mois</div>
          <div class="val" style="color:var(--green)">${fmt(stats.ca_mois)}</div>
          <div class="sub">Factures payées</div>
        </div>
        <div class="stat-card">
          <div class="lbl">Devis en attente</div>
          <div class="val" style="color:var(--yellow)">${stats.devis_en_attente}</div>
          <div class="sub">À relancer</div>
        </div>
        <div class="stat-card">
          <div class="lbl">Interventions aujourd'hui</div>
          <div class="val" style="color:var(--blue)">${stats.interventions_aujourd_hui}</div>
          <div class="sub">Planifiées</div>
        </div>
        <div class="stat-card">
          <div class="lbl">Factures en retard</div>
          <div class="val" style="color:${stats.factures_en_retard > 0 ? 'var(--red)' : 'var(--green)'}">${stats.factures_en_retard}</div>
          <div class="sub">Échéances dépassées</div>
        </div>
        <div class="stat-card">
          <div class="lbl">Stock critique</div>
          <div class="val" style="color:${stats.stock_alertes > 0 ? 'var(--orange)' : 'var(--green)'}">${stats.stock_alertes}</div>
          <div class="sub">Articles sous seuil</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px">
        <div class="table-card" style="padding:16px">
          <h3 style="font-size:13px;font-weight:600;margin-bottom:10px">Actions rapides</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-p" onclick="switchTab('devis')">+ Nouveau devis</button>
            <button class="btn-p gray" onclick="switchTab('agenda')">📅 Planifier intervention</button>
            <button class="btn-p gray" onclick="switchTab('clients')">👤 Nouveau client</button>
          </div>
        </div>
        <div class="table-card" style="padding:16px">
          <h3 style="font-size:13px;font-weight:600;margin-bottom:10px">Raccourcis</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-p gray" onclick="switchTab('factures')">💰 Voir les factures</button>
            <button class="btn-p gray" onclick="switchTab('articles')">🔧 Gérer le stock</button>
            <button class="btn-p gray" onclick="switchTab('marketing')">📣 CRM & Marketing</button>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    panel.innerHTML = `<div class="alert error">Impossible de charger le tableau de bord : ${escapeHtml(err.message)}</div>`;
  }
}
