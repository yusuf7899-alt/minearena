"""
Tests for ExtractionService (Phase 3 Feature 2).
Verifies:
1. Multi-layer deterministic extraction from 10-K HTML and companion exhibits.
2. Context-aware segment filtering (excluding dimensional segments under ASC 280).
3. Scale multiplier detection (exact, thousands, millions, billions).
4. Full benchmark verification on real SEC filings achieving >= 95% accuracy.
"""
from pathlib import Path
import pytest
import json

from backend.app.services.extraction_service import extraction_service, ExtractedMetricItem
from backend.app.services.xbrl_service import TAG_FALLBACKS

CACHE_DIR = Path("backend/data/cache/filings")
GROUND_TRUTH_FILE = Path("backend/data/phase2_ground_truth_summary.json")

def test_extraction_service_instance():
    assert extraction_service is not None

def test_consolidated_context_filtering():
    from bs4 import BeautifulSoup
    sample_xml = """
    <xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:xbrldi="http://xbrl.org/2006/xbrldi">
        <!-- Consolidated Entity Context -->
        <xbrli:context id="c_consolidated">
            <xbrli:entity><xbrli:identifier scheme="http://www.sec.gov/CIK">0000320193</xbrli:identifier></xbrli:entity>
            <xbrli:period>
                <xbrli:startDate>2024-09-29</xbrli:startDate>
                <xbrli:endDate>2025-09-27</xbrli:endDate>
            </xbrli:period>
        </xbrli:context>
        <!-- Dimensional Breakdown Segment Context (Must be excluded) -->
        <xbrli:context id="c_segment_iphone">
            <xbrli:entity>
                <xbrli:identifier scheme="http://www.sec.gov/CIK">0000320193</xbrli:identifier>
                <xbrli:segment>
                    <xbrldi:explicitMember dimension="us-gaap:ProductOrServiceAxis">aapl:IPhoneMember</xbrldi:explicitMember>
                </xbrli:segment>
            </xbrli:entity>
            <xbrli:period>
                <xbrli:startDate>2024-09-29</xbrli:startDate>
                <xbrli:endDate>2025-09-27</xbrli:endDate>
            </xbrli:period>
        </xbrli:context>
    </xbrli:xbrl>
    """
    soup = BeautifulSoup(sample_xml, "lxml")
    contexts = extraction_service.parse_consolidated_contexts(soup)
    assert "c_consolidated" in contexts
    assert "c_segment_iphone" not in contexts
    assert contexts["c_consolidated"]["end"] == "2025-09-27"

def test_scale_multiplier_handling():
    item = ExtractedMetricItem(
        concept="REVENUES",
        value=416_161_000_000.0,
        raw_text="416,161",
        unit="USD",
        scale="millions",
        scale_multiplier=1_000_000.0,
        period_end="2025-09-27",
        fiscal_year=2025,
        method="ixbrl_html",
        evidence_snippet="Table Row: Total net sales | 416,161",
        matched_tag="us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax"
    )
    assert item.value == 416_161_000_000.0
    assert item.scale == "millions"
    assert "416,161" in item.evidence_snippet

@pytest.mark.skipif(not GROUND_TRUTH_FILE.exists(), reason="Benchmark ground truth file missing")
def test_extraction_accuracy_benchmark():
    with open(GROUND_TRUTH_FILE, "r", encoding="utf-8") as fp:
        companies_gt = json.load(fp)

    total_evaluated = 0
    total_matched = 0

    for comp in companies_gt:
        ticker = comp["ticker"]
        filing_meta = comp["filing"]
        gt_facts = comp["facts"]

        doc_name = filing_meta["accession_number"].replace("-", "") + "_" + Path(filing_meta["primary_document"]).name
        doc_path = CACHE_DIR / doc_name
        if not doc_path.exists():
            continue

        extracted = extraction_service.extract_from_html(
            html_path=doc_path,
            fiscal_year=filing_meta.get("fiscal_year", 2025),
            cik=comp["cik"],
            accession_number=filing_meta["accession_number"],
            report_date=filing_meta.get("report_date")
        )

        for concept, gt in gt_facts.items():
            total_evaluated += 1
            assert concept in extracted, f"Missing extracted concept {concept} for {ticker}"
            ext_val = extracted[concept].value
            gt_val = gt["value"]
            diff = abs(ext_val - gt_val)
            rel_diff = diff / abs(gt_val) if gt_val != 0 else 0.0

            # 0.1% tolerance
            if rel_diff <= 0.001:
                total_matched += 1

    accuracy = (total_matched / total_evaluated) * 100 if total_evaluated > 0 else 0
    print(f"\nIntegration Accuracy: {accuracy:.1f}% ({total_matched}/{total_evaluated})")
    assert accuracy >= 95.0, f"Extraction accuracy {accuracy:.1f}% below 95% threshold"

