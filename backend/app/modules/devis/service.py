import logging
from typing import Optional
from uuid import UUID

from supabase import Client

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.devis.schemas import DevisCreate, DevisUpdate

logger = logging.getLogger(__name__)

TABLE = "devis"
VALID_STATUTS = {"brouillon", "envoye", "accepte", "refuse"}


class DevisService:
    def __init__(self, db: Client):
        self.db = db

    def _next_numero(self) -> str:
        response = self.db.rpc("next_devis_numero").execute()
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
            query = query.or_(f"objet.ilike.%{search}%,numero.ilike.%{search}%")
        if statut:
            query = query.eq("statut", statut)
        if client_id:
            query = query.eq("client_id", str(client_id))
        response = (
            query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        )
        return response.data

    def get(self, devis_id: UUID) -> dict:
        response = (
            self.db.table(TABLE)
            .select("*, clients(nom, entreprise)")
            .eq("id", str(devis_id))
            .execute()
        )
        if not response.data:
            raise NotFoundError(f"Devis {devis_id} introuvable")
        return response.data[0]

    def create(self, payload: DevisCreate) -> dict:
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")

        lignes = [l.model_dump() for l in payload.lignes]
        for ligne in lignes:
            if ligne.get("article_id"):
                ligne["article_id"] = str(ligne["article_id"])

        montant_total = (
            sum(l["total"] for l in lignes)
            if lignes
            else (payload.montant_manuel or 0.0)
        )

        data = payload.model_dump(exclude={"lignes", "montant_manuel"})
        data["client_id"] = str(payload.client_id)
        data["lignes"] = lignes
        data["montant_manuel"] = payload.montant_manuel
        data["montant_total"] = montant_total
        data["numero"] = self._next_numero()

        response = self.db.table(TABLE).insert(data).execute()
        logger.info("Devis créé : %s", data["numero"])
        return response.data[0]

    def update(self, devis_id: UUID, payload: DevisUpdate) -> dict:
        existing = self.get(devis_id)
        if existing["statut"] == "accepte" and payload.statut != "accepte":
            raise ValidationError("Un devis accepté ne peut pas être modifié")

        lignes = [l.model_dump() for l in payload.lignes]
        for ligne in lignes:
            if ligne.get("article_id"):
                ligne["article_id"] = str(ligne["article_id"])

        montant_total = (
            sum(l["total"] for l in lignes)
            if lignes
            else (payload.montant_manuel or 0.0)
        )

        data = payload.model_dump(exclude={"lignes"}, exclude_unset=True)
        data["client_id"] = str(payload.client_id)
        data["lignes"] = lignes
        data["montant_total"] = montant_total

        response = (
            self.db.table(TABLE).update(data).eq("id", str(devis_id)).execute()
        )
        return response.data[0]

    def delete(self, devis_id: UUID) -> None:
        self.get(devis_id)
        self.db.table(TABLE).delete().eq("id", str(devis_id)).execute()
        logger.info("Devis supprimé : %s", devis_id)
