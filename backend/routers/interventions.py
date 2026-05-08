from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter()


def interv_to_out(iv: models.Intervention) -> schemas.InterventionOut:
    devis = iv.devis
    client = devis.client if devis else None
    return schemas.InterventionOut(
        id=iv.id,
        devis_id=iv.devis_id,
        devis_num=devis.num if devis else "",
        client_id=client.id if client else None,
        client_nom=f"{client.nom} {client.prenom or ''}".strip() if client else "",
        client_tel=client.tel if client else "",
        client_email=client.email if client else "",
        objet=devis.objet if devis else "",
        date=iv.date, hd=iv.hd, hf=iv.hf,
        lieu=iv.lieu or "", tech=iv.tech or "", notes=iv.notes or "",
        montant=iv.montant or 0.0, statut=iv.statut or "planifiee"
    )


@router.get("/", response_model=List[schemas.InterventionOut])
def list_interventions(db: Session = Depends(get_db)):
    return [interv_to_out(iv) for iv in db.query(models.Intervention).all()]


@router.post("/", response_model=schemas.InterventionOut)
def create_intervention(data: schemas.InterventionIn, db: Session = Depends(get_db)):
    montant = 0.0
    if data.devis_id:
        d = db.query(models.Devis).filter(models.Devis.id == data.devis_id).first()
        if d:
            montant = d.montant or 0.0
    iv = models.Intervention(
        devis_id=data.devis_id, date=data.date, hd=data.hd, hf=data.hf,
        lieu=data.lieu, tech=data.tech, notes=data.notes,
        statut=data.statut, montant=montant
    )
    db.add(iv)
    db.commit()
    db.refresh(iv)
    return interv_to_out(iv)


@router.put("/{interv_id}", response_model=schemas.InterventionOut)
def update_intervention(interv_id: int, data: schemas.InterventionIn, db: Session = Depends(get_db)):
    iv = db.query(models.Intervention).filter(models.Intervention.id == interv_id).first()
    if not iv:
        raise HTTPException(404, "Intervention introuvable")
    for k, v in data.model_dump().items():
        setattr(iv, k, v)
    db.commit()
    db.refresh(iv)
    return interv_to_out(iv)


@router.patch("/{interv_id}/statut")
def update_statut(interv_id: int, statut: str, db: Session = Depends(get_db)):
    iv = db.query(models.Intervention).filter(models.Intervention.id == interv_id).first()
    if not iv:
        raise HTTPException(404, "Intervention introuvable")
    iv.statut = statut
    db.commit()
    return {"ok": True}


@router.delete("/{interv_id}")
def delete_intervention(interv_id: int, db: Session = Depends(get_db)):
    iv = db.query(models.Intervention).filter(models.Intervention.id == interv_id).first()
    if not iv:
        raise HTTPException(404, "Intervention introuvable")
    db.delete(iv)
    db.commit()
    return {"ok": True}
