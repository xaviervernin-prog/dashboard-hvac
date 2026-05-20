let vehiculesData = [];
let employesForVeh = [];

async function loadVehicules(forceReload = true) {
  const panel = document.getElementById('tab-vehicules');
  if (!forceReload && vehiculesData.length) { renderVehicules(); return; }

  panel.innerHTML = `
    <h2 class="page-title">Véhicules / Matériel</h2>
    <div class="loading"><div class="spinner"></div>Chargement…</div>
    <div id="veh-modal" class="modal"></div>`;

  try {
    [vehiculesData, employesForVeh] = await Promise.all([
      api.get('/vehicules'),
      api.get('/rh/employes')
    ]);
    renderVehicules();
  } catch (err) {
    document.querySelector('#tab-vehicules .loading').outerHTML =
      `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

function renderVehicules() {
  const panel = document.getElementById('tab-vehicules');
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000);

  const cards = vehiculesData.map(v => {
    const alerts = [];
    if (v.mulkiya_exp && new Date(v.mulkiya_exp) < soon)
      alerts.push(`<span class="badge red">Mulkiya exp. ${fmtDate(v.mulkiya_exp)}</span>`);
    if (v.assurance_exp && new Date(v.assurance_exp) < soon)
      alerts.push(`<span class="badge red">Assurance exp. ${fmtDate(v.assurance_exp)}</span>`);
    if (v.controle_tech_exp && new Date(v.controle_tech_exp) < soon)
      alerts.push(`<span class="badge orange">Contrôle tech exp. ${fmtDate(v.controle_tech_exp)}</span>`);

    return `
      <div class="table-card" style="cursor:pointer" onclick="openVehiculeDetail(${v.id})">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:18px;font-weight:700;color:var(--blue)">${escapeHtml(v.immatriculation)}</div>
            <div style="color:var(--muted);font-size:13px">${escapeHtml(`${v.marque||''} ${v.modele||''}`.trim()||'—')} · ${v.annee||'—'}</div>
            ${v.employe_nom ? `<div style="font-size:12px;margin-top:4px">👤 ${escapeHtml(`${v.employe_prenom||''} ${v.employe_nom}`.trim())}</div>` : ''}
          </div>
          <div>
            <span class="badge">${v.type_vehicule}</span>
            ${v.actif ? '' : '<span class="badge red" style="margin-left:4px">Inactif</span>'}
          </div>
        </div>
        ${alerts.length ? `<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${alerts.join('')}</div>` : ''}
        <div onclick="event.stopPropagation()" style="margin-top:12px;display:flex;gap:8px">
          ${hasRole('administrateur','commercial')
            ? `<button class="act" onclick="openVehiculeForm(${v.id})">Modifier</button>
               <button class="act blue" onclick="openEntretienForm(${v.id})">+ Entretien</button>
               <button class="act" onclick="openPleinForm(${v.id})">⛽ Plein</button>` : ''}
        </div>
      </div>`;
  });

  const existing = panel.querySelector('.veh-grid, .empty');
  if (existing) existing.remove();
  const header = panel.querySelector('h2');

  const actionsHtml = hasRole('administrateur')
    ? '<button class="btn-p" onclick="openVehiculeForm()" style="margin-bottom:16px">+ Ajouter véhicule</button>' : '';

  if (!vehiculesData.length) {
    header.insertAdjacentHTML('afterend',
      `${actionsHtml}<div class="empty"><div class="empty-icon">🚗</div><p>Aucun véhicule</p></div>`);
    return;
  }

  header.insertAdjacentHTML('afterend',
    `${actionsHtml}<div class="veh-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">${cards.join('')}</div>`);
}

async function openVehiculeDetail(id) {
  const v = await api.get(`/vehicules/${id}`);
  const modal = document.getElementById('veh-modal');
  const entretienRows = (v.entretiens||[]).map(e => `
    <tr>
      <td>${fmtDate(e.date_entretien)}</td>
      <td>${escapeHtml(e.type_entretien)}</td>
      <td>${escapeHtml(e.description||'—')}</td>
      <td>${e.cout ? fmt(e.cout) : '—'}</td>
      <td>${e.kilometrage ? e.kilometrage+' km' : '—'}</td>
      <td>${e.prochain_entretien ? fmtDate(e.prochain_entretien) : '—'}</td>
    </tr>`).join('');

  const pleinRows = (v.pleins||[]).map(p => `
    <tr>
      <td>${fmtDate(p.date_plein)}</td>
      <td>${p.litres ? p.litres+' L' : '—'}</td>
      <td>${p.montant ? fmt(p.montant) : '—'}</td>
      <td>${p.kilometrage ? p.kilometrage+' km' : '—'}</td>
    </tr>`).join('');

  modal.innerHTML = `
    <div class="modal-hd">
      <h3>${escapeHtml(v.immatriculation)} — ${escapeHtml(`${v.marque||''} ${v.modele||''}`.trim())}</h3>
      <button class="modal-close" onclick="closeModal('veh-modal')">×</button>
    </div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        ${[['Année',v.annee||'—'],['Couleur',v.couleur||'—'],['Type',v.type_vehicule],
           ['Mulkiya exp.',v.mulkiya_exp?fmtDate(v.mulkiya_exp):'—'],
           ['Assurance exp.',v.assurance_exp?fmtDate(v.assurance_exp):'—'],
           ['Assurance n°',v.assurance_num||'—'],
           ['Contrôle tech.',v.controle_tech_exp?fmtDate(v.controle_tech_exp):'—']].map(([k,val])=>
          `<div><span style="font-size:11px;color:var(--muted)">${k}</span><div style="font-weight:600">${escapeHtml(String(val))}</div></div>`).join('')}
      </div>
      ${entretienRows ? `
        <div class="form-section-title">Historique entretiens</div>
        <div class="tscroll" style="max-height:180px">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Coût</th><th>Km</th><th>Prochain</th></tr></thead>
            <tbody>${entretienRows}</tbody>
          </table>
        </div>` : '<div class="alert" style="margin:0 0 8px">Aucun entretien enregistré</div>'}
      ${pleinRows ? `
        <div class="form-section-title" style="margin-top:12px">Derniers pleins</div>
        <div class="tscroll" style="max-height:150px">
          <table>
            <thead><tr><th>Date</th><th>Litres</th><th>Montant</th><th>Km</th></tr></thead>
            <tbody>${pleinRows}</tbody>
          </table>
        </div>` : ''}
      ${v.notes ? `<div style="margin-top:12px;padding:10px;background:var(--bg);border-radius:8px;font-size:13px">${escapeHtml(v.notes)}</div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('veh-modal')">Fermer</button>
      ${hasRole('administrateur') ? `<button class="btn-p" onclick="closeModal('veh-modal');openVehiculeForm(${v.id})">Modifier</button>` : ''}
    </div>`;
  openModal('veh-modal');
}

async function openVehiculeForm(id = null) {
  let v = {};
  if (id) v = await api.get(`/vehicules/${id}`);
  const empOptions = employesForVeh.map(e =>
    `<option value="${e.id}" ${v.employe_id==e.id?'selected':''}>${escapeHtml(`${e.prenom||''} ${e.nom}`.trim())}</option>`).join('');
  const modal = document.getElementById('veh-modal');
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>${id ? `Modifier ${escapeHtml(v.immatriculation)}` : 'Nouveau véhicule'}</h3>
      <button class="modal-close" onclick="closeModal('veh-modal')">×</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Immatriculation *</label><input id="veh-immat" value="${escapeHtml(v.immatriculation||'')}"></div>
        <div class="form-group"><label>Type</label>
          <select id="veh-type">
            ${['van','pick-up','voiture','autre'].map(t=>`<option value="${t}" ${v.type_vehicule===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Marque</label><input id="veh-marque" value="${escapeHtml(v.marque||'')}"></div>
        <div class="form-group"><label>Modèle</label><input id="veh-modele" value="${escapeHtml(v.modele||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Année</label><input type="number" id="veh-annee" value="${v.annee||''}"></div>
        <div class="form-group"><label>Couleur</label><input id="veh-couleur" value="${escapeHtml(v.couleur||'')}"></div>
      </div>
      <div class="form-section-title">Documents UAE</div>
      <div class="form-row">
        <div class="form-group"><label>Mulkiya exp.</label><input type="date" id="veh-mulkiya" value="${v.mulkiya_exp?.slice(0,10)||''}"></div>
        <div class="form-group"><label>Assurance exp.</label><input type="date" id="veh-assurance-exp" value="${v.assurance_exp?.slice(0,10)||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>N° Assurance</label><input id="veh-assurance-num" value="${escapeHtml(v.assurance_num||'')}"></div>
        <div class="form-group"><label>Contrôle tech. exp.</label><input type="date" id="veh-controle" value="${v.controle_tech_exp?.slice(0,10)||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Responsable</label>
          <select id="veh-employe"><option value="">— Aucun —</option>${empOptions}</select>
        </div>
      </div>
      <div class="form-group"><label>Notes</label><textarea id="veh-notes" rows="2">${escapeHtml(v.notes||'')}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('veh-modal')">Annuler</button>
      <button class="btn-p" onclick="saveVehicule(${id||'null'})">💾 Enregistrer</button>
    </div>`;
  openModal('veh-modal');
}

async function saveVehicule(id) {
  const body = {
    immatriculation: document.getElementById('veh-immat').value.trim().toUpperCase(),
    type_vehicule: document.getElementById('veh-type').value,
    marque: document.getElementById('veh-marque').value.trim(),
    modele: document.getElementById('veh-modele').value.trim(),
    annee: +document.getElementById('veh-annee').value || null,
    couleur: document.getElementById('veh-couleur').value.trim(),
    mulkiya_exp: document.getElementById('veh-mulkiya').value || null,
    assurance_exp: document.getElementById('veh-assurance-exp').value || null,
    assurance_num: document.getElementById('veh-assurance-num').value.trim(),
    controle_tech_exp: document.getElementById('veh-controle').value || null,
    employe_id: +document.getElementById('veh-employe').value || null,
    notes: document.getElementById('veh-notes').value.trim(),
  };
  if (!body.immatriculation) { showToast("L'immatriculation est requise", 'error'); return; }
  try {
    if (id) await api.put(`/vehicules/${id}`, body);
    else await api.post('/vehicules', body);
    showToast(id ? 'Véhicule mis à jour' : 'Véhicule créé', 'success');
    closeModal('veh-modal');
    vehiculesData = await api.get('/vehicules');
    renderVehicules();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openEntretienForm(vehiculeId) {
  const modal = document.getElementById('veh-modal');
  modal.innerHTML = `
    <div class="modal-hd"><h3>Ajouter un entretien</h3><button class="modal-close" onclick="closeModal('veh-modal')">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Date *</label><input type="date" id="ent-date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Type</label>
          <select id="ent-type">
            ${['vidange','pneus','revision','reparation','autre'].map(t=>`<option value="${t}">${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Description</label><textarea id="ent-desc" rows="2"></textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Coût (AED)</label><input type="number" step="0.01" id="ent-cout"></div>
        <div class="form-group"><label>Kilométrage</label><input type="number" id="ent-km"></div>
      </div>
      <div class="form-group"><label>Prochain entretien</label><input type="date" id="ent-prochain"></div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('veh-modal')">Annuler</button>
      <button class="btn-p" onclick="saveEntretien(${vehiculeId})">💾 Enregistrer</button>
    </div>`;
  openModal('veh-modal');
}

async function saveEntretien(vehiculeId) {
  const body = {
    date_entretien: document.getElementById('ent-date').value,
    type_entretien: document.getElementById('ent-type').value,
    description: document.getElementById('ent-desc').value.trim(),
    cout: +document.getElementById('ent-cout').value || null,
    kilometrage: +document.getElementById('ent-km').value || null,
    prochain_entretien: document.getElementById('ent-prochain').value || null,
  };
  try {
    await api.post(`/vehicules/${vehiculeId}/entretiens`, body);
    showToast('Entretien enregistré', 'success');
    closeModal('veh-modal');
    vehiculesData = await api.get('/vehicules');
    renderVehicules();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openPleinForm(vehiculeId) {
  const empOptions = employesForVeh.map(e =>
    `<option value="${e.id}">${escapeHtml(`${e.prenom||''} ${e.nom}`.trim())}</option>`).join('');
  const modal = document.getElementById('veh-modal');
  modal.innerHTML = `
    <div class="modal-hd"><h3>Enregistrer un plein</h3><button class="modal-close" onclick="closeModal('veh-modal')">×</button></div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Date *</label><input type="date" id="pl-date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Employé</label>
          <select id="pl-emp"><option value="">— Aucun —</option>${empOptions}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Litres</label><input type="number" step="0.01" id="pl-litres"></div>
        <div class="form-group"><label>Montant (AED)</label><input type="number" step="0.01" id="pl-montant"></div>
      </div>
      <div class="form-group"><label>Kilométrage</label><input type="number" id="pl-km"></div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('veh-modal')">Annuler</button>
      <button class="btn-p" onclick="savePlein(${vehiculeId})">💾 Enregistrer</button>
    </div>`;
  openModal('veh-modal');
}

async function savePlein(vehiculeId) {
  const body = {
    date_plein: document.getElementById('pl-date').value,
    employe_id: +document.getElementById('pl-emp').value || null,
    litres: +document.getElementById('pl-litres').value || null,
    montant: +document.getElementById('pl-montant').value || null,
    kilometrage: +document.getElementById('pl-km').value || null,
  };
  try {
    await api.post(`/vehicules/${vehiculeId}/pleins`, body);
    showToast('Plein enregistré', 'success');
    closeModal('veh-modal');
  } catch (err) { showToast(err.message, 'error'); }
}
