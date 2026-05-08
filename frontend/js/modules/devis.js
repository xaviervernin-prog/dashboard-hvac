App.devis = (() => {
  let devisList = [];
  let editId = null;
  let dLines = [];

  async function refresh() {
    devisList = await API.devis.list();
    render();
  }

  function render() {
    const q = (document.getElementById('fq-devis') || { value: '' }).value.toLowerCase();
    const st = (document.getElementById('fs-devis') || { value: '' }).value;
    const list = devisList.filter(d => {
      const match = ((d.client_nom || '') + ' ' + (d.num || '') + ' ' + (d.objet || '')).toLowerCase().includes(q);
      return match && (!st || d.statut === st);
    });
    const tb = document.getElementById('tb-devis');
    tb.innerHTML = list.length ? list.map(d => {
      let actions = '';
      if (d.statut === 'accepte') {
        actions = `<button class="act blue" onclick="App.agenda.planifierDevis(${d.id});event.stopPropagation()">📅 Planifier</button>`;
      } else if (d.statut === 'en_attente') {
        actions = `<button class="act orange" onclick="App.devis.relancer(${d.id},event)">📨 Relancer</button>`
          + (d.relance_date ? `<span class="relance-info">Relancé le ${App.fmtDate(d.relance_date)}</span>` : '');
      }
      return `<tr onclick="App.devis.open(${d.id})">
        <td><code>${d.num}</code></td>
        <td>${d.client_nom}</td>
        <td>${d.objet || '—'}</td>
        <td>${d.date || '—'}</td>
        <td><strong>${App.fmt(d.montant)} AED</strong></td>
        <td>${App.bD(d.statut)}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="7" class="empty-state">Aucun résultat</td></tr>';

    const tot = devisList.reduce((s, d) => s + d.montant, 0);
    document.getElementById('s-dt').textContent = devisList.length;
    document.getElementById('s-da').textContent = devisList.filter(d => d.statut === 'en_attente').length;
    document.getElementById('s-dv').textContent = devisList.filter(d => d.statut === 'accepte').length;
    document.getElementById('s-dm').textContent = App.fmt(tot);
  }

  async function open(id) {
    editId = id || null;
    dLines = [];

    const clients = await API.clients.list();
    App.clients.fillSelect('d-client', null);

    const articles = await API.articles.list();
    document.getElementById('devis-modal-title').textContent = id ? 'Modifier le devis' : 'Nouveau devis';
    document.getElementById('d-del-btn').style.display = id ? 'block' : 'none';

    let locked = false;
    if (id) {
      const d = devisList.find(x => x.id === id);
      if (!d) return;
      locked = d.statut === 'accepte';
      App.clients.fillSelect('d-client', d.client_id);
      App.sv('d-objet', d.objet); App.sv('d-date', d.date); App.sv('d-st', d.statut);
      App.sv('d-montant', d.montant);
      dLines = d.lignes.map(l => ({ aid: l.article_id, qty: l.qty, prix: l.prix }));
      ['d-objet','d-montant'].forEach(fid => {
        const el = document.getElementById(fid); if (el) el.disabled = locked;
      });
      document.getElementById('d-client').disabled = locked;
    } else {
      ['d-objet','d-montant','d-client'].forEach(fid => {
        const el = document.getElementById(fid); if (el) el.disabled = false;
      });
      ['d-objet','d-montant'].forEach(i => App.sv(i, ''));
      App.sv('d-date', App.today); App.sv('d-st', 'en_attente');
    }
    document.getElementById('devis-lock-banner').style.display = locked ? 'block' : 'none';
    renderLines(locked, articles);
    App.openOv('devis');
  }

  function renderLines(locked, articles) {
    const articlesList = articles || App.articles.list();
    const c = document.getElementById('devis-lines');
    c.innerHTML = '';
    const btn = document.getElementById('devis-add-line-btn');
    if (btn) btn.style.display = locked ? 'none' : 'block';

    dLines.forEach((l, i) => {
      const div = document.createElement('div');
      div.className = 'art-line';
      if (locked) {
        const a = articlesList.find(x => x.id === l.aid);
        div.innerHTML = `
          <span style="font-size:13px;color:#334155;">${a ? a.nom : '?'}</span>
          <span style="font-size:12px;color:var(--gray);text-align:center;">${l.qty}x</span>
          <span style="font-size:13px;font-weight:700;text-align:right;">${App.fmt(l.prix)} AED</span>
          <span></span>`;
      } else {
        const opts = articlesList.map(a =>
          `<option value="${a.id}" ${a.id === l.aid ? 'selected' : ''} data-p="${a.prix}">${a.nom}</option>`
        ).join('');
        div.innerHTML = `
          <select onchange="App.devis._setLine(${i},'aid',parseInt(this.value));App.devis._setLine(${i},'prix',parseFloat(this.options[this.selectedIndex].dataset.p)||0);App.devis.updateTotal()">
            <option value="">-- Article --</option>${opts}
          </select>
          <input type="number" min="1" value="${l.qty || 1}" onchange="App.devis._setLine(${i},'qty',parseInt(this.value)||1);App.devis.updateTotal()">
          <input type="number" value="${l.prix || ''}" placeholder="AED" onchange="App.devis._setLine(${i},'prix',parseFloat(this.value)||0);App.devis.updateTotal()">
          <button class="rm-line" onclick="App.devis._removeLine(${i})">×</button>`;
      }
      c.appendChild(div);
    });
    updateTotal();
  }

  function _setLine(i, key, val) { if (dLines[i]) dLines[i][key] = val; }
  function _removeLine(i) { dLines.splice(i, 1); renderLines(false, App.articles.list()); }
  function addLine() { dLines.push({ aid: null, qty: 1, prix: 0 }); renderLines(false, App.articles.list()); }

  function updateTotal() {
    let tot = dLines.reduce((s, l) => s + (l.prix || 0) * (l.qty || 1), 0);
    if (!dLines.length) tot = parseFloat(document.getElementById('d-montant')?.value) || 0;
    document.getElementById('d-total').textContent = App.fmt(tot) + ' AED';
  }

  async function save() {
    if (!App.gv('d-client')) return alert('Sélectionner un client');
    const montant = dLines.length
      ? dLines.reduce((s, l) => s + (l.prix || 0) * (l.qty || 1), 0)
      : parseFloat(App.gv('d-montant')) || 0;

    if (editId) {
      const d = devisList.find(x => x.id === editId);
      if (d?.statut === 'accepte') {
        await API.devis.update(editId, { ...d, statut: App.gv('d-st'), date: App.gv('d-date'), lignes: dLines });
        App.closeOv('devis');
        await refresh();
        App.updateBell();
        return;
      }
    }
    const data = {
      client_id: parseInt(App.gv('d-client')),
      objet: App.gv('d-objet'), date: App.gv('d-date'),
      montant, statut: App.gv('d-st'),
      lignes: dLines.map(l => ({ article_id: l.aid, qty: l.qty, prix: l.prix }))
    };
    try {
      if (editId) await API.devis.update(editId, data);
      else await API.devis.create(data);
      App.closeOv('devis');
      await refresh();
      App.updateBell();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  async function del() {
    if (!confirm('Supprimer ?')) return;
    try {
      await API.devis.delete(editId);
      App.closeOv('devis');
      await refresh();
      App.updateBell();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  async function relancer(id, e) {
    e.stopPropagation();
    await API.devis.relance(id);
    await refresh();
  }

  return { refresh, render, open, save, del, relancer, addLine, updateTotal, _setLine, _removeLine };
})();
