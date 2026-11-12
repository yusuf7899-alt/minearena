# Human-in-the-Loop Financial Filing Auditor Agent – Architecture and Workflow

We propose an **agentic** architecture that automates 10-K retrieval, metric extraction, validation, and (if needed) human review.  At a high level, the agent pipeline looks like this:

- **Filing Retrieval:** The agent uses SEC EDGAR APIs (or index files) to download a company’s 10-K (most recent annual report).  It first obtains the company’s CIK (via SEC ticker lookup file or prior knowledge) and then calls the Submissions API (`https://data.sec.gov/submissions/CIK{CIK}.json`) to find the latest 10-K accession.  It then constructs the EDGAR Archives URL (of the form `https://www.sec.gov/Archives/edgar/data/{CIK}/{ACCESSION}/{file}` with dashes removed) to fetch the actual report (HTML or text, or PDF if needed).  All SEC queries include a descriptive **User-Agent** header (e.g. `"TeamName contact@example.com"`) and obey the SEC rate limit (max **10 requests/second**).

- **Data Extraction:** The agent parses the retrieved 10-K using deterministic methods first.  For example, if the filing is HTML, it can use an HTML parser or tables (via `pandas.read_html`) to locate lines or cells containing keywords like “Revenue”, “Net Income”, “Total Assets”, etc.  If it is PDF, libraries like **pdfplumber** or **PyMuPDF** extract text and tables, and simple regex/heuristics locate numeric values.  For each required metric (e.g. **Revenue**, **Net Income**, **Total Assets**, **Total Liabilities**, **Stockholders’ Equity**, **Operating Cash Flow**, plus two others such as *Gross Profit* and *Operating Income*), the agent finds the reported value, its unit (e.g. USD) and period.  As an example, Python code might use:  

  ```python
  text = "\n".join(page.extract_text() for page in pdf.pages)  # pdfplumber 
  m = re.search(r'REVENUE[s]*[:\s]\$?([\d,]+)', text)
  revenue = int(m.group(1).replace(',', '')) if m else None
  snippet = extract_context(text, m.start(), window=50)  # get surrounding text
  ```  

  If straightforward extraction fails or is ambiguous, an LLM/table parser can be used as a **fallback**: e.g. feed the agent the table text and ask it to identify the number.  Throughout, we record a *source snippet* (the portion of the 10-K text or table containing the number) to show to the reviewer later (helping “ground” the value in evidence).

- **XBRL Ground Truth:** In parallel, the agent calls the SEC XBRL APIs to get ground-truth values.  For the same CIK, it queries `https://data.sec.gov/api/xbrl/companyconcept/CIK{CIK}/us-gaap/{Concept}.json` for each concept (e.g. “Revenues”, “NetIncomeLoss”, “Assets”, etc.).  The JSON includes all historical facts with contexts and units.  For example, Apple’s 2018 revenues appear as `{"tag":"Revenues","units":{"USD":[{"frame":"CY2018","val":265595000000, ...}]}}`.  The agent matches the filing’s fiscal year (or date range) to the “frame” in the JSON to pick the right value, and compares units (e.g. USD vs USD).  Small scaling or rounding differences are allowed (we calibrate tolerances, e.g. ±0.1%).  Concept-to-tag mapping is guided by the US-GAAP taxonomy: common tags include `Revenues`, `NetIncomeLoss`, `Assets`, `Liabilities`, `StockholdersEquity`, `OperatingIncomeLoss`, and `CashAndCashEquivalentsAtCarryingValue`.  Since XBRL taxonomies define these concepts and their dimensions, the agent can use them to verify extracted values and compute extraction accuracy against ground truth.

