# Moneta Brand Identity & Visual Language

**Author:** Brand Director  
**Brand:** Moneta — Pre-Audit Intelligence  
**Version:** 1.0 (Institutional Edition)

---

## 1. Brand Essence & Heritage

### Etymology & Meaning
**Moneta** (*Latin: "She who advises or protects"*) derives from *Juno Moneta*, the Roman goddess of memory and guardian of state finances, in whose temple Rome's first mint was established. 

### Positioning Statement
> **For audit partners, controllers, and assurance teams, Moneta is the autonomous pre-audit engine that enforces mathematical and statutory integrity across financial filings before human sign-off.** Unlike opaque conversational AI, Moneta provides unbending double-entry validation, grounded footnote citations, and an immutable audit trail.

### Brand Pillars
1. **Mathematical Inviolability:** Assets must equal Liabilities plus Equity. No smoothing, no rounding apologies, no hidden derivations.
2. **Citation-First Truth:** Every reported figure and explanation links directly to a page, table, footnote, or XBRL taxonomy tag.
3. **Institutional Restraint:** No flashy gradients, no decorative animations, no marketing rhetoric. Built for the somber precision of audit committee workpapers.

### Tone & Voice Matrix
* **Objective, not flattering:** Never say *"impressive 40% growth"*. Say *"Revenues increased 40.2% YoY from $14.1B to $19.8B"*.
* **Definitive on limits:** When a figure is undisclosed, state *"Not found in the filing"*. Never guess.
* **Strict on standards:** Adhere to US-GAAP and PCAOB terminology (*"Tie-out"*, *"Variance"*, *"ASC 606"*, *"Materiality Threshold"*).

---

## 2. Logo & Mark Specification

The Moneta identity consists of the **Moneta Seal** (geometric audit mark) and the **Moneta Wordmark**.

### The Moneta Seal (SVG)
The seal features a balanced Roman numeral and double-entry scales embedded within a solid verification shield.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <!-- Outer Shield Border -->
  <rect x="3" y="3" width="42" height="42" rx="8" fill="#0B192C" stroke="#C5A880" stroke-width="2"/>
  
  <!-- Balanced Pillar / Crossbeam -->
  <path d="M12 14H36" stroke="#C5A880" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M24 14V34" stroke="#C5A880" stroke-width="2.5" stroke-linecap="round"/>
  
  <!-- Left Weight: Assets (Square) -->
  <rect x="14" y="20" width="6" height="6" fill="#F8FAFC" stroke="#C5A880" stroke-width="1.5"/>
  <line x1="17" y1="14" x2="17" y2="20" stroke="#C5A880" stroke-width="1.5"/>
  
  <!-- Right Weight: Liabilities + Equity (Equal Double Weight) -->
  <rect x="28" y="20" width="6" height="6" fill="#F8FAFC" stroke="#C5A880" stroke-width="1.5"/>
  <line x1="31" y1="14" x2="31" y2="20" stroke="#C5A880" stroke-width="1.5"/>
  
  <!-- Base Plinth -->
  <path d="M16 34H32" stroke="#C5A880" stroke-width="2.5" stroke-linecap="round"/>
</svg>
```

### The Moneta Wordmark
Set in high-tracking uppercase geometric sans with an authoritative serif descriptor:
- **Primary Mark:** `MONETA` (Weight: 700 Bold, Tracking: `0.15em`, Color: Navy `#0B192C` or Gold `#C5A880` on dark)
- **Descriptor:** `PRE-AUDIT INTELLIGENCE` (Weight: 500 Medium, Tracking: `0.25em`, Color: Slate `#64748B`)

---

## 3. Color Palette & Accessibility Matrix

All color pairings pass WCAG 2.1 Level AA for small text and Level AAA for large headers / tabular data.

### Primary Brand Navy (The Foundation of Trust)
| Token Name | Hex Code | Contrast on White | Primary Usage |
| :--- | :--- | :--- | :--- |
| `color-navy-950` | `#070F1E` | 17.8 : 1 (AAA) | Dark mode backgrounds, high-contrast modal headers |
| `color-navy-900` | `#0B192C` | 15.6 : 1 (AAA) | Primary brand color, sidebar canvas, primary buttons |
| `color-navy-800` | `#1E3E62` | 10.4 : 1 (AAA) | Interactive element borders, table header fills |
| `color-navy-700` | `#2E5077` | 6.8 : 1 (AA) | Muted navigation items, structural lines |

