let interventionsData = [];
let clientsForInterv = [];
let currentCalMonth = new Date();

async function loadInterventions(forceReload = true) {
  const panel = document.getElementById('tab-agenda');
  if (!forceReload && interventionsData.length) { renderAgenda(); return; }

  panel.innerHTML = `
    <h2 class="page-title">Agenda & Interventions</h2>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn-p" id="view-cal" onclick="setAgendaView('cal')">📅 Calendrier</button>
      <button class="btn-p gray" id="view-list" onclick="setAgendaView('list')">📋 Liste</button>
      ${hasRole('administrateur','commercial') ? '<button class="btn-p" style="margin-left:auto" onclick="openIntervForm()">+ Nouvelle intervention</button>' : ''}
    </div>
    <div id="agenda-cal"></div>
    <div id="agenda-list" style="display:none"></div>
    <div id="interv-modal" class="modal"></div>
    <div id="rapport-modal" class="modal"></div>`;

  try {
    [interventionsData, clientsForInterv] = await Promise.all([
      api.get('/interventions'),
      api.get('/clients')
    ]);
    renderCalendar();
  } catch (err) {
    panel.innerHTML += `<div class="alert error">${escapeHtml(err.message)}</div>`;
  }
}

let agendaView = 'cal';
function setAgendaView(v) {
  agendaView = v;
  document.getElementById('view-cal').className = v === 'cal' ? 'btn-p' : 'btn-p gray';
  document.getElementById('view-list').className = v === 'list' ? 'btn-p' : 'btn-p gray';
  document.getElementById('agenda-cal').style.display = v === 'cal' ? '' : 'none';
  document.getElementById('agenda-list').style.display = v === 'list' ? '' : 'none';
  if (v === 'cal') renderCalendar();
  else renderIntervList();
}

function renderCalendar() {
  const cal = document.getElementById('agenda-cal');
  if (!cal) return;
  const year = currentCalMonth.getFullYear();
  const month = currentCalMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const monthName = currentCalMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Index interventions by date
  const byDate = {};
  interventionsData.forEach(i => {
    const d = i.date_intervention?.slice(0, 10);
    if (!d) return;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(i);
  });

  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  let cells = '';
  const startOffset = firstDay;
  for (let i = 0; i < startOffset; i++) cells += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === today;
    const items = byDate[dateStr] || [];
    cells += `
      <div style="min-height:70px;border:1px solid var(--border);border-radius:6px;padding:6px;background:${isToday?'var(--blue-l)':'#fff'};cursor:pointer"
           onclick="openDayView('${dateStr}')">
        <div style="font-size:12px;font-weight:${isToday?'800':'600'};color:${isToday?'var(--blue)':'var(--text)'};margin-bottom:4px">${d}</div>
        ${items.slice(0,2).map(i => `
          <div style="font-size:10px;padding:2px 5px;border-radius:3px;margin-bottom:2px;background:${i.statut==='terminee'?'var(--green-l)':i.statut==='annulee'?'var(--red-l)':'var(--blue-l)'};color:${i.statut==='terminee'?'var(--green)':i.statut==='annulee'?'var(--red)':'var(--blue)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${i.heure_debut ? i.heure_debut.slice(0,5)+' ' : ''}${escapeHtml(i.client_nom||'')}
          </div>`).join('')}
        ${items.length > 2 ? `<div style="font-size:10px;color:var(--muted)">+${items.length-2}</div>` : ''}
      </div>`;
  }

  cal.innerHTML = `
    <div class="table-card">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border)">
        <button class="act" onclick="prevMonth()">‹ Précédent</button>
        <strong style="text-transform:capitalize">${monthName}</strong>
        <button class="act" onclick="nextMonth()">Suivant ›</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border);padding:1px">
        ${days.map(d=>`<div style="padding:6px;text-align:center;font-size:10px;font-weight:700;color:var(--muted);background:var(--gray-l)">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;
}

function prevMonth() { currentCalMonth.setMonth(currentCalMonth.getMonth()-1); renderCalendar(); }
function nextMonth() { currentCalMonth.setMonth(currentCalMonth.getMonth()+1); renderCalendar(); }

