from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class InterventionBase(BaseModel):
    client_id: UUID
    chantier_id: Optional[UUID] = None
    type: str = "depannage"
    statut: str = "planifiee"
    date_debut: datetime
    date_fin_prevue: Optional[datetime] = None
    date_fin_reelle: Optional[datetime] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    rapport: Optional[str] = None


class InterventionCreate(InterventionBase):
    pass


class InterventionUpdate(InterventionBase):
    pass


class InterventionRead(InterventionBase):
    id: UUID
    numero: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