### Institutional Accent (Restrained Gold)
| Token Name | Hex Code | Purpose | Usage |
| :--- | :--- | :--- | :--- |
| `color-gold-500` | `#C5A880` | Premium Seal & Accent | Wordmark accents, active tab underlines, focus rings |
| `color-gold-100` | `#F5EFE6` | Subtle Gold Tint | Highlighted text in source snippets, active row indicators |

### Neutral Workpaper Canvas
| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| `color-slate-50` | `#F8FAFC` | Primary application canvas (reduces glare compared to harsh pure white) |
| `color-white` | `#FFFFFF` | Ledger and card container surface |
| `color-slate-200` | `#E2E8F0` | Structural 1px table and card dividers |
| `color-slate-500` | `#64748B` | Secondary metadata labels, timestamps, footnotes |
| `color-slate-900` | `#0F172A` | Primary body text and financial values |

### Semantic Accounting Status Tokens
| State | Badge Fill | Badge Border | Text Color | Meaning in Moneta |
| :--- | :--- | :--- | :--- | :--- |
| **Pass / Balanced** | `#ECFDF5` | `#A7F3D0` | `#065F46` (Emerald 800) | Metric matches XBRL or Tie-Out equation holds exactly ($A = L + E$). |
| **Warning / Review** | `#FFFBEB` | `#FDE68A` | `#92400E` (Amber 800) | YoY variance exceeds materiality threshold or confidence $< 0.80$. |
| **Fail / Imbalance** | `#FFF1F2` | `#FECDD3` | `#9F1239` (Rose 800) | Hard accounting tie-out broken, segment mismatch, or extraction contradiction. |
| **Derived / Synthetic**| `#EEF2FF` | `#C7D2FE` | `#3730A3` (Indigo 800) | Metric was not explicitly tagged and was calculated by deduction. |

---

## 4. Typographic System

Moneta employs a tripartite typographic architecture designed specifically for multi-column financial statements.

### 1. Financial Numerals & Tables: Tabular Monospace
- **Font Stack:** `'JetBrains Mono', 'Roboto Mono', 'SFMono-Regular', Menlo, monospace`
- **CSS Feature Settings:** `font-variant-numeric: tabular-nums lining-nums; text-align: right;`
- **Rule:** Every balance sheet figure, ratio, and percentage MUST use this stack. Characters must occupy identical horizontal widths to ensure decimals align vertically.

### 2. User Interface & Controls: Professional Sans
- **Font Stack:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Usage:** Navigation bars, action buttons, form inputs, tooltips, and status tags.

### 3. Audit Report Headings & Legal Text: Statutory Serif
- **Font Stack:** `'Newsreader', 'Georgia', 'Cambria', serif`
- **Usage:** Pre-Audit Report cover titles, formal audit opinion headers, and scope memorandums. Communicates regulatory weight.

### Typographic Scale
| Level | Font Size | Line Height | Weight | Letter Spacing | Target Element |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display 1** | `32px` (2rem) | `40px` | 700 Bold | `-0.02em` | Report Title, Engagement Hero |
| **Heading 1** | `24px` (1.5rem) | `32px` | 600 SemiBold | `-0.01em` | Section Titles (e.g. Balance Sheet Tie-Out) |
| **Heading 2** | `18px` (1.125rem) | `24px` | 600 SemiBold | `0` | Card Headers, Tie-Out Names |
| **Body Standard**| `14px` (0.875rem) | `20px` | 400 Regular | `0` | Q&A Chat, Footnotes, Explanations |
| **Table Numeric**| `13px` (0.8125rem) | `18px` | 500 Medium | `0` (Tabular) | Dollar Amounts, Variances, Balances |
| **Micro Caption**| `11px` (0.6875rem) | `16px` | 500 Medium | `0.05em` | XBRL Tags, CIK Identifiers, Timestamps |

