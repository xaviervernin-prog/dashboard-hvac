let employesData = [];
let congesData   = [];

async function loadRH(forceReload = true) {
  const panel = document.getElementById('tab-rh');
  if (!forceReload && employesData.length) { renderRH(); return; }

  panel.innerHTML = `
    <h2 class="page-title">RH / Équipe</h2>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      <button class="btn-p" id="rh-tab-emp" onclick="rhShowTab('employes')">👥 Employés</button>
      <button class="btn-p gray" id="rh-tab-conges" onclick="rhShowTab('conges')">📅 Congés</button>
      <button class="btn-p gray" id="rh-tab-point" onclick="rhShowTab('pointages')">⏱ Pointages</button>
    </div>
    <div id="rh-content"><div class="loading"><div class="spinner"></div>Chargement…</div></div>
    <div id="rh-modal" class="modal"></div>`;

  try {
    [employesData, congesData] = await Promise.all([
      api.get('/rh/employes'),
      api.get('/rh/conges')
    ]);
    rhShowTab('employes');
  } catch (err) {
    document.getElementById('rh-content').innerHTML =
      `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

function rhShowTab(tab) {
  ['employes','conges','pointages'].forEach(t => {
    const btn = document.getElementById(`rh-tab-${t}`);
    if (btn) btn.className = t === tab ? 'btn-p' : 'btn-p gray';
  });
  if (tab === 'employes') renderEmployes();
  else if (tab === 'conges') renderConges();
  else renderPointages();
}

// ── EMPLOYÉS ──────────────────────────────────────────────────────────────────

function renderEmployes() {
  const now = new Date();
  const content = document.getElementById('rh-content');
  content.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>Équipe (${employesData.length})</h3>
        ${hasRole('administrateur') ? '<button class="btn-p" onclick="openEmployeForm()">+ Ajouter</button>' : ''}
      </div>
      <div class="tscroll">
        <table>
          <thead><tr>
            <th>Nom</th><th>Poste</th><th>Contrat</th><th>Visa</th><th>Permis</th><th>Statut</th><th>Actions</th>
          </tr></thead>
          <tbody>${employesData.map(e => employeRow(e, now)).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

function employeRow(e, now) {
  const fullName = escapeHtml(`${e.prenom||''} ${e.nom}`.trim());
  const visaAlert = e.visa_expiration && new Date(e.visa_expiration) < new Date(now.getTime() + 30*86400000);
  const permisAlert = e.permis_expiration && new Date(e.permis_expiration) < new Date(now.getTime() + 30*86400000);
  return `
    <tr onclick="openEmployeDetail(${e.id})" style="cursor:pointer">
      <td><strong>${fullName}</strong>${e.photo_url ? '' : ''}</td>
      <td>${escapeHtml(e.poste||'—')}</td>
      <td><span class="badge">${e.type_contrat||'—'}</span></td>
      <td>${e.visa_expiration ? `<span class="${visaAlert?'badge red':'badge green'}">${fmtDate(e.visa_expiration)}</span>` : '—'}</td>
      <td>${e.permis_expiration ? `<span class="${permisAlert?'badge red':'badge green'}">${fmtDate(e.permis_expiration)}</span>` : '—'}</td>
      <td>${e.actif ? '<span class="badge green">Actif</span>' : '<span class="badge red">Inactif</span>'}</td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap">
        ${hasRole('administrateur') ? `<button class="act" onclick="openEmployeForm(${e.id})">Modifier</button>` : ''}
      </td>
    </tr>`;
}

async function openEmployeDetail(id) {
  openEmployeForm(id);
}

async function openEmployeForm(id = null) {
  let e = {};
  if (id) e = await api.get(`/rh/employes/${id}`);

  const modal = document.getElementById('rh-modal');
  const isAdmin = hasRole('administrateur');
  const dis = isAdmin ? '' : 'disabled';

  modal.innerHTML = `
    <div class="modal-hd">
      <h3>${id ? escapeHtml(`${e.prenom||''} ${e.nom||''}`.trim()) : 'Nouvel employé'}</h3>
      <button class="modal-close" onclick="closeModal('rh-modal')">×</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Nom *</label><input id="emp-nom" value="${escapeHtml(e.nom||'')}" ${dis}></div>
        <div class="form-group"><label>Prénom</label><input id="emp-prenom" value="${escapeHtml(e.prenom||'')}" ${dis}></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Poste</label><input id="emp-poste" value="${escapeHtml(e.poste||'')}" ${dis}></div>
        <div class="form-group"><label>Contrat</label>
          <select id="emp-contrat" ${dis}>
            ${['CDI','CDD','freelance','visa_emploi'].map(t=>`<option value="${t}" ${e.type_contrat===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input type="email" id="emp-email" value="${escapeHtml(e.email||'')}" ${dis}></div>
        <div class="form-group"><label>Téléphone</label><input id="emp-tel" value="${escapeHtml(e.tel||'')}" ${dis}></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Date embauche</label><input type="date" id="emp-embauche" value="${e.date_embauche?.slice(0,10)||''}" ${dis}></div>
        <div class="form-group"><label>Salaire base (AED)</label><input type="number" id="emp-salaire" value="${e.salaire_base||''}" ${dis}></div>
      </div>
      <div class="form-section-title">Documents UAE</div>
      <div class="form-row">
        <div class="form-group"><label>N° Visa</label><input id="emp-visa-num" value="${escapeHtml(e.numero_visa||'')}" ${dis}></div>
        <div class="form-group"><label>Expiration visa</label><input type="date" id="emp-visa-exp" value="${e.visa_expiration?.slice(0,10)||''}" ${dis}></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>N° Permis</label><input id="emp-permis-num" value="${escapeHtml(e.permis_conduire||'')}" ${dis}></div>
        <div class="form-group"><label>Expiration permis</label><input type="date" id="emp-permis-exp" value="${e.permis_expiration?.slice(0,10)||''}" ${dis}></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>N° Passeport</label><input id="emp-passeport-num" value="${escapeHtml(e.passeport_num||'')}" ${dis}></div>
        <div class="form-group"><label>Expiration passeport</label><input type="date" id="emp-passeport-exp" value="${e.passeport_exp?.slice(0,10)||''}" ${dis}></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Nationalité</label><input id="emp-nationalite" value="${escapeHtml(e.nationalite||'')}" ${dis}></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('rh-modal')">Fermer</button>
      ${isAdmin ? `<button class="btn-p" onclick="saveEmploye(${id||'null'})">💾 Enregistrer</button>` : ''}
    </div>`;
  openModal('rh-modal');
}

async function saveEmploye(id) {
  const body = {
    nom: document.getElementById('emp-nom').value.trim(),
    prenom: document.getElementById('emp-prenom').value.trim(),
    poste: document.getElementById('emp-poste').value.trim(),
    type_contrat: document.getElementById('emp-contrat').value,
    email: document.getElementById('emp-email').value.trim(),
    tel: document.getElementById('emp-tel').value.trim(),
    date_embauche: document.getElementById('emp-embauche').value || null,
    salaire_base: +document.getElementById('emp-salaire').value || null,
    numero_visa: document.getElementById('emp-visa-num').value.trim(),
    visa_expiration: document.getElementById('emp-visa-exp').value || null,
    permis_conduire: document.getElementById('emp-permis-num').value.trim(),
    permis_expiration: document.getElementById('emp-permis-exp').value || null,
    passeport_num: document.getElementById('emp-passeport-num').value.trim(),
    passeport_exp: document.getElementById('emp-passeport-exp').value || null,
    nationalite: document.getElementById('emp-nationalite').value.trim(),
  };
  if (!body.nom) { showToast('Le nom est requis', 'error'); return; }
  try {
    if (id) await api.put(`/rh/employes/${id}`, body);
    else await api.post('/rh/employes', body);
    showToast(id ? 'Employé mis à jour' : 'Employé créé', 'success');
    closeModal('rh-modal');
    employesData = await api.get('/rh/employes');
    renderEmployes();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── CONGÉS ────────────────────────────────────────────────────────────────────

function renderConges() {
  const content = document.getElementById('rh-content');
  content.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>Congés & Absences</h3>
        <button class="btn-p" onclick="openCongeForm()">+ Demande</button>
      </div>
      <div class="tscroll">
        <table>
          <thead><tr>
            <th>Employé</th><th>Type</th><th>Du</th><th>Au</th><th>Jours</th><th>Statut</th><th>Actions</th>
          </tr></thead>
          <tbody>${congesData.map(congeRow).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

function congeRow(c) {
  const name = escapeHtml(`${c.prenom||''} ${c.nom||''}`.trim());
  const badge = c.statut === 'approuve' ? 'green' : c.statut === 'refuse' ? 'red' : 'orange';
  return `
    <tr>
      <td>${name}</td>
      <td><span class="badge">${c.type_conge}</span></td>
      <td>${fmtDate(c.date_debut)}</td>
      <td>${fmtDate(c.date_fin)}</td>
      <td>${c.nb_jours||'—'}</td>
      <td><span class="badge ${badge}">${c.statut}</span></td>
      <td style="white-space:nowrap">
        ${c.statut === 'en_attente' && hasRole('administrateur')
          ? `<button class="act green" onclick="approuverConge(${c.id},'approuve')">✓</button>
             <button class="act red" onclick="approuverConge(${c.id},'refuse')">✗</button>` : ''}
        ${hasRole('administrateur') ? `<button class="act red" onclick="supprimerConge(${c.id})">Suppr.</button>` : ''}
      </td>
    </tr>`;
}

async function openCongeForm() {
  const empOptions = employesData.map(e =>
    `<option value="${e.id}">${escapeHtml(`${e.prenom||''} ${e.nom}`.trim())}</option>`).join('');
  const modal = document.getElementById('rh-modal');
  modal.innerHTML = `
    <div class="modal-hd"><h3>Demande de congé</h3><button class="modal-close" onclick="closeModal('rh-modal')">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Employé *</label>
          <select id="cg-emp"><option value="">— Choisir —</option>${empOptions}</select>
        </div>
        <div class="form-group"><label>Type</label>
          <select id="cg-type">
            ${['annuel','maladie','sans_solde','ferie'].map(t=>`<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Du *</label><input type="date" id="cg-debut"></div>
        <div class="form-group"><label>Au *</label><input type="date" id="cg-fin"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Nb jours</label><input type="number" id="cg-jours" min="1"></div>
        <div class="form-group"><label>Notes</label><input id="cg-notes"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('rh-modal')">Annuler</button>
      <button class="btn-p" onclick="saveConge()">💾 Enregistrer</button>
    </div>`;
  openModal('rh-modal');
}

async function saveConge() {
  const body = {
    employe_id: +document.getElementById('cg-emp').value,
    type_conge: document.getElementById('cg-type').value,
    date_debut: document.getElementById('cg-debut').value,
    date_fin: document.getElementById('cg-fin').value,
    nb_jours: +document.getElementById('cg-jours').value || null,
    notes: document.getElementById('cg-notes').value.trim()
  };
  if (!body.employe_id || !body.date_debut || !body.date_fin) {
    showToast('Employé, date début et date fin sont requis', 'error'); return;
  }
  try {
    await api.post('/rh/conges', body);
    showToast('Demande enregistrée', 'success');
    closeModal('rh-modal');
    congesData = await api.get('/rh/conges');
    renderConges();
  } catch (err) { showToast(err.message, 'error'); }
}

async function approuverConge(id, statut) {
  try {
    await api.patch(`/rh/conges/${id}/statut`, { statut });
    showToast(statut === 'approuve' ? 'Congé approuvé' : 'Congé refusé', 'success');
    congesData = await api.get('/rh/conges');
    renderConges();
  } catch (err) { showToast(err.message, 'error'); }
}

async function supprimerConge(id) {
  if (!confirm('Supprimer cette demande de congé ?')) return;
  try {
    await api.del(`/rh/conges/${id}`);
    congesData = congesData.filter(c => c.id !== id);
    renderConges();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── POINTAGES ─────────────────────────────────────────────────────────────────

async function renderPointages() {
  const content = document.getElementById('rh-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div>Chargement…</div>';
  try {
    const data = await api.get('/rh/pointages');
    const empOptions = employesData.map(e =>
      `<option value="${e.id}">${escapeHtml(`${e.prenom||''} ${e.nom}`.trim())}</option>`).join('');
    content.innerHTML = `
      <div class="table-card">
        <div class="table-header">
          <h3>Pointages</h3>
          <button class="btn-p" onclick="openPointageForm()">+ Ajouter</button>
        </div>
        <div class="tscroll">
          <table>
            <thead><tr><th>Employé</th><th>Date</th><th>Début</th><th>Fin</th><th>Heures</th><th>Activité</th><th></th></tr></thead>
            <tbody>${data.map(p => `
              <tr>
                <td>${escapeHtml(`${p.prenom||''} ${p.nom||''}`.trim())}</td>
                <td>${fmtDate(p.date_travail)}</td>
                <td>${p.heure_debut||'—'}</td>
                <td>${p.heure_fin||'—'}</td>
                <td><strong>${p.heures_travail||'—'}</strong></td>
                <td><span class="badge">${p.type_activite}</span></td>
                <td>${hasRole('administrateur') ? `<button class="act red" onclick="supprimerPointage(${p.id})">Suppr.</button>` : ''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    window._pointageEmpOptions = empOptions;
  } catch (err) {
    content.innerHTML = `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

async function openPointageForm() {
  const modal = document.getElementById('rh-modal');
  modal.innerHTML = `
    <div class="modal-hd"><h3>Ajouter un pointage</h3><button class="modal-close" onclick="closeModal('rh-modal')">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Employé *</label>
          <select id="pt-emp"><option value="">— Choisir —</option>${window._pointageEmpOptions||''}</select>
        </div>
        <div class="form-group"><label>Date *</label><input type="date" id="pt-date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Heure début</label><input type="time" id="pt-debut"></div>
        <div class="form-group"><label>Heure fin</label><input type="time" id="pt-fin"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Heures travaillées</label><input type="number" step="0.25" id="pt-heures"></div>
        <div class="form-group"><label>Type activité</label>
          <select id="pt-type">
            ${['intervention','atelier','deplacement','formation','autre'].map(t=>`<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="pt-notes" rows="2"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('rh-modal')">Annuler</button>
      <button class="btn-p" onclick="savePointage()">💾 Enregistrer</button>
    </div>`;
  openModal('rh-modal');
}

async function savePointage() {
  const body = {
    employe_id: +document.getElementById('pt-emp').value,
    date_travail: document.getElementById('pt-date').value,
    heure_debut: document.getElementById('pt-debut').value || null,
    heure_fin: document.getElementById('pt-fin').value || null,
    heures_travail: +document.getElementById('pt-heures').value || null,
    type_activite: document.getElementById('pt-type').value,
    notes: document.getElementById('pt-notes').value.trim()
  };
  if (!body.employe_id || !body.date_travail) { showToast('Employé et date requis', 'error'); return; }
  try {
    await api.post('/rh/pointages', body);
    showToast('Pointage enregistré', 'success');
    closeModal('rh-modal');
    renderPointages();
  } catch (err) { showToast(err.message, 'error'); }
}

async function supprimerPointage(id) {
  if (!confirm('Supprimer ce pointage ?')) return;
  try { await api.del(`/rh/pointages/${id}`); renderPointages(); }
  catch (err) { showToast(err.message, 'error'); }
}
