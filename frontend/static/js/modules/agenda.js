const AgendaModule = (() => {
  let _interventions = [];
  let _calDate = new Date();
  let _editIntervId = null;
  _calDate.setDate(1);

  async function load() {
    try {
      _interventions = await api.agenda.list();
      renderCal();
      renderTodayPlan();
    } catch (e) { toast('Erreur chargement agenda : ' + e.message, true); }
  }

  // --- Calendrier ---
  function changeMonth(n) { _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() + n, 1); renderCal(); }
  function goToday() { _calDate = new Date(); _calDate.setDate(1); renderCal(); }

  function renderCal() {
    const yr = _calDate.getFullYear(), mo = _calDate.getMonth();
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    document.getElementById('cal-label').textContent = months[mo] + ' ' + yr;
    const firstDay = new Date(yr, mo, 1), lastDay = new Date(yr, mo + 1, 0);
    let startDow = firstDay.getDay(); if (startDow === 0) startDow = 7; startDow--;
    const todayStr = dStr(new Date());
    const grid = document.getElementById('cal-days');
    grid.innerHTML = '';
    const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(yr, mo, 1 + (i - startDow));
      const ds = dStr(d);
      const isThisMonth = d.getMonth() === mo;
      const isToday = ds === todayStr;
      const cell = document.createElement('div');
      cell.className = 'cal-day' + (!isThisMonth ? ' other-month' : '') + (isToday ? ' is-today' : '');
      const dnEl = document.createElement('div'); dnEl.className = 'dn'; dnEl.textContent = d.getDate();
      cell.appendChild(dnEl);
      const dayIntervs = _interventions.filter(iv => iv.date_debut && iv.date_debut.startsWith(ds)).sort((a, b) => a.date_debut.localeCompare(b.date_debut));
      const pills = document.createElement('div'); pills.className = 'cal-pills';
      const maxPills = window.innerWidth <= 700 ? 2 : 3;
      dayIntervs.slice(0, maxPills).forEach(iv => {
        const p = document.createElement('div');
        p.className = `cal-pill pill-${iv.statut}`;
        const cn = iv.clients ? iv.clients.nom : '?';
        const hd = iv.date_debut ? iv.date_debut.split('T')[1]?.slice(0, 5) : '';
        p.textContent = hd + ' ' + cn;
        p.onclick = (e) => { e.stopPropagation(); showDetail(iv.id); };
        pills.appendChild(p);
      });
      if (dayIntervs.length > maxPills) {
        const more = document.createElement('div'); more.className = 'cal-more';
        more.textContent = '+' + (dayIntervs.length - maxPills) + ' autres';
        pills.appendChild(more);
      }
      cell.appendChild(pills);
      cell.addEventListener('click', () => { if (isThisMonth) openInterv(ds); });
      grid.appendChild(cell);
    }
  }

  function renderTodayPlan() {
    const todayIntervs = _interventions.filter(iv => iv.date_debut && iv.date_debut.startsWith(today)).sort((a, b) => a.date_debut.localeCompare(b.date_debut));
    const plan = document.getElementById('today-plan');
    const items = document.getElementById('today-items');
    if (!todayIntervs.length) { plan.style.display = 'none'; return; }
    plan.style.display = 'block';
    items.innerHTML = todayIntervs.map(iv => {
      const cn = iv.clients ? iv.clients.nom : '?';
      const hd = iv.date_debut ? iv.date_debut.split('T')[1]?.slice(0, 5) : '';
      const hf = iv.date_fin ? iv.date_fin.split('T')[1]?.slice(0, 5) : '';
      return `<div class="today-item" onclick="AgendaModule.showDetail('${iv.id}')">
        <span class="ti-time">${hd}–${hf}</span>
        <div class="ti-info"><div class="ti-client">${cn}</div>${iv.lieu ? `<div class="ti-lieu">📍 ${iv.lieu}</div>` : ''}</div>
        <span class="ti-badge">${bI(iv.statut)}</span></div>`;
    }).join('');
  }

  // --- Intervention ---
  function openInterv(date) {
    DevisModule.fillAcceptedSelect('i-devis', null);
    sv('i-devis', ''); sv('i-date', date || today);
    sv('i-hd', '08:00'); sv('i-hf', '10:00');
    sv('i-tech', ''); sv('i-lieu', ''); sv('i-notes', '');
    document.getElementById('i-info').style.display = 'none';
    document.getElementById('ov-intervention').classList.add('open');
  }

  function openIntervWithDevis(devisId) {
    openInterv(today);
    DevisModule.fillAcceptedSelect('i-devis', devisId);
    sv('i-devis', devisId);
    onDevisChange();
  }

  function onDevisChange() {
    const did = gv('i-devis');
    const d = DevisModule.devis.find(x => x.id === did);
    const info = document.getElementById('i-info');
    if (!d) { info.style.display = 'none'; return; }
    const cn = d.clients ? d.clients.nom : '—';
    info.style.display = 'block';
    info.innerHTML = `<strong>${cn}</strong> | <code>${d.numero}</code> | ${fmt(d.montant_total)} AED<br><span style="color:#3b82f6;font-size:12px;">📋 ${d.objet || 'Sans objet'}</span>`;
  }

  async function saveInterv() {
    const did = gv('i-devis');
    if (!did) return toast('Sélectionner un devis accepté', true);
    if (!gv('i-date')) return toast('Date obligatoire', true);
    const d = DevisModule.devis.find(x => x.id === did);
    const date = gv('i-date');
    const hd = gv('i-hd') || '08:00';
    const hf = gv('i-hf') || '10:00';
    const payload = {
      devis_id: did,
      client_id: d ? d.client_id : null,
      date_debut: `${date}T${hd}:00`,
      date_fin: `${date}T${hf}:00`,
      techniciens: gv('i-tech') ? [gv('i-tech')] : [],
      lieu: gv('i-lieu') || null,
      notes: gv('i-notes') || null,
      statut: 'planifie',
    };
    try {
      await api.agenda.create(payload);
      closeOv('intervention');
      toast('Intervention planifiée');
      _calDate = new Date(date); _calDate.setDate(1);
      await load();
    } catch (e) { toast(e.message, true); }
  }

  async function saveReprog() {
    if (!_editIntervId) return;
    const date = gv('r-date'), hd = gv('r-hd'), hf = gv('r-hf');
    try {
      const iv = _interventions.find(x => x.id === _editIntervId);
      if (!iv) return;
      await api.agenda.update(_editIntervId, {
        ...iv, date_debut: `${date}T${hd}:00`, date_fin: `${date}T${hf}:00`,
      });
      closeOv('reprog');
      toast('Intervention reprogrammée');
      await load();
    } catch (e) { toast(e.message, true); }
  }

  function showDetail(id) {
    const iv = _interventions.find(x => x.id === id);
    if (!iv) return;
    _editIntervId = id;
    const cn = iv.clients ? iv.clients.nom : '?';
    const devisNum = iv.devis ? iv.devis.numero : '';
    const hd = iv.date_debut ? iv.date_debut.split('T')[1]?.slice(0, 5) : '';
    const hf = iv.date_fin ? iv.date_fin.split('T')[1]?.slice(0, 5) : '';
    const dateStr = iv.date_debut ? iv.date_debut.split('T')[0] : '';
    document.getElementById('det-badge').innerHTML = bI(iv.statut);
    document.getElementById('det-num').textContent = devisNum;
    document.getElementById('det-title').textContent = cn;
    document.getElementById('det-rows').innerHTML = `
      <div class="det-row"><span class="det-ic">📋</span><div class="det-v"><div class="det-lbl">Objet</div>${iv.devis ? iv.devis.objet : '—'}</div></div>
      <div class="det-row"><span class="det-ic">📅</span><div class="det-v"><div class="det-lbl">Créneau</div>${dateStr} ${hd}–${hf}</div></div>
      <div class="det-row"><span class="det-ic">📍</span><div class="det-v"><div class="det-lbl">Lieu</div>${iv.lieu || 'Non précisé'}</div></div>
      <div class="det-row"><span class="det-ic">👷</span><div class="det-v"><div class="det-lbl">Techniciens</div>${iv.techniciens && iv.techniciens.length ? iv.techniciens.join(', ') : 'Non assigné'}</div></div>
      ${iv.notes ? `<div class="det-row"><span class="det-ic">📝</span><div class="det-v"><div class="det-lbl">Notes</div>${iv.notes}</div></div>` : ''}`;
    const acts = document.getElementById('det-acts');
    acts.innerHTML = '';
    const notDone = iv.statut !== 'termine' && iv.statut !== 'annule';
    const delB = document.createElement('button'); delB.className = 'da-del'; delB.textContent = '🗑';
    delB.onclick = async () => {
      if (!confirm('Supprimer ?')) return;
      try { await api.agenda.delete(id); closeDetOverlay(); await load(); toast('Supprimée'); }
      catch (e) { toast(e.message, true); }
    };
    acts.appendChild(delB);
    if (notDone) {
      const rB = document.createElement('button'); rB.className = 'da-reprog'; rB.textContent = '📅 Reprogrammer';
      rB.onclick = () => { closeDetOverlay(); sv('r-date', dateStr); sv('r-hd', hd); sv('r-hf', hf); document.getElementById('ov-reprog').classList.add('open'); };
      acts.appendChild(rB);
      const cB = document.createElement('button'); cB.className = 'da-clot'; cB.textContent = '✅ Clôturer → Facturer';
      cB.onclick = async () => {
        try {
          await api.agenda.update(id, { ...iv, statut: 'termine' });
          closeDetOverlay(); await load();
          FacturationModule.openFromIntervention(iv);
        } catch (e) { toast(e.message, true); }
      };
      acts.appendChild(cB);
    }
    document.getElementById('det-overlay').classList.add('open');
  }

  function closeDetOverlay() { document.getElementById('det-overlay').classList.remove('open'); }

  return { load, changeMonth, goToday, openInterv, openIntervWithDevis, onDevisChange, saveInterv, saveReprog, showDetail, closeDetOverlay };
})();