- **Confidence Scoring:** Each extracted value is assigned a confidence score (0–1).  This score is based on how the value was obtained and on validation signals.  For example, an exact regex match on a clearly labeled line might get a very high score (e.g. 0.99), while a value inferred by an LLM gets a lower score (e.g. 0.6–0.7).  Further, if a validation check fails (see next section) or the value is anomalous year-on-year, the score is reduced.  The scoring model is *explainable*: it considers the text evidence, field type, and extraction method.  We calibrate thresholds (e.g. anything below 0.8 is “low confidence”) by testing on sample filings.  In practice this follows Microsoft’s advice that a confidence score is a *separate model* output that reflects likelihood of correctness, not just LLM self-confidence.

- **Validation Rules:** After extraction, the agent runs rule-based checks:  

  - **Accounting Equation:** Verify **Assets = Liabilities + Equity** (balance-sheet consistency).  Any violation above a tiny tolerance flags a problem.  
  - **Segment Totals:** If the filing discloses operating segments (under US GAAP or IFRS 8), sum the segment revenues/profits and compare to the consolidated total.  A large mismatch signals an error.  
  - **YoY Anomalies:** Compare each metric to the prior year (from XBRL or previous filing); if the percentage change exceeds a threshold (e.g. ±30%), flag it as unusual.  
  - **Sanity Checks:** e.g. net income should not exceed revenue, values should not be negative where impossible, etc.  

  All checks mark pass/fail for each metric.  For example, if Assets ≠ Liabilities+Equity, or if segment sums differ by >5%, the metric is flagged.  

- **Auto-Decision vs. Escalation:** The agent uses the confidence score and validation results to decide what to do automatically.  High-confidence values that pass all checks are auto-approved.  Low-confidence or failed-check values are **escalated**: the agent *pauses* and creates a review task.  LangGraph’s `interrupt()` is invoked with a payload containing the metric name, extracted value, confidence, snippet and reason for flag.  This saves the graph state via a persistent **checkpointer** and waits for human input.

- **Human Review:** A reviewer sees a dashboard (Streamlit or React UI) listing the flagged metrics.  For each, the UI shows the extracted number, its context snippet from the 10-K, the confidence score, and any failed rule.  As Microsoft’s blog notes, this “grounding” (evidence) is shown so the reviewer need not search the document.  The reviewer can then **approve**, **edit**, or **reject** the value.  On edit, they type the correct number.  The agent collects the decision in an append-only audit log (see below) and then resumes.

- **Resume and Audit:** After the reviewer decision is submitted, the agent is resumed with a `Command(resume=…)` carrying the (possibly corrected) value.  LangGraph re-invokes the interrupted node, which now returns the human-approved value.  Crucially, prior steps are *not* repeated (LangGraph’s checkpointing ensures completed steps aren’t re-run).  This avoids duplicate side effects.  Every human action (approve/edit/reject) is logged with timestamp, original vs final value, and user identity, ensuring a complete audit trail.

- **Final Verification:** Once all metrics are finalized, the agent compares them to the XBRL CompanyFacts values to compute accuracy.  A report shows how many values matched the ground truth and how many needed correction.  We also report how many were auto-approved vs escalated, and the precision of escalations (fraction that truly were wrong).  

**Key References:** SEC EDGAR’s public APIs and policies are used for filings and XBRL.  LangGraph (LangChain) interrupts and checkpointers enable the pause/resume human-in-loop workflow.  The MS Foundry blog on confidence shows the importance of grounding and calibrated scores.

## SEC EDGAR & XBRL Integration

- **CIK/Ticker Mapping:** We use SEC’s official `company_tickers.json` file (from sec.gov) or `ticker.txt` to map stock tickers to CIKs.  This gives the zero-padded CIK (e.g. “0000320193” for Apple).

- **Submissions API:** Query `https://data.sec.gov/submissions/CIK{CIK}.json` to get company metadata and filing history.  The JSON includes the form types and accession numbers for recent filings.  We filter for the latest 10-K (Form 10-K or 10-K/A) and take its accession (removing dashes) to build the document URL.  The SEC documentation specifies that no API key is needed, but the User-Agent must be declared, and the rate limit is 10 rps.

