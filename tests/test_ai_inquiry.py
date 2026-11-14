import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_ai_inquiry_endpoint():
    payload = {
        "ticker": "AAPL",
        "company_name": "Apple Inc.",
        "fiscal_year": 2024,
        "form": "10-K",
        "report_date": "2024-09-28",
        "question": "What was the Total Assets figure in the filing and does the balance sheet balance?",
        "metrics": {
            "TOTAL_ASSETS": {
                "value": 359240000000.0,
                "xbrl_tag": "us-gaap:Assets",
                "evidence_snippet": "Total assets $ 359,240"
            },
            "TOTAL_LIABILITIES": {
                "value": 298000000000.0,
                "xbrl_tag": "us-gaap:Liabilities",
                "evidence_snippet": "Total liabilities $ 298,000"
            },
            "STOCKHOLDERS_EQUITY": {
                "value": 61240000000.0,
                "xbrl_tag": "us-gaap:StockholdersEquity",
                "evidence_snippet": "Total stockholders equity $ 61,240"
            }
        },
        "tie_outs": [
            {
                "rule_name": "BALANCE_SHEET_IDENTITY",
                "status": "PASSED",
                "left_value": 359240000000.0,
                "right_value": 359240000000.0,
                "numeric_difference": 0.0
            }
        ],
        "four_factor": {
            "assets": 359240000000.0,
            "liabilities": 298000000000.0,
            "equity": 61240000000.0,
            "balance_sheet_balanced": True
        }
    }

    res = client.post("/api/ai/inquire", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "citation" in data
    assert "model_name" in data
    assert data["grounded"] is True
    assert data["status"] == "SUCCESS"
    print("Gemini Answer:", data["answer"][:120])

