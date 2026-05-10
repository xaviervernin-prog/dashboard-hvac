'use strict';

function init_interventions(panel) {
  panel.innerHTML = `
    <h2 class="page-title">Interventions</h2>
    <div class="table-card">
      <div class="table-header">
        <h3>Liste des interventions</h3>
        <div class="table-header-actions">
          <button class="btn-p" id="int-new-btn">+ Nouvelle intervention</button>
        </div>
      </div>
      <div class="filter-bar">
        <select id="int-statut-filter">
          <option value="">Tous les statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>
        <select id="int-type-filter">
          <option value="">Tous les types</option>
          <option value="installation">Installation</option>
          <option value="maintenance">Maintenance</option>
          <option value="depannage">Dépannage</option>
          <option value="renovation">Rénovation</option>
        </select>
      </div>
      <div class="tscroll">
        <table>
          <thead><tr>
            <th>N°</th><th>Type</th><th>Client</th><th>Chantier</th><th>Date début</th><th>Date fin prévue</th><th>Statut</th><th>Actions</th>
          </tr></thead>
          <tbody id="int-tbody">${loadingRow(8)}</tbody>
        </table>
      </div>
    </div>

    <!-- MODAL INTERVENTION -->
    <div class="overlay" id="int-modal">
      <div class="modal">
        <div class="drag"></div>
        <h3 id="int-modal-title">Nouvelle intervention</h3>
        <input type="hidden" id="int-id">
        <div class="g2">
          <div class="form-row"><label>Client *</label>
            <select id="int-client-id"><option value="">— Sélectionner —</option></select>
          </div>
          <div class="form-row"><label>Chantier</label>
            <select id="int-chantier-id"><option value="">— Aucun —</option></select>
          </div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Type *</label>
            <select id="int-type">
              <option value="depannage">Dépannage</option>
              <option value="installation">Installation</option>
              <option value="maintenance">Maintenance</option>
              <option value="renovation">Rénovation</option>
            </select>
          </div>
          <div class="form-row"><label>Statut</label>
            <select id="int-statut">
              <option value="planifiee">Planifiée</option>
              <option value="en_cours">En cours</option>
              <option value="terminee">Terminée</option>
              <option value="annulee">Annulée</option>
            </select>
          </div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Date début *</label><input type="datetime-local" id="int-date-debut"></div>
          <div class="form-row"><label>Date fin prévue</label><input type="datetime-local" id="int-date-fin-prevue"></div>
        </div>
        <div class="form-row"><label>Description</label><textarea id="int-description" maxlength="2000"></textarea></div>
        <div class="form-row" id="int-rapport-row"><label>Rapport de clôture</label><textarea id="int-rapport" maxlength="3000"></textarea></div>
        <div class="form-row"><label>Notes internes</label><textarea id="int-notes" maxlength="2000"></textarea></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="int-cancel">Annuler</button>
          <button class="btn-save" id="int-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  let interventions = [];
  let clients = [];

  async function load() {
    const statut = document.getElementById('int-statut-filter').value;
    const type   = document.getElementById('int-type-filter').value;
    document.getElementById('int-tbody').innerHTML = loadingRow(8);
    try {
      const res = await api.get(`/interventions?statut=${statut}&type=${type}&limit=100`);
      interventions = res.data || [];
      render();
    } catch (e) { toast(e.message, 'error'); }
  }

  function render() {
    const tbody = document.getElementById('int-tbody');
    if (!interventions.length) { tbody.innerHTML = emptyRow(8); return; }
    tbody.innerHTML = interventions.map(i => `
      <tr data-id="${i.id}">
        <td><strong>${escape(i.numero)}</strong></td>
        <td>${typeIntervention(i.type)}</td>
        <td>${escape(clientNom(i.clients))}</td>
        <td class="td-muted">${escape(i.chantiers?.nom || '—')}</td>
        <td>${fmtDatetime(i.date_debut)}</td>
        <td>${fmtDate(i.date_fin_prevue)}</td>
        <td>${badgeIntervention(i.statut)}</td>
        <td>
          <button class="act blue" data-action="edit" data-id="${i.id}">Modifier</button>
          ${i.statut === 'planifiee' ? `<button class="act orange" data-action="start" data-id="${i.id}">Démarrer</button>` : ''}
          ${i.statut === 'en_cours'  ? `<button class="act green"  data-action="finish" data-id="${i.id}">Terminer</button>` : ''}
        </td>
      </tr>
    `).join('');
  }

  async function loadClients() {
    if (!clients.length) {
      try { const res = await api.get('/clients?limit=200'); clients = res.data || []; } catch {}
    }
    const sel = document.getElementById('int-client-id');
    sel.innerHTML = '<option value="">— Sélectionner —</option>' +
      clients.map(c => `<option value="${c.id}">${escape(clientNom(c))}</option>`).join('');
    sel.addEventListener('change', async e => {
      const selCh = document.getElementById('int-chantier-id');
      selCh.innerHTML = '<option value="">— Aucun —</option>';
      if (!e.target.value) return;
      try {
        const c = await api.get(`/clients/${e.target.value}`);
        (c.chantiers||[]).filter(ch=>ch.actif).forEach(ch => {
          selCh.innerHTML += `<option value="${ch.id}">${escape(ch.nom)}</option>`;
        });
      } catch {}
    });
  }

  function openNew() {
    document.getElementById('int-id').value = '';
    document.getElementById('int-modal-title').textContent = 'Nouvelle intervention';
    document.getElementById('int-description').value = '';
    document.getElementById('int-rapport').value = '';
    document.getElementById('int-notes').value = '';
    const now = new Date();
    now.setMinutes(0, 0, 0);
    document.getElementById('int-date-debut').value    = now.toISOString().slice(0,16);
    document.getElementById('int-date-fin-prevue').value = '';
    document.getElementById('int-statut').value = 'planifiee';
    document.getElementById('int-type').value   = 'depannage';
    document.getElementById('int-rapport-row').style.display = 'none';
    loadClients();
    openModal('int-modal');
  }

  async function openEdit(id) {
    try {
      const i = await api.get(`/interventions/${id}`);
      document.getElementById('int-id').value = i.id;
      document.getElementById('int-modal-title').textContent = `Intervention ${i.numero}`;
      document.getElementById('int-type').value = i.type;
      document.getElementById('int-statut').value = i.statut;
      document.getElementById('int-date-debut').value    = i.date_debut?.slice(0,16) || '';
      document.getElementById('int-date-fin-prevue').value = i.date_fin_prevue?.slice(0,16) || '';
      document.getElementById('int-description').value  = i.description || '';
      document.getElementById('int-rapport').value      = i.rapport || '';
      document.getElementById('int-notes').value        = i.notes || '';
      document.getElementById('int-rapport-row').style.display = ['en_cours','terminee'].includes(i.statut) ? '' : 'none';
      await loadClients();
      document.getElementById('int-client-id').value = i.client_id || '';
      if (i.client_id) {
        const c = await api.get(`/clients/${i.client_id}`);
        const selCh = document.getElementById('int-chantier-id');
        selCh.innerHTML = '<option value="">— Aucun —</option>';
        (c.chantiers||[]).filter(ch=>ch.actif).forEach(ch => {
          selCh.innerHTML += `<option value="${ch.id}" ${ch.id===i.chantier_id?'selected':''}>${escape(ch.nom)}</option>`;
        });
      }
      openModal('int-modal');
    } catch (e) { toast(e.message, 'error'); }
  }

  document.getElementById('int-statut').addEventListener('change', e => {
    document.getElementById('int-rapport-row').style.display =
      ['en_cours','terminee'].includes(e.target.value) ? '' : 'none';
  });

  async function save() {
    const id = document.getElementById('int-id').value;
    const clientId = document.getElementById('int-client-id').value;
    if (!clientId) { toast('Sélectionner un client', 'warning'); return; }
    const date_debut = document.getElementById('int-date-debut').value;
    if (!date_debut) { toast('Date de début requise', 'warning'); return; }

    const body = {
      client_id:      clientId,
      chantier_id:    document.getElementById('int-chantier-id').value || null,
      type:           document.getElementById('int-type').value,
      date_debut,
      date_fin_prevue: document.getElementById('int-date-fin-prevue').value || null,
      description:    document.getElementById('int-description').value.trim(),
      notes:          document.getElementById('int-notes').value.trim(),
    };

    const btn = document.getElementById('int-save-btn');
    btn.disabled = true;
    try {
      if (id) {
        const statut = document.getElementById('int-statut').value;
        if (['en_cours','terminee','annulee'].includes(statut)) {
          await api.patch(`/interventions/${id}/statut`, {
            statut,
            rapport: document.getElementById('int-rapport').value.trim() || null,
          });
        } else {
          await api.put(`/interventions/${id}`, body);
        }
        toast('Intervention mise à jour', 'success');
      } else {
        await api.post('/interventions', body);
        toast('Intervention créée', 'success');
      }
      closeModal('int-modal');
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally { btn.disabled = false; }
  }

  // Events
  document.getElementById('int-new-btn').addEventListener('click', openNew);
  document.getElementById('int-save-btn').addEventListener('click', save);
  document.getElementById('int-cancel').addEventListener('click', () => closeModal('int-modal'));
  document.getElementById('int-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('int-modal')) closeModal('int-modal');
  });
  document.getElementById('int-statut-filter').addEventListener('change', load);
  document.getElementById('int-type-filter').addEventListener('change', load);
  document.getElementById('int-tbody').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (btn?.dataset.action === 'edit')   { openEdit(btn.dataset.id); return; }
    if (btn?.dataset.action === 'start')  {
      try { await api.patch(`/interventions/${btn.dataset.id}/statut`, { statut:'en_cours' }); toast('Démarrée','success'); load(); } catch(ex) { toast(ex.message,'error'); }
      return;
    }
    if (btn?.dataset.action === 'finish') { openEdit(btn.dataset.id); return; }
    const row = e.target.closest('tr[data-id]');
    if (row) openEdit(row.dataset.id);
  });

  load();
}