function openDayView(dateStr) {
  const items = interventionsData.filter(i => i.date_intervention?.slice(0,10) === dateStr);
  const modal = document.getElementById('interv-modal');
  const label = new Date(dateStr+'T12:00:00').toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long'});
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>📅 ${label}</h3>
      <button class="modal-close" onclick="closeModal('interv-modal')">×</button>
    </div>
    <div class="modal-body">
      ${hasRole('administrateur','commercial') ? `<button class="btn-p" style="margin-bottom:14px" onclick="openIntervForm(null,'${dateStr}')">+ Planifier intervention</button>` : ''}
      ${items.length ? items.map(i => `
        <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong>${escapeHtml(i.client_nom||'')} ${escapeHtml(i.client_prenom||'')}</strong>
            ${statutIntervention(i.statut)}
          </div>
          ${i.heure_debut ? `<div style="font-size:12px;color:var(--muted)">⏰ ${i.heure_debut.slice(0,5)}${i.heure_fin?' — '+i.heure_fin.slice(0,5):''}</div>` : ''}
          ${i.lieu ? `<div style="font-size:12px;color:var(--muted)">📍 ${escapeHtml(i.lieu)}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:8px">
            ${hasRole('administrateur','commercial') ? `<button class="act blue" onclick="openIntervForm(${i.id})">Modifier</button>` : ''}
            ${i.statut === 'planifiee' ? `<button class="act green" onclick="cloturerInterv(${i.id})">Clôturer</button>` : ''}
            <button class="act" onclick="openRapportForm(${i.id})">📝 Rapport</button>
            <button class="act blue" onclick="downloadRapportPDF(${i.id})">PDF</button>
          </div>
        </div>`).join('') : '<div class="empty"><p>Aucune intervention ce jour</p></div>'}
    </div>`;
  openModal('interv-modal');
}

function renderIntervList() {
  const list = document.getElementById('agenda-list');
  if (!list) return;

  const sorted = [...interventionsData].sort((a,b) => new Date(b.date_intervention) - new Date(a.date_intervention));

  list.innerHTML = `
    <div class="table-card">
      <div class="table-header">
        <h3>Toutes les interventions</h3>
        <div class="table-header-actions">
          <select id="interv-statut-filter" onchange="filterIntervList()" style="padding:7px;border:1.5px solid var(--border);border-radius:7px;font-size:12px">
            <option value="">Tous statuts</option>
            <option value="planifiee">Planifiées</option>
            <option value="terminee">Terminées</option>
            <option value="annulee">Annulées</option>
          </select>
        </div>
      </div>
      <div class="tscroll">
        <table>
          <thead><tr><th>Date</th><th>Client</th><th>Lieu</th><th>Horaire</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody id="interv-tbody">
            ${sorted.map(intervRow).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function filterIntervList() {
  const statut = document.getElementById('interv-statut-filter')?.value || '';
  const filtered = statut ? interventionsData.filter(i => i.statut === statut) : interventionsData;
  const tbody = document.getElementById('interv-tbody');
  if (tbody) tbody.innerHTML = filtered.sort((a,b) => new Date(b.date_intervention)-new Date(a.date_intervention)).map(intervRow).join('');
}

function intervRow(i) {
  return `
    <tr>
      <td>${fmtDate(i.date_intervention)}</td>
      <td><strong>${escapeHtml(i.client_nom||'')} ${escapeHtml(i.client_prenom||'')}</strong></td>
      <td>${escapeHtml(i.lieu||'—')}</td>
      <td>${i.heure_debut ? i.heure_debut.slice(0,5)+(i.heure_fin?' - '+i.heure_fin.slice(0,5):'') : '—'}</td>
      <td>${statutIntervention(i.statut)}</td>
      <td style="white-space:nowrap">
        ${hasRole('administrateur','commercial') ? `<button class="act blue" onclick="openIntervForm(${i.id})">Modifier</button>` : ''}
        ${i.statut === 'planifiee' ? `<button class="act green" onclick="cloturerInterv(${i.id})">Clôturer</button>` : ''}
        <button class="act" onclick="openRapportForm(${i.id})">Rapport</button>
        <button class="act blue" onclick="downloadRapportPDF(${i.id})">PDF</button>
      </td>
    </tr>`;
}

async function openIntervForm(id = null, defaultDate = null) {
  let i = {};
  if (id) i = await api.get(`/interventions/${id}`);

  const clientOptions = clientsForInterv.map(c =>
    `<option value="${c.id}" ${i.client_id==c.id?'selected':''}>${escapeHtml(c.entreprise||`${c.prenom||''} ${c.nom}`.trim())}</option>`
  ).join('');

  const modal = document.getElementById('interv-modal');
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>${id ? 'Modifier intervention' : 'Nouvelle intervention'}</h3>
      <button class="modal-close" onclick="closeModal('interv-modal')">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Client *</label>
        <select id="iv-client"><option value="">— Choisir —</option>${clientOptions}</select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Date *</label><input type="date" id="iv-date" value="${i.date_intervention?.slice(0,10)||defaultDate||new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group"><label>Lieu</label><input id="iv-lieu" value="${escapeHtml(i.lieu||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Heure début</label><input type="time" id="iv-hd" value="${i.heure_debut||''}"></div>
        <div class="form-group"><label>Heure fin</label><input type="time" id="iv-hf" value="${i.heure_fin||''}"></div>
      </div>
      <div class="form-group"><label>Description / notes</label><textarea id="iv-notes" rows="3">${escapeHtml(i.notes_avant||'')}</textarea></div>
      ${id ? `<div class="form-group"><label>Statut</label>
        <select id="iv-statut">
          <option value="planifiee" ${i.statut==='planifiee'?'selected':''}>Planifiée</option>
          <option value="en_cours" ${i.statut==='en_cours'?'selected':''}>En cours</option>
          <option value="terminee" ${i.statut==='terminee'?'selected':''}>Terminée</option>
          <option value="annulee" ${i.statut==='annulee'?'selected':''}>Annulée</option>
        </select>
      </div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('interv-modal')">Annuler</button>
      <button class="btn-p" onclick="saveInterv(${id||'null'})">💾 Enregistrer</button>
    </div>`;
  openModal('interv-modal');
}

async function saveInterv(id) {
  const body = {
    client_id: +document.getElementById('iv-client').value || null,
    date_intervention: document.getElementById('iv-date').value,
    lieu: document.getElementById('iv-lieu').value,
    heure_debut: document.getElementById('iv-hd').value || null,
    heure_fin: document.getElementById('iv-hf').value || null,
    notes_avant: document.getElementById('iv-notes').value,
    statut: document.getElementById('iv-statut')?.value
  };
  if (!body.client_id || !body.date_intervention) { showToast('Client et date requis','error'); return; }
  try {
    if (id) await api.put(`/interventions/${id}`, body);
    else await api.post('/interventions', body);
    showToast(id ? 'Intervention mise à jour' : 'Intervention créée','success');
    closeModal('interv-modal');
    const [data] = await Promise.all([api.get('/interventions')]);
    interventionsData = data;
    if (agendaView === 'cal') renderCalendar();
    else renderIntervList();
  } catch (err) { showToast(err.message,'error'); }
}

async function cloturerInterv(id) {
  if (!confirm('Clôturer cette intervention ?')) return;
  try {
    await api.post(`/interventions/${id}/cloturer`);
    showToast('Intervention clôturée','success');
    interventionsData = await api.get('/interventions');
    if (agendaView === 'cal') renderCalendar(); else renderIntervList();
  } catch (err) { showToast(err.message,'error'); }
}

function openRapportForm(id) {
  const interv = interventionsData.find(i => i.id === id) || {};
  const modal = document.getElementById('rapport-modal');
  modal.innerHTML = `
    <div class="modal-hd">
      <h3>Rapport d'intervention</h3>
      <button class="modal-close" onclick="closeModal('rapport-modal')">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label>Compte-rendu technique</label>
        <textarea id="rp-texte" rows="5" placeholder="Décrivez les travaux effectués…">${escapeHtml(interv.rapport_texte||'')}</textarea>
      </div>
      <div class="form-group">
        <label>Signature client</label>
        <div style="border:2px solid var(--border);border-radius:8px;margin-top:6px;background:#fff">
          <canvas id="sig-canvas" width="500" height="150" style="width:100%;display:block;cursor:crosshair;touch-action:none"></canvas>
        </div>
        <button class="act" style="margin-top:6px" onclick="clearSignature()">✕ Effacer</button>
        ${interv.signature_url ? `<div style="margin-top:8px;font-size:12px;color:var(--green)">✓ Signature existante enregistrée</div>` : ''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-p gray" onclick="closeModal('rapport-modal')">Annuler</button>
      <button class="btn-p" onclick="saveRapport(${id})">💾 Enregistrer le rapport</button>
    </div>`;
  openModal('rapport-modal');
  initSignaturePad();
}

function initSignaturePad() {
  const canvas = document.getElementById('sig-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  }

  canvas.addEventListener('mousedown', e => { drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
  canvas.addEventListener('mousemove', e => { if(!drawing) return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); });
  canvas.addEventListener('mouseup', () => drawing = false);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; const p=getPos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }, {passive:false});
  canvas.addEventListener('touchmove', e => { e.preventDefault(); if(!drawing) return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); }, {passive:false});
  canvas.addEventListener('touchend', () => drawing = false);
  ctx.strokeStyle = '#1a1d27'; ctx.lineWidth = 2; ctx.lineCap = 'round';
}

function clearSignature() {
  const canvas = document.getElementById('sig-canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

async function saveRapport(id) {
  const rapport_texte = document.getElementById('rp-texte').value;
  const canvas = document.getElementById('sig-canvas');
  const isEmpty = !canvas || isCanvasBlank(canvas);
  const signature_url = isEmpty ? null : canvas.toDataURL('image/png');

  try {
    await api.put(`/interventions/${id}/rapport`, { rapport_texte, signature_url });
    showToast('Rapport enregistré','success');
    closeModal('rapport-modal');
    interventionsData = await api.get('/interventions');
    if (agendaView === 'cal') renderCalendar(); else renderIntervList();
  } catch (err) { showToast(err.message,'error'); }
}

function isCanvasBlank(canvas) {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return !data.some(v => v !== 0);
}

async function downloadRapportPDF(id) {
  try {
    showToast('Génération du PDF…');
    const blob = await api.blob(`/interventions/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`rapport-intervention-${id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  } catch (err) { showToast(err.message,'error'); }
}
