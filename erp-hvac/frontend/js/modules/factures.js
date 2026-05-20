let facturesData = [];
let clientsForFactures = [];

async function loadFactures(forceReload = true) {
  const panel = document.getElementById('tab-factures');
  if (!forceReload && facturesData.length) { renderFactures(); return; }

  panel.innerHTML = `
    <h2 class="page-title">Facturation</h2>
    <div id="factures-stats" class="stats-row" style="margin-bottom:16px"></div>
    <div class="table-card">
      <div class="table-header">
        <h3>Factures</h3>
        <div class="table-header-actions">
          <button class="btn-filter" id="fac-filter-btn">🔍 Filtrer</button>
          ${hasRole('administrateur','commercial','comptable') ? '<button class="btn-p" onclick="openFactureForm()">+ Nouvelle facture</button>' : ''}
        </div>
      </div>
      <div class="filter-bar" id="fac-filter-bar" style="display:none">
        <input type="text" id="fac-q" placeholder="Numéro, client…" oninput="filterFactures()">
        <select id="fac-statut" onchange="filterFactures()">
          <option value="">Tous statuts</option>
          <option value="en_attente">En attente</option>
          <option value="partielle">Partielle</option>
          <option value="payee">Payée</option>
          <option value="annulee">Annulée</option>
        </select>
      </div>
      <div class="loading"><div class="spinner"></div>Chargement…</div>
    </div>
    <div id="facture-modal" class="modal"></div>
    <div id="paiement-modal" class="modal"></div>`;

  document.getElementById('fac-filter-btn').addEventListener('click', () => {
    const bar = document.getElementById('fac-filter-bar');
    bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
  });

  try {
    [facturesData, clientsForFactures] = await Promise.all([
      api.get('/factures'),
      api.get('/clients')
    ]);
    renderFacturesStats();
    renderFactures();
  } catch (err) {
    document.querySelector('#tab-factures .loading').outerHTML =
      `<div class="alert error" style="margin:16px">${escapeHtml(err.message)}</div>`;
  }
}

