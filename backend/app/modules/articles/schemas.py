from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CategorieBase(BaseModel):
    nom: str
    description: Optional[str] = None


class CategorieCreate(CategorieBase):
    pass


class CategorieRead(CategorieBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ArticleBase(BaseModel):
    reference: str
    designation: str
    description: Optional[str] = None
    categorie_id: Optional[UUID] = None
    prix_vente_ht: float = Field(ge=0)
    prix_achat_ht: Optional[float] = Field(None, ge=0)
    stock_actuel: float = 0
    stock_minimum: float = 0
    unite: str = "u"
    actif: bool = True


class ArticleCreate(ArticleBase):
    pass


class ArticleUpdate(ArticleBase):
    pass


class ArticleRead(ArticleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
