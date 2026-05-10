'use strict';
const supabase = require('../config/supabase');

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant.' });
  }

  const token = header.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Session invalide ou expirée.' });
  }

  const { data: profil, error: pe } = await supabase
    .from('profils')
    .select('id, nom, prenom, role, actif')
    .eq('id', user.id)
    .single();

  if (pe || !profil) {
    return res.status(401).json({ error: 'Profil introuvable.' });
  }
  if (!profil.actif) {
    return res.status(403).json({ error: 'Compte désactivé. Contactez un administrateur.' });
  }

  req.user = { id: user.id, email: user.email, ...profil };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission insuffisante.' });
    }
    next();
  };
}

module.exports = { auth, requireRole };
