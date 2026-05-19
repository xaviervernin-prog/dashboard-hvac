# Implementation Plan: User Roles & Access Control

**Branch**: `claude/install-spec-kit-5dGNY` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-user-roles/spec.md`

## Summary

Ajouter un système de contrôle d'accès basé sur 4 rôles (administrateur,
technicien, comptable, commercial) en lisant la table `profils` existante dans
Supabase. L'interface adapte le menu latéral et bloque les modules non autorisés
selon le rôle. Un panneau admin permet de gérer les rôles des utilisateurs.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2020, HTML5, CSS3

**Primary Dependencies**: Supabase JS SDK v2 (CDN jsdelivr, déjà chargé)

**Storage**: Supabase PostgreSQL — table `profils` existante (colonnes `id` FK
vers `auth.users`, `role` text)

**Testing**: Manuel — tests en staging via comptes de test dédiés par rôle

**Target Platform**: GitHub Pages (SPA monofichier `app.html`)

**Project Type**: Web application monofichier — modification de l'existant

**Performance Goals**: Chargement du profil < 500 ms après authentification

**Constraints**: Fichier unique `app.html` max ~1 500 lignes. Impact estimé :
+80 à +120 lignes. Pas de nouvelle dépendance CDN.

**Scale/Scope**: ~10 utilisateurs internes. Un seul rôle par utilisateur.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Détail |
|----------|--------|--------|
| I. Single-File Architecture | ✅ PASS | Tout le code reste dans `app.html`. Aucun nouveau fichier JS/CSS. |
| II. Security-First (RLS) | ✅ PASS | La table `profils` doit avoir RLS `authenticated_only`. Policy additionnelle requise : lecture de tous les profils réservée aux admins (via RLS avec vérification du rôle de l'appelant). |
| III. UAE Business Rules | ✅ PASS | Non impacté — cette feature ne touche pas les calculs financiers. |
| IV. Supabase-as-Backend | ✅ PASS | Utilise uniquement la table `profils` + `sb.auth.getSession()`. Aucun service externe. |
| V. Zero Build Step | ✅ PASS | Aucun build requis. Pas de nouvelle dépendance CDN. |

Tous les gates passent.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-roles/
├── plan.md              ← ce fichier
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1
├── contracts/
│   └── role-access-matrix.md
└── tasks.md             ← généré par /speckit-tasks
```

### Source Code (repository root)

```text
app.html                 ← fichier unique, toutes modifications ici
  CSS (~L.12-230)
    + règle .nav-item[data-role] pour masquage selon rôle
  JS STATE (~L.423-428)
    + let currentRole = null
  JS DATA (~L.554-580)
    + function loadProfil()        ← charge profils pour user courant
    + function loadAllProfils()    ← charge tous profils (admin seulement)
  JS NAV (~L.583-594)
    + TABS étendu avec 'settings'
    + goTab() : garde bloquée si module non autorisé pour currentRole
  JS showApp() (~L.495-551)
    + filtrage sidebar selon currentRole
    + appel loadProfil() avant rendu
  JS SETTINGS (après ~L.1127)
    + renderSettings()             ← liste users + formulaire changement rôle
    + saveUserRole(userId, role)   ← sauvegarde en Supabase
```

**Structure Decision**: Monofichier `app.html` — modifications ciblées aux
points d'insertion identifiés ci-dessus. Aucune restructuration globale.

## Complexity Tracking

Aucune violation de constitution. Tableau non requis.
