# Architecture & Design Decision Records (ADR)

This document tracks all foundational engineering, design, and accounting decisions for Moneta.

---

## ADR-007: External Integration Credentials Stay Backend-Side
- **Status:** Accepted
- **Context:** Gemini, SEC EDGAR, Supabase, Google OAuth, and optional provider settings need a consistent setup contract without exposing credentials or asserting provider connectivity based on environment values.
- **Decision:** Load backend settings from `backend/.env` without overriding process environment variables; store secrets as masked secret values; ignore actual `.env` files; expose a readiness report that never emits values and reports connections as untested. Keep the frontend example limited to public Supabase URL and publishable-key values. SEC endpoints are configurable, while optional providers remain unconfigured unless explicitly supplied.

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

## ADR-005: Unified Demo Analysis Endpoint (`/api/analyze`)
- **Status:** Accepted (Demo)
- **Context:** Judges require a responsive, one-click end-to-end demo that processes filings instantaneously without fragile multi-step manual setup.
- **Decision:** Implemented `POST /api/analyze` combining CIK resolution, local caching/EDGAR fetch, HTML metric extraction, statutory tie-outs, confidence scoring, and error injection into a single deterministic payload returned directly to the React workbench.

## ADR-006: Seeded Error Injection Design for Real-Time Anomaly Proof
- **Status:** Accepted (Demo)
- **Context:** Real SEC 10-K filings have already been audited and mathematically balance. A demo showing 100% clean passes does not prove that anomaly detection, escalation, and human-in-the-loop review work.
- **Decision:** Built a toggleable seeded error injection mechanism with 3 realistic financial corruption scenarios (Balance Sheet Tamper, Gross Profit Margin Understatement, Retained Earnings Leak). Injected corruption triggers real material misstatement warnings, failing statutory tie-outs and auto-escalating affected items to human review.
