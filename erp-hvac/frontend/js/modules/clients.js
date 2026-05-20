let clientsData = [];

async function loadClients(forceReload = true) {
  const panel = document.getElementById('tab-clients');
  if (!forceReload && clientsData.length) { renderClients(); return; }

  panel.innerHTML = `
    <h2 class="page-title">Clients</h2>
    <div class="table-card">
      <div class="table-header">
        <h3>Répertoire clients</h3>
        <div class="table-header-actions">
          <button class="btn-filter" id="clients-filter-btn">🔍 Filtrer</button>
          ${hasRole('administrateur','commercial') ? '<button class="btn-p" onclick="openClientForm()">+ Nouveau client</button>' : ''}
        </div>
      </div>
      <div class="filter-bar" id="clients-filter-bar" style="display:none">
        <input type="text" id="clients-q" placeholder="Rechercher…" oninput="filterClients()">
        <select id="clients-statut" onchange="filterClients()">
          <option value="">Tous statuts</option>
          <option value="prospect">Prospect</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </select>
      </div>
      <div class="loading"><div class="spinner"></div>Chargement…</div>
    </div>
    <div id="client-modal" class="modal"></div>`;

  document.getElementById('clients-filter-btn').addEventListener('click', () => {
    const bar = document.getElementById('clients-filter-bar');
    bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
  });

  try {
    clientsData = await api.get('/clients');
    renderClients();
  } catch (err) {
    document.querySelector('#tab-clients .loading').outerHTML =
      `<div class="alert error" style="margin:16px">${escapeHtml(err.message)}</div>`;
  }
}

function filterClients() {
  const q = (document.getElementById('clients-q')?.value || '').toLowerCase();
  const statut = document.getElementById('clients-statut')?.value || '';
  const filtered = clientsData.filter(c =>
    (!q || `${c.nom} ${c.prenom} ${c.entreprise || ''} ${c.tel || ''}`.toLowerCase().includes(q)) &&
    (!statut || c.statut === statut)
  );
  renderClientsTable(filtered);
}

function renderClients() {
  renderClientsTable(clientsData);
}

function renderClientsTable(data) {
  const card = document.querySelector('#tab-clients .table-card');
  const old = card.querySelector('.tscroll, .empty');
  if (old) old.remove();

  if (!data.length) {
    card.insertAdjacentHTML('beforeend', '<div class="empty"><div class="empty-icon">👤</div><p>Aucun client trouvé</p></div>');
    return;
  }

  card.insertAdjacentHTML('beforeend', `
    <div class="tscroll">
      <table>
        <thead><tr>
          <th>Nom / Société</th><th>Téléphone</th><th>Email</th>
          <th>Statut</th><th>Chantiers</th><th>Actions</th>
        </tr></thead>
        <tbody>${data.map(clientRow).join('')}</tbody>
      </table>
    </div>`);
}

function clientRow(c) {
  const nom = escapeHtml(c.entreprise ? `${c.entreprise} — ${c.prenom || ''} ${c.nom}` : `${c.prenom || ''} ${c.nom}`).trim();
  return `
    <tr onclick="openClientDetail(${c.id})">
      <td><strong>${nom}</strong></td>
      <td>${escapeHtml(c.tel || '—')}</td>
      <td>${escapeHtml(c.email || '—')}</td>
      <td>${statutClient(c.statut)}</td>
      <td>${c.nb_chantiers || 0}</td>
      <td onclick="event.stopPropagation()">
        ${hasRole('administrateur','commercial') ? `<button class="act blue" onclick="openClientForm(${c.id})">Modifier</button>` : ''}
        ${hasRole('administrateur') ? `<button class="act red" onclick="deleteClient(${c.id})">Archiver</button>` : ''}
      </td>
    </tr>`;
}

async function openClientDetail(id) {
  const c = await api.get(`/clients/${id}`);
  showToast(`Client : ${c.entreprise || c.nom}`);
}

async function openClientForm(id = null) {
  let client = {};
  if (id) client = await api.get(`/clients/${id}`);

  const modal = document.getElementById('client-modal');
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>${id ? 'Modifier le client' : 'Nouveau client'}</h3>
      <button class="modal-close" onclick="closeModal('client-modal')">×</button>
    </div>
    <div class="modal-body">
      <div class="form-section-title">Informations générales</div>
      <div class="form-row">
        <div class="form-group"><label>Prénom</label><input id="c-prenom" value="${escapeHtml(client.prenom||'')}"></div>
        <div class="form-group"><label>Nom *</label><input id="c-nom" value="${escapeHtml(client.nom||'')}" required></div>
      </div>
      <div class="form-group"><label>Société</label><input id="c-entreprise" value="${escapeHtml(client.entreprise||'')}"></div>
      <div class="form-row">
        <div class="form-group"><label>Téléphone</label><input id="c-tel" type="tel" value="${escapeHtml(client.tel||'')}"></div>
        <div class="form-group"><label>Email</label><input id="c-email" type="email" value="${escapeHtml(client.email||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Statut</label>
          <select id="c-statut">
            <option value="prospect" ${client.statut==='prospect'?'selected':''}>Prospect</option>
            <option value="actif" ${client.statut==='actif'?'selected':''}>Actif</option>
            <option value="inactif" ${client.statut==='inactif'?'selected':''}>Inactif</option>
          </select>
        </div>
        <div class="form-group"><label>TRN (UAE)</label><input id="c-trn" value="${escapeHtml(client.trn||'')}"></div>
      </div>
      <div class="form-section-title">Adresse de facturation</div>
      <div class="form-group"><label>Rue</label><input id="c-rue" value="${escapeHtml(client.fact_rue||'')}"></div>
      <div class="form-row">
        <div class="form-group"><label>Ville</label><input id="c-ville" value="${escapeHtml(client.fact_ville||'')}"></div>
        <div class="form-group"><label>Pays</label><input id="c-pays" value="${escapeHtml(client.fact_pays||'UAE')}"></div>
      </div>
      <div class="form-group"><label>Notes internes</label><textarea id="c-notes" rows="2">${escapeHtml(client.notes||'')}</textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('client-modal')">Annuler</button>
      <button class="btn-p" onclick="saveClient(${id || 'null'})">💾 Enregistrer</button>
    </div>`;
  openModal('client-modal');
}

async function saveClient(id) {
  const body = {
    prenom: document.getElementById('c-prenom').value,
    nom: document.getElementById('c-nom').value,
    entreprise: document.getElementById('c-entreprise').value,
    tel: document.getElementById('c-tel').value,
    email: document.getElementById('c-email').value,
    statut: document.getElementById('c-statut').value,
    trn: document.getElementById('c-trn').value,
    fact_rue: document.getElementById('c-rue').value,
    fact_ville: document.getElementById('c-ville').value,
    fact_pays: document.getElementById('c-pays').value,
    notes: document.getElementById('c-notes').value
  };
  if (!body.nom) { showToast('Le nom est requis', 'error'); return; }

  try {
    if (id) await api.put(`/clients/${id}`, body);
    else await api.post('/clients', body);
    showToast(id ? 'Client mis à jour' : 'Client créé', 'success');
    closeModal('client-modal');
    loadClients();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteClient(id) {
  if (!confirm('Archiver ce client ?')) return;
  try {
    await api.del(`/clients/${id}`);
    showToast('Client archivé', 'success');
    loadClients();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
