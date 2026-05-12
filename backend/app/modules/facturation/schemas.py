from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FactureLigne(BaseModel):
    article_id: Optional[UUID] = None
    designation: str
    description: Optional[str] = None
    quantite: float = Field(gt=0)
    prix_unitaire_ht: float = Field(ge=0)
    taux_tva: float = 5
    ordre: int = 0


class FactureBase(BaseModel):
    client_id: UUID
    devis_id: Optional[UUID] = None
    chantier_id: Optional[UUID] = None
    objet: Optional[str] = None
    date_facture: Optional[date] = None
    date_echeance: Optional[date] = None
    statut: str = "brouillon"
    notes: Optional[str] = None
    lignes: list[FactureLigne] = []


class FactureCreate(FactureBase):
    pass


class FactureUpdate(FactureBase):
    pass


class FactureRead(FactureBase):
    id: UUID
    numero: str
    sous_total_ht: float
    montant_tva: float
    total_ttc: float
    montant_paye: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
