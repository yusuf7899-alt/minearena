"""
Inspect contextRef in AAPL iXBRL and tables in TSLA.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import re

# 1. AAPL contextRef inspection
aapl_path = Path("backend/data/cache/filings/000032019325000079_aapl-20250927.htm")
with open(aapl_path, "r", encoding="utf-8", errors="ignore") as fp:
    html = fp.read()

soup = BeautifulSoup(html, "lxml")

# Let's see all context elements or tags for Revenue
rev_tags = soup.find_all(lambda t: t.name and "nonfraction" in t.name.lower() and "revenue" in t.get("name", "").lower())
print(f"Total Revenue nonFraction tags in AAPL: {len(rev_tags)}")
for t in rev_tags:
    print("TAG:", t.get("name"), "val:", t.text.strip(), "scale:", t.get("scale"), "context:", t.get("contextref"))

# Also inspect context definitions in AAPL
contexts = soup.find_all(lambda t: t.name and "context" in t.name.lower())
print(f"Total contexts in AAPL: {len(contexts)}")
ctx_map = {}
for c in contexts[:20]:
    cid = c.get("id")
    period = c.find(lambda t: t.name and "period" in t.name.lower())
    p_text = period.get_text(strip=True) if period else ""
    ctx_map[cid] = p_text
    print(f"Context {cid}: {p_text}")
