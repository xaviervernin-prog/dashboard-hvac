const { db } = require('../config/supabase');
const { getNextNumber } = require('../utils/numerotation');

async function list(req, res, next) {
  try {
    const { q, statut, client_id } = req.query;
    const search = q ? `%${q}%` : null;
    const { rows } = await db.query(
      `SELECT d.*, c.nom AS client_nom, c.prenom AS client_prenom, c.entreprise
       FROM devis d
       JOIN clients c ON c.id = d.client_id
       WHERE ($1::text IS NULL OR d.numero ILIKE $1 OR d.objet ILIKE $1 OR c.nom ILIKE $1)
         AND ($2::text IS NULL OR d.statut = $2)
         AND ($3::int IS NULL OR d.client_id = $3)
       ORDER BY d.created_at DESC`,
      [search, statut || null, client_id || null]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT d.*, c.nom AS client_nom, c.prenom AS client_prenom, c.entreprise,
              c.fact_rue, c.fact_ville, c.fact_pays, c.trn
       FROM devis d JOIN clients c ON c.id = d.client_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Devis introuvable' });

    const { rows: lignes } = await db.query(
      'SELECT * FROM devis_lignes WHERE devis_id=$1 ORDER BY ordre',
      [req.params.id]
    );
    res.json({ ...rows[0], lignes });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { client_id, chantier_id, objet, date_devis, date_validite, notes_internes, notes_client, lignes = [] } = req.body;
    if (!client_id) return res.status(400).json({ error: 'Client requis' });

    const numero = await getNextNumber(client, 'devis', 'DEV');

    let montant_ht = 0, montant_tva = 0;
    lignes.forEach(l => {
      const ht = (l.quantite || 1) * (l.prix_unitaire || 0);
      montant_ht += ht;
      montant_tva += ht * ((l.tva_taux || 5) / 100);
    });
    const montant_ttc = montant_ht + montant_tva;

    const { rows } = await client.query(
      `INSERT INTO devis (numero, client_id, chantier_id, objet, date_devis, date_validite, montant_ht, montant_tva, montant_ttc, notes_internes, notes_client, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [numero, client_id, chantier_id, objet, date_devis || new Date().toISOString().slice(0,10), date_validite, montant_ht, montant_tva, montant_ttc, notes_internes, notes_client, req.user.id]
    );
    const devis = rows[0];

    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i];
      await client.query(
        `INSERT INTO devis_lignes (devis_id, article_id, designation, quantite, prix_unitaire, tva_taux, ordre)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [devis.id, l.article_id || null, l.designation, l.quantite || 1, l.prix_unitaire || 0, l.tva_taux || 5, i]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(devis);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function update(req, res, next) {
  const pgClient = await db.getClient();
  try {
    await pgClient.query('BEGIN');
    const { objet, date_devis, date_validite, notes_internes, notes_client, lignes = [] } = req.body;

    const { rows: existing } = await pgClient.query('SELECT statut FROM devis WHERE id=$1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Devis introuvable' });
    if (existing[0].statut === 'accepte') return res.status(400).json({ error: 'Devis accepté non modifiable' });

    let montant_ht = 0, montant_tva = 0;
    lignes.forEach(l => {
      const ht = (l.quantite || 1) * (l.prix_unitaire || 0);
      montant_ht += ht;
      montant_tva += ht * ((l.tva_taux || 5) / 100);
    });

    const { rows } = await pgClient.query(
      `UPDATE devis SET objet=$1, date_devis=$2, date_validite=$3, montant_ht=$4, montant_tva=$5,
        montant_ttc=$6, notes_internes=$7, notes_client=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [objet, date_devis, date_validite, montant_ht, montant_tva, montant_ht + montant_tva, notes_internes, notes_client, req.params.id]
    );

    await pgClient.query('DELETE FROM devis_lignes WHERE devis_id=$1', [req.params.id]);
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i];
      await pgClient.query(
        `INSERT INTO devis_lignes (devis_id, article_id, designation, quantite, prix_unitaire, tva_taux, ordre)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.params.id, l.article_id || null, l.designation, l.quantite || 1, l.prix_unitaire || 0, l.tva_taux || 5, i]
      );
    }

    await pgClient.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await pgClient.query('ROLLBACK');
    next(err);
  } finally {
    pgClient.release();
  }
}

async function remove(req, res, next) {
  try {
    await db.query('DELETE FROM devis WHERE id=$1', [req.params.id]);
    res.json({ message: 'Devis supprimé' });
  } catch (err) { next(err); }
}

async function accepter(req, res, next) {
  try {
    const { rows } = await db.query(
      `UPDATE devis SET statut='accepte', updated_at=NOW() WHERE id=$1 AND statut='en_attente' RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(400).json({ error: 'Devis non trouvé ou déjà traité' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function relancer(req, res, next) {
  try {
    await db.query(
      `UPDATE devis SET date_relance=NOW(), updated_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    res.json({ message: 'Relance enregistrée' });
  } catch (err) { next(err); }
}

async function dupliquer(req, res, next) {
  const pgClient = await db.getClient();
  try {
    await pgClient.query('BEGIN');
    const { rows: [src] } = await pgClient.query('SELECT * FROM devis WHERE id=$1', [req.params.id]);
    if (!src) return res.status(404).json({ error: 'Devis introuvable' });

    const numero = await getNextNumber(pgClient, 'devis', 'DEV');
    const { rows: [copy] } = await pgClient.query(
      `INSERT INTO devis (numero, client_id, chantier_id, objet, date_devis, montant_ht, montant_tva, montant_ttc, notes_internes, notes_client, created_by)
       VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [numero, src.client_id, src.chantier_id, `Copie - ${src.objet}`, src.montant_ht, src.montant_tva, src.montant_ttc, src.notes_internes, src.notes_client, req.user.id]
    );

    const { rows: lignes } = await pgClient.query('SELECT * FROM devis_lignes WHERE devis_id=$1 ORDER BY ordre', [src.id]);
    for (const l of lignes) {
      await pgClient.query(
        'INSERT INTO devis_lignes (devis_id, article_id, designation, quantite, prix_unitaire, tva_taux, ordre) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [copy.id, l.article_id, l.designation, l.quantite, l.prix_unitaire, l.tva_taux, l.ordre]
      );
    }

    await pgClient.query('COMMIT');
    res.status(201).json(copy);
  } catch (err) {
    await pgClient.query('ROLLBACK');
    next(err);
  } finally {
    pgClient.release();
  }
}

async function pdf(req, res, next) {
  res.status(501).json({ message: 'PDF disponible en Phase 2' });
}

async function facturer(req, res, next) {
  res.status(501).json({ message: 'Facturation disponible en Phase 2' });
}

module.exports = { list, get, create, update, remove, accepter, relancer, dupliquer, pdf, facturer };
