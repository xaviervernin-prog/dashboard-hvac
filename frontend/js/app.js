const App = {
  today: new Date().toISOString().split('T')[0],
  currentTab: 'agenda',
  notifOpen: false,
  TABS: ['agenda', 'clients', 'articles', 'devis', 'facturation'],

  // ── Helpers ──────────────────────────────────────────────
  fmt(n) { return Number(n).toLocaleString('fr-FR'); },
  fmtDate(s) { if (!s) return ''; const p = s.split('-'); return p[2] + '/' + p[1]; },
  daysBetween(s1, s2) { return Math.floor((new Date(s2) - new Date(s1)) / 86400000); },
  sv(id, v) { const el = document.getElementById(id); if (el) el.value = (v ?? ''); },
  gv(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; },

  bC(s) {
    const m = { actif: 'gr', prospect: 'ye', inactif: 'gy' };
    const l = { actif: 'Actif', prospect: 'Prospect', inactif: 'Inactif' };
    return `<span class="badge ${m[s] || 'gy'}">${l[s] || s}</span>`;
  },
  bD(s) {
    const m = { en_attente: 'ye', accepte: 'gr', refuse: 're' };
    const l = { en_attente: 'En attente', accepte: 'Accepté', refuse: 'Refusé' };
    return `<span class="badge ${m[s] || 'gy'}">${l[s] || s}</span>`;
  },
  bI(s) {
    const m = { planifiee: 'bg', 'en-cours': 'ye', terminee: 'gr', annulee: 'gy' };
    const l = { planifiee: 'Planifiée', 'en-cours': 'En cours', terminee: 'Terminée', annulee: 'Annulée' };
    return `<span class="badge ${m[s] || 'gy'}">${l[s] || s}</span>`;
  },
  bF(s) {
    const m = { en_attente: 'bg', payee: 'gr', retard: 're' };
    const l = { en_attente: 'En attente', payee: 'Payée', retard: 'En retard' };
    return `<span class="badge ${m[s] || 'gy'}">${l[s] || s}</span>`;
  },
  bSt(q) {
    if (q <= 0) return `<span class="badge re">${q}</span>`;
    if (q <= 5) return `<span class="badge ye">${q}</span>`;
    return `<strong style="color:var(--green)">${q}</strong>`;
  },

  // ── Overlay management ───────────────────────────────────
  openOv(name) { document.getElementById('ov-' + name)?.classList.add('open'); },
  closeOv(name) { document.getElementById('ov-' + name)?.classList.remove('open'); },

  // ── Tab navigation ───────────────────────────────────────
  async switchTab(name) {
    if (!document.getElementById('tab-' + name)) {
      await App.loadPage(name);
    }
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach((b, i) => b.classList.toggle('active', App.TABS[i] === name));
    document.querySelectorAll('.bottom-nav button').forEach((b, i) => b.classList.toggle('active', App.TABS[i] === name));
    App.currentTab = name;
    const mod = App[name];
    if (mod?.refresh) await mod.refresh();
  },

  async loadPage(name) {
    const res = await fetch(`/pages/${name}.html`);
    const html = await res.text();
    const div = document.createElement('div');
    div.id = 'tab-' + name;
    div.className = 'tab-panel';
    div.innerHTML = html;
    document.getElementById('main-content').appendChild(div);
  },

  // ── Notifications ─────────────────────────────────────────
  async updateBell() {
    try {
      const [devisList, factures, interventions, profil] = await Promise.all([
        API.devis.list(), API.factures.list(), API.interventions.list(), API.profil.get()
      ]);
      const notifs = App._computeNotifs(devisList, factures, interventions, profil);
      const badge = document.getElementById('bell-badge');
      if (notifs.length) {
        badge.textContent = notifs.length > 9 ? '9+' : String(notifs.length);
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
      if (App.notifOpen) App._renderNotifPanel(notifs);
    } catch (e) { /* ignore */ }
  },

  _computeNotifs(devisList, factures, interventions, profil) {
    const notifs = [];
    devisList.filter(d => d.statut === 'en_attente').forEach(d => {
      if (d.date && App.daysBetween(d.date, App.today) > 7)
        notifs.push({ type: 'urgent', msg: `Devis ${d.num} en attente depuis ${App.daysBetween(d.date, App.today)} j`, tab: 'devis' });
    });
    factures.forEach(f => {
      if (f.statut === 'retard' || (f.statut === 'en_attente' && f.echeance && f.echeance < App.today)) {
        const days = f.echeance ? App.daysBetween(f.echeance, App.today) : 0;
        notifs.push({ type: 'urgent', msg: `Facture ${f.num} impayée${days > 0 ? ' — J+' + days : ''}`, tab: 'facturation' });
      }
    });
    interventions.filter(iv => iv.date === App.today && iv.statut === 'planifiee').forEach(iv => {
      notifs.push({ type: 'info', msg: `Intervention ${iv.client_nom} à ${iv.hd}`, tab: 'agenda' });
    });
    if (profil.permis_exp) {
      const d = App.daysBetween(App.today, profil.permis_exp);
      if (d < 0) notifs.push({ type: 'urgent', msg: '⚠️ Permis de conduire expiré !', tab: null });
      else if (d <= 30) notifs.push({ type: 'warning', msg: `Permis expire dans ${d} jours`, tab: null });
    }
    return notifs;
  },

  _renderNotifPanel(notifs) {
    const list = document.getElementById('notif-list');
    if (!notifs.length) {
      list.innerHTML = '<div class="notif-empty">Aucune notification 🎉<br><span style="font-size:11px">Tout est à jour</span></div>';
      return;
    }
    list.innerHTML = notifs.map(n =>
      `<div class="notif-item" onclick="App._notifClick('${n.tab}')">
        <span class="notif-dot ${n.type}"></span>
        <span class="notif-msg">${n.msg}</span>
      </div>`
    ).join('');
  },

  _notifClick(tab) {
    if (tab) App.switchTab(tab);
    App.toggleNotif(null);
  },

  toggleNotif(e) {
    if (e) e.stopPropagation();
    App.notifOpen = !App.notifOpen;
    const panel = document.getElementById('notif-panel');
    panel.style.display = App.notifOpen ? 'block' : 'none';
    if (App.notifOpen) App.updateBell();
  },

  // ── Profile ──────────────────────────────────────────────
  async renderAvatar() {
    try {
      const p = await API.profil.get();
      const btn = document.getElementById('avatar-btn');
      if (p.photo_b64) {
        btn.innerHTML = `<img src="${p.photo_b64}" alt="profil">`;
      } else {
        const initials = ((p.nom || '').charAt(0) + (p.prenom || '').charAt(0)).toUpperCase() || '?';
        btn.innerHTML = `<span>${initials}</span>`;
      }
    } catch (e) { /* ignore */ }
  },

  async openProfile() {
    try {
      const p = await API.profil.get();
      App.sv('p-nom', p.nom); App.sv('p-prenom', p.prenom); App.sv('p-tel', p.tel);
      App.sv('p-permis', p.permis); App.sv('p-permisExp', p.permis_exp); App.sv('p-vehicle', p.vehicle);
      const large = document.getElementById('profile-avatar-large');
      if (p.photo_b64) {
        large.innerHTML = `<img src="${p.photo_b64}" alt="profil">`;
      } else {
        const initials = ((p.nom || '').charAt(0) + (p.prenom || '').charAt(0)).toUpperCase() || '?';
        large.innerHTML = `<span>${initials}</span>`;
      }
      App._checkPermisAlert();
      App.openOv('profile');
    } catch (e) { alert('Erreur chargement profil'); }
  },

  async saveProfile() {
    try {
      const large = document.getElementById('profile-avatar-large');
      const img = large?.querySelector('img');
      await API.profil.update({
        nom: App.gv('p-nom'), prenom: App.gv('p-prenom'), tel: App.gv('p-tel'),
        permis: App.gv('p-permis'), permis_exp: App.gv('p-permisExp'), vehicle: App.gv('p-vehicle'),
        photo_b64: img ? img.src : ''
      });
      App.closeOv('profile');
      App.renderAvatar();
      App.updateBell();
    } catch (e) { alert('Erreur: ' + e.message); }
  },

  handlePhotoUpload(input) {
    if (!input.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const large = document.getElementById('profile-avatar-large');
      if (large) large.innerHTML = `<img src="${e.target.result}" alt="profil">`;
    };
    reader.readAsDataURL(input.files[0]);
  },

  _checkPermisAlert() {
    const alertDiv = document.getElementById('p-permis-alert');
    if (!alertDiv) return;
    const exp = App.gv('p-permisExp');
    if (!exp) { alertDiv.innerHTML = ''; return; }
    const days = App.daysBetween(App.today, exp);
    if (days < 0) alertDiv.innerHTML = `<div class="permis-expired">⚠️ Permis expiré depuis ${Math.abs(days)} jours !</div>`;
    else if (days <= 30) alertDiv.innerHTML = `<div class="permis-warn">⚠️ Expire dans ${days} jours</div>`;
    else alertDiv.innerHTML = '';
  },

  // ── Filter toggle ─────────────────────────────────────────
  toggleFilters(name) {
    const fb = document.getElementById('fb-' + name);
    if (!fb) return;
    fb.style.display = fb.style.display !== 'none' ? 'none' : 'flex';
  },
  updateFilterBtn(name) {
    const btn = document.getElementById('ft-' + name);
    if (!btn) return;
    const q = (document.getElementById('fq-' + name) || { value: '' }).value;
    const st = (document.getElementById('fs-' + name) || { value: '' }).value;
    btn.classList.toggle('has-active', !!(q || st));
  },

  // ── Init ──────────────────────────────────────────────────
  async init() {
    // Date in topbar
    document.getElementById('hDate').textContent =
      new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Close notif panel on outside click
    document.addEventListener('click', () => {
      if (App.notifOpen) {
        App.notifOpen = false;
        document.getElementById('notif-panel').style.display = 'none';
      }
    });

    // Close overlays on backdrop click
    document.querySelectorAll('.overlay, .det-overlay').forEach(el => {
      el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
    });

    await App.renderAvatar();
    await App.switchTab('agenda');
    await App.updateBell();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
