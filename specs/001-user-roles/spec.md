# Feature Specification: User Roles & Access Control

**Feature Branch**: `001-user-roles`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "Système de rôles utilisateurs pour l'ERP HVAC. 4 rôles : administrateur (accès total à tous les modules), technicien (interventions uniquement), comptable (devis et factures uniquement), commercial (clients et devis uniquement). Après connexion, le menu latéral et les fonctionnalités de l'app s'adaptent automatiquement au rôle de l'utilisateur connecté. Un administrateur peut consulter et modifier le rôle de n'importe quel utilisateur depuis l'interface. La table profils avec la colonne role existe déjà en base de données Supabase."

## User Scenarios & Testing

### User Story 1 — Accès adapté au rôle après connexion (Priority: P1)

Un employé se connecte avec ses identifiants. L'application affiche uniquement
les modules auxquels son rôle l'autorise. Il ne voit pas les autres modules et
ne peut pas y accéder en naviguant directement.

**Why this priority**: C'est la fonctionnalité centrale — sans elle, aucun
contrôle d'accès n'est possible. Toutes les autres user stories en dépendent.

**Independent Test**: Se connecter avec un compte technicien → vérifier que
seul le module "Interventions" est visible et accessible. Se connecter avec un
compte comptable → vérifier que seuls "Devis" et "Factures" sont visibles.

**Acceptance Scenarios**:

1. **Given** un utilisateur avec le rôle "technicien" connecté, **When** il
   consulte le menu latéral, **Then** seul le module "Interventions" est
   affiché (Dashboard exclu des modules métier visibles).
2. **Given** un utilisateur avec le rôle "comptable" connecté, **When** il
   accède à l'application, **Then** seuls "Devis" et "Factures" sont visibles.
3. **Given** un utilisateur avec le rôle "commercial" connecté, **When** il
   accède à l'application, **Then** seuls "Clients" et "Devis" sont visibles.
4. **Given** un utilisateur avec le rôle "administrateur" connecté, **When**
   il consulte le menu, **Then** tous les modules sont visibles et accessibles.
5. **Given** un utilisateur connecté, **When** son rôle n'est pas trouvé dans
   la base de données, **Then** l'accès est refusé et un message d'erreur
   explicite s'affiche.

---

### User Story 2 — Gestion des rôles par l'administrateur (Priority: P2)

Un administrateur consulte la liste de tous les utilisateurs enregistrés avec
leur rôle actuel. Il peut modifier le rôle d'un utilisateur depuis l'interface,
sans passer par la base de données directement.

**Why this priority**: Indispensable pour que Xavier puisse gérer les accès
au fur et à mesure que l'équipe évolue, sans intervention technique.

**Independent Test**: Se connecter en tant qu'administrateur → ouvrir le
panneau de gestion des utilisateurs → changer le rôle d'un compte technicien
en "comptable" → se déconnecter → se reconnecter avec ce compte → vérifier que
les modules visibles ont changé.

**Acceptance Scenarios**:

1. **Given** un administrateur connecté, **When** il ouvre la gestion des
   utilisateurs, **Then** il voit la liste de tous les comptes avec email et
   rôle actuel.
2. **Given** un administrateur sur la fiche d'un utilisateur, **When** il
   change le rôle et valide, **Then** le changement est enregistré et le menu
   de confirmation s'affiche.
3. **Given** un utilisateur non-administrateur connecté, **When** il tente
   d'accéder à la gestion des utilisateurs, **Then** l'accès lui est refusé.
