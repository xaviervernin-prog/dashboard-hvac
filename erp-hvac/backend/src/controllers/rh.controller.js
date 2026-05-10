'use strict';
const supabase = require('../config/supabase');
const Joi = require('joi');

const schemaEmploye = Joi.object({
  matricule:            Joi.string().min(1).max(30).required(),
  nom:                  Joi.string().min(1).max(100).required(),
  prenom:               Joi.string().max(80).allow('', null),
  email:                Joi.string().email().allow('', null),
  telephone:            Joi.string().max(30).allow('', null),
  poste:                Joi.string().max(100).allow('', null),
  departement:          Joi.string().max(100).allow('', null),
  salaire_base:         Joi.number().min(0).allow(null),
  date_embauche:        Joi.string().isoDate().allow(null),
  type_contrat:         Joi.string().valid('cdi', 'cdd', 'interim', 'freelance').default('cdi'),
  nationalite:          Joi.string().max(60).allow('', null),
  numero_visa:          Joi.string().max(50).allow('', null),
  expiration_visa:      Joi.string().isoDate().allow(null),
  numero_passeport:     Joi.string().max(50).allow('', null),
  expiration_passeport: Joi.string().isoDate().allow(null),
});

const schemaConge = Joi.object({
  employe_id: Joi.string().uuid().required(),
  type:       Joi.string().valid('annuel', 'maladie', 'sans_solde', 'autre').required(),
  date_debut: Joi.string().isoDate().required(),
  date_fin:   Joi.string().isoDate().required(),
  nb_jours:   Joi.number().integer().positive().required(),
  motif:      Joi.string().max(500).allow('', null),
});

async function listEmployes(req, res, next) {
  try {
    const { search = '', actif = 'true' } = req.query;
    let q = supabase.from('employes')
      .select('id,matricule,nom,prenom,email,telephone,poste,departement,date_embauche,expiration_visa,expiration_passeport,actif')
      .eq('actif', actif !== 'false')
      .order('nom');
    if (search) q = q.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%,matricule.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
}

async function getEmploye(req, res, next) {
  try {
    const { data, error } = await supabase.from('employes')
      .select('*, conges(*)').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Employé introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function createEmploye(req, res, next) {
  try {
    const { error: ve, value } = schemaEmploye.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });
    const { data, error } = await supabase.from('employes')
      .insert({ ...value, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
}

async function updateEmploye(req, res, next) {
  try {
    const { error: ve, value } = schemaEmploye.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });
    const { data, error } = await supabase.from('employes')
      .update(value).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Employé introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function listConges(req, res, next) {
  try {
    const { statut = '', employe_id = '' } = req.query;
    let q = supabase.from('conges')
      .select('*, employes(nom,prenom,poste)')
      .order('created_at', { ascending: false });
    if (statut)     q = q.eq('statut', statut);
    if (employe_id) q = q.eq('employe_id', employe_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
}

async function createConge(req, res, next) {
  try {
    const { error: ve, value } = schemaConge.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });
    const { data, error } = await supabase.from('conges')
      .insert({ ...value, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
}

async function updateCongeStatut(req, res, next) {
  try {
    const statuts = ['en_attente', 'approuve', 'refuse'];
    const { statut } = req.body;
    if (!statuts.includes(statut)) return res.status(422).json({ error: 'Statut invalide.' });
    const payload = { statut };
    if (statut !== 'en_attente') payload.approved_by = req.user.id;
    const { data, error } = await supabase.from('conges')
      .update(payload).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Congé introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

module.exports = { listEmployes, getEmploye, createEmploye, updateEmploye, listConges, createConge, updateCongeStatut };
