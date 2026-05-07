const { db } = require('../config/supabase');

async function stats(req, res, next) {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [ca, devisEnAttente, interventionsJour, facturesRetard, stockAlertes] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(montant_ttc),0)::numeric AS total FROM factures WHERE statut='payee' AND date_emission >= date_trunc('month', NOW())`),
      db.query(`SELECT COUNT(*)::int AS total FROM devis WHERE statut='en_attente'`),
      db.query(`SELECT COUNT(*)::int AS total FROM interventions WHERE date_intervention=$1 AND statut='planifiee'`, [today]),
      db.query(`SELECT COUNT(*)::int AS total FROM factures WHERE statut IN ('en_attente','partielle') AND date_echeance < $1`, [today]),
      db.query(`SELECT COUNT(*)::int AS total FROM articles WHERE actif=true AND stock_actuel <= stock_minimum`)
    ]);

    res.json({
      ca_mois: ca.rows[0].total,
      devis_en_attente: devisEnAttente.rows[0].total,
      interventions_aujourd_hui: interventionsJour.rows[0].total,
      factures_en_retard: facturesRetard.rows[0].total,
      stock_alertes: stockAlertes.rows[0].total
    });
  } catch (err) { next(err); }
}

module.exports = { stats };
