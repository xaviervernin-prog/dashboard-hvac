import uuid
from unittest.mock import MagicMock

import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.modules.articles.schemas import ArticleCreate
from app.modules.articles.service import ArticleService


def _make_service(db=None):
    return ArticleService(db or MagicMock())


def test_list_articles():
    db = MagicMock()
    db.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value.data = [
        {"id": str(uuid.uuid4()), "designation": "Clim 2.5Kw"}
    ]
    svc = _make_service(db)
    result = svc.list()
    assert len(result) == 1


def test_create_duplicate_reference_raises_conflict():
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": str(uuid.uuid4())}
    ]
    svc = _make_service(db)
    payload = ArticleCreate(reference="ART-001", designation="Test", prix_vente_ht=100.0)
    with pytest.raises(ConflictError):
        svc.create(payload)


def test_delete_article_not_found():
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    svc = _make_service(db)
    with pytest.raises(NotFoundError):
        svc.delete(uuid.uuid4())
