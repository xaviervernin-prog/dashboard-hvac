'use strict';

function init_devis(panel) {
  panel.innerHTML = `
    <h2 class="page-title">Devis</h2>
    <div class="table-card">
      <div class="table-header">
        <h3>Liste des devis</h3>
        <div class="table-header-actions">
          <button class="btn-p" id="dv-new-btn">+ Nouveau devis</button>
        </div>
      </div>
      <div class="filter-bar">
        <input type="search" id="dv-search" placeholder="Rechercher numéro, objet…">
        <select id="dv-statut-filter">
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="envoye">Envoyé</option>
          <option value="accepte">Accepté</option>
          <option value="refuse">Refusé</option>
          <option value="expire">Expiré</option>
        </select>
      </div>
      <div class="tscroll">
        <table>
          <thead><tr>
            <th>Numéro</th><th>Client</th><th>Objet</th><th>Date</th><th>Validité</th><th>Total TTC</th><th>Statut</th><th>Actions</th>
          </tr></thead>
          <tbody id="dv-tbody">${loadingRow(8)}</tbody>
        </table>
      </div>
    </div>

    <!-- MODAL DEVIS -->
    <div class="overlay" id="dv-modal">
      <div class="modal wide">
        <div class="drag"></div>
        <h3 id="dv-modal-title">Nouveau devis</h3>
        <div id="dv-lock-banner"></div>
        <input type="hidden" id="dv-id">
        <input type="hidden" id="dv-statut-val">
        <div class="g2">
          <div class="form-row"><label>Client *</label>
            <select id="dv-client-id"><option value="">— Sélectionner —</option></select>
          </div>
          <div class="form-row"><label>Chantier</label>
            <select id="dv-chantier-id"><option value="">— Aucun —</option></select>
          </div>
        </div>
        <div class="form-row"><label>Objet</label><input id="dv-objet" maxlength="300"></div>
        <div class="g2">
          <div class="form-row"><label>Date devis</label><input type="date" id="dv-date-devis"></div>
          <div class="form-row"><label>Validité jusqu'au</label><input type="date" id="dv-date-validite"></div>
        </div>

        <div class="msec">Lignes</div>
        <div class="tscroll">
          <table class="lignes-table">
            <thead><tr>
              <th style="min-width:200px">Désignation</th>
              <th style="width:70px">Qté</th>
              <th style="width:110px">P.U. HT (AED)</th>
              <th style="width:70px">TVA %</th>
              <th style="width:110px">Total HT</th>
              <th class="td-rm"></th>
            </tr></thead>
            <tbody id="dv-lignes"></tbody>
          </table>
        </div>
        <button class="btn-add-row" id="dv-add-ligne">+ Ajouter une ligne</button>
        <div class="devis-totaux" id="dv-totaux"></div>

        <div class="form-row" style="margin-top:12px"><label>Notes internes</label><textarea id="dv-notes" maxlength="2000"></textarea></div>

        <div class="modal-actions" id="dv-actions">
          <button class="btn-cancel" id="dv-cancel">Fermer</button>
          <button class="btn-save" id="dv-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  let devis = [];
  let lignes = [];
  let clients = [];
  let articles = [];
  let searchTimer;
  let locked = false;

  async function load() {
    const search = document.getElementById('dv-search').value;
    const statut = document.getElementById('dv-statut-filter').value;
    document.getElementById('dv-tbody').innerHTML = loadingRow(8);
    try {
      const res = await api.get(`/devis?search=${encodeURIComponent(search)}&statut=${statut}&limit=100`);
      devis = res.data || [];
      render();
    } catch (e) { toast(e.message, 'error'); }
  }

  function render() {
    const tbody = document.getElementById('dv-tbody');
    if (!devis.length) { tbody.innerHTML = emptyRow(8); return; }
    tbody.innerHTML = devis.map(d => `
      <tr data-id="${d.id}">
        <td><strong>${escape(d.numero)}</strong></td>
        <td>${escape(clientNom(d.clients))}</td>
        <td class="td-muted">${escape(d.objet || '')}</td>
        <td>${fmtDate(d.date_devis)}</td>
        <td>${fmtDate(d.date_validite)}</td>
        <td><strong>${fmtAED(d.total_ttc)}</strong></td>
        <td>${badgeDevis(d.statut)}</td>
        <td>
          <button class="act blue" data-action="open" data-id="${d.id}">Ouvrir</button>
          ${d.statut === 'accepte' ? `<button class="act green" data-action="facturer" data-id="${d.id}">Facturer</button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  async function loadSelects(clientId = '') {
    if (!clients.length) {
      try {
        const res = await api.get('/clients?limit=200');
        clients = res.data || [];
      } catch {}
    }
    const sel = document.getElementById('dv-client-id');
    const prev = sel.value;
    sel.innerHTML = '<option value="">— Sélectionner —</option>' +
      clients.map(c => `<option value="${c.id}" ${c.id === clientId ? 'selected' : ''}>${escape(clientNom(c))}</option>`).join('');
    if (clientId) sel.value = clientId;

    if (!articles.length) {
      try {
        const res = await api.get('/articles?limit=500');
        articles = res.data || [];
      } catch {}
    }
    if (clientId) await loadChantiers(clientId);
  }

  async function loadChantiers(clientId) {
    const sel = document.getElementById('dv-chantier-id');
    sel.innerHTML = '<option value="">— Aucun —</option>';
    if (!clientId) return;
    try {
      const c = await api.get(`/clients/${clientId}`);
      (c.chantiers || []).filter(ch => ch.actif).forEach(ch => {
        sel.innerHTML += `<option value="${ch.id}">${escape(ch.nom)}</option>`;
      });
    } catch {}
  }

  document.getElementById('dv-client-id').addEventListener('change', e => {
    loadChantiers(e.target.value);
  });

  function renderLignes() {
    const tbody = document.getElementById('dv-lignes');
    tbody.innerHTML = lignes.map((l, i) => `
      <tr>
        <td>
          <input class="lg-desig" data-i="${i}" value="${escape(l.designation || '')}" placeholder="Désignation *" ${locked?'disabled':''}>
        </td>
        <td><input class="lg-qty" data-i="${i}" type="number" min="0.001" step="0.001" value="${l.quantite||1}" ${locked?'disabled':''}></td>
        <td><input class="lg-pu"  data-i="${i}" type="number" min="0"     step="0.01"  value="${l.prix_unitaire_ht||0}" ${locked?'disabled':''}></td>
        <td><input class="lg-tva" data-i="${i}" type="number" min="0"     step="0.01"  value="${l.taux_tva!=null?l.taux_tva:5}" ${locked?'disabled':''}></td>
        <td class="ligne-total td-muted">${fmtAED(+l.quantite * +l.prix_unitaire_ht)}</td>
        <td class="td-rm">${locked ? '' : `<button data-rm="${i}">×</button>`}</td>
      </tr>
    `).join('');
    updateTotaux();
  }

  function updateTotaux() {
    let ht = 0, tva = 0;
    lignes.forEach(l => {
      const h = Math.round(+l.quantite * +l.prix_unitaire_ht * 100) / 100;
      const t = Math.round(h * (+l.taux_tva / 100) * 100) / 100;
      ht += h; tva += t;
    });
    const ttc = ht + tva;
    document.getElementById('dv-totaux').innerHTML = `
      <div class="totaux-row"><span>Sous-total HT</span><span>${fmtAED(ht)}</span></div>
      <div class="totaux-row"><span>TVA</span><span>${fmtAED(tva)}</span></div>
      <div class="totaux-row total"><span>TOTAL TTC</span><span>${fmtAED(ttc)}</span></div>
    `;
    // Update line totals
    document.querySelectorAll('.ligne-total').forEach((el, i) => {
      const l = lignes[i];
      if (l) el.textContent = fmtAED(+l.quantite * +l.prix_unitaire_ht);
    });
  }

  document.getElementById('dv-lignes').addEventListener('input', e => {
    const el = e.target;
    const i = +el.dataset.i;
    if (el.classList.contains('lg-desig')) lignes[i].designation      = el.value;
    if (el.classList.contains('lg-qty'))   lignes[i].quantite          = +el.value || 0;
    if (el.classList.contains('lg-pu'))    lignes[i].prix_unitaire_ht  = +el.value || 0;
    if (el.classList.contains('lg-tva'))   lignes[i].taux_tva          = +el.value;
    updateTotaux();
  });

  document.getElementById('dv-lignes').addEventListener('click', e => {
    const btn = e.target.closest('[data-rm]');
    if (btn) { lignes.splice(+btn.dataset.rm, 1); renderLignes(); }
  });

  document.getElementById('dv-add-ligne').addEventListener('click', () => {
    lignes.push({ designation: '', quantite: 1, prix_unitaire_ht: 0, taux_tva: 5 });
    renderLignes();
  });

  function openNew() {
    locked = false;
    document.getElementById('dv-id').value = '';
    document.getElementById('dv-modal-title').textContent = 'Nouveau devis';
    document.getElementById('dv-lock-banner').innerHTML = '';
    document.getElementById('dv-objet').value = '';
    document.getElementById('dv-date-devis').value = new Date().toISOString().slice(0,10);
    document.getElementById('dv-date-validite').value = '';
    document.getElementById('dv-notes').value = '';
    document.getElementById('dv-save-btn').style.display = '';
    document.getElementById('dv-add-ligne').style.display = '';
    lignes = [{ designation: '', quantite: 1, prix_unitaire_ht: 0, taux_tva: 5 }];
    loadSelects();
    renderLignes();
    openModal('dv-modal');
  }

  async function openEdit(id) {
    try {
      const d = await api.get(`/devis/${id}`);
      locked = d.statut === 'accepte';
      document.getElementById('dv-id').value  = d.id;
      document.getElementById('dv-statut-val').value = d.statut;
      document.getElementById('dv-modal-title').textContent = `Devis ${d.numero}`;
      document.getElementById('dv-lock-banner').innerHTML = locked
        ? `<div class="lock-banner">🔒 Ce devis est accepté — modification désactivée</div>` : '';
      document.getElementById('dv-objet').value        = d.objet || '';
      document.getElementById('dv-date-devis').value   = fmtDateInput(d.date_devis);
      document.getElementById('dv-date-validite').value = fmtDateInput(d.date_validite);
      document.getElementById('dv-notes').value        = d.notes || '';
      document.getElementById('dv-save-btn').style.display = locked ? 'none' : '';
      document.getElementById('dv-add-ligne').style.display = locked ? 'none' : '';

      // Statut actions
      const actionsEl = document.getElementById('dv-actions');
      let extraBtns = '';
      if (!locked && d.statut === 'brouillon') extraBtns += `<button class="btn-p gray btn-p-sm" id="dv-envoyer-btn">Marquer envoyé</button>`;
      if (!locked && d.statut === 'envoye')    extraBtns += `<button class="btn-p green btn-p-sm" id="dv-accepter-btn">Accepter</button>
        <button class="btn-p red btn-p-sm" id="dv-refuser-btn">Refuser</button>`;
      if (d.statut === 'accepte') extraBtns += `<button class="btn-p green btn-p-sm" id="dv-facturer-btn">Créer facture</button>`;
      actionsEl.innerHTML = `<button class="btn-cancel" id="dv-cancel">Fermer</button>${extraBtns}${locked ? '' : '<button class="btn-save" id="dv-save-btn">Enregistrer</button>'}`;
      bindActions(d);

      await loadSelects(d.client_id);
      document.getElementById('dv-chantier-id').value = d.chantier_id || '';
      lignes = (d.devis_lignes || []).map(l => ({ ...l }));
      renderLignes();
      openModal('dv-modal');
    } catch (e) { toast(e.message, 'error'); }
  }

  function bindActions(d) {
    document.getElementById('dv-cancel')?.addEventListener('click', () => closeModal('dv-modal'));
    document.getElementById('dv-save-btn')?.addEventListener('click', save);
    document.getElementById('dv-envoyer-btn')?.addEventListener('click', () => updateStatut(d.id, 'envoye'));
    document.getElementById('dv-accepter-btn')?.addEventListener('click', () => updateStatut(d.id, 'accepte'));
    document.getElementById('dv-refuser-btn')?.addEventListener('click', () => updateStatut(d.id, 'refuse'));
    document.getElementById('dv-facturer-btn')?.addEventListener('click', () => facturer(d.id));
  }

  async function updateStatut(id, statut) {
    try {
      await api.patch(`/devis/${id}/statut`, { statut });
      toast('Statut mis à jour', 'success');
      closeModal('dv-modal');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function facturer(id) {
    const date_echeance = prompt('Date d\'échéance (AAAA-MM-JJ) :');
    try {
      const f = await api.post(`/devis/${id}/facturer`, { date_echeance: date_echeance || null });
      toast(`Facture ${f.numero} créée`, 'success');
      closeModal('dv-modal');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function save() {
    const id = document.getElementById('dv-id').value;
    if (!lignes.some(l => l.designation?.trim())) { toast('Au moins une ligne requise', 'warning'); return; }
    const clientId = document.getElementById('dv-client-id').value;
    if (!clientId) { toast('Sélectionner un client', 'warning'); return; }

    const body = {
      client_id:    clientId,
      chantier_id:  document.getElementById('dv-chantier-id').value || null,
      objet:        document.getElementById('dv-objet').value.trim(),
      date_devis:   document.getElementById('dv-date-devis').value,
      date_validite: document.getElementById('dv-date-validite').value || null,
      notes:        document.getElementById('dv-notes').value.trim(),
      lignes: lignes.filter(l => l.designation?.trim()).map(l => ({
        article_id:       l.article_id || null,
        designation:      l.designation,
        description:      l.description || null,
        quantite:         +l.quantite,
        prix_unitaire_ht: +l.prix_unitaire_ht,
        taux_tva:         +l.taux_tva,
      })),
    };

    const btn = document.getElementById('dv-save-btn');
    if (btn) btn.disabled = true;
    try {
      if (id) {
        await api.put(`/devis/${id}`, body);
        toast('Devis mis à jour', 'success');
      } else {
        const d = await api.post('/devis', body);
        toast(`Devis ${d.numero} créé`, 'success');
      }
      closeModal('dv-modal');
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Events
  document.getElementById('dv-new-btn').addEventListener('click', openNew);
  document.getElementById('dv-cancel').addEventListener('click', () => closeModal('dv-modal'));
  document.getElementById('dv-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('dv-modal')) closeModal('dv-modal');
  });
  document.getElementById('dv-search').addEventListener('input', () => {
    clearTimeout(searchTimer); searchTimer = setTimeout(load, 300);
  });
  document.getElementById('dv-statut-filter').addEventListener('change', load);
  document.getElementById('dv-tbody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn?.dataset.action === 'open')     { openEdit(btn.dataset.id); return; }
    if (btn?.dataset.action === 'facturer') { facturer(btn.dataset.id); return; }
    const row = e.target.closest('tr[data-id]');
    if (row) openEdit(row.dataset.id);
  });

  load();
}
