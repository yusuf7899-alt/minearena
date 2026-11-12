# Architecture & Design Decision Records (ADR)

This document tracks all foundational engineering, design, and accounting decisions for Moneta.

---

## ADR-001: Separation of Research Baseline and Audit Fixes
- **Status:** Accepted
- **Context:** `research.md` contained 12 architectural and accounting gaps.
- **Decision:** All 12 gaps are formally documented and resolved in `docs/research-audit.md` and baked directly into Phase 2-8 specifications.

## ADR-002: Technology Stack Selection
- **Status:** Accepted
- **Context:** High auditability, robust human-in-the-loop state handling, and strict anti-slop visual presentation required.
- **Decision:**
  - **Backend:** Python 3.13, FastAPI for REST APIs, SQLAlchemy with SQLite for transactional data, LangGraph with persistent SQLite checkpointer for resumable agent state machine.
  - **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide React.
  - **Parsing:** Dual pipeline — Deterministic parser (BeautifulSoup / pdfplumber) with LLM fallback via structured output.

## ADR-003: Single-Call CompanyFacts Caching Architecture
- **Status:** Accepted (Phase 2)
- **Context:** Querying `companyconcept` per metric causes repeated HTTP round-trips to SEC EDGAR, risking HTTP 429 throttling.
- **Decision:** Moneta executes exactly one request to `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json` per company and caches the full JSON (~1–4 MB) in `backend/data/cache/xbrl/`. All 9 core metrics and subsequent tie-out references query this local cache.

## ADR-004: Robust Fiscal Period Matching Bypassing CY Frames
- **Status:** Accepted (Phase 2)
- **Context:** Many companies (Apple with late September year-end, Microsoft with June 30 year-end) omit `frame == "CY{year}"` on major concepts in EDGAR XBRL.
- **Decision:** Fact matching exclusively filters by `fact.form in ["10-K", "10-K/A"]`, `fact.fp == "FY"`, and `fact.fy == target_fiscal_year`. For instant balance sheet items, date proximity to the filing's report date is validated. When both original and amended filings exist, 10-K/A entries with the latest `filed` date take precedence.
