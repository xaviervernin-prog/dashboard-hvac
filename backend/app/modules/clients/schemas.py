from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class Chantier(BaseModel):
    nom: str
    adresse: str


class ClientBase(BaseModel):
    nom: str
    entreprise: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    statut: str = "actif"
    adresse_facturation: Optional[str] = None
    chantiers: list[Chantier] = []


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    pass


class ClientRead(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
