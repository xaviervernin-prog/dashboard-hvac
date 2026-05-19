# Contexte projet — Claude Code

Ce fichier est lu automatiquement au démarrage de chaque session Claude Code.  
Il contient tout le contexte nécessaire pour reprendre le travail sans questions préalables.

---

## Projet

**HVAC Dubai ERP** — Application de gestion interne pour une société de climatisation à Dubaï.  
Propriétaire : Xavier Vernin (non-technique, communique en français).

---

## Stack

- **Frontend** : SPA vanilla HTML/CSS/JS — tout dans `app.html` (fichier unique, ~1160 lignes)
- **Backend** : Supabase (projet `hdbyydietidgzoudlias`, région `eu-north-1`)
- **Auth** : Supabase Auth — email + password opérationnel, Google SSO bouton présent mais nécessite config dashboard
- **Hébergement** : GitHub Pages depuis branche `gh-pages` (pipeline CI/CD) ou `main` (configuration actuelle)
- **CI/CD** : GitHub Actions — push sur `staging` → staging, push sur `main` → prod

---

## URLs

| | URL |
|-|-----|
| Production | https://xaviervernin-prog.github.io/dashboard-hvac/app.html |
| Staging | https://xaviervernin-prog.github.io/dashboard-hvac/staging/app.html |
| Supabase Dashboard | https://supabase.com/dashboard/project/hdbyydietidgzoudlias |
| GitHub repo | https://github.com/xaviervernin-prog/dashboard-hvac |

---

## Compte utilisateur en place

- Email : `xavier.vernin@gmail.com`
- Mot de passe temporaire : `Hvac2026!` (à changer)
- Rôle : `administrateur`

---

## Branches git

| Branche | Rôle |
|---------|------|
| `main` | Production |
| `staging` | Recette / validation avant prod |
| `claude/review-erp-status-oyhQW` | Branche de travail Claude courante |

**Workflow** : développer sur `staging` (ou branche feature) → valider → merger sur `main`.  
Ne jamais pousser directement sur `main` sans validation staging.

---

## Configuration Supabase dans app.html

```javascript
const SUPABASE_URL = 'https://hdbyydietidgzoudlias.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnl5ZGlldGlkZ3pvdWRsaWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMjI5MTgsImV4cCI6MjA5MTc5ODkxOH0.91P57AfDLHFNYg2GXv-ubEtjiiRNDfedIhdh6yS8OXY';
```

La clé `anon` est publique par design Supabase. La sécurité est gérée par RLS.

---

## Modules applicatifs

6 modules : Dashboard, Clients, Articles, Interventions (liste + calendrier), Devis (avec lignes), Factures (avec lignes).

TVA UAE : **5%** sur toutes les lignes. Format montants : AED.

Numérotation : `INT-YYYY-NNN`, `DEV-YYYY-NNN`, `FAC-YYYY-NNN`, `ART-NNNN`.

---

## État de sécurité

- ✅ RLS activé sur toutes les tables — politique `authenticated_only` (auth.uid() requis)
- ✅ Trigger `handle_new_user()` avec `SECURITY DEFINER SET search_path = public`
- ⚠️ Supabase Site URL pointe encore sur `localhost:3000` dans Auth → URL Configuration (bloque magic link si réactivé)
- ⚠️ Google SSO : bouton présent dans l'app, mais provider non activé dans Supabase dashboard

---

## Décisions techniques importantes

### Pourquoi un seul fichier
Choix délibéré pour GitHub Pages (pas de serveur), maintenance simple, pas de build step. Acceptable jusqu'à ~1500 lignes.

### Pourquoi pas de magic link
Tentative initiale de magic link échouée (trigger DB error + Site URL localhost). Abandonnée au profit d'email + password, plus fiable sans config Supabase dashboard.

### RLS : correction critique
La configuration initiale avait `allow_all: true` (accès non authentifié). Corrigée en `authenticated_only` avec `TO authenticated`. Ne jamais revenir à `allow_all`.

### Trigger handle_new_user
Doit impérativement avoir `SECURITY DEFINER SET search_path = public` sinon erreur "Database error saving new user" à l'inscription.

---

## Roadmap V3 (non commencé)

- [ ] Rôles utilisateurs : admin / technicien / comptable / commercial (table `profils.role` existe)
- [ ] Module RH : employés, congés, véhicules
- [ ] Génération PDF devis/factures (jsPDF côté client)
- [ ] Google SSO (config Supabase dashboard requise par Xavier)
- [ ] Notifications (interventions du jour par email ?)

---

## Fichiers à ne pas modifier

Les fichiers `hvac-v6-fresh.html`, `hvac-v7.html`, `hvac-v8.html`, `dashboard-hvac-dubai.html` sont des archives historiques. Ne pas modifier, ne pas supprimer.

---

## Commandes utiles

```bash
# Voir l'état du repo
git log --oneline -10
git status

# Déployer en staging
git checkout staging && git merge main && git push origin staging

# Déployer en prod
git checkout main && git merge staging && git push origin main

# Voir les Actions en cours
# → https://github.com/xaviervernin-prog/dashboard-hvac/actions
```
