from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class InterventionBase(BaseModel):
    devis_id: UUID
    client_id: UUID
    date_debut: datetime
    date_fin: Optional[datetime] = None
    techniciens: list[str] = []
    lieu: Optional[str] = None
    statut: str = "planifie"
    notes: Optional[str] = None


class InterventionCreate(InterventionBase):
    pass


class InterventionUpdate(InterventionBase):
    pass


class InterventionRead(InterventionBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
