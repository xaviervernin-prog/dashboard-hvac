from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FactureBase(BaseModel):
    client_id: UUID
    devis_id: Optional[UUID] = None
    montant: float = Field(ge=0)
    statut: str = "en_attente"
    date_echeance: Optional[date] = None
    notes: Optional[str] = None


class FactureCreate(FactureBase):
    pass


class FactureUpdate(FactureBase):
    pass


class FactureRead(FactureBase):
    id: UUID
    numero: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
