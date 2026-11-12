# Discovery & Research Audit: SEC EDGAR, XBRL & Baseline Verification

**Author:** Qualified Auditor (CPA) & Senior Business Analyst  
**Project:** Moneta Pre-Audit Agent  
**Baseline Document:** `docs/research.md`  
**Status:** Complete & Verified

---

## 1. Executive Summary
An exhaustive audit of `docs/research.md` was conducted against official SEC EDGAR API technical documentation, US GAAP XBRL taxonomy specifications, and professional auditing standards (AICPA/PCAOB). While `docs/research.md` outlined a viable high-level architecture, it contained critical technical and domain flaws that would lead to failure on production filings. 

This audit confirms valid baseline assertions, corrects technical errors in URL construction and API access patterns, resolves the 12 documented gaps, and identifies additional domain-specific risks.

---

## 2. Verification of Baseline Claims

| Baseline Claim in `research.md` | Verification Status | Auditor & Analyst Findings |
| :--- | :--- | :--- |
| **User-Agent Requirement** | **CONFIRMED** | SEC requires declared User-Agent with format `SampleCompany Contact@domain.com`. Requests without this header receive immediate HTTP 403 Forbidden. |
| **Rate Limit** | **CONFIRMED** | SEC rate limit is strictly 10 requests/second per IP. Automated throttling (max 5–8 req/s with token bucket or exponential backoff) is mandatory. |
| **Submissions API** | **CONFIRMED & REFINED** | `https://data.sec.gov/submissions/CIK{cik.zfill(10)}.json` provides entity metadata and recent filings. However, the baseline failed to note that `primaryDocument` must be retrieved from `filings.recent` to build the primary HTML/iXBRL URL. |
| **Archive Document URL** | **CORRECTED** | Baseline URL pattern `.../data/{CIK}/{ACCESSION}/{file}` is incomplete. The actual SEC Archive structure requires: `https://www.sec.gov/Archives/edgar/data/{raw_cik_no_leading_zeros}/{accession_nodash}/{primaryDocument}`. |
| **CompanyConcept API** | **REPLACED FOR GROUND TRUTH** | Baseline proposed repeated calls to `companyconcept` for each metric. This burns rate limits. `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik.zfill(10)}.json` returns all US-GAAP facts in a single cached call (~1–4 MB JSON). |
| **CY Frame Matching** | **INVALID / REPLACED** | Baseline assumed facts have `frame: "CY2023"`. In reality, many companies (Apple FY ending Sept, Microsoft FY ending June) or specific concepts omit the `frame` property. Matching must rely on `form == "10-K"`, `fp == "FY"`, `fy == target_year`, and `end` date. |
| **Balance Sheet Check** | **CONFIRMED & EXPANDED** | Baseline proposed $Assets = Liabilities + Equity$. Verified, but untagged liabilities and noncontrolling interests require specific accounting handling. |

---

## 3. Systematic Resolution of the 12 Known Gaps

### Gap 1: US-GAAP Revenue Tag Variations
- **Issue:** Baseline relied on `us-gaap:Revenues`. Companies reporting under ASC 606 (Revenue from Contracts with Customers) or financial services/retail use different taxonomy tags.
- **Audit Solution:** Implement an ordered fallback resolution list:
  1. `RevenueFromContractWithCustomerExcludingAssessedTax` (standard operating companies post-ASC 606)
  2. `Revenues` (broad consolidated revenues)
  3. `SalesRevenueNet` / `SalesRevenueGoodsNet` / `SalesRevenueServicesNet`
  4. `RegulatedAndUnregulatedOperatingRevenue` (utilities/energy)
  5. `TotalRevenuesAndOtherIncome` (financial entities)
- **Tag Provenance:** Every extracted XBRL metric must record the exact tag matched.

### Gap 2: Untagged Total Liabilities & Derived Balance Sheets
- **Issue:** Under US-GAAP, companies frequently disclose "Total Liabilities and Stockholders' Equity", tagging `LiabilitiesAndStockholdersEquity` alongside `StockholdersEquity`, while omitting an explicit tag for `Liabilities`.
- **Audit Solution:** If `Liabilities` is absent:
  - Derive: $\text{Derived Liabilities} = \text{Total Assets} - \text{Stockholders' Equity}$ (or $\text{LiabilitiesAndStockholdersEquity} - \text{Stockholders' Equity}$).
  - Explicitly flag the metric status as `DERIVED_VALUE`.
  - **Audit Rule:** A derived liabilities figure **cannot** count as an independent pass of the fundamental accounting identity ($Assets = Liabilities + Equity$). The system must report this check as `INCONCLUSIVE_DERIVED`.

