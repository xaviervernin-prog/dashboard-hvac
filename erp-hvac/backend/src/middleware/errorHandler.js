function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Doublon : cet enregistrement existe déjà' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Référence invalide vers un enregistrement lié' });
  }

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Erreur serveur interne'
    : err.message || 'Erreur serveur interne';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
