from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class ChantierIn(BaseModel):
    nom: str = ""
    adresse: str = ""
    c_nom: str = ""
    c_prenom: str = ""
    c_tel: str = ""


class ChantierOut(ChantierIn):
    id: int
    client_id: int
    model_config = ConfigDict(from_attributes=True)


class ClientIn(BaseModel):
    nom: str
    prenom: str = ""
    ent: str = ""
    tel: str = ""
    email: str = ""
    statut: str = "prospect"
    fact_rue: str = ""
    fact_ville: str = ""
    fact_pays: str = "UAE"
    chantiers: List[ChantierIn] = []


class ClientOut(BaseModel):
    id: int
    nom: str
    prenom: str
    ent: str
    tel: str
    email: str
    statut: str
    fact_rue: str
    fact_ville: str
    fact_pays: str
    chantiers: List[ChantierOut] = []
    model_config = ConfigDict(from_attributes=True)


class ArticleIn(BaseModel):
    ref: str = ""
    nom: str
    cat: str = ""
    desc: str = ""
    prix: float = 0.0
    stock: int = 0


class ArticleOut(BaseModel):
    id: int
    ref: str
    nom: str
    cat: str
    desc: str
    prix: float
    stock: int
    model_config = ConfigDict(from_attributes=True)


class CategorieIn(BaseModel):
    nom: str


class CategorieOut(BaseModel):
    id: int
    nom: str
    model_config = ConfigDict(from_attributes=True)


class DevisLigneIn(BaseModel):
    article_id: Optional[int] = None
    qty: int = 1
    prix: float = 0.0


class DevisLigneOut(BaseModel):
    id: int
    devis_id: int
    article_id: Optional[int]
    qty: int
    prix: float
    model_config = ConfigDict(from_attributes=True)


class DevisIn(BaseModel):
    client_id: int
    objet: str = ""
    date: str = ""
    montant: float = 0.0
    statut: str = "en_attente"
    relance_date: Optional[str] = None
    lignes: List[DevisLigneIn] = []


class DevisOut(BaseModel):
    id: int
    num: str
    client_id: int
    client_nom: str = ""
    objet: str
    date: str
    montant: float
    statut: str
    relance_date: Optional[str]
    lignes: List[DevisLigneOut] = []


class InterventionIn(BaseModel):
    devis_id: Optional[int] = None
    date: str
    hd: str = "08:00"
    hf: str = "10:00"
    lieu: str = ""
    tech: str = ""
    notes: str = ""
    statut: str = "planifiee"


class InterventionOut(BaseModel):
    id: int
    devis_id: Optional[int]
    devis_num: str = ""
    client_id: Optional[int] = None
    client_nom: str = ""
    client_tel: str = ""
    client_email: str = ""
    objet: str = ""
    date: str
    hd: str
    hf: str
    lieu: str
    tech: str
    notes: str
    montant: float
    statut: str


class FactureIn(BaseModel):
    client_id: int
    devis_ref: str = ""
    date: str = ""
    echeance: str = ""
    montant: float = 0.0
    statut: str = "en_attente"
    relance_date: Optional[str] = None


class FactureOut(BaseModel):
    id: int
    num: str
    client_id: int
    client_nom: str = ""
    devis_ref: str
    date: str
    echeance: str
    montant: float
    statut: str
    relance_date: Optional[str]


class ProfilIn(BaseModel):
    nom: str = ""
    prenom: str = ""
    tel: str = ""
    permis: str = ""
    permis_exp: str = ""
    vehicle: str = ""
    photo_b64: str = ""


class ProfilOut(ProfilIn):
    model_config = ConfigDict(from_attributes=True)
