# ERP Dubai — Dépannage & Rénovation

> Système ERP cloud pour la gestion d'une activité de dépannage et rénovation à Dubai, UAE.  
> Stack : Node.js · Express · Supabase (PostgreSQL + Auth + Storage) · Vanilla JS PWA

---

## Sommaire

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation locale (développement)](#installation-locale)
- [Variables d'environnement](#variables-denvironnement)
- [Déploiement production](#déploiement-production)
- [Déploiement staging](#déploiement-staging)
- [Migrations base de données](#migrations-base-de-données)
- [Modules](#modules)
- [Rôles utilisateurs](#rôles-utilisateurs)
- [API — Points d'entrée](#api--points-dentrée)
- [PWA — Installation mobile](#pwa--installation-mobile)
- [Contribution](#contribution)
- [Changelog](#changelog)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser / PWA (iOS · Android · Desktop)            │
│  HTML + CSS + Vanilla JS                            │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
          ┌──────────▼───────────┐
          │  VPS (Nginx)         │  ← Fichiers statiques frontend
          │  VPS (Node.js API)   │  ← /api/v1/*
          └──────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │  Supabase               │
        │  ├ PostgreSQL           │  ← Données
        │  ├ Auth (JWT)           │  ← Sessions
        │  └ Storage              │  ← Fichiers, signatures, logos
        └─────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │  Services externes      │
        │  ├ Resend (Email)       │
        │  └ Twilio (WhatsApp)    │
        └─────────────────────────┘
```

**Pas de PostgreSQL auto-hébergé** — Supabase gère la base de données, l'authentification et le stockage des fichiers. Docker Compose ne contient que le backend Node.js et Nginx.

---

## Prérequis

| Outil | Version minimale |
|---|---|
| Node.js | 20 LTS |
| Docker & Docker Compose | 24+ |
| Compte Supabase | — |
| Compte Resend (email) | — |
| Compte Twilio (WhatsApp) | Optionnel — Phase 5 |

---

## Installation locale

```bash
# 1. Cloner le dépôt
git clone https://github.com/xaviervernin-prog/dashboard-hvac.git
cd dashboard-hvac/erp-hvac

# 2. Configurer les variables d'environnement
cp .env.example .env
# → Remplir .env avec les clés Supabase (voir section Variables)

# 3. Lancer en développement
cd backend
npm install
npm run dev

# 4. Ouvrir le frontend
# Servir frontend/ avec n'importe quel serveur statique :
npx serve ../frontend -p 3001
# → http://localhost:3001
```

**Note** : En développement, le backend écoute sur `http://localhost:3000` et le frontend sur `http://localhost:3001`. Le fichier `frontend/js/api.js` utilise `window.location.origin` pour l'URL de base — en dev, configurer `API_BASE` via une variable ou patcher temporairement.

---

## Variables d'environnement

Copier `.env.example` → `.env` et remplir toutes les valeurs :

```env
# ── Supabase ──────────────────────────────────────────
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Clé service role (jamais exposée côté client)
SUPABASE_ANON_KEY=eyJ...               # Clé publique (utilisée dans le frontend Auth JS)
DATABASE_URL=postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres

# ── JWT ───────────────────────────────────────────────
JWT_SECRET=<même secret que Supabase Auth JWT>

# ── Email — Resend ────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM=noreply@votredomaine.ae

# ── WhatsApp — Twilio ─────────────────────────────────
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# ── App ───────────────────────────────────────────────
NODE_ENV=production
PORT=3000
```

### Où trouver les clés Supabase

1. Dashboard Supabase → **Project Settings** → **API**
2. `SUPABASE_URL` = Project URL
3. `SUPABASE_ANON_KEY` = anon / public key
4. `SUPABASE_SERVICE_ROLE_KEY` = service_role key (⚠️ garder secret)
5. `DATABASE_URL` = **Project Settings → Database → Connection string** (mode `URI`)

---

## Déploiement production

```bash
# Sur le VPS (Ubuntu 22.04 recommandé)

# 1. Copier les fichiers
git clone https://github.com/xaviervernin-prog/dashboard-hvac.git /opt/erp-hvac
cd /opt/erp-hvac/erp-hvac

# 2. Créer et remplir .env
cp .env.example .env && nano .env

# 3. SSL via Certbot
apt install certbot -y
certbot certonly --standalone -d erp.votredomaine.ae

# 4. Lancer
docker compose up -d --build

# 5. Vérifier
docker compose ps
docker compose logs backend --tail=50
```

### Mise à jour en production

```bash
cd /opt/erp-hvac
git pull origin main
docker compose up -d --build backend
docker compose logs backend --follow
```

---

## Déploiement staging

Un environnement staging dédié permet de tester les nouvelles features avant la mise en production.

```bash
# Depuis la branche de développement
git checkout claude/plan-erp-system-RLLpd

cd erp-hvac

# Lancer le stack staging (port 8080, base de données staging Supabase)
docker compose -f docker-compose.staging.yml up -d --build

# Accès : http://localhost:8080
```

Le fichier `docker-compose.staging.yml` utilise :
- `NODE_ENV=staging`
- Un projet Supabase dédié (staging)
- Pas de SSL (port 8080 en HTTP local ou via tunnel)

Voir [docker-compose.staging.yml](./docker-compose.staging.yml) pour la configuration complète.

---

## Migrations base de données

Les migrations SQL sont dans `backend/src/db/migrations/`. Elles doivent être exécutées **dans l'ordre** via le dashboard Supabase ou la CLI Supabase.

| Fichier | Contenu | Phase |
|---|---|---|
| `001_init_core.sql` | Core : profils, clients, articles, devis, factures, interventions, séquences | 1–2 |
| `002_rh.sql` | RH : employes, conges, pointages | 3 |
| `003_achats.sql` | Achats : fournisseurs, bons de commande, réceptions | 4 |
| `004_comptabilite.sql` | Comptabilité : comptes bancaires, transactions, TVA | 4 |
| `005_vehicules.sql` | Véhicules : parc, entretiens, carburant | 3 |
| `006_marketing_crm.sql` | Marketing : leads, campagnes, CRM, outreach | 5 |
| `007_suggestions.sql` | Suggestions ERP collaboratif | 6 |

### Via Supabase CLI

```bash
supabase db push --db-url "postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres"
```

### Via le dashboard Supabase

Dashboard → **SQL Editor** → coller le contenu de chaque fichier → Run.

---

## Modules

| # | Module | Rôles autorisés | Phase |
|---|---|---|---|
| 1 | **Dashboard** | Tous | 1 |
| 2 | **Clients & Chantiers** | Admin, Commercial | 1 |
| 3 | **Articles & Stock** | Admin, Commercial | 1 |
| 4 | **Devis** | Admin, Commercial | 2 |
| 5 | **Interventions** | Admin, Commercial, Technicien | 2 |
| 6 | **Facturation** | Admin, Commercial, Comptable | 2 |
| 7 | **RH / Équipe** | Admin, Commercial | 3 |
| 8 | **Véhicules** | Admin, Commercial | 3 |
| 9 | **Achats / Fournisseurs** | Admin, Comptable | 4 |
| 10 | **Comptabilité / Trésorerie** | Admin, Comptable | 4 |
| 11 | **Marketing & CRM** | Admin, Commercial | 5 |
| 12 | **Suggestions ERP** | Tous | 6 |

---

## Rôles utilisateurs

| Rôle | Description | Périmètre |
|---|---|---|
| `administrateur` | Accès complet à tous les modules | Tout |
| `commercial` | Clients, devis, interventions, CRM, marketing | Pas RH salaires, pas comptabilité |
| `comptable` | Factures, trésorerie, TVA, achats | Pas RH, pas config |
| `technicien` | **Uniquement ses propres interventions** (filtrage server-side) | Lecture + rapport + signature |

Les rôles sont gérés dans la table `profils` (Supabase), liée à `auth.users` via `user_id`.

---

## API — Points d'entrée

Base URL : `https://erp.votredomaine.ae/api/v1`

Toutes les routes nécessitent un header `Authorization: Bearer <supabase_jwt>`.

| Méthode | Route | Description |
|---|---|---|
| GET | `/auth/me` | Profil + rôle de l'utilisateur connecté |
| GET/POST | `/clients` | Liste / créer client |
| GET/PUT/DELETE | `/clients/:id` | Détail / modifier / supprimer |
| GET/POST | `/articles` | Catalogue |
| GET/POST | `/devis` | Liste / créer devis |
| POST | `/devis/:id/accepter` | Accepter un devis |
| POST | `/devis/:id/facturer` | Créer facture depuis devis |
| GET | `/devis/:id/pdf` | Télécharger PDF devis |
| GET/POST | `/interventions` | Planning / créer intervention |
| POST | `/interventions/:id/rapport` | Saisir rapport + signature |
| GET | `/interventions/:id/pdf` | PDF rapport |
| GET/POST | `/factures` | Facturation |
| POST | `/factures/:id/paiements` | Enregistrer un paiement |
| GET | `/factures/:id/pdf` | PDF facture |
| GET | `/rh/employes` | Liste employés |
| GET | `/rh/alertes-documents` | Docs expirant sous 30 jours |
| GET/POST | `/rh/conges` | Congés |
| PATCH | `/rh/conges/:id/statut` | Approuver / refuser |
| GET/POST | `/rh/pointages` | Pointages |
| GET/POST | `/vehicules` | Parc véhicules |
| POST | `/vehicules/:id/entretiens` | Ajouter entretien |
| POST | `/vehicules/:id/pleins` | Enregistrer plein carburant |
| GET | `/vehicules/alertes` | Docs véhicules expirant sous 30 jours |
| GET | `/dashboard` | KPIs dashboard (stats globales) |

---

## PWA — Installation mobile

L'application est une **Progressive Web App** installable sans app store :

1. Ouvrir `https://erp.votredomaine.ae` dans Safari (iOS) ou Chrome (Android)
2. Appuyer sur **Partager** → **Sur l'écran d'accueil**
3. L'icône apparaît comme une app native

Fonctionnalités PWA :
- Icône native + splash screen
- Mode standalone (sans barre d'URL)
- Cache des assets statiques (chargement rapide)
- Consultation hors-ligne des données en cache

---

## Contribution

Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour les conventions de branches, commits, et process de review.

---

## Changelog

Voir [CHANGELOG.md](./CHANGELOG.md) pour l'historique des versions.
