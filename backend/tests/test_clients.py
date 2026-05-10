import uuid
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import NotFoundError
from app.modules.clients.schemas import ClientCreate
from app.modules.clients.service import ClientService


def _make_service(db=None):
    return ClientService(db or MagicMock())


def test_list_returns_data():
    db = MagicMock()
    db.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value.data = [
        {"id": str(uuid.uuid4()), "nom": "Test Client"}
    ]
    svc = _make_service(db)
    result = svc.list()
    assert len(result) == 1
    assert result[0]["nom"] == "Test Client"


def test_get_raises_not_found():
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    svc = _make_service(db)
    with pytest.raises(NotFoundError):
        svc.get(uuid.uuid4())


def test_create_client():
    db = MagicMock()
    client_id = str(uuid.uuid4())
    db.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": client_id, "nom": "Nouveau Client", "statut": "actif"}
    ]
    svc = _make_service(db)
    payload = ClientCreate(nom="Nouveau Client")
    result = svc.create(payload)
    assert result["id"] == client_id
    db.table.return_value.insert.assert_called_once()


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
