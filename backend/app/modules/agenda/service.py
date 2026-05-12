import logging
from datetime import date
from typing import Optional
from uuid import UUID

from supabase import Client

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.agenda.schemas import InterventionCreate, InterventionUpdate

logger = logging.getLogger(__name__)

TABLE = "interventions"
VALID_STATUTS = {"planifiee", "en_cours", "terminee", "annulee"}
VALID_TYPES = {"installation", "maintenance", "depannage", "renovation"}


class AgendaService:
    def __init__(self, db: Client):
        self.db = db

    def _next_numero(self) -> str:
        response = self.db.rpc("next_intervention_numero").execute()
        return response.data

    def list(
        self,
        skip: int = 0,
        limit: int = 200,
        date_debut: Optional[date] = None,
        date_fin: Optional[date] = None,
        statut: Optional[str] = None,
        client_id: Optional[UUID] = None,
    ) -> list[dict]:
        query = self.db.table(TABLE).select("*, clients(nom, entreprise), chantiers(nom, adresse)")
        if date_debut:
            query = query.gte("date_debut", date_debut.isoformat())
        if date_fin:
            query = query.lte("date_debut", date_fin.isoformat())
        if statut:
            query = query.eq("statut", statut)
        if client_id:
            query = query.eq("client_id", str(client_id))
        response = (
            query.order("date_debut").range(skip, skip + limit - 1).execute()
        )
        return response.data

    def get(self, intervention_id: UUID) -> dict:
        response = (
            self.db.table(TABLE)
            .select("*, clients(nom, entreprise), chantiers(nom, adresse)")
            .eq("id", str(intervention_id))
            .execute()
        )
        if not response.data:
            raise NotFoundError(f"Intervention {intervention_id} introuvable")
        return response.data[0]

    def create(self, payload: InterventionCreate) -> dict:
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")
        if payload.type not in VALID_TYPES:
            raise ValidationError(f"Type invalide : {payload.type}")
        if payload.date_fin_prevue and payload.date_fin_prevue <= payload.date_debut:
            raise ValidationError("La date de fin doit être après la date de début")

        data = payload.model_dump()
        data["client_id"] = str(payload.client_id)
        if payload.chantier_id:
            data["chantier_id"] = str(payload.chantier_id)
        data["numero"] = self._next_numero()
        data["date_debut"] = payload.date_debut.isoformat()
        if payload.date_fin_prevue:
            data["date_fin_prevue"] = payload.date_fin_prevue.isoformat()
        if payload.date_fin_reelle:
            data["date_fin_reelle"] = payload.date_fin_reelle.isoformat()

        response = self.db.table(TABLE).insert(data).execute()
        logger.info("Intervention créée : %s", response.data[0].get("numero"))
        return response.data[0]

    def update(self, intervention_id: UUID, payload: InterventionUpdate) -> dict:
        self.get(intervention_id)
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")
        if payload.type not in VALID_TYPES:
            raise ValidationError(f"Type invalide : {payload.type}")

        data = payload.model_dump(exclude_unset=True)
        data["client_id"] = str(payload.client_id)
        if payload.chantier_id:
            data["chantier_id"] = str(payload.chantier_id)
        data["date_debut"] = payload.date_debut.isoformat()
        if payload.date_fin_prevue:
            data["date_fin_prevue"] = payload.date_fin_prevue.isoformat()
        if payload.date_fin_reelle:
            data["date_fin_reelle"] = payload.date_fin_reelle.isoformat()

        response = (
            self.db.table(TABLE)
            .update(data)
            .eq("id", str(intervention_id))
            .execute()
        )
        return response.data[0]

    def delete(self, intervention_id: UUID) -> None:
        self.get(intervention_id)
        self.db.table(TABLE).delete().eq("id", str(intervention_id)).execute()
        logger.info("Intervention supprimée : %s", intervention_id)
