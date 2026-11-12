# Moneta Changelog

All notable changes to the Moneta project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
