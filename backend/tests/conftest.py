import os

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-key")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DEBUG", "true")


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def client(mock_db):
    with patch("app.database.get_db", return_value=mock_db):
        from app.main import app
        with TestClient(app) as c:
            yield c


@pytest.fixture
def sample_client_data():
    return {
        "nom": "Dupont HVAC",
        "prenom": "Jean",
        "entreprise": "Dupont & Fils",
        "email": "contact@dupont.ae",
        "telephone": "+971501234567",
        "type": "entreprise",
        "emirat": "Dubai",
        "actif": True,
    }


@pytest.fixture
def sample_article_data():
    return {
        "reference": "ART-001",
        "designation": "Climatiseur 2.5 Kw",
        "prix_vente_ht": 1500.0,
        "unite": "u",
    }
