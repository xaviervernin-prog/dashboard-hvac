const ArticlesModule = (() => {
  let _articles = [];
  let _categories = [];
  let _editId = null;

  async function load() {
    try {
      [_articles, _categories] = await Promise.all([
        api.articles.list(),
        api.articles.categories.list(),
      ]);
      _fillCatSelects();
      render();
    } catch (e) { toast('Erreur chargement articles : ' + e.message, true); }
  }

  function _fillCatSelects() {
    const opts = _categories.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
    const filterSel = document.getElementById('fs-articles');
    if (filterSel) filterSel.innerHTML = '<option value="">Toutes catégories</option>' + opts;
    const modalSel = document.getElementById('a-cat');
    if (modalSel) modalSel.innerHTML = opts;
  }

  function render() {
    const q = (document.getElementById('fq-articles') || { value: '' }).value.toLowerCase();
    const catId = (document.getElementById('fs-articles') || { value: '' }).value;
    const list = _articles.filter(a => {
      const match = ((a.designation || '') + ' ' + (a.reference || '')).toLowerCase().includes(q);
      return match && (!catId || a.categorie_id === catId);
    });
    const tb = document.getElementById('tb-articles');
    const catName = (a) => {
      const cat = _categories.find(c => c.id === a.categorie_id);
      return cat ? cat.nom : '—';
    };
    tb.innerHTML = list.length
      ? list.map(a => `<tr onclick="ArticlesModule.open('${a.id}')">
          <td><code>${a.reference}</code></td>
          <td><strong>${a.designation}</strong></td>
          <td><span class="badge bg">${catName(a)}</span></td>
          <td>${fmt(a.prix_unitaire)} AED</td>
          <td>${a.unite}</td>
        </tr>`).join('')
      : '<tr><td colspan="5" class="empty-state">Aucun résultat</td></tr>';
    document.getElementById('s-at').textContent = _articles.length;
  }

  function open(id) {
    _editId = id || null;
    document.getElementById('article-modal-title').textContent = id ? "Modifier l'article" : 'Nouvel article';
    document.getElementById('a-del-btn').style.display = id ? 'block' : 'none';
    if (id) {
      const a = _articles.find(x => x.id === id);
      if (!a) return;
      sv('a-ref', a.reference); sv('a-cat', a.categorie_id || '');
      sv('a-nom', a.designation); sv('a-desc', a.description || '');
      sv('a-prix', a.prix_unitaire); sv('a-unite', a.unite);
    } else {
      ['a-ref', 'a-nom', 'a-desc', 'a-prix'].forEach(i => sv(i, ''));
      sv('a-unite', 'unité');
    }
    document.getElementById('ov-article').classList.add('open');
  }

  async function save() {
    if (!gv('a-nom')) return toast('Désignation obligatoire', true);
    const payload = {
      reference: gv('a-ref') || ('REF-' + Date.now()),
      designation: gv('a-nom'),
      categorie_id: gv('a-cat') || null,
      prix_unitaire: parseFloat(gv('a-prix')) || 0,
      unite: gv('a-unite') || 'unité',
      description: gv('a-desc') || null,
    };
    try {
      if (_editId) { await api.articles.update(_editId, payload); toast('Article mis à jour'); }
      else { await api.articles.create(payload); toast('Article créé'); }
      closeOv('article');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  async function del() {
    if (!confirm('Supprimer cet article ?')) return;
    try {
      await api.articles.delete(_editId);
      closeOv('article');
      toast('Article supprimé');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  // --- Catégories ---
  function openCatManager() {
    _renderCatList();
    document.getElementById('ov-cats').classList.add('open');
  }

  function _renderCatList() {
    document.getElementById('cats-list').innerHTML = _categories.map(c => `
      <div class="cat-item">
        <span class="cat-name">${c.nom}</span>
        <button class="rm-cat" onclick="ArticlesModule.deleteCat('${c.id}')">×</button>
      </div>`).join('');
  }

  async function addCat() {
    const input = document.getElementById('new-cat-input');
    const val = (input.value || '').trim();
    if (!val) return;
    try {
      await api.articles.categories.create({ nom: val });
      input.value = '';
      _categories = await api.articles.categories.list();
      _renderCatList();
      _fillCatSelects();
      toast('Catégorie créée');
    } catch (e) { toast(e.message, true); }
  }

  async function deleteCat(id) {
    try {
      await api.articles.categories.delete(id);
      _categories = await api.articles.categories.list();
      _renderCatList();
      _fillCatSelects();
      toast('Catégorie supprimée');
    } catch (e) { toast(e.message, true); }
  }

  return { load, render, open, save, del, openCatManager, addCat, deleteCat, get articles() { return _articles; }, get categories() { return _categories; } };
})();
