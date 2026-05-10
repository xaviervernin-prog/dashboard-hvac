const FacturationModule = (() => {
  let _factures = [];
  let _editId = null;

  async function load() {
    try {
      [_factures] = await Promise.all([api.facturation.list()]);
      render();
      _loadStats();
    } catch (e) { toast('Erreur chargement factures : ' + e.message, true); }
  }

  async function _loadStats() {
    try {
      const s = await api.facturation.stats();
      document.getElementById('s-ft').textContent = fmt(s.total_facture);
      document.getElementById('s-fe').textContent = fmt(s.total_paye);
      document.getElementById('s-fa').textContent = fmt(s.total_en_attente);
      document.getElementById('s-fr').textContent = fmt(s.total_en_retard);
    } catch (_) {}
  }

  function render() {
    const q = (document.getElementById('fq-factures') || { value: '' }).value.toLowerCase();
    const st = (document.getElementById('fs-factures') || { value: '' }).value;
    const list = _factures.filter(f => {
      const cn = f.clients ? f.clients.nom : '';
      const match = (cn + ' ' + (f.numero || '')).toLowerCase().includes(q);
      return match && (!st || f.statut === st);
    });
    const tb = document.getElementById('tb-factures');
    tb.innerHTML = list.length
      ? list.map(f => {
          const cn = f.clients ? f.clients.nom : '—';
          let overdueStr = '';
          if ((f.statut === 'en_retard' || f.statut === 'en_attente') && f.date_echeance && f.date_echeance < today) {
            const days = daysBetween(f.date_echeance, today);
            if (days > 0) overdueStr = `<span class="overdue-badge">J+${days}</span>`;
          }
          let actions = '';
          if (f.statut === 'en_attente' || f.statut === 'en_retard') {
            actions = `<button class="act orange" onclick="event.stopPropagation()">📨 Relancer</button>`;
          }
          return `<tr onclick="FacturationModule.open('${f.id}')">
            <td><code>${f.numero}</code></td><td>${cn}</td>
            <td>${f.devis_id ? '<code>' + f.devis_id + '</code>' : '—'}</td>
            <td>${fmtDate(f.created_at ? f.created_at.split('T')[0] : '')}</td>
            <td>${f.date_echeance ? fmtDate(f.date_echeance) : '—'}${overdueStr}</td>
            <td><strong>${fmt(f.montant)} AED</strong></td>
            <td>${bF(f.statut)}</td>
            <td>${actions}</td></tr>`;
        }).join('')
      : '<tr><td colspan="8" class="empty-state">Aucun résultat</td></tr>';
  }

  function open(id) {
    _editId = id || null;
    document.getElementById('facture-modal-title').textContent = id ? 'Modifier la facture' : 'Nouvelle facture';
    document.getElementById('f-del-btn').style.display = id ? 'block' : 'none';
    ClientsModule.fillSelect('f-client', null);
    if (id) {
      const f = _factures.find(x => x.id === id);
      if (!f) return;
      ClientsModule.fillSelect('f-client', f.client_id);
      sv('f-montant', f.montant); sv('f-ech', f.date_echeance || ''); sv('f-st', f.statut);
    } else {
      sv('f-montant', ''); sv('f-ech', today); sv('f-st', 'en_attente');
    }
    document.getElementById('ov-facture').classList.add('open');
  }

  function openFromIntervention(intervention) {
    switchTab('facturation');
    setTimeout(() => {
      _editId = null;
      ClientsModule.fillSelect('f-client', intervention.client_id);
      sv('f-montant', ''); sv('f-ech', today); sv('f-st', 'en_attente');
      document.getElementById('facture-modal-title').textContent = 'Nouvelle facture';
      document.getElementById('f-del-btn').style.display = 'none';
      document.getElementById('ov-facture').classList.add('open');
    }, 80);
  }

  async function save() {
    if (!gv('f-client')) return toast('Sélectionner un client', true);
    if (!gv('f-montant')) return toast('Montant obligatoire', true);
    const payload = {
      client_id: gv('f-client'),
      montant: parseFloat(gv('f-montant')),
      statut: gv('f-st'),
      date_echeance: gv('f-ech') || null,
    };
    try {
      if (_editId) { await api.facturation.update(_editId, payload); toast('Facture mise à jour'); }
      else { await api.facturation.create(payload); toast('Facture créée'); }
      closeOv('facture');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  async function del() {
    if (!confirm('Supprimer cette facture ?')) return;
    try {
      await api.facturation.delete(_editId);
      closeOv('facture');
      toast('Facture supprimée');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  return { load, render, open, openFromIntervention, save, del };
})();
