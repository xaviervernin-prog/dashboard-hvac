'use strict';
const supabase = require('../config/supabase');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });

    const { data: profil } = await supabase
      .from('profils').select('nom, prenom, role, actif').eq('id', data.user.id).single();

    if (!profil?.actif) return res.status(403).json({ error: 'Compte désactivé.' });

    res.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at:    data.session.expires_at,
      user: { id: data.user.id, email: data.user.email, ...profil },
    });
  } catch (e) { next(e); }
}

async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter.' });
    res.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at:    data.session.expires_at,
    });
  } catch (e) { next(e); }
}

async function me(req, res) {
  res.json(req.user);
}

module.exports = { login, refresh, me };
