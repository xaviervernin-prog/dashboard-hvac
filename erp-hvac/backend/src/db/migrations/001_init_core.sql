-- ============================================================
-- Migration 001 — Core ERP Dubai
-- ============================================================

-- Trigger: met à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILS (liés à Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS profils (
  id         SERIAL PRIMARY KEY,
  auth_uid   UUID UNIQUE NOT NULL,   -- Supabase auth.users.id
  nom        VARCHAR(100) NOT NULL,
  prenom     VARCHAR(100),
  email      VARCHAR(150),
  tel        VARCHAR(30),
  role       VARCHAR(30) NOT NULL DEFAULT 'technicien',
  -- role: administrateur | commercial | comptable | technicien
  photo_url  TEXT,
  actif      BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_profils_updated_at
  BEFORE UPDATE ON profils FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  nom         VARCHAR(150) NOT NULL,
  prenom      VARCHAR(100),
  entreprise  VARCHAR(200),
  tel         VARCHAR(30),
  email       VARCHAR(150),
  statut      VARCHAR(20) DEFAULT 'prospect',
  -- statut: prospect | actif | inactif
  trn         VARCHAR(30),          -- UAE Tax Registration Number
  fact_rue    TEXT,
  fact_ville  VARCHAR(100),
  fact_pays   VARCHAR(60) DEFAULT 'UAE',
  notes       TEXT,
  actif       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CHANTIERS (sites de travail, N par client)
-- ============================================================
CREATE TABLE IF NOT EXISTS chantiers (
  id              SERIAL PRIMARY KEY,
  client_id       INT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nom             VARCHAR(200),
  adresse         TEXT,
  contact_nom     VARCHAR(150),
  contact_prenom  VARCHAR(100),
  contact_tel     VARCHAR(30),
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CATÉGORIES ARTICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories_articles (
  id    SERIAL PRIMARY KEY,
  nom   VARCHAR(100) UNIQUE NOT NULL,
  ordre INT DEFAULT 0
);

INSERT INTO categories_articles (nom, ordre) VALUES
  ('Unités intérieures', 1),
  ('Unités extérieures', 2),
  ('Gaines & conduits', 3),
  ('Accessoires', 4),
  ('Pièces détachées', 5),
  ('Main d''œuvre', 6),
  ('Autre', 7)
ON CONFLICT (nom) DO NOTHING;

-- ============================================================
-- ARTICLES / CATALOGUE
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
  id              SERIAL PRIMARY KEY,
  reference       VARCHAR(50) UNIQUE,
  designation     VARCHAR(200) NOT NULL,
  categorie_id    INT REFERENCES categories_articles(id),
  description     TEXT,
  prix_unitaire   NUMERIC(12,2) DEFAULT 0,
  tva_taux        NUMERIC(5,2) DEFAULT 5.00,   -- UAE VAT 5%
  stock_actuel    INT DEFAULT 0,
  stock_minimum   INT DEFAULT 5,
  unite           VARCHAR(20) DEFAULT 'unité',
  actif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_articles_updated_at
  BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- DEVIS (devis / cotations)
-- ============================================================
CREATE TABLE IF NOT EXISTS devis (
  id              SERIAL PRIMARY KEY,
  numero          VARCHAR(20) UNIQUE NOT NULL,
  client_id       INT NOT NULL REFERENCES clients(id),
  chantier_id     INT REFERENCES chantiers(id),
  objet           TEXT,
  date_devis      DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validite   DATE,
  montant_ht      NUMERIC(12,2) DEFAULT 0,
  montant_tva     NUMERIC(12,2) DEFAULT 0,
  montant_ttc     NUMERIC(12,2) DEFAULT 0,
  statut          VARCHAR(20) DEFAULT 'en_attente',
  -- statut: brouillon | en_attente | accepte | refuse | expire
  date_relance    DATE,
  notes_internes  TEXT,
  notes_client    TEXT,
  created_by      INT REFERENCES profils(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_devis_updated_at
  BEFORE UPDATE ON devis FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- DEVIS LIGNES
-- ============================================================
CREATE TABLE IF NOT EXISTS devis_lignes (
  id            SERIAL PRIMARY KEY,
  devis_id      INT NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  article_id    INT REFERENCES articles(id),
  designation   TEXT NOT NULL,
  quantite      NUMERIC(10,2) DEFAULT 1,
  prix_unitaire NUMERIC(12,2) DEFAULT 0,
  tva_taux      NUMERIC(5,2) DEFAULT 5.00,
  ordre         INT DEFAULT 0
);

-- ============================================================
-- INTERVENTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS interventions (
  id                SERIAL PRIMARY KEY,
  devis_id          INT REFERENCES devis(id),
  client_id         INT NOT NULL REFERENCES clients(id),
  chantier_id       INT REFERENCES chantiers(id),
  date_intervention DATE NOT NULL,
  heure_debut       TIME,
  heure_fin         TIME,
  lieu              TEXT,
  statut            VARCHAR(20) DEFAULT 'planifiee',
  -- statut: planifiee | en_cours | terminee | annulee
  notes_avant       TEXT,
  rapport_texte     TEXT,
  signature_url     TEXT,
  created_by        INT REFERENCES profils(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_interventions_updated_at
  BEFORE UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INTERVENTION TECHNICIENS (N:M)
-- ============================================================
CREATE TABLE IF NOT EXISTS intervention_techniciens (
  intervention_id INT NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  user_id         INT NOT NULL REFERENCES profils(id),
  PRIMARY KEY (intervention_id, user_id)
);

-- ============================================================
-- FACTURES
-- ============================================================
CREATE TABLE IF NOT EXISTS factures (
  id              SERIAL PRIMARY KEY,
  numero          VARCHAR(20) UNIQUE NOT NULL,
  client_id       INT NOT NULL REFERENCES clients(id),
  devis_id        INT REFERENCES devis(id),
  intervention_id INT REFERENCES interventions(id),
  date_emission   DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance   DATE,
  montant_ht      NUMERIC(12,2) DEFAULT 0,
  montant_tva     NUMERIC(12,2) DEFAULT 0,
  montant_ttc     NUMERIC(12,2) DEFAULT 0,
  montant_paye    NUMERIC(12,2) DEFAULT 0,
  statut          VARCHAR(20) DEFAULT 'en_attente',
  -- statut: brouillon | en_attente | partielle | payee | annulee
  date_relance    DATE,
  mode_paiement   VARCHAR(30),
  notes           TEXT,
  created_by      INT REFERENCES profils(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_factures_updated_at
  BEFORE UPDATE ON factures FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- FACTURE LIGNES
-- ============================================================
CREATE TABLE IF NOT EXISTS facture_lignes (
  id            SERIAL PRIMARY KEY,
  facture_id    INT NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  article_id    INT REFERENCES articles(id),
  designation   TEXT NOT NULL,
  quantite      NUMERIC(10,2) DEFAULT 1,
  prix_unitaire NUMERIC(12,2) DEFAULT 0,
  tva_taux      NUMERIC(5,2) DEFAULT 5.00,
  ordre         INT DEFAULT 0
);

-- ============================================================
-- PAIEMENTS (paiements partiels)
-- ============================================================
CREATE TABLE IF NOT EXISTS paiements (
  id              SERIAL PRIMARY KEY,
  facture_id      INT NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  date_paiement   DATE NOT NULL,
  montant         NUMERIC(12,2) NOT NULL,
  mode            VARCHAR(30),
  reference       VARCHAR(100),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SÉQUENCES DE NUMÉROTATION
-- ============================================================
CREATE TABLE IF NOT EXISTS sequences (
  nom     VARCHAR(50) PRIMARY KEY,
  valeur  INT DEFAULT 0
);

INSERT INTO sequences (nom, valeur) VALUES
  ('devis_2025', 0),
  ('facture_2025', 0),
  ('bon_commande_2025', 0),
  ('rapport_2025', 0),
  ('lead_2025', 0)
ON CONFLICT (nom) DO NOTHING;
