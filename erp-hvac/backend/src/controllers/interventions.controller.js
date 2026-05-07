const { db } = require('../config/supabase');

async function list(req, res, next) {
  try {
    const { date, technicien_id, statut } = req.query;
    let whereExtra = '';
    const params = [statut || null, date || null];

    if (req.user.role === 'technicien') {
      whereExtra = `AND EXISTS (SELECT 1 FROM intervention_techniciens it WHERE it.intervention_id = i.id AND it.user_id = ${req.user.id})`;
    } else if (technicien_id) {
      whereExtra = `AND EXISTS (SELECT 1 FROM intervention_techniciens it WHERE it.intervention_id = i.id AND it.user_id = ${parseInt(technicien_id)})`;
    }

    const { rows } = await db.query(
      `SELECT i.*, c.nom AS client_nom, c.prenom AS client_prenom, c.tel AS client_tel
       FROM interventions i
       JOIN clients c ON c.id = i.client_id
       WHERE ($1::text IS NULL OR i.statut = $1)
         AND ($2::date IS NULL OR i.date_intervention = $2)
         ${whereExtra}
       ORDER BY i.date_intervention, i.heure_debut`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT i.*, c.nom AS client_nom, c.prenom AS client_prenom, c.tel AS client_tel, c.email AS client_email
       FROM interventions i JOIN clients c ON c.id = i.client_id
       WHERE i.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Intervention introuvable' });

    const { rows: techniciens } = await db.query(
      `SELECT p.id, p.nom, p.prenom FROM intervention_techniciens it
       JOIN profils p ON p.id = it.user_id WHERE it.intervention_id=$1`,
      [req.params.id]
    );
    res.json({ ...rows[0], techniciens });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  const pgClient = await db.getClient();
  try {
    await pgClient.query('BEGIN');
    const { devis_id, client_id, chantier_id, date_intervention, heure_debut, heure_fin, lieu, notes_avant, technicien_ids = [] } = req.body;
    if (!client_id || !date_intervention) return res.status(400).json({ error: 'Client et date requis' });

    const { rows } = await pgClient.query(
      `INSERT INTO interventions (devis_id, client_id, chantier_id, date_intervention, heure_debut, heure_fin, lieu, notes_avant, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [devis_id, client_id, chantier_id, date_intervention, heure_debut, heure_fin, lieu, notes_avant, req.user.id]
    );

    for (const uid of technicien_ids) {
      await pgClient.query(
        'INSERT INTO intervention_techniciens (intervention_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [rows[0].id, uid]
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
  const pgClient = await db.getClient();
  try {
    await pgClient.query('BEGIN');
    const { date_intervention, heure_debut, heure_fin, lieu, notes_avant, statut, technicien_ids } = req.body;

    const { rows } = await pgClient.query(
      `UPDATE interventions SET date_intervention=$1, heure_debut=$2, heure_fin=$3, lieu=$4, notes_avant=$5, statut=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [date_intervention, heure_debut, heure_fin, lieu, notes_avant, statut, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Intervention introuvable' });

    if (technicien_ids !== undefined) {
      await pgClient.query('DELETE FROM intervention_techniciens WHERE intervention_id=$1', [req.params.id]);
      for (const uid of technicien_ids) {
        await pgClient.query(
          'INSERT INTO intervention_techniciens (intervention_id, user_id) VALUES ($1,$2)',
          [req.params.id, uid]
        );
      }
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
    await db.query('UPDATE interventions SET statut=\'annulee\', updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message: 'Intervention annulée' });
  } catch (err) { next(err); }
}

async function cloturer(req, res, next) {
  try {
    const { rows } = await db.query(
      `UPDATE interventions SET statut='terminee', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Intervention introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function rapport(req, res, next) {
  try {
    const { rapport_texte, signature_url } = req.body;
    const { rows } = await db.query(
      `UPDATE interventions SET rapport_texte=$1, signature_url=$2, statut='terminee', updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [rapport_texte, signature_url, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
}

async function pdf(req, res, next) {
  res.status(501).json({ message: 'PDF disponible en Phase 2' });
}

module.exports = { list, get, create, update, remove, cloturer, rapport, pdf };
