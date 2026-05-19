# Guide de contribution

## Branches

| Branche | Rôle | Déploiement automatique |
|---------|------|------------------------|
| `main` | Production | ✅ → GitHub Pages `/` |
| `staging` | Recette / validation | ✅ → GitHub Pages `/staging/` |
| `feature/*` | Développement en cours | ❌ (déploiement manuel si besoin) |
| `fix/*` | Corrections de bugs | ❌ |
| `claude/*` | Branches de travail Claude Code | ❌ |

---

## Workflow standard

```
feature/ma-fonctionnalite
        │
        ▼
    staging  ──── validation métier ────▶  main (prod)
```

### 1. Créer une branche de travail

```bash
git checkout staging
git pull origin staging
git checkout -b feature/nom-de-la-fonctionnalite
```

### 2. Développer et committer

```bash
git add app.html
git commit -m "feat: description courte"
```

Convention de commit ([Conventional Commits](https://www.conventionalcommits.org/)) :

| Préfixe | Usage |
|---------|-------|
| `feat:` | Nouvelle fonctionnalité |
| `fix:` | Correction de bug |
| `style:` | Changement CSS/UI sans impact logique |
| `refactor:` | Refactoring sans nouveau comportement |
| `docs:` | Documentation uniquement |
| `chore:` | Tâches techniques (CI, deps…) |

### 3. Déployer en staging pour validation

```bash
git checkout staging
git merge feature/nom-de-la-fonctionnalite
git push origin staging
```

→ GitHub Actions déploie automatiquement sur l'URL staging.  
→ Tester sur https://xaviervernin-prog.github.io/dashboard-hvac/staging/app.html

### 4. Mise en production après validation

```bash
git checkout main
git merge staging
git push origin main
```

→ GitHub Actions déploie automatiquement en production.

---

## Règles

- **Ne jamais pousser directement sur `main`** sans validation staging préalable.
- **Toujours tester le golden path** (connexion → dashboard → créer un devis) avant de merger en prod.
- Les anciennes versions de fichiers (`hvac-v6-fresh.html`, `hvac-v7.html`, etc.) ne doivent pas être modifiées — elles servent d'historique.

---

## Structure des fichiers

```
dashboard-hvac/
├── .github/
│   └── workflows/
│       ├── deploy-prod.yml       # CI/CD → main → prod
│       └── deploy-staging.yml    # CI/CD → staging → staging
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
├── app.html                      # Application complète (SPA)
├── index.html                    # Redirect → app.html
├── CLAUDE.md                     # Contexte Claude Code
├── CONTRIBUTING.md               # Ce fichier
└── README.md
```

---

## Travailler avec Claude Code

Ce projet est activement développé avec Claude Code. La branche de travail Claude est préfixée `claude/`.

Le fichier [CLAUDE.md](./CLAUDE.md) contient tout le contexte nécessaire pour démarrer une session.

Commande pour démarrer une session en ayant le contexte chargé :
```bash
claude  # CLAUDE.md est lu automatiquement au démarrage
```
