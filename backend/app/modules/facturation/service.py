import logging
from typing import Optional
from uuid import UUID

from supabase import Client

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.facturation.schemas import FactureCreate, FactureLigne, FactureUpdate

logger = logging.getLogger(__name__)

TABLE = "factures"
LIGNES_TABLE = "facture_lignes"
VALID_STATUTS = {"brouillon", "envoyee", "partiellement_payee", "payee", "en_retard", "annulee"}


def _compute_totals(lignes: list[FactureLigne]) -> tuple[float, float, float]:
    sous_total_ht = sum(l.quantite * l.prix_unitaire_ht for l in lignes)
    montant_tva = sum(l.quantite * l.prix_unitaire_ht * l.taux_tva / 100 for l in lignes)
    return round(sous_total_ht, 2), round(montant_tva, 2), round(sous_total_ht + montant_tva, 2)


def _ligne_to_db(ligne: FactureLigne, facture_id: str) -> dict:
    ht = round(ligne.quantite * ligne.prix_unitaire_ht, 2)
    tva_amt = round(ht * ligne.taux_tva / 100, 2)
    return {
        "facture_id": facture_id,
        "article_id": str(ligne.article_id) if ligne.article_id else None,
        "designation": ligne.designation,
        "description": ligne.description,
        "quantite": ligne.quantite,
        "prix_unitaire_ht": ligne.prix_unitaire_ht,
        "taux_tva": ligne.taux_tva,
        "montant_ht": ht,
        "montant_tva": tva_amt,
        "montant_ttc": round(ht + tva_amt, 2),
        "ordre": ligne.ordre,
    }


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
            query = query.or_(f"numero.ilike.%{search}%,objet.ilike.%{search}%")
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
            .select(f"*, clients(nom, entreprise), {LIGNES_TABLE}(*)")
            .eq("id", str(facture_id))
            .execute()
        )
        if not response.data:
            raise NotFoundError(f"Facture {facture_id} introuvable")
        return response.data[0]

    def create(self, payload: FactureCreate) -> dict:
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")

        sous_total_ht, montant_tva, total_ttc = _compute_totals(payload.lignes)

        data = payload.model_dump(exclude={"lignes"})
        data["client_id"] = str(payload.client_id)
        if data.get("devis_id"):
            data["devis_id"] = str(payload.devis_id)
        if data.get("chantier_id"):
            data["chantier_id"] = str(payload.chantier_id)
        data["numero"] = self._next_numero()
        data["sous_total_ht"] = sous_total_ht
        data["montant_tva"] = montant_tva
        data["total_ttc"] = total_ttc

        response = self.db.table(TABLE).insert(data).execute()
        facture = response.data[0]
        logger.info("Facture créée : %s", facture["numero"])

        if payload.lignes:
            lignes_data = [_ligne_to_db(l, facture["id"]) for l in payload.lignes]
            self.db.table(LIGNES_TABLE).insert(lignes_data).execute()

        return self.get(UUID(facture["id"]))

    def update(self, facture_id: UUID, payload: FactureUpdate) -> dict:
        self.get(facture_id)
        if payload.statut not in VALID_STATUTS:
            raise ValidationError(f"Statut invalide : {payload.statut}")

        sous_total_ht, montant_tva, total_ttc = _compute_totals(payload.lignes)

        data = payload.model_dump(exclude={"lignes"}, exclude_unset=True)
        data["client_id"] = str(payload.client_id)
        if payload.devis_id:
            data["devis_id"] = str(payload.devis_id)
        if payload.chantier_id:
            data["chantier_id"] = str(payload.chantier_id)
        data["sous_total_ht"] = sous_total_ht
        data["montant_tva"] = montant_tva
        data["total_ttc"] = total_ttc

        self.db.table(TABLE).update(data).eq("id", str(facture_id)).execute()

        self.db.table(LIGNES_TABLE).delete().eq("facture_id", str(facture_id)).execute()
        if payload.lignes:
            lignes_data = [_ligne_to_db(l, str(facture_id)) for l in payload.lignes]
            self.db.table(LIGNES_TABLE).insert(lignes_data).execute()

        return self.get(facture_id)

    def delete(self, facture_id: UUID) -> None:
        self.get(facture_id)
        self.db.table(LIGNES_TABLE).delete().eq("facture_id", str(facture_id)).execute()
        self.db.table(TABLE).delete().eq("id", str(facture_id)).execute()
        logger.info("Facture supprimée : %s", facture_id)

    def stats(self) -> dict:
        response = self.db.table(TABLE).select("sous_total_ht, total_ttc, montant_paye, statut").execute()
        rows = response.data
        return {
            "total_facture": sum(r["total_ttc"] for r in rows),
            "total_paye": sum(r["montant_paye"] for r in rows),
            "total_en_attente": sum(r["total_ttc"] for r in rows if r["statut"] in ("brouillon", "envoyee")),
            "total_en_retard": sum(r["total_ttc"] for r in rows if r["statut"] == "en_retard"),
        }
