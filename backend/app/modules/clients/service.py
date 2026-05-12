import logging
from typing import Optional
from uuid import UUID

from supabase import Client

from app.core.exceptions import NotFoundError
from app.modules.clients.schemas import ClientCreate, ClientUpdate

logger = logging.getLogger(__name__)

TABLE = "clients"
VALID_TYPES = {"particulier", "entreprise", "copropriete"}


class ClientService:
    def __init__(self, db: Client):
        self.db = db

    def list(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        actif: Optional[bool] = None,
    ) -> list[dict]:
        query = self.db.table(TABLE).select("*")
        if search:
            query = query.or_(f"nom.ilike.%{search}%,entreprise.ilike.%{search}%")
        if actif is not None:
            query = query.eq("actif", actif)
        response = query.order("nom").range(skip, skip + limit - 1).execute()
        return response.data

    def get(self, client_id: UUID) -> dict:
        response = (
            self.db.table(TABLE).select("*").eq("id", str(client_id)).execute()
        )
        if not response.data:
            raise NotFoundError(f"Client {client_id} introuvable")
        return response.data[0]

    def create(self, payload: ClientCreate) -> dict:
        data = payload.model_dump()
        response = self.db.table(TABLE).insert(data).execute()
        logger.info("Client créé : %s", response.data[0].get("id"))
        return response.data[0]

    def update(self, client_id: UUID, payload: ClientUpdate) -> dict:
        self.get(client_id)
        data = payload.model_dump(exclude_unset=True)
        response = (
            self.db.table(TABLE).update(data).eq("id", str(client_id)).execute()
        )
        return response.data[0]

    def delete(self, client_id: UUID) -> None:
        self.get(client_id)
        self.db.table(TABLE).delete().eq("id", str(client_id)).execute()
        logger.info("Client supprimé : %s", client_id)
