from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.database import get_db
from app.modules.agenda.schemas import (
    InterventionCreate,
    InterventionRead,
    InterventionUpdate,
)
from app.modules.agenda.service import AgendaService

router = APIRouter()


def _service(db: Client = Depends(get_db)) -> AgendaService:
    return AgendaService(db)


@router.get("/", response_model=list[InterventionRead])
def list_interventions(
    skip: int = Query(0, ge=0),
    limit: int = Query(200, le=1000),
    date_debut: date = Query(None),
    date_fin: date = Query(None),
    statut: str = Query(None),
    client_id: UUID = Query(None),
    svc: AgendaService = Depends(_service),
):
    return svc.list(
        skip=skip,
        limit=limit,
        date_debut=date_debut,
        date_fin=date_fin,
        statut=statut,
        client_id=client_id,
    )


@router.get("/{intervention_id}", response_model=InterventionRead)
def get_intervention(intervention_id: UUID, svc: AgendaService = Depends(_service)):
    return svc.get(intervention_id)


@router.post("/", response_model=InterventionRead, status_code=201)
def create_intervention(
    payload: InterventionCreate, svc: AgendaService = Depends(_service)
):
    return svc.create(payload)


@router.put("/{intervention_id}", response_model=InterventionRead)
def update_intervention(
    intervention_id: UUID,
    payload: InterventionUpdate,
    svc: AgendaService = Depends(_service),
):
    return svc.update(intervention_id, payload)


@router.delete("/{intervention_id}", status_code=204)
def delete_intervention(intervention_id: UUID, svc: AgendaService = Depends(_service)):
    svc.delete(intervention_id)
