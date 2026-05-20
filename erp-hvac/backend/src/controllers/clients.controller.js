const { db } = require('../config/supabase');

async function list(req, res, next) {
  try {
    const { q, statut, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const search = q ? `%${q}%` : null;

    const { rows } = await db.query(
      `SELECT c.*, COUNT(ch.id)::int AS nb_chantiers
       FROM clients c
       LEFT JOIN chantiers ch ON ch.client_id = c.id AND ch.actif = true
       WHERE c.actif = true
         AND ($1::text IS NULL OR c.nom ILIKE $1 OR c.prenom ILIKE $1 OR c.entreprise ILIKE $1 OR c.tel ILIKE $1)
         AND ($2::text IS NULL OR c.statut = $2)
       GROUP BY c.id
       ORDER BY c.nom
       LIMIT $3 OFFSET $4`,
      [search, statut || null, limit, offset]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT * FROM clients WHERE id = $1 AND actif = true',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Client introuvable' });

    const { rows: chantiers } = await db.query(
      'SELECT * FROM chantiers WHERE client_id = $1 AND actif = true ORDER BY nom',
      [req.params.id]
    );
    res.json({ ...rows[0], chantiers });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { nom, prenom, entreprise, tel, email, statut, trn, fact_rue, fact_ville, fact_pays, notes } = req.body;
    if (!nom) return res.status(400).json({ error: 'Le nom est requis' });

    const { rows } = await db.query(
      `INSERT INTO clients (nom, prenom, entreprise, tel, email, statut, trn, fact_rue, fact_ville, fact_pays, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [nom, prenom, entreprise, tel, email, statut || 'prospect', trn, fact_rue, fact_ville, fact_pays || 'UAE', notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { nom, prenom, entreprise, tel, email, statut, trn, fact_rue, fact_ville, fact_pays, notes } = req.body;
    const { rows } = await db.query(
      `UPDATE clients SET
        nom=$1, prenom=$2, entreprise=$3, tel=$4, email=$5, statut=$6,
        trn=$7, fact_rue=$8, fact_ville=$9, fact_pays=$10, notes=$11,
        updated_at=NOW()
       WHERE id=$12 AND actif=true RETURNING *`,
      [nom, prenom, entreprise, tel, email, statut, trn, fact_rue, fact_ville, fact_pays, notes, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Client introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { rows } = await db.query(
      'UPDATE clients SET actif=false, updated_at=NOW() WHERE id=$1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Client introuvable' });
    res.json({ message: 'Client archivé' });
  } catch (err) { next(err); }
}

async function listChantiers(req, res, next) {
  try {
    const { rows } = await db.query(
      'SELECT * FROM chantiers WHERE client_id=$1 AND actif=true ORDER BY nom',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function createChantier(req, res, next) {
  try {
    const { nom, adresse, contact_nom, contact_prenom, contact_tel } = req.body;
    const { rows } = await db.query(
      `INSERT INTO chantiers (client_id, nom, adresse, contact_nom, contact_prenom, contact_tel)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, nom, adresse, contact_nom, contact_prenom, contact_tel]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function updateChantier(req, res, next) {
  try {
    const { nom, adresse, contact_nom, contact_prenom, contact_tel } = req.body;
    const { rows } = await db.query(
      `UPDATE chantiers SET nom=$1, adresse=$2, contact_nom=$3, contact_prenom=$4, contact_tel=$5
       WHERE id=$6 AND client_id=$7 AND actif=true RETURNING *`,
      [nom, adresse, contact_nom, contact_prenom, contact_tel, req.params.chantierId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Chantier introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function deleteChantier(req, res, next) {
  try {
    await db.query(
      'UPDATE chantiers SET actif=false WHERE id=$1 AND client_id=$2',
      [req.params.chantierId, req.params.id]
    );
    res.json({ message: 'Chantier archivé' });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove, listChantiers, createChantier, updateChantier, deleteChantier };
