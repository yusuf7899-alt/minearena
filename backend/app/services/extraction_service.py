"""
Metric Extraction Service.
Extracts 9 core financial metrics with character/table evidence snippets from Form 10-K HTML,
iXBRL documents, and SEC statement exhibits.
Includes consolidated context filtering (ignoring dimensional segment axes),
unit/scale detection, ordered tag fallbacks, and LLM fallback integration.
"""
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import re
import logging
import warnings
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
from pydantic import BaseModel

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

from backend.app.services.xbrl_service import TAG_FALLBACKS, INSTANT_CONCEPTS
from backend.app.services.upload_service import CONCEPT_KEYWORDS, clean_financial_number, detect_statement_scale
from backend.app.services.llm_extractor import llm_extractor
from backend.app.services.sec_client import sec_client

logger = logging.getLogger(__name__)

class ExtractedMetricItem(BaseModel):
    concept: str
    value: float
    raw_text: str
    unit: str = "USD"
    scale: str = "exact"
    scale_multiplier: float = 1.0
    period_end: str
    fiscal_year: int
    method: str  # 'ixbrl_html', 'sec_statement_table', 'html_table', 'pdf_table', 'llm_fallback', 'derived_synthetic'
    evidence_snippet: str
    matched_tag: Optional[str] = None
    is_derived: bool = False
    derived_reason: Optional[str] = None

