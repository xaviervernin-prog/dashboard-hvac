'use strict';

async function init_dashboard(panel) {
  panel.innerHTML = `
    <h2 class="page-title">Tableau de bord</h2>
    <div class="stats-row" id="db-stats">
      ${['','','',''].map(() => `<div class="stat-card"><div class="lbl">…</div><div class="val"><div class="spinner"></div></div></div>`).join('')}
    </div>
    <div id="db-today"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;" id="db-bottom">
      <div id="db-retard"></div>
      <div id="db-stock"></div>
    </div>
  `;

  try {
    const s = await api.get('/dashboard/stats');

    // KPI cards
    document.getElementById('db-stats').innerHTML = `
      <div class="stat-card" onclick="switchTab('devis')">
        <div class="lbl">Devis en attente</div>
        <div class="val">${s.devis_en_attente}</div>
        <div class="sub">En attente de réponse</div>
      </div>
      <div class="stat-card" onclick="switchTab('interventions')">
        <div class="lbl">Interventions aujourd'hui</div>
        <div class="val">${s.interventions_aujourdhui}</div>
        <div class="sub">Planifiées / en cours</div>
      </div>
      <div class="stat-card" onclick="switchTab('factures')">
        <div class="lbl">Factures en retard</div>
        <div class="val ${s.factures_en_retard > 0 ? 're' : ''}">${s.factures_en_retard}</div>
        <div class="sub ${s.factures_en_retard > 0 ? 'sub danger' : ''}">
          ${s.factures_en_retard > 0 ? 'Action requise' : 'Tout est à jour'}
        </div>
      </div>
      <div class="stat-card">
        <div class="lbl">CA ce mois</div>
        <div class="val" style="font-size:18px">${fmtAED(s.ca_mois)}</div>
        <div class="sub">Factures payées</div>
      </div>
    `;

    // Today's interventions
    const todayEl = document.getElementById('db-today');
    if (s.interventions.length > 0) {
      todayEl.innerHTML = `
        <div class="today-plan">
          <div class="today-plan-hd">
            <span class="tph-label">Planning du jour</span>
            <span class="tph-date">${todayStr()}</span>
          </div>
          <div class="today-items">
            ${s.interventions.map(i => `
              <div class="today-item">
                <span class="ti-time">${fmtDatetime(i.date_debut).slice(11,16)}</span>
                <div class="ti-info">
                  <div class="ti-client">${escape(clientNom(i.clients))}</div>
                  <div class="ti-lieu">${escape(i.chantiers?.nom || i.description || '')}</div>
                </div>
                <span class="ti-badge">${typeIntervention(i.type)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      todayEl.innerHTML = `
        <div class="today-plan">
          <div class="today-plan-hd">
            <span class="tph-label">Planning du jour</span>
            <span class="tph-date">${todayStr()}</span>
          </div>
          <div class="notif-empty">Aucune intervention planifiée aujourd'hui</div>
        </div>
      `;
    }

    // Overdue invoices
    const retardEl = document.getElementById('db-retard');
    if (s.factures_retard.length > 0) {
      retardEl.innerHTML = `
        <div class="table-card">
          <div class="table-header"><h3>⚠️ Factures en retard</h3></div>
          <div class="tscroll">
            <table>
              <thead><tr><th>N°</th><th>Client</th><th>Montant</th><th>Échéance</th></tr></thead>
              <tbody>
                ${s.factures_retard.map(f => `
                  <tr onclick="switchTab('factures')">
                    <td><strong>${escape(f.numero)}</strong></td>
                    <td>${escape(clientNom(f.clients))}</td>
                    <td>${fmtAED(+f.total_ttc - +f.montant_paye)}</td>
                    <td>${fmtDate(f.date_echeance)} <span class="overdue-badge">RETARD</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      retardEl.innerHTML = '';
    }

    // Stock alerts
    const stockEl = document.getElementById('db-stock');
    if (s.alertes_stock.length > 0) {
      stockEl.innerHTML = `
        <div class="table-card">
          <div class="table-header"><h3>📦 Alertes stock</h3></div>
          <div class="tscroll">
            <table>
              <thead><tr><th>Ref.</th><th>Article</th><th>Stock</th><th>Min.</th></tr></thead>
              <tbody>
                ${s.alertes_stock.map(a => `
                  <tr onclick="switchTab('articles')">
                    <td class="td-muted">${escape(a.reference)}</td>
                    <td>${escape(a.designation)}</td>
                    <td class="re" style="font-weight:700">${a.stock_actuel}</td>
                    <td class="td-muted">${a.stock_minimum}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      stockEl.innerHTML = '';
    }

    // Update notification bell
    const total = s.factures_en_retard + s.alertes_stock.length;
    const badge = document.getElementById('bell-badge');
    if (total > 0) { badge.textContent = total; badge.classList.add('show'); }

  } catch (e) {
    panel.innerHTML += `<div class="alert-banner danger">Erreur de chargement : ${escape(e.message)}</div>`;
  }
}
