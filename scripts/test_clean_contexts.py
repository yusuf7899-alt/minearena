"""
Demonstrate context parsing without segment dimensions for AAPL.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import re
import warnings
warnings.filterwarnings('ignore')

f = Path("backend/data/cache/filings/000032019325000079_aapl-20250927.htm")
with open(f, "r", encoding="utf-8", errors="ignore") as fp:
    html = fp.read()

soup = BeautifulSoup(html, "lxml")

# Build context map
contexts = soup.find_all(lambda t: t.name and "context" in t.name.lower())
print(f"Total contexts: {len(contexts)}")

clean_contexts = {} # id -> (start_date, end_date, instant_date)
for c in contexts:
    cid = c.get("id")
    # Check if context has segment dimensions
    segment = c.find(lambda t: t.name and ("segment" in t.name.lower() or "explicitmember" in t.name.lower()))
    if segment:
        # Dimensional / breakdown context (Products, Services, Geography, etc.)
        continue
    
    # Non-dimensional = Consolidated entity!
    period = c.find(lambda t: t.name and "period" in t.name.lower())
    if not period:
        continue
    
    start_el = period.find(lambda t: t.name and "startdate" in t.name.lower())
    end_el = period.find(lambda t: t.name and "enddate" in t.name.lower())
    inst_el = period.find(lambda t: t.name and "instant" in t.name.lower())
    
    start = start_el.text.strip() if start_el else None
    end = end_el.text.strip() if end_el else None
    inst = inst_el.text.strip() if inst_el else None
    
    clean_contexts[cid] = {
        "start": start,
        "end": end,
        "instant": inst
    }

print(f"Consolidated (non-dimensional) contexts: {len(clean_contexts)}")
for cid, p in list(clean_contexts.items())[:15]:
    print(f"  {cid}: duration={p['start']} to {p['end']} | instant={p['instant']}")

# Now search for Revenue in clean contexts only!
rev_tags = soup.find_all(lambda t: t.name and "nonfraction" in t.name.lower() and "RevenueFromContractWithCustomerExcludingAssessedTax" in t.get("name", ""))
print(f"\nRevenue tags in CONSOLIDATED contexts:")
for t in rev_tags:
    cid = t.get("contextref")
    if cid in clean_contexts:
        p = clean_contexts[cid]
        scale = int(t.get("scale", 0))
        val = float(t.text.replace(",", "")) * (10 ** scale)
        print(f"  Context {cid} ({p['start']} to {p['end']}): ${val:,.2f}")
