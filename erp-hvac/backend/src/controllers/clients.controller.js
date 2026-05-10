'use strict';
const supabase = require('../config/supabase');
const Joi = require('joi');

const schemaClient = Joi.object({
  nom:        Joi.string().min(1).max(120).required(),
  prenom:     Joi.string().max(80).allow('', null),
  email:      Joi.string().email().allow('', null),
  telephone:  Joi.string().max(30).allow('', null),
  type:       Joi.string().valid('particulier', 'entreprise', 'copropriete').default('particulier'),
  entreprise: Joi.string().max(150).allow('', null),
  trn:        Joi.string().max(30).allow('', null),
  adresse:    Joi.string().max(300).allow('', null),
  emirat:     Joi.string().max(50).default('Dubai'),
  notes:      Joi.string().max(2000).allow('', null),
});

const schemaChantier = Joi.object({
  nom:         Joi.string().min(1).max(150).required(),
  adresse:     Joi.string().max(300).allow('', null),
  emirat:      Joi.string().max(50).default('Dubai'),
  description: Joi.string().max(1000).allow('', null),
  statut:      Joi.string().valid('en_attente', 'en_cours', 'termine').default('en_attente'),
});

const COLS = 'id,nom,prenom,email,telephone,type,entreprise,trn,adresse,emirat,notes,actif,created_at,updated_at';

async function list(req, res, next) {
  try {
    const { search = '', type = '', page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, +page) - 1) * Math.min(+limit, 100);

    let q = supabase
      .from('clients')
      .select(`${COLS}, chantiers(count)`, { count: 'exact' })
      .eq('actif', true)
      .order('nom');

    if (search) q = q.or(`nom.ilike.%${search}%,entreprise.ilike.%${search}%,email.ilike.%${search}%`);
    if (type)   q = q.eq('type', type);

    const { data, count, error } = await q.range(offset, offset + Math.min(+limit, 100) - 1);
    if (error) throw error;
    res.json({ data, total: count, page: +page, limit: +limit });
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select(`${COLS}, chantiers(id,nom,adresse,emirat,statut,actif)`)
      .eq('id', req.params.id)
      .eq('actif', true)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Client introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { error: ve, value } = schemaClient.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { data, error } = await supabase
      .from('clients').insert({ ...value, created_by: req.user.id }).select(COLS).single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { error: ve, value } = schemaClient.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { data: existing } = await supabase
      .from('clients').select('id').eq('id', req.params.id).eq('actif', true).single();
    if (!existing) return res.status(404).json({ error: 'Client introuvable.' });

    const { data, error } = await supabase
      .from('clients').update(value).eq('id', req.params.id).select(COLS).single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { data: existing } = await supabase
      .from('clients').select('id').eq('id', req.params.id).eq('actif', true).single();
    if (!existing) return res.status(404).json({ error: 'Client introuvable.' });

    const { error } = await supabase.from('clients').update({ actif: false }).eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
}

async function createChantier(req, res, next) {
  try {
    const { error: ve, value } = schemaChantier.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { data: client } = await supabase
      .from('clients').select('id').eq('id', req.params.id).eq('actif', true).single();
    if (!client) return res.status(404).json({ error: 'Client introuvable.' });

    const { data, error } = await supabase
      .from('chantiers').insert({ ...value, client_id: req.params.id, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
}

async function updateChantier(req, res, next) {
  try {
    const { error: ve, value } = schemaChantier.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });

    const { data, error } = await supabase
      .from('chantiers').update(value)
      .eq('id', req.params.chantierId).eq('client_id', req.params.id)
      .select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Chantier introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

module.exports = { list, get, create, update, remove, createChantier, updateChantier };
