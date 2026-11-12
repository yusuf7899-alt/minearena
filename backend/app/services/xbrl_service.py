"""
XBRL Ground Truth Extraction Service.
Implements ordered taxonomy tag fallbacks, robust fiscal period matching,
and synthetic derived liabilities detection per Moneta Audit Specifications.
"""
from typing import Dict, Any, List, Optional
import logging
from pydantic import BaseModel
from backend.app.services.sec_client import sec_client

logger = logging.getLogger(__name__)

class XBRLFact(BaseModel):
    concept: str
    matched_tag: str
    value: float
    unit: str = "USD"
    period_start: Optional[str] = None
    period_end: str
    fiscal_year: int
    form: str
    filed_date: Optional[str] = None
    is_derived: bool = False
    derived_formula: Optional[str] = None

# Ordered Taxonomy Fallbacks per US-GAAP Accounting Practice
TAG_FALLBACKS: Dict[str, List[str]] = {
    "REVENUES": [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
        "SalesRevenueGoodsNet",
        "SalesRevenueServicesNet",
        "TotalRevenuesAndOtherIncome",
        "RegulatedAndUnregulatedOperatingRevenue"
    ],
    "NET_INCOME": [
        "NetIncomeLoss",
        "ProfitLoss",
        "NetIncomeLossAvailableToCommonStockholdersBasic"
    ],
    "TOTAL_ASSETS": [
        "Assets"
    ],
    "TOTAL_LIABILITIES": [
        "Liabilities"
    ],
    "STOCKHOLDERS_EQUITY": [
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
        "CommonStockholdersEquity"
    ],
    "OPERATING_CASH_FLOW": [
        "NetCashProvidedByUsedInOperatingActivities",
        "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"
    ],
    "GROSS_PROFIT": [
        "GrossProfit"
    ],
    "OPERATING_INCOME": [
        "OperatingIncomeLoss"
    ],
    "CASH_AND_EQUIVALENTS": [
        "CashAndCashEquivalentsAtCarryingValue",
        "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
        "Cash"
    ]
}

# Instant concepts (Balance Sheet) vs Duration concepts (P&L / Cash Flows)
INSTANT_CONCEPTS = {"TOTAL_ASSETS", "TOTAL_LIABILITIES", "STOCKHOLDERS_EQUITY", "CASH_AND_EQUIVALENTS"}

