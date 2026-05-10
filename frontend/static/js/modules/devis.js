const DevisModule = (() => {
  let _devis = [];
  let _editId = null;
  let _lines = [];

  async function load() {
    try {
      _devis = await api.devis.list();
      render();
    } catch (e) { toast('Erreur chargement devis : ' + e.message, true); }
  }

  function render() {
    const q = (document.getElementById('fq-devis') || { value: '' }).value.toLowerCase();
    const st = (document.getElementById('fs-devis') || { value: '' }).value;
    const list = _devis.filter(d => {
      const clientNom = d.clients ? d.clients.nom : '';
      const match = (clientNom + ' ' + (d.numero || '') + ' ' + (d.objet || '')).toLowerCase().includes(q);
      return match && (!st || d.statut === st);
    });
    const tb = document.getElementById('tb-devis');
    tb.innerHTML = list.length
      ? list.map(d => {
          const cn = d.clients ? d.clients.nom : '—';
          let actions = '';
          if (d.statut === 'accepte') actions = `<button class="act blue" onclick="DevisModule.planifier('${d.id}',event)">📅 Planifier</button>`;
          else if (d.statut === 'envoye') actions = `<button class="act orange" onclick="event.stopPropagation()">📨 Relancer</button>`;
          return `<tr onclick="DevisModule.open('${d.id}')">
            <td><code>${d.numero}</code></td><td>${cn}</td><td>${d.objet || '—'}</td>
            <td>${fmtDate(d.created_at ? d.created_at.split('T')[0] : '')}</td>
            <td><strong>${fmt(d.montant_total)} AED</strong></td>
            <td>${bD(d.statut)}</td><td>${actions}</td></tr>`;
        }).join('')
      : '<tr><td colspan="7" class="empty-state">Aucun résultat</td></tr>';
    const tot = _devis.reduce((s, d) => s + d.montant_total, 0);
    document.getElementById('s-dt').textContent = _devis.length;
    document.getElementById('s-da').textContent = _devis.filter(d => d.statut === 'envoye').length;
    document.getElementById('s-dv').textContent = _devis.filter(d => d.statut === 'accepte').length;
    document.getElementById('s-dm').textContent = fmt(tot);
  }

  function open(id) {
    _editId = id || null;
    _lines = [];
    document.getElementById('devis-modal-title').textContent = id ? 'Modifier le devis' : 'Nouveau devis';
    document.getElementById('d-del-btn').style.display = id ? 'block' : 'none';
    ClientsModule.fillSelect('d-client', null);
    const locked = false;
    if (id) {
      const d = _devis.find(x => x.id === id);
      if (!d) return;
      ClientsModule.fillSelect('d-client', d.client_id);
      sv('d-objet', d.objet); sv('d-st', d.statut);
      sv('d-montant', d.montant_manuel || '');
      _lines = (d.lignes || []).map(l => ({ ...l }));
      const isLocked = d.statut === 'accepte';
      document.getElementById('devis-lock-banner').style.display = isLocked ? 'block' : 'none';
      ['d-objet', 'd-montant', 'd-client'].forEach(fid => {
        const el = document.getElementById(fid); if (el) el.disabled = isLocked;
      });
    } else {
      ['d-objet', 'd-montant', 'd-client'].forEach(fid => {
        const el = document.getElementById(fid); if (el) el.disabled = false;
      });
      sv('d-objet', ''); sv('d-montant', ''); sv('d-st', 'brouillon');
      document.getElementById('devis-lock-banner').style.display = 'none';
    }
    _renderLines(locked);
    document.getElementById('ov-devis').classList.add('open');
  }

  function _renderLines(locked) {
    const c = document.getElementById('devis-lines');
    c.innerHTML = '';
    const btn = document.getElementById('devis-add-line-btn');
    if (btn) btn.style.display = locked ? 'none' : 'block';
    const articles = ArticlesModule.articles;
    _lines.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'art-line';
      if (locked) {
        const a = articles.find(x => x.id === l.article_id);
        div.innerHTML = `<span style="font-size:13px">${a ? a.designation : l.designation || '?'}</span>
          <span style="text-align:center;font-size:12px">${l.quantite}x</span>
          <span style="text-align:right;font-weight:700">${fmt(l.prix_unitaire)} AED</span><span></span>`;
      } else {
        const opts = articles.map(a => `<option value="${a.id}" ${a.id === l.article_id ? 'selected' : ''} data-p="${a.prix_unitaire}">${a.designation}</option>`).join('');
        div.innerHTML = `<select onchange="DevisModule._lineChange(${i},this)"><option value="">-- Article --</option>${opts}</select>
          <input type="number" min="1" value="${l.quantite || 1}" onchange="DevisModule._lineQty(${i},this.value)">
          <input type="number" value="${l.prix_unitaire || ''}" placeholder="AED" onchange="DevisModule._linePrix(${i},this.value)">
          <button class="rm-line" onclick="DevisModule._removeLine(${i})">×</button>`;
      }
      c.appendChild(div);
    });
    _updateTotal();
  }

  function _lineChange(i, sel) { _lines[i].article_id = sel.value; _lines[i].prix_unitaire = parseFloat(sel.options[sel.selectedIndex].dataset.p) || 0; _updateTotal(); }
  function _lineQty(i, v) { _lines[i].quantite = parseInt(v) || 1; _updateTotal(); }
  function _linePrix(i, v) { _lines[i].prix_unitaire = parseFloat(v) || 0; _updateTotal(); }
  function _removeLine(i) { _lines.splice(i, 1); _renderLines(false); }

  function addLine() { _lines.push({ article_id: null, designation: '', quantite: 1, prix_unitaire: 0, total: 0 }); _renderLines(false); }

  function _updateTotal() {
    let tot = _lines.reduce((s, l) => s + (l.prix_unitaire || 0) * (l.quantite || 1), 0);
    if (!_lines.length) tot = parseFloat(document.getElementById('d-montant').value) || 0;
    document.getElementById('d-total').textContent = fmt(tot) + ' AED';
    _lines.forEach(l => { l.total = (l.prix_unitaire || 0) * (l.quantite || 1); });
  }

  async function save() {
    if (!gv('d-client')) return toast('Sélectionner un client', true);
    const montantManuel = parseFloat(gv('d-montant')) || null;
    const payload = {
      client_id: gv('d-client'),
      objet: gv('d-objet'),
      statut: gv('d-st'),
      montant_manuel: montantManuel,
      lignes: _lines,
    };
    try {
      if (_editId) { await api.devis.update(_editId, payload); toast('Devis mis à jour'); }
      else { await api.devis.create(payload); toast('Devis créé'); }
      closeOv('devis');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  async function del() {
    if (!confirm('Supprimer ce devis ?')) return;
    try {
      await api.devis.delete(_editId);
      closeOv('devis');
      toast('Devis supprimé');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  function planifier(id, e) {
    e.stopPropagation();
    switchTab('agenda');
    setTimeout(() => AgendaModule.openIntervWithDevis(id), 80);
  }

  function fillAcceptedSelect(selId, curId) {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const accepted = _devis.filter(d => d.statut === 'accepte');
    sel.innerHTML = '<option value="">-- Devis accepté --</option>' +
      accepted.map(d => {
        const cn = d.clients ? d.clients.nom : '';
        return `<option value="${d.id}" ${d.id === curId ? 'selected' : ''}>${d.numero} — ${cn} (${fmt(d.montant_total)} AED)</option>`;
      }).join('');
  }

  return { load, render, open, save, del, planifier, addLine, _lineChange, _lineQty, _linePrix, _removeLine, fillAcceptedSelect, get devis() { return _devis; } };
})();
