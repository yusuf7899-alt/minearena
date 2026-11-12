"""
Tests for SQLAlchemy models, companies seeding, and schema integrity.
"""
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_list_companies():
    response = client.get("/api/companies")
    assert response.status_code == 200
    companies = response.json()
    assert len(companies) >= 5
    tickers = [c["ticker"] for c in companies]
    assert "AAPL" in tickers
    assert "MSFT" in tickers
    assert "TSLA" in tickers
    assert "IBM" in tickers
    assert "GOOGL" in tickers

