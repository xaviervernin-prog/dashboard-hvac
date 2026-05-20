const { supabase } = require('../config/supabase');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    res.json({
      token: data.session.access_token,
      user: {
        id: req.user?.id,
        nom: req.user?.nom,
        prenom: req.user?.prenom,
        role: req.user?.role,
        email
      }
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await supabase.auth.signOut();
    res.json({ message: 'Déconnecté' });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json(req.user);
}

async function changePassword(req, res, next) {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });
    }
    const { error } = await supabase.auth.admin.updateUserById(req.user.authId, { password });
    if (error) throw error;
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me, changePassword };
