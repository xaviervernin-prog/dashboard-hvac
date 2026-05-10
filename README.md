# HVAC Dashboard — Dubai

Dashboard de gestion pour entreprise HVAC (climatisation, ventilation, chauffage) basé à Dubaï.

[![CI](https://github.com/xaviervernin-prog/dashboard-hvac/actions/workflows/ci.yml/badge.svg)](https://github.com/xaviervernin-prog/dashboard-hvac/actions/workflows/ci.yml)

## Stack

| Couche | Technologie |
|--------|-------------|
| Backend | FastAPI 0.115 + Pydantic v2 (Python 3.12) |
| Base de données | Supabase (PostgreSQL 15) |
| Frontend | Vanilla JS + PWA installable iOS/Android |
| Infra | Docker, VPS Hostinger, CI/CD GitHub Actions |

## Architecture

```
dashboard-hvac/
├── backend/
│   ├── app/
│   │   ├── config.py              # Settings pydantic-settings, env-based
│   │   ├── database.py            # Injection client Supabase
│   │   ├── main.py                # App factory + routes statiques + SW
│   │   ├── core/
│   │   │   ├── exceptions.py      # Handlers HTTP centralisés
│   │   │   └── logging.py         # Structured logging
│   │   └── modules/
│   │       ├── agenda/            # router · schemas · service
│   │       ├── articles/
│   │       ├── clients/
│   │       ├── devis/
│   │       └── facturation/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── tests/
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── static/
│   │   ├── css/main.css
│   │   ├── js/
│   │   │   ├── api.js             # Client API centralisé
│   │   │   ├── app.js             # Navigation, helpers, SW registration
│   │   │   └── modules/           # Un fichier JS par module métier
│   │   ├── icons/icon.svg
│   │   ├── manifest.json          # PWA manifest
│   │   └── sw.js                  # Service Worker
│   └── templates/index.html
├── docker-compose.yml             # Production (port 8000)
├── docker-compose.test.yml        # Test (port 8001)
├── Dockerfile
├── Makefile
└── railway.json
```

## Démarrage rapide

### Prérequis

- Python 3.12+
- Docker + Docker Compose
- Un projet Supabase (deux recommandés : production + test)

### Installation locale

```bash
git clone https://github.com/xaviervernin-prog/dashboard-hvac.git
cd dashboard-hvac

cp .env.example .env
# Éditer .env avec vos clés Supabase

make dev
```

L'API est disponible sur `http://localhost:8000`.  
La doc interactive (debug uniquement) : `http://localhost:8000/api/docs`

### Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `SUPABASE_URL` | URL du projet Supabase | ✅ |
| `SUPABASE_KEY` | Clé anon ou service role | ✅ |
| `SECRET_KEY` | Clé JWT — générer : `openssl rand -hex 32` | ✅ |
| `ENVIRONMENT` | `production` ou `test` | production |
| `DEBUG` | Active `/api/docs` et les CORS libres | false |

## Commandes

```bash
make dev          # Backend avec hot-reload (port 8000)
make test         # Tests pytest + couverture
make lint         # Vérification statique ruff

make prod         # Docker production (port 8000)
make prod-stop    # Arrêter la production
make prod-logs    # Logs temps réel

make test-env     # Docker environnement test (port 8001)
make build        # Build image Docker seule
```

## Modules API

Chaque module suit le pattern `router.py` / `schemas.py` / `service.py`.

| Module | Endpoint de base | Description |
|--------|-----------------|-------------|
| Clients | `/api/v1/clients` | Gestion clients (actif / prospect / inactif) |
| Articles | `/api/v1/articles` | Catalogue produits + catégories |
| Devis | `/api/v1/devis` | Devis numérotés automatiquement (`DEV-0001`) |
| Facturation | `/api/v1/facturation` | Factures (`FAC-0001`) + statistiques |
| Agenda | `/api/v1/agenda` | Interventions planifiées |

## Base de données

Appliquer la migration initiale dans le SQL Editor de Supabase :

```
backend/migrations/001_initial_schema.sql
```

Contenu : tables, triggers `updated_at`, séquences de numérotation, Row Level Security activé, index de performance.

## Déploiement

### VPS (production)

```bash
# Sur le VPS — première installation
git clone https://github.com/xaviervernin-prog/dashboard-hvac.git /opt/hvac-dashboard
cd /opt/hvac-dashboard
cp .env.example .env.production
# Remplir .env.production

make prod
```

Le déploiement continu se fait via GitHub Actions sur chaque merge dans `main` (voir `.github/workflows/deploy-vps.yml`).

### Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `TEST_SUPABASE_URL` | URL Supabase projet test (pour CI) |
| `TEST_SUPABASE_KEY` | Clé Supabase projet test (pour CI) |
| `VPS_HOST` | IP ou hostname du VPS |
| `VPS_USER` | Utilisateur SSH (ex: `ubuntu`) |
| `VPS_SSH_KEY` | Clé privée SSH (contenu complet) |

## PWA — Installation iPhone

1. Ouvrir l'URL dans Safari
2. Partager → "Sur l'écran d'accueil"
3. L'app s'installe comme une app native

## Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md).
