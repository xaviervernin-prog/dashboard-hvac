# Contract: Role Access Matrix

**Feature**: 001-user-roles
**Date**: 2026-05-19

## Matrice des modules autorisés par rôle

| Module        | administrateur | technicien | comptable | commercial |
|---------------|:--------------:|:----------:|:---------:|:----------:|
| dashboard     | ✅             | ✅         | ✅        | ✅         |
| clients       | ✅             | ❌         | ❌        | ✅         |
| articles      | ✅             | ❌         | ❌        | ❌         |
| interventions | ✅             | ✅         | ❌        | ❌         |
| devis         | ✅             | ❌         | ✅        | ✅         |
| factures      | ✅             | ❌         | ✅        | ❌         |
| settings      | ✅             | ❌         | ❌        | ❌         |

## Contrat de la fonction `loadProfil()`

```
Input  : currentUser.id (uuid, depuis sb.auth.getSession())
Output : string — l'une des 4 valeurs de rôle
Errors :
  - Aucune ligne trouvée → afficher "Profil introuvable, contacter l'administrateur"
    et appeler showLogin() (bloquer l'accès)
  - Erreur réseau → afficher toast d'erreur, appeler showLogin()
Side effects : affecte currentRole
```

## Contrat de la fonction `saveUserRole(userId, newRole)`

```
Input  : userId (uuid), newRole (string parmi les 4 valeurs valides)
Precondition : currentRole === 'administrateur'
Precondition : userId !== currentUser.id  (ou compter les admins restants)
Output : void
Errors :
  - Non-admin tente l'appel → toast "Accès refusé"
  - Modification de son propre rôle quand seul admin → toast "Impossible :
    vous êtes le seul administrateur"
Side effects : met à jour profils via sb.from('profils').update()
```

## Contrat de la garde `goTab(name)`

```
Input  : name (string — nom du module)
Precondition : currentRole doit être défini
Behavior :
  - Si name ∉ ROLE_TABS[currentRole] → ne pas changer d'onglet,
    ne pas afficher de toast (l'onglet est de toute façon masqué dans la sidebar)
  - Sinon → comportement existant inchangé
```
