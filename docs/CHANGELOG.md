# Moneta Changelog

All notable changes to the Moneta project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - External integration configuration

### Added
- Added backend environment templates and a local, Git-ignored backend `.env` for required and optional provider settings.
- Added a secret-safe configuration readiness report; provider connectivity and Gemini model availability are explicitly marked untested.
- Configured SEC base and archive URLs through environment variables without changing filing analysis behavior.
- Documented provider setup, OAuth publishing requirements, backend-only secrets, and optional OCR/fallback configuration.

## [1.2.0-demo] - 2026-11-12 - End-to-End Moneta Working Demo for Judges

### Added
- **Unified Pipeline API (`POST /api/analyze`):** Orchestrates end-to-end processing in a single call: resolves company CIK, fetches SEC EDGAR 10-K primary document, ingests XBRL CompanyFacts ground truth, extracts 9 statutory financial metrics, evaluates 6 accounting tie-out checks with dynamic planning materiality, scores confidence, and applies auditor decisions.
- **Accounting Integrity Engine (`backend/app/services/accounting_engine.py`):** Evaluates Fundamental Balance Sheet Identity ($A = L + E$), Retained Earnings Roll-Forward Bridge, Cash Flow to Cash & Equivalents tie-out, Operating Cash Flow vs Net Income, Gross Profit ($Revenues - COGS$), and Planning Materiality ($5\%$ Pre-Tax Income) with Tolerable Misstatement ($75\%$ PM).
- **Seeded Error Injection Mode:** Controlled demo injection mode demonstrating real-time anomaly detection with 3 deterministic scenarios: Balance Sheet Tamper (+$15B fictitious asset), Gross Profit Understatement (-$12B), and Retained Earnings discrepancy (+$10B).
- **Multi-Factor Confidence Scoring (`backend/app/services/confidence_service.py`):** Calibrated multi-factor scoring ($0.0 - 1.0$) using extraction method, XBRL concordance, period matching, and tie-out consistency. Auto-approves metrics $\ge 0.85$ and escalates doubtful ones to the senior auditor review queue.
- **5-Tab Professional Workbench UI (`frontend/src/App.tsx`):** Complete human-in-the-loop auditor workspace with:
  - Tab 1: SEC Ingestion & Filing Metadata + Four-Factor summary cards
  - Tab 2: Metric Extraction table with evidence snippets and XBRL verification
  - Tab 3: Statutory Accounting Integrity Tie-Outs matrix
  - Tab 4: Senior Auditor Review Queue with Approve/Reject/Override actions + grounded Auditor Q&A Chat
  - Tab 5: Pre-Audit Report with Executive Summary, Metrics concordance table, Tie-Out summary, and Print/Export
- **Comprehensive Test Suite:** 15/15 tests passing across API health, SEC client, XBRL service, statement upload, and extraction accuracy benchmark.

## [1.1.0-phase2] - 2026-11-12 - Phase 2: SEC Filing Ingestion & XBRL Ground Truth

### Added
- **2.1 CIK/Ticker Mapping & Submissions API:** Implemented `SECClient` (`backend/app/services/sec_client.py`) with polite token-bucket rate limiter ($\le 5.0$ RPS), compliant User-Agent (`MonetaPreAudit team@moneta-audit.local`), CIK resolver via cached `company_tickers.json`, and Submissions API client with Form 10-K locator.
- **2.2 Primary Document Fetch & Caching:** Constructed exact SEC Archive URL resolution pattern (`/Archives/edgar/data/{raw_cik}/{acc_nodash}/{primaryDocument}`) and local disk document cache under `backend/data/cache/filings/`.
- **2.3 CompanyFacts Ingestion & Tag Fallbacks:** Implemented `XBRLService` (`backend/app/services/xbrl_service.py`) performing single-call `companyfacts` caching per company, ordered US-GAAP tag fallback cascades for 9 core metrics (Revenues, Assets, Liabilities, Equity, Net Income, Cash Flow, Gross Profit, Operating Income, Cash), robust fiscal period matching by `form`, `fp`, `fy`, and synthetic derived liabilities calculation with `is_derived=True`.
- **2.4 Uploaded Statement Support:** Implemented `UploadService` (`backend/app/services/upload_service.py`) with CSV and PDF financial statement parsing, multiplier scale detection, and accounting parenthesis parsing. Mounted `POST /api/audit/upload`.
- **2.5 Multi-Company Benchmark Verification:** Tested and verified live ingestion and XBRL ground-truth facts across 5 benchmark entities: AAPL, MSFT, TSLA (prioritizing 10-K/A amendment), IBM, and GOOGL. Automated test suite passed 11/11 tests.

## [1.0.0-phase1] - 2026-11-12 - Phase 1 Foundation & Architecture

### Added
- Phase 1 Foundation: Discovery Audit (`docs/research-audit.md`), Anti-Slop Directive (`docs/anti-slop.md`), UX Flows (`docs/ux/flows.md`), Brand Identity (`docs/brand.md`), Design System (`DESIGN.md`), 5 Antigravity Skills, Architecture Blueprint (`docs/architecture.md`), and full-stack scaffold.
