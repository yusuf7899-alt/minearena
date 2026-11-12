---
name: design-system-usage
description: Implementation guidelines for Moneta UI components, typography, CSS tokens, anti-slop rules, and financial number formatting.
---

# Design System Usage Skill

## Purpose
This skill ensures all user interfaces in Moneta adhere strictly to `DESIGN.md` and `docs/anti-slop.md`, maintaining institutional quality, high contrast, tabular alignment, and zero AI slop.

## Mandatory Styling Conventions

### 1. Typography Hierarchy
- **UI Elements & Controls:** Sans-serif (`Inter`, `system-ui`).
- **Financial Balances & Ledger Values:** Tabular Monospace (`'JetBrains Mono', 'Roboto Mono', monospace`).
  - Required CSS: `font-variant-numeric: tabular-nums lining-nums; text-align: right;`
- **Formal Report Headings:** Editorial Serif (`Newsreader`, `Georgia`).

### 2. Accounting Number Rules
- **Right Alignment:** Every numerical value in a table or ledger MUST be right-aligned (`text-right justify-end`).
- **Commas:** Thousands must be comma-separated (`12,450,000`).
- **Negative Balances:** Encased in parentheses: `(4,250,000)`, never `-4,250,000`.
- **Scale:** Explicitly declared in column headers or toggles (`$ in Millions`).

### 3. Color Tokens & Contrast (WCAG AA/AAA)
- **Base Canvas:** Deep Navy `#0B192C`, Slate Neutral Canvas `#F8FAFC`, Surface White `#FFFFFF`.
- **Accent:** Institutional Gold `#C5A880`.
- **Semantic Badges:**
  - `Pass / Balanced:` Emerald background `#ECFDF5`, border `#A7F3D0`, text `#065F46`.
  - `Warning / Review:` Amber background `#FFFBEB`, border `#FDE68A`, text `#92400E`.
  - `Fail / Out of Balance:` Rose background `#FFF1F2`, border `#FECDD3`, text `#9F1239`.
  - `Derived / Synthetic:` Indigo background `#EEF2FF`, border `#C7D2FE`, text `#3730A3`.

### 4. Anti-Slop Enforcement
- **PROHIBITED:** Purple-to-blue gradients, glowing neon orbs, heavy glassmorphism, emoji icons in UI, bouncy hover animations, generic 3-card marketing grids.
- **MANDATED:** Clean ledger tables, sharp vector icons (Lucide, 16px/20px, 1.5px stroke), subtle 150ms transitions, split-screen evidence viewers.

