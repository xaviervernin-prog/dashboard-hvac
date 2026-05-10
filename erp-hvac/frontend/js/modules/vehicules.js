'use strict';

function init_vehicules(panel) {
  panel.innerHTML = `
    <h2 class="page-title">Véhicules</h2>
    <div class="table-card">
      <div class="table-header">
        <h3>Flotte</h3>
        <div class="table-header-actions">
          <button class="btn-p" id="veh-new-btn">+ Nouveau véhicule</button>
        </div>
      </div>
      <div class="filter-bar">
        <select id="veh-statut-filter">
          <option value="">Tous les statuts</option>
          <option value="disponible">Disponible</option>
          <option value="en_mission">En mission</option>
          <option value="en_maintenance">En maintenance</option>
          <option value="hors_service">Hors service</option>
        </select>
      </div>
      <div class="tscroll">
        <table>
          <thead><tr>
            <th>Immatriculation</th><th>Marque</th><th>Type</th><th>Statut</th><th>Km</th><th>Assurance exp.</th><th>CT exp.</th><th>Actions</th>
          </tr></thead>
          <tbody id="veh-tbody">${loadingRow(8)}</tbody>
        </table>
      </div>
    </div>

    <!-- MODAL VEHICULE -->
    <div class="overlay" id="veh-modal">
      <div class="modal">
        <div class="drag"></div>
        <h3 id="veh-modal-title">Nouveau véhicule</h3>
        <input type="hidden" id="veh-id">
        <div class="g2">
          <div class="form-row"><label>Immatriculation *</label><input id="veh-immat" maxlength="20"></div>
          <div class="form-row"><label>Statut</label>
            <select id="veh-statut">
              <option value="disponible">Disponible</option>
              <option value="en_mission">En mission</option>
              <option value="en_maintenance">En maintenance</option>
              <option value="hors_service">Hors service</option>
            </select>
          </div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Marque *</label><input id="veh-marque" maxlength="50"></div>
          <div class="form-row"><label>Modèle</label><input id="veh-modele" maxlength="80"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Année</label><input type="number" id="veh-annee" min="1990" max="2100"></div>
          <div class="form-row"><label>Type</label>
            <select id="veh-type">
              <option value="camionnette">Camionnette</option>
              <option value="voiture">Voiture</option>
              <option value="camion">Camion</option>
              <option value="moto">Moto</option>
            </select>
          </div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Couleur</label><input id="veh-couleur" maxlength="30"></div>
          <div class="form-row"><label>Kilométrage</label><input type="number" id="veh-km" min="0"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Assurance — expiration</label><input type="date" id="veh-assurance"></div>
          <div class="form-row"><label>Contrôle technique — expiration</label><input type="date" id="veh-ct"></div>
        </div>
        <div class="form-row"><label>Notes</label><textarea id="veh-notes" maxlength="1000"></textarea></div>

        <div id="veh-entretiens-section" style="display:none">
          <div class="msec">Historique entretiens</div>
          <div id="veh-entretiens-list"></div>
          <button class="btn-add-row" id="veh-add-entretien">+ Ajouter un entretien</button>
        </div>

        <div class="modal-actions">
          <button class="btn-cancel" id="veh-cancel">Annuler</button>
          <button class="btn-save" id="veh-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- MODAL ENTRETIEN -->
    <div class="overlay" id="ent-modal">
      <div class="modal">
        <div class="drag"></div>
        <h3>Nouvel entretien</h3>
        <input type="hidden" id="ent-veh-id">
        <div class="g2">
          <div class="form-row"><label>Type *</label><input id="ent-type" maxlength="100" placeholder="Vidange, pneus…"></div>
          <div class="form-row"><label>Date</label><input type="date" id="ent-date"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Kilométrage</label><input type="number" id="ent-km" min="0"></div>
          <div class="form-row"><label>Coût (AED)</label><input type="number" id="ent-cout" min="0" step="0.01"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Garage</label><input id="ent-garage" maxlength="150"></div>
          <div class="form-row"><label>Prochain entretien (km)</label><input type="number" id="ent-prochain-km" min="0"></div>
        </div>
        <div class="form-row"><label>Description</label><textarea id="ent-description" maxlength="500"></textarea></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="ent-cancel">Annuler</button>
          <button class="btn-save" id="ent-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  async function load() {
    const statut = document.getElementById('veh-statut-filter').value;
    document.getElementById('veh-tbody').innerHTML = loadingRow(8);
    try {
      const data = await api.get(`/vehicules?statut=${statut}`);
      render(data || []);
    } catch (e) { toast(e.message,'error'); }
  }

  function render(vehicules) {
    const tbody = document.getElementById('veh-tbody');
    if (!vehicules.length) { tbody.innerHTML = emptyRow(8); return; }
    const today = new Date();
    const statCls = { disponible:'gr', en_mission:'bg', en_maintenance:'ye', hors_service:'re' };
    tbody.innerHTML = vehicules.map(v => {
      const assWarn = v.assurance_expiration && (new Date(v.assurance_expiration) - today) < 30*24*3600*1000;
      const ctWarn  = v.controle_technique_expiration && (new Date(v.controle_technique_expiration) - today) < 30*24*3600*1000;
      return `
        <tr data-id="${v.id}">
          <td><strong>${escape(v.immatriculation)}</strong></td>
          <td>${escape(v.marque)} ${escape(v.modele||'')}</td>
          <td class="td-muted">${v.type}</td>
          <td>${badge(statCls[v.statut]||'gy', v.statut.replace('_',' '))}</td>
          <td class="td-muted">${(v.kilometrage||0).toLocaleString()} km</td>
          <td class="${assWarn?'ye':'td-muted'}">${fmtDate(v.assurance_expiration)}${assWarn?' ⚠️':''}</td>
          <td class="${ctWarn?'ye':'td-muted'}">${fmtDate(v.controle_technique_expiration)}${ctWarn?' ⚠️':''}</td>
          <td>
            <button class="act blue" data-action="edit" data-id="${v.id}">Modifier</button>
            <button class="act" data-action="entretien" data-id="${v.id}">Entretien</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openNew() {
    document.getElementById('veh-id').value = '';
    document.getElementById('veh-modal-title').textContent = 'Nouveau véhicule';
    document.getElementById('veh-entretiens-section').style.display = 'none';
    ['immat','marque','modele','couleur','notes'].forEach(f => { document.getElementById(`veh-${f}`).value = ''; });
    ['veh-annee','veh-km'].forEach(id => { document.getElementById(id).value = ''; });
    ['veh-assurance','veh-ct'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('veh-statut').value = 'disponible';
    document.getElementById('veh-type').value   = 'camionnette';
    openModal('veh-modal');
  }

  async function openEdit(id) {
    try {
      const v = await api.get(`/vehicules/${id}`);
      document.getElementById('veh-id').value     = v.id;
      document.getElementById('veh-modal-title').textContent = 'Modifier véhicule';
      document.getElementById('veh-immat').value  = v.immatriculation || '';
      document.getElementById('veh-marque').value = v.marque || '';
      document.getElementById('veh-modele').value = v.modele || '';
      document.getElementById('veh-annee').value  = v.annee || '';
      document.getElementById('veh-type').value   = v.type || 'camionnette';
      document.getElementById('veh-statut').value = v.statut || 'disponible';
      document.getElementById('veh-couleur').value = v.couleur || '';
      document.getElementById('veh-km').value     = v.kilometrage || 0;
      document.getElementById('veh-assurance').value = fmtDateInput(v.assurance_expiration);
      document.getElementById('veh-ct').value        = fmtDateInput(v.controle_technique_expiration);
      document.getElementById('veh-notes').value     = v.notes || '';

      const entSection = document.getElementById('veh-entretiens-section');
      entSection.style.display = '';
      const entList = document.getElementById('veh-entretiens-list');
      if ((v.vehicule_entretiens||[]).length) {
        entList.innerHTML = `<table class="lignes-table"><thead><tr><th>Date</th><th>Type</th><th>Km</th><th>Coût</th><th>Garage</th></tr></thead><tbody>
          ${v.vehicule_entretiens.sort((a,b)=>b.date>a.date?1:-1).map(e => `
            <tr><td>${fmtDate(e.date)}</td><td>${escape(e.type)}</td><td>${(e.kilometrage||0).toLocaleString()}</td>
            <td>${fmtAED(e.cout)}</td><td class="td-muted">${escape(e.garage||'—')}</td></tr>
          `).join('')}</tbody></table>`;
      } else {
        entList.innerHTML = '<p class="td-muted" style="padding:8px 0;font-size:12px">Aucun entretien enregistré</p>';
      }
      document.getElementById('veh-add-entretien').dataset.id = v.id;
      openModal('veh-modal');
    } catch (e) { toast(e.message,'error'); }
  }

  async function save() {
    const id = document.getElementById('veh-id').value;
    const body = {
      immatriculation:               document.getElementById('veh-immat').value.trim(),
      marque:                        document.getElementById('veh-marque').value.trim(),
      modele:                        document.getElementById('veh-modele').value.trim() || null,
      annee:                         document.getElementById('veh-annee').value ? +document.getElementById('veh-annee').value : null,
      type:                          document.getElementById('veh-type').value,
      statut:                        document.getElementById('veh-statut').value,
      couleur:                       document.getElementById('veh-couleur').value.trim() || null,
      kilometrage:                   +document.getElementById('veh-km').value || 0,
      assurance_expiration:          document.getElementById('veh-assurance').value || null,
      controle_technique_expiration: document.getElementById('veh-ct').value || null,
      notes:                         document.getElementById('veh-notes').value.trim() || null,
    };
    if (!body.immatriculation || !body.marque) { toast('Immatriculation et marque requises','warning'); return; }
    const btn = document.getElementById('veh-save-btn');
    btn.disabled = true;
    try {
      if (id) await api.put(`/vehicules/${id}`, body);
      else     await api.post('/vehicules', body);
      toast(id ? 'Véhicule mis à jour' : 'Véhicule créé','success');
      closeModal('veh-modal');
      load();
    } catch (e) { toast(e.message,'error'); }
    finally { btn.disabled = false; }
  }

  document.getElementById('veh-add-entretien').addEventListener('click', e => {
    const vid = e.target.dataset.id || document.getElementById('veh-id').value;
    document.getElementById('ent-veh-id').value = vid;
    document.getElementById('ent-date').value = new Date().toISOString().slice(0,10);
    ['ent-type','ent-garage','ent-description'].forEach(id => { document.getElementById(id).value = ''; });
    ['ent-km','ent-cout','ent-prochain-km'].forEach(id => { document.getElementById(id).value = ''; });
    openModal('ent-modal');
  });

  document.getElementById('ent-save-btn').addEventListener('click', async () => {
    const vid = document.getElementById('ent-veh-id').value;
    const type = document.getElementById('ent-type').value.trim();
    if (!type) { toast('Type d\'entretien requis','warning'); return; }
    const btn = document.getElementById('ent-save-btn');
    btn.disabled = true;
    try {
      await api.post(`/vehicules/${vid}/entretiens`, {
        type,
        date:        document.getElementById('ent-date').value,
        kilometrage: document.getElementById('ent-km').value ? +document.getElementById('ent-km').value : null,
        cout:        document.getElementById('ent-cout').value ? +document.getElementById('ent-cout').value : 0,
        garage:      document.getElementById('ent-garage').value.trim() || null,
        prochain_km: document.getElementById('ent-prochain-km').value ? +document.getElementById('ent-prochain-km').value : null,
        description: document.getElementById('ent-description').value.trim() || null,
      });
      toast('Entretien enregistré','success');
      closeModal('ent-modal');
      openEdit(vid);
    } catch (e) { toast(e.message,'error'); }
    finally { btn.disabled = false; }
  });

  document.getElementById('veh-new-btn').addEventListener('click', openNew);
  document.getElementById('veh-save-btn').addEventListener('click', save);
  document.getElementById('veh-cancel').addEventListener('click', () => closeModal('veh-modal'));
  document.getElementById('ent-cancel').addEventListener('click', () => closeModal('ent-modal'));
  document.getElementById('veh-statut-filter').addEventListener('change', load);
  document.getElementById('veh-tbody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn?.dataset.action === 'edit')     { openEdit(btn.dataset.id); return; }
    if (btn?.dataset.action === 'entretien') {
      document.getElementById('ent-veh-id').value = btn.dataset.id;
      document.getElementById('ent-date').value = new Date().toISOString().slice(0,10);
      ['ent-type','ent-garage','ent-description'].forEach(id => { document.getElementById(id).value = ''; });
      ['ent-km','ent-cout','ent-prochain-km'].forEach(id => { document.getElementById(id).value = ''; });
      openModal('ent-modal');
      return;
    }
    const row = e.target.closest('tr[data-id]');
    if (row) openEdit(row.dataset.id);
  });

  load();
}
