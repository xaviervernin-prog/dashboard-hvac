let devisData = [];
let clientsForDevis = [];
let articlesForDevis = [];

async function loadDevis(forceReload = true) {
  const panel = document.getElementById('tab-devis');
  if (!forceReload && devisData.length) { renderDevis(); return; }

  panel.innerHTML = `
    <h2 class="page-title">Devis</h2>
    <div class="table-card">
      <div class="table-header">
        <h3>Liste des devis</h3>
        <div class="table-header-actions">
          <button class="btn-filter" id="devis-filter-btn">🔍 Filtrer</button>
          ${hasRole('administrateur','commercial') ? '<button class="btn-p" onclick="openDevisForm()">+ Nouveau devis</button>' : ''}
        </div>
      </div>
      <div class="filter-bar" id="devis-filter-bar" style="display:none">
        <input type="text" id="devis-q" placeholder="Numéro, objet, client…" oninput="filterDevis()">
        <select id="devis-statut" onchange="filterDevis()">
          <option value="">Tous statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="en_attente">En attente</option>
          <option value="accepte">Accepté</option>
          <option value="refuse">Refusé</option>
          <option value="expire">Expiré</option>
        </select>
      </div>
      <div class="loading"><div class="spinner"></div>Chargement…</div>
    </div>
    <div id="devis-modal" class="modal"></div>`;

  document.getElementById('devis-filter-btn').addEventListener('click', () => {
    const bar = document.getElementById('devis-filter-bar');
    bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
  });

  try {
    [devisData, clientsForDevis, articlesForDevis] = await Promise.all([
      api.get('/devis'),
      api.get('/clients'),
      api.get('/articles')
    ]);
    renderDevis();
  } catch (err) {
    document.querySelector('#tab-devis .loading').outerHTML =
      `<div class="alert error" style="margin:16px">${escapeHtml(err.message)}</div>`;
  }
}

function filterDevis() {
  const q = (document.getElementById('devis-q')?.value || '').toLowerCase();
  const statut = document.getElementById('devis-statut')?.value || '';
  const filtered = devisData.filter(d =>
    (!q || `${d.numero} ${d.objet||''} ${d.client_nom||''} ${d.entreprise||''}`.toLowerCase().includes(q)) &&
    (!statut || d.statut === statut)
  );
  renderDevisTable(filtered);
}

function renderDevis() { renderDevisTable(devisData); }

function renderDevisTable(data) {
  const card = document.querySelector('#tab-devis .table-card');
  const old = card.querySelector('.tscroll, .empty');
  if (old) old.remove();

  if (!data.length) {
    card.insertAdjacentHTML('beforeend', '<div class="empty"><div class="empty-icon">📋</div><p>Aucun devis</p></div>');
    return;
  }

  card.insertAdjacentHTML('beforeend', `
    <div class="tscroll">
      <table>
        <thead><tr>
          <th>Numéro</th><th>Client</th><th>Objet</th>
          <th>Montant TTC</th><th>Date</th><th>Statut</th><th>Actions</th>
        </tr></thead>
        <tbody>${data.map(devisRow).join('')}</tbody>
      </table>
    </div>`);
}

function devisRow(d) {
  const nom = escapeHtml(d.entreprise ? d.entreprise : `${d.client_prenom||''} ${d.client_nom||''}`.trim());
  const overdue = d.date_validite && new Date(d.date_validite) < new Date() && d.statut === 'en_attente';
  return `
    <tr onclick="openDevisDetail(${d.id})">
      <td><strong style="color:var(--blue)">${escapeHtml(d.numero)}</strong></td>
      <td>${nom}</td>
      <td>${escapeHtml(d.objet || '—')}</td>
      <td><strong>${fmt(d.montant_ttc)}</strong></td>
      <td>${fmtDate(d.date_devis)}${overdue ? '<span class="overdue-badge">Expiré</span>' : ''}</td>
      <td>${statutDevis(d.statut)}</td>
      <td onclick="event.stopPropagation()" style="white-space:nowrap">
        <button class="act blue" onclick="downloadDevisPDF(${d.id},'${escapeHtml(d.numero)}')">PDF</button>
        ${d.statut === 'en_attente' && hasRole('administrateur','commercial')
          ? `<button class="act green" onclick="accepterDevis(${d.id})">✓ Accepter</button>` : ''}
        ${d.statut === 'accepte' && hasRole('administrateur','commercial','comptable')
          ? `<button class="act blue" onclick="facturerDevis(${d.id})">Facturer</button>` : ''}
        ${hasRole('administrateur','commercial')
          ? `<button class="act" onclick="openDevisForm(${d.id})">Modifier</button>
             <button class="act" onclick="dupliquerDevis(${d.id})">Dupliquer</button>` : ''}
        ${hasRole('administrateur') ? `<button class="act red" onclick="supprimerDevis(${d.id})">Suppr.</button>` : ''}
      </td>
    </tr>`;
}