class XBRLService:
    def __init__(self, client=None):
        self.client = client or sec_client

    def _find_best_fact_in_tag(
        self,
        tag_data: Dict[str, Any],
        concept: str,
        target_fy: int,
        report_date: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Filters facts for form=10-K, fp=FY, fy=target_fy and picks the definitive record matching report_date.
        """
        from datetime import date

        units = tag_data.get("units", {})
        usd_facts = units.get("USD", [])
        if not usd_facts:
            return None

        is_instant = concept in INSTANT_CONCEPTS
        candidates = []

        for f in usd_facts:
            form = f.get("form", "")
            if form not in ["10-K", "10-K/A"]:
                continue

            fy = f.get("fy")
            fp = f.get("fp")
            end_date = f.get("end")

            # Check fiscal year alignment
            if fy == target_fy:
                if not is_instant:
                    # Duration metrics must be annual full year (fp == 'FY')
                    if fp == "FY":
                        candidates.append(f)
                else:
                    candidates.append(f)
            elif not candidates and end_date and report_date and end_date == report_date:
                candidates.append(f)

        if not candidates and report_date:
            # Fallback: match by exact end_date regardless of fy tag
            for f in usd_facts:
                if f.get("form") in ["10-K", "10-K/A"] and f.get("end") == report_date:
                    candidates.append(f)

        if not candidates:
            return None

        # Sort candidates to prefer:
        # 1. 10-K/A amendments over original 10-K
        # 2. Exact match on report_date
        # 3. Proximity to report_date (within 14 days)
        # 4. Latest 'end' date (avoids picking prior-year comparison columns)
        # 5. Latest 'filed' date
        def sort_key(item):
            is_amended = 1 if item.get("form") == "10-K/A" else 0
            end = item.get("end", "")
            matches_rep = 1 if (report_date and end == report_date) else 0
            near_rep = 0
            if report_date and end:
                try:
                    diff_days = abs((date.fromisoformat(report_date) - date.fromisoformat(end)).days)
                    if diff_days <= 14:
                        near_rep = 100 - diff_days
                except Exception:
                    pass
            filed = item.get("filed", "")
            return (is_amended, matches_rep, near_rep, end, filed)

        candidates.sort(key=sort_key, reverse=True)
        return candidates[0]

    def extract_ground_truth(
        self,
        cik: str,
        fiscal_year: int,
        report_date: Optional[str] = None
    ) -> Dict[str, XBRLFact]:
        """
        Extracts ground truth for all 9 core metrics from cached CompanyFacts.
        Handles tag fallbacks and derived liabilities if untagged.
        """
        facts_data = self.client.get_company_facts(cik)
        gaap_facts = facts_data.get("facts", {}).get("us-gaap", {})
        results: Dict[str, XBRLFact] = {}

        # 1. Extract directly tagged concepts using fallback hierarchy
        for concept, tag_list in TAG_FALLBACKS.items():
            matched_fact = None
            matched_tag_name = None

            for tag in tag_list:
                if tag in gaap_facts:
                    best_fact = self._find_best_fact_in_tag(
                        gaap_facts[tag], concept, fiscal_year, report_date
                    )
                    if best_fact is not None:
                        matched_fact = best_fact
                        matched_tag_name = tag
                        break

            if matched_fact is not None:
                results[concept] = XBRLFact(
                    concept=concept,
                    matched_tag=f"us-gaap:{matched_tag_name}",
                    value=float(matched_fact["val"]),
                    unit=matched_fact.get("unit", "USD"),
                    period_start=matched_fact.get("start"),
                    period_end=matched_fact.get("end", report_date or ""),
                    fiscal_year=matched_fact.get("fy", fiscal_year),
                    form=matched_fact.get("form", "10-K"),
                    filed_date=matched_fact.get("filed"),
                    is_derived=False
                )

        # 2. Handle Untagged Liabilities (Gap 2 from Research Audit)
        if "TOTAL_LIABILITIES" not in results:
            assets_fact = results.get("TOTAL_ASSETS")
            equity_fact = results.get("STOCKHOLDERS_EQUITY")
            
            # Check if current + non-current liabilities are tagged separately
            curr_liab = self._find_best_fact_in_tag(gaap_facts.get("LiabilitiesCurrent", {}), "TOTAL_LIABILITIES", fiscal_year, report_date)
            noncurr_liab = self._find_best_fact_in_tag(gaap_facts.get("LiabilitiesNoncurrent", {}), "TOTAL_LIABILITIES", fiscal_year, report_date)

            if curr_liab and noncurr_liab:
                sum_liab = float(curr_liab["val"]) + float(noncurr_liab["val"])
                results["TOTAL_LIABILITIES"] = XBRLFact(
                    concept="TOTAL_LIABILITIES",
                    matched_tag="us-gaap:LiabilitiesCurrent + us-gaap:LiabilitiesNoncurrent",
                    value=sum_liab,
                    unit="USD",
                    period_end=curr_liab.get("end", report_date or ""),
                    fiscal_year=fiscal_year,
                    form=curr_liab.get("form", "10-K"),
                    is_derived=True,
                    derived_formula="LiabilitiesCurrent + LiabilitiesNoncurrent"
                )
            elif assets_fact and equity_fact:
                derived_val = assets_fact.value - equity_fact.value
                results["TOTAL_LIABILITIES"] = XBRLFact(
                    concept="TOTAL_LIABILITIES",
                    matched_tag="DERIVED: Assets - StockholdersEquity",
                    value=derived_val,
                    unit="USD",
                    period_end=assets_fact.period_end,
                    fiscal_year=fiscal_year,
                    form=assets_fact.form,
                    is_derived=True,
                    derived_formula="Total Assets - Stockholders' Equity"
                )
                logger.info(f"CIK {cik}: Total Liabilities untagged, derived as Assets - Equity = ${derived_val:,.2f}")

        # 3. Handle Gross Profit if untagged: Revenues - CostOfGoodsAndServicesSold
        if "GROSS_PROFIT" not in results and "REVENUES" in results:
            cogs_tag = gaap_facts.get("CostOfGoodsAndServicesSold") or gaap_facts.get("CostOfRevenue")
            if cogs_tag:
                cogs_fact = self._find_best_fact_in_tag(cogs_tag, "GROSS_PROFIT", fiscal_year, report_date)
                if cogs_fact:
                    cogs_val = float(cogs_fact["val"])
                    rev_val = results["REVENUES"].value
                    results["GROSS_PROFIT"] = XBRLFact(
                        concept="GROSS_PROFIT",
                        matched_tag="DERIVED: Revenues - CostOfRevenue",
                        value=rev_val - cogs_val,
                        unit="USD",
                        period_start=results["REVENUES"].period_start,
                        period_end=results["REVENUES"].period_end,
                        fiscal_year=fiscal_year,
                        form=results["REVENUES"].form,
                        is_derived=True,
                        derived_formula="Revenues - Cost Of Goods/Services Sold"
                    )

        return results

xbrl_service = XBRLService()

