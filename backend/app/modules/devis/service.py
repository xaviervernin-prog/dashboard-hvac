import logging
from typing import Optional
from uuid import UUID

from supabase import Client

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.devis.schemas import DevisCreate, DevisLigne, DevisUpdate

logger = logging.getLogger(__name__)

TABLE = "devis"
LIGNES_TABLE = "devis_lignes"
VALID_STATUTS = {"brouillon", "envoye", "accepte", "refuse", "expire"}


def _compute_totals(lignes: list[DevisLigne]) -> tuple[float, float, float]:
    sous_total_ht = sum(l.quantite * l.prix_unitaire_ht for l in lignes)
    montant_tva = sum(l.quantite * l.prix_unitaire_ht * l.taux_tva / 100 for l in lignes)
    total_ttc = sous_total_ht + montant_tva
    return round(sous_total_ht, 2), round(montant_tva, 2), round(total_ttc, 2)


def _ligne_to_db(ligne: DevisLigne, devis_id: str) -> dict:
    qte = ligne.quantite
    pu = ligne.prix_unitaire_ht
    tva = ligne.taux_tva
    ht = round(qte * pu, 2)
    tva_amt = round(ht * tva / 100, 2)
    return {
        "devis_id": devis_id,
        "article_id": str(ligne.article_id) if ligne.article_id else None,
        "designation": ligne.designation,
        "description": ligne.description,
        "quantite": qte,
        "prix_unitaire_ht": pu,
        "taux_tva": tva,
        "montant_ht": ht,
        "montant_tva": tva_amt,
        "montant_ttc": round(ht + tva_amt, 2),
        "ordre": ligne.ordre,
    }


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
            .select(f"*, clients(nom, entreprise), {LIGNES_TABLE}(*)")
            .eq("id", str(devis_id))
            .execute()
        )
        if not response.data:
            raise NotFoundError(f"Devis {devis_id} introuvable")
        data = response.data[0]
        data["lignes"] = data.pop(LIGNES_TABLE, [])
        return data

    def create(self, payload: DevisCreate) -> dict:
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")

        sous_total_ht, montant_tva, total_ttc = _compute_totals(payload.lignes)

        data = payload.model_dump(exclude={"lignes"})
        data["client_id"] = str(payload.client_id)
        if data.get("chantier_id"):
            data["chantier_id"] = str(payload.chantier_id)
        data["numero"] = self._next_numero()
        data["sous_total_ht"] = sous_total_ht
        data["montant_tva"] = montant_tva
        data["total_ttc"] = total_ttc

        response = self.db.table(TABLE).insert(data).execute()
        devis = response.data[0]
        logger.info("Devis créé : %s", devis["numero"])

        if payload.lignes:
            lignes_data = [_ligne_to_db(l, devis["id"]) for l in payload.lignes]
            self.db.table(LIGNES_TABLE).insert(lignes_data).execute()

        return self.get(UUID(devis["id"]))

    def update(self, devis_id: UUID, payload: DevisUpdate) -> dict:
        existing = self.get(devis_id)
        if existing["statut"] == "accepte" and payload.statut != "accepte":
            raise ValidationError("Un devis accepté ne peut pas être modifié")
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")

        sous_total_ht, montant_tva, total_ttc = _compute_totals(payload.lignes)

        data = payload.model_dump(exclude={"lignes"}, exclude_unset=True)
        data["client_id"] = str(payload.client_id)
        if payload.chantier_id:
            data["chantier_id"] = str(payload.chantier_id)
        data["sous_total_ht"] = sous_total_ht
        data["montant_tva"] = montant_tva
        data["total_ttc"] = total_ttc

        self.db.table(TABLE).update(data).eq("id", str(devis_id)).execute()

        self.db.table(LIGNES_TABLE).delete().eq("devis_id", str(devis_id)).execute()
        if payload.lignes:
            lignes_data = [_ligne_to_db(l, str(devis_id)) for l in payload.lignes]
            self.db.table(LIGNES_TABLE).insert(lignes_data).execute()

        return self.get(devis_id)

    def delete(self, devis_id: UUID) -> None:
        self.get(devis_id)
        self.db.table(LIGNES_TABLE).delete().eq("devis_id", str(devis_id)).execute()
        self.db.table(TABLE).delete().eq("id", str(devis_id)).execute()
        logger.info("Devis supprimé : %s", devis_id)
