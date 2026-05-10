'use strict';
const supabase = require('../config/supabase');
const Joi = require('joi');

const schemaVehicule = Joi.object({
  immatriculation:              Joi.string().min(1).max(20).required(),
  marque:                       Joi.string().min(1).max(50).required(),
  modele:                       Joi.string().max(80).allow('', null),
  annee:                        Joi.number().integer().min(1990).max(2100).allow(null),
  type:                         Joi.string().valid('camionnette', 'voiture', 'camion', 'moto').default('camionnette'),
  couleur:                      Joi.string().max(30).allow('', null),
  statut:                       Joi.string().valid('disponible', 'en_mission', 'en_maintenance', 'hors_service').default('disponible'),
  kilometrage:                  Joi.number().integer().min(0).default(0),
  assurance_expiration:         Joi.string().isoDate().allow(null),
  controle_technique_expiration: Joi.string().isoDate().allow(null),
  notes:                        Joi.string().max(1000).allow('', null),
});

const schemaEntretien = Joi.object({
  type:        Joi.string().min(1).max(100).required(),
  date:        Joi.string().isoDate().default(() => new Date().toISOString().slice(0, 10)),
  kilometrage: Joi.number().integer().min(0).allow(null),
  description: Joi.string().max(500).allow('', null),
  cout:        Joi.number().min(0).default(0),
  garage:      Joi.string().max(150).allow('', null),
  prochain_km: Joi.number().integer().min(0).allow(null),
});

async function list(req, res, next) {
  try {
    const { statut = '' } = req.query;
    let q = supabase.from('vehicules')
      .select('id,immatriculation,marque,modele,annee,type,couleur,statut,kilometrage,assurance_expiration,controle_technique_expiration,actif')
      .eq('actif', true).order('marque');
    if (statut) q = q.eq('statut', statut);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
}

async function get(req, res, next) {
  try {
    const { data, error } = await supabase.from('vehicules')
      .select('*, vehicule_entretiens(*)').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Véhicule introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const { error: ve, value } = schemaVehicule.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });
    const { data, error } = await supabase.from('vehicules')
      .insert({ ...value, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { error: ve, value } = schemaVehicule.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });
    const { data, error } = await supabase.from('vehicules')
      .update(value).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Véhicule introuvable.' });
    res.json(data);
  } catch (e) { next(e); }
}

async function addEntretien(req, res, next) {
  try {
    const { error: ve, value } = schemaEntretien.validate(req.body, { stripUnknown: true });
    if (ve) return res.status(422).json({ error: 'Données invalides.', details: ve.details.map(d => d.message) });
    const { data, error } = await supabase.from('vehicule_entretiens')
      .insert({ ...value, vehicule_id: req.params.id, created_by: req.user.id }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
}

module.exports = { list, get, create, update, addEntretien };
