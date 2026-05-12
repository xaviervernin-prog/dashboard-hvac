import uuid
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import NotFoundError, ValidationError
from app.modules.facturation.schemas import FactureCreate
from app.modules.facturation.service import FacturationService


def _make_service(db=None):
    return FacturationService(db or MagicMock())


def test_stats_empty():
    db = MagicMock()
    db.table.return_value.select.return_value.execute.return_value.data = []
    svc = _make_service(db)
    stats = svc.stats()
    assert stats["total_facture"] == 0
    assert stats["total_paye"] == 0


def test_stats_with_data():
    db = MagicMock()
    db.table.return_value.select.return_value.execute.return_value.data = [
        {"total_ttc": 1000.0, "montant_paye": 1000.0, "statut": "payee"},
        {"total_ttc": 500.0, "montant_paye": 0.0, "statut": "envoyee"},
        {"total_ttc": 200.0, "montant_paye": 0.0, "statut": "en_retard"},
    ]
    svc = _make_service(db)
    stats = svc.stats()
    assert stats["total_facture"] == 1700.0
    assert stats["total_paye"] == 1000.0
    assert stats["total_en_attente"] == 500.0
    assert stats["total_en_retard"] == 200.0


def test_invalid_statut_raises():
    db = MagicMock()
    db.rpc.return_value.execute.return_value.data = "FAC-2026-0001"
    svc = _make_service(db)
    payload = FactureCreate(client_id=uuid.uuid4(), statut="invalide")
    with pytest.raises(ValidationError):
        svc.create(payload)
