from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CategorieBase(BaseModel):
    nom: str


class CategorieCreate(CategorieBase):
    pass


class CategorieRead(CategorieBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ArticleBase(BaseModel):
    reference: str
    designation: str
    categorie_id: Optional[UUID] = None
    prix_unitaire: float = Field(ge=0)
    unite: str = "unité"
    description: Optional[str] = None


class ArticleCreate(ArticleBase):
    pass


class ArticleUpdate(ArticleBase):
    pass


class ArticleRead(ArticleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
