"""
Verification script for Phase 2: Ingests 3-5 real SEC EDGAR 10-K filings and parses XBRL ground truth facts.
"""
from pathlib import Path
import sys

# Ensure project root in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.sec_client import sec_client
from backend.app.services.xbrl_service import xbrl_service
import json

TARGET_COMPANIES = [
    {"ticker": "AAPL", "name": "Apple Inc.", "target_fy": 2024},
    {"ticker": "MSFT", "name": "Microsoft Corporation", "target_fy": 2024},
    {"ticker": "TSLA", "name": "Tesla, Inc.", "target_fy": 2024},
    {"ticker": "IBM",  "name": "International Business Machines Corp", "target_fy": 2024},
    {"ticker": "GOOGL","name": "Alphabet Inc.", "target_fy": 2024},
]

def verify_company(comp):
    ticker = comp["ticker"]
    print(f"\n=======================================================")
    print(f"TESTING COMPANY: {comp['name']} ({ticker})")
    print(f"=======================================================")

    # 1. Resolve CIK
    cik = sec_client.get_cik_from_ticker(ticker)
    print(f"1. CIK Resolved: {cik}")
    assert cik is not None, f"Failed to resolve CIK for {ticker}"

    # 2. Locate latest 10-K filing
    filing = sec_client.find_latest_10k_filing(cik, fiscal_year=comp.get("target_fy"))
    if not filing:
        # Try latest without fiscal year filter
        filing = sec_client.find_latest_10k_filing(cik)
    
    assert filing is not None, f"Failed to locate 10-K for {ticker}"
    print(f"2. Filing Located: Form {filing['form']} | Accession: {filing['accession_number']} | Date: {filing['filing_date']}")
    print(f"   Primary Document: {filing['primary_document']}")
    print(f"   Direct Archive URL: {filing['document_url']}")

    # 3. Download & Cache Primary Document
    doc_path = sec_client.fetch_primary_document(
        cik=cik,
        accession_number=filing["accession_number"],
        primary_document=filing["primary_document"]
    )
    assert doc_path.exists() and doc_path.stat().st_size > 0, "Document cache failed"
    print(f"3. Primary Document Cached: {doc_path} ({doc_path.stat().st_size / 1024:.1f} KB)")

    # 4. Ingest XBRL Ground Truth Facts
    target_fy = filing.get("fiscal_year", comp.get("target_fy", 2024))
    facts = xbrl_service.extract_ground_truth(
        cik=cik,
        fiscal_year=target_fy,
        report_date=filing.get("report_date")
    )
    print(f"4. XBRL Ground Truth Ingested: {len(facts)} concepts extracted for FY{target_fy}")
    print(f"-------------------------------------------------------")
    print(f"{'Concept':<24} | {'Value (USD)':>20} | {'Tag / Provenance'}")
    print(f"-------------------------------------------------------")
    for concept, fact in facts.items():
        val_str = f"${fact.value:,.2f}"
        prov = fact.matched_tag
        if fact.is_derived:
            prov = f"[DERIVED] {fact.derived_formula}"
        print(f"{concept:<24} | {val_str:>20} | {prov}")

    # Verify core required metrics exist
    for required in ["REVENUES", "TOTAL_ASSETS", "TOTAL_LIABILITIES", "STOCKHOLDERS_EQUITY", "NET_INCOME"]:
        assert required in facts, f"Missing core metric {required} for {ticker}"

    print(f"==> VERIFICATION PASSED FOR {ticker}")
    return {
        "ticker": ticker,
        "name": comp["name"],
        "cik": cik,
        "filing": filing,
        "metrics_count": len(facts),
        "facts": {k: v.model_dump() for k, v in facts.items()}
    }

if __name__ == "__main__":
    results = []
    for c in TARGET_COMPANIES:
        try:
            res = verify_company(c)
            results.append(res)
        except Exception as e:
            print(f"ERROR verifying {c['ticker']}: {e}", file=sys.stderr)
            raise

    # Save summary artifact data
    out_file = Path(__file__).resolve().parent.parent / "backend" / "data" / "phase2_ground_truth_summary.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nALL 5 BENCHMARK COMPANIES VERIFIED AND SAVED TO {out_file}!")

