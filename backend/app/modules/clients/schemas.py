from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class ClientBase(BaseModel):
    nom: str
    prenom: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    type: str = "particulier"
    entreprise: Optional[str] = None
    trn: Optional[str] = None
    adresse: Optional[str] = None
    emirat: str = "Dubai"
    notes: Optional[str] = None
    actif: bool = True


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    pass


class ClientRead(ClientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
