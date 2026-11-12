---
name: qa-verification
description: Quality assurance protocols, verification checklists, test execution harnesses, regression testing, and phase-gate validation for Moneta.
---

# QA Verification Skill

## Purpose
This skill establishes strict quality assurance standards, verification protocols, and test execution harnesses for Moneta across all feature phases.

## Phase Verification Checklist

### 1. Functional Integrity
- [ ] End-to-end execution completes without unhandled exceptions.
- [ ] All mandatory metrics (Revenue, Liabilities, Net Income, Equity, Assets, Operating Cash Flow + extras) are extracted and reconciled.
- [ ] SEC rate limits are respected (max 5–8 rps); 429 backoff is verified.
- [ ] LangGraph pause/resume operates with a single interrupt per node, restoring exact state without re-running completed side effects.

### 2. Accounting Accuracy
- [ ] Accounting equation ($A = L + E$) is verified to within 0.1% tolerance.
- [ ] Derived liabilities are properly flagged as `DERIVED_VALUE` and marked `INCONCLUSIVE_DERIVED`.
- [ ] Retained earnings roll-forward reconciles Net Income to Equity.
- [ ] Seeded-error mode reliably triggers flags and escalations with correct diagnostic gap explanations.

### 3. Anti-Slop & Design Compliance
- [ ] Visual inspection confirms strict adherence to `docs/anti-slop.md`.
- [ ] Zero unauthorized purple-to-blue gradients, neon orbs, or glassmorphism.
- [ ] All financial numbers are right-aligned, comma-separated, and use tabular figures.
- [ ] Negative balances appear in accounting parentheses `(1,234.56)`.
- [ ] Zero emoji icons in UI elements or system copy.

### 4. LLM Safety & Audit Grounding
- [ ] Auditor Q&A tool responses cite exact footnotes, pages, or XBRL tags.
- [ ] Prompts treat filing text as untrusted data with strict quarantine delimiters.
- [ ] Out-of-scope or missing queries return `"Not found in the filing"`.
- [ ] All Q&A turns and auditor actions persist to the immutable audit log table.

## Automated Verification Harness
Run the master test suite before every phase-gate consent request:
```powershell
py -3.13 -m pytest tests/ -v
```
Capture and record test outputs and operational logs in the phase walkthrough artifact.