- **Retrieving the 10-K Document:** With accession number `A=0000320193-26-000111` (example), we form the URL `https://www.sec.gov/Archives/edgar/data/320193/000032019326000111/0000320193-26-000111.txt` (or `.htm` or PDF if available).  The archives often have an index HTML and separate files.  We fetch the complete submission text or the interactive HTML.  Many modern 10-Ks include **Inline XBRL** (iXBRL), but for extraction we parse the rendered HTML or text.

- **SEC XBRL APIs:** We retrieve facts via the SEC EDGAR XBRL endpoints:  
  - **CompanyFacts:** `https://data.sec.gov/api/xbrl/companyfacts/CIK{CIK}.json` returns all reported XBRL data for a company.  
  - **CompanyConcept:** `https://data.sec.gov/api/xbrl/companyconcept/CIK{CIK}/{taxonomy}/{tag}.json` returns historical values for a specific concept (e.g. `us-gaap/Revenues.json`).  
  We use these APIs for ground-truth: e.g. for each metric tag, we get the latest FY value.  (Common GAAP tags include `Revenues`, `NetIncomeLoss`, `Assets`, `Liabilities`, `StockholdersEquity`, `OperatingIncomeLoss`, `CashAndCashEquivalentsAtCarryingValue`, etc.) The JSON facts include details like entity, unit, period, and the numeric value.  For instance, Apple’s companyconcept for Revenues shows FY2018’s $265,595,000,000 (frame CY2018).

- **EDGAR Rate Limits & Policy:** The SEC requires prudent access.  We obey the **10 requests/second** limit.  Each request must have a custom User-Agent (e.g. “OurHackathonTeam contact@domain.com”).  There is no API key required for these open endpoints.  SEC guidelines (webmaster FAQ) also allow bulk downloads via EDGAR index files if needed, but for 5 companies the direct API approach is fine.

- **Data Formats & Taxonomies:** 10-K filings on EDGAR appear as HTML or text.  The XBRL data follows the SEC’s EDGAR XBRL taxonomies (us-gaap and others).  Key concepts are defined in the taxonomy (with English labels and references).  Each numeric fact has a context (a period, which can be a duration or an instant) and a unit. For example, annual (duration) facts use periods like `"CY2023"` and instantaneous facts (e.g. balance sheet date) use `"CY2023-12-31"` or a format with `Q#I` as described in SEC docs.  We ensure that when we compare our extracted value to the XBRL ground truth, we match the same context and unit (most filings use USD currency, see the “units” field in JSON).  

- **Dimensions & Segments:** Some filings use dimensions (e.g. segment revenues per geographic segment).  If the 10-K has segment tables, the XBRL facts may have a “SegmentAxis” with values for each segment.  For validation, we sum over these to check totals (see Validation below).  We will not implement a full dimensional analysis (too complex for 24h) but will leverage totals given in the main statements.

- **Amendments:** If a 10-K/A amendment exists, we treat it as the definitive filing.  The Submissions JSON shows multiple entries (10-K and 10-K/A).  We pick the one with the latest `filed` date or largest accession.  The XBRL APIs for CompanyConcept reflect the corrected values (the CompanyFacts might list both original and amended under different accession entries).

## Extraction of Metrics

We extract **at least 8 metrics** (6 required + extras) using a mix of deterministic parsing and LLM assistance:

- **Core metrics (examples):**  
  - *Revenue:* e.g. GAAP tag `Revenues`.  
  - *Net Income:* `NetIncomeLoss`.  
  - *Total Assets:* `Assets`.  
  - *Total Liabilities:* `Liabilities`.  
  - *Shareholders’ Equity:* `StockholdersEquity` (or `StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest`).  
  - *Operating Cash Flow:* Typically `NetCashProvidedByUsedInOperatingActivities`.  

  Extra metrics could include *Gross Profit* (`GrossProfit`), *Operating Income* (`OperatingIncomeLoss`), *Cash & Equivalents* (`CashAndCashEquivalentsAtCarryingValue`), etc.  We choose metrics that reliably appear in 10-Ks and in XBRL.

