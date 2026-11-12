"""
Tests for Financial Statement Upload Service (CSV).
"""
from backend.app.services.upload_service import upload_service, clean_financial_number

def test_clean_financial_number():
    assert clean_financial_number("$1,234,567.89") == 1234567.89
    assert clean_financial_number("(500,000)") == -500000.0
    assert clean_financial_number("-125.50") == -125.50
    assert clean_financial_number("—") == 0.0

def test_parse_csv_statement():
    sample_csv = """Consolidated Statement of Operations (in millions)
Line Item,2024,2023
Total Net Sales,$383285,$394328
Gross Profit,$169148,$169148
Operating Income,$114301,$114301
Net Income,$96995,$96995
Total Assets,$352583,$352583
Total Liabilities,$290437,$290437
Total Stockholders' Equity,$62146,$62146
Cash provided by operating activities,$110543,$110543
"""
    parsed = upload_service.parse_csv(sample_csv.encode("utf-8"), "aapl_sample.csv")
    assert parsed["source"] == "upload_csv"
    metrics = parsed["metrics"]
    
    assert "REVENUES" in metrics
    # Scale was millions, so 383285 * 1,000,000 = 383,285,000,000
    assert metrics["REVENUES"]["value"] == 383285000000.0
    assert "NET_INCOME" in metrics
    assert metrics["NET_INCOME"]["value"] == 96995000000.0
    assert "TOTAL_ASSETS" in metrics
    assert "TOTAL_LIABILITIES" in metrics
    assert "STOCKHOLDERS_EQUITY" in metrics

