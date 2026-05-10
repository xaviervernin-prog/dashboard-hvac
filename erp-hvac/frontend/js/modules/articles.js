'use strict';

function init_articles(panel) {
  panel.innerHTML = `
    <h2 class="page-title">Articles &amp; Stock</h2>
    <div class="table-card">
      <div class="table-header">
        <h3>Catalogue articles</h3>
        <div class="table-header-actions">
          <button class="btn-p" id="art-new-btn">+ Nouvel article</button>
        </div>
      </div>
      <div class="filter-bar">
        <input type="search" id="art-search" placeholder="Rechercher désignation, référence…">
        <select id="art-cat-filter"><option value="">Toutes catégories</option></select>
        <select id="art-alerte-filter">
          <option value="">Tous les stocks</option>
          <option value="1">⚠️ Alerte stock seulement</option>
        </select>
      </div>
      <div class="tscroll">
        <table>
          <thead><tr>
            <th>Référence</th><th>Désignation</th><th>Catégorie</th><th>P.V. HT (AED)</th><th>Stock</th><th>Min.</th><th>Unité</th><th>Actions</th>
          </tr></thead>
          <tbody id="art-tbody">${loadingRow(8)}</tbody>
        </table>
      </div>
    </div>

    <!-- MODAL ARTICLE -->
    <div class="overlay" id="art-modal">
      <div class="modal">
        <div class="drag"></div>
        <h3 id="art-modal-title">Nouvel article</h3>
        <input type="hidden" id="art-id">
        <div class="g2">
          <div class="form-row"><label>Référence *</label><input id="art-reference" maxlength="50" required></div>
          <div class="form-row"><label>Unité</label><input id="art-unite" maxlength="20" value="u"></div>
        </div>
        <div class="form-row"><label>Désignation *</label><input id="art-designation" maxlength="200" required></div>
        <div class="form-row"><label>Description</label><textarea id="art-description" maxlength="1000"></textarea></div>
        <div class="form-row"><label>Catégorie</label>
          <select id="art-categorie-id"><option value="">— Aucune —</option></select>
        </div>
        <div class="g2">
          <div class="form-row"><label>Prix vente HT (AED) *</label><input type="number" id="art-prix-vente" min="0" step="0.01"></div>
          <div class="form-row"><label>Prix achat HT (AED)</label><input type="number" id="art-prix-achat" min="0" step="0.01" value="0"></div>
        </div>
        <div class="g2">
          <div class="form-row"><label>Stock actuel</label><input type="number" id="art-stock-actuel" min="0" step="0.001" value="0"></div>
          <div class="form-row"><label>Stock minimum</label><input type="number" id="art-stock-min" min="0" step="0.001" value="0"></div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="art-cancel">Annuler</button>
          <button class="btn-del" id="art-del-btn" style="display:none">Archiver</button>
          <button class="btn-save" id="art-save-btn">Enregistrer</button>
        </div>
      </div>
    </div>
  `;

  let articles = [];
  let categories = [];
  let searchTimer;

  async function loadCategories() {
    try {
      categories = await api.get('/articles/categories');
      const sel1 = document.getElementById('art-cat-filter');
      const sel2 = document.getElementById('art-categorie-id');
      const opts = categories.map(c => `<option value="${c.id}">${escape(c.nom)}</option>`).join('');
      sel1.innerHTML += opts;
      sel2.innerHTML = '<option value="">— Aucune —</option>' + opts;
    } catch {}
  }

  async function load() {
    const search  = document.getElementById('art-search').value;
    const cat     = document.getElementById('art-cat-filter').value;
    const alerte  = document.getElementById('art-alerte-filter').value;
    document.getElementById('art-tbody').innerHTML = loadingRow(8);
    try {
      const res = await api.get(`/articles?search=${encodeURIComponent(search)}&categorie=${cat}&alerte=${alerte}&limit=200`);
      articles = res.data || [];
      render();
    } catch (e) { toast(e.message, 'error'); }
  }

  function render() {
    const tbody = document.getElementById('art-tbody');
    if (!articles.length) { tbody.innerHTML = emptyRow(8); return; }
    tbody.innerHTML = articles.map(a => {
      const alerte = +a.stock_actuel < +a.stock_minimum;
      return `
        <tr data-id="${a.id}">
          <td class="td-muted">${escape(a.reference)}</td>
          <td><strong>${escape(a.designation)}</strong></td>
          <td class="td-muted">${escape(a.categories_article?.nom || '—')}</td>
          <td>${fmtAED(a.prix_vente_ht)}</td>
          <td class="${alerte ? 're' : ''}" style="${alerte ? 'font-weight:700' : ''}">${a.stock_actuel}</td>
          <td class="td-muted">${a.stock_minimum}</td>
          <td class="td-muted">${escape(a.unite || 'u')}</td>
          <td>
            <button class="act blue" data-action="edit" data-id="${a.id}">Modifier</button>
            ${alerte ? '<span class="badge re" style="margin-left:4px">⚠️ Stock bas</span>' : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  function openNew() {
    document.getElementById('art-id').value = '';
    document.getElementById('art-modal-title').textContent = 'Nouvel article';
    document.getElementById('art-del-btn').style.display = 'none';
    ['reference','designation','description'].forEach(f => document.getElementById(`art-${f}`).value = '');
    document.getElementById('art-unite').value       = 'u';
    document.getElementById('art-prix-vente').value  = '';
    document.getElementById('art-prix-achat').value  = '0';
    document.getElementById('art-stock-actuel').value = '0';
    document.getElementById('art-stock-min').value   = '0';
    document.getElementById('art-categorie-id').value = '';
    openModal('art-modal');
  }

  async function openEdit(id) {
    try {
      const a = await api.get(`/articles/${id}`);
      document.getElementById('art-id').value            = a.id;
      document.getElementById('art-modal-title').textContent = 'Modifier article';
      document.getElementById('art-del-btn').style.display = '';
      document.getElementById('art-reference').value    = a.reference || '';
      document.getElementById('art-designation').value  = a.designation || '';
      document.getElementById('art-description').value  = a.description || '';
      document.getElementById('art-unite').value        = a.unite || 'u';
      document.getElementById('art-prix-vente').value   = a.prix_vente_ht || 0;
      document.getElementById('art-prix-achat').value   = a.prix_achat_ht || 0;
      document.getElementById('art-stock-actuel').value = a.stock_actuel || 0;
      document.getElementById('art-stock-min').value    = a.stock_minimum || 0;
      document.getElementById('art-categorie-id').value = a.categorie_id || '';
      openModal('art-modal');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function save() {
    const id = document.getElementById('art-id').value;
    const body = {
      reference:    document.getElementById('art-reference').value.trim(),
      designation:  document.getElementById('art-designation').value.trim(),
      description:  document.getElementById('art-description').value.trim(),
      unite:        document.getElementById('art-unite').value.trim() || 'u',
      prix_vente_ht: +document.getElementById('art-prix-vente').value,
      prix_achat_ht: +document.getElementById('art-prix-achat').value,
      stock_actuel:  +document.getElementById('art-stock-actuel').value,
      stock_minimum: +document.getElementById('art-stock-min').value,
      categorie_id:  document.getElementById('art-categorie-id').value || null,
    };
    if (!body.reference || !body.designation) { toast('Référence et désignation requises','warning'); return; }
    const btn = document.getElementById('art-save-btn');
    btn.disabled = true;
    try {
      if (id) { await api.put(`/articles/${id}`, body); toast('Article mis à jour','success'); }
      else     { await api.post('/articles', body); toast('Article créé','success'); }
      closeModal('art-modal');
      load();
    } catch (e) { toast(e.message,'error'); }
    finally { btn.disabled = false; }
  }

  async function archive() {
    const id = document.getElementById('art-id').value;
    if (!id || !confirm('Archiver cet article ?')) return;
    try {
      await api.delete(`/articles/${id}`);
      toast('Article archivé','success');
      closeModal('art-modal');
      load();
    } catch (e) { toast(e.message,'error'); }
  }

  document.getElementById('art-new-btn').addEventListener('click', openNew);
  document.getElementById('art-save-btn').addEventListener('click', save);
  document.getElementById('art-del-btn').addEventListener('click', archive);
  document.getElementById('art-cancel').addEventListener('click', () => closeModal('art-modal'));
  document.getElementById('art-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('art-modal')) closeModal('art-modal');
  });
  document.getElementById('art-search').addEventListener('input', () => {
    clearTimeout(searchTimer); searchTimer = setTimeout(load, 300);
  });
  document.getElementById('art-cat-filter').addEventListener('change', load);
  document.getElementById('art-alerte-filter').addEventListener('change', load);
  document.getElementById('art-tbody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn?.dataset.action === 'edit') { openEdit(btn.dataset.id); return; }
    const row = e.target.closest('tr[data-id]');
    if (row) openEdit(row.dataset.id);
  });

  loadCategories().then(load);
}
