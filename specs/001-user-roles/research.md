# Research: User Roles & Access Control

**Feature**: 001-user-roles
**Date**: 2026-05-19

## Decision 1: Moment de chargement du profil

**Decision**: Charger le profil dans `init()`, entre `getSession()` et
`showApp()`, et stocker le rôle dans une variable globale `currentRole`.

**Rationale**: Le rôle doit être connu AVANT l'affichage de l'interface pour
éviter tout flash de contenu non autorisé. En le chargeant dans `init()`, on
garantit que `showApp()` a déjà accès à `currentRole` au moment de construire
le HTML. Alternative rejetée : charger dans `showApp()` → risque de race
condition et de rendu partiel.

**Alternatives considered**:
- Stocker le rôle dans les `user_metadata` Supabase Auth → Nécessite un
  trigger ou une edge function pour synchroniser ; plus complexe, hors scope.
- Lire le rôle depuis le JWT → Le JWT anon ne contient pas les custom claims
  sans configuration Supabase avancée ; écarté pour cette version.

## Decision 2: Filtrage des modules — côté HTML vs. CSS

**Decision**: Masquer les onglets non autorisés via `style="display:none"` posé
lors du rendu HTML dans `showApp()`, combiné à une garde dans `goTab()`.

**Rationale**: Le masquage CSS seul ne suffit pas (modifiable depuis la console
navigateur). La double protection `display:none` + garde JS dans `goTab()` est
le niveau de sécurité approprié pour une SPA interne. La vraie sécurité des
données reste côté Supabase RLS — la protection UI est une couche de confort.

**Alternatives considered**:
- Supprimer dynamiquement les nœuds DOM des onglets → Plus complexe, inutile.
- Rediriger vers une page d'erreur → Pas adapté à une SPA monofichier.

## Decision 3: Gestion admin des utilisateurs

**Decision**: Ajouter un module "Paramètres" (onglet `settings`) accessible
aux admins uniquement. Il affiche la liste des profils via
`sb.from('profils').select('*, auth_users:id(email)')` et permet de modifier
le rôle via un `<select>` inline.

**Rationale**: Implémentation minimale qui respecte la contrainte monofichier.
Pas besoin d'une interface complexe pour ~10 utilisateurs.

**Alternatives considered**:
- Panneau modal dans un onglet existant → Moins lisible, mélange les
  responsabilités.
- Interface Supabase dashboard directement → Non souhaité par Xavier, qui veut
  gérer depuis l'app.

## Decision 4: RLS sur la table profils

**Decision**: Deux policies RLS nécessaires :
1. `select_own_profile` : `auth.uid() = id` — tout utilisateur authentifié
   lit son propre profil.
2. `admin_full_access` : vérification que l'appelant est admin via
   `(SELECT role FROM profils WHERE id = auth.uid()) = 'administrateur'` —
   les admins lisent et modifient tous les profils.

**Rationale**: La policy 1 couvre le cas nominal (chargement du rôle au login).
La policy 2 permet à `loadAllProfils()` de fonctionner pour le panneau admin.
Pas besoin de service role key ni d'edge function.

**Alternatives considered**:
- Une seule policy permissive `authenticated` → Tous les users verraient tous
  les profils : inacceptable.
- Edge function avec service role → Over-engineering pour ce besoin.

## Decision 5: Protection du dernier admin

**Decision**: Bloquer côté UI la modification du rôle de l'utilisateur
actuellement connecté si c'est le seul administrateur restant.

**Rationale**: Empêcher le lock-out accidentel. La vérification se fait en JS :
compter les admins avant de permettre la modification.

**Alternatives considered**:
- Trigger SQL qui rejette → Plus robuste mais nécessite accès dashboard
  Supabase pour configuration.
- Ne pas protéger → Risque réel pour Xavier.
