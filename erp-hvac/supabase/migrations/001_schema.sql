-- ============================================================
-- ERP HVAC Dubai — Schema initial
-- Migration: 001_schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- Types enum ----
CREATE TYPE role_utilisateur  AS ENUM ('administrateur','commercial','comptable','technicien');
CREATE TYPE statut_devis       AS ENUM ('brouillon','envoye','accepte','refuse','expire');
CREATE TYPE statut_facture     AS ENUM ('brouillon','envoyee','partiellement_payee','payee','en_retard','annulee');
CREATE TYPE statut_intervention AS ENUM ('planifiee','en_cours','terminee','annulee');
CREATE TYPE type_intervention  AS ENUM ('installation','maintenance','depannage','renovation');
CREATE TYPE statut_conge       AS ENUM ('en_attente','approuve','refuse');
CREATE TYPE statut_vehicule    AS ENUM ('disponible','en_mission','en_maintenance','hors_service');

-- ---- Trigger updated_at ----
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ---- Séquence atomique (sans race condition) ----
CREATE TABLE sequences (
  nom   TEXT     NOT NULL,
  annee SMALLINT NOT NULL,
  valeur INTEGER  NOT NULL DEFAULT 0,
  PRIMARY KEY (nom, annee)
);

CREATE OR REPLACE FUNCTION next_sequence(p_nom TEXT, p_annee SMALLINT)
RETURNS INTEGER AS $$
DECLARE v_val INTEGER;
BEGIN
  INSERT INTO sequences(nom, annee, valeur) VALUES (p_nom, p_annee, 1)
  ON CONFLICT (nom, annee) DO UPDATE SET valeur = sequences.valeur + 1
  RETURNING valeur INTO v_val;
  RETURN v_val;
END;
$$ LANGUAGE plpgsql;

