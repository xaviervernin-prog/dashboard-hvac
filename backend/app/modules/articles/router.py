from uuid import UUID

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.database import get_db
from app.modules.articles.schemas import (
    ArticleCreate,
    ArticleRead,
    ArticleUpdate,
    CategorieCreate,
    CategorieRead,
)
from app.modules.articles.service import ArticleService

router = APIRouter()


def _service(db: Client = Depends(get_db)) -> ArticleService:
    return ArticleService(db)


# --- Catégories ---


@router.get("/categories", response_model=list[CategorieRead])
def list_categories(svc: ArticleService = Depends(_service)):
    return svc.list_categories()


@router.post("/categories", response_model=CategorieRead, status_code=201)
def create_category(payload: CategorieCreate, svc: ArticleService = Depends(_service)):
    return svc.create_category(payload)


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: UUID, svc: ArticleService = Depends(_service)):
    svc.delete_category(category_id)


# --- Articles ---


@router.get("/", response_model=list[ArticleRead])
def list_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    search: str = Query(None),
    categorie_id: UUID = Query(None),
    svc: ArticleService = Depends(_service),
):
    return svc.list(skip=skip, limit=limit, search=search, categorie_id=categorie_id)


@router.get("/{article_id}", response_model=ArticleRead)
def get_article(article_id: UUID, svc: ArticleService = Depends(_service)):
    return svc.get(article_id)


@router.post("/", response_model=ArticleRead, status_code=201)
def create_article(payload: ArticleCreate, svc: ArticleService = Depends(_service)):
    return svc.create(payload)


@router.put("/{article_id}", response_model=ArticleRead)
def update_article(
    article_id: UUID,
    payload: ArticleUpdate,
    svc: ArticleService = Depends(_service),
):
    return svc.update(article_id, payload)


@router.delete("/{article_id}", status_code=204)
def delete_article(article_id: UUID, svc: ArticleService = Depends(_service)):
    svc.delete(article_id)
