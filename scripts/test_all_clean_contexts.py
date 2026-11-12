"""
Test clean consolidated context extraction across all 5 filings.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from bs4 import BeautifulSoup
import warnings
warnings.filterwarnings('ignore')

from backend.app.services.xbrl_service import TAG_FALLBACKS

cache_dir = Path("backend/data/cache/filings")

def parse_consolidated_contexts(soup):
    contexts = soup.find_all(lambda t: t.name and "context" in t.name.lower())
    clean_contexts = {}
    for c in contexts:
        cid = c.get("id")
        if not cid:
            continue
        # Exclude dimensional segments
        if c.find(lambda t: t.name and ("segment" in t.name.lower() or "explicitmember" in t.name.lower() or "scenario" in t.name.lower())):
            continue

        period = c.find(lambda t: t.name and "period" in t.name.lower())
        if not period:
            continue

        start_el = period.find(lambda t: t.name and "startdate" in t.name.lower())
        end_el = period.find(lambda t: t.name and "enddate" in t.name.lower())
        inst_el = period.find(lambda t: t.name and "instant" in t.name.lower())

        clean_contexts[cid] = {
            "start": start_el.text.strip() if start_el else None,
            "end": end_el.text.strip() if end_el else None,
            "instant": inst_el.text.strip() if inst_el else None
        }
    return clean_contexts

for f in cache_dir.glob("*.htm"):
    print(f"\n==================== {f.name} ====================")
    with open(f, "r", encoding="utf-8", errors="ignore") as fp:
        html = fp.read()
    soup = BeautifulSoup(html, "lxml")
    clean_ctx = parse_consolidated_contexts(soup)
    print(f"Consolidated contexts: {len(clean_ctx)}")
    
    # Try finding Revenues in consolidated contexts
    rev_tags = TAG_FALLBACKS["REVENUES"]
    found_rev = []
    for tag in soup.find_all(lambda t: t.name and "nonfraction" in t.name.lower()):
        name = tag.get("name", "")
        if any(name.endswith(r) for r in rev_tags):
            cid = tag.get("contextref")
            if cid in clean_ctx:
                scale = int(tag.get("scale", 0))
                val = float(tag.text.replace(",", "")) * (10 ** scale)
                ctx_info = clean_ctx[cid]
                period = ctx_info["end"] or ctx_info["instant"]
                found_rev.append((name, period, val))
    
    for r in found_rev[:5]:
        print(f"  {r[0]} | Period: {r[1]} | Val: ${r[2]:,.2f}")
