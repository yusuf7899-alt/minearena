# Moneta Design System Specification

**Author:** Design Systems Lead  
**Scope:** Core Design Tokens, Layout Grid, Component Library, Number Formatting & Accessibility  
**Specification File:** `DESIGN.md`

---

## 1. Design Tokens (CSS Variables & Tailwind)

### 1.1 Color Tokens
```css
:root {
  /* Brand Navy Foundation */
  --moneta-navy-950: #070F1E;
  --moneta-navy-900: #0B192C;
  --moneta-navy-800: #1E3E62;
  --moneta-navy-700: #2E5077;
  --moneta-navy-600: #3E6B99;

  /* Restrained Institutional Accent (Gold / Bronze) */
  --moneta-gold-500: #C5A880;
  --moneta-gold-400: #D8BF9D;
  --moneta-gold-100: #F5EFE6;
  --moneta-gold-50:  #FAF7F2;

  /* Neutral Workpaper Canvas */
  --moneta-canvas:    #F8FAFC;
  --moneta-surface:   #FFFFFF;
  --moneta-border:    #E2E8F0;
  --moneta-border-subtle: #F1F5F9;
  --moneta-text-primary: #0F172A;
  --moneta-text-secondary: #64748B;
  --moneta-text-muted: #94A3B8;

  /* Semantic Accounting Tokens (WCAG AA/AAA Compliant) */
  --status-pass-bg:     #ECFDF5;
  --status-pass-border: #A7F3D0;
  --status-pass-text:   #065F46;

  --status-warn-bg:     #FFFBEB;
  --status-warn-border: #FDE68A;
  --status-warn-text:   #92400E;

  --status-fail-bg:     #FFF1F2;
  --status-fail-border: #FECDD3;
  --status-fail-text:   #9F1239;

  --status-derived-bg:     #EEF2FF;
  --status-derived-border: #C7D2FE;
  --status-derived-text:   #3730A3;
}
```

### 1.2 Spacing & Radii
- **Spacing Scale:** Standard 4px grid (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `48px`).
- **Corner Radii:** Strict geometric corners for audit precision:
  - Small elements (Badges, tags): `rounded (4px)`
  - Cards, Buttons, Inputs: `rounded-md (6px)`
  - Modals, Slide-over panels: `rounded-lg (8px)`
  - *Banned:* Pill-shaped buttons (`rounded-full`) or over-rounded bubbly borders (`rounded-2xl`).

### 1.3 Elevations & Shadows
- **Card / Surface:** `shadow-xs: 0 1px 2px 0 rgba(15, 23, 42, 0.05);`
- **Dropdown / Flyout:** `shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04);`
- **Slide-over Review Drawer:** `shadow-xl: -4px 0 24px -4px rgba(15, 23, 42, 0.12);`
- *Banned:* Soft colorful neon drop shadows (`shadow-purple-500/50`).

---

## 2. Mandatory Number Formatting & Financial Presentation Rules

Every number displayed in Moneta must conform to strict financial audit conventions:

1. **Alignment:** Every financial quantity in a table or ledger **MUST be right-aligned** (`text-right justify-end`). Only labels and concept names may be left-aligned.
2. **Tabular Figures:** Numbers must use monospace or fonts with `font-variant-numeric: tabular-nums lining-nums`. This guarantees that commas, decimal points, and digits align in vertical columns across lines.
3. **Negative Numbers:** Negative numbers **MUST be presented in accounting parentheses**, never with a naked minus sign:
   - Correct: `(142,500,000)`
   - Banned: `-142,500,000` or `- $142.5M`
4. **Scale Multipliers:** When values are scaled, the scale must be explicitly stated in the section header or column caption (e.g. `Amounts in USD Thousands` or `Amounts in Millions`). The UI provides an instant toggle: `[Display: Exact Dollars | Scaled Millions]`.
5. **Zero Balance:** A true zero balance is rendered as an em-dash `—` or `$0.00`, not left blank.
6. **Variances:** Percentage changes must include explicit signs and one decimal place: `+12.4%`, `(3.2%)`, `0.0%`.

---

## 3. Core Component Catalog

### 3.1 Financial Data Table (`FinancialLedgerTable`)
- **Structure:** Sticky header with dark navy accent border (`border-b-2 border-moneta-navy-800`), alternating row hover (`hover:bg-slate-50/80`), row selection indicator.
- **Columns:**
  1. `Concept & Line Item` (Left-aligned, bold primary text, subtext with US-GAAP tag in micro-code font).
  2. `Reported Extracted` (Right-aligned tabular numerals, clickable to view evidence snippet).
  3. `XBRL Ground Truth` (Right-aligned tabular numerals with exact tag pill).
  4. `Variance` (Right-aligned, dollar delta and percentage swing).
  5. `Confidence Score` (Calibrated pill: High $\ge 80\%$, Medium $65–79\%$, Low $<65\%$).
  6. `Audit Status` (Auto-Approved, Flagged, Under Review, Verified).
  7. `Actions` (Review Flag button, View Evidence icon).