### Gap 3: Missing Dimensional/Segment Data in `companyfacts`
- **Issue:** `companyfacts.json` provides consolidated entity-level facts and flattens or strips dimensional segment axes (e.g., Geographic or Operating Segment axes).
- **Audit Solution:** Segment validation cannot rely solely on `companyfacts`. The extraction pipeline must parse the Segment Reporting Note (Note disclosures) directly from the primary HTML/iXBRL filing or use the segment tables extracted from the financial notes.

### Gap 4: Robust Fiscal Period Matching (Bypassing CY Frames)
- **Issue:** Frame tags like `"CY2023"` are only present if EDGAR's automated indexer mapped the period to a standard calendar year frame. Off-calendar fiscal years fail this lookup.
- **Audit Solution:** Filter fact arrays using:
  $$\text{fact.form} == \text{"10-K"} \land \text{fact.fp} == \text{"FY"} \land \text{fact.fy} == \text{target\_fy}$$
  For instant metrics (Balance Sheet at fiscal year-end), verify that `fact.end` matches the filing's reported balance sheet date (e.g., within 5 days of fiscal year end).

### Gap 5: Efficient SEC EDGAR Ingestion & Caching
- **Issue:** Ingesting 8+ metrics across multiple years causes dozens of redundant network roundtrips, risking SEC 429 throttling.
- **Audit Solution:**
  - One HTTP request to `submissions/CIK{cik}.json` per session (cached to disk/SQLite).
  - One HTTP request to `companyfacts/CIK{cik}.json` per company (cached to disk/SQLite).
  - One HTTP fetch for the primary filing document (`.htm`).
  - Strict User-Agent declaration: `MonetaPreAudit team@moneta-audit.local`.
  - Built-in token-bucket rate limiter enforcing max 5 requests/sec (well below the 10 rps cap).

### Gap 6: Explicit Unit & Scale Multiplier Detection
- **Issue:** Filings report in units of "In thousands", "In millions", or "In billions", whereas XBRL reports exact whole dollars ($265,595,000,000$ vs $265,595$). If scale is ignored, extraction shows a $1,000\times$ or $1,000,000\times$ discrepancy.
- **Audit Solution:**
  - Inspect table headers, document preamble, and XBRL attributes (`decimals="-6"` or `"thousands"` / `"millions"`).
  - Normalization engine standardizes all extracted metrics to base currency units (cents/dollars) before executing numeric tie-outs.

### Gap 7: Seeded Error Injection Mode for Ground Truth Demonstration
- **Issue:** Since both extraction and XBRL come from the same filing, a perfectly reported filing will naturally tie out, giving no opportunity to demonstrate anomaly detection or human escalation in a live audit demo.
- **Audit Solution:** Implement a `--seed-error` configuration mode that deterministically injects known accounting defects:
  - *Defect A (Balance Sheet Out of Balance):* Corrupt Total Assets or Cash by $+5\%$.
  - *Defect B (P&L Linkage Broken):* Mutate Net Income on the Income Statement so it fails the Retained Earnings roll-forward and Cash Flow tie-out.
  - *Defect C (Segment Discrepancy):* Modify a segment sub-total so $\sum \text{Segments} \neq \text{Consolidated Revenue}$.
  - This guarantees verifiable audit flags and human escalation workflows during evaluation.

### Gap 8: Configurable Materiality Thresholds (Alongside YoY Variance)
- **Issue:** Flagging every $\pm 30\%$ YoY change causes alert fatigue on small line items (e.g., other income swinging from \$10k to \$25k is a 150% jump but immaterial). Conversely, a 4% swing on a \$100B revenue base (\$4B) is highly material.
- **Audit Solution:** Implement formal audit materiality rules:
  - *Planning Materiality (PM):* Default to $5\%$ of Pre-Tax Income (or $0.5\%$ of Total Assets / Revenue for break-even firms).
  - *Tolerable Misstatement (TM):* Set at $50\% - 75\%$ of PM.
  - Line-item variances are evaluated against both percentage swing AND absolute dollar materiality.

