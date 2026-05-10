'use strict';
const supabase = require('../config/supabase');
const Joi      = require('joi');
const { getNextNumero } = require('../utils/numerotation');

const schemaArticle = Joi.object({
  article_id:       Joi.string().uuid().allow(null),
  designation:      Joi.string().min(1).max(300).required(),
  quantite:         Joi.number().positive().default(1),
  prix_unitaire_ht: Joi.number().min(0).default(0),
});

const schema = Joi.object({
  client_id:      Joi.string().uuid().required(),
  chantier_id:    Joi.string().uuid().allow(null),
  type:           Joi.string().valid('installation', 'maintenance', 'depannage', 'renovation').required(),
  date_debut:     Joi.string().isoDate().required(),
  date_fin_prevue: Joi.string().isoDate().allow(null),
  description:    Joi.string().max(2000).allow('', null),
  notes:          Joi.string().max(2000).allow('', null),
  articles:       Joi.array().items(schemaArticle).default([]),
});

async function list(req, res, next) {
  try {
    const { statut = '', type = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, +page) - 1) * Math.min(+limit, 100);

    let q = supabase
      .from('interventions')
      .select('id,numero,type,statut,date_debut,date_fin_prevue,date_fin_reelle,description,clients(id,nom,prenom,entreprise),chantiers(id,nom)', { count: 'exact' })
      .order('date_debut', { ascending: false });

    if (statut) q = q.eq('statut', statut);
    if (type)   q = q.eq('type',   type);

    const { data, count, error } = await q.range(offset, offset + Math.min(+limit, 100) - 1);
    if (error) throw error;
    res.json({ data, total: count, page: +page, limit: +limit });
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('interventions')
      .select('*, clients(id,nom,prenom,entreprise,telephone,email), chantiers(id,nom,adresse), intervention_articles(*)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Intervention introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { error: ve, value } = schema.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { articles, ...interventionData } = value;
    const numero = await getNextNumero('INT', supabase);

    const { data: intervention, error: ie } = await supabase
      .from('interventions').insert({ ...interventionData, numero, created_by: req.user.id }).select().single();
    if (ie) throw ie;

    if (articles.length > 0) {
      await supabase.from('intervention_articles')
        .insert(articles.map(a => ({ ...a, intervention_id: intervention.id })));
    }
    res.status(201).json(intervention);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { articles, ...fields } = req.body;
    const { data, error } = await supabase
      .from('interventions').update(fields).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Intervention introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function updateStatut(req, res, next) {
  try {
    const statuts = ['planifiee', 'en_cours', 'terminee', 'annulee'];
    const { statut, rapport, date_fin_reelle } = req.body;
    if (!statuts.includes(statut)) return res.status(422).json({ error: 'Statut invalide.' });

    const payload = { statut };
    if (rapport) payload.rapport = rapport;
    if (statut === 'terminee') payload.date_fin_reelle = date_fin_reelle || new Date().toISOString();

    const { data, error } = await supabase
      .from('interventions').update(payload).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Intervention introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

module.exports = { list, get, create, update, updateStatut };