- **Deterministic parsing:** Using the downloaded 10-K, we first try rule-based methods. For HTML filings, we can use `pandas.read_html` or BeautifulSoup to target known tables like “Consolidated Statements of Income” or “Balance Sheets.”  For example, find the row labeled “Revenue” or “Net sales” and parse the number in the FY column.  In PDFs, libraries like **pdfplumber** can extract text lines or tables.  We use regex or string matching to find lines containing our metric name (case-insensitive, with synonyms).  For instance, the regex `r'^(Revenues|Total Revenue|Net Sales)[^\d]*([\d,]+)'` might capture a revenue line.  We then clean the number (remove commas, parentheses) and convert to float.  Throughout, we capture the **source snippet** (the text around the found number) so the reviewer sees exactly where it came from.

- **LLM/Table fallback:** If the heuristic fails (e.g. table layout is unusual), we call an LLM (via LangChain) to interpret the section.  For instance, we could prompt: *“Given this table text from the 10-K, what is the total revenue for the year ending YYYY?”* and parse the answer.  We treat any LLM-derived value with caution (lower initial confidence).  We document which method found the number (regex vs. LLM) to inform scoring.  Optional libraries like **table-parser** or **Camelot** could also help parse complex PDF tables if needed.

- **Source Evidence:** For each metric, we store its **proof snippet** (text or table HTML).  In the UI, this snippet is displayed.  This follows the principle of “grounding” each extraction in the original text so reviewers can verify it quickly.

## Ground-Truth Mapping & Accuracy

We verify our extractions against SEC XBRL **CompanyFacts**:

- **Concept Matching:** For each metric extracted, we identify the corresponding XBRL concept tag (from US GAAP taxonomy). For example, if our script says “Revenue = X”, we look up the tag `Revenues` (or sometimes `SalesRevenueGoodsNet` if used).  We fetch `data.sec.gov/api/xbrl/companyconcept/CIK{CIK}/us-gaap/{Tag}.json` and find the fact whose period matches the 10-K.  (For annual filings, we match the calendar year or fiscal year context – e.g. Apple’s FY2023 is frame CY2023 in JSON.)  

- **Value Comparison:** The XBRL facts include a “val” (value), unit, and context dates.  We compare our extracted number to the XBRL `val`.  Careful: XBRL often reports raw dollars (no scale), whereas reports may present millions (and sometimes omit zeros).  We scale accordingly (if needed) and use a tolerance (e.g. within ±0.1%) to account for formatting differences.  We also check sign conventions (XBRL might use negative numbers for losses, etc.).  

- **Handling Missing/Alternate Concepts:** Sometimes the obvious tag (e.g. `Revenues`) isn’t present or is 0 because the company used a different concept.  In that case, we may search related tags (like `SalesRevenueGoodsNet`).  This mapping is partly manual but can be codified by consulting the taxonomy or common practice.  If no suitable concept is found, we note it as unmapped (and will rely on manual decision/logging).

- **Accuracy Report:** We compute extraction accuracy as (num correctly extracted values)/(total metrics).  We also report how many values were auto-approved vs. escalated.  Comparing against ground truth helps calibrate our extraction logic: e.g. if we see systematic undercount, we adjust.

## Confidence Scoring

We assign a **confidence score (0–1)** to each extracted value:

- **Basis of Score:**  We consider the extraction method and any anomalies.  A high-confidence example is a clear regex match with consistent formatting.  A lower-confidence case might involve fuzzy matching, LLM parsing, or conflict between text and table sources.  We also incorporate our validation checks: any rule failure lowers confidence.

- **Explainability:** For transparency, we record why a score is low.  For example, *“Low confidence: extraction used fuzzy LLM parser”* or *“Warning: 45% YoY change”*.  This follows Microsoft’s recommendation to tie the score to evidence and field context.

