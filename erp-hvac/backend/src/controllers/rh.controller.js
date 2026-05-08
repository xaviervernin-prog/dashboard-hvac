const { db } = require('../config/supabase');

// ── EMPLOYÉS ──────────────────────────────────────────────────────────────────

exports.listEmployes = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT e.*, p.email AS login_email
      FROM employes e
      LEFT JOIN profils p ON p.id = e.user_id
      ORDER BY e.nom, e.prenom`);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getEmploye = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT e.*, p.email AS login_email FROM employes e
       LEFT JOIN profils p ON p.id = e.user_id WHERE e.id = $1`,
      [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Employé introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.createEmploye = async (req, res, next) => {
  try {
    const f = req.body;
    const { rows } = await db.query(`
      INSERT INTO employes (user_id,nom,prenom,poste,email,tel,date_embauche,type_contrat,
        numero_visa,visa_expiration,permis_conduire,permis_expiration,nationalite,
        passeport_num,passeport_exp,salaire_base,photo_url,actif)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [f.user_id||null,f.nom,f.prenom||null,f.poste||null,f.email||null,f.tel||null,
       f.date_embauche||null,f.type_contrat||null,f.numero_visa||null,f.visa_expiration||null,
       f.permis_conduire||null,f.permis_expiration||null,f.nationalite||null,
       f.passeport_num||null,f.passeport_exp||null,f.salaire_base||null,f.photo_url||null,
       f.actif !== false]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateEmploye = async (req, res, next) => {
  try {
    const f = req.body;
    const { rows } = await db.query(`
      UPDATE employes SET user_id=$1,nom=$2,prenom=$3,poste=$4,email=$5,tel=$6,
        date_embauche=$7,type_contrat=$8,numero_visa=$9,visa_expiration=$10,
        permis_conduire=$11,permis_expiration=$12,nationalite=$13,passeport_num=$14,
        passeport_exp=$15,salaire_base=$16,photo_url=$17,actif=$18
      WHERE id=$19 RETURNING *`,
      [f.user_id||null,f.nom,f.prenom||null,f.poste||null,f.email||null,f.tel||null,
       f.date_embauche||null,f.type_contrat||null,f.numero_visa||null,f.visa_expiration||null,
       f.permis_conduire||null,f.permis_expiration||null,f.nationalite||null,
       f.passeport_num||null,f.passeport_exp||null,f.salaire_base||null,f.photo_url||null,
       f.actif !== false, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Employé introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteEmploye = async (req, res, next) => {
  try {
    await db.query('UPDATE employes SET actif=false WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── CONGÉS ────────────────────────────────────────────────────────────────────

exports.listConges = async (req, res, next) => {
  try {
    const { employe_id, statut } = req.query;
    let q = `SELECT c.*, e.nom, e.prenom FROM conges c
             JOIN employes e ON e.id = c.employe_id WHERE 1=1`;
    const params = [];
    if (employe_id) { params.push(employe_id); q += ` AND c.employe_id=$${params.length}`; }
    if (statut)     { params.push(statut);     q += ` AND c.statut=$${params.length}`; }
    q += ' ORDER BY c.date_debut DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createConge = async (req, res, next) => {
  try {
    const { employe_id, type_conge, date_debut, date_fin, nb_jours, notes } = req.body;
    const { rows } = await db.query(`
      INSERT INTO conges (employe_id,type_conge,date_debut,date_fin,nb_jours,notes)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [employe_id, type_conge||'annuel', date_debut, date_fin, nb_jours||null, notes||null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateCongeStatut = async (req, res, next) => {
  try {
    const { statut } = req.body;
    const { rows } = await db.query(
      `UPDATE conges SET statut=$1, approuve_par=$2 WHERE id=$3 RETURNING *`,
      [statut, req.user.id, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Congé introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteConge = async (req, res, next) => {
  try {
    await db.query('DELETE FROM conges WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── POINTAGES ─────────────────────────────────────────────────────────────────

exports.listPointages = async (req, res, next) => {
  try {
    const { employe_id, date_debut, date_fin } = req.query;
    let q = `SELECT pt.*, e.nom, e.prenom FROM pointages pt
             JOIN employes e ON e.id = pt.employe_id WHERE 1=1`;
    const params = [];
    if (employe_id) { params.push(employe_id); q += ` AND pt.employe_id=$${params.length}`; }
    if (date_debut) { params.push(date_debut); q += ` AND pt.date_travail>=$${params.length}`; }
    if (date_fin)   { params.push(date_fin);   q += ` AND pt.date_travail<=$${params.length}`; }
    q += ' ORDER BY pt.date_travail DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.createPointage = async (req, res, next) => {
  try {
    const f = req.body;
    const { rows } = await db.query(`
      INSERT INTO pointages (employe_id,intervention_id,date_travail,heure_debut,heure_fin,heures_travail,type_activite,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [f.employe_id,f.intervention_id||null,f.date_travail,f.heure_debut||null,
       f.heure_fin||null,f.heures_travail||null,f.type_activite||'intervention',f.notes||null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.deletePointage = async (req, res, next) => {
  try {
    await db.query('DELETE FROM pointages WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── ALERTES DOCUMENTS ─────────────────────────────────────────────────────────

exports.alertesDocuments = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT id, nom, prenom,
        visa_expiration, permis_expiration, passeport_exp,
        CASE
          WHEN visa_expiration IS NOT NULL AND visa_expiration < NOW() + INTERVAL '30 days' THEN true ELSE false
        END AS visa_alerte,
        CASE
          WHEN permis_expiration IS NOT NULL AND permis_expiration < NOW() + INTERVAL '30 days' THEN true ELSE false
        END AS permis_alerte,
        CASE
          WHEN passeport_exp IS NOT NULL AND passeport_exp < NOW() + INTERVAL '30 days' THEN true ELSE false
        END AS passeport_alerte
      FROM employes
      WHERE actif = true
        AND (
          (visa_expiration IS NOT NULL AND visa_expiration < NOW() + INTERVAL '30 days') OR
          (permis_expiration IS NOT NULL AND permis_expiration < NOW() + INTERVAL '30 days') OR
          (passeport_exp IS NOT NULL AND passeport_exp < NOW() + INTERVAL '30 days')
        )
      ORDER BY LEAST(visa_expiration, permis_expiration, passeport_exp)`);
    res.json(rows);
  } catch (err) { next(err); }
};