-- ---- Profils (extension de auth.users) ----
CREATE TABLE profils (
  id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email    TEXT NOT NULL,
  nom      TEXT NOT NULL,
  prenom   TEXT,
  role     role_utilisateur NOT NULL DEFAULT 'technicien',
  actif    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_profils BEFORE UPDATE ON profils FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---- Clients ----
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL,
  prenom      TEXT,
  email       TEXT,
  telephone   TEXT,
  type        TEXT NOT NULL DEFAULT 'particulier'
              CHECK (type IN ('particulier','entreprise','copropriete')),
  entreprise  TEXT,
  trn         TEXT,
  adresse     TEXT,
  emirat      TEXT NOT NULL DEFAULT 'Dubai',
  notes       TEXT,
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_clients BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_clients_actif      ON clients(actif);
CREATE INDEX idx_clients_created_by ON clients(created_by);

-- ---- Chantiers ----
CREATE TABLE chantiers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  adresse     TEXT,
  emirat      TEXT NOT NULL DEFAULT 'Dubai',
  description TEXT,
  statut      TEXT NOT NULL DEFAULT 'en_attente'
              CHECK (statut IN ('en_attente','en_cours','termine')),
  actif       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_chantiers BEFORE UPDATE ON chantiers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_chantiers_client_id ON chantiers(client_id);

-- ---- Catégories articles ----
CREATE TABLE categories_article (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- Articles ----
CREATE TABLE articles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference       TEXT NOT NULL UNIQUE,
  designation     TEXT NOT NULL,
  description     TEXT,
  categorie_id    UUID REFERENCES categories_article(id),
  prix_vente_ht   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (prix_vente_ht >= 0),
  prix_achat_ht   NUMERIC(12,2) DEFAULT 0          CHECK (prix_achat_ht >= 0),
  stock_actuel    NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimum   NUMERIC(10,2) NOT NULL DEFAULT 0,
  unite           TEXT NOT NULL DEFAULT 'u',
  actif           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_articles BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_articles_actif       ON articles(actif);
CREATE INDEX idx_articles_categorie   ON articles(categorie_id);
CREATE INDEX idx_articles_reference   ON articles(reference);

-- ---- Devis ----
CREATE TABLE devis (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero         TEXT NOT NULL UNIQUE,
  client_id      UUID NOT NULL REFERENCES clients(id),
  chantier_id    UUID REFERENCES chantiers(id),
  objet          TEXT,
  date_devis     DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validite  DATE,
  statut         statut_devis NOT NULL DEFAULT 'brouillon',
  sous_total_ht  NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_tva    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc      NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  conditions     TEXT,
  created_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_devis BEFORE UPDATE ON devis FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_devis_client_id  ON devis(client_id);
CREATE INDEX idx_devis_statut     ON devis(statut);
CREATE INDEX idx_devis_created_by ON devis(created_by);
CREATE INDEX idx_devis_date       ON devis(date_devis);

-- ---- Devis lignes ----
CREATE TABLE devis_lignes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  devis_id         UUID NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  article_id       UUID REFERENCES articles(id),
  designation      TEXT NOT NULL,
  description      TEXT,
  quantite         NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantite > 0),
  prix_unitaire_ht NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (prix_unitaire_ht >= 0),
  taux_tva         NUMERIC(5,2)  NOT NULL DEFAULT 5,
  montant_ht       NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_tva      NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_ttc      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ordre            SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_devis_lignes_devis_id ON devis_lignes(devis_id);

-- ---- Factures ----
CREATE TABLE factures (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero         TEXT NOT NULL UNIQUE,
  devis_id       UUID REFERENCES devis(id),
  client_id      UUID NOT NULL REFERENCES clients(id),
  chantier_id    UUID REFERENCES chantiers(id),
  objet          TEXT,
  date_facture   DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance  DATE,
  statut         statut_facture NOT NULL DEFAULT 'brouillon',
  sous_total_ht  NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_tva    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc      NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_paye   NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_factures BEFORE UPDATE ON factures FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_factures_client_id  ON factures(client_id);
CREATE INDEX idx_factures_statut     ON factures(statut);
CREATE INDEX idx_factures_created_by ON factures(created_by);
CREATE INDEX idx_factures_date       ON factures(date_facture);

-- ---- Facture lignes ----
CREATE TABLE facture_lignes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facture_id       UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  article_id       UUID REFERENCES articles(id),
  designation      TEXT NOT NULL,
  description      TEXT,
  quantite         NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantite > 0),
  prix_unitaire_ht NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (prix_unitaire_ht >= 0),
  taux_tva         NUMERIC(5,2)  NOT NULL DEFAULT 5,
  montant_ht       NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_tva      NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_ttc      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ordre            SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_facture_lignes_facture_id ON facture_lignes(facture_id);

-- ---- Paiements ----
CREATE TABLE paiements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facture_id     UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  date_paiement  DATE NOT NULL DEFAULT CURRENT_DATE,
  montant        NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  mode           TEXT NOT NULL DEFAULT 'virement'
                 CHECK (mode IN ('virement','cheque','especes','carte','autre')),
  reference      TEXT,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_paiements_facture_id ON paiements(facture_id);

-- ---- Interventions ----
CREATE TABLE interventions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT NOT NULL UNIQUE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  chantier_id     UUID REFERENCES chantiers(id),
  type            type_intervention NOT NULL DEFAULT 'depannage',
  statut          statut_intervention NOT NULL DEFAULT 'planifiee',
  date_debut      TIMESTAMPTZ NOT NULL,
  date_fin_prevue TIMESTAMPTZ,
  date_fin_reelle TIMESTAMPTZ,
  description     TEXT,
  notes           TEXT,
  rapport         TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_interventions BEFORE UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_interventions_client_id  ON interventions(client_id);
CREATE INDEX idx_interventions_statut     ON interventions(statut);
CREATE INDEX idx_interventions_date_debut ON interventions(date_debut);

-- ---- Intervention × techniciens ----
CREATE TABLE intervention_techniciens (
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  employe_id      UUID NOT NULL,
  PRIMARY KEY (intervention_id, employe_id)
);

-- ---- Intervention × articles utilisés ----
CREATE TABLE intervention_articles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  article_id      UUID REFERENCES articles(id),
  designation     TEXT NOT NULL,
  quantite        NUMERIC(10,3) NOT NULL DEFAULT 1,
  prix_unitaire_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_intervention_articles_intervention ON intervention_articles(intervention_id);

-- ---- Employés ----
CREATE TABLE employes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  matricule             TEXT NOT NULL UNIQUE,
  nom                   TEXT NOT NULL,
  prenom                TEXT,
  email                 TEXT,
  telephone             TEXT,
  poste                 TEXT,
  departement           TEXT,
  salaire_base          NUMERIC(12,2),
  date_embauche         DATE,
  type_contrat          TEXT DEFAULT 'cdi'
                        CHECK (type_contrat IN ('cdi','cdd','interim','freelance')),
  nationalite           TEXT,
  numero_visa           TEXT,
  expiration_visa       DATE,
  numero_passeport      TEXT,
  expiration_passeport  DATE,
  actif                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID NOT NULL REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_employes BEFORE UPDATE ON employes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_employes_actif ON employes(actif);

-- ---- Congés ----
CREATE TABLE conges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id  UUID NOT NULL REFERENCES employes(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'annuel'
              CHECK (type IN ('annuel','maladie','sans_solde','autre')),
  date_debut  DATE NOT NULL,
  date_fin    DATE NOT NULL,
  nb_jours    SMALLINT NOT NULL CHECK (nb_jours > 0),
  statut      statut_conge NOT NULL DEFAULT 'en_attente',
  motif       TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (date_fin >= date_debut)
);
CREATE TRIGGER trg_conges BEFORE UPDATE ON conges FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_conges_employe_id ON conges(employe_id);

-- ---- Véhicules ----
CREATE TABLE vehicules (
  id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  immatriculation              TEXT NOT NULL UNIQUE,
  marque                       TEXT NOT NULL,
  modele                       TEXT,
  annee                        SMALLINT,
  type                         TEXT DEFAULT 'camionnette'
                               CHECK (type IN ('camionnette','voiture','camion','moto')),
  couleur                      TEXT,
  statut                       statut_vehicule NOT NULL DEFAULT 'disponible',
  kilometrage                  INTEGER DEFAULT 0,
  assurance_expiration         DATE,
  controle_technique_expiration DATE,
  notes                        TEXT,
  actif                        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by                   UUID NOT NULL REFERENCES auth.users(id),
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_vehicules BEFORE UPDATE ON vehicules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---- Entretiens véhicules ----
CREATE TABLE vehicule_entretiens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicule_id  UUID NOT NULL REFERENCES vehicules(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  kilometrage  INTEGER,
  description  TEXT,
  cout         NUMERIC(12,2) DEFAULT 0,
  garage       TEXT,
  prochain_km  INTEGER,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vehicule_entretiens_vehicule ON vehicule_entretiens(vehicule_id);

-- ---- Audit logs ----
CREATE TABLE audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id  UUID,
  action     TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data   JSONB,
  new_data   JSONB,
  user_id    UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_table   ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ---- Trigger: création profil à l'inscription ----
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profils(id, email, nom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::role_utilisateur, 'technicien')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---- Données de base ----
INSERT INTO categories_article(nom, description) VALUES
  ('Climatisation', 'Unités intérieures et extérieures'),
  ('Ventilation', 'Gaines, bouches, VMC'),
  ('Réfrigération', 'Compresseurs, condenseurs, évaporateurs'),
  ('Électricité', 'Câbles, disjoncteurs, tableaux'),
  ('Plomberie', 'Tuyaux, raccords, vannes'),
  ('Consommables', 'Fluides frigorigènes, joints, filtres'),
  ('Outillage', 'Outils et équipements de chantier');
