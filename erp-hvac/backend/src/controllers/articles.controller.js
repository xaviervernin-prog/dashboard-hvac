'use strict';
const supabase = require('../config/supabase');
const Joi = require('joi');

const schema = Joi.object({
  reference:      Joi.string().min(1).max(50).required(),
  designation:    Joi.string().min(1).max(200).required(),
  description:    Joi.string().max(1000).allow('', null),
  categorie_id:   Joi.string().uuid().allow(null),
  prix_vente_ht:  Joi.number().min(0).required(),
  prix_achat_ht:  Joi.number().min(0).default(0),
  stock_actuel:   Joi.number().default(0),
  stock_minimum:  Joi.number().min(0).default(0),
  unite:          Joi.string().max(20).default('u'),
});

async function list(req, res, next) {
  try {
    const { search = '', categorie = '', alerte = '', page = 1, limit = 100 } = req.query;
    const offset = (Math.max(1, +page) - 1) * Math.min(+limit, 200);

    let q = supabase
      .from('articles')
      .select('id,reference,designation,prix_vente_ht,stock_actuel,stock_minimum,unite,actif,categories_article(id,nom)', { count: 'exact' })
      .eq('actif', true)
      .order('designation');

    if (search)   q = q.or(`designation.ilike.%${search}%,reference.ilike.%${search}%`);
    if (categorie) q = q.eq('categorie_id', categorie);

    const { data, count, error } = await q.range(offset, offset + Math.min(+limit, 200) - 1);
    if (error) throw error;

    const result = alerte === '1'
      ? (data || []).filter(a => +a.stock_actuel < +a.stock_minimum)
      : data;

    res.json({ data: result, total: alerte === '1' ? result.length : count, page: +page, limit: +limit });
  } catch (e) { next(e); }
}

async function listCategories(req, res, next) {
  try {
    const { data, error } = await supabase.from('categories_article').select('*').order('nom');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('articles').select('*, categories_article(id,nom)').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Article introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { error: ve, value } = schema.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { data, error } = await supabase
      .from('articles').insert({ ...value, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { error: ve, value } = schema.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { data, error } = await supabase
      .from('articles').update(value).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Article introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { error } = await supabase.from('articles').update({ actif: false }).eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { list, listCategories, get, create, update, remove };
