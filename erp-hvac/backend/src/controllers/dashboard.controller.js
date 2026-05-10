'use strict';
const supabase = require('../config/supabase');

async function stats(req, res, next) {
  try {
    const today       = new Date().toISOString().slice(0, 10);
    const startOfMonth = today.slice(0, 7) + '-01';

    const [devisRes, interRes, factRetardRes, caRes, stockRes] = await Promise.all([
      supabase.from('devis').select('id', { count: 'exact', head: true }).eq('statut', 'envoye'),

      supabase.from('interventions')
        .select('id, numero, type, statut, date_debut, description, clients(nom, prenom, entreprise), chantiers(nom)')
        .gte('date_debut', today + 'T00:00:00Z')
        .lte('date_debut', today + 'T23:59:59Z')
        .neq('statut', 'annulee')
        .order('date_debut'),

      supabase.from('factures')
        .select('id, numero, total_ttc, montant_paye, date_echeance, clients(nom, prenom, entreprise)')
        .in('statut', ['envoyee', 'partiellement_payee'])
        .lt('date_echeance', today)
        .order('date_echeance'),

      supabase.from('factures')
        .select('total_ttc')
        .eq('statut', 'payee')
        .gte('date_facture', startOfMonth),

      supabase.from('articles')
        .select('id, reference, designation, stock_actuel, stock_minimum')
        .eq('actif', true)
        .filter('stock_actuel', 'lt', 'stock_minimum'),
    ]);

    const ca = (caRes.data || []).reduce((s, f) => s + +f.total_ttc, 0);

    res.json({
      devis_en_attente:       devisRes.count     || 0,
      interventions_aujourdhui: interRes.count   || 0,
      interventions:          interRes.data       || [],
      factures_en_retard:     factRetardRes.count || 0,
      factures_retard:        factRetardRes.data  || [],
      ca_mois:                Math.round(ca * 100) / 100,
      alertes_stock:          stockRes.data       || [],
    });
  } catch (e) { next(e); }
}

module.exports = { stats };
