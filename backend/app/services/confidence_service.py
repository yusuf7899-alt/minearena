"""
Confidence Scoring & Calibration Model (Phase 5 Feature 4).
Calculates deterministic multi-factor confidence scores (0.00 to 1.00) for every extracted financial metric.
Directs metrics to either AUTO_APPROVED or ESCALATED_HUMAN_REVIEW.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# Calibrated Threshold
CONFIDENCE_AUTO_APPROVE_THRESHOLD = 0.85

METHOD_WEIGHTS = {
    "ixbrl_html": 0.95,
    "sec_statement_table": 0.95,
    "html_table": 0.85,
    "pdf_table": 0.85,
    "derived_synthetic": 0.80,
    "llm_fallback": 0.72
}

class MetricConfidenceScore(BaseModel):
    concept: str
    confidence_score: float
    status: str  # 'AUTO_APPROVED', 'ESCALATED_HUMAN_REVIEW'
    method_score: float
    xbrl_concordance_score: float
    accounting_integrity_penalty: float
    evidence_score: float
    escalation_reasons: List[str]

class ConfidenceService:
    def __init__(self, threshold: float = CONFIDENCE_AUTO_APPROVE_THRESHOLD):
        self.threshold = threshold

    def score_metric(
        self,
        concept: str,
        extracted_item: Any,
        xbrl_fact: Optional[Any],
        failed_tie_outs: List[Any]
    ) -> MetricConfidenceScore:
        """
        Calculates a calibrated confidence score for a single financial metric.
        """
        method = getattr(extracted_item, "method", "ixbrl_html")
        method_base = METHOD_WEIGHTS.get(method, 0.80)

        # 1. XBRL Concordance Factor (0.0 to 1.0)
        xbrl_concordance = 1.0
        escalations = []

        if xbrl_fact:
            gt_val = getattr(xbrl_fact, "value", xbrl_fact if isinstance(xbrl_fact, (int, float)) else 0.0)
            ext_val = getattr(extracted_item, "value", 0.0)
            diff = abs(ext_val - gt_val)
            rel_diff = diff / abs(gt_val) if gt_val != 0 else 0.0

            if rel_diff <= 0.001:
                xbrl_concordance = 1.0
            elif rel_diff <= 0.05:
                xbrl_concordance = 0.80
                escalations.append(f"Minor XBRL variance of {rel_diff*100:.1f}% (${diff:,.0f}).")
            else:
                xbrl_concordance = 0.40
                escalations.append(f"Substantial XBRL variance of {rel_diff*100:.1f}% against SEC repository.")
        else:
            xbrl_concordance = 0.85  # No XBRL tag available (e.g. synthetic or non-GAAP)

        # 2. Evidence Snippet Factor
        snippet = getattr(extracted_item, "evidence_snippet", "")
        evidence_score = 1.0 if len(snippet) > 20 else 0.75

        # 3. Accounting Integrity Penalty (participating in failed tie-outs)
        penalty = 0.0
        for tie_out in failed_tie_outs:
            participating = getattr(tie_out, "contributing_line_items", [])
            if concept in participating:
                rule = getattr(tie_out, "rule_name", "Accounting Rule")
                diff_val = getattr(tie_out, "numeric_difference", 0.0)
                penalty += 0.35
                escalations.append(f"Failed accounting tie-out '{rule}' with discrepancy of ${diff_val:,.2f}.")

        # Derived value flag
        if getattr(extracted_item, "is_derived", False):
            # Only penalize if there is also no clear XBRL ground truth or concordance
            if not xbrl_fact or xbrl_concordance < 0.95:
                penalty += 0.05
                escalations.append("Derived synthetic metric (untagged on primary statement).")

        raw_score = (method_base * 0.45) + (xbrl_concordance * 0.40) + (evidence_score * 0.15) - penalty
        final_score = max(min(round(raw_score, 2), 1.00), 0.05)

        status = "AUTO_APPROVED" if (final_score >= self.threshold and penalty == 0.0) else "ESCALATED_HUMAN_REVIEW"

        return MetricConfidenceScore(
            concept=concept,
            confidence_score=final_score,
            status=status,
            method_score=method_base,
            xbrl_concordance_score=xbrl_concordance,
            accounting_integrity_penalty=penalty,
            evidence_score=evidence_score,
            escalation_reasons=escalations
        )

    def score_all(
        self,
        extracted_metrics: Dict[str, Any],
        ground_truth_facts: Dict[str, Any],
        tie_out_results: List[Any]
    ) -> Dict[str, MetricConfidenceScore]:
        """Scores all extracted metrics in the session."""
        failed_tie_outs = [t for t in tie_out_results if getattr(t, "status", "") == "FAILED"]
        scores = {}
        for concept, item in extracted_metrics.items():
            gt_fact = ground_truth_facts.get(concept)
            scores[concept] = self.score_metric(concept, item, gt_fact, failed_tie_outs)
        return scores

confidence_service = ConfidenceService()

