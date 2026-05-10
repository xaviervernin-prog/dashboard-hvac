const ClientsModule = (() => {
  let _clients = [];
  let _editId = null;
  let _chantiers = [];

  async function load() {
    try {
      _clients = await api.clients.list();
      render();
    } catch (e) { toast('Erreur chargement clients : ' + e.message, true); }
  }

  function render() {
    const q = (document.getElementById('fq-clients') || { value: '' }).value.toLowerCase();
    const st = (document.getElementById('fs-clients') || { value: '' }).value;
    const list = _clients.filter(c => {
      const match = ((c.nom || '') + ' ' + (c.entreprise || '')).toLowerCase().includes(q);
      return match && (!st || c.statut === st);
    });
    const tb = document.getElementById('tb-clients');
    tb.innerHTML = list.length
      ? list.map(c => {
          const tel = c.telephone ? `<a href="tel:${c.telephone}" class="contact-link" onclick="event.stopPropagation()">${c.telephone}</a>` : '—';
          return `<tr onclick="ClientsModule.open('${c.id}')"><td><strong>${c.nom}</strong></td><td>${c.entreprise || '—'}</td><td>${tel}</td><td>${c.email || '—'}</td><td>${bC(c.statut)}</td></tr>`;
        }).join('')
      : '<tr><td colspan="5" class="empty-state">Aucun résultat</td></tr>';
    document.getElementById('s-ct').textContent = _clients.length;
    document.getElementById('s-ca').textContent = _clients.filter(c => c.statut === 'actif').length;
    document.getElementById('s-cp').textContent = _clients.filter(c => c.statut === 'prospect').length;
  }

  function open(id) {
    _editId = id || null;
    _chantiers = [];
    document.getElementById('client-modal-title').textContent = id ? 'Modifier le client' : 'Nouveau client';
    document.getElementById('c-del-btn').style.display = id ? 'block' : 'none';
    if (id) {
      const c = _clients.find(x => x.id === id);
      if (!c) return;
      sv('c-nom', c.nom); sv('c-entreprise', c.entreprise); sv('c-tel', c.telephone);
      sv('c-email', c.email); sv('c-st', c.statut); sv('c-fact', c.adresse_facturation);
      _chantiers = (c.chantiers || []).map(ch => ({ ...ch }));
    } else {
      ['c-nom', 'c-entreprise', 'c-tel', 'c-email', 'c-fact'].forEach(i => sv(i, ''));
      sv('c-st', 'prospect');
    }
    _renderChantiers();
    document.getElementById('ov-client').classList.add('open');
  }

  function _renderChantiers() {
    const el = document.getElementById('chantiers-list');
    el.innerHTML = _chantiers.map((ch, i) => `
      <div class="chantier-block">
        <div class="ch-title">Chantier ${i + 1}</div>
        <button class="rm-ch" onclick="ClientsModule._removeChantier(${i})">×</button>
        <div class="form-row"><label>Nom</label><input value="${ch.nom || ''}" oninput="ClientsModule._updateChantier(${i},'nom',this.value)" placeholder="Villa Marina 12"></div>
        <div class="form-row"><label>Adresse</label><input value="${ch.adresse || ''}" oninput="ClientsModule._updateChantier(${i},'adresse',this.value)" placeholder="Villa 12, Al Barsha 2, Dubai"></div>
      </div>`).join('');
  }

  function _updateChantier(i, key, val) { _chantiers[i][key] = val; }
  function _removeChantier(i) { _chantiers.splice(i, 1); _renderChantiers(); }
  function addChantier() { _chantiers.push({ nom: '', adresse: '' }); _renderChantiers(); }

  async function save() {
    if (!gv('c-nom')) return toast('Nom obligatoire', true);
    const payload = {
      nom: gv('c-nom'), entreprise: gv('c-entreprise') || null,
      telephone: gv('c-tel') || null, email: gv('c-email') || null,
      statut: gv('c-st'), adresse_facturation: gv('c-fact') || null,
      chantiers: _chantiers,
    };
    try {
      if (_editId) { await api.clients.update(_editId, payload); toast('Client mis à jour'); }
      else { await api.clients.create(payload); toast('Client créé'); }
      closeOv('client');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  async function del() {
    if (!confirm('Supprimer ce client ?')) return;
    try {
      await api.clients.delete(_editId);
      closeOv('client');
      toast('Client supprimé');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  function fillSelect(selId, curId) {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Sélectionner --</option>' +
      _clients.map(c => `<option value="${c.id}" ${c.id === curId ? 'selected' : ''}>${c.nom}${c.entreprise ? ' — ' + c.entreprise : ''}</option>`).join('');
  }

  return { load, render, open, save, del, addChantier, _updateChantier, _removeChantier, fillSelect, get clients() { return _clients; } };
})();