- **Calibration:** Initially we set heuristic scores (e.g. 0.95 for exact parse, 0.6 for LLM-assisted) and adjust them after a small calibration on known filings.  Ultimately, the score is meant as a *risk ranking* (higher score = more likely correct).  In practice, we’ll say scores ≥0.80 are “auto-approved” unless a hard rule fails, and <0.80 are escalated.

## Validation Rules

We implement the mandatory checks:

- **Accounting Equation:** Check if *Total Assets ≈ Total Liabilities + Equity*.  If `|Assets – (Liabilities+Equity)| > ε` (say ε = 0.5% of Assets), we flag both sides as inconsistent.  

- **Segment Totals:** If the 10-K has segment disclosures (e.g. “Total segment revenues”), sum the segment figures and compare to consolidated revenue.  A large discrepancy (beyond rounding) triggers a flag.  

- **YoY Variance:** Compute percentage change for each metric from prior year (from XBRL or previous 10-K).  If the change exceeds a threshold (configurable, e.g. ±30%), flag it.  This catches unusual swings (which could be errors or real anomalies).  

- **Other Checks:** For completeness, we might check that Operating Cash Flow isn’t absurdly larger than Net Income, or that profits aren’t negative when revenue is positive, etc.  

Each check yields a pass/fail.  In the reviewer UI, any failed check is listed as a reason for concern.  

## Human Review Interface

We provide a reviewer dashboard (e.g. Streamlit) that shows **flagged** metrics one by one:

- **Context Display:** For a flagged metric, the UI shows: company name, filing year, metric name, extracted value, confidence score, and the text snippet (or table snippet) from the original 10-K with the number highlighted.  This lets the reviewer verify the extraction in context.

- **Decision Controls:** The reviewer has three options: **Approve** (keep the extracted value), **Edit** (enter a corrected value), or **Reject** (mark as invalid).  Approve simply confirms it.  Edit enables an input box for the new number (or unit adjustment).  Reject might mean “this metric does not exist/is not applicable”; we then mark it as such (but still log it).

- **Workflow with LangGraph:** Under the hood, our LangGraph agent paused at an `interrupt()` call with payload like `{"metric": name, "value": X, "source": snippet}`.  When the reviewer makes a decision, the backend sends a `Command(resume={…})` back into the agent.  Per LangGraph semantics, this returns the provided value to the node after `interrupt()` and lets the agent continue.  Since the agent had check-pointed, no prior node is re-run (ensuring **idempotency**).  We must ensure any actions *before* the interrupt are idempotent (e.g. not double-writing logs).

- **Audit Logging:** Every reviewer action is appended to an audit log (database table) with fields: company, filing, metric, original value, user action (approve/edit/reject), new value (if edited), and timestamp.  This log is append-only (no edits).  It provides full traceability of human decisions for judges.

## Workflow Persistence (LangGraph Interrupts & Checkpoints)

We implement durable pause/resume using LangChain’s LangGraph:

- **Interrupts:** In our graph, when a metric needs review (low confidence or validation failed), we call `interrupt()` with a JSON payload.  This halts the graph, saves state, and emits the payload for the UI.  LangGraph then waits indefinitely.  (See documentation: “interrupts allow you to pause graph execution at specific points and wait for external input”.)

- **Checkpointers:** We configure a persistent checkpointer (e.g. SQLite or LangChain’s default) so that the graph state is saved.  Each run uses a `thread_id` to identify the session.  On resuming, we supply the same `thread_id` and a `Command(resume=...)` containing the reviewer’s input.  LangGraph loads the checkpoint and continues.  Because of checkpointing, **completed steps are not repeated**.  For example, data already fetched and stored will not be fetched again on resume.

- **Idempotency:** We take care that any side-effects (e.g. writing to DB) occur either after `interrupt()` or are idempotent.  (As LangGraph docs warn, “side effects called before `interrupt` should ideally be idempotent”.)  For instance, we might only write audit-log entries after the interrupt point, or use upsert operations.  This ensures that if the graph node is re-run on resume, it does not duplicate work or writes.

