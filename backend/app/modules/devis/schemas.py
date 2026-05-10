from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class DevisLigne(BaseModel):
    article_id: Optional[UUID] = None
    designation: str
    quantite: float = Field(gt=0)
    prix_unitaire: float = Field(ge=0)
    total: float = Field(ge=0)


class DevisBase(BaseModel):
    client_id: UUID
    objet: str
    statut: str = "brouillon"
    date_validite: Optional[date] = None
    notes: Optional[str] = None
    montant_manuel: Optional[float] = Field(None, ge=0)
    lignes: list[DevisLigne] = []


class DevisCreate(DevisBase):
    pass


class DevisUpdate(DevisBase):
    pass


class DevisRead(DevisBase):
    id: UUID
    numero: str
    montant_total: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
