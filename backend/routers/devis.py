from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter()


def next_num(db: Session) -> str:
    counter = db.query(models.Counter).filter(models.Counter.id == "devis").first()
    if not counter:
        counter = models.Counter(id="devis", value=1)
        db.add(counter)
    val = counter.value
    counter.value += 1
    db.flush()
    return f"DEV-{val:03d}"


def devis_to_out(d: models.Devis) -> schemas.DevisOut:
    client_nom = ""
    if d.client:
        client_nom = f"{d.client.nom} {d.client.prenom or ''}".strip()
    return schemas.DevisOut(
        id=d.id, num=d.num, client_id=d.client_id, client_nom=client_nom,
        objet=d.objet or "", date=d.date or "", montant=d.montant or 0.0,
        statut=d.statut or "en_attente", relance_date=d.relance_date,
        lignes=[schemas.DevisLigneOut(id=l.id, devis_id=l.devis_id,
                article_id=l.article_id, qty=l.qty, prix=l.prix) for l in d.lignes]
    )


@router.get("/", response_model=List[schemas.DevisOut])
def list_devis(db: Session = Depends(get_db)):
    return [devis_to_out(d) for d in db.query(models.Devis).all()]


@router.post("/", response_model=schemas.DevisOut)
def create_devis(data: schemas.DevisIn, db: Session = Depends(get_db)):
    d = models.Devis(
        num=next_num(db), client_id=data.client_id, objet=data.objet,
        date=data.date, montant=data.montant, statut=data.statut,
        relance_date=data.relance_date
    )
    db.add(d)
    db.flush()
    for l in data.lignes:
        db.add(models.DevisLigne(devis_id=d.id, article_id=l.article_id,
                                  qty=l.qty, prix=l.prix))
    db.commit()
    db.refresh(d)
    return devis_to_out(d)


@router.put("/{devis_id}", response_model=schemas.DevisOut)
def update_devis(devis_id: int, data: schemas.DevisIn, db: Session = Depends(get_db)):
    d = db.query(models.Devis).filter(models.Devis.id == devis_id).first()
    if not d:
        raise HTTPException(404, "Devis introuvable")
    locked = d.statut == "accepte"
    d.statut = data.statut
    d.date = data.date
    d.relance_date = data.relance_date
    if not locked:
        d.client_id = data.client_id
        d.objet = data.objet
        d.montant = data.montant
        db.query(models.DevisLigne).filter(models.DevisLigne.devis_id == devis_id).delete()
        for l in data.lignes:
            db.add(models.DevisLigne(devis_id=devis_id, article_id=l.article_id,
                                      qty=l.qty, prix=l.prix))
    db.commit()
    db.refresh(d)
    return devis_to_out(d)


@router.patch("/{devis_id}/relance")
def relancer_devis(devis_id: int, db: Session = Depends(get_db)):
    from datetime import date
    d = db.query(models.Devis).filter(models.Devis.id == devis_id).first()
    if not d:
        raise HTTPException(404, "Devis introuvable")
    d.relance_date = date.today().isoformat()
    db.commit()
    return {"ok": True}


@router.delete("/{devis_id}")
def delete_devis(devis_id: int, db: Session = Depends(get_db)):
    d = db.query(models.Devis).filter(models.Devis.id == devis_id).first()
    if not d:
        raise HTTPException(404, "Devis introuvable")
    db.delete(d)
    db.commit()
    return {"ok": True}
