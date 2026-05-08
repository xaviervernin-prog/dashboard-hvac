# Guide de contribution

Ce document définit les conventions de travail pour le développement de l'ERP Dubai.

---

## Branches

| Branche | Rôle |
|---|---|
| `main` | Production — code stable déployé sur le VPS |
| `staging` | Pré-production — tests avant merge en main |
| `claude/plan-erp-system-RLLpd` | Développement actif (feature branch principale) |
| `feat/<nom>` | Feature isolée, merge vers la branche de dev |
| `fix/<nom>` | Correction de bug |
| `chore/<nom>` | Maintenance, mise à jour dépendances, docs |

### Workflow

```
feat/ma-feature
      │
      ▼
claude/plan-erp-system-RLLpd  ←── développement quotidien
      │
      ▼ (PR review)
   staging                    ←── tests QA
      │
      ▼ (PR review + validation)
    main                      ←── production
```

---

## Conventions de commits

Format : `type(scope): description courte`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Refactoring sans changement fonctionnel |
| `docs` | Documentation uniquement |
| `chore` | Maintenance, deps, build |
| `test` | Ajout ou modification de tests |
| `style` | CSS, mise en forme (pas de logique) |

**Exemples :**
```
feat(rh): add employee document expiry alerts endpoint
feat(vehicules): add vehicle fleet management module
fix(devis): prevent duplicate ligne when saving locked devis
docs: add API endpoints table to README
chore: update puppeteer to v22
```

---

## Pull Requests

Toute PR vers `staging` ou `main` doit :

1. **Titre** : respecter le format `type(scope): description` (< 70 caractères)
2. **Description** : remplir le template (Summary + Test plan)
3. **Reviewers** : au moins 1 reviewer assigné
4. **Tests** : vérifier que les endpoints API répondent correctement
5. **Changelog** : mettre à jour `CHANGELOG.md` dans la section `[Unreleased]`

### Template PR

```markdown
## Summary
- Point 1
- Point 2

## Test plan
- [ ] Vérifier CRUD endpoint
- [ ] Tester rôle technicien (accès restreint)
- [ ] Vérifier rendu PDF
- [ ] Tester sur mobile (PWA)

## Migrations SQL
- [ ] `XXX_nom.sql` déployée en staging Supabase
```

---

## Structure des fichiers

```
backend/src/
├── controllers/    # Logique métier — un fichier par module
├── routes/         # Définition des routes Express — un fichier par module
├── services/       # Services réutilisables (PDF, email, WhatsApp, TVA)
├── middleware/     # Auth, errorHandler
├── db/migrations/  # SQL Supabase — exécutés dans l'ordre
├── utils/          # Helpers (numérotation, validators)
└── config/         # Supabase client, env

frontend/js/
├── api.js          # Wrapper fetch (NE PAS modifier sans coordination)
├── auth.js         # Supabase Auth
├── app.js          # Bootstrap, navigation, notifications
├── utils.js        # Helpers UI partagés
└── modules/        # Un fichier par module ERP
```

**Règle** : tout accès à la base de données passe par les controllers. Les routes ne contiennent que les middlewares et l'appel au controller.

---

## Variables d'environnement

- Ne **jamais** committer `.env`
- Toujours mettre à jour `.env.example` quand une nouvelle variable est ajoutée
- Les clés Supabase `service_role` ne doivent **jamais** être exposées dans le code frontend

---

## Sécurité

- Toute route API doit passer par le middleware `auth` (pas d'endpoint public sauf `/auth/`)
- Le filtre `technicien` (accès uniquement à ses interventions) est obligatoirement appliqué **server-side**
- Valider les entrées utilisateur avec `express-validator` sur les routes sensibles
- Pas d'injection SQL — utiliser les paramètres positionnels `$1`, `$2`, etc.