### 3.2 Flag Escalation Card (`FlagEscalationCard`)
- **Visual:** 1px Rose or Amber border with high-contrast header.
- **Header:** Metric Name, Failed Rule (e.g. `TIE_OUT_FAILED: Assets != Liabilities + Equity`), Discrepancy Amount (`Delta: $1,420,000,000`).
- **Body:** Brief diagnostic summary of likely contributing line items (e.g., *"Unclassified Operating Lease Liabilities ($1.42B) omitted from Total Liabilities"*).
- **Affordance:** Primary button `Inspect & Interrogate` which slides open the Auditor Q&A drawer.

### 3.3 Dual-Pane Evidence Viewer (`EvidenceViewer`)
- **Left Pane:** Structured extracted metric card (Value, Scale, Unit, Period End, Extraction Method).
- **Right Pane:** The raw rendered HTML or PDF page excerpt from the SEC filing.
- **Target Highlighting:** The exact extracted string is highlighted with a gold background wash (`#F5EFE6` with border `#C5A880`) and bold text. The surrounding 150 characters are visible for immediate contextual verification.

### 3.4 Confidence Score Meter (`ConfidenceBadge`)
- **Format:** Numeric score with qualitative label: e.g. `0.94 High` or `0.62 Low (Escalated)`.
- **Tooltip Decomposition:** Hovering displays the exact penalty breakdown:
  ```
  Base Heuristic: +0.90 (Tabular HTML Match)
  XBRL Tag Match: +0.08 (Exact tag Revenues)
  YoY Variance Penalty: -0.15 (YoY swing 44% exceeds 30%)
  Final Calibrated Score: 0.83 (Auto-Approved)
  ```

### 3.5 Four-Factor Tie-Out Visualizer (`AccountingLinkageVisualizer`)
- **Visual Architecture:** Interactive flow diagram illustrating the fundamental accounting bridge:
  1. **Assets Factor:** Consolidated Assets balance.
  2. **Liabilities Factor:** Consolidated Liabilities balance (explicit vs derived).
  3. **Equity Factor:** Capital + Retained Earnings + Noncontrolling Interest.
  4. **P&L Connection:** Income statement ($Revenues - Expenses = Net Income$) bridges into the Balance Sheet via the **Retained Earnings Roll-Forward**:
     $$\text{Ending RE} = \text{Beginning RE} + \text{Net Income} - \text{Dividends} \pm \text{OCI}$$
- **State Feedback:** If any node in the chain is broken, that node and its connecting conduit pulse with Rose warning borders.

### 3.6 Auditor <-> Model Query Chat Panel (`AuditorChatPanel`)
- **Layout:** Slide-over right drawer (480px width) or split-screen panel.
- **Header:** Active Flag Context (Metric, Delta, Document Page).
- **Message Feed:**
  - Auditor messages: Slate bubble, right-aligned.
  - Model responses: Navy border, left-aligned, accompanied by a **Grounding Citation Badge** (e.g. `[Note 12: Commitments, p. 88]`).
  - Read-Only Tool Execution Indicator: Subtle collapsed pill showing which tool was queried (`Queried: get_xbrl_fact(concept='OperatingLeaseLiability')`).
- **Input Bar:** Clean text input with suggested quick-audit prompts:
  - *"Which line items make up this liability?"*
  - *"Compare this figure to the prior year 10-K reported value."*
  - *"Show the footnote detailing segment revenue."*

### 3.7 Pre-Audit Report Preview (`PreAuditReportView`)
- **Style:** Clean formal institutional layout matching print styles (`@media print`).
- **Typography:** Serif headings (`Newsreader` / `Georgia`), high-density tabular tables.
- **Sections:**
  1. Executive Summary & Audit Opinion Status (Unqualified / Exceptions Noted).
  2. Entity Identification (Name, CIK, Accession, Filing Date, Accounting Standard).
  3. Metrics Table (Extracted vs XBRL Ground Truth, Variances, Resolution Status).
  4. Four-Factor Linkage & Tie-Out Reconciliation Matrix.
  5. Detailed Flag Escalations & Auditor Q&A Highlights.
  6. Append-Only Audit Trail (Signatures, Timestamps, Reviewer IDs).
  7. Scope Limitations & Methodological Disclaimers.

---

## 4. Layout Grid & Responsive Architecture
- **Desktop Primary:** Optimized for 1440px+ dual-monitor audit workstations.
- **Workspace Split:**
  - 240px: Collapsible Engagement Sidebar (Company switcher, navigation, status).
  - Flexible Main Pane (800px min): Financial statement ledger and tie-out visualizer.
  - 480px Slide-Over Drawer: Evidence viewer and Auditor Q&A query panel.

---

## 5. Accessibility (WCAG 2.1 Level AA / AAA)
- All text meets minimum contrast ratio of 4.5:1 (small text) and 7:1 (large text / numerical ledgers).
- Full keyboard navigation: `Tab` traverses ledger rows; `Enter` opens flag inspection; `Escape` closes the review drawer.
- Screen-reader friendly semantic table markup (`<table role="table">`, `<th scope="col">`, `<td aria-describedby="...">`).

