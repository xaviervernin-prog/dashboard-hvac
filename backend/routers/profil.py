from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas

router = APIRouter()


def get_or_create_profil(db: Session) -> models.Profil:
    p = db.query(models.Profil).first()
    if not p:
        p = models.Profil(id=1)
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


@router.get("/", response_model=schemas.ProfilOut)
def get_profil(db: Session = Depends(get_db)):
    return get_or_create_profil(db)


@router.put("/", response_model=schemas.ProfilOut)
def update_profil(data: schemas.ProfilIn, db: Session = Depends(get_db)):
    p = get_or_create_profil(db)
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p
