# HVAC Dubai ERP

Application de gestion interne pour une entreprise de climatisation basée à Dubaï.  
SPA (Single-Page Application) statique, hébergée sur GitHub Pages, connectée à Supabase.

---

## Environnements

| Env | URL | Branche |
|-----|-----|---------|
| **Production** | https://xaviervernin-prog.github.io/dashboard-hvac/app.html | `main` |
| **Staging** | https://xaviervernin-prog.github.io/dashboard-hvac/staging/app.html | `staging` |

Tout push sur `main` ou `staging` déclenche automatiquement un déploiement via GitHub Actions.

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | HTML/CSS/JS vanilla — fichier unique `app.html` |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth (email + mot de passe, Google SSO prêt) |
| Hébergement | GitHub Pages |
| CI/CD | GitHub Actions |
| Police | Inter (Google Fonts) |

---

## Modules applicatifs

- **Dashboard** — KPIs, interventions du jour, factures en retard
- **Clients** — CRUD, filtre par type et émirat
- **Articles** — Catalogue avec catégories et gestion de stock
- **Interventions** — Liste + vue calendrier mensuel
- **Devis** — Lignes de devis, calcul TVA 5% UAE automatique
- **Factures** — Gestion des paiements, statuts, lignes de facturation

---

## Démarrage rapide

Aucun environnement local requis. L'application est un fichier HTML statique.

```bash
git clone https://github.com/xaviervernin-prog/dashboard-hvac.git
cd dashboard-hvac
# Servir localement :
npx serve .
# Ou simplement ouvrir app.html dans un navigateur
```

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour le workflow de contribution complet.

---

## Documentation

| Document | Contenu |
|----------|---------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Stack, structure du code, décisions techniques |
| [docs/DATABASE.md](./docs/DATABASE.md) | Schéma Supabase, RLS, authentification |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Pipeline CI/CD, environnements, procédures |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Workflow Git, conventions, PR process |
| [CLAUDE.md](./CLAUDE.md) | Contexte pour sessions Claude Code |
