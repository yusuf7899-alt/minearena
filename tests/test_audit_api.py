"""
Tests for Audit Ingestion API Endpoints.
"""
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_upload_csv_endpoint():
    sample_csv = b"""Consolidated Statements (in millions)
Concept,2024
Total Revenue,50000
Net Income,12000
Total Assets,100000
Total Liabilities,60000
Total Equity,40000
"""
    files = {"file": ("test_statement.csv", sample_csv, "text/csv")}
    response = client.post("/api/audit/upload", files=files, data={"company_name": "Acme Corp"})
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "upload_csv"
    assert data["company_name"] == "Acme Corp"
    assert "REVENUES" in data["metrics"]
    assert data["metrics"]["REVENUES"]["value"] == 50000000000.0