async function openDevisDetail(id) { openDevisForm(id); }

async function openDevisForm(id = null, prefetched = null) {
  let d = prefetched || {};
  if (id && !prefetched) d = await api.get(`/devis/${id}`);

  const clientOptions = clientsForDevis.map(c =>
    `<option value="${c.id}" ${d.client_id == c.id ? 'selected' : ''}>${escapeHtml(c.entreprise || `${c.prenom||''} ${c.nom}`.trim())}</option>`
  ).join('');

  const isLocked = d.statut === 'accepte';

  const modal = document.getElementById('devis-modal');
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>${id ? `Devis ${escapeHtml(d.numero||'')}` : 'Nouveau devis'}</h3>
      <button class="modal-close" onclick="closeModal('devis-modal')">×</button>
    </div>
    <div class="modal-body">
      ${isLocked ? '<div class="alert warn">Ce devis est accepté — modification des lignes désactivée.</div>' : ''}
      <div class="form-row">
        <div class="form-group"><label>Client *</label>
          <select id="dv-client" ${isLocked ? 'disabled' : ''}><option value="">— Choisir —</option>${clientOptions}</select>
        </div>
        <div class="form-group"><label>Date</label>
          <input type="date" id="dv-date" value="${d.date_devis||new Date().toISOString().slice(0,10)}" ${isLocked ? 'disabled' : ''}>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Objet</label>
          <input id="dv-objet" value="${escapeHtml(d.objet||'')}" ${isLocked ? 'disabled' : ''}>
        </div>
        <div class="form-group"><label>Validité jusqu'au</label>
          <input type="date" id="dv-validite" value="${d.date_validite||''}" ${isLocked ? 'disabled' : ''}>
        </div>
      </div>
      <div class="form-section-title">Lignes</div>
      <div id="dv-lignes"></div>
      ${!isLocked ? `<button class="act blue" style="margin-bottom:12px" onclick="addDevisLigne()">+ Ajouter ligne</button>` : ''}
      <div style="display:flex;justify-content:flex-end;gap:16px;padding:8px 0;border-top:1px solid var(--border);margin-top:8px">
        <div style="text-align:right"><div style="font-size:11px;color:var(--muted)">Total HT</div><div id="dv-total-ht" style="font-weight:700">0.00 AED</div></div>
        <div style="text-align:right"><div style="font-size:11px;color:var(--muted)">TVA 5%</div><div id="dv-total-tva" style="font-weight:700">0.00 AED</div></div>
        <div style="text-align:right"><div style="font-size:11px;color:var(--muted)">Total TTC</div><div id="dv-total-ttc" style="font-weight:800;color:var(--blue);font-size:16px">0.00 AED</div></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Notes client</label><textarea id="dv-notes-client" rows="2">${escapeHtml(d.notes_client||'')}</textarea></div>
        <div class="form-group"><label>Notes internes</label><textarea id="dv-notes-int" rows="2">${escapeHtml(d.notes_internes||'')}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('devis-modal')">Fermer</button>
      ${!isLocked && hasRole('administrateur','commercial') ? `<button class="btn-p" onclick="saveDevis(${id||'null'})">💾 Enregistrer</button>` : ''}
      ${id ? `<button class="btn-p gray" onclick="downloadDevisPDF(${id},'${escapeHtml(d.numero||'')}')">📄 PDF</button>` : ''}
    </div>`;

  window._devisLignes = (d.lignes || []).map(l => ({...l}));
  if (!window._devisLignes.length && !isLocked) window._devisLignes.push({ designation:'', quantite:1, prix_unitaire:0, tva_taux:5, article_id:null });
  renderDevisLignes(isLocked);
  openModal('devis-modal');
}

function renderDevisLignes(locked = false) {
  const container = document.getElementById('dv-lignes');
  if (!container) return;
  const artOptions = articlesForDevis.map(a =>
    `<option value="${a.id}" data-prix="${a.prix_unitaire}" data-nom="${escapeHtml(a.designation)}">${escapeHtml(a.designation)} — ${Number(a.prix_unitaire).toFixed(2)} AED</option>`
  ).join('');

  container.innerHTML = (window._devisLignes || []).map((l, i) => locked
    ? `<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px;margin-bottom:4px;padding:6px 0;border-bottom:1px solid var(--border)">
        <span>${escapeHtml(l.designation)}</span><span style="text-align:center">${l.quantite} × ${Number(l.prix_unitaire).toFixed(2)} AED</span>
        <span style="text-align:right;font-weight:600">${((l.quantite||0)*(l.prix_unitaire||0)).toFixed(2)} AED</span>
       </div>`
    : `<div style="display:grid;grid-template-columns:2fr 80px 100px auto;gap:6px;margin-bottom:6px;align-items:start">
        <div>
          <select onchange="pickArticle(${i},this)" style="width:100%;padding:6px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;margin-bottom:4px">
            <option value="">— Article du catalogue —</option>${artOptions}
          </select>
          <input placeholder="Désignation *" value="${escapeHtml(l.designation||'')}" oninput="updateLigne(${i},'designation',this.value)"
            style="width:100%;padding:7px;border:1.5px solid var(--border);border-radius:6px;font-size:12px">
        </div>
        <input type="number" min="0" step="0.01" value="${l.quantite||1}" placeholder="Qté"
          oninput="updateLigne(${i},'quantite',+this.value)"
          style="padding:7px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;width:100%">
        <input type="number" min="0" step="0.01" value="${l.prix_unitaire||0}" placeholder="Prix HT"
          oninput="updateLigne(${i},'prix_unitaire',+this.value)"
          style="padding:7px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;width:100%">
        <button class="act red" onclick="removeLigne(${i})" style="height:36px;margin-top:30px">✕</button>
       </div>`
  ).join('');
  recalcDevis();
}

function pickArticle(i, sel) {
  const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return;
  window._devisLignes[i].article_id = +opt.value;
  window._devisLignes[i].designation = opt.dataset.nom;
  window._devisLignes[i].prix_unitaire = +opt.dataset.prix;
  renderDevisLignes();
}

function updateLigne(i, field, val) { window._devisLignes[i][field] = val; recalcDevis(); }
function addDevisLigne() { window._devisLignes.push({ designation:'', quantite:1, prix_unitaire:0, tva_taux:5, article_id:null }); renderDevisLignes(); }
function removeLigne(i) { window._devisLignes.splice(i,1); renderDevisLignes(); }

function recalcDevis() {
  let ht = 0, tva = 0;
  (window._devisLignes||[]).forEach(l => { const h = (l.quantite||0)*(l.prix_unitaire||0); ht+=h; tva+=h*((l.tva_taux||5)/100); });
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val.toFixed(2)+' AED'; };
  set('dv-total-ht', ht); set('dv-total-tva', tva); set('dv-total-ttc', ht+tva);
}

async function saveDevis(id) {
  const body = {
    client_id: +document.getElementById('dv-client').value || null,
    date_devis: document.getElementById('dv-date').value,
    objet: document.getElementById('dv-objet').value,
    date_validite: document.getElementById('dv-validite').value || null,
    notes_client: document.getElementById('dv-notes-client').value,
    notes_internes: document.getElementById('dv-notes-int').value,
    lignes: window._devisLignes || []
  };
  if (!body.client_id) { showToast('Sélectionnez un client', 'error'); return; }
  try {
    if (id) await api.put(`/devis/${id}`, body);
    else await api.post('/devis', body);
    showToast(id ? 'Devis mis à jour' : 'Devis créé', 'success');
    closeModal('devis-modal');
    loadDevis();
  } catch (err) { showToast(err.message, 'error'); }
}

async function downloadDevisPDF(id, numero) {
  try {
    showToast('Génération du PDF…');
    const blob = await api.blob(`/devis/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`devis-${numero}.pdf`; a.click();
    URL.revokeObjectURL(url);
  } catch (err) { showToast(err.message, 'error'); }
}

async function accepterDevis(id) {
  if (!confirm('Marquer ce devis comme accepté ?')) return;
  try { await api.post(`/devis/${id}/accepter`); showToast('Devis accepté','success'); loadDevis(); }
  catch (err) { showToast(err.message,'error'); }
}

async function facturerDevis(id) {
  if (!confirm('Créer une facture à partir de ce devis ?')) return;
  try {
    const f = await api.post(`/devis/${id}/facturer`);
    showToast(`Facture ${f.numero} créée`,'success');
    await loadDevis();
    switchTab('factures');
  } catch (err) { showToast(err.message,'error'); }
}

async function dupliquerDevis(id) {
  try { const d = await api.post(`/devis/${id}/dupliquer`); showToast(`Devis ${d.numero} créé`,'success'); loadDevis(); }
  catch (err) { showToast(err.message,'error'); }
}

async function supprimerDevis(id) {
  if (!confirm('Supprimer ce devis ?')) return;
  try { await api.del(`/devis/${id}`); showToast('Devis supprimé','success'); loadDevis(); }
  catch (err) { showToast(err.message,'error'); }
}
