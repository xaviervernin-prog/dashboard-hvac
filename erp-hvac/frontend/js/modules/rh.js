'use strict';

function init_rh(panel) {
  panel.innerHTML = `
    <h2 class="page-title">Ressources Humaines</h2>
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      <button class="btn-p" id="rh-tab-employes" style="background:var(--blue)">👤 Employés</button>
      <button class="btn-p gray" id="rh-tab-conges">🏖️ Congés</button>
    </div>

    <div id="rh-employes-section">
      <div class="table-card">
        <div class="table-header">
          <h3>Équipe</h3>
          <div class="table-header-actions">
            <button class="btn-p" id="emp-new-btn">+ Nouvel employé</button>
          </div>
        </div>
        <div class="filter-bar">
          <input type="search" id="emp-search" placeholder="Rechercher nom, prénom, matricule…">
        </div>
        <div class="tscroll">
          <table>
            <thead><tr>
              <th>Matricule</th><th>Nom</th><th>Poste</th><th>Téléphone</th><th>Embauche</th><th>Visa exp.</th><th>Passeport exp.</th><th>Actions</th>
            </tr></thead>
            <tbody id="emp-tbody">${loadingRow(8)}</tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="rh-conges-section" style="display:none">
      <div class="table-card">
        <div class="table-header">
          <h3>Demandes de congés</h3>
          <div class="table-header-actions">
            <button class="btn-p" id="cg-new-btn">+ Nouvelle demande</button>
          </div>
        </div>
        <div class="filter-bar">
          <select id="cg-statut-filter">
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="approuve">Approuvé</option>
            <option value="refuse">Refusé</option>
          </select>
        </div>
        <div class="tscroll">
          <table>
            <thead><tr>
              <th>Employé</th><th>Type</th><th>Du</th><th>Au</th><th>Jours</th><th>Statut</th><th>Actions</th>
            </tr></thead>
            <tbody id="cg-tbody">${loadingRow(7)}</tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL EMPLOYE -->
    <div class="overlay" id="emp-modal">
      <div class="modal">
        <div class="drag"></div>
        <h3 id="emp-modal-title">Nouvel employé</h3>
        <input type="hidden" id="emp-id">
        <div class="g2">
          <div class="form-row"><label>Matricule *</label><input id="emp-matricule" maxlength="30"></div>
          <div class="form-row"><label>Poste</label><input id="emp-poste" maxlength="100"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Nom *</label><input id="emp-nom" maxlength="100"></div>
          <div class="form-row"><label>Prénom</label><input id="emp-prenom" maxlength="80"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Email</label><input type="email" id="emp-email"></div>
          <div class="form-row"><label>Téléphone</label><input id="emp-telephone" maxlength="30"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Nationalité</label><input id="emp-nationalite" maxlength="60"></div>
          <div class="form-row"><label>Date embauche</label><input type="date" id="emp-date-embauche"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>N° Visa</label><input id="emp-visa" maxlength="50"></div>
          <div class="form-row"><label>Expiration visa</label><input type="date" id="emp-exp-visa"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>N° Passeport</label><input id="emp-passeport" maxlength="50"></div>
          <div class="form-row"><label>Expiration passeport</label><input type="date" id="emp-exp-passeport"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Salaire base (AED)</label><input type="number" id="emp-salaire" min="0" step="0.01"></div>
          <div class="form-row"><label>Type contrat</label>
            <select id="emp-contrat">
              <option value="cdi">CDI</option><option value="cdd">CDD</option>
              <option value="interim">Intérim</option><option value="freelance">Freelance</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="emp-cancel">Annuler</button>
          <button class="btn-save" id="emp-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>

    <!-- MODAL CONGE -->
    <div class="overlay" id="cg-modal">
      <div class="modal">
        <div class="drag"></div>
        <h3>Demande de congé</h3>
        <input type="hidden" id="cg-id">
        <div class="form-row"><label>Employé *</label>
          <select id="cg-employe-id"><option value="">— Sélectionner —</option></select>
        </div>
        <div class="g2">
          <div class="form-row"><label>Type</label>
            <select id="cg-type">
              <option value="annuel">Annuel</option><option value="maladie">Maladie</option>
              <option value="sans_solde">Sans solde</option><option value="autre">Autre</option>
            </select>
          </div>
          <div class="form-row"><label>Nombre de jours *</label><input type="number" id="cg-nb-jours" min="1"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Du *</label><input type="date" id="cg-date-debut"></div>
          <div class="form-row"><label>Au *</label><input type="date" id="cg-date-fin"></div>
        </div>
        <div class="form-row"><label>Motif</label><textarea id="cg-motif" maxlength="500"></textarea></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="cg-cancel">Annuler</button>
          <button class="btn-save" id="cg-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  let activeSection = 'employes';
  let employes = [];
  let searchTimer;

  function switchRhTab(tab) {
    activeSection = tab;
    document.getElementById('rh-employes-section').style.display = tab==='employes' ? '' : 'none';
    document.getElementById('rh-conges-section').style.display   = tab==='conges'   ? '' : 'none';
    document.getElementById('rh-tab-employes').style.background  = tab==='employes' ? 'var(--blue)' : 'var(--gray)';
    document.getElementById('rh-tab-conges').style.background    = tab==='conges'   ? 'var(--blue)' : 'var(--gray)';
    if (tab === 'conges') loadConges();
  }

  document.getElementById('rh-tab-employes').addEventListener('click', () => switchRhTab('employes'));
  document.getElementById('rh-tab-conges').addEventListener('click',   () => switchRhTab('conges'));

  // --- EMPLOYES ---
  async function loadEmployes() {
    const search = document.getElementById('emp-search').value;
    document.getElementById('emp-tbody').innerHTML = loadingRow(8);
    try {
      const data = await api.get(`/rh/employes?search=${encodeURIComponent(search)}`);
      employes = data || [];
      renderEmployes();
    } catch (e) { toast(e.message,'error'); }
  }

  function renderEmployes() {
    const tbody = document.getElementById('emp-tbody');
    if (!employes.length) { tbody.innerHTML = emptyRow(8); return; }
    const today = new Date();
    tbody.innerHTML = employes.map(e => {
      const visaExp  = e.expiration_visa      ? new Date(e.expiration_visa)      : null;
      const pasExp   = e.expiration_passeport ? new Date(e.expiration_passeport) : null;
      const visaWarn = visaExp  && (visaExp  - today) < 60*24*3600*1000;
      const pasWarn  = pasExp   && (pasExp   - today) < 60*24*3600*1000;
      return `
        <tr data-id="${e.id}">
          <td class="td-muted">${escape(e.matricule)}</td>
          <td><strong>${escape(e.prenom||'')} ${escape(e.nom)}</strong></td>
          <td class="td-muted">${escape(e.poste||'—')}</td>
          <td>${e.telephone ? `<a class="contact-link" href="tel:${escape(e.telephone)}">${escape(e.telephone)}</a>` : '—'}</td>
          <td class="td-muted">${fmtDate(e.date_embauche)}</td>
          <td class="${visaWarn ? 'ye' : 'td-muted'}">${fmtDate(e.expiration_visa)}${visaWarn?' ⚠️':''}</td>
          <td class="${pasWarn  ? 'ye' : 'td-muted'}">${fmtDate(e.expiration_passeport)}${pasWarn?' ⚠️':''}</td>
          <td><button class="act blue" data-action="edit" data-id="${e.id}">Modifier</button></td>
        </tr>
      `;
    }).join('');
  }

  function openEmpNew() {
    document.getElementById('emp-id').value = '';
    document.getElementById('emp-modal-title').textContent = 'Nouvel employé';
    ['matricule','poste','nom','prenom','email','telephone','nationalite','visa','passeport'].forEach(f => {
      document.getElementById(`emp-${f}`)?.value && (document.getElementById(`emp-${f}`).value = '');
    });
    ['emp-date-embauche','emp-exp-visa','emp-exp-passeport'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('emp-salaire').value  = '';
    document.getElementById('emp-contrat').value  = 'cdi';
    openModal('emp-modal');
  }

  async function openEmpEdit(id) {
    try {
      const e = await api.get(`/rh/employes/${id}`);
      document.getElementById('emp-id').value            = e.id;
      document.getElementById('emp-modal-title').textContent = 'Modifier employé';
      document.getElementById('emp-matricule').value     = e.matricule || '';
      document.getElementById('emp-nom').value           = e.nom || '';
      document.getElementById('emp-prenom').value        = e.prenom || '';
      document.getElementById('emp-email').value         = e.email || '';
      document.getElementById('emp-telephone').value     = e.telephone || '';
      document.getElementById('emp-poste').value         = e.poste || '';
      document.getElementById('emp-nationalite').value   = e.nationalite || '';
      document.getElementById('emp-visa').value          = e.numero_visa || '';
      document.getElementById('emp-exp-visa').value      = fmtDateInput(e.expiration_visa);
      document.getElementById('emp-passeport').value     = e.numero_passeport || '';
      document.getElementById('emp-exp-passeport').value = fmtDateInput(e.expiration_passeport);
      document.getElementById('emp-salaire').value       = e.salaire_base || '';
      document.getElementById('emp-contrat').value       = e.type_contrat || 'cdi';
      document.getElementById('emp-date-embauche').value = fmtDateInput(e.date_embauche);
      openModal('emp-modal');
    } catch (ex) { toast(ex.message,'error'); }
  }

  async function saveEmploye() {
    const id = document.getElementById('emp-id').value;
    const body = {
      matricule:            document.getElementById('emp-matricule').value.trim(),
      nom:                  document.getElementById('emp-nom').value.trim(),
      prenom:               document.getElementById('emp-prenom').value.trim() || null,
      email:                document.getElementById('emp-email').value.trim()  || null,
      telephone:            document.getElementById('emp-telephone').value.trim() || null,
      poste:                document.getElementById('emp-poste').value.trim()  || null,
      nationalite:          document.getElementById('emp-nationalite').value.trim() || null,
      numero_visa:          document.getElementById('emp-visa').value.trim()   || null,
      expiration_visa:      document.getElementById('emp-exp-visa').value      || null,
      numero_passeport:     document.getElementById('emp-passeport').value.trim() || null,
      expiration_passeport: document.getElementById('emp-exp-passeport').value || null,
      salaire_base:         document.getElementById('emp-salaire').value ? +document.getElementById('emp-salaire').value : null,
      type_contrat:         document.getElementById('emp-contrat').value,
      date_embauche:        document.getElementById('emp-date-embauche').value || null,
    };
    if (!body.matricule || !body.nom) { toast('Matricule et nom requis','warning'); return; }
    const btn = document.getElementById('emp-save-btn');
    btn.disabled = true;
    try {
      if (id) await api.put(`/rh/employes/${id}`, body);
      else     await api.post('/rh/employes', body);
      toast(id ? 'Employé mis à jour' : 'Employé créé','success');
      closeModal('emp-modal');
      loadEmployes();
    } catch (e) { toast(e.message,'error'); }
    finally { btn.disabled = false; }
  }

  document.getElementById('emp-new-btn').addEventListener('click', openEmpNew);
  document.getElementById('emp-save-btn').addEventListener('click', saveEmploye);
  document.getElementById('emp-cancel').addEventListener('click', () => closeModal('emp-modal'));
  document.getElementById('emp-search').addEventListener('input', () => {
    clearTimeout(searchTimer); searchTimer = setTimeout(loadEmployes, 300);
  });
  document.getElementById('emp-tbody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn?.dataset.action === 'edit') { openEmpEdit(btn.dataset.id); return; }
    const row = e.target.closest('tr[data-id]');
    if (row) openEmpEdit(row.dataset.id);
  });

  // --- CONGES ---
  async function loadConges() {
    const statut = document.getElementById('cg-statut-filter').value;
    document.getElementById('cg-tbody').innerHTML = loadingRow(7);
    try {
      const data = await api.get(`/rh/conges?statut=${statut}`);
      renderConges(data || []);
    } catch (e) { toast(e.message,'error'); }
  }

  function renderConges(conges) {
    const tbody = document.getElementById('cg-tbody');
    if (!conges.length) { tbody.innerHTML = emptyRow(7); return; }
    const statCls = { en_attente:'ye', approuve:'gr', refuse:'re' };
    tbody.innerHTML = conges.map(c => `
      <tr>
        <td>${escape((c.employes?.prenom||'') + ' ' + (c.employes?.nom||''))}</td>
        <td>${badge('bg', c.type)}</td>
        <td>${fmtDate(c.date_debut)}</td>
        <td>${fmtDate(c.date_fin)}</td>
        <td>${c.nb_jours}j</td>
        <td>${badge(statCls[c.statut]||'gy', c.statut.replace('_',' '))}</td>
        <td>
          ${c.statut === 'en_attente' ? `
            <button class="act green" data-action="approve" data-id="${c.id}">Approuver</button>
            <button class="act red"   data-action="refuse"  data-id="${c.id}">Refuser</button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  }

  async function openCgNew() {
    if (!employes.length) await loadEmployes();
    const sel = document.getElementById('cg-employe-id');
    sel.innerHTML = '<option value="">— Sélectionner —</option>' +
      employes.map(e => `<option value="${e.id}">${escape(e.prenom||'')} ${escape(e.nom)}</option>`).join('');
    document.getElementById('cg-date-debut').value = '';
    document.getElementById('cg-date-fin').value   = '';
    document.getElementById('cg-nb-jours').value   = '';
    document.getElementById('cg-motif').value       = '';
    openModal('cg-modal');
  }

  document.getElementById('cg-new-btn').addEventListener('click', openCgNew);
  document.getElementById('cg-cancel').addEventListener('click', () => closeModal('cg-modal'));
  document.getElementById('cg-statut-filter').addEventListener('change', loadConges);
  document.getElementById('cg-save-btn').addEventListener('click', async () => {
    const body = {
      employe_id: document.getElementById('cg-employe-id').value,
      type:       document.getElementById('cg-type').value,
      date_debut: document.getElementById('cg-date-debut').value,
      date_fin:   document.getElementById('cg-date-fin').value,
      nb_jours:   +document.getElementById('cg-nb-jours').value,
      motif:      document.getElementById('cg-motif').value.trim() || null,
    };
    if (!body.employe_id || !body.date_debut || !body.date_fin || !body.nb_jours) {
      toast('Tous les champs obligatoires','warning'); return;
    }
    try {
      await api.post('/rh/conges', body);
      toast('Demande enregistrée','success');
      closeModal('cg-modal');
      loadConges();
    } catch (e) { toast(e.message,'error'); }
  });
  document.getElementById('cg-tbody').addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const statut = btn.dataset.action === 'approve' ? 'approuve' : 'refuse';
    try {
      await api.patch(`/rh/conges/${btn.dataset.id}/statut`, { statut });
      toast(statut === 'approuve' ? 'Congé approuvé' : 'Congé refusé','success');
      loadConges();
    } catch (e) { toast(e.message,'error'); }
  });

  loadEmployes();
}
