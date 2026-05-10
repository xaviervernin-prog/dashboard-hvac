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

const schemaDevis = Joi.object({
  client_id:     Joi.string().uuid().required(),
  chantier_id:   Joi.string().uuid().allow(null),
  objet:         Joi.string().max(300).allow('', null),
  date_devis:    Joi.string().isoDate().default(() => new Date().toISOString().slice(0, 10)),
  date_validite: Joi.string().isoDate().allow(null),
  notes:         Joi.string().max(2000).allow('', null),
  conditions:    Joi.string().max(2000).allow('', null),
  lignes:        Joi.array().items(schemaLigne).min(1).required(),
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
    const { search = '', statut = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, +page) - 1) * Math.min(+limit, 100);

    let q = supabase
      .from('devis')
      .select('id,numero,statut,date_devis,date_validite,objet,total_ttc,created_at,clients(id,nom,prenom,entreprise,type)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (statut) q = q.eq('statut', statut);
    if (search) q = q.or(`numero.ilike.%${search}%,objet.ilike.%${search}%`);

    const { data, count, error } = await q.range(offset, offset + Math.min(+limit, 100) - 1);
    if (error) throw error;
    res.json({ data, total: count, page: +page, limit: +limit });
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('devis')
      .select('*, clients(id,nom,prenom,entreprise,type,email,telephone,adresse,emirat), chantiers(id,nom,adresse), devis_lignes(*)')
      .eq('id', req.params.id)
      .order('ordre', { referencedTable: 'devis_lignes' })
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Devis introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { error: ve, value } = schemaDevis.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { lignes, ...devisData } = value;
    const calculees = lignes.map(calcLigne);
    const totaux    = calcTotaux(calculees);
    const numero    = await getNextNumero('DEV', supabase);

    const { data: devis, error: de } = await supabase
      .from('devis').insert({ ...devisData, numero, ...totaux, created_by: req.user.id }).select().single();
    if (de) throw de;

    const { error: le } = await supabase
      .from('devis_lignes').insert(calculees.map(l => ({ ...l, devis_id: devis.id })));
    if (le) throw le;

    res.status(201).json({ ...devis, devis_lignes: calculees });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { data: existing } = await supabase
      .from('devis').select('statut').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Devis introuvable.' });
    if (existing.statut === 'accepte') {
      return res.status(409).json({ error: 'Un devis accepté ne peut plus être modifié.' });
    }

    const { error: ve, value } = schemaDevis.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { lignes, ...devisData } = value;
    const calculees = lignes.map(calcLigne);
    const totaux    = calcTotaux(calculees);

    await supabase.from('devis_lignes').delete().eq('devis_id', req.params.id);
    const { error: le } = await supabase
      .from('devis_lignes').insert(calculees.map(l => ({ ...l, devis_id: req.params.id })));
    if (le) throw le;

    const { data, error } = await supabase
      .from('devis').update({ ...devisData, ...totaux }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ ...data, devis_lignes: calculees });
  } catch (e) { next(e); }
}

async function updateStatut(req, res, next) {
  try {
    const statuts = ['brouillon', 'envoye', 'accepte', 'refuse', 'expire'];
    const { statut } = req.body;
    if (!statuts.includes(statut)) return res.status(422).json({ error: 'Statut invalide.' });

    const { data, error } = await supabase
      .from('devis').update({ statut }).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Devis introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function facturer(req, res, next) {
  try {
    const { data: devis, error: de } = await supabase
      .from('devis').select('*, devis_lignes(*)').eq('id', req.params.id).single();
    if (de || !devis) return res.status(404).json({ error: 'Devis introuvable.' });
    if (devis.statut !== 'accepte') {
      return res.status(409).json({ error: 'Seul un devis accepté peut être facturé.' });
    }

    const numero = await getNextNumero('FAC', supabase);
    const { data: facture, error: fe } = await supabase.from('factures').insert({
      numero,
      devis_id:      devis.id,
      client_id:     devis.client_id,
      chantier_id:   devis.chantier_id,
      objet:         devis.objet,
      sous_total_ht: devis.sous_total_ht,
      montant_tva:   devis.montant_tva,
      total_ttc:     devis.total_ttc,
      date_echeance: req.body.date_echeance || null,
      created_by:    req.user.id,
    }).select().single();
    if (fe) throw fe;

    const lignesFacture = (devis.devis_lignes || []).map(({ id, devis_id, created_at, ...l }) => ({
      ...l, facture_id: facture.id,
    }));
    if (lignesFacture.length > 0) {
      await supabase.from('facture_lignes').insert(lignesFacture);
    }
    res.status(201).json(facture);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { data: existing } = await supabase
      .from('devis').select('statut').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Devis introuvable.' });
    if (['accepte'].includes(existing.statut)) {
      return res.status(409).json({ error: 'Ce devis ne peut pas être supprimé.' });
    }
    await supabase.from('devis').delete().eq('id', req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { list, get, create, update, updateStatut, facturer, remove };
