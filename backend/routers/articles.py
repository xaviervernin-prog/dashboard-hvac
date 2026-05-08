from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter()


def next_ref(db: Session) -> str:
    counter = db.query(models.Counter).filter(models.Counter.id == "article").first()
    if not counter:
        counter = models.Counter(id="article", value=1)
        db.add(counter)
    val = counter.value
    counter.value += 1
    db.flush()
    return f"REF-{val:03d}"


@router.get("/", response_model=List[schemas.ArticleOut])
def list_articles(db: Session = Depends(get_db)):
    return db.query(models.Article).all()


@router.post("/", response_model=schemas.ArticleOut)
def create_article(data: schemas.ArticleIn, db: Session = Depends(get_db)):
    ref = data.ref.strip() or next_ref(db)
    if db.query(models.Article).filter(models.Article.ref == ref).first():
        raise HTTPException(400, f"Référence {ref} déjà existante")
    a = models.Article(ref=ref, nom=data.nom, cat=data.cat, desc=data.desc,
                       prix=data.prix, stock=data.stock)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{article_id}", response_model=schemas.ArticleOut)
def update_article(article_id: int, data: schemas.ArticleIn, db: Session = Depends(get_db)):
    a = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not a:
        raise HTTPException(404, "Article introuvable")
    for k, v in data.model_dump().items():
        if k == "ref" and not v:
            continue
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{article_id}")
def delete_article(article_id: int, db: Session = Depends(get_db)):
    a = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not a:
        raise HTTPException(404, "Article introuvable")
    db.delete(a)
    db.commit()
    return {"ok": True}
