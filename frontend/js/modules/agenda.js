App.agenda = (() => {
  let interventions = [];
  let calDate = new Date();
  calDate.setDate(1);
  let editIntervId = null;

  function fmt(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

  async function refresh() {
    interventions = await API.interventions.list();
    renderTodayPlan();
    renderCal();
  }

  function renderTodayPlan() {
    const today = App.today;
    const todayList = interventions.filter(iv => iv.date === today).sort((a, b) => a.hd.localeCompare(b.hd));
    const plan = document.getElementById('today-plan');
    const items = document.getElementById('today-items');
    if (!plan || !items) return;
    if (!todayList.length) { plan.style.display = 'none'; return; }
    plan.style.display = 'block';
    document.getElementById('tph-date').textContent =
      new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    items.innerHTML = todayList.map(iv =>
      `<div class="today-item" onclick="App.agenda.showDetail(${iv.id})">
        <span class="ti-time">${iv.hd}–${iv.hf}</span>
        <div class="ti-info">
          <div class="ti-client">${iv.client_nom}</div>
          ${iv.lieu ? `<div class="ti-lieu">📍 ${iv.lieu}</div>` : ''}
        </div>
        <span class="ti-badge">${App.bI(iv.statut)}</span>
      </div>`
    ).join('');
  }

  function renderCal() {
    const yr = calDate.getFullYear(), mo = calDate.getMonth();
    const label = document.getElementById('cal-label');
    if (label) {
      try {
        label.textContent = new Date(yr, mo, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
          .replace(/^\w/, c => c.toUpperCase());
      } catch (e) {
        const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        label.textContent = months[mo] + ' ' + yr;
      }
    }
    const grid = document.getElementById('cal-days');
    if (!grid) return;
    grid.innerHTML = '';
    const firstDay = new Date(yr, mo, 1);
    const lastDay = new Date(yr, mo + 1, 0);
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7;
    startDow--;
    const todayStr = App.today;
    const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(yr, mo, 1 + (i - startDow));
      const ds = d.toISOString().split('T')[0];
      const isThisMonth = d.getMonth() === mo;
      const isToday = ds === todayStr;

      const cell = document.createElement('div');
      cell.className = 'cal-day' + (!isThisMonth ? ' other-month' : '') + (isToday ? ' is-today' : '');

      const dn = document.createElement('div');
      dn.className = 'dn';
      dn.textContent = d.getDate();
      cell.appendChild(dn);

      const dayIntervs = interventions.filter(iv => iv.date === ds).sort((a, b) => a.hd.localeCompare(b.hd));
      const maxPills = window.innerWidth <= 700 ? 2 : 3;
      const pillsEl = document.createElement('div');
      pillsEl.className = 'cal-pills';
      dayIntervs.slice(0, maxPills).forEach(iv => {
        const p = document.createElement('div');
        p.className = `cal-pill pill-${iv.statut}`;
        p.textContent = iv.hd + ' ' + iv.client_nom;
        p.onclick = (e) => { e.stopPropagation(); App.agenda.showDetail(iv.id); };
        pillsEl.appendChild(p);
      });
      if (dayIntervs.length > maxPills) {
        const more = document.createElement('div');
        more.className = 'cal-more';
        more.textContent = `+${dayIntervs.length - maxPills} autres`;
        pillsEl.appendChild(more);
      }
      cell.appendChild(pillsEl);
      if (isThisMonth) cell.addEventListener('click', () => openInterv(ds));
      grid.appendChild(cell);
    }
  }

  function changeMonth(n) {
    calDate = new Date(calDate.getFullYear(), calDate.getMonth() + n, 1);
    renderCal();
  }

  function goToday() {
    calDate = new Date(); calDate.setDate(1);
    renderCal();
  }

  async function openInterv(date) {
    const devisList = await API.devis.list();
    const accepted = devisList.filter(d => d.statut === 'accepte');
    const sel = document.getElementById('i-devis');
    sel.innerHTML = '<option value="">-- Devis accepté --</option>';
    accepted.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id;
      o.textContent = `${d.num} — ${d.client_nom} (${App.fmt(d.montant)} AED)`;
      sel.appendChild(o);
    });
    App.sv('i-devis', '');
    App.sv('i-date', date || App.today);
    App.sv('i-hd', '08:00');
    App.sv('i-hf', '10:00');
    App.sv('i-tech', '');
    App.sv('i-lieu', '');
    App.sv('i-notes', '');
    document.getElementById('i-info').style.display = 'none';
    editIntervId = null;
    App.openOv('intervention');
  }

  async function onDevisChange() {
    const did = App.gv('i-devis');
    const info = document.getElementById('i-info');
    if (!did) { info.style.display = 'none'; return; }
    try {
      const devisList = await API.devis.list();
      const d = devisList.find(x => String(x.id) === String(did));
      if (!d) { info.style.display = 'none'; return; }
      const clients = await API.clients.list();
      const c = clients.find(x => x.id === d.client_id);
      info.style.display = 'block';
      info.innerHTML = `<strong>${d.client_nom}</strong> | <code>${d.num}</code> | ${App.fmt(d.montant)} AED
        <br><span style="color:#3b82f6;font-size:12px;">📋 ${d.objet || 'Sans objet'}</span>
        ${c ? `<br>📞 ${c.tel ? `<a href="tel:${c.tel}" class="contact-link">${c.tel}</a>` : '—'} ✉️ ${c.email ? `<a href="mailto:${c.email}" class="contact-link">${c.email}</a>` : '—'}` : ''}`;
      if (c?.chantiers?.length) App.sv('i-lieu', c.chantiers[0].adresse);
    } catch (e) { /* ignore */ }
  }

  async function saveInterv() {
    const did = App.gv('i-devis');
    if (!did) return alert('Sélectionner un devis accepté');
    if (!App.gv('i-date')) return alert('Date obligatoire');
    try {
      const data = {
        devis_id: parseInt(did), date: App.gv('i-date'),
        hd: App.gv('i-hd'), hf: App.gv('i-hf'),
        lieu: App.gv('i-lieu'), tech: App.gv('i-tech'),
        notes: App.gv('i-notes'), statut: 'planifiee'
      };
      if (editIntervId) {
        await API.interventions.update(editIntervId, data);
      } else {
        await API.interventions.create(data);
      }
      App.closeOv('intervention');
      await refresh();
      App.updateBell();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  function showDetail(id) {
    const iv = interventions.find(x => x.id === id);
    if (!iv) return;
    editIntervId = id;
    document.getElementById('det-badge').innerHTML = App.bI(iv.statut);
    document.getElementById('det-num').textContent = iv.devis_num || '';
    document.getElementById('det-title').textContent = iv.client_nom;
    document.getElementById('det-rows').innerHTML = `
      <div class="det-row"><span class="det-ic">📋</span><div class="det-v"><div class="det-lbl">Objet</div>${iv.objet || '—'}</div></div>
      <div class="det-row"><span class="det-ic">📅</span><div class="det-v"><div class="det-lbl">Créneau</div>${iv.date} ${iv.hd}–${iv.hf}</div></div>
      <div class="det-row"><span class="det-ic">📍</span><div class="det-v"><div class="det-lbl">Lieu</div>${iv.lieu || 'Non précisé'}</div></div>
      <div class="det-row"><span class="det-ic">👷</span><div class="det-v"><div class="det-lbl">Technicien</div>${iv.tech || 'Non assigné'}</div></div>
      ${iv.client_tel ? `<div class="det-row"><span class="det-ic">📞</span><div class="det-v"><div class="det-lbl">Téléphone</div><a href="tel:${iv.client_tel}" class="contact-link" onclick="event.stopPropagation()">${iv.client_tel}</a></div></div>` : ''}
      ${iv.client_email ? `<div class="det-row"><span class="det-ic">✉️</span><div class="det-v"><div class="det-lbl">Email</div><a href="mailto:${iv.client_email}" class="contact-link" onclick="event.stopPropagation()">${iv.client_email}</a></div></div>` : ''}
      <div class="det-row"><span class="det-ic">💰</span><div class="det-v"><div class="det-lbl">Montant</div>${App.fmt(iv.montant)} AED</div></div>
      ${iv.notes ? `<div class="det-row"><span class="det-ic">📝</span><div class="det-v"><div class="det-lbl">Notes</div>${iv.notes}</div></div>` : ''}
    `;

    const acts = document.getElementById('det-acts');
    acts.innerHTML = '';
    const notDone = iv.statut !== 'terminee' && iv.statut !== 'annulee';

    const delB = document.createElement('button');
    delB.className = 'da-del';
    delB.textContent = '🗑';
    delB.onclick = async () => {
      if (!confirm('Supprimer ?')) return;
      await API.interventions.delete(id);
      closeDetail();
      await refresh();
      App.updateBell();
    };
    acts.appendChild(delB);

    if (notDone) {
      const rB = document.createElement('button');
      rB.className = 'da-reprog';
      rB.textContent = '📅 Reprogrammer';
      rB.onclick = () => {
        closeDetail();
        App.sv('r-date', iv.date); App.sv('r-hd', iv.hd); App.sv('r-hf', iv.hf);
        App.openOv('reprog');
      };
      acts.appendChild(rB);

      const cB = document.createElement('button');
      cB.className = 'da-clot';
      cB.textContent = '✅ Clôturer → Facturer';
      cB.onclick = async () => {
        closeDetail();
        await API.interventions.statut(id, 'terminee');
        await refresh();
        App.updateBell();
        App.factures.openFromInterv(iv);
      };
      acts.appendChild(cB);
    } else if (iv.statut === 'terminee') {
      const fB = document.createElement('button');
      fB.className = 'da-clot';
      fB.style.background = 'var(--blue)';
      fB.textContent = '📄 Créer facture';
      fB.onclick = () => { closeDetail(); App.factures.openFromInterv(iv); };
      acts.appendChild(fB);
    }
    document.getElementById('det-overlay').classList.add('open');
  }

  function closeDetail() {
    document.getElementById('det-overlay').classList.remove('open');
  }

  async function saveReprog() {
    if (!editIntervId) return;
    try {
      const iv = interventions.find(x => x.id === editIntervId);
      if (!iv) return;
      await API.interventions.update(editIntervId, {
        ...iv, date: App.gv('r-date'), hd: App.gv('r-hd'), hf: App.gv('r-hf')
      });
      App.closeOv('reprog');
      await refresh();
    } catch (e) { alert('Erreur: ' + e.message); }
  }

  async function planifierDevis(devisId) {
    await App.switchTab('agenda');
    setTimeout(async () => {
      await openInterv(App.today);
      App.sv('i-devis', String(devisId));
      await onDevisChange();
    }, 80);
  }

  return { refresh, changeMonth, goToday, openInterv, onDevisChange, saveInterv, showDetail, closeDetail, saveReprog, planifierDevis };
})();
