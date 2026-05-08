-- Migration 002 — RH / Équipe

CREATE TABLE IF NOT EXISTS employes (
  id                SERIAL PRIMARY KEY,
  user_id           INT REFERENCES profils(id),
  nom               VARCHAR(100) NOT NULL,
  prenom            VARCHAR(100),
  poste             VARCHAR(100),
  email             VARCHAR(150),
  tel               VARCHAR(30),
  date_embauche     DATE,
  type_contrat      VARCHAR(30),   -- CDI | CDD | freelance | visa_emploi
  numero_visa       VARCHAR(50),
  visa_expiration   DATE,
  permis_conduire   VARCHAR(50),
  permis_expiration DATE,
  nationalite       VARCHAR(60),
  passeport_num     VARCHAR(50),
  passeport_exp     DATE,
  salaire_base      NUMERIC(10,2),
  photo_url         TEXT,
  actif             BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_employes_updated_at
  BEFORE UPDATE ON employes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS conges (
  id          SERIAL PRIMARY KEY,
  employe_id  INT NOT NULL REFERENCES employes(id),
  type_conge  VARCHAR(30) DEFAULT 'annuel',
  -- type: annuel | maladie | sans_solde | ferie
  date_debut  DATE NOT NULL,
  date_fin    DATE NOT NULL,
  nb_jours    INT,
  statut      VARCHAR(20) DEFAULT 'en_attente',
  -- statut: en_attente | approuve | refuse
  notes       TEXT,
  approuve_par INT REFERENCES profils(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pointages (
  id              SERIAL PRIMARY KEY,
  employe_id      INT NOT NULL REFERENCES employes(id),
  intervention_id INT REFERENCES interventions(id),
  date_travail    DATE NOT NULL,
  heure_debut     TIME,
  heure_fin       TIME,
  heures_travail  NUMERIC(5,2),
  type_activite   VARCHAR(50) DEFAULT 'intervention',
  -- type: intervention | atelier | deplacement | formation | autre
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