- **Audit Events:** Besides reviewer logs, we also log automatic decisions (e.g. “Auto-approved Revenue for 2023”) and validation results.  All events (auto or manual) go into a state table so the process can be audited end-to-end.

## Backend, Frontend, and Data Design

- **Backend (FastAPI):** We implement REST endpoints for key operations: e.g. `GET /companies` (list companies/CIKs), `GET /filings/{CIK}` (latest 10-K info), `GET /metrics/{filing_id}` (extracted metrics and confidence), `GET /review/next` (next flagged metric), and `POST /review/decision` to submit an approval/edit/reject.  The FastAPI server orchestrates the LangGraph agent and communicates with the frontend via WebSockets or long-polling.  It also interacts with the database and SEC APIs.

- **Frontend (Streamlit or React):** The UI polls `GET /review/next` and displays the payload (company, metric, value, snippet, confidence).  It offers buttons and input box for decision.  On submit, it calls `POST /review/decision` with `{metric_id, decision, corrected_value?}`.  The UI also has views for summary (e.g. list of all extracted metrics with status) and final accuracy report.

- **Database Schema:** We use SQLite or PostgreSQL.  A sample schema:  

  ```sql
  companies (id, ticker, cik, name);
  filings  (id, company_id, accession, date_filed);
  metrics  (id, filing_id, concept, value_extracted, unit, period_start, period_end, confidence, status);
  audit_log(id, metric_id, original_value, new_value, decision, reviewer, timestamp);
  ```

  - *companies* maps tickers to CIKs.  
  - *filings* records each downloaded 10-K.  
  - *metrics* stores all extracted values (including those auto-approved or flagged), their confidence and whether they passed validation.  
  - *audit_log* is append-only, storing every human decision.  

- **API Contracts:**  These are straightforward JSON REST APIs.  For example, a decision POST might accept `{"metric_id":123, "decision":"approve"}` or `{"metric_id":123,"decision":"edit","new_value":99.5}`.  The server then calls `Command(resume={"value":99.5,"action":"approve"})` into the LangGraph run.  

- **Integration with LangGraph:** The FastAPI handlers interact with the LangGraph runtime.  On `interrupt`, LangGraph emits an event (stream) captured by the server, which in turn pushes it to the UI.  On resume, we use LangGraph’s Python `Command` API.  Configuration includes setting a persistent thread_id, e.g. the filing CIK or company name, so re-invocations continue the same session.

## Security, Reliability, and Testing

- **SEC Compliance:** All calls to SEC use HTTPS and a proper User-Agent.  We do not attempt to scrape beyond permitted APIs or use botnets.  

- **Data Integrity:** The system treats EDGAR data as public.  Nevertheless, we validate inputs carefully (e.g. parse numbers safely) to avoid injection.  The reviewer input is sanitized before writing to the database.  We do not expose any sensitive data (the filings are public; reviewer data is minimal).

- **Fault Tolerance:** LangGraph’s checkpointing offers fault recovery.  If any node in the graph fails (e.g. a parsing error), we can resume from the last super-step without losing all progress.  We also use try/except around SEC calls (with back-off if rate-limited).  

- **Concurrency:** SQLite allows only one write at a time.  Since our workflow is mostly sequential per filing, this is acceptable for a hackathon demo.  We could switch to PostgreSQL if needed.  

- **Testing:** We will unit-test key components: SEC API retrieval (mocking SEC with example JSON), metric extraction on sample filings, validation logic (using known balance-sheet equations).  We will also end-to-end test the LangGraph workflow: simulate an interrupt, feed in a `Command`, and verify the agent resumes correctly.  For front-end, we’ll test that flagged metrics appear and decisions correctly update the audit log.  

