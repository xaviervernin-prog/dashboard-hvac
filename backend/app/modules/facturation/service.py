import logging
from typing import Optional
from uuid import UUID

from supabase import Client

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.facturation.schemas import FactureCreate, FactureUpdate

logger = logging.getLogger(__name__)

TABLE = "factures"
VALID_STATUTS = {"en_attente", "payee", "en_retard", "annulee"}


class FacturationService:
    def __init__(self, db: Client):
        self.db = db

    def _next_numero(self) -> str:
        response = self.db.rpc("next_facture_numero").execute()
        return response.data

    def list(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        statut: Optional[str] = None,
        client_id: Optional[UUID] = None,
    ) -> list[dict]:
        query = self.db.table(TABLE).select("*, clients(nom, entreprise)")
        if search:
            query = query.or_(f"numero.ilike.%{search}%")
        if statut:
            query = query.eq("statut", statut)
        if client_id:
            query = query.eq("client_id", str(client_id))
        response = (
            query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        )
        return response.data

    def get(self, facture_id: UUID) -> dict:
        response = (
            self.db.table(TABLE)
            .select("*, clients(nom, entreprise)")
            .eq("id", str(facture_id))
            .execute()
        )
        if not response.data:
            raise NotFoundError(f"Facture {facture_id} introuvable")
        return response.data[0]

    def create(self, payload: FactureCreate) -> dict:
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")

        data = payload.model_dump()
        data["client_id"] = str(payload.client_id)
        if data.get("devis_id"):
            data["devis_id"] = str(payload.devis_id)
        data["numero"] = self._next_numero()

        response = self.db.table(TABLE).insert(data).execute()
        logger.info("Facture créée : %s", data["numero"])
        return response.data[0]

    def update(self, facture_id: UUID, payload: FactureUpdate) -> dict:
        self.get(facture_id)
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")

        data = payload.model_dump(exclude_unset=True)
        data["client_id"] = str(payload.client_id)
        if data.get("devis_id"):
            data["devis_id"] = str(payload.devis_id)

        response = (
            self.db.table(TABLE).update(data).eq("id", str(facture_id)).execute()
        )
        return response.data[0]

    def delete(self, facture_id: UUID) -> None:
        self.get(facture_id)
        self.db.table(TABLE).delete().eq("id", str(facture_id)).execute()
        logger.info("Facture supprimée : %s", facture_id)

    def stats(self) -> dict:
        response = self.db.table(TABLE).select("montant, statut").execute()
        rows = response.data
        return {
            "total_facture": sum(r["montant"] for r in rows),
            "total_paye": sum(r["montant"] for r in rows if r["statut"] == "payee"),
            "total_en_attente": sum(
                r["montant"] for r in rows if r["statut"] == "en_attente"
            ),
            "total_en_retard": sum(
                r["montant"] for r in rows if r["statut"] == "en_retard"
            ),
        }