function renderFacturesStats() {
  const total = facturesData.reduce((s, f) => s + Number(f.montant_ttc||0), 0);
  const paye = facturesData.reduce((s, f) => s + Number(f.montant_paye||0), 0);
  const retard = facturesData.filter(f => f.statut !== 'payee' && f.statut !== 'annulee' && f.date_echeance && new Date(f.date_echeance) < new Date());
  const el = document.getElementById('factures-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card"><div class="lbl">Total facturé</div><div class="val">${fmt(total)}</div></div>
    <div class="stat-card"><div class="lbl">Encaissé</div><div class="val" style="color:var(--green)">${fmt(paye)}</div></div>
    <div class="stat-card"><div class="lbl">En attente</div><div class="val" style="color:var(--yellow)">${fmt(total-paye)}</div></div>
    <div class="stat-card"><div class="lbl">En retard</div><div class="val" style="color:var(--red)">${retard.length}</div></div>`;
}

function filterFactures() {
  const q = (document.getElementById('fac-q')?.value||'').toLowerCase();
  const statut = document.getElementById('fac-statut')?.value||'';
  const filtered = facturesData.filter(f =>
    (!q || `${f.numero} ${f.client_nom||''} ${f.entreprise||''}`.toLowerCase().includes(q)) &&
    (!statut || f.statut === statut)
  );
  renderFacturesTable(filtered);
}

function renderFactures() { renderFacturesTable(facturesData); }

function renderFacturesTable(data) {
  const card = document.querySelector('#tab-factures .table-card');
  const old = card.querySelector('.tscroll, .empty');
  if (old) old.remove();

  if (!data.length) {
    card.insertAdjacentHTML('beforeend', '<div class="empty"><div class="empty-icon">💰</div><p>Aucune facture</p></div>');
    return;
  }

  card.insertAdjacentHTML('beforeend', `
    <div class="tscroll">
      <table>
        <thead><tr>
          <th>Numéro</th><th>Client</th><th>Montant TTC</th>
          <th>Payé</th><th>Échéance</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>${data.map(factureRow).join('')}</tbody>
      </table>
    </div>`);
}

function factureRow(f) {
  const nom = escapeHtml(f.entreprise || `${f.client_prenom||''} ${f.client_nom||''}`.trim());
  const overdue = f.statut !== 'payee' && f.statut !== 'annulee' && f.date_echeance && new Date(f.date_echeance) < new Date();
  const pct = f.montant_ttc > 0 ? Math.round((f.montant_paye/f.montant_ttc)*100) : 0;
  return `
    <tr onclick="openFactureDetail(${f.id})">
      <td><strong style="color:var(--blue)">${escapeHtml(f.numero)}</strong></td>
      <td>${nom}</td>
      <td><strong>${fmt(f.montant_ttc)}</strong></td>
      <td>
        <div style="font-size:12px;font-weight:600;color:var(--green)">${fmt(f.montant_paye)}</div>
        ${pct > 0 && pct < 100 ? `<div style="background:var(--border);border-radius:3px;height:4px;margin-top:3px"><div style="background:var(--green);width:${pct}%;height:100%;border-radius:3px"></div></div>` : ''}
      </td>
      <td>${fmtDate(f.date_echeance)}${overdue ? '<span class="overdue-badge">Retard</span>' : ''}</td>
      <td>${statutFacture(f.statut)}</td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap">
        <button class="act blue" onclick="downloadFacturePDF(${f.id},'${escapeHtml(f.numero)}')">PDF</button>
        ${f.statut !== 'payee' && f.statut !== 'annulee' && hasRole('administrateur','comptable')
          ? `<button class="act green" onclick="openPaiementForm(${f.id})">💳 Paiement</button>` : ''}
        ${hasRole('administrateur','comptable') ? `<button class="act" onclick="openFactureForm(${f.id})">Modifier</button>` : ''}
      </td>
    </tr>`;
}

async function openFactureDetail(id) {
  const f = await api.get(`/factures/${id}`);
  const paiementsHtml = (f.paiements||[]).map(p => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span>${fmtDate(p.date_paiement)} — ${escapeHtml(p.mode||'—')}</span>
      <strong style="color:var(--green)">${fmt(p.montant)}</strong>
    </div>`).join('') || '<div style="color:var(--muted);font-size:13px;padding:8px 0">Aucun paiement enregistré</div>';

  const modal = document.getElementById('facture-modal');
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>Facture ${escapeHtml(f.numero)}</h3>
      <button class="modal-close" onclick="closeModal('facture-modal')">×</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap">
        <div><span style="font-size:11px;color:var(--muted)">CLIENT</span><br><strong>${escapeHtml(f.entreprise||`${f.prenom||''} ${f.nom||''}`.trim())}</strong></div>
        <div><span style="font-size:11px;color:var(--muted)">DATE</span><br>${fmtDate(f.date_emission)}</div>
        <div><span style="font-size:11px;color:var(--muted)">ÉCHÉANCE</span><br>${fmtDate(f.date_echeance)}</div>
        <div><span style="font-size:11px;color:var(--muted)">STATUT</span><br>${statutFacture(f.statut)}</div>
      </div>
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:14px">
        <table style="min-width:0"><thead><tr>
          <th>Désignation</th><th style="text-align:right">Qté</th><th style="text-align:right">P.U. HT</th><th style="text-align:right">Total HT</th>
        </tr></thead><tbody>
          ${(f.lignes||[]).map(l=>`<tr>
            <td>${escapeHtml(l.designation)}</td>
            <td style="text-align:right">${l.quantite}</td>
            <td style="text-align:right">${Number(l.prix_unitaire).toFixed(2)} AED</td>
            <td style="text-align:right;font-weight:600">${(l.quantite*l.prix_unitaire).toFixed(2)} AED</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
      <div style="text-align:right;margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted)">HT : ${fmt(f.montant_ht)} — TVA : ${fmt(f.montant_tva)}</div>
        <div style="font-size:18px;font-weight:800;color:var(--blue)">Total TTC : ${fmt(f.montant_ttc)}</div>
        ${Number(f.montant_paye)>0 ? `<div style="color:var(--green);font-weight:600">Payé : ${fmt(f.montant_paye)}</div>` : ''}
        ${f.statut !== 'payee' ? `<div style="color:var(--red);font-weight:600">Reste : ${fmt(f.montant_ttc - f.montant_paye)}</div>` : ''}
      </div>
      <div class="form-section-title">Historique des paiements</div>
      ${paiementsHtml}
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('facture-modal')">Fermer</button>
      <button class="btn-p gray" onclick="downloadFacturePDF(${f.id},'${escapeHtml(f.numero)}')">📄 PDF</button>
      ${f.statut !== 'payee' && f.statut !== 'annulee' && hasRole('administrateur','comptable')
        ? `<button class="btn-p green" onclick="openPaiementForm(${f.id})">💳 Enregistrer paiement</button>` : ''}
    </div>`;
  openModal('facture-modal');
}

async function openFactureForm(id = null) {
  let f = {};
  if (id) f = await api.get(`/factures/${id}`);

  const modal = document.getElementById('facture-modal');
  const clientOptions = clientsForFactures.map(c =>
    `<option value="${c.id}" ${f.client_id==c.id?'selected':''}>${escapeHtml(c.entreprise||`${c.prenom||''} ${c.nom}`.trim())}</option>`
  ).join('');

  modal.innerHTML = `
    <div class="modal-hd">
      <h3>${id ? `Modifier facture ${escapeHtml(f.numero||'')}` : 'Nouvelle facture'}</h3>
      <button class="modal-close" onclick="closeModal('facture-modal')">×</button>
    </div>
    <div class="modal-body">
      ${!id ? `<div class="form-group"><label>Client *</label><select id="fc-client"><option value="">— Choisir —</option>${clientOptions}</select></div>` : ''}
      <div class="form-row">
        <div class="form-group"><label>Date d'émission</label><input type="date" id="fc-date" value="${f.date_emission||new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Date d'échéance</label><input type="date" id="fc-echeance" value="${f.date_echeance||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Mode de paiement</label>
          <select id="fc-mode">
            <option value="">—</option>
            <option value="virement" ${f.mode_paiement==='virement'?'selected':''}>Virement</option>
            <option value="cheque" ${f.mode_paiement==='cheque'?'selected':''}>Chèque</option>
            <option value="especes" ${f.mode_paiement==='especes'?'selected':''}>Espèces</option>
            <option value="carte" ${f.mode_paiement==='carte'?'selected':''}>Carte</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="fc-notes" rows="2">${escapeHtml(f.notes||'')}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('facture-modal')">Annuler</button>
      <button class="btn-p" onclick="saveFacture(${id||'null'})">💾 Enregistrer</button>
    </div>`;
  openModal('facture-modal');
}

async function saveFacture(id) {
  const body = id
    ? { date_echeance: document.getElementById('fc-echeance').value, notes: document.getElementById('fc-notes').value, mode_paiement: document.getElementById('fc-mode').value }
    : { client_id: +document.getElementById('fc-client').value||null, date_emission: document.getElementById('fc-date').value, date_echeance: document.getElementById('fc-echeance').value, mode_paiement: document.getElementById('fc-mode').value, notes: document.getElementById('fc-notes').value };

  try {
    if (id) await api.put(`/factures/${id}`, body);
    else await api.post('/factures', body);
    showToast(id ? 'Facture mise à jour' : 'Facture créée','success');
    closeModal('facture-modal');
    loadFactures();
  } catch (err) { showToast(err.message,'error'); }
}

function openPaiementForm(factureId) {
  const modal = document.getElementById('paiement-modal');
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>Enregistrer un paiement</h3>
      <button class="modal-close" onclick="closeModal('paiement-modal')">×</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Montant (AED) *</label><input type="number" id="pay-montant" min="0" step="0.01" placeholder="0.00"></div>
        <div class="form-group"><label>Date *</label><input type="date" id="pay-date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Mode</label>
          <select id="pay-mode">
            <option value="virement">Virement</option><option value="cheque">Chèque</option>
            <option value="especes">Espèces</option><option value="carte">Carte</option>
          </select>
        </div>
        <div class="form-group"><label>Référence</label><input id="pay-ref" placeholder="N° chèque, référence virement…"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="pay-notes" rows="2"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('paiement-modal')">Annuler</button>
      <button class="btn-p green" onclick="savePaiement(${factureId})">✓ Enregistrer</button>
    </div>`;
  openModal('paiement-modal');
}

async function savePaiement(factureId) {
  const body = {
    montant: parseFloat(document.getElementById('pay-montant').value)||0,
    date_paiement: document.getElementById('pay-date').value,
    mode: document.getElementById('pay-mode').value,
    reference: document.getElementById('pay-ref').value,
    notes: document.getElementById('pay-notes').value
  };
  if (!body.montant || !body.date_paiement) { showToast('Montant et date requis','error'); return; }
  try {
    await api.post(`/factures/${factureId}/paiement`, body);
    showToast('Paiement enregistré','success');
    closeModal('paiement-modal');
    closeModal('facture-modal');
    loadFactures();
  } catch (err) { showToast(err.message,'error'); }
}

async function downloadFacturePDF(id, numero) {
  try {
    showToast('Génération du PDF…');
    const blob = await api.blob(`/factures/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`facture-${numero}.pdf`; a.click();
    URL.revokeObjectURL(url);
  } catch (err) { showToast(err.message,'error'); }
}
