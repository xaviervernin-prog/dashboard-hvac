# Déploiement

## Environnements

| Environnement | URL | Branche git | Déclencheur |
|---------------|-----|-------------|-------------|
| **Production** | https://xaviervernin-prog.github.io/dashboard-hvac/app.html | `main` | Push sur `main` |
| **Staging** | https://xaviervernin-prog.github.io/dashboard-hvac/staging/app.html | `staging` | Push sur `staging` |

---

## Pipeline CI/CD

GitHub Actions gère les déploiements automatiquement.

```
Push sur staging                Push sur main
       │                               │
       ▼                               ▼
deploy-staging.yml           deploy-prod.yml
       │                               │
  Checkout +                    Checkout +
  cp app.html                   cp app.html
  _deploy/                      _deploy/
       │                               │
       ▼                               ▼
peaceiris/actions-gh-pages   peaceiris/actions-gh-pages
  destination_dir: staging       root
  keep_files: true               keep_files: true
       │                               │
       └──────────────┬────────────────┘
                      ▼
              Branche gh-pages
              ├── app.html          ← prod
              ├── index.html        ← prod
              └── staging/
                  ├── app.html      ← staging
                  └── index.html    ← staging
```

`keep_files: true` garantit que les déploiements staging et prod ne s'écrasent pas mutuellement.

---

## Configuration GitHub Pages (à faire une fois)

GitHub Pages doit être configuré pour servir depuis la branche `gh-pages` :

1. Aller sur https://github.com/xaviervernin-prog/dashboard-hvac/settings/pages
2. **Source** → `Deploy from a branch`
3. **Branch** → `gh-pages` / `/ (root)`
4. Sauvegarder

> ⚠️ **Action requise** : Cette configuration est manuelle.  
> Actuellement GitHub Pages sert depuis `main`. À migrer vers `gh-pages` pour que la pipeline CI/CD prenne effet.

---

## Workflow de déploiement — pas à pas

### Déployer une feature en staging

```bash
# 1. Partir de staging à jour
git checkout staging
git pull origin staging

# 2. Créer une branche de feature
git checkout -b feature/ma-feature

# 3. Modifier app.html
# ...

# 4. Committer
git add app.html
git commit -m "feat: description"

# 5. Merger sur staging
git checkout staging
git merge feature/ma-feature
git push origin staging
# → Déploiement automatique vers l'URL staging (~1 min)
```

### Passer en production après validation

```bash
git checkout main
git merge staging
git push origin main
# → Déploiement automatique en production (~1 min)
```

---

## Vérification du déploiement

1. Aller sur https://github.com/xaviervernin-prog/dashboard-hvac/actions
2. Vérifier que le workflow est passé (coche verte)
3. Si échec, cliquer sur le job pour voir les logs

Délai typique : **45 secondes à 2 minutes** après le push.

---

## Rollback

En cas de problème en production :

```bash
# Option 1 : Revenir au commit précédent
git checkout main
git revert HEAD
git push origin main

# Option 2 : Pointer sur un commit spécifique
git reset --hard <sha-du-commit-stable>
git push --force-with-lease origin main
```

---

## Variables d'environnement

Il n'y a pas de variables d'environnement au sens CI/CD. La configuration Supabase est dans `app.html` :

```javascript
const SUPABASE_URL = 'https://hdbyydietidgzoudlias.supabase.co';
const SUPABASE_KEY = 'eyJ...'; // Clé anon — publique par design
```

La clé `anon` est publique et destinée à être exposée côté client. La sécurité est gérée par RLS.

---

## Surveillance

- **Logs Supabase** : Dashboard → Logs → API / Auth / Postgres
- **Erreurs JS** : Console du navigateur sur l'app
- **Actions GitHub** : https://github.com/xaviervernin-prog/dashboard-hvac/actions
