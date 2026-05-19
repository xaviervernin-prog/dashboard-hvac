# Data Model: User Roles & Access Control

**Feature**: 001-user-roles
**Date**: 2026-05-19

## Table existante : `profils` — Migrations requises

### 1. Ajouter la colonne email (pour le panneau admin)

```sql
ALTER TABLE profils ADD COLUMN IF NOT EXISTS email text;

-- Remplir les emails existants depuis auth.users
UPDATE profils
SET email = au.email
FROM auth.users au
WHERE profils.id = au.id AND profils.email IS NULL;
```

### 2. Contrainte CHECK sur le rôle

```sql
ALTER TABLE profils
  DROP CONSTRAINT IF EXISTS profils_role_check;
ALTER TABLE profils
  ADD CONSTRAINT profils_role_check
  CHECK (role IN ('administrateur','technicien','comptable','commercial'));
```

### 3. Mettre à jour le trigger handle_new_user pour sauvegarder l'email

Dans le dashboard Supabase → Database → Functions, modifier `handle_new_user()` :

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profils (id, role, email)
  VALUES (new.id, 'technicien', new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
```

## Policies RLS à créer / vérifier

```sql
-- 1. Chaque utilisateur lit son propre profil
CREATE POLICY select_own_profile ON profils
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 2. Les admins lisent tous les profils
CREATE POLICY admin_select_all ON profils
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profils WHERE id = auth.uid()) = 'administrateur'
  );

-- 3. Les admins mettent à jour n'importe quel profil
CREATE POLICY admin_update_all ON profils
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profils WHERE id = auth.uid()) = 'administrateur'
  )
  WITH CHECK (
    role IN ('administrateur','technicien','comptable','commercial')
  );
```

> **Note** : La policy `select_own_profile` et `admin_select_all` se combinent
> par OR dans Supabase (permissive policies). Les deux peuvent coexister.

## État JS en mémoire

```javascript
// Variable globale (à ajouter L.424 dans app.html)
let currentRole = null;   // 'administrateur' | 'technicien' | 'comptable' | 'commercial'

// Objet S étendu (à ajouter dans S, L.424)
S.allProfils = [];        // [ { id, role, email } ] — chargé seulement pour admins
```

## Matrice d'accès (source de vérité pour l'implémentation)

```javascript
const ROLE_TABS = {
  administrateur: ['dashboard','clients','articles','interventions','devis','factures','settings'],
  technicien:     ['dashboard','interventions'],
  comptable:      ['dashboard','devis','factures'],
  commercial:     ['dashboard','clients','devis'],
};
```

## Relations

```
auth.users (Supabase Auth)
  └── profils.id  (1:1, ON DELETE CASCADE)
        └── role  → contrôle ROLE_TABS visible dans l'UI
```
