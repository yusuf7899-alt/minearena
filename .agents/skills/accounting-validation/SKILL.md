---
name: accounting-validation
description: Core accounting integrity validation, double-entry verification, tie-out execution, roll-forwards, and materiality checks for financial filings.
---

# Accounting Validation Skill

## Purpose
This skill guides agents in executing mathematically rigorous double-entry accounting tie-outs, cross-statement reconciliations, and materiality evaluations across financial statements (Balance Sheet, Income Statement, Cash Flows, Retained Earnings, and Disclosures).

## Core Accounting Formulas & Tie-Outs

### 1. Balance Sheet Identity
$$\text{Total Assets} = \text{Total Liabilities} + \text{Total Stockholders' Equity}$$
- **Verification Tolerance:** Relative difference $\le 0.001$ ($0.1\%$) or absolute difference $\le \$1,000$ to absorb minor published rounding.
- **Derived Liabilities Exception:** If `Liabilities` is not tagged and is derived as $\text{Assets} - \text{Equity}$, mark status `INCONCLUSIVE_DERIVED`. Do NOT report as a validated pass.
- **Noncontrolling Interests:** Check if equity includes `StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest`.

### 2. Retained Earnings Roll-Forward (P&L to Balance Sheet Bridge)
$$\text{Retained Earnings}_{\text{end}} = \text{Retained Earnings}_{\text{beg}} + \text{Net Income} - \text{Dividends} \pm \text{Other Adjustments}$$
- Reconciles how the P&L feeds directly into Balance Sheet Equity.
- If a discrepancy appears, inspect Note disclosures for stock repurchases, retirement of shares, or other comprehensive income (OCI) items.

### 3. Net Income Statement vs Cash Flow Tie-Out
$$\text{Net Income (P&L)} = \text{Net Income (Operating Cash Flows Statement Beginning)}$$
- Must tie out exactly. If different, verify whether the company reports Net Income before or after Noncontrolling Interests.

### 4. Cash Flow Statement Ending Cash vs Balance Sheet Cash
$$\text{Ending Cash and Cash Equivalents (Cash Flow Statement)} = \text{Cash and Cash Equivalents (Balance Sheet)}$$
- If restricted cash is present, compare to `Cash, Cash Equivalents and Restricted Cash`.

### 5. Gross Profit Tie-Out
$$\text{Gross Profit} = \text{Total Revenue} - \text{Cost of Goods / Services Sold (COGS)}$$

### 6. Segment Reconciliation
$$\sum_{i=1}^n \text{Segment Revenue}_i = \text{Consolidated Revenue}$$
$$\sum_{i=1}^n \text{Segment Operating Profit}_i = \text{Consolidated Operating Profit}$$
- Disclosed under ASC 280 / IFRS 8 in the Segment Reporting Footnote.

### 7. Planning Materiality & YoY Variance Thresholds
- **Planning Materiality (PM):** $5\%$ of Pre-Tax Income (or $0.5\%$ of Total Assets / Revenue for break-even entities).
- **Tolerable Misstatement (TM):** $50\% - 75\%$ of PM.
- **YoY Variance Flag:** Triggered when:
  $$|\Delta_{\text{YoY}}| > 30\% \quad \text{AND} \quad |\text{Dollar Delta}| > \text{Tolerable Misstatement}$$

## Discrepancy Reporting Standard
Every failed check must return a structured payload:
```json
{
  "tie_out": "BALANCE_SHEET_IDENTITY",
  "status": "FAIL",
  "expected": 150000000000,
  "actual": 148500000000,
  "delta": 1500000000,
  "materiality_status": "MATERIAL_EXCEPTION",
  "likely_contributing_items": [
    "Operating lease liabilities ($1.5B) missing from current liabilities"
  ]
}
```

