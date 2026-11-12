---
name: sec-edgar-access
description: SEC EDGAR API retrieval, rate-limiting, local caching, Submissions, CompanyFacts parsing, and archive document URL resolution.
---

# SEC EDGAR Access Skill

## Purpose
This skill provides complete operational instructions for interacting with the SEC EDGAR system in compliance with regulatory fair access rules, handling rate limits, parsing JSON endpoints, and retrieving primary 10-K filing documents.

## SEC EDGAR Regulatory Requirements
1. **User-Agent Header:** Every request to `sec.gov` or `data.sec.gov` must include a declared User-Agent:
   ```python
   HEADERS = {
       "User-Agent": "MonetaPreAudit team@moneta-audit.local",
       "Accept-Encoding": "gzip, deflate",
       "Host": "data.sec.gov" # or www.sec.gov
   }
   ```
   *Requests lacking this header receive HTTP 403 Forbidden.*
2. **Rate Limit:** Maximum 10 requests per second across all connections. The Moneta client throttles to **5 requests per second** using a token-bucket rate limiter.
3. **Backoff on 429:** On receiving HTTP 429 (Too Many Requests), back off exponentially: $1\text{s}, 2\text{s}, 4\text{s}$.

## Endpoint Directory

### 1. Company Tickers to CIK
`https://www.sec.gov/files/company_tickers.json`
- Maps ticker symbol to 10-digit CIK (zero-padded).
- Cache locally for 24 hours.

### 2. Company Submissions API
`https://data.sec.gov/submissions/CIK{cik.zfill(10)}.json`
- Returns metadata and recent filings under `filings.recent`.
- Extract:
  - `accessionNumber` (e.g. `0000320193-24-000106`)
  - `form` (filter for `10-K` or `10-K/A`)
  - `filingDate`
  - `primaryDocument` (e.g. `aapl-20240928.htm`)

### 3. Primary Filing Document URL Assembly
Construct the direct archive URL:
```python
raw_cik = str(int(cik))  # strip leading zeros for folder
acc_nodash = accession_number.replace("-", "")
doc_url = f"https://www.sec.gov/Archives/edgar/data/{raw_cik}/{acc_nodash}/{primary_document}"
```

### 4. CompanyFacts API (Single Cached Ground Truth Call)
`https://data.sec.gov/api/xbrl/companyfacts/CIK{cik.zfill(10)}.json`
- Returns all XBRL disclosures under `facts["us-gaap"]`.
- Single call per company (~1–4 MB JSON). Cache locally in SQLite / disk.
- Query individual concepts from this cached dictionary.

### 5. Robust Fiscal Period Matching Rule
Do NOT rely on `frame == "CY{year}"`. Match using:
```python
facts = facts_json["facts"]["us-gaap"][concept_tag]["units"]["USD"]
matching_facts = [
    f for f in facts 
    if f.get("form") in ["10-K", "10-K/A"] 
    and f.get("fp") == "FY" 
    and f.get("fy") == target_fiscal_year
]
```
For instant (Balance Sheet) items, verify `end` matches the filing period end date.

