# Moneta Anti-Slop Directive: Design, Copy & Code Standards

**Author:** Design Director  
**Audience:** All Engineering, Design, and AI Agent Contributors  
**Enforcement:** Mandatory across all phases. Every UI screen, API response, written report, and code commit is evaluated against this standard.

---

## 1. Core Philosophy: The Anti-Slop Imperative
"AI Slop" is the uncurated, homogenized sediment produced when generative models regurgitate the average of their training sets. In enterprise financial software, AI slop is not merely an aesthetic annoyance—it destroys professional credibility, obscures accounting truth, and insults the intelligence of CPAs and audit partners.

Moneta is built for institutional rigor. Every visual element, word, and line of code must serve a deliberate, auditable purpose.

---

## 2. UI & Visual Design Standards

| Domain | Banned AI Slop Pattern ❌ | Mandated Positive Alternative ✅ | Rationale |
| :--- | :--- | :--- | :--- |
| **Color Gradients** | Generic purple-to-blue / cyan gradients (`bg-gradient-to-r from-purple-600 to-indigo-600`), neon glow orbs, ambient radial backlights. | Solid, deliberate banking navy palette (`#0B192C`, `#1E3E62`), crisp parchment white (`#FFFFFF`, `#F8FAFC`), and subtle border dividers (`#E2E8F0`). | Financial audit tools require high contrast, stability, and trust, not nightclub lighting. |
| **Surface Styling** | Overused frosted glassmorphism (`backdrop-blur-md bg-white/10 border border-white/20`). | Opaque, clean structural cards with crisp 1px borders (`border border-slate-200 bg-white shadow-xs`). | Glassmorphism degrades readability of dense financial numbers and fails contrast ratios. |
| **Typography** | Defaulting to Inter or system-ui for all elements indiscriminately. Missing tabular figures. | Dual-tier typography: Professional sans-serif for UI labels, formal serif (`Newsreader` or `Georgia`) for report headings, and monospace with `font-variant-numeric: tabular-nums` for all financial figures. | Financial figures must align down decimal columns. Serifs communicate legal/statutory authority. |
| **Iconography** | Emojis as UI icons (🚀, 💡, 📊, ⚠️, 🤖, ✨) used as interface elements. | Sharp, monochrome vector stroke icons (Lucide or Heroicons, 1.5px stroke, 16px/20px). | Emojis look amateurish and render inconsistently across operating systems and browsers. |
| **Card Layouts** | "The Cardocalypse": generic 3-card grid with floating neon icons, bold buzzword title, and two lines of filler text. | Structured accounting ledger tables, split-screen verification views, and dense data displays designed for scan-ability. | Auditors review comparative columns and line-item disclosures, not marketing feature cards. |
| **Number Display** | Left-aligned numbers, unformatted integers without commas, raw unscaled decimals (`1234567.89123`), negative numbers written as `-100`. | Right-aligned tabular numerals, explicit comma separation, accounting parenthesis format for negatives `(1,234.56)`, explicit scale badge (`$ in Millions`). | GAAP/SEC convention strictly dictates right alignment and parenthesis for negative balances. |
| **Micro-Interactions**| Bouncy CSS springs, scale zooms on button hover (`hover:scale-105`), spinning shiny stars. | Instantaneous or subtle 150ms opacity/color transitions (`transition-colors duration-150 ease-out`). | Audit workflows require rapid, predictable feedback without dizzying animation. |

---

## 3. Copywriting & Content Standards

