from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DevisLigne(BaseModel):
    article_id: Optional[UUID] = None
    designation: str
    description: Optional[str] = None
    quantite: float = Field(gt=0)
    prix_unitaire_ht: float = Field(ge=0)
    taux_tva: float = 5
    ordre: int = 0


class DevisBase(BaseModel):
    client_id: UUID
    chantier_id: Optional[UUID] = None
    objet: Optional[str] = None
    date_devis: Optional[date] = None
    date_validite: Optional[date] = None
    statut: str = "brouillon"
    notes: Optional[str] = None
    conditions: Optional[str] = None
    lignes: list[DevisLigne] = []


class DevisCreate(DevisBase):
    pass


class DevisUpdate(DevisBase):
    pass


class DevisRead(DevisBase):
    id: UUID
    numero: str
    sous_total_ht: float
    montant_tva: float
    total_ttc: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
