"""
Unit tests for Moneta health check and API status.
"""
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    # Returns HTML when frontend is built, or JSON when API-only
    content_type = response.headers.get("content-type", "")
    assert "text/html" in content_type or "application/json" in content_type

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "Moneta"
    assert data["version"] == "1.0.0"
    assert data["database"] == "connected"
    assert "MonetaPreAudit" in data["sec_user_agent"]

def test_api_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