- **Evaluation Metrics:** In demo, we’ll report (1) *Extraction Accuracy* vs XBRL (e.g. 95% of values match within tolerance), (2) *Auto-approve vs Escalation Rate*, and (3) *Escalation Precision* (fraction of flagged cases that were indeed incorrect).  We’ll aim for a low false-alarm rate (so reviewer work is focused on real issues) and high overall accuracy.  

- **Failure Modes & Mitigation:** Common issues include missing data (e.g. if a concept isn’t found in XBRL or 10-K), format changes (tables that confuse regex), and rate-limit errors.  We mitigate by fallback strategies (e.g. if `Revenues` tag not found, try synonyms), and by caching EDGAR lookups.  Any unrecoverable error for a metric will simply escalate it (so the human can handle it).  We also log all exceptions for later debugging.

## Implementation Plan & Team Tasks (24h Hackathon)

A realistic timeline for a 4–5 person team over 24 hours might be:

1. **Hour 1–3:** *Kickoff & Data Sources* – Identify 3–5 target companies (e.g. AAPL, MSFT, GOOG, IBM, TSLA). Retrieve their CIKs (using SEC’s ticker file). Test retrieval of one 10-K via the Submissions API and Archives URL. Parallel: fetch CompanyFacts JSON for one company to inspect structure.

2. **Hour 3–6:** *Extraction Prototype* – Write scripts to download a 10-K (HTML or PDF). Implement simple regex/heuristic extraction for “Revenue” and “Net Income.” Print values and source snippets. Validate via a quick compare to CompanyFacts (to check if approach works). Add data structures to hold metrics and snippets.

3. **Hour 6–8:** *Additional Metrics & Parsing* – Extend extraction to the other required metrics (Assets, Liabilities, Equity, Cash Flow, plus 2 more). Handle number formatting and negatives. If HTML tables are used, adjust for column indices. If difficulties arise, try pdfplumber or an LLM fallback to parse. 

4. **Hour 8–10:** *Ground Truth & Accuracy* – Integrate SEC XBRL calls. For each extracted metric, fetch the CompanyConcept JSON and compare. Log mismatches to refine extraction rules (e.g. scaling issues). Compute initial accuracy (auto in code). 

5. **Hour 10–12:** *Validation Rules* – Code the accounting-equation check and YoY change check. For segment totals, see if any 10-K has segments, and implement a sum. Flag any failures. Display validation status.

   *Lunch break ~ Hour 12–13*

6. **Hour 13–15:** *Confidence & Decision Logic* – Implement the confidence scoring heuristics. Decide on numeric thresholds. Write logic: if score ≥0.8 and all checks passed, auto-approve (mark metric done); else prepare for interrupt. Test by simulating thresholds and confirm correct routing.

7. **Hour 15–17:** *LangGraph Setup* – Build the LangGraph workflow: nodes for fetch, extract, validate, decide, finalize. Insert `interrupt()` at decision nodes. Configure a checkpointer (using SQLite or LangChain’s default). Test with a single company run to ensure the graph pauses and can resume. Use `Command(resume=…)` manually to simulate a review.

8. **Hour 17–19:** *Frontend & API* – Set up a FastAPI backend and Streamlit (or simple React) UI. Connect the interrupt output to the UI. For a paused metric, the API should serve the payload to the browser, and post back the user’s choice. Implement the audit-log writes. Test the round-trip (pause on low confidence, make a decision, see agent resume).

9. **Hour 19–21:** *Database & Final Integration* – Finalize the database schema (companies, filings, metrics, audit log) and integrate with code. Ensure that on each run we record values and user decisions persistently. Implement endpoint to generate the final accuracy report (using CompanyFacts for ground truth).

10. **Hour 21–23:** *Testing & Polish* – Test the full pipeline on all chosen companies. Fix any bugs (e.g. timeouts, parsing exceptions). Add logging. Prepare demo script and slides. Ensure the app can run end-to-end smoothly with sample input.

