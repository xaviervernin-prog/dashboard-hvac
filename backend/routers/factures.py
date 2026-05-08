from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter()


def next_num(db: Session) -> str:
    counter = db.query(models.Counter).filter(models.Counter.id == "facture").first()
    if not counter:
        counter = models.Counter(id="facture", value=1)
        db.add(counter)
    val = counter.value
    counter.value += 1
    db.flush()
    return f"FAC-{val:03d}"


def facture_to_out(f: models.Facture) -> schemas.FactureOut:
    client_nom = ""
    if f.client:
        client_nom = f"{f.client.nom} {f.client.prenom or ''}".strip()
    return schemas.FactureOut(
        id=f.id, num=f.num, client_id=f.client_id, client_nom=client_nom,
        devis_ref=f.devis_ref or "", date=f.date or "", echeance=f.echeance or "",
        montant=f.montant or 0.0, statut=f.statut or "en_attente",
        relance_date=f.relance_date
    )


@router.get("/", response_model=List[schemas.FactureOut])
def list_factures(db: Session = Depends(get_db)):
    return [facture_to_out(f) for f in db.query(models.Facture).all()]


@router.post("/", response_model=schemas.FactureOut)
def create_facture(data: schemas.FactureIn, db: Session = Depends(get_db)):
    f = models.Facture(
        num=next_num(db), client_id=data.client_id, devis_ref=data.devis_ref,
        date=data.date, echeance=data.echeance, montant=data.montant,
        statut=data.statut, relance_date=data.relance_date
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return facture_to_out(f)


@router.put("/{facture_id}", response_model=schemas.FactureOut)
def update_facture(facture_id: int, data: schemas.FactureIn, db: Session = Depends(get_db)):
    f = db.query(models.Facture).filter(models.Facture.id == facture_id).first()
    if not f:
        raise HTTPException(404, "Facture introuvable")
    for k, v in data.model_dump().items():
        setattr(f, k, v)
    db.commit()
    db.refresh(f)
    return facture_to_out(f)


@router.patch("/{facture_id}/relance")
def relancer_facture(facture_id: int, db: Session = Depends(get_db)):
    from datetime import date
    f = db.query(models.Facture).filter(models.Facture.id == facture_id).first()
    if not f:
        raise HTTPException(404, "Facture introuvable")
    f.relance_date = date.today().isoformat()
    db.commit()
    return {"ok": True}


@router.delete("/{facture_id}")
def delete_facture(facture_id: int, db: Session = Depends(get_db)):
    f = db.query(models.Facture).filter(models.Facture.id == facture_id).first()
    if not f:
        raise HTTPException(404, "Facture introuvable")
    db.delete(f)
    db.commit()
    return {"ok": True}
