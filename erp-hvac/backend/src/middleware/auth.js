const { supabase, db } = require('../config/supabase');

async function verify(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  const token = header.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  const { rows } = await db.query(
    'SELECT id, nom, prenom, role, actif FROM profils WHERE auth_uid = $1',
    [user.id]
  );
  if (!rows.length || !rows[0].actif) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  req.user = { ...rows[0], authId: user.id, email: user.email };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Rôle insuffisant' });
    }
    next();
  };
}

module.exports = { verify, requireRole };
