from uuid import UUID

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.database import get_db
from app.modules.clients.schemas import ClientCreate, ClientRead, ClientUpdate
from app.modules.clients.service import ClientService

router = APIRouter()


def _service(db: Client = Depends(get_db)) -> ClientService:
    return ClientService(db)


@router.get("/", response_model=list[ClientRead])
def list_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
    search: str = Query(None),
    statut: str = Query(None),
    svc: ClientService = Depends(_service),
):
    return svc.list(skip=skip, limit=limit, search=search, statut=statut)


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: UUID, svc: ClientService = Depends(_service)):
    return svc.get(client_id)


@router.post("/", response_model=ClientRead, status_code=201)
def create_client(payload: ClientCreate, svc: ClientService = Depends(_service)):
    return svc.create(payload)


@router.put("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: UUID,
    payload: ClientUpdate,
    svc: ClientService = Depends(_service),
):
    return svc.update(client_id, payload)


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: UUID, svc: ClientService = Depends(_service)):
    svc.delete(client_id)
