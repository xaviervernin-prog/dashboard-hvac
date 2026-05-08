App.articles = (() => {
  let articles = [];
  let categories = [];
  let editId = null;

  async function refresh() {
    [articles, categories] = await Promise.all([API.articles.list(), API.categories.list()]);
    fillCatSelects();
    render();
  }

  function fillCatSelects() {
    const opts = categories.map(c => `<option value="${c.nom}">${c.nom}</option>`).join('');
    const filterSel = document.getElementById('fs-articles');
    if (filterSel) filterSel.innerHTML = '<option value="">Toutes catégories</option>' + opts;
    const modalSel = document.getElementById('a-cat');
    if (modalSel) modalSel.innerHTML = opts;
  }

  function render() {
    const q = (document.getElementById('fq-articles') || { value: '' }).value.toLowerCase();
    const cat = (document.getElementById('fs-articles') || { value: '' }).value;
    const list = articles.filter(a => {
      const match = ((a.nom || '') + ' ' + (a.ref || '')).toLowerCase().includes(q);
      return match && (!cat || a.cat === cat);
    });
    const tb = document.getElementById('tb-articles');
    tb.innerHTML = list.length ? list.map(a =>
      `<tr onclick="App.articles.open(${a.id})">
        <td><code>${a.ref}</code></td>
        <td><strong>${a.nom}</strong></td>
        <td><span class="badge bg">${a.cat}</span></td>
        <td>${App.fmt(a.prix)} AED</td>
        <td>${App.bSt(a.stock)}</td>
      </tr>`
    ).join('') : '<tr><td colspan="5" class="empty-state">Aucun résultat</td></tr>';

    const val = articles.reduce((s, a) => s + a.prix * a.stock, 0);
    document.getElementById('s-at').textContent = articles.length;
    document.getElementById('s-ac').textContent = articles.filter(a => a.stock <= 5).length;
    document.getElementById('s-av').textContent = App.fmt(val);
  }

  async function open(id) {
    editId = id || null;
    await refresh();
    document.getElementById('article-modal-title').textContent = id ? "Modifier l'article" : 'Nouvel article';
    document.getElementById('a-del-btn').style.display = id ? 'block' : 'none';
    if (id) {
      const a = articles.find(x => x.id === id);
      if (!a) return;
      App.sv('a-ref', a.ref); App.sv('a-cat', a.cat); App.sv('a-nom', a.nom);
      App.sv('a-desc', a.desc || ''); App.sv('a-prix', a.prix); App.sv('a-stk', a.stock);
    } else {
      ['a-ref','a-nom','a-desc','a-prix','a-stk'].forEach(i => App.sv(i, ''));
    }
    App.openOv('article');
  }

  async function save() {
    if (!App.gv('a-nom')) return alert('Désignation obligatoire');
    const data = {
      ref: App.gv('a-ref'), nom: App.gv('a-nom'), cat: App.gv('a-cat'),
      desc: App.gv('a-desc'), prix: parseFloat(App.gv('a-prix')) || 0,
      stock: parseInt(App.gv('a-stk')) || 0
    };
    try {
      if (editId) await API.articles.update(editId, data);
      else await API.articles.create(data);
      App.closeOv('article');
      await refresh();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  async function del() {
    if (!confirm('Supprimer ?')) return;
    try {
      await API.articles.delete(editId);
      App.closeOv('article');
      await refresh();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  // Category manager
  async function openCatManager() {
    await refresh();
    renderCatList();
    App.openOv('cats');
  }

  function renderCatList() {
    const list = document.getElementById('cats-list');
    list.innerHTML = categories.map(cat => {
      const inUse = articles.some(a => a.cat === cat.nom);
      const canDel = !inUse && categories.length > 1;
      return `<div class="cat-item">
        <span class="cat-name">${cat.nom}</span>
        ${canDel
          ? `<button class="rm-cat" onclick="App.articles.removeCat(${cat.id})" title="Supprimer">×</button>`
          : `<span style="font-size:11px;color:var(--muted);padding-right:4px;">${inUse ? 'utilisée' : 'seule'}</span>`}
      </div>`;
    }).join('');
  }

  async function addCategory() {
    const input = document.getElementById('new-cat-input');
    const val = (input.value || '').trim();
    if (!val) return;
    try {
      await API.categories.create({ nom: val });
      input.value = '';
      await refresh();
      renderCatList();
    } catch (e) { alert(e.message); }
  }

  async function removeCat(id) {
    try {
      await API.categories.delete(id);
      await refresh();
      renderCatList();
    } catch (e) { alert(e.message); }
  }

  function fillSelect(selId) {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = articles.map(a =>
      `<option value="${a.id}" data-p="${a.prix}">${a.nom}</option>`
    ).join('');
  }

  return { refresh, render, open, save, del, openCatManager, renderCatList, addCategory, removeCat, fillSelect, list: () => articles };
})();