11. **Hour 23–24:** *Fallbacks and Buffer* – If short on time, prioritize core features (extraction, interrupts, logging). Potential fallback: skip full UI polish and use console input for approval, or limit to fewer metrics. If ahead, add LLM-powered extraction as bonus, or multi-year variance analysis.

By hour 24 we should have a working end-to-end demo: the agent fetching filings for a few companies, extracting metrics, auto-approving or pausing on low-confidence, allowing the reviewer to make corrections, and producing an accuracy report comparing to XBRL. 

Each team member can specialize (e.g. one on SEC API, one on extraction/parsing, one on validation/confidence, one on UI/Graph), with overlaps for integration.  Daily checkpoints ensure all pieces fit together.

## Key Libraries & Sample Code Snippets

- **SEC Data Retrieval:** We use Python’s `requests` with proper headers.  
  ```python
  HEADERS = {"User-Agent": "HackathonTeam email@domain.com"}
  cik = "0000320193"  # Apple example
  sub_url = f"https://data.sec.gov/submissions/CIK{cik}.json"
  res = requests.get(sub_url, headers=HEADERS)
  filings = res.json()["filings"]["recent"]
  # find latest 10-K accession
  idx = [i for i,f in enumerate(filings["form"]) if f == "10-K"][0]
  acc = filings["accessionNumber"][idx].replace("-", "")
  ```

- **Parsing PDF (pdfplumber):**  
  ```python
  import pdfplumber, re
  pdf = pdfplumber.open("10-K.pdf")
  full_text = "\n".join(p.extract_text() for p in pdf.pages)
  # Extract, e.g., Net Income
  m = re.search(r'NET INCOME\s*([\d,]+)', full_text, re.IGNORECASE)
  net_income = int(m.group(1).replace(",", "")) if m else None
  snippet = full_text[m.start():m.end()] if m else ""
  ```

- **LangGraph Interrupt/Resume:**  
  ```python
  from langgraph.types import interrupt, Command
  def review_node(state):
      metric = state["pending_metric"]
      if state["confidence"][metric] < 0.8 or not state["validation"][metric]:
          # Pause and send to reviewer
          res = interrupt({"metric": metric, "value": state["metrics"][metric], 
                           "snippet": state["evidence"][metric], "reason": state["validation"][metric]})
          # On resume, we get the new value back
          state["metrics"][metric] = res["new_value"]
          state["audit_log"].append(res)
      return state
  ```

- **Database Models (SQLAlchemy example):**  
  ```python
  class AuditLog(Base):
      __tablename__ = "audit_log"
      id = Column(Integer, primary_key=True)
      filing_id = Column(Integer, ForeignKey("filings.id"))
      metric = Column(String)
      original_value = Column(Float)
      new_value = Column(Float, nullable=True)
      decision = Column(String)   # e.g. 'approve', 'edit', 'reject'
      timestamp = Column(DateTime, default=datetime.utcnow)
  ```

- **Frontend Interaction (pseudo-Streamlit):**  
  ```python
  # Display snippet and buttons
  st.write(f"**Company:** {company}   **Metric:** {metric}   **Value:** {value}   **Conf:** {conf:.2f}")
  st.write(f"**Source snippet:** {snippet}")
  decision = st.radio("Decision", ["approve", "edit", "reject"])
  new_val = None
  if decision == "edit":
      new_val = st.number_input("Corrected value", value=float(value))
  if st.button("Submit"):
      requests.post("/review/decision", json={"metric_id": mid, "decision": decision, "new_value": new_val})
  ```

All code would be organized in a runnable project: a Python/Streamlit app with FastAPI backend, a LangGraph graph definition, and a SQLite database.  Dependencies include `requests`, `pdfplumber`, `langchain`, `fastapi`, and `streamlit` (or `react` with NodeJS, though Streamlit is quicker).  

**Sources:** SEC EDGAR API docs and webmaster FAQs; SEC XBRL Guide; LangGraph interrupts/checkpointer docs; Microsoft Foundry blog on confidence/grounding.