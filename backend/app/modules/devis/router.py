from uuid import UUID

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.database import get_db
from app.modules.devis.schemas import DevisCreate, DevisRead, DevisUpdate
from app.modules.devis.service import DevisService

router = APIRouter()


def _service(db: Client = Depends(get_db)) -> DevisService:
    return DevisService(db)


@router.get("/", response_model=list[DevisRead])
def list_devis(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    search: str = Query(None),
    statut: str = Query(None),
    client_id: UUID = Query(None),
    svc: DevisService = Depends(_service),
):
    return svc.list(skip=skip, limit=limit, search=search, statut=statut, client_id=client_id)


@router.get("/{devis_id}", response_model=DevisRead)
def get_devis(devis_id: UUID, svc: DevisService = Depends(_service)):
    return svc.get(devis_id)


@router.post("/", response_model=DevisRead, status_code=201)
def create_devis(payload: DevisCreate, svc: DevisService = Depends(_service)):
    return svc.create(payload)


@router.put("/{devis_id}", response_model=DevisRead)
def update_devis(
    devis_id: UUID,
    payload: DevisUpdate,
    svc: DevisService = Depends(_service),
):
    return svc.update(devis_id, payload)


@router.delete("/{devis_id}", status_code=204)
def delete_devis(devis_id: UUID, svc: DevisService = Depends(_service)):
    svc.delete(devis_id)
