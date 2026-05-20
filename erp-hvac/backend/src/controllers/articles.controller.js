const { db } = require('../config/supabase');

async function list(req, res, next) {
  try {
    const { q, categorie_id } = req.query;
    const search = q ? `%${q}%` : null;
    const { rows } = await db.query(
      `SELECT a.*, c.nom AS categorie_nom
       FROM articles a
       LEFT JOIN categories_articles c ON c.id = a.categorie_id
       WHERE a.actif = true
         AND ($1::text IS NULL OR a.designation ILIKE $1 OR a.reference ILIKE $1)
         AND ($2::int IS NULL OR a.categorie_id = $2)
       ORDER BY a.designation`,
      [search, categorie_id || null]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT a.*, c.nom AS categorie_nom FROM articles a
       LEFT JOIN categories_articles c ON c.id = a.categorie_id
       WHERE a.id=$1 AND a.actif=true`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Article introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { reference, designation, categorie_id, description, prix_unitaire, tva_taux, stock_actuel, stock_minimum, unite } = req.body;
    if (!designation) return res.status(400).json({ error: 'La désignation est requise' });

    const { rows } = await db.query(
      `INSERT INTO articles (reference, designation, categorie_id, description, prix_unitaire, tva_taux, stock_actuel, stock_minimum, unite)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [reference, designation, categorie_id, description, prix_unitaire || 0, tva_taux || 5.00, stock_actuel || 0, stock_minimum || 5, unite || 'unité']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { reference, designation, categorie_id, description, prix_unitaire, tva_taux, stock_actuel, stock_minimum, unite } = req.body;
    const { rows } = await db.query(
      `UPDATE articles SET
        reference=$1, designation=$2, categorie_id=$3, description=$4,
        prix_unitaire=$5, tva_taux=$6, stock_actuel=$7, stock_minimum=$8, unite=$9,
        updated_at=NOW()
       WHERE id=$10 AND actif=true RETURNING *`,
      [reference, designation, categorie_id, description, prix_unitaire, tva_taux, stock_actuel, stock_minimum, unite, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Article introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await db.query('UPDATE articles SET actif=false, updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message: 'Article archivé' });
  } catch (err) { next(err); }
}

async function stockAlertes(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT a.*, c.nom AS categorie_nom FROM articles a
       LEFT JOIN categories_articles c ON c.id = a.categorie_id
       WHERE a.actif=true AND a.stock_actuel <= a.stock_minimum
       ORDER BY (a.stock_actuel - a.stock_minimum), a.designation`,
      []
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function listCategories(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM categories_articles ORDER BY ordre, nom');
    res.json(rows);
  } catch (err) { next(err); }
}

async function createCategorie(req, res, next) {
  try {
    const { nom, ordre } = req.body;
    if (!nom) return res.status(400).json({ error: 'Nom requis' });
    const { rows } = await db.query(
      'INSERT INTO categories_articles (nom, ordre) VALUES ($1, $2) RETURNING *',
      [nom, ordre || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
}

async function deleteCategorie(req, res, next) {
  try {
    await db.query('DELETE FROM categories_articles WHERE id=$1', [req.params.id]);
    res.json({ message: 'Catégorie supprimée' });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove, stockAlertes, listCategories, createCategorie, deleteCategorie };
