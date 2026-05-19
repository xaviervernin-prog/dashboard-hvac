# Base de données — Supabase

## Connexion

| Paramètre | Valeur |
|-----------|--------|
| Projet ID | `hdbyydietidgzoudlias` |
| Région | `eu-north-1` (Stockholm) |
| URL | `https://hdbyydietidgzoudlias.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/hdbyydietidgzoudlias |

La clé `anon` (publique) est incluse dans `app.html`. C'est intentionnel — Supabase est conçu pour exposer cette clé côté client. La sécurité est assurée par les politiques RLS.

---

## Schéma des tables

### `profils`
Créé automatiquement à l'inscription via un trigger `handle_new_user()`.

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | = `auth.users.id` |
| `email` | text | |
| `nom` | text | |
| `role` | text | `'administrateur'` par défaut |
| `actif` | boolean | `true` par défaut |
| `created_at` | timestamptz | |

### `clients`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `nom` | text NOT NULL | |
| `prenom` | text | |
| `type` | text | `particulier` \| `entreprise` \| `copropriete` |
| `entreprise` | text | |
| `telephone` | text | |
| `email` | text | |
| `adresse` | text | |
| `emirat` | text | Dubai \| Abu Dhabi \| Sharjah \| Ajman \| Autre |
| `notes` | text | |
| `actif` | boolean | Soft delete — `false` = supprimé |
| `created_by` | uuid FK → `auth.users.id` | |
| `created_at` | timestamptz | |

### `categories_article`
Table de référence — 7 catégories pré-peuplées.

| Colonne | Type |
|---------|------|
| `id` | uuid PK |
| `nom` | text |

### `articles`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `reference` | text | Format `ART-NNNN` |
| `designation` | text NOT NULL | |
| `description` | text | |
| `categorie_id` | uuid FK → `categories_article` | |
| `prix_vente_ht` | numeric | Prix en AED HT |
| `stock_actuel` | integer | |
| `stock_minimum` | integer | Seuil d'alerte stock |
| `unite` | text | `u` \| `m` \| `m2` \| `kg` \| `h` \| `forfait` |
| `actif` | boolean | Soft delete |
| `created_by` | uuid FK | |
| `created_at` | timestamptz | |

### `interventions`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `numero` | text | Format `INT-YYYY-NNN` |
| `client_id` | uuid FK → `clients` | |
| `type` | text | `depannage` \| `installation` \| `maintenance` \| `renovation` |
| `statut` | text | `planifiee` \| `en_cours` \| `terminee` \| `annulee` |
| `date_debut` | timestamptz | |
| `description` | text | |
| `notes` | text | Notes internes équipe |
| `created_by` | uuid FK | |
| `created_at` | timestamptz | |

### `devis`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `numero` | text | Format `DEV-YYYY-NNN` |
| `client_id` | uuid FK → `clients` | |
| `objet` | text | |
| `statut` | text | `brouillon` \| `envoye` \| `accepte` \| `refuse` \| `expire` |
| `date_validite` | date | |
| `sous_total_ht` | numeric | Somme des lignes HT |
| `montant_tva` | numeric | `sous_total_ht × 0.05` |
| `total_ttc` | numeric | `sous_total_ht × 1.05` |
| `notes` | text | Conditions, remarques |
| `created_by` | uuid FK | |
| `created_at` | timestamptz | |

### `devis_lignes`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | uuid PK | |
| `devis_id` | uuid FK → `devis` | |
| `designation` | text | |
| `quantite` | numeric | |
| `prix_unitaire_ht` | numeric | |
| `taux_tva` | numeric | `5` (fixe UAE) |
| `montant_ht` | numeric | `quantite × prix_unitaire_ht` |
| `montant_tva` | numeric | `montant_ht × 0.05` |
| `montant_ttc` | numeric | `montant_ht × 1.05` |
| `ordre` | integer | Ordre d'affichage |

### `factures`
Structure identique à `devis`, avec en plus :

| Colonne | Type | Notes |
|---------|------|-------|
| `statut` | text | `brouillon` \| `envoyee` \| `partiellement_payee` \| `payee` \| `en_retard` \| `annulee` |
| `date_echeance` | date | |

### `facture_lignes`
Structure identique à `devis_lignes` avec `facture_id` au lieu de `devis_id`.

---

## Row Level Security (RLS)

Toutes les tables ont RLS activé. Politique unique sur chaque table :

```sql
-- Exemple pour la table clients
CREATE POLICY "authenticated_only" ON clients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

Règle : **seuls les utilisateurs authentifiés** (token JWT valide) peuvent lire ou écrire. Les requêtes anonymes sont bloquées.

---

## Trigger — Création de profil

À chaque inscription, un profil est créé automatiquement :

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profils (id, email, nom, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    'administrateur'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

Points clés :
- `SECURITY DEFINER` + `SET search_path = public` : nécessaire pour écrire dans `public.profils` depuis un trigger sur `auth.users`
- `ON CONFLICT DO NOTHING` : évite les doublons si le trigger est réexécuté
- Rôle par défaut : `administrateur`

---

## Création manuelle d'un compte utilisateur

Via SQL dans le dashboard Supabase (SQL Editor) :

```sql
-- Si le compte existe mais sans mot de passe (ex: magic link partiel) :
UPDATE auth.users
SET
  encrypted_password = crypt('NouveauMotDePasse!', gen_salt('bf')),
  email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

---

## Google SSO (configuration manuelle)

Pour activer la connexion Google (bouton présent dans l'app mais désactivé) :

1. Supabase Dashboard → Authentication → Providers → Google → Activer
2. Créer un projet Google Cloud → OAuth 2.0 → copier Client ID et Client Secret
3. Ajouter l'URL de callback Supabase dans Google Cloud Console
4. Ajouter `https://xaviervernin-prog.github.io` dans les Redirect URLs de Supabase

---

## Configuration Supabase à vérifier

| Paramètre | Où | Valeur requise |
|-----------|----|---------------|
| Site URL | Auth → URL Configuration | `https://xaviervernin-prog.github.io/dashboard-hvac/app.html` |
| Redirect URLs | Auth → URL Configuration | `https://xaviervernin-prog.github.io/dashboard-hvac/app.html` |
