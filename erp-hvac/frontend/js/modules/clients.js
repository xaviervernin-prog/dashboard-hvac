'use strict';

function init_clients(panel) {
  panel.innerHTML = `
    <h2 class="page-title">Clients</h2>
    <div class="table-card">
      <div class="table-header">
        <h3>Liste des clients</h3>
        <div class="table-header-actions">
          <button class="btn-p" id="cli-new-btn">+ Nouveau client</button>
        </div>
      </div>
      <div class="filter-bar">
        <input type="search" id="cli-search" placeholder="Rechercher nom, email, entreprise…">
        <select id="cli-type-filter">
          <option value="">Tous les types</option>
          <option value="particulier">Particulier</option>
          <option value="entreprise">Entreprise</option>
          <option value="copropriete">Copropriété</option>
        </select>
      </div>
      <div class="tscroll">
        <table>
          <thead><tr>
            <th>Nom</th><th>Type</th><th>Email</th><th>Téléphone</th><th>Émirat</th><th>Chantiers</th><th>Actions</th>
          </tr></thead>
          <tbody id="cli-tbody">${loadingRow(7)}</tbody>
        </table>
      </div>
    </div>

    <!-- MODAL CLIENT -->
    <div class="overlay" id="cli-modal">
      <div class="modal">
        <div class="drag"></div>
        <h3 id="cli-modal-title">Nouveau client</h3>
        <input type="hidden" id="cli-id">
        <div class="g2">
          <div class="form-row"><label>Nom *</label><input id="cli-nom" maxlength="120" required></div>
          <div class="form-row"><label>Prénom</label><input id="cli-prenom" maxlength="80"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Type *</label>
            <select id="cli-type">
              <option value="particulier">Particulier</option>
              <option value="entreprise">Entreprise</option>
              <option value="copropriete">Copropriété</option>
            </select>
          </div>
          <div class="form-row"><label>Entreprise</label><input id="cli-entreprise" maxlength="150"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Email</label><input id="cli-email" type="email"></div>
          <div class="form-row"><label>Téléphone</label><input id="cli-telephone" maxlength="30"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>TRN (TVA)</label><input id="cli-trn" maxlength="30"></div>
          <div class="form-row"><label>Émirat</label>
            <select id="cli-emirat">
              <option>Dubai</option><option>Abu Dhabi</option><option>Sharjah</option>
              <option>Ajman</option><option>Ras Al Khaimah</option><option>Fujairah</option><option>Umm Al Quwain</option>
            </select>
          </div>
        </div>
        <div class="form-row"><label>Adresse</label><input id="cli-adresse" maxlength="300"></div>
        <div class="form-row"><label>Notes</label><textarea id="cli-notes" maxlength="2000"></textarea></div>

        <div class="msec" id="cli-chantiers-section">Chantiers</div>
        <div id="cli-chantiers-list"></div>
        <button class="btn-add-row" id="cli-add-chantier">+ Ajouter un chantier</button>

        <div class="modal-actions">
          <button class="btn-cancel" id="cli-cancel">Annuler</button>
          <button class="btn-del" id="cli-del-btn" style="display:none">Archiver</button>
          <button class="btn-save" id="cli-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  let clients = [];
  let chantiers = [];
  let searchTimer;

  async function load() {
    const search = document.getElementById('cli-search').value;
    const type   = document.getElementById('cli-type-filter').value;
    document.getElementById('cli-tbody').innerHTML = loadingRow(7);
    try {
      const res = await api.get(`/clients?search=${encodeURIComponent(search)}&type=${type}&limit=100`);
      clients = res.data || [];
      render();
    } catch (e) { toast(e.message, 'error'); }
  }

  function render() {
    const tbody = document.getElementById('cli-tbody');
    if (!clients.length) { tbody.innerHTML = emptyRow(7, 'Aucun client'); return; }
    tbody.innerHTML = clients.map(c => `
      <tr data-id="${c.id}">
        <td><strong>${escape(clientNom(c))}</strong></td>
        <td>${badge(c.type === 'entreprise' ? 'bg' : c.type === 'copropriete' ? 'pu' : 'gy', c.type)}</td>
        <td>${c.email ? `<a class="contact-link" href="mailto:${escape(c.email)}">${escape(c.email)}</a>` : '<span class="td-muted">—</span>'}</td>
        <td>${c.telephone ? `<a class="contact-link" href="tel:${escape(c.telephone)}">${escape(c.telephone)}</a>` : '<span class="td-muted">—</span>'}</td>
        <td class="td-muted">${escape(c.emirat || '')}</td>
        <td>${(c.chantiers?.[0]?.count || 0)}</td>
        <td>
          <button class="act blue" data-action="edit" data-id="${c.id}">Modifier</button>
          <button class="act" data-action="devis" data-id="${c.id}">Devis</button>
        </td>
      </tr>
    `).join('');
  }

  // Open form for new client
  function openNew() {
    document.getElementById('cli-id').value = '';
    document.getElementById('cli-modal-title').textContent = 'Nouveau client';
    document.getElementById('cli-del-btn').style.display = 'none';
    ['nom','prenom','email','telephone','trn','adresse','notes','entreprise'].forEach(f => {
      document.getElementById(`cli-${f}`).value = '';
    });
    document.getElementById('cli-type').value = 'particulier';
    document.getElementById('cli-emirat').value = 'Dubai';
    chantiers = [];
    renderChantiers();
    openModal('cli-modal');
  }

  // Open form for editing
  async function openEdit(id) {
    try {
      const c = await api.get(`/clients/${id}`);
      document.getElementById('cli-id').value = c.id;
      document.getElementById('cli-modal-title').textContent = 'Modifier client';
      document.getElementById('cli-del-btn').style.display = '';
      document.getElementById('cli-nom').value        = c.nom || '';
      document.getElementById('cli-prenom').value     = c.prenom || '';
      document.getElementById('cli-email').value      = c.email || '';
      document.getElementById('cli-telephone').value  = c.telephone || '';
      document.getElementById('cli-type').value       = c.type || 'particulier';
      document.getElementById('cli-entreprise').value = c.entreprise || '';
      document.getElementById('cli-trn').value        = c.trn || '';
      document.getElementById('cli-adresse').value    = c.adresse || '';
      document.getElementById('cli-emirat').value     = c.emirat || 'Dubai';
      document.getElementById('cli-notes').value      = c.notes || '';
      chantiers = (c.chantiers || []).filter(ch => ch.actif).map(ch => ({ ...ch, _saved: true }));
      renderChantiers();
      openModal('cli-modal');
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderChantiers() {
    const container = document.getElementById('cli-chantiers-list');
    if (!chantiers.length) { container.innerHTML = ''; return; }
    container.innerHTML = chantiers.map((ch, i) => `
      <div class="chantier-block">
        <div class="ch-title">Chantier ${i + 1}</div>
        <button type="button" class="rm-btn" data-rm-ch="${i}">×</button>
        <div class="form-row"><label>Nom *</label><input class="ch-nom" data-idx="${i}" value="${escape(ch.nom || '')}" maxlength="150"></div>
        <div class="g2">
          <div class="form-row"><label>Adresse</label><input class="ch-adresse" data-idx="${i}" value="${escape(ch.adresse || '')}" maxlength="300"></div>
          <div class="form-row"><label>Statut</label>
            <select class="ch-statut" data-idx="${i}">
              <option value="en_attente" ${ch.statut==='en_attente'?'selected':''}>En attente</option>
              <option value="en_cours"   ${ch.statut==='en_cours'?'selected':''}>En cours</option>
              <option value="termine"    ${ch.statut==='termine'?'selected':''}>Terminé</option>
            </select>
          </div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('cli-add-chantier').addEventListener('click', () => {
    chantiers.push({ nom: '', adresse: '', statut: 'en_attente' });
    renderChantiers();
  });

  document.getElementById('cli-chantiers-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-rm-ch]');
    if (btn) { chantiers.splice(+btn.dataset.rmCh, 1); renderChantiers(); }
  });

  document.getElementById('cli-chantiers-list').addEventListener('input', e => {
    const el = e.target;
    const idx = +el.dataset.idx;
    if (el.classList.contains('ch-nom'))    chantiers[idx].nom     = el.value;
    if (el.classList.contains('ch-adresse')) chantiers[idx].adresse = el.value;
    if (el.classList.contains('ch-statut'))  chantiers[idx].statut  = el.value;
  });

  async function save() {
    const id = document.getElementById('cli-id').value;
    const body = {
      nom:       document.getElementById('cli-nom').value.trim(),
      prenom:    document.getElementById('cli-prenom').value.trim(),
      email:     document.getElementById('cli-email').value.trim(),
      telephone: document.getElementById('cli-telephone').value.trim(),
      type:      document.getElementById('cli-type').value,
      entreprise: document.getElementById('cli-entreprise').value.trim(),
      trn:       document.getElementById('cli-trn').value.trim(),
      adresse:   document.getElementById('cli-adresse').value.trim(),
      emirat:    document.getElementById('cli-emirat').value,
      notes:     document.getElementById('cli-notes').value.trim(),
    };
    if (!body.nom) { toast('Le nom est requis', 'warning'); return; }

    const btn = document.getElementById('cli-save-btn');
    btn.disabled = true;
    try {
      let client;
      if (id) {
        client = await api.put(`/clients/${id}`, body);
      } else {
        client = await api.post('/clients', body);
      }

      // Save chantiers
      for (const ch of chantiers) {
        if (!ch.nom.trim()) continue;
        if (ch._saved && ch.id) {
          await api.put(`/clients/${client.id}/chantiers/${ch.id}`, { nom: ch.nom, adresse: ch.adresse, statut: ch.statut });
        } else if (!ch._saved) {
          await api.post(`/clients/${client.id}/chantiers`, { nom: ch.nom, adresse: ch.adresse, statut: ch.statut });
        }
      }

      toast(id ? 'Client mis à jour' : 'Client créé', 'success');
      closeModal('cli-modal');
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function archive() {
    const id = document.getElementById('cli-id').value;
    if (!id || !confirm('Archiver ce client ?')) return;
    try {
      await api.delete(`/clients/${id}`);
      toast('Client archivé', 'success');
      closeModal('cli-modal');
      load();
    } catch (e) { toast(e.message, 'error'); }
  }

  // Events
  document.getElementById('cli-new-btn').addEventListener('click', openNew);
  document.getElementById('cli-save-btn').addEventListener('click', save);
  document.getElementById('cli-del-btn').addEventListener('click', archive);
  document.getElementById('cli-cancel').addEventListener('click', () => closeModal('cli-modal'));
  document.getElementById('cli-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('cli-modal')) closeModal('cli-modal');
  });

  document.getElementById('cli-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });
  document.getElementById('cli-type-filter').addEventListener('change', load);

  document.getElementById('cli-tbody').addEventListener('click', e => {
    const row = e.target.closest('tr');
    if (!row) return;
    const btn = e.target.closest('[data-action]');
    if (btn?.dataset.action === 'edit')  { openEdit(btn.dataset.id); return; }
    if (btn?.dataset.action === 'devis') { switchTab('devis'); return; }
    if (row.dataset.id) openEdit(row.dataset.id);
  });

  load();
}
