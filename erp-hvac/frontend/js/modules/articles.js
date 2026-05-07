let articlesData = [];
let categoriesData = [];

async function loadArticles(forceReload = true) {
  const panel = document.getElementById('tab-articles');
  if (!forceReload && articlesData.length) { renderArticles(); return; }

  panel.innerHTML = `
    <h2 class="page-title">Articles & Stock</h2>
    <div id="stock-alert-banner"></div>
    <div class="table-card">
      <div class="table-header">
        <h3>Catalogue</h3>
        <div class="table-header-actions">
          <button class="btn-filter" id="art-filter-btn">🔍 Filtrer</button>
          ${hasRole('administrateur','commercial') ? '<button class="btn-p" onclick="openArticleForm()">+ Nouvel article</button>' : ''}
        </div>
      </div>
      <div class="filter-bar" id="art-filter-bar" style="display:none">
        <input type="text" id="art-q" placeholder="Rechercher…" oninput="filterArticles()">
        <select id="art-cat" onchange="filterArticles()"><option value="">Toutes catégories</option></select>
      </div>
      <div class="loading"><div class="spinner"></div>Chargement…</div>
    </div>
    <div id="article-modal" class="modal"></div>`;

  document.getElementById('art-filter-btn').addEventListener('click', () => {
    const bar = document.getElementById('art-filter-bar');
    bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
  });

  try {
    [articlesData, categoriesData] = await Promise.all([
      api.get('/articles'),
      api.get('/articles/categories')
    ]);

    const catSel = document.getElementById('art-cat');
    categoriesData.forEach(c => {
      catSel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${escapeHtml(c.nom)}</option>`);
    });

    await loadStockAlertes();
    renderArticles();
  } catch (err) {
    document.querySelector('#tab-articles .loading').outerHTML =
      `<div class="alert error" style="margin:16px">${escapeHtml(err.message)}</div>`;
  }
}

async function loadStockAlertes() {
  try {
    const alertes = await api.get('/articles/stock/alertes');
    const banner = document.getElementById('stock-alert-banner');
    if (alertes.length > 0) {
      banner.innerHTML = `<div class="alert warn" style="margin-bottom:14px">⚠️ ${alertes.length} article(s) en stock critique : ${alertes.slice(0,3).map(a=>escapeHtml(a.designation)).join(', ')}${alertes.length > 3 ? '…' : ''}</div>`;
    }
  } catch {}
}

function filterArticles() {
  const q = (document.getElementById('art-q')?.value || '').toLowerCase();
  const cat = document.getElementById('art-cat')?.value || '';
  const filtered = articlesData.filter(a =>
    (!q || `${a.designation} ${a.reference || ''}`.toLowerCase().includes(q)) &&
    (!cat || String(a.categorie_id) === cat)
  );
  renderArticlesTable(filtered);
}

function renderArticles() {
  renderArticlesTable(articlesData);
}

function renderArticlesTable(data) {
  const card = document.querySelector('#tab-articles .table-card');
  const old = card.querySelector('.tscroll, .empty');
  if (old) old.remove();

  if (!data.length) {
    card.insertAdjacentHTML('beforeend', '<div class="empty"><div class="empty-icon">🔧</div><p>Aucun article</p></div>');
    return;
  }

  card.insertAdjacentHTML('beforeend', `
    <div class="tscroll">
      <table>
        <thead><tr>
          <th>Référence</th><th>Désignation</th><th>Catégorie</th>
          <th>Prix HT</th><th>Stock</th><th>Actions</th>
        </tr></thead>
        <tbody>${data.map(articleRow).join('')}</tbody>
      </table>
    </div>`);
}

function articleRow(a) {
  const stockClass = a.stock_actuel <= a.stock_minimum ? 're' : a.stock_actuel <= a.stock_minimum * 2 ? 'ye' : 'gr';
  return `
    <tr>
      <td><code style="font-size:11px;color:var(--muted)">${escapeHtml(a.reference || '—')}</code></td>
      <td><strong>${escapeHtml(a.designation)}</strong></td>
      <td>${escapeHtml(a.categorie_nom || '—')}</td>
      <td>${fmt(a.prix_unitaire)} / ${escapeHtml(a.unite)}</td>
      <td><span class="badge ${stockClass}">${a.stock_actuel} ${escapeHtml(a.unite)}</span></td>
      <td onclick="event.stopPropagation()">
        ${hasRole('administrateur','commercial') ? `<button class="act blue" onclick="openArticleForm(${a.id})">Modifier</button>` : ''}
        ${hasRole('administrateur') ? `<button class="act red" onclick="deleteArticle(${a.id})">Archiver</button>` : ''}
      </td>
    </tr>`;
}

async function openArticleForm(id = null) {
  let a = {};
  if (id) a = await api.get(`/articles/${id}`);

  const catOptions = categoriesData.map(c =>
    `<option value="${c.id}" ${a.categorie_id == c.id ? 'selected' : ''}>${escapeHtml(c.nom)}</option>`
  ).join('');

  const modal = document.getElementById('article-modal');
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>${id ? 'Modifier l\'article' : 'Nouvel article'}</h3>
      <button class="modal-close" onclick="closeModal('article-modal')">×</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label>Référence</label><input id="a-ref" value="${escapeHtml(a.reference||'')}"></div>
        <div class="form-group"><label>Catégorie</label>
          <select id="a-cat"><option value="">— Choisir —</option>${catOptions}</select>
        </div>
      </div>
      <div class="form-group"><label>Désignation *</label><input id="a-des" value="${escapeHtml(a.designation||'')}" required></div>
      <div class="form-group"><label>Description</label><textarea id="a-desc" rows="2">${escapeHtml(a.description||'')}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Prix unitaire HT (AED)</label><input id="a-prix" type="number" step="0.01" min="0" value="${a.prix_unitaire||0}"></div>
        <div class="form-group"><label>TVA (%)</label><input id="a-tva" type="number" step="0.01" value="${a.tva_taux||5}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Stock actuel</label><input id="a-stock" type="number" min="0" value="${a.stock_actuel||0}"></div>
        <div class="form-group"><label>Stock minimum</label><input id="a-smin" type="number" min="0" value="${a.stock_minimum||5}"></div>
      </div>
      <div class="form-group"><label>Unité</label><input id="a-unite" value="${escapeHtml(a.unite||'unité')}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('article-modal')">Annuler</button>
      <button class="btn-p" onclick="saveArticle(${id || 'null'})">💾 Enregistrer</button>
    </div>`;
  openModal('article-modal');
}

async function saveArticle(id) {
  const body = {
    reference: document.getElementById('a-ref').value,
    designation: document.getElementById('a-des').value,
    categorie_id: document.getElementById('a-cat').value || null,
    description: document.getElementById('a-desc').value,
    prix_unitaire: parseFloat(document.getElementById('a-prix').value) || 0,
    tva_taux: parseFloat(document.getElementById('a-tva').value) || 5,
    stock_actuel: parseInt(document.getElementById('a-stock').value) || 0,
    stock_minimum: parseInt(document.getElementById('a-smin').value) || 5,
    unite: document.getElementById('a-unite').value || 'unité'
  };
  if (!body.designation) { showToast('La désignation est requise', 'error'); return; }

  try {
    if (id) await api.put(`/articles/${id}`, body);
    else await api.post('/articles', body);
    showToast(id ? 'Article mis à jour' : 'Article créé', 'success');
    closeModal('article-modal');
    loadArticles();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteArticle(id) {
  if (!confirm('Archiver cet article ?')) return;
  try {
    await api.del(`/articles/${id}`);
    showToast('Article archivé', 'success');
    loadArticles();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
