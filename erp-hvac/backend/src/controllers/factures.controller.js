'use strict';
const supabase = require('../config/supabase');
const Joi      = require('joi');
const { getNextNumero } = require('../utils/numerotation');

const schemaLigne = Joi.object({
  article_id:       Joi.string().uuid().allow(null),
  designation:      Joi.string().min(1).max(300).required(),
  description:      Joi.string().max(500).allow('', null),
  quantite:         Joi.number().positive().required(),
  prix_unitaire_ht: Joi.number().min(0).required(),
  taux_tva:         Joi.number().min(0).max(100).default(5),
});

const schemaFacture = Joi.object({
  client_id:    Joi.string().uuid().required(),
  chantier_id:  Joi.string().uuid().allow(null),
  objet:        Joi.string().max(300).allow('', null),
  date_facture: Joi.string().isoDate().default(() => new Date().toISOString().slice(0, 10)),
  date_echeance: Joi.string().isoDate().allow(null),
  notes:        Joi.string().max(2000).allow('', null),
  lignes:       Joi.array().items(schemaLigne).min(1).required(),
});

const schemaPaiement = Joi.object({
  date_paiement: Joi.string().isoDate().default(() => new Date().toISOString().slice(0, 10)),
  montant:       Joi.number().positive().required(),
  mode:          Joi.string().valid('virement', 'cheque', 'especes', 'carte', 'autre').default('virement'),
  reference:     Joi.string().max(100).allow('', null),
  notes:         Joi.string().max(500).allow('', null),
});

function calcLigne(l, i) {
  const ht  = Math.round(+l.quantite * +l.prix_unitaire_ht * 100) / 100;
  const tva = Math.round(ht * (+l.taux_tva / 100) * 100) / 100;
  return { ...l, montant_ht: ht, montant_tva: tva, montant_ttc: ht + tva, ordre: i };
}

function calcTotaux(lignes) {
  const ht  = lignes.reduce((s, l) => s + l.montant_ht,  0);
  const tva = lignes.reduce((s, l) => s + l.montant_tva, 0);
  return {
    sous_total_ht: Math.round(ht  * 100) / 100,
    montant_tva:   Math.round(tva * 100) / 100,
    total_ttc:     Math.round((ht + tva) * 100) / 100,
  };
}

async function list(req, res, next) {
  try {
    const { statut = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, +page) - 1) * Math.min(+limit, 100);

    let q = supabase
      .from('factures')
      .select('id,numero,statut,date_facture,date_echeance,objet,total_ttc,montant_paye,created_at,clients(id,nom,prenom,entreprise,type)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (statut) q = q.eq('statut', statut);

    const { data, count, error } = await q.range(offset, offset + Math.min(+limit, 100) - 1);
    if (error) throw error;
    res.json({ data, total: count, page: +page, limit: +limit });
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('factures')
      .select('*, clients(id,nom,prenom,entreprise,type,email,telephone,adresse,emirat), chantiers(id,nom,adresse), facture_lignes(*), paiements(*)')
      .eq('id', req.params.id)
      .order('ordre',         { referencedTable: 'facture_lignes' })
      .order('date_paiement', { referencedTable: 'paiements' })
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Facture introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { error: ve, value } = schemaFacture.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { lignes, ...factureData } = value;
    const calculees = lignes.map(calcLigne);
    const totaux    = calcTotaux(calculees);
    const numero    = await getNextNumero('FAC', supabase);

    const { data: facture, error: fe } = await supabase
      .from('factures').insert({ ...factureData, numero, ...totaux, created_by: req.user.id }).select().single();
    if (fe) throw fe;

    await supabase.from('facture_lignes').insert(calculees.map(l => ({ ...l, facture_id: facture.id })));
    res.status(201).json(facture);
  } catch (e) { next(e); }
}

async function addPaiement(req, res, next) {
  try {
    const { error: ve, value } = schemaPaiement.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { data: facture } = await supabase
      .from('factures').select('total_ttc,montant_paye,statut').eq('id', req.params.id).single();
    if (!facture) return res.status(404).json({ error: 'Facture introuvable.' });
    if (facture.statut === 'annulee') return res.status(409).json({ error: 'Facture annulée.' });

    const { data: paiement, error: pe } = await supabase
      .from('paiements').insert({ ...value, facture_id: req.params.id, created_by: req.user.id }).select().single();
    if (pe) throw pe;

    const nouveauPaye  = Math.round((+facture.montant_paye + +paiement.montant) * 100) / 100;
    const nouveauStatut = nouveauPaye >= +facture.total_ttc
      ? 'payee'
      : nouveauPaye > 0 ? 'partiellement_payee' : facture.statut;

    await supabase.from('factures')
      .update({ montant_paye: nouveauPaye, statut: nouveauStatut }).eq('id', req.params.id);

    res.status(201).json({ paiement, statut: nouveauStatut, montant_paye: nouveauPaye });
  } catch (e) { next(e); }
}

async function updateStatut(req, res, next) {
  try {
    const statuts = ['brouillon', 'envoyee', 'partiellement_payee', 'payee', 'en_retard', 'annulee'];
    const { statut } = req.body;
    if (!statuts.includes(statut)) return res.status(422).json({ error: 'Statut invalide.' });

    const { data, error } = await supabase
      .from('factures').update({ statut }).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Facture introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

module.exports = { list, get, create, addPaiement, updateStatut };
