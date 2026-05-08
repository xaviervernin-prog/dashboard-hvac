-- Migration 005 — Véhicules / Matériel

CREATE TABLE IF NOT EXISTS vehicules (
  id                  SERIAL PRIMARY KEY,
  immatriculation     VARCHAR(30) UNIQUE NOT NULL,
  marque              VARCHAR(60),
  modele              VARCHAR(60),
  annee               INT,
  couleur             VARCHAR(30),
  type_vehicule       VARCHAR(30) DEFAULT 'van',
  -- type: van | pick-up | voiture | autre
  assurance_num       VARCHAR(100),
  assurance_exp       DATE,
  controle_tech_exp   DATE,
  mulkiya_exp         DATE,          -- UAE vehicle registration
  employe_id          INT REFERENCES employes(id),
  actif               BOOLEAN DEFAULT true,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_vehicules_updated_at
  BEFORE UPDATE ON vehicules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS entretiens_vehicule (
  id                  SERIAL PRIMARY KEY,
  vehicule_id         INT NOT NULL REFERENCES vehicules(id),
  date_entretien      DATE NOT NULL,
  type_entretien      VARCHAR(50),
  -- type: vidange | pneus | revision | reparation | autre
  description         TEXT,
  cout                NUMERIC(10,2),
  kilometrage         INT,
  prochain_entretien  DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pleins_carburant (
  id          SERIAL PRIMARY KEY,
  vehicule_id INT NOT NULL REFERENCES vehicules(id),
  employe_id  INT REFERENCES employes(id),
  date_plein  DATE NOT NULL,
  litres      NUMERIC(7,2),
  montant     NUMERIC(8,2),
  kilometrage INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
