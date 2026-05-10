import logging
from typing import Optional
from uuid import UUID

from supabase import Client

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.articles.schemas import ArticleCreate, ArticleUpdate, CategorieCreate

logger = logging.getLogger(__name__)

ARTICLES_TABLE = "articles"
CATEGORIES_TABLE = "categories"


class ArticleService:
    def __init__(self, db: Client):
        self.db = db

    # --- Catégories ---

    def list_categories(self) -> list[dict]:
        response = self.db.table(CATEGORIES_TABLE).select("*").order("nom").execute()
        return response.data

    def create_category(self, payload: CategorieCreate) -> dict:
        existing = (
            self.db.table(CATEGORIES_TABLE)
            .select("id")
            .eq("nom", payload.nom)
            .execute()
        )
        if existing.data:
            raise ConflictError(f"La catégorie '{payload.nom}' existe déjà")
        response = self.db.table(CATEGORIES_TABLE).insert({"nom": payload.nom}).execute()
        return response.data[0]

    def delete_category(self, category_id: UUID) -> None:
        used = (
            self.db.table(ARTICLES_TABLE)
            .select("id")
            .eq("categorie_id", str(category_id))
            .execute()
        )
        if used.data:
            raise ConflictError("Des articles utilisent cette catégorie")
        self.db.table(CATEGORIES_TABLE).delete().eq("id", str(category_id)).execute()

    # --- Articles ---

    def list(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        categorie_id: Optional[UUID] = None,
    ) -> list[dict]:
        query = self.db.table(ARTICLES_TABLE).select("*, categories(nom)")
        if search:
            query = query.or_(
                f"reference.ilike.%{search}%,designation.ilike.%{search}%"
            )
        if categorie_id:
            query = query.eq("categorie_id", str(categorie_id))
        response = query.order("designation").range(skip, skip + limit - 1).execute()
        return response.data

    def get(self, article_id: UUID) -> dict:
        response = (
            self.db.table(ARTICLES_TABLE)
            .select("*, categories(nom)")
            .eq("id", str(article_id))
            .execute()
        )
        if not response.data:
            raise NotFoundError(f"Article {article_id} introuvable")
        return response.data[0]

    def create(self, payload: ArticleCreate) -> dict:
        existing = (
            self.db.table(ARTICLES_TABLE)
            .select("id")
            .eq("reference", payload.reference)
            .execute()
        )
        if existing.data:
            raise ConflictError(f"La référence '{payload.reference}' est déjà utilisée")
        data = payload.model_dump()
        if data.get("categorie_id"):
            data["categorie_id"] = str(data["categorie_id"])
        response = self.db.table(ARTICLES_TABLE).insert(data).execute()
        logger.info("Article créé : %s", response.data[0].get("id"))
        return response.data[0]

    def update(self, article_id: UUID, payload: ArticleUpdate) -> dict:
        self.get(article_id)
        data = payload.model_dump(exclude_unset=True)
        if "categorie_id" in data and data["categorie_id"]:
            data["categorie_id"] = str(data["categorie_id"])
        response = (
            self.db.table(ARTICLES_TABLE).update(data).eq("id", str(article_id)).execute()
        )
        return response.data[0]

    def delete(self, article_id: UUID) -> None:
        self.get(article_id)
        self.db.table(ARTICLES_TABLE).delete().eq("id", str(article_id)).execute()
        logger.info("Article supprimé : %s", article_id)
