-- ============================================================
-- HVAC Dashboard – Schéma initial
-- À appliquer via Supabase SQL Editor ou CLI
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- CLIENTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom                 TEXT NOT NULL,
    entreprise          TEXT,
    email               TEXT,
    telephone           TEXT,
    statut              TEXT NOT NULL DEFAULT 'actif'
                            CHECK (statut IN ('actif', 'inactif', 'prospect')),
    adresse_facturation TEXT,
    chantiers           JSONB NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- CATÉGORIES D'ARTICLES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom        TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (nom) VALUES
    ('Climatisation'),
    ('Ventilation'),
    ('Chauffage'),
    ('Pièces détachées'),
    ('Consommables')
ON CONFLICT (nom) DO NOTHING;

-- ----------------------------------------------------------------
-- ARTICLES
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference     TEXT NOT NULL UNIQUE,
    designation   TEXT NOT NULL,
    categorie_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
    prix_unitaire NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (prix_unitaire >= 0),
    unite         TEXT NOT NULL DEFAULT 'unité',
    description   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- DEVIS
-- ----------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS devis_seq START 1;

CREATE TABLE IF NOT EXISTS devis (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero         TEXT NOT NULL UNIQUE,
    client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    objet          TEXT NOT NULL,
    statut         TEXT NOT NULL DEFAULT 'brouillon'
                       CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse')),
    date_validite  DATE,
    notes          TEXT,
    montant_manuel NUMERIC(12, 2) CHECK (montant_manuel >= 0),
    montant_total  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    lignes         JSONB NOT NULL DEFAULT '[]',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION next_devis_numero()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
    RETURN 'DEV-' || LPAD(nextval('devis_seq')::TEXT, 4, '0');
END;
$$;

-- ----------------------------------------------------------------
-- INTERVENTIONS (Agenda)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interventions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    devis_id     UUID NOT NULL REFERENCES devis(id) ON DELETE RESTRICT,
    client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    date_debut   TIMESTAMPTZ NOT NULL,
    date_fin     TIMESTAMPTZ,
    techniciens  TEXT[] NOT NULL DEFAULT '{}',
    lieu         TEXT,
    statut       TEXT NOT NULL DEFAULT 'planifie'
                     CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule')),
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT date_coherence CHECK (date_fin IS NULL OR date_fin > date_debut)
);

-- ----------------------------------------------------------------
-- FACTURES
-- ----------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS factures_seq START 1;

CREATE TABLE IF NOT EXISTS factures (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero         TEXT NOT NULL UNIQUE,
    client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    devis_id       UUID REFERENCES devis(id) ON DELETE SET NULL,
    montant        NUMERIC(12, 2) NOT NULL CHECK (montant >= 0),
    statut         TEXT NOT NULL DEFAULT 'en_attente'
                       CHECK (statut IN ('en_attente', 'payee', 'en_retard', 'annulee')),
    date_echeance  DATE,
    notes          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION next_facture_numero()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
    RETURN 'FAC-' || LPAD(nextval('factures_seq')::TEXT, 4, '0');
END;
$$;

-- ----------------------------------------------------------------
-- TRIGGER updated_at (commun à toutes les tables)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['clients','articles','devis','interventions','factures'] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
             CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
            t, t, t, t
        );
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY (prêt pour auth Supabase)
-- ----------------------------------------------------------------
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis        ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures     ENABLE ROW LEVEL SECURITY;

-- Politique temporaire : accès total (à restreindre avec JWT Supabase)
CREATE POLICY "allow_all" ON clients      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON categories   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON articles     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON devis        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON interventions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON factures     FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clients_statut      ON clients(statut);
CREATE INDEX IF NOT EXISTS idx_clients_nom         ON clients(nom);
CREATE INDEX IF NOT EXISTS idx_articles_reference  ON articles(reference);
CREATE INDEX IF NOT EXISTS idx_articles_categorie  ON articles(categorie_id);
CREATE INDEX IF NOT EXISTS idx_devis_client        ON devis(client_id);
CREATE INDEX IF NOT EXISTS idx_devis_statut        ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_interventions_date  ON interventions(date_debut);
CREATE INDEX IF NOT EXISTS idx_interventions_statut ON interventions(statut);
CREATE INDEX IF NOT EXISTS idx_factures_client     ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut     ON factures(statut);
