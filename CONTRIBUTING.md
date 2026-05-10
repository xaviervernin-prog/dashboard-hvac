# Contribuer au projet

## Prérequis

- Python 3.12+
- Docker + Docker Compose
- Deux projets Supabase (production + test)

## Workflow Git

| Branche | Rôle |
|---------|------|
| `main` | Production — déploiement automatique vers le VPS |
| `claude/...` | Développement actif |
| `feat/...` | Nouvelles fonctionnalités |
| `fix/...` | Corrections de bugs |

**Règle :** toujours passer par une PR pour merger dans `main`.

## Convention de commits

Format : `type: description courte`

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Refactoring sans changement de comportement |
| `chore` | Maintenance, dépendances, CI |
| `docs` | Documentation uniquement |
| `test` | Ajout ou modification de tests |

Exemples :
```
feat: ajouter filtre par statut sur la liste des clients
fix: corriger le calcul de TVA dans les devis
chore: mettre à jour supabase vers 2.10.0
```

## Architecture des modules

Chaque module métier suit strictement ce pattern :

```
backend/app/modules/nom_module/
├── __init__.py
├── router.py    # Routes FastAPI, dépendances injectées
├── schemas.py   # Pydantic : XxxCreate, XxxUpdate, XxxResponse
└── service.py   # Logique métier, appels Supabase
```

## Ajouter un module

1. **Backend**
   ```bash
   mkdir backend/app/modules/nouveau_module
   touch backend/app/modules/nouveau_module/{__init__.py,router.py,schemas.py,service.py}
   ```
2. Implémenter `schemas.py` (modèles Pydantic)
3. Implémenter `service.py` (CRUD via Supabase)
4. Implémenter `router.py` (routes FastAPI + injection `Depends(get_db)`)
5. Enregistrer dans `backend/app/main.py` :
   ```python
   from app.modules.nouveau_module.router import router as nouveau_router
   app.include_router(nouveau_router, prefix=f"{prefix}/nouveau", tags=["Nouveau"])
   ```

6. **Frontend**
   - Ajouter les méthodes dans `frontend/static/js/api.js`
   - Créer `frontend/static/js/modules/nouveau_module.js`
   - Ajouter la tab dans `frontend/templates/index.html`
   - Enregistrer le module dans `frontend/static/js/app.js`

7. **Tests**
   - Créer `backend/tests/test_nouveau_module.py`

8. **Migration SQL**
   - Si nouvelle table : `backend/migrations/00X_description.sql`

## Développement local

```bash
# Démarrer le backend avec hot-reload
make dev

# Dans un autre terminal : ouvrir http://localhost:8000

# Lancer les tests
make test

# Vérifier le style
make lint
```

## Variables d'environnement

Ne jamais commiter de fichier `.env*` (couvert par `.gitignore`).  
Toujours documenter les nouvelles variables dans `.env.example`.

## Standards de code

- **Python** : formaté avec `ruff` (vérifié en CI)
- **JavaScript** : vanilla ES2020, pas de framework, pas de bundler
- **SQL** : migrations numérotées `00X_description.sql`, toujours idempotentes
- **Commentaires** : uniquement si le *pourquoi* n'est pas évident
