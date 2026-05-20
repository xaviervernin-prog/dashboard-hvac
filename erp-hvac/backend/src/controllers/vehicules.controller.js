const { db } = require('../config/supabase');

// ── VÉHICULES ─────────────────────────────────────────────────────────────────

exports.listVehicules = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*, e.nom AS employe_nom, e.prenom AS employe_prenom
      FROM vehicules v
      LEFT JOIN employes e ON e.id = v.employe_id
      ORDER BY v.immatriculation`);
    res.json(rows);
  } catch (err) { next(err); }
};

exports.getVehicule = async (req, res, next) => {
  try {
    const [veh, entretiens, pleins] = await Promise.all([
      db.query(`SELECT v.*, e.nom AS employe_nom, e.prenom AS employe_prenom
                FROM vehicules v LEFT JOIN employes e ON e.id = v.employe_id
                WHERE v.id=$1`, [req.params.id]),
      db.query('SELECT * FROM entretiens_vehicule WHERE vehicule_id=$1 ORDER BY date_entretien DESC', [req.params.id]),
      db.query(`SELECT p.*, e.nom, e.prenom FROM pleins_carburant p
                LEFT JOIN employes e ON e.id = p.employe_id
                WHERE p.vehicule_id=$1 ORDER BY p.date_plein DESC LIMIT 20`, [req.params.id])
    ]);
    if (!veh.rows.length) return res.status(404).json({ error: 'Véhicule introuvable' });
    res.json({ ...veh.rows[0], entretiens: entretiens.rows, pleins: pleins.rows });
  } catch (err) { next(err); }
};

exports.createVehicule = async (req, res, next) => {
  try {
    const f = req.body;
    const { rows } = await db.query(`
      INSERT INTO vehicules (immatriculation,marque,modele,annee,couleur,type_vehicule,
        assurance_num,assurance_exp,controle_tech_exp,mulkiya_exp,employe_id,actif,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [f.immatriculation,f.marque||null,f.modele||null,f.annee||null,f.couleur||null,
       f.type_vehicule||'van',f.assurance_num||null,f.assurance_exp||null,
       f.controle_tech_exp||null,f.mulkiya_exp||null,f.employe_id||null,
       f.actif!==false,f.notes||null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.updateVehicule = async (req, res, next) => {
  try {
    const f = req.body;
    const { rows } = await db.query(`
      UPDATE vehicules SET immatriculation=$1,marque=$2,modele=$3,annee=$4,couleur=$5,
        type_vehicule=$6,assurance_num=$7,assurance_exp=$8,controle_tech_exp=$9,
        mulkiya_exp=$10,employe_id=$11,actif=$12,notes=$13
      WHERE id=$14 RETURNING *`,
      [f.immatriculation,f.marque||null,f.modele||null,f.annee||null,f.couleur||null,
       f.type_vehicule||'van',f.assurance_num||null,f.assurance_exp||null,
       f.controle_tech_exp||null,f.mulkiya_exp||null,f.employe_id||null,
       f.actif!==false,f.notes||null,req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Véhicule introuvable' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteVehicule = async (req, res, next) => {
  try {
    await db.query('UPDATE vehicules SET actif=false WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── ENTRETIENS ────────────────────────────────────────────────────────────────

exports.createEntretien = async (req, res, next) => {
  try {
    const f = req.body;
    const { rows } = await db.query(`
      INSERT INTO entretiens_vehicule (vehicule_id,date_entretien,type_entretien,description,cout,kilometrage,prochain_entretien)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.vehiculeId,f.date_entretien,f.type_entretien||'autre',
       f.description||null,f.cout||null,f.kilometrage||null,f.prochain_entretien||null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteEntretien = async (req, res, next) => {
  try {
    await db.query('DELETE FROM entretiens_vehicule WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── PLEINS CARBURANT ──────────────────────────────────────────────────────────

exports.createPlein = async (req, res, next) => {
  try {
    const f = req.body;
    const { rows } = await db.query(`
      INSERT INTO pleins_carburant (vehicule_id,employe_id,date_plein,litres,montant,kilometrage)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.vehiculeId,f.employe_id||null,f.date_plein,f.litres||null,f.montant||null,f.kilometrage||null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
};

exports.deleteePlein = async (req, res, next) => {
  try {
    await db.query('DELETE FROM pleins_carburant WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ── ALERTES ───────────────────────────────────────────────────────────────────

exports.alertes = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT id, immatriculation, marque, modele,
        assurance_exp, controle_tech_exp, mulkiya_exp,
        CASE WHEN assurance_exp < NOW() + INTERVAL '30 days' THEN true ELSE false END AS assurance_alerte,
        CASE WHEN controle_tech_exp < NOW() + INTERVAL '30 days' THEN true ELSE false END AS controle_alerte,
        CASE WHEN mulkiya_exp < NOW() + INTERVAL '30 days' THEN true ELSE false END AS mulkiya_alerte
      FROM vehicules
      WHERE actif = true AND (
        (assurance_exp IS NOT NULL AND assurance_exp < NOW() + INTERVAL '30 days') OR
        (controle_tech_exp IS NOT NULL AND controle_tech_exp < NOW() + INTERVAL '30 days') OR
        (mulkiya_exp IS NOT NULL AND mulkiya_exp < NOW() + INTERVAL '30 days')
      )
      ORDER BY LEAST(assurance_exp, controle_tech_exp, mulkiya_exp)`);
    res.json(rows);
  } catch (err) { next(err); }
};
