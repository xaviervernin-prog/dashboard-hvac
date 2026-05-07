const { db } = require('../config/supabase');
const { getNextNumber } = require('../utils/numerotation');
const { generateFacturePDF } = require('../services/pdf.service');

async function list(req, res, next) {
  try {
    const { q, statut, client_id } = req.query;
    const search = q ? `%${q}%` : null;
    const { rows } = await db.query(
      `SELECT f.*, c.nom AS client_nom, c.prenom AS client_prenom, c.entreprise
       FROM factures f JOIN clients c ON c.id = f.client_id
       WHERE ($1::text IS NULL OR f.numero ILIKE $1 OR c.nom ILIKE $1)
         AND ($2::text IS NULL OR f.statut = $2)
         AND ($3::int IS NULL OR f.client_id = $3)
       ORDER BY f.date_emission DESC`,
      [search, statut || null, client_id || null]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT f.*, c.nom AS client_nom, c.prenom AS client_prenom, c.entreprise, c.fact_rue, c.fact_ville, c.fact_pays, c.trn
       FROM factures f JOIN clients c ON c.id = f.client_id WHERE f.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Facture introuvable' });

    const [{ rows: lignes }, { rows: paiements }] = await Promise.all([
      db.query('SELECT * FROM facture_lignes WHERE facture_id=$1 ORDER BY ordre', [req.params.id]),
      db.query('SELECT * FROM paiements WHERE facture_id=$1 ORDER BY date_paiement', [req.params.id])
    ]);

    res.json({ ...rows[0], lignes, paiements });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  const pgClient = await db.getClient();
  try {
    await pgClient.query('BEGIN');
    const { client_id, devis_id, date_emission, date_echeance, notes, lignes = [] } = req.body;
    if (!client_id) return res.status(400).json({ error: 'Client requis' });

    const numero = await getNextNumber(pgClient, 'facture', 'FAC');

    let montant_ht = 0, montant_tva = 0;
    lignes.forEach(l => {
      const ht = (l.quantite || 1) * (l.prix_unitaire || 0);
      montant_ht += ht;
      montant_tva += ht * ((l.tva_taux || 5) / 100);
    });

    const { rows } = await pgClient.query(
      `INSERT INTO factures (numero, client_id, devis_id, date_emission, date_echeance, montant_ht, montant_tva, montant_ttc, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [numero, client_id, devis_id, date_emission || new Date().toISOString().slice(0,10), date_echeance, montant_ht, montant_tva, montant_ht + montant_tva, notes, req.user.id]
    );

    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i];
      await pgClient.query(
        'INSERT INTO facture_lignes (facture_id, article_id, designation, quantite, prix_unitaire, tva_taux, ordre) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [rows[0].id, l.article_id || null, l.designation, l.quantite || 1, l.prix_unitaire || 0, l.tva_taux || 5, i]
      );
    }

    await pgClient.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await pgClient.query('ROLLBACK');
    next(err);
  } finally {
    pgClient.release();
  }
}

async function update(req, res, next) {
  try {
    const { date_echeance, notes, mode_paiement } = req.body;
    const { rows } = await db.query(
      `UPDATE factures SET date_echeance=$1, notes=$2, mode_paiement=$3, updated_at=NOW() WHERE id=$4 RETURNING *`,
      [date_echeance, notes, mode_paiement, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Facture introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await db.query(`UPDATE factures SET statut='annulee', updated_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Facture annulée' });
  } catch (err) { next(err); }
}

async function addPaiement(req, res, next) {
  const pgClient = await db.getClient();
  try {
    await pgClient.query('BEGIN');
    const { montant, date_paiement, mode, reference, notes } = req.body;
    if (!montant || !date_paiement) return res.status(400).json({ error: 'Montant et date requis' });

    await pgClient.query(
      'INSERT INTO paiements (facture_id, date_paiement, montant, mode, reference, notes) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.id, date_paiement, montant, mode, reference, notes]
    );

    const { rows: [f] } = await pgClient.query(
      `UPDATE factures SET
         montant_paye = montant_paye + $1,
         statut = CASE
           WHEN montant_paye + $1 >= montant_ttc THEN 'payee'
           WHEN montant_paye + $1 > 0 THEN 'partielle'
           ELSE statut END,
         updated_at = NOW()
       WHERE id=$2 RETURNING *`,
      [montant, req.params.id]
    );

    await pgClient.query('COMMIT');
    res.json(f);
  } catch (err) {
    await pgClient.query('ROLLBACK');
    next(err);
  } finally {
    pgClient.release();
  }
}

async function pdf(req, res, next) {
  try {
    const buffer = await generateFacturePDF(req.params.id);
    const { rows: [f] } = await db.query('SELECT numero FROM factures WHERE id=$1', [req.params.id]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${f?.numero || req.params.id}.pdf"`);
    res.send(buffer);
  } catch (err) { next(err); }
}

async function relancer(req, res, next) {
  try {
    await db.query('UPDATE factures SET date_relance=NOW(), updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message: 'Relance enregistrée' });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove, addPaiement, pdf, relancer };