4. **Given** l'administrateur lui-même, **When** il tente de modifier son
   propre rôle, **Then** l'action est bloquée avec un message explicatif
   (protection contre la perte d'accès admin).

---

### Edge Cases

- Que se passe-t-il si un utilisateur est connecté et que son rôle est modifié
  par un admin pendant la session ? → La restriction prend effet à la prochaine
  connexion (pas de déconnexion forcée en temps réel).
- Que se passe-t-il si la table `profils` n'a pas de ligne pour un utilisateur
  authentifié ? → Accès bloqué avec message "Profil introuvable, contacter
  l'administrateur".
- Que se passe-t-il si deux administrateurs existent et que l'un supprime
  l'autre ? → Hors scope : la suppression de comptes n'est pas couverte par
  cette feature.
- Un utilisateur peut-il avoir plusieurs rôles ? → Non. Un seul rôle par
  utilisateur.

## Requirements

### Functional Requirements

- **FR-001**: Le système DOIT lire le rôle de l'utilisateur connecté depuis la
  table `profils` immédiatement après l'authentification.
- **FR-002**: Le menu de navigation DOIT afficher uniquement les modules
  autorisés pour le rôle actif, selon la matrice ci-dessous.
- **FR-003**: Si aucun profil n'est trouvé pour l'utilisateur authentifié, le
  système DOIT bloquer l'accès et afficher un message d'erreur clair.
- **FR-004**: Un administrateur DOIT pouvoir voir la liste complète des
  utilisateurs (email + rôle) depuis un panneau dédié.
- **FR-005**: Un administrateur DOIT pouvoir modifier le rôle d'un utilisateur
  depuis l'interface, avec confirmation avant enregistrement.
- **FR-006**: Le système DOIT empêcher un administrateur de modifier son propre
  rôle.
- **FR-007**: Les modules non autorisés pour un rôle DOIVENT être inaccessibles
  même si l'utilisateur tente une navigation directe.

### Matrice des accès par rôle

| Module         | Administrateur | Technicien | Comptable | Commercial |
|----------------|:--------------:|:----------:|:---------:|:----------:|
| Dashboard      | ✅             | ✅         | ✅        | ✅         |
| Clients        | ✅             | ❌         | ❌        | ✅         |
| Articles       | ✅             | ❌         | ❌        | ❌         |
| Interventions  | ✅             | ✅         | ❌        | ❌         |
| Devis          | ✅             | ❌         | ✅        | ✅         |
| Factures       | ✅             | ❌         | ✅        | ❌         |
| Gestion users  | ✅             | ❌         | ❌        | ❌         |

### Key Entities

- **Profil utilisateur**: Représente un compte avec son rôle assigné. Contient
  l'identifiant unique de l'utilisateur (lié au compte d'authentification),
  son adresse email, et son rôle parmi les 4 valeurs possibles.
- **Rôle**: Valeur parmi `administrateur`, `technicien`, `comptable`,
  `commercial`. Détermine les modules visibles et les actions autorisées.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Après connexion, le menu adapté au rôle s'affiche en moins de
  2 secondes (inclus le chargement du profil).
- **SC-002**: 100% des modules non autorisés pour un rôle sont invisibles et
  inaccessibles pour cet utilisateur.
- **SC-003**: Un administrateur peut modifier le rôle d'un utilisateur en
  moins de 30 secondes depuis n'importe quel écran de l'application.
- **SC-004**: Aucun utilisateur non-administrateur ne peut accéder à la gestion
  des utilisateurs, quelle que soit la méthode de navigation.

## Assumptions

- La table `profils` existe déjà en base de données Supabase avec au minimum
  les colonnes `id` (FK vers auth.users) et `role` (text).
- Chaque utilisateur authentifié a exactement une ligne dans `profils` — la
  création du profil lors de l'inscription est déjà gérée par le trigger
  `handle_new_user()`.
- Le Dashboard est accessible à tous les rôles (il n'affiche que des données
  agrégées pertinentes selon le contexte).
- La gestion des utilisateurs (User Story 2) sera accessible via un nouveau
  module "Paramètres" visible uniquement par les administrateurs.
- Les restrictions s'appliquent côté interface ; la sécurité côté données reste
  assurée par RLS en base de données.
- La modification de rôle prend effet à la prochaine connexion de l'utilisateur
  concerné (pas de rechargement en temps réel).
