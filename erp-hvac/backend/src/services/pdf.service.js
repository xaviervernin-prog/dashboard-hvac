const puppeteer = require('puppeteer');
const { db } = require('../config/supabase');

async function getBrowser() {
  return puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
}

async function renderPdf(html) {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({ format: 'A4', printBackground: true, margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' } });
  } finally {
    await browser.close();
  }
}

const baseStyles = `
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1d27; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #2563eb; }
    .company h1 { font-size: 22px; font-weight: 800; color: #1a1d27; }
    .company p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-num { font-size: 20px; font-weight: 800; color: #2563eb; }
    .doc-date { font-size: 11px; color: #64748b; margin-top: 4px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .party-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; }
    .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #64748b; margin-bottom: 6px; }
    .party-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .party-detail { font-size: 12px; color: #475569; line-height: 1.5; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #64748b; margin-bottom: 8px; }
    .objet { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; font-weight: 600; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    thead th { background: #1e2235; color: #fff; padding: 9px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
    thead th:last-child { text-align: right; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tbody td:last-child { text-align: right; font-weight: 600; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .totals-box { width: 260px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
    .total-row.main { font-size: 15px; font-weight: 800; color: #2563eb; border-top: 2px solid #2563eb; border-bottom: none; padding-top: 8px; margin-top: 2px; }
    .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin-bottom: 20px; font-size: 12px; color: #475569; line-height: 1.6; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; }
    .badge-paid { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(22,163,74,.12); pointer-events: none; white-space: nowrap; }
  </style>`;

function fmtAED(n) { return `${Number(n||0).toFixed(2)} AED`; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'}) : '—'; }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function generateDevisPDF(devisId) {
  const { rows: [d] } = await db.query(
    `SELECT dv.*, c.nom, c.prenom, c.entreprise, c.email, c.tel, c.trn,
            c.fact_rue, c.fact_ville, c.fact_pays
     FROM devis dv JOIN clients c ON c.id = dv.client_id WHERE dv.id = $1`,
    [devisId]
  );
  if (!d) throw new Error('Devis introuvable');

  const { rows: lignes } = await db.query(
    'SELECT * FROM devis_lignes WHERE devis_id=$1 ORDER BY ordre',
    [devisId]
  );

  const clientNom = d.entreprise ? `${esc(d.entreprise)}<br><small>${esc(d.prenom||'')} ${esc(d.nom)}</small>` : `${esc(d.prenom||'')} ${esc(d.nom)}`;

  const lignesHtml = lignes.map(l => `
    <tr>
      <td>${esc(l.designation)}</td>
      <td style="text-align:center">${Number(l.quantite).toFixed(2)}</td>
      <td style="text-align:right">${fmtAED(l.prix_unitaire)}</td>
      <td style="text-align:center">${Number(l.tva_taux).toFixed(0)}%</td>
      <td>${fmtAED(Number(l.quantite)*Number(l.prix_unitaire))}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${baseStyles}</head><body>
    <div class="header">
      <div class="company"><h1>🔧 ERP Dubai</h1><p>Dépannage & Rénovation</p></div>
      <div class="doc-info">
        <div class="doc-num">DEVIS ${esc(d.numero)}</div>
        <div class="doc-date">Date : ${fmtDate(d.date_devis)}</div>
        ${d.date_validite ? `<div class="doc-date">Valable jusqu'au : ${fmtDate(d.date_validite)}</div>` : ''}
      </div>
    </div>
    <div class="parties">
      <div class="party-box">
        <div class="party-label">Émetteur</div>
        <div class="party-name">ERP Dubai — Dépannage & Rénovation</div>
        <div class="party-detail">Dubai, UAE</div>
      </div>
      <div class="party-box">
        <div class="party-label">Client</div>
        <div class="party-name">${clientNom}</div>
        <div class="party-detail">
          ${d.fact_rue ? esc(d.fact_rue)+'<br>' : ''}
          ${d.fact_ville ? esc(d.fact_ville)+', ' : ''}${esc(d.fact_pays||'UAE')}
          ${d.trn ? '<br>TRN : '+esc(d.trn) : ''}
          ${d.email ? '<br>'+esc(d.email) : ''}
          ${d.tel ? '<br>'+esc(d.tel) : ''}
        </div>
      </div>
    </div>
    ${d.objet ? `<div class="objet">Objet : ${esc(d.objet)}</div>` : ''}
    <div class="section-title">Détail des prestations</div>
    <table>
      <thead><tr><th>Désignation</th><th style="text-align:center">Qté</th><th style="text-align:right">P.U. HT</th><th style="text-align:center">TVA</th><th style="text-align:right">Total HT</th></tr></thead>
      <tbody>${lignesHtml}</tbody>
    </table>
    <div class="totals"><div class="totals-box">
      <div class="total-row"><span>Total HT</span><span>${fmtAED(d.montant_ht)}</span></div>
      <div class="total-row"><span>TVA (5%)</span><span>${fmtAED(d.montant_tva)}</span></div>
      <div class="total-row main"><span>Total TTC</span><span>${fmtAED(d.montant_ttc)}</span></div>
    </div></div>
    ${d.notes_client ? `<div class="section-title">Conditions & Notes</div><div class="notes-box">${esc(d.notes_client)}</div>` : ''}
    <div class="footer">Ce devis est valable 30 jours à compter de sa date d'émission. • Dubai, UAE • TVA 5% conformément à la réglementation UAE FTA</div>
  </body></html>`;

  return renderPdf(html);
}

async function generateFacturePDF(factureId) {
  const { rows: [f] } = await db.query(
    `SELECT fa.*, c.nom, c.prenom, c.entreprise, c.email, c.tel, c.trn,
            c.fact_rue, c.fact_ville, c.fact_pays
     FROM factures fa JOIN clients c ON c.id = fa.client_id WHERE fa.id = $1`,
    [factureId]
  );
  if (!f) throw new Error('Facture introuvable');

  const { rows: lignes } = await db.query(
    'SELECT * FROM facture_lignes WHERE facture_id=$1 ORDER BY ordre',
    [factureId]
  );

  const clientNom = f.entreprise ? `${esc(f.entreprise)}<br><small>${esc(f.prenom||'')} ${esc(f.nom)}</small>` : `${esc(f.prenom||'')} ${esc(f.nom)}`;
  const isPaid = f.statut === 'payee';

  const lignesHtml = lignes.map(l => `
    <tr>
      <td>${esc(l.designation)}</td>
      <td style="text-align:center">${Number(l.quantite).toFixed(2)}</td>
      <td style="text-align:right">${fmtAED(l.prix_unitaire)}</td>
      <td style="text-align:center">${Number(l.tva_taux).toFixed(0)}%</td>
      <td>${fmtAED(Number(l.quantite)*Number(l.prix_unitaire))}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${baseStyles}</head><body>
    ${isPaid ? '<div class="badge-paid">PAYÉE</div>' : ''}
    <div class="header">
      <div class="company"><h1>🔧 ERP Dubai</h1><p>Dépannage & Rénovation</p></div>
      <div class="doc-info">
        <div class="doc-num">FACTURE ${esc(f.numero)}</div>
        <div class="doc-date">Date : ${fmtDate(f.date_emission)}</div>
        ${f.date_echeance ? `<div class="doc-date" style="color:${new Date(f.date_echeance)<new Date()&&!isPaid?'#dc2626':'#64748b'}">Échéance : ${fmtDate(f.date_echeance)}</div>` : ''}
      </div>
    </div>
    <div class="parties">
      <div class="party-box">
        <div class="party-label">Émetteur</div>
        <div class="party-name">ERP Dubai — Dépannage & Rénovation</div>
        <div class="party-detail">Dubai, UAE</div>
      </div>
      <div class="party-box">
        <div class="party-label">Facturé à</div>
        <div class="party-name">${clientNom}</div>
        <div class="party-detail">
          ${f.fact_rue ? esc(f.fact_rue)+'<br>' : ''}
          ${f.fact_ville ? esc(f.fact_ville)+', ' : ''}${esc(f.fact_pays||'UAE')}
          ${f.trn ? '<br>TRN : '+esc(f.trn) : ''}
          ${f.email ? '<br>'+esc(f.email) : ''}
        </div>
      </div>
    </div>
    <div class="section-title">Détail des prestations</div>
    <table>
      <thead><tr><th>Désignation</th><th style="text-align:center">Qté</th><th style="text-align:right">P.U. HT</th><th style="text-align:center">TVA</th><th style="text-align:right">Total HT</th></tr></thead>
      <tbody>${lignesHtml}</tbody>
    </table>
    <div class="totals"><div class="totals-box">
      <div class="total-row"><span>Total HT</span><span>${fmtAED(f.montant_ht)}</span></div>
      <div class="total-row"><span>TVA (5%)</span><span>${fmtAED(f.montant_tva)}</span></div>
      <div class="total-row main"><span>Total TTC</span><span>${fmtAED(f.montant_ttc)}</span></div>
      ${Number(f.montant_paye)>0 ? `<div class="total-row" style="color:#16a34a"><span>Déjà réglé</span><span>- ${fmtAED(f.montant_paye)}</span></div>` : ''}
      ${Number(f.montant_paye)>0 && !isPaid ? `<div class="total-row" style="font-weight:700;color:#dc2626"><span>Reste à payer</span><span>${fmtAED(f.montant_ttc - f.montant_paye)}</span></div>` : ''}
    </div></div>
    ${f.notes ? `<div class="notes-box">${esc(f.notes)}</div>` : ''}
    <div class="footer">Merci de votre confiance. • Dubai, UAE • TVA 5% UAE FTA • ${f.mode_paiement ? 'Mode de règlement : '+esc(f.mode_paiement) : ''}</div>
  </body></html>`;

  return renderPdf(html);
}

async function generateRapportPDF(interventionId) {
  const { rows: [i] } = await db.query(
    `SELECT iv.*, c.nom, c.prenom, c.entreprise, c.tel
     FROM interventions iv JOIN clients c ON c.id = iv.client_id WHERE iv.id = $1`,
    [interventionId]
  );
  if (!i) throw new Error('Intervention introuvable');

  const { rows: techs } = await db.query(
    `SELECT p.nom, p.prenom FROM intervention_techniciens it JOIN profils p ON p.id = it.user_id WHERE it.intervention_id=$1`,
    [interventionId]
  );

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${baseStyles}</head><body>
    <div class="header">
      <div class="company"><h1>🔧 ERP Dubai</h1><p>Rapport d'intervention</p></div>
      <div class="doc-info">
        <div class="doc-num" style="font-size:16px">RAPPORT #${i.id}</div>
        <div class="doc-date">Date : ${fmtDate(i.date_intervention)}</div>
        ${i.heure_debut ? `<div class="doc-date">${i.heure_debut}${i.heure_fin?' — '+i.heure_fin:''}</div>` : ''}
      </div>
    </div>
    <div class="parties">
      <div class="party-box">
        <div class="party-label">Client</div>
        <div class="party-name">${i.entreprise ? esc(i.entreprise) : esc(i.prenom||'')+' '+esc(i.nom)}</div>
        <div class="party-detail">${esc(i.tel||'')}</div>
      </div>
      <div class="party-box">
        <div class="party-label">Technicien(s)</div>
        <div class="party-detail">${techs.map(t=>esc(t.prenom||'')+' '+esc(t.nom)).join('<br>') || '—'}</div>
      </div>
    </div>
    ${i.lieu ? `<div class="objet">📍 Lieu : ${esc(i.lieu)}</div>` : ''}
    ${i.notes_avant ? `<div class="section-title">Description de l'intervention</div><div class="notes-box">${esc(i.notes_avant)}</div>` : ''}
    ${i.rapport_texte ? `<div class="section-title">Compte-rendu technique</div><div class="notes-box">${esc(i.rapport_texte)}</div>` : ''}
    <div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:32px">
      <div>
        <div class="section-title">Signature technicien</div>
        <div style="border:1px solid #e2e8f0;border-radius:6px;height:80px;margin-top:6px"></div>
      </div>
      <div>
        <div class="section-title">Signature client (bon pour accord)</div>
        ${i.signature_url
          ? `<img src="${i.signature_url}" style="height:80px;border:1px solid #e2e8f0;border-radius:6px;margin-top:6px;display:block">`
          : '<div style="border:1px solid #e2e8f0;border-radius:6px;height:80px;margin-top:6px"></div>'}
      </div>
    </div>
    <div class="footer">Rapport généré le ${fmtDate(new Date())} • Dubai, UAE</div>
  </body></html>`;

  return renderPdf(html);
}

module.exports = { generateDevisPDF, generateFacturePDF, generateRapportPDF };