### Gap 9: Support for Uploaded Statements (CSV & PDF)
- **Issue:** Non-SEC filings, internal management accounts, or pre-filing draft 10-Ks are uploaded directly as CSV or PDF files without EDGAR CIKs.
- **Audit Solution:**
  - Ingestion adapter accepting direct `.csv` or `.pdf` file uploads.
  - In absence of XBRL ground truth, the audit integrity relies fully on internal cross-statement tie-outs ($A = L + E$, Cash Flow reconciliation, Retained Earnings roll-forward).

### Gap 10: LLM Safety, Grounding & Anti-Prompt-Injection
- **Issue:** Unchecked LLMs hallucinate numbers, speculate outside the filing, or are vulnerable to prompt injection if malicious text is embedded in filing footnotes.
- **Audit Solution:**
  - Read-only specialized query tools over verified filing chunks and parsed XBRL facts.
  - Strict system prompt: "Answer exclusively using retrieved snippets and facts. If a figure is not present in the provided context, state explicitly: 'Not found in the filing'."
  - External filing text is quarantined as untrusted data; instructions inside filing text are never executed as system directives.

### Gap 11: LangGraph Interrupt Idempotency
- **Issue:** LangGraph's `interrupt()` halts execution. When resumed via `Command(resume=...)`, the interrupted node re-executes from its start. Any non-idempotent side effects (database writes, audit logs, notifications) before the interrupt would be duplicated.
- **Audit Solution:**
  - Strictly isolate side effects: side effects occur *after* the `interrupt()` returns, or use deterministic upsert operations keyed by `(filing_id, metric_id)`.
  - Exactly one `interrupt()` per review node.

### Gap 12: Confidence Calibration & Empirical Scoring
- **Issue:** Arbitrary heuristic confidence scores (e.g. 0.95 vs 0.60) lack mathematical meaning and cause either excessive human escalations or missed errors.
- **Audit Solution:**
  - Confidence scoring formula:
    $$C = w_{\text{method}} \cdot S_{\text{method}} + w_{\text{evidence}} \cdot S_{\text{evidence}} + w_{\text{tie-out}} \cdot S_{\text{tie-out}} - P_{\text{anomaly}}$$
    Where method score gives highest weight to exact tabular OCR/regex ($1.0$), parsed iXBRL tag ($1.0$), and lower weight to ungrounded LLM inference ($0.65$).
  - Failures in hard tie-outs subtract $0.40$, automatically dropping confidence below the $0.80$ escalation threshold.
  - Empirical calibration tested against standard filings (AAPL, MSFT, TSLA).

---

## 4. Additional Accounting & Technical Gaps Identified

### Gap 13: Noncontrolling Interests in Stockholders' Equity
- In consolidated balance sheets, total equity often consists of:
  $$\text{Total Equity} = \text{Stockholders' Equity (Parent)} + \text{Noncontrolling Interests}$$
  If an auditor compares $\text{Assets}$ to $\text{Liabilities} + \text{Parent Stockholders' Equity}$, an apparent variance equal to the noncontrolling interest will trigger a false flag. The engine must check for `StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest`.

### Gap 14: Comprehensive Income vs Net Income in Retained Earnings Roll-Forward
- The retained earnings roll-forward equation is:
  $$\text{RE}_{\text{end}} = \text{RE}_{\text{start}} + \text{Net Income} - \text{Dividends} \pm \text{Other Comprehensive Income (OCI Adjustments)}$$
  If a company has stock repurchases retired through retained earnings or other equity adjustments, a naive $\text{RE}_{\text{start}} + \text{Net Income} - \text{Dividends}$ check will show a gap. The engine must identify and report the exact reconciling items (e.g., share repurchases, foreign currency translation adjustments) rather than failing abruptly.

### Gap 15: Restatements and 10-K/A Prior-Period Adjustments
- When comparing Year-on-Year metrics (e.g. FY2023 vs FY2022 from the FY2023 10-K), the prior year figures may have been restated. The system must verify whether prior-period numbers come from the current filing's comparative columns or the original filing's reported values.

---

## 5. Audit Conclusion & Approval
The baseline research in `docs/research.md` is sound in concept but required these 15 corrections to function reliably in a production audit setting. With these specifications codified, the technical architecture in Phase 1.7 can proceed on solid accounting and regulatory foundations.

