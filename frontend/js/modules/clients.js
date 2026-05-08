App.clients = (() => {
  let clients = [];
  let editId = null;
  let chantiers = [];

  async function refresh() {
    clients = await API.clients.list();
    render();
  }

  function render() {
    const q = (document.getElementById('fq-clients') || { value: '' }).value.toLowerCase();
    const st = (document.getElementById('fs-clients') || { value: '' }).value;
    const list = clients.filter(c => {
      const match = ((c.nom || '') + ' ' + (c.prenom || '') + ' ' + (c.ent || '')).toLowerCase().includes(q);
      return match && (!st || c.statut === st);
    });
    const tb = document.getElementById('tb-clients');
    tb.innerHTML = list.length ? list.map(c => {
      const telLink = c.tel ? `<a href="tel:${c.tel}" class="contact-link" onclick="event.stopPropagation()">${c.tel}</a>` : '—';
      return `<tr onclick="App.clients.open(${c.id})">
        <td><strong>${c.nom}</strong></td>
        <td>${c.prenom || '—'}</td>
        <td>${c.ent || '—'}</td>
        <td>${telLink}</td>
        <td>${App.bC(c.statut)}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" class="empty-state">Aucun résultat</td></tr>';

    document.getElementById('s-ct').textContent = clients.length;
    document.getElementById('s-ca').textContent = clients.filter(c => c.statut === 'actif').length;
    document.getElementById('s-cp').textContent = clients.filter(c => c.statut === 'prospect').length;
  }

  async function open(id) {
    editId = id || null;
    chantiers = [];
    document.getElementById('client-modal-title').textContent = id ? 'Modifier le client' : 'Nouveau client';
    document.getElementById('c-del-btn').style.display = id ? 'block' : 'none';

    if (id) {
      const c = clients.find(x => x.id === id);
      if (!c) return;
      App.sv('c-nom', c.nom); App.sv('c-prenom', c.prenom); App.sv('c-ent', c.ent);
      App.sv('c-tel', c.tel); App.sv('c-email', c.email); App.sv('c-st', c.statut);
      App.sv('c-fact-rue', c.fact_rue); App.sv('c-fact-ville', c.fact_ville); App.sv('c-fact-pays', c.fact_pays || 'UAE');
      chantiers = (c.chantiers || []).map(ch => ({ ...ch }));
    } else {
      ['c-nom','c-prenom','c-ent','c-tel','c-email'].forEach(i => App.sv(i, ''));
      App.sv('c-st', 'prospect');
      ['c-fact-rue','c-fact-ville'].forEach(i => App.sv(i, ''));
      App.sv('c-fact-pays', 'UAE');
    }
    renderChantiers();
    App.openOv('client');
  }

  function renderChantiers() {
    const el = document.getElementById('chantiers-list');
    el.innerHTML = '';
    chantiers.forEach((ch, i) => {
      const div = document.createElement('div');
      div.className = 'chantier-block';
      div.innerHTML = `
        <div class="ch-title">Chantier ${i + 1}</div>
        <button class="rm-ch" onclick="App.clients.removeChantier(${i})">×</button>
        <div class="form-row"><label>Nom / Description</label>
          <input value="${ch.nom || ''}" oninput="App.clients._chantiers()[${i}].nom=this.value" placeholder="Villa Marina 12"></div>
        <div class="form-row"><label>Adresse du chantier</label>
          <input value="${ch.adresse || ''}" oninput="App.clients._chantiers()[${i}].adresse=this.value" placeholder="Villa 12, Al Barsha 2, Dubai"></div>
        <div class="msec" style="margin-top:10px;">Contact sur place</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-row"><label>Nom</label>
            <input value="${ch.c_nom || ''}" oninput="App.clients._chantiers()[${i}].c_nom=this.value" placeholder="Nom"></div>
          <div class="form-row"><label>Prénom</label>
            <input value="${ch.c_prenom || ''}" oninput="App.clients._chantiers()[${i}].c_prenom=this.value" placeholder="Prénom"></div>
        </div>
        <div class="form-row"><label>Téléphone contact</label>
          <input value="${ch.c_tel || ''}" oninput="App.clients._chantiers()[${i}].c_tel=this.value" placeholder="+971 50 000 0000" type="tel"></div>`;
      el.appendChild(div);
    });
  }

  function _chantiers() { return chantiers; }
  function addChantier() { chantiers.push({ nom: '', adresse: '', c_nom: '', c_prenom: '', c_tel: '' }); renderChantiers(); }
  function removeChantier(i) { chantiers.splice(i, 1); renderChantiers(); }

  async function save() {
    if (!App.gv('c-nom')) return alert('Nom obligatoire');
    const data = {
      nom: App.gv('c-nom'), prenom: App.gv('c-prenom'), ent: App.gv('c-ent'),
      tel: App.gv('c-tel'), email: App.gv('c-email'), statut: App.gv('c-st'),
      fact_rue: App.gv('c-fact-rue'), fact_ville: App.gv('c-fact-ville'), fact_pays: App.gv('c-fact-pays'),
      chantiers: chantiers.map(ch => ({
        nom: ch.nom || '', adresse: ch.adresse || '',
        c_nom: ch.c_nom || '', c_prenom: ch.c_prenom || '', c_tel: ch.c_tel || ''
      }))
    };
    try {
      if (editId) {
        await API.clients.update(editId, data);
      } else {
        await API.clients.create(data);
      }
      App.closeOv('client');
      await refresh();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  async function del() {
    if (!confirm('Supprimer ce client ?')) return;
    try {
      await API.clients.delete(editId);
      App.closeOv('client');
      await refresh();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  function fillSelect(selId, currentId) {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Sélectionner --</option>';
    clients.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = (c.nom || '') + (c.prenom ? ' ' + c.prenom : '') + (c.ent ? ' — ' + c.ent : '');
      if (String(c.id) === String(currentId)) o.selected = true;
      sel.appendChild(o);
    });
  }

  return { refresh, render, open, save, del, addChantier, removeChantier, renderChantiers, fillSelect, _chantiers, list: () => clients };
})();
