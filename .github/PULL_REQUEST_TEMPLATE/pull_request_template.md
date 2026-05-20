## Type de changement

- [ ] `feat` — Nouvelle fonctionnalité
- [ ] `fix` — Correction de bug
- [ ] `refactor` — Refactoring
- [ ] `docs` — Documentation
- [ ] `chore` — Maintenance / deps

## Phase ERP

- [ ] Phase 1 — Fondations & PWA
- [ ] Phase 2 — Modules métier core
- [ ] Phase 3 — RH & Véhicules
- [ ] Phase 4 — Achats & Comptabilité
- [ ] Phase 5 — Marketing & CRM
- [ ] Phase 6 — Suggestions ERP

## Résumé

<!-- Décrire les changements en 2-3 points -->

-
-

## Migrations SQL

- [ ] Aucune migration nécessaire
- [ ] Migration déployée en **staging** Supabase : `XXX_nom.sql`
- [ ] Migration à déployer en **production** après merge main

## Plan de test

- [ ] Endpoints API répondent correctement (statuts 200/201/40x)
- [ ] Vérification des accès par rôle (admin / commercial / comptable / technicien)
- [ ] Test sur mobile (PWA Safari iOS ou Chrome Android)
- [ ] PDF généré et téléchargeable (si applicable)
- [ ] Pas de régression sur les modules existants

## Checklist

- [ ] `CHANGELOG.md` mis à jour dans `[Unreleased]`
- [ ] `.env.example` mis à jour si nouvelle variable d'environnement
- [ ] Pas de secrets committés (`.env`, clés API)
- [ ] Pas de `console.log` de debug laissés en place
