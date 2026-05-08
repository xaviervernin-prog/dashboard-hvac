from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter()


def client_to_out(c: models.Client) -> schemas.ClientOut:
    return schemas.ClientOut(
        id=c.id, nom=c.nom, prenom=c.prenom or "", ent=c.ent or "",
        tel=c.tel or "", email=c.email or "", statut=c.statut or "prospect",
        fact_rue=c.fact_rue or "", fact_ville=c.fact_ville or "", fact_pays=c.fact_pays or "UAE",
        chantiers=[schemas.ChantierOut(
            id=ch.id, client_id=ch.client_id, nom=ch.nom or "", adresse=ch.adresse or "",
            c_nom=ch.c_nom or "", c_prenom=ch.c_prenom or "", c_tel=ch.c_tel or ""
        ) for ch in c.chantiers]
    )


@router.get("/", response_model=List[schemas.ClientOut])
def list_clients(db: Session = Depends(get_db)):
    return [client_to_out(c) for c in db.query(models.Client).all()]


@router.post("/", response_model=schemas.ClientOut)
def create_client(data: schemas.ClientIn, db: Session = Depends(get_db)):
    c = models.Client(
        nom=data.nom, prenom=data.prenom, ent=data.ent, tel=data.tel,
        email=data.email, statut=data.statut,
        fact_rue=data.fact_rue, fact_ville=data.fact_ville, fact_pays=data.fact_pays
    )
    db.add(c)
    db.flush()
    for ch in data.chantiers:
        db.add(models.Chantier(client_id=c.id, **ch.model_dump()))
    db.commit()
    db.refresh(c)
    return client_to_out(c)


@router.put("/{client_id}", response_model=schemas.ClientOut)
def update_client(client_id: int, data: schemas.ClientIn, db: Session = Depends(get_db)):
    c = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client introuvable")
    for k, v in data.model_dump(exclude={"chantiers"}).items():
        setattr(c, k, v)
    db.query(models.Chantier).filter(models.Chantier.client_id == client_id).delete()
    for ch in data.chantiers:
        db.add(models.Chantier(client_id=client_id, **ch.model_dump()))
    db.commit()
    db.refresh(c)
    return client_to_out(c)


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client introuvable")
    db.delete(c)
    db.commit()
    return {"ok": True}