class ExtractionService:
    def parse_consolidated_contexts(self, soup: BeautifulSoup) -> Dict[str, Dict[str, Optional[str]]]:
        """
        Parses all non-dimensional (consolidated entity) contexts.
        Filters out any context with segment dimensions (ASC 280 segment axes, geographic, etc.).
        """
        contexts = soup.find_all(lambda t: t.name and "context" in t.name.lower())
        clean_contexts: Dict[str, Dict[str, Optional[str]]] = {}

        for c in contexts:
            cid = c.get("id")
            if not cid:
                continue

            # Exclude dimensional breakdown contexts
            if c.find(lambda t: t.name and ("segment" in t.name.lower() or "explicitmember" in t.name.lower() or "scenario" in t.name.lower())):
                continue

            period = c.find(lambda t: t.name and "period" in t.name.lower())
            if not period:
                continue

            start_el = period.find(lambda t: t.name and "startdate" in t.name.lower())
            end_el = period.find(lambda t: t.name and "enddate" in t.name.lower())
            inst_el = period.find(lambda t: t.name and "instant" in t.name.lower())

            clean_contexts[cid] = {
                "start": start_el.text.strip() if start_el else None,
                "end": end_el.text.strip() if end_el else None,
                "instant": inst_el.text.strip() if inst_el else None
            }

        return clean_contexts

    def extract_from_html(
        self,
        html_path: Path,
        fiscal_year: int,
        cik: Optional[str] = None,
        accession_number: Optional[str] = None,
        report_date: Optional[str] = None
    ) -> Dict[str, ExtractedMetricItem]:
        """
        Extracts 9 core metrics from 10-K HTML document using multi-layer deterministic strategy
        with LLM fallback.
        """
        from datetime import datetime, date

        with open(html_path, "r", encoding="utf-8", errors="ignore") as fp:
            html_content = fp.read()

        soup = BeautifulSoup(html_content, "lxml")
        results: Dict[str, ExtractedMetricItem] = {}

        # Layer 1: iXBRL Attribute Extraction using Consolidated Contexts
        clean_contexts = self.parse_consolidated_contexts(soup)

        # Infer report_date if not supplied
        if not report_date:
            dei_date_tag = soup.find(lambda t: t.name and "documentperiodenddate" in (t.get("name") or "").lower())
            if dei_date_tag and dei_date_tag.text.strip():
                raw_dt = dei_date_tag.text.strip().replace("\xa0", " ")
                for fmt in ["%Y-%m-%d", "%B %d, %Y", "%b %d, %Y", "%B %d %Y"]:
                    try:
                        report_date = datetime.strptime(raw_dt, fmt).strftime("%Y-%m-%d")
                        break
                    except ValueError:
                        pass

        if not report_date and clean_contexts:
            # Fallback to latest date matching fiscal_year in clean_contexts
            fy_dates = [
                ctx["end"] or ctx["instant"]
                for ctx in clean_contexts.values()
                if (ctx.get("end") and str(fiscal_year) in ctx["end"]) or (ctx.get("instant") and str(fiscal_year) in ctx["instant"])
            ]
            if fy_dates:
                report_date = max(fy_dates)

        if clean_contexts:
            results.update(self._extract_from_ixbrl_with_contexts(soup, clean_contexts, fiscal_year, report_date))

        # Layer 2: Check companion SEC R*.htm exhibits if filing uses separate statement files (e.g. IBM)
        missing_concepts = [c for c in TAG_FALLBACKS.keys() if c not in results]
        if missing_concepts and cik and accession_number:
            exhibit_results = self._extract_from_sec_r_exhibits(cik, accession_number, missing_concepts, fiscal_year)
            results.update(exhibit_results)

        # Layer 3: HTML Table Parsing (For standard HTML statements)
        missing_concepts = [c for c in TAG_FALLBACKS.keys() if c not in results]
        if missing_concepts:
            table_results = self._extract_from_html_tables(soup, missing_concepts, fiscal_year)
            results.update(table_results)

        # Layer 4: LLM Fallback for any still-missing concepts
        missing_concepts = [c for c in TAG_FALLBACKS.keys() if c not in results]
        if missing_concepts:
            for concept in missing_concepts:
                llm_res = llm_extractor.extract_metric(
                    concept=concept,
                    statement_text=soup.get_text()[:30000],
                    fiscal_year=fiscal_year
                )
                if llm_res.found and llm_res.value is not None:
                    results[concept] = ExtractedMetricItem(
                        concept=concept,
                        value=llm_res.value,
                        raw_text=llm_res.raw_text or str(llm_res.value),
                        unit="USD",
                        scale=llm_res.scale,
                        scale_multiplier=1_000_000.0 if llm_res.scale == "millions" else 1.0,
                        period_end=report_date or f"{fiscal_year}-12-31",
                        fiscal_year=fiscal_year,
                        method="llm_fallback",
                        evidence_snippet=llm_res.evidence_snippet,
                        is_derived=False
                    )

        # Layer 5: Derived Values (Untagged Liabilities or Gross Profit)
        if "TOTAL_LIABILITIES" not in results and "TOTAL_ASSETS" in results and "STOCKHOLDERS_EQUITY" in results:
            assets = results["TOTAL_ASSETS"].value
            equity = results["STOCKHOLDERS_EQUITY"].value
            derived_liab = assets - equity
            results["TOTAL_LIABILITIES"] = ExtractedMetricItem(
                concept="TOTAL_LIABILITIES",
                value=derived_liab,
                raw_text=f"{assets:,.0f} - {equity:,.0f}",
                unit="USD",
                scale=results["TOTAL_ASSETS"].scale,
                scale_multiplier=results["TOTAL_ASSETS"].scale_multiplier,
                period_end=results["TOTAL_ASSETS"].period_end,
                fiscal_year=fiscal_year,
                method="derived_synthetic",
                evidence_snippet=f"Derived: Total Assets (${assets:,.2f}) minus Stockholders' Equity (${equity:,.2f})",
                is_derived=True,
                derived_reason="Untagged on primary balance sheet; derived from fundamental identity."
            )

        if "GROSS_PROFIT" not in results and "REVENUES" in results:
            cogs_match = None
            cogs_candidates = []
            for tag in soup.find_all(lambda t: t.name and "nonfraction" in t.name.lower()):
                name = tag.get("name", "")
                if "CostOfGoodsAndServicesSold" in name or "CostOfRevenue" in name:
                    cid = tag.get("contextref")
                    if cid in clean_contexts:
                        ctx = clean_contexts[cid]
                        p_end = ctx["end"] or ""
                        if (report_date and p_end == report_date) or (not report_date and str(fiscal_year) in p_end):
                            scale = int(tag.get("scale", 0))
                            num = clean_financial_number(tag.text.strip())
                            if num is not None and num != 0.0:
                                cogs_candidates.append((p_end, num * (10 ** scale)))

            if cogs_candidates:
                # Sort to get the one with matching or latest report_date
                cogs_candidates.sort(key=lambda x: (1 if report_date and x[0] == report_date else 0, x[0]), reverse=True)
                cogs_match = cogs_candidates[0][1]

            if cogs_match is not None:
                rev = results["REVENUES"].value
                gp = rev - cogs_match
                results["GROSS_PROFIT"] = ExtractedMetricItem(
                    concept="GROSS_PROFIT",
                    value=gp,
                    raw_text=f"{rev:,.0f} - {cogs_match:,.0f}",
                    unit="USD",
                    scale=results["REVENUES"].scale,
                    scale_multiplier=results["REVENUES"].scale_multiplier,
                    period_end=results["REVENUES"].period_end,
                    fiscal_year=fiscal_year,
                    method="derived_synthetic",
                    evidence_snippet=f"Derived: Revenues (${rev:,.2f}) minus Cost of Revenues (${cogs_match:,.2f})",
                    is_derived=True,
                    derived_reason="Calculated from reported Revenues minus Cost of Revenues."
                )

        return results

    def _extract_from_ixbrl_with_contexts(
        self,
        soup: BeautifulSoup,
        clean_contexts: Dict[str, Dict[str, Optional[str]]],
        fiscal_year: int,
        report_date: Optional[str] = None
    ) -> Dict[str, ExtractedMetricItem]:
        """
        Matches iXBRL tags strictly within consolidated contexts matching the fiscal year.
        """
        from datetime import date

        found: Dict[str, ExtractedMetricItem] = {}
        target_year_str = str(fiscal_year)

        for concept, tag_list in TAG_FALLBACKS.items():
            best_item = None

            for tag_name in tag_list:
                matching_tags = soup.find_all(
                    lambda t: t.name and "nonfraction" in t.name.lower() and (t.get("name") == tag_name or (t.get("name") or "").endswith(f":{tag_name}"))
                )

                candidates = []
                for tag in matching_tags:
                    cid = tag.get("contextref")
                    if cid not in clean_contexts:
                        continue

                    ctx = clean_contexts[cid]
                    is_instant = concept in INSTANT_CONCEPTS

                    # Period matching
                    if is_instant:
                        inst = ctx.get("instant")
                        if not inst:
                            continue
                        if report_date:
                            if inst != report_date:
                                try:
                                    if abs((date.fromisoformat(report_date) - date.fromisoformat(inst)).days) > 7:
                                        continue
                                except Exception:
                                    continue
                        elif target_year_str not in inst:
                            continue
                        period_matched = inst
                    else:
                        end = ctx.get("end")
                        if not end:
                            continue
                        if report_date:
                            if end != report_date:
                                try:
                                    if abs((date.fromisoformat(report_date) - date.fromisoformat(end)).days) > 7:
                                        continue
                                except Exception:
                                    continue
                        elif target_year_str not in end:
                            continue
                        period_matched = end

                    raw_text = tag.text.strip()
                    num = clean_financial_number(raw_text)
                    if num is None:
                        continue

                    scale_attr = tag.get("scale", "0")
                    try:
                        multiplier = float(10 ** int(scale_attr))
                    except ValueError:
                        multiplier = 1.0

                    scale_label = "millions" if multiplier == 1_000_000 else ("thousands" if multiplier == 1_000 else "exact")
                    final_value = num * multiplier

                    parent_row = tag.find_parent("tr")
                    row_richness = 0
                    if parent_row:
                        cells = [c.get_text(strip=True) for c in parent_row.find_all(["td", "th"]) if c.get_text(strip=True)]
                        row_text = " | ".join(cells)
                        snippet = f"Table Row: {row_text}"
                        row_richness = len(cells)
                    else:
                        snippet = (tag.parent.get_text(strip=True) if tag.parent else raw_text)[:250]

                    matches_rep = 1 if report_date and period_matched == report_date else 0
                    candidates.append({
                        "item": ExtractedMetricItem(
                            concept=concept,
                            value=final_value,
                            raw_text=raw_text,
                            unit=tag.get("unitref", "USD").upper(),
                            scale=scale_label,
                            scale_multiplier=multiplier,
                            period_end=period_matched,
                            fiscal_year=fiscal_year,
                            method="ixbrl_html",
                            evidence_snippet=snippet,
                            matched_tag=f"us-gaap:{tag_name}",
                            is_derived=False
                        ),
                        "sort_key": (matches_rep, period_matched, row_richness)
                    })

                if candidates:
                    candidates.sort(key=lambda c: c["sort_key"], reverse=True)
                    best_item = candidates[0]["item"]
                    found[concept] = best_item
                    break

        return found

    def _extract_from_sec_r_exhibits(
        self, cik: str, accession_number: str, concepts_to_find: List[str], fiscal_year: int
    ) -> Dict[str, ExtractedMetricItem]:
        """
        Fetches companion statement exhibits (R3.htm, R4.htm, R5.htm) for filers using separate statement files.
        """
        found: Dict[str, ExtractedMetricItem] = {}
        raw_cik = str(int(cik))
        acc_nodash = accession_number.replace("-", "")

        for r_num in [3, 4, 5, 6, 7]:
            if not concepts_to_find:
                break
            url = f"https://www.sec.gov/Archives/edgar/data/{raw_cik}/{acc_nodash}/R{r_num}.htm"
            try:
                res = sec_client._get(url)
                if res.status_code != 200:
                    continue

                r_soup = BeautifulSoup(res.text, "lxml")
                # Parse column headers to identify column index matching fiscal year
                tables = r_soup.find_all("table")
                for tbl in tables:
                    tbl_text = tbl.get_text()
                    scale = detect_statement_scale(tbl_text)
                    scale_label = "millions" if scale == 1_000_000 else ("thousands" if scale == 1_000 else "exact")

                    header_rows = tbl.find_all("tr")
                    col_idx_target = None

                    # Find date header row
                    for r in header_rows[:4]:
                        cells = [c.get_text(strip=True) for c in r.find_all(["td", "th"])]
                        for idx, c_text in enumerate(cells):
                            if str(fiscal_year) in c_text:
                                col_idx_target = idx
                                break
                        if col_idx_target is not None:
                            break

                    if col_idx_target is None:
                        col_idx_target = 1  # Default to first data column

                    # Iterate over rows
                    for r in header_rows:
                        cells = [c.get_text(strip=True) for c in r.find_all(["td", "th"]) if c.get_text(strip=True)]
                        if len(cells) < 2:
                            continue

                        label = cells[0].lower()
                        for concept in list(concepts_to_find):
                            # Exclude current assets/liabilities if looking for total
                            if concept in ["TOTAL_ASSETS", "TOTAL_LIABILITIES"] and "current" in label:
                                continue
                            if concept == "TOTAL_LIABILITIES" and "equity" in label:
                                continue
                            keywords = CONCEPT_KEYWORDS.get(concept, [])
                            matched_kw = any(kw == label or (kw in label and len(label) < len(kw) + 15) for kw in keywords)
                            if matched_kw:
                                # Extract value
                                candidate_cells = cells[1:]
                                val = None
                                raw_str = ""
                                if col_idx_target < len(cells):
                                    num = clean_financial_number(cells[col_idx_target])
                                    if num is not None and num != 0:
                                        val = num
                                        raw_str = cells[col_idx_target]

                                if val is None:
                                    for c in candidate_cells:
                                        num = clean_financial_number(c)
                                        if num is not None and num != 0:
                                            val = num
                                            raw_str = c
                                            break

                                if val is not None:
                                    final_val = val * scale
                                    found[concept] = ExtractedMetricItem(
                                        concept=concept,
                                        value=final_val,
                                        raw_text=raw_str,
                                        unit="USD",
                                        scale=scale_label,
                                        scale_multiplier=scale,
                                        period_end=f"{fiscal_year}-12-31",
                                        fiscal_year=fiscal_year,
                                        method="sec_statement_table",
                                        evidence_snippet=f"SEC Exhibit R{r_num}.htm: {' | '.join(cells)}",
                                        is_derived=False
                                    )
                                    concepts_to_find.remove(concept)
                                    break
            except Exception as e:
                logger.debug(f"Error checking R{r_num}.htm: {e}")

        return found

    def _extract_from_html_tables(
        self, soup: BeautifulSoup, concepts_to_find: List[str], fiscal_year: int
    ) -> Dict[str, ExtractedMetricItem]:
        """Iterates over standard HTML tables for row label keyword matches."""
        found: Dict[str, ExtractedMetricItem] = {}
        tables = soup.find_all("table")

        for tbl in tables:
            tbl_text = tbl.get_text()
            scale = detect_statement_scale(tbl_text)
            scale_label = "millions" if scale == 1_000_000 else ("thousands" if scale == 1_000 else "exact")

            rows = tbl.find_all("tr")
            for r in rows:
                cells = [c.get_text(strip=True) for c in r.find_all(["td", "th"]) if c.get_text(strip=True)]
                if len(cells) < 2:
                    continue

                label = cells[0].lower()
                for concept in list(concepts_to_find):
                    keywords = CONCEPT_KEYWORDS.get(concept, [])
                    for kw in keywords:
                        if kw == label or (kw in label and len(label) < len(kw) + 15):
                            for cell_val in cells[1:]:
                                val = clean_financial_number(cell_val)
                                if val is not None and val != 0.0:
                                    found[concept] = ExtractedMetricItem(
                                        concept=concept,
                                        value=val * scale,
                                        raw_text=cell_val,
                                        unit="USD",
                                        scale=scale_label,
                                        scale_multiplier=scale,
                                        period_end=f"{fiscal_year}-12-31",
                                        fiscal_year=fiscal_year,
                                        method="html_table",
                                        evidence_snippet=f"Table Row: {' | '.join(cells)}",
                                        is_derived=False
                                    )
                                    concepts_to_find.remove(concept)
                                    break
                            break

        return found

extraction_service = ExtractionService()
