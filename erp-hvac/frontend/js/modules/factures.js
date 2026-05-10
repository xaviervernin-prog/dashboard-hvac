'use strict';

function init_factures(panel) {
  panel.innerHTML = `
    <h2 class="page-title">Factures</h2>
    <div class="table-card">
      <div class="table-header">
        <h3>Liste des factures</h3>
        <div class="table-header-actions">
          <button class="btn-p" id="fac-new-btn">+ Nouvelle facture</button>
        </div>
      </div>
      <div class="filter-bar">
        <select id="fac-statut-filter">
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="envoyee">Envoyée</option>
          <option value="partiellement_payee">Partiellement payée</option>
          <option value="payee">Payée</option>
          <option value="en_retard">En retard</option>
          <option value="annulee">Annulée</option>
        </select>
      </div>
      <div class="tscroll">
        <table>
          <thead><tr>
            <th>Numéro</th><th>Client</th><th>Date</th><th>Échéance</th><th>Total TTC</th><th>Payé</th><th>Reste</th><th>Statut</th><th>Actions</th>
          </tr></thead>
          <tbody id="fac-tbody">${loadingRow(9)}</tbody>
        </table>
      </div>
    </div>

    <!-- MODAL FACTURE -->
    <div class="overlay" id="fac-modal">
      <div class="modal wide">
        <div class="drag"></div>
        <h3 id="fac-modal-title">Détail facture</h3>
        <div id="fac-content"></div>
      </div>
    </div>

    <!-- MODAL NOUVELLE FACTURE -->
    <div class="overlay" id="fac-new-modal">
      <div class="modal wide">
        <div class="drag"></div>
        <h3>Nouvelle facture</h3>
        <input type="hidden" id="fnew-id">
        <div class="g2">
          <div class="form-row"><label>Client *</label>
            <select id="fnew-client-id"><option value="">— Sélectionner —</option></select>
          </div>
          <div class="form-row"><label>Chantier</label>
            <select id="fnew-chantier-id"><option value="">— Aucun —</option></select>
          </div>
        </div>
        <div class="form-row"><label>Objet</label><input id="fnew-objet" maxlength="300"></div>
        <div class="g2">
          <div class="form-row"><label>Date facture</label><input type="date" id="fnew-date-facture"></div>
          <div class="form-row"><label>Échéance</label><input type="date" id="fnew-date-echeance"></div>
        </div>
        <div class="msec">Lignes</div>
        <div class="tscroll">
          <table class="lignes-table">
            <thead><tr><th style="min-width:200px">Désignation</th><th style="width:70px">Qté</th><th style="width:110px">P.U. HT (AED)</th><th style="width:70px">TVA %</th><th style="width:110px">Total HT</th><th class="td-rm"></th></tr></thead>
            <tbody id="fnew-lignes"></tbody>
          </table>
        </div>
        <button class="btn-add-row" id="fnew-add-ligne">+ Ajouter une ligne</button>
        <div class="devis-totaux" id="fnew-totaux"></div>
        <div class="form-row" style="margin-top:12px"><label>Notes</label><textarea id="fnew-notes" maxlength="2000"></textarea></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="fnew-cancel">Annuler</button>
          <button class="btn-save" id="fnew-save-btn">Créer la facture</button>
        </div>
      </div>
    </div>

    <!-- MODAL PAIEMENT -->
    <div class="overlay" id="fac-pay-modal">
      <div class="modal">
        <div class="drag"></div>
        <h3>Enregistrer un paiement</h3>
        <input type="hidden" id="fpay-id">
        <div class="g2">
          <div class="form-row"><label>Date *</label><input type="date" id="fpay-date"></div>
          <div class="form-row"><label>Montant *</label><input type="number" id="fpay-montant" min="0.01" step="0.01"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Mode</label>
            <select id="fpay-mode">
              <option value="virement">Virement</option>
              <option value="cheque">Chèque</option>
              <option value="especes">Espèces</option>
              <option value="carte">Carte</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div class="form-row"><label>Référence</label><input id="fpay-ref" maxlength="100"></div>
        </div>
        <div class="form-row"><label>Notes</label><textarea id="fpay-notes" maxlength="500"></textarea></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="fpay-cancel">Annuler</button>
          <button class="btn-save" id="fpay-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  let factures = [];
  let lignesNew = [];
  let clients = [];

  async function load() {
    const statut = document.getElementById('fac-statut-filter').value;
    document.getElementById('fac-tbody').innerHTML = loadingRow(9);
    try {
      const res = await api.get(`/factures?statut=${statut}&limit=100`);
      factures = res.data || [];
      render();
    } catch (e) { toast(e.message, 'error'); }
  }

  function render() {
    const tbody = document.getElementById('fac-tbody');
    if (!factures.length) { tbody.innerHTML = emptyRow(9); return; }
    tbody.innerHTML = factures.map(f => {
      const reste = Math.max(0, +f.total_ttc - +f.montant_paye);
      const overdue = f.statut === 'en_retard' ? '<span class="overdue-badge">RETARD</span>' : '';
      return `
        <tr data-id="${f.id}">
          <td><strong>${escape(f.numero)}</strong></td>
          <td>${escape(clientNom(f.clients))}</td>
          <td>${fmtDate(f.date_facture)}</td>
          <td>${fmtDate(f.date_echeance)}${overdue}</td>
          <td><strong>${fmtAED(f.total_ttc)}</strong></td>
          <td class="${+f.montant_paye > 0 ? 'gr' : 'td-muted'}">${fmtAED(f.montant_paye)}</td>
          <td class="${reste > 0 ? 're' : 'td-muted'}">${fmtAED(reste)}</td>
          <td>${badgeFacture(f.statut)}</td>
          <td>
            <button class="act blue" data-action="open" data-id="${f.id}">Détail</button>
            ${['envoyee','partiellement_payee','en_retard'].includes(f.statut)
              ? `<button class="act green" data-action="pay" data-id="${f.id}">Paiement</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  async function openDetail(id) {
    try {
      const f = await api.get(`/factures/${id}`);
      document.getElementById('fac-modal-title').textContent = `Facture ${f.numero}`;
      const reste = Math.max(0, +f.total_ttc - +f.montant_paye);
      document.getElementById('fac-content').innerHTML = `
        <div class="g2" style="margin-bottom:12px">
          <div><span class="td-muted">Client :</span> <strong>${escape(clientNom(f.clients))}</strong></div>
          <div><span class="td-muted">Statut :</span> ${badgeFacture(f.statut)}</div>
          <div><span class="td-muted">Date :</span> ${fmtDate(f.date_facture)}</div>
          <div><span class="td-muted">Échéance :</span> ${fmtDate(f.date_echeance)}</div>
        </div>
        <div class="tscroll">
          <table>
            <thead><tr><th>Désignation</th><th>Qté</th><th>P.U. HT</th><th>TVA</th><th>Total TTC</th></tr></thead>
            <tbody>
              ${(f.facture_lignes||[]).map(l => `
                <tr><td>${escape(l.designation)}</td><td>${l.quantite}</td>
                <td>${fmtAED(l.prix_unitaire_ht)}</td><td>${l.taux_tva}%</td>
                <td><strong>${fmtAED(l.montant_ttc)}</strong></td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="devis-totaux" style="margin-top:8px">
          <div class="totaux-row"><span>Sous-total HT</span><span>${fmtAED(f.sous_total_ht)}</span></div>
          <div class="totaux-row"><span>TVA</span><span>${fmtAED(f.montant_tva)}</span></div>
          <div class="totaux-row total"><span>TOTAL TTC</span><span>${fmtAED(f.total_ttc)}</span></div>
          <div class="totaux-row" style="margin-top:6px"><span>Payé</span><span style="color:var(--green)">${fmtAED(f.montant_paye)}</span></div>
          <div class="totaux-row"><span>Reste à payer</span><span style="color:${reste>0?'var(--red)':'var(--green)'};font-weight:700">${fmtAED(reste)}</span></div>
        </div>
        ${f.paiements?.length ? `
          <div class="msec">Historique paiements</div>
          <table>
            <thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Référence</th></tr></thead>
            <tbody>${(f.paiements||[]).map(p => `
              <tr><td>${fmtDate(p.date_paiement)}</td><td>${fmtAED(p.montant)}</td>
              <td>${p.mode}</td><td class="td-muted">${escape(p.reference||'—')}</td></tr>
            `).join('')}</tbody>
          </table>
        ` : ''}
        <div class="modal-actions">
          <button class="btn-cancel" id="fac-detail-close">Fermer</button>
          ${['envoyee','partiellement_payee','en_retard'].includes(f.statut)
            ? `<button class="btn-save green" id="fac-detail-pay" data-id="${f.id}">+ Paiement</button>` : ''}
        </div>
      `;
      document.getElementById('fac-detail-close')?.addEventListener('click', () => closeModal('fac-modal'));
      document.getElementById('fac-detail-pay')?.addEventListener('click', e => {
        closeModal('fac-modal');
        openPaiement(e.target.dataset.id);
      });
      openModal('fac-modal');
    } catch (e) { toast(e.message, 'error'); }
  }

  function openPaiement(id) {
    document.getElementById('fpay-id').value = id;
    document.getElementById('fpay-date').value = new Date().toISOString().slice(0,10);
    document.getElementById('fpay-montant').value = '';
    document.getElementById('fpay-ref').value = '';
    document.getElementById('fpay-notes').value = '';
    openModal('fac-pay-modal');
  }

  document.getElementById('fpay-save-btn').addEventListener('click', async () => {
    const id      = document.getElementById('fpay-id').value;
    const montant = +document.getElementById('fpay-montant').value;
    if (!montant || montant <= 0) { toast('Montant invalide', 'warning'); return; }
    const btn = document.getElementById('fpay-save-btn');
    btn.disabled = true;
    try {
      await api.post(`/factures/${id}/paiements`, {
        date_paiement: document.getElementById('fpay-date').value,
        montant,
        mode:      document.getElementById('fpay-mode').value,
        reference: document.getElementById('fpay-ref').value.trim(),
        notes:     document.getElementById('fpay-notes').value.trim(),
      });
      toast('Paiement enregistré', 'success');
      closeModal('fac-pay-modal');
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally { btn.disabled = false; }
  });

  // New invoice form
  async function openNewForm() {
    if (!clients.length) {
      try { const res = await api.get('/clients?limit=200'); clients = res.data || []; } catch {}
    }
    const sel = document.getElementById('fnew-client-id');
    sel.innerHTML = '<option value="">— Sélectionner —</option>' +
      clients.map(c => `<option value="${c.id}">${escape(clientNom(c))}</option>`).join('');
    sel.addEventListener('change', async e => {
      const selCh = document.getElementById('fnew-chantier-id');
      selCh.innerHTML = '<option value="">— Aucun —</option>';
      if (!e.target.value) return;
      try {
        const c = await api.get(`/clients/${e.target.value}`);
        (c.chantiers||[]).filter(ch=>ch.actif).forEach(ch => {
          selCh.innerHTML += `<option value="${ch.id}">${escape(ch.nom)}</option>`;
        });
      } catch {}
    });
    document.getElementById('fnew-date-facture').value = new Date().toISOString().slice(0,10);
    document.getElementById('fnew-date-echeance').value = '';
    document.getElementById('fnew-objet').value = '';
    document.getElementById('fnew-notes').value = '';
    lignesNew = [{ designation:'', quantite:1, prix_unitaire_ht:0, taux_tva:5 }];
    renderLignesNew();
    openModal('fac-new-modal');
  }

  function renderLignesNew() {
    const tbody = document.getElementById('fnew-lignes');
    tbody.innerHTML = lignesNew.map((l, i) => `
      <tr>
        <td><input class="fnl-desig" data-i="${i}" value="${escape(l.designation||'')}" placeholder="Désignation *"></td>
        <td><input class="fnl-qty" data-i="${i}" type="number" min="0.001" step="0.001" value="${l.quantite||1}"></td>
        <td><input class="fnl-pu"  data-i="${i}" type="number" min="0" step="0.01" value="${l.prix_unitaire_ht||0}"></td>
        <td><input class="fnl-tva" data-i="${i}" type="number" min="0" step="0.01" value="${l.taux_tva!=null?l.taux_tva:5}"></td>
        <td class="ligne-total td-muted">${fmtAED(+l.quantite * +l.prix_unitaire_ht)}</td>
        <td class="td-rm"><button data-rm="${i}">×</button></td>
      </tr>
    `).join('');
    updateTotauxNew();
  }

  function updateTotauxNew() {
    let ht=0, tva=0;
    lignesNew.forEach(l => { const h=Math.round(+l.quantite * +l.prix_unitaire_ht*100)/100; ht+=h; tva+=Math.round(h*(+l.taux_tva/100)*100)/100; });
    document.getElementById('fnew-totaux').innerHTML = `
      <div class="totaux-row"><span>Sous-total HT</span><span>${fmtAED(ht)}</span></div>
      <div class="totaux-row"><span>TVA</span><span>${fmtAED(tva)}</span></div>
      <div class="totaux-row total"><span>TOTAL TTC</span><span>${fmtAED(ht+tva)}</span></div>
    `;
  }

  document.getElementById('fnew-lignes').addEventListener('input', e => {
    const el=e.target, i=+el.dataset.i;
    if (el.classList.contains('fnl-desig')) lignesNew[i].designation=el.value;
    if (el.classList.contains('fnl-qty'))   lignesNew[i].quantite=+el.value||0;
    if (el.classList.contains('fnl-pu'))    lignesNew[i].prix_unitaire_ht=+el.value||0;
    if (el.classList.contains('fnl-tva'))   lignesNew[i].taux_tva=+el.value;
    updateTotauxNew();
  });
  document.getElementById('fnew-lignes').addEventListener('click', e => {
    const btn=e.target.closest('[data-rm]');
    if (btn) { lignesNew.splice(+btn.dataset.rm,1); renderLignesNew(); }
  });
  document.getElementById('fnew-add-ligne').addEventListener('click', () => {
    lignesNew.push({designation:'',quantite:1,prix_unitaire_ht:0,taux_tva:5});
    renderLignesNew();
  });

  document.getElementById('fnew-save-btn').addEventListener('click', async () => {
    const clientId = document.getElementById('fnew-client-id').value;
    if (!clientId) { toast('Sélectionner un client','warning'); return; }
    if (!lignesNew.some(l=>l.designation?.trim())) { toast('Au moins une ligne requise','warning'); return; }
    const btn = document.getElementById('fnew-save-btn');
    btn.disabled = true;
    try {
      const f = await api.post('/factures', {
        client_id:    clientId,
        chantier_id:  document.getElementById('fnew-chantier-id').value || null,
        objet:        document.getElementById('fnew-objet').value.trim(),
        date_facture: document.getElementById('fnew-date-facture').value,
        date_echeance: document.getElementById('fnew-date-echeance').value || null,
        notes:        document.getElementById('fnew-notes').value.trim(),
        lignes: lignesNew.filter(l=>l.designation?.trim()).map(l=>({
          designation:l.designation, quantite:+l.quantite,
          prix_unitaire_ht:+l.prix_unitaire_ht, taux_tva:+l.taux_tva
        })),
      });
      toast(`Facture ${f.numero} créée`, 'success');
      closeModal('fac-new-modal');
      load();
    } catch (e) { toast(e.message,'error'); }
    finally { btn.disabled = false; }
  });

  // Events
  document.getElementById('fac-new-btn').addEventListener('click', openNewForm);
  document.getElementById('fnew-cancel').addEventListener('click', () => closeModal('fac-new-modal'));
  document.getElementById('fpay-cancel').addEventListener('click', () => closeModal('fac-pay-modal'));
  document.getElementById('fac-statut-filter').addEventListener('change', load);
  document.getElementById('fac-tbody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn?.dataset.action === 'open') { openDetail(btn.dataset.id); return; }
    if (btn?.dataset.action === 'pay')  { openPaiement(btn.dataset.id); return; }
    const row = e.target.closest('tr[data-id]');
    if (row) openDetail(row.dataset.id);
  });

  load();
}
