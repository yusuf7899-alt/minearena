"""
Tests for XBRL Ground Truth Service and Accounting Tag Fallbacks.
"""
from backend.app.services.xbrl_service import XBRLService, TAG_FALLBACKS

def test_tag_fallbacks_configuration():
    assert "REVENUES" in TAG_FALLBACKS
    assert "RevenueFromContractWithCustomerExcludingAssessedTax" in TAG_FALLBACKS["REVENUES"]
    assert "Revenues" in TAG_FALLBACKS["REVENUES"]
    assert "TOTAL_ASSETS" in TAG_FALLBACKS
    assert "TOTAL_LIABILITIES" in TAG_FALLBACKS
    assert "STOCKHOLDERS_EQUITY" in TAG_FALLBACKS
    assert "NET_INCOME" in TAG_FALLBACKS
    assert "OPERATING_CASH_FLOW" in TAG_FALLBACKS

def test_xbrl_find_best_fact():
    service = XBRLService()
    sample_tag_data = {
        "units": {
            "USD": [
                {"form": "10-Q", "fy": 2024, "fp": "Q1", "val": 1000},
                {"form": "10-K", "fy": 2023, "fp": "FY", "val": 3000, "filed": "2023-11-01"},
                {"form": "10-K", "fy": 2024, "fp": "FY", "val": 4000, "filed": "2024-11-01"},
                {"form": "10-K/A", "fy": 2024, "fp": "FY", "val": 4050, "filed": "2025-01-15"}
            ]
        }
    }
    
    # Should select amended 10-K/A for FY2024
    best = service._find_best_fact_in_tag(sample_tag_data, "REVENUES", 2024)
    assert best is not None
    assert best["val"] == 4050
    assert best["form"] == "10-K/A"

    # Should select FY2023
    best_2023 = service._find_best_fact_in_tag(sample_tag_data, "REVENUES", 2023)
    assert best_2023 is not None
    assert best_2023["val"] == 3000

