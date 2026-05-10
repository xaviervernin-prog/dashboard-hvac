from uuid import UUID

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.database import get_db
from app.modules.facturation.schemas import FactureCreate, FactureRead, FactureUpdate
from app.modules.facturation.service import FacturationService

router = APIRouter()


def _service(db: Client = Depends(get_db)) -> FacturationService:
    return FacturationService(db)


@router.get("/stats")
def get_stats(svc: FacturationService = Depends(_service)):
    return svc.stats()


@router.get("/", response_model=list[FactureRead])
def list_factures(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    search: str = Query(None),
    statut: str = Query(None),
    client_id: UUID = Query(None),
    svc: FacturationService = Depends(_service),
):
    return svc.list(skip=skip, limit=limit, search=search, statut=statut, client_id=client_id)


@router.get("/{facture_id}", response_model=FactureRead)
def get_facture(facture_id: UUID, svc: FacturationService = Depends(_service)):
    return svc.get(facture_id)


@router.post("/", response_model=FactureRead, status_code=201)
def create_facture(payload: FactureCreate, svc: FacturationService = Depends(_service)):
    return svc.create(payload)


@router.put("/{facture_id}", response_model=FactureRead)
def update_facture(
    facture_id: UUID,
    payload: FactureUpdate,
    svc: FacturationService = Depends(_service),
):
    return svc.update(facture_id, payload)


@router.delete("/{facture_id}", status_code=204)
def delete_facture(facture_id: UUID, svc: FacturationService = Depends(_service)):
    svc.delete(facture_id)
