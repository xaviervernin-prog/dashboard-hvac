'use strict';

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const ts = new Date().toISOString();
  console.error(`[${ts}] ${req.method} ${req.path} — ${err.message}`);

  // Contraintes PostgreSQL
  if (err.code === '23505') return res.status(409).json({ error: 'Cette référence existe déjà.' });
  if (err.code === '23503') return res.status(409).json({ error: 'Référence liée introuvable (contrainte FK).' });
  if (err.code === '23514') return res.status(422).json({ error: 'Valeur en dehors des contraintes autorisées.' });

  const status  = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Erreur serveur interne.';
  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.path} introuvable.` });
}

module.exports = { errorHandler, notFound };
