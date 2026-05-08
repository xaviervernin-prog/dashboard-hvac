from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter()

DEFAULT_CATS = ["Unités intérieures", "Unités extérieures", "Gaines & conduits",
                "Accessoires", "Pièces détachées", "Main d'oeuvre", "Autre"]


def seed_categories(db: Session):
    if db.query(models.Categorie).count() == 0:
        for nom in DEFAULT_CATS:
            db.add(models.Categorie(nom=nom))
        db.commit()


@router.get("/", response_model=List[schemas.CategorieOut])
def list_categories(db: Session = Depends(get_db)):
    seed_categories(db)
    return db.query(models.Categorie).all()


@router.post("/", response_model=schemas.CategorieOut)
def create_categorie(data: schemas.CategorieIn, db: Session = Depends(get_db)):
    if db.query(models.Categorie).filter(models.Categorie.nom == data.nom).first():
        raise HTTPException(400, "Catégorie déjà existante")
    cat = models.Categorie(nom=data.nom)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cat_id}")
def delete_categorie(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(models.Categorie).filter(models.Categorie.id == cat_id).first()
    if not cat:
        raise HTTPException(404, "Catégorie introuvable")
    if db.query(models.Article).filter(models.Article.cat == cat.nom).first():
        raise HTTPException(400, "Des articles utilisent cette catégorie")
    db.delete(cat)
    db.commit()
    return {"ok": True}
