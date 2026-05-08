App.factures = (() => {
  let factures = [];
  let editId = null;

  async function refresh() {
    factures = await API.factures.list();
    render();
  }

  function render() {
    const q = (document.getElementById('fq-factures') || { value: '' }).value.toLowerCase();
    const st = (document.getElementById('fs-factures') || { value: '' }).value;
    const list = factures.filter(f => {
      const match = ((f.client_nom || '') + ' ' + (f.num || '') + ' ' + (f.devis_ref || '')).toLowerCase().includes(q);
      return match && (!st || f.statut === st);
    });
    const today = App.today;
    const tb = document.getElementById('tb-factures');
    tb.innerHTML = list.length ? list.map(f => {
      let overdueStr = '';
      if ((f.statut === 'retard' || f.statut === 'en_attente') && f.echeance && f.echeance < today) {
        const days = App.daysBetween(f.echeance, today);
        if (days > 0) overdueStr = `<span class="overdue-badge">J+${days}</span>`;
      }
      let actions = '';
      if (f.statut === 'en_attente' || f.statut === 'retard') {
        actions = `<button class="act orange" onclick="App.factures.relancer(${f.id},event)">📨 Relancer</button>`
          + (f.relance_date ? `<span class="relance-info">Relancé le ${App.fmtDate(f.relance_date)}</span>` : '');
      }
      return `<tr onclick="App.factures.open(${f.id})">
        <td><code>${f.num}</code></td>
        <td>${f.client_nom}</td>
        <td>${f.devis_ref ? `<code>${f.devis_ref}</code>` : '—'}</td>
        <td>${f.date || '—'}</td>
        <td>${f.echeance || '—'}${overdueStr}</td>
        <td><strong>${App.fmt(f.montant)} AED</strong></td>
        <td>${App.bF(f.statut)}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="8" class="empty-state">Aucun résultat</td></tr>';

    const tot = factures.reduce((s, f) => s + f.montant, 0);
    const enc = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant, 0);
    const att = factures.filter(f => f.statut === 'en_attente').reduce((s, f) => s + f.montant, 0);
    const ret = factures.filter(f => f.statut === 'retard').reduce((s, f) => s + f.montant, 0);
    document.getElementById('s-ft').textContent = App.fmt(tot);
    document.getElementById('s-fe').textContent = App.fmt(enc);
    document.getElementById('s-fa').textContent = App.fmt(att);
    document.getElementById('s-fr').textContent = App.fmt(ret);
  }

  async function open(id) {
    editId = id || null;
    const clients = await API.clients.list();
    App.clients.fillSelect('f-client', null);

    document.getElementById('facture-modal-title').textContent = id ? 'Modifier la facture' : 'Nouvelle facture';
    document.getElementById('f-del-btn').style.display = id ? 'block' : 'none';
    if (id) {
      const f = factures.find(x => x.id === id);
      if (!f) return;
      App.clients.fillSelect('f-client', f.client_id);
      App.sv('f-devis', f.devis_ref); App.sv('f-montant', f.montant);
      App.sv('f-date', f.date); App.sv('f-ech', f.echeance); App.sv('f-st', f.statut);
    } else {
      ['f-devis','f-montant'].forEach(i => App.sv(i, ''));
      App.sv('f-date', App.today); App.sv('f-ech', App.today); App.sv('f-st', 'en_attente');
    }
    App.openOv('facture');
  }

  async function openFromInterv(iv) {
    await App.switchTab('facturation');
    setTimeout(async () => {
      editId = null;
      const clients = await API.clients.list();
      App.clients.fillSelect('f-client', iv.client_id);
      App.sv('f-devis', iv.devis_num || '');
      App.sv('f-montant', iv.montant);
      App.sv('f-date', App.today);
      App.sv('f-ech', App.today);
      App.sv('f-st', 'en_attente');
      document.getElementById('facture-modal-title').textContent = 'Nouvelle facture';
      document.getElementById('f-del-btn').style.display = 'none';
      App.openOv('facture');
    }, 80);
  }

  async function save() {
    if (!App.gv('f-client')) return alert('Sélectionner un client');
    const data = {
      client_id: parseInt(App.gv('f-client')),
      devis_ref: App.gv('f-devis'),
      montant: parseFloat(App.gv('f-montant')) || 0,
      date: App.gv('f-date'),
      echeance: App.gv('f-ech'),
      statut: App.gv('f-st')
    };
    try {
      if (editId) await API.factures.update(editId, data);
      else await API.factures.create(data);
      App.closeOv('facture');
      await refresh();
      App.updateBell();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  async function del() {
    if (!confirm('Supprimer ?')) return;
    try {
      await API.factures.delete(editId);
      App.closeOv('facture');
      await refresh();
      App.updateBell();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  async function relancer(id, e) {
    e.stopPropagation();
    await API.factures.relance(id);
    await refresh();
  }

  return { refresh, render, open, openFromInterv, save, del, relancer };
})();
