# Changelog

All notable changes to this project are documented here.  
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### In progress
- Phase 4 — Achats / Fournisseurs / Comptabilité
- Phase 5 — Marketing & CRM (leads, campagnes, outreach email + WhatsApp)
- Phase 6 — Suggestions ERP collaboratif

---

## [0.3.0] — Phase 3 — RH & Véhicules

### Added
- **Migration 002** (`002_rh.sql`) — Tables `employes`, `conges`, `pointages`
  - Champs UAE : `numero_visa`, `visa_expiration`, `permis_conduire`, `permis_expiration`, `passeport_num`, `passeport_exp`
- **Migration 005** (`005_vehicules.sql`) — Tables `vehicules`, `entretiens_vehicule`, `pleins_carburant`
  - Champs UAE : `mulkiya_exp`, `controle_tech_exp`
- **Backend RH** — `rh.routes.js` + `rh.controller.js`
  - CRUD employés (actif/inactif, soft delete)
  - Gestion des congés (CRUD + workflow approbation : en_attente → approuvé/refusé)
  - Pointages (par employé, par date, par type d'activité)
  - `GET /rh/alertes-documents` — employés avec visa/permis/passeport expirant sous 30 jours
- **Backend Véhicules** — `vehicules.routes.js` + `vehicules.controller.js`
  - CRUD véhicules (soft delete)
  - Ajout entretiens (vidange, pneus, révision, réparation)
  - Enregistrement pleins carburant
  - `GET /vehicules/alertes` — mulkiya/assurance/contrôle technique expirant sous 30 jours
- **Frontend `rh.js`** — Module RH complet
  - Vue employés avec badges document (rouge si < 30 jours)
  - Formulaire employé complet (infos perso + documents UAE)
  - Vue congés avec workflow approbation inline
  - Vue pointages avec formulaire
- **Frontend `vehicules.js`** — Module véhicules complet
  - Cartes véhicule avec alertes documents UAE
  - Détail véhicule : historique entretiens + derniers pleins
  - Formulaires ajout entretien et plein carburant

---

## [0.2.0] — Phase 2 — Modules métier core

### Added
- **Devis** — CRUD complet, numérotation `DEV-YYYY-NNN`, PDF Puppeteer, workflow acceptation/refus, duplication, conversion en facture
- **Interventions** — Planning mensuel (calendrier + pills colorées), formulaire complet avec assignation techniciens, clôture, rapport de visite avec signature canvas (tactile + souris)
- **Factures** — CRUD, paiements partiels (statuts : brouillon → partielle → payée), barre de progression paiement, PDF avec filigrane PAYÉE, relances
- **`pdf.service.js`** — Service Puppeteer pour PDF devis, factures et rapports d'intervention
- **`interventions.js`** (frontend) — Calendrier mensuel interactif, vue jour, signature pad canvas

---

## [0.1.0] — Phase 1 — Fondations & PWA

### Added
- **Structure projet** : `erp-hvac/` avec `backend/` + `frontend/` + `nginx/`
- **Docker Compose** : backend Node.js + Nginx (sans PostgreSQL auto-hébergé — Supabase)
- **Dockerfile** backend : `node:20-alpine` + Chromium pour Puppeteer
- **`001_init_core.sql`** — Schéma fondation : `profils`, `clients`, `chantiers`, `categories_articles`, `articles`, `devis`, `devis_lignes`, `interventions`, `intervention_techniciens`, `factures`, `facture_lignes`, `paiements`, `sequences`
- **Auth Supabase** — Middleware JWT (`auth.js`), `requireRole()`, table `profils` avec rôles
- **Numérotation atomique** — `numerotation.js` avec `SELECT … FOR UPDATE` (sans doublons)
- **Frontend shell** — `app.html` avec topbar, sidebar 12 modules, panneau notifications
- **`api.js`** — Wrapper fetch avec Bearer token, redirect 401, support blob (PDF)
- **`utils.js`** — `fmt()`, `fmtDate()`, badges statuts, `showToast()`, `openModal()`, `escapeHtml()`
- **PWA** — `manifest.json` + `sw.js` (cache statique, network-first, offline fallback)
- **Modules Phase 1** — `dashboard.js`, `clients.js`, `articles.js`
- **Design system** — `base.css` extrait du prototype `hvac-v8.html` (variables CSS, bottom-sheet modals, badges, tables, toasts, responsive mobile)
