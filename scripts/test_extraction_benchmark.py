"""
Test script to run ExtractionService against all 5 cached benchmark filings and measure accuracy vs XBRL ground truth.
"""
from pathlib import Path
import sys
import json

# Ensure project root in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.services.extraction_service import extraction_service

GROUND_TRUTH_FILE = Path("backend/data/phase2_ground_truth_summary.json")

def run_extraction_benchmark():
    assert GROUND_TRUTH_FILE.exists(), "Ground truth summary from Phase 2 missing"
    with open(GROUND_TRUTH_FILE, "r", encoding="utf-8") as fp:
        companies_gt = json.load(fp)

    total_evaluated = 0
    total_matched = 0
    results_by_company = []

    for comp in companies_gt:
        ticker = comp["ticker"]
        name = comp["name"]
        cik = comp["cik"]
        filing_meta = comp["filing"]
        gt_facts = comp["facts"]
        
        doc_name = filing_meta["accession_number"].replace("-", "") + "_" + Path(filing_meta["primary_document"]).name
        doc_path = Path("backend/data/cache/filings") / doc_name
        assert doc_path.exists(), f"Filing file {doc_path} not found"

        print(f"\n=======================================================")
        print(f"BENCHMARK EXTRACTION: {name} ({ticker})")
        print(f"File: {doc_path.name}")
        print(f"=======================================================")

        extracted = extraction_service.extract_from_html(
            html_path=doc_path,
            fiscal_year=filing_meta.get("fiscal_year", 2024),
            cik=cik,
            accession_number=filing_meta["accession_number"]
        )

        comp_evaluated = 0
        comp_matched = 0

        print(f"{'Concept':<22} | {'Extracted Val':>18} | {'XBRL Ground Truth':>18} | {'Diff %':>8} | {'Status'}")
        print("-" * 80)

        for concept, gt in gt_facts.items():
            comp_evaluated += 1
            total_evaluated += 1
            gt_val = gt["value"]
            
            if concept in extracted:
                ext_val = extracted[concept].value
                diff = abs(ext_val - gt_val)
                rel_diff = diff / abs(gt_val) if gt_val != 0 else 0.0

                # Tolerance of 0.1% for rounding in published reports
                if rel_diff <= 0.001:
                    status = "MATCH (100%)"
                    comp_matched += 1
                    total_matched += 1
                else:
                    status = f"DIFF ({rel_diff*100:.1f}%)"
                print(f"{concept:<22} | ${ext_val:>17,.2f} | ${gt_val:>17,.2f} | {rel_diff*100:>7.2f}% | {status}")
            else:
                print(f"{concept:<22} | {'MISSING':>18} | ${gt_val:>17,.2f} | {'N/A':>8} | NOT_EXTRACTED")

        comp_acc = (comp_matched / comp_evaluated) * 100 if comp_evaluated > 0 else 0
        print(f"==> {ticker} Accuracy: {comp_acc:.1f}% ({comp_matched}/{comp_evaluated} matched)")
        results_by_company.append({
            "ticker": ticker,
            "name": name,
            "evaluated": comp_evaluated,
            "matched": comp_matched,
            "accuracy_pct": comp_acc,
            "extractions": {k: v.model_dump() for k, v in extracted.items()}
        })

    overall_acc = (total_matched / total_evaluated) * 100 if total_evaluated > 0 else 0
    print(f"\n=======================================================")
    print(f"OVERALL EXTRACTION ACCURACY: {overall_acc:.1f}% ({total_matched}/{total_evaluated} matched)")
    print(f"=======================================================")

    # Save summary report
    out_path = Path("backend/data/phase3_extraction_accuracy_summary.json")
    with open(out_path, "w", encoding="utf-8") as fp:
        json.dump({
            "overall_accuracy_pct": overall_acc,
            "total_evaluated": total_evaluated,
            "total_matched": total_matched,
            "companies": results_by_company
        }, fp, indent=2)

    return overall_acc

if __name__ == "__main__":
    acc = run_extraction_benchmark()