| Domain | Banned AI Slop Pattern ❌ | Mandated Positive Alternative ✅ | Rationale |
| :--- | :--- | :--- | :--- |
| **Agent Tone** | Hyperbolic marketing fluff: *"Unleash the revolutionary power of AI-driven pre-audit intelligence!"*, *"Empower your enterprise with seamless auditing."* | Direct, objective, declarative professional prose: *"Moneta validates Form 10-K disclosures against US-GAAP XBRL ground truth and flags accounting discrepancies."* | Professional auditors reject hype; they require precise statements of scope and methodology. |
| **AI Buzzwords** | Buzzwords such as *"delve"*, *"testament"*, *"tapestry"*, *"game-changer"*, *"seamlessly"*, *"supercharge"*, *"holistic"*. | Standard accounting and regulatory terms: *"tie-out"*, *"variance"*, *"ASC 606"*, *"retained earnings roll-forward"*, *"materiality threshold"*. | Using real domain vocabulary proves competence; AI buzzwords reveal lack of domain grounding. |
| **LLM Explanations** | Verbose conversational filler: *"Sure! I'd be happy to explain that for you! After carefully reviewing the filing, it seems that..."* | Direct citation-first answers: *"Per Note 4 (Segment Disclosures, p. 72), consolidated revenue includes $42.1B in Services and $154.2B in Products. XBRL tag `us-gaap:Revenues` matches."* | Auditors have zero tolerance for conversational chitchat during flag review. |
| **Uncertainty Phrasing**| Hallucinatory hedging or fabricating: *"It is likely that this was due to market conditions..."* | Strict grounded boundary: *"Not found in the filing. Disclosed tables do not provide an itemized breakdown for this line item."* | Guessing in an audit context is a catastrophic failure mode. |
| **Metrics & Stats** | Meaningless vanity stats cards: *"100% Secure"*, *"99.9% Accuracy Guaranteed"*, *"Trusted by 10,000+ Enterprises"*. | Concrete verifiable operational metrics: *"Extraction Accuracy: 96.2% (25/26 concepts verified vs XBRL)"*, *"Materiality Threshold: $14.2M (5% of Pre-Tax Income)"*. | All statistics must be mathematically tied to actual data points in the session. |

---

## 4. Code & Engineering Standards

| Domain | Banned AI Slop Pattern ❌ | Mandated Positive Alternative ✅ | Rationale |
| :--- | :--- | :--- | :--- |
| **Comments** | Over-commenting obvious syntax:  <br>`// set x to 5`<br>`x = 5`<br>`// loop through items`<br>`for item in items:` | Meaningful architectural rationale and accounting formula comments: <br>`# ASC 250: Adjust retained earnings roll-forward for prior period restatement`<br>`# SEC rule: rate-limit requests to <= 8 rps with exponential backoff` | Obvious comments clutter code; architectural and accounting context is invaluable. |
| **Mock Logic** | Hardcoded fake data disguised as live extraction: e.g. returning static JSON and calling it "live SEC fetch". | Real API calls with transparent local disk caching, or explicit seeded-error test fixtures clearly marked in `tests/fixtures/`. | Fake data invalidates the entire premise of the hackathon and evaluation. |
| **Error Handling** | Blank exception swallowing: <br>`except Exception: pass` or `catch(e) {}`. | Explicit exception types with contextual logging and audit trail escalation: <br>`except SECRateLimitError as e: logger.warning(...); retry_with_backoff()` | Hidden exceptions cause silent accounting desynchronization. |
| **Architecture Bloat** | Deeply nested, unnecessary factory-of-factories or speculative abstractions for 10-line utilities. | Clean, modular, idiomatic Python and TypeScript: functions, typed dataclasses/Pydantic schemas, and readable orchestration. | Readable, maintainable code facilitates rapid debugging and live demo transparency. |

---

## 5. Anti-Slop Audit Checklist (To run at every phase)
- [ ] No purple-to-blue / cyan gradients or glowing neon orbs.
- [ ] No frosted glassmorphism over saturated backgrounds.
- [ ] All financial numbers are right-aligned, formatted with commas, and use tabular numerals.
- [ ] Negative balances appear in accounting parentheses `(x)` rather than bare `-x`.
- [ ] No emojis in UI icons or system copy.
- [ ] No marketing filler or AI buzzwords ("delve", "seamlessly", "game-changer").
- [ ] LLM responses state "Not found in the filing" when evidence is missing.
- [ ] Code comments explain "why" (accounting rules, SEC limits), not "what" (`i++`).
- [ ] No fake mock data disguised as live data.

