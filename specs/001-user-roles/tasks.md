---
description: "Task list template for feature implementation"
---

# Tasks: User Roles & Access Control

**Input**: Design documents from `specs/001-user-roles/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut s'exécuter en parallèle (fichiers différents, pas de dépendances)
- **[Story]**: User story concernée (US1, US2)
- Tous les changements de code se font dans `app.html`

---

## Phase 1 : Setup (Infrastructure partagée)

**Objectif** : Ajouter les bases nécessaires avant toute logique de rôle.

- [x] T001 Appliquer les policies RLS sur la table `profils` — fait via Supabase MCP : `select_own_profile`, `admin_select_all`, `admin_update` + fonction `is_admin()` SECURITY DEFINER
- [x] T002 Contrainte CHECK sur `profils.role` — inutile : le type est déjà un ENUM `role_utilisateur` (`administrateur`, `commercial`, `comptable`, `technicien`) ✅
- [x] T003 [P] Ajouter la variable globale `let currentRole = null` à la ligne 424 de `app.html` (zone STATE)
- [x] T004 [P] Ajouter `const ROLE_TABS = { administrateur: [...], technicien: [...], comptable: [...], commercial: [...] }` à la ligne 425 de `app.html` (zone STATE, contenu dans data-model.md)

**Checkpoint** : Les policies RLS sont actives, les variables globales sont déclarées.

---

## Phase 2 : Fondations (bloquant pour toutes les user stories)

**Objectif** : Charger le profil au login et rendre la navigation consciente du rôle.

- [x] T005 Ajouter la fonction `loadProfil()` dans `app.html` après `loadFactures()` (~L.596) : requête `sb.from('profils').select('role, email').eq('id', currentUser.id).single()`, affecte `currentRole`, affiche message d'erreur si aucun profil trouvé
- [x] T006 Modifier `init()` dans `app.html` (~L.440) pour appeler `await loadProfil()` après `currentUser = session.user` et avant `showApp()`
- [x] T007 Modifier `goTab(name)` dans `app.html` (~L.613) pour ajouter une garde : si `ROLE_TABS[currentRole]` ne contient pas `name`, ne rien faire (return early)

**Checkpoint** : Après login, `currentRole` est défini. `goTab()` bloque les modules non autorisés.

---

## Phase 3 : User Story 1 — Accès adapté au rôle (Priority: P1) 🎯 MVP

**Objectif** : Le menu latéral affiche uniquement les modules autorisés selon `currentRole`.

**Test indépendant** : Se connecter avec 4 comptes de test (un par rôle) et vérifier que le menu correspond à la matrice dans `contracts/role-access-matrix.md`.

### Implémentation US1

- [x] T008 [US1] Modifier `showApp()` dans `app.html` : sidebar générée dynamiquement avec helper `nb()` — seuls les boutons autorisés par `ROLE_TABS[currentRole]` sont rendus (approche conditionnelle au lieu de display:none)
- [x] T009 [US1] Modifier la bottom-nav mobile dans `showApp()` : même logique conditionnelle que T008 pour les boutons mobiles
- [x] T010 [US1] Ajouter `settings` à l'array `TABS` (~L.613) dans `app.html`
- [x] T011 [US1] Ajouter le bouton "Paramètres" dans la sidebar HTML de `showApp()` : visible seulement si `canSee('settings')` (admin uniquement), avec section "Admin" séparée
- [x] T012 [US1] Dashboard est le premier onglet par défaut pour tous les rôles — confirmé (renderDashboard() appelé dans showApp())

**Checkpoint** : Chaque rôle voit uniquement ses modules autorisés. Tester les 4 rôles.

---

## Phase 4 : User Story 2 — Gestion des rôles (admin) (Priority: P2)

**Objectif** : Un administrateur peut voir et modifier les rôles de tous les utilisateurs.

**Test indépendant** : Se connecter en admin → ouvrir Paramètres → changer le rôle d'un compte → se reconnecter avec ce compte → vérifier les nouveaux modules visibles.

### Implémentation US2

- [x] T013 [US2] Ajouter la fonction `loadAllProfils()` dans `app.html` après `loadProfil()` (~L.604) : requête `sb.from('profils').select('id, role, email')` — email disponible grâce à la colonne ajoutée (voir data-model.md migrations)
- [x] T014 [US2] Ajouter la fonction `renderSettings()` dans `app.html` (~L.1160) : tableau des utilisateurs avec email + `<select>` de rôle inline, mise à jour immédiate au changement
- [x] T015 [US2] Ajouter le div `<div id="tab-settings" class="tab-panel">` dans le HTML body de `showApp()`, à la suite des autres tabs
- [x] T016 [US2] Ajouter la fonction `saveUserRole(userId, newRole)` dans `app.html` (~L.1192) : update Supabase + protection accès admin
- [x] T017 [US2] Modifier `goTab()` pour appeler `renderSettings()` quand `name === 'settings'`
- [x] T018 [US2] Protection "dernier admin" dans `saveUserRole()` : compte les admins dans `S.allProfils` avant de valider le changement

**Checkpoint** : Admin peut modifier les rôles. Protection dernier admin active. Non-admins n'ont pas accès à l'onglet Settings.

---

## Phase 5 : Polish & vérifications transversales

- [x] T019 [P] Vérifier le compte de lignes de `app.html` après implémentation — 1 238 lignes ✅ (limite : 1 500)
- [ ] T020 Créer 4 comptes de test dans Supabase Auth (un par rôle) et vérifier la matrice complète
- [x] T021 Vérifier que le compte `xavier.vernin@gmail.com` a bien le rôle `administrateur` dans la table `profils` — confirmé via Supabase MCP ✅
- [ ] T022 [P] Tester le cas limite : utilisateur authentifié sans ligne dans `profils` → vérifier le message d'erreur et la redirection vers le login

---

## Dépendances et ordre d'exécution

### Ordre des phases

- **Phase 1 (Setup)** : T001-T004 — aucune dépendance, peut commencer immédiatement
- **Phase 2 (Fondations)** : T005-T007 — dépend de Phase 1 (T003, T004 requis), bloque US1 et US2
- **Phase 3 (US1)** : T008-T012 — dépend de Phase 2 complète
- **Phase 4 (US2)** : T013-T018 — dépend de Phase 2, peut commencer en parallèle avec Phase 3
- **Phase 5 (Polish)** : T019-T022 — dépend de Phases 3 et 4

### Dépendances internes

- T006 dépend de T005 (loadProfil doit exister avant l'appel dans init)
- T007 dépend de T004 (ROLE_TABS doit être déclaré)
- T014 dépend de T013 (loadAllProfils doit exister)
- T016 dépend de T014 (renderSettings appelle saveUserRole)
- T017 dépend de T015 et T014
- T018 dépend de T016

### Opportunités parallèles

```
Phase 1 : T001 ∥ T002 ∥ T003 ∥ T004
Phase 3+4 simultanées (fichiers distincts de l'existant, si deux développeurs)
Phase 5 : T019 ∥ T020 ∥ T021 ∥ T022
```

---

## Stratégie d'implémentation

### MVP (US1 seulement)

1. Phase 1 : Setup RLS + variables
2. Phase 2 : Fondations (loadProfil, goTab guard)
3. Phase 3 : Filtrage sidebar
4. **STOP** : tester les 4 rôles → menus corrects ?
5. Déployer en staging pour validation

### Livraison complète

1. MVP validé
2. Phase 4 : Panneau admin (US2)
3. Phase 5 : Polish + tests
4. Déployer en staging → valider → merger sur main

---

## Notes

- [P] = fichiers différents, pas de dépendances bloquantes
- Tous les changements de code dans `app.html` uniquement (principe I constitution)
- Vérifier le compteur de lignes après chaque phase (principe I : max ~1 500 lignes)
- Committer après chaque phase validée, pas après chaque tâche individuelle
