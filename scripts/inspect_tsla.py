"""
Inspect Tesla 10-K/A table structure and keywords.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import re

tsla_path = Path("backend/data/cache/filings/000110465926053166_tm2611837d1_10ka.htm")
with open(tsla_path, "r", encoding="utf-8", errors="ignore") as fp:
    html = fp.read()

soup = BeautifulSoup(html, "lxml")
tables = soup.find_all("table")
print(f"Total tables in Tesla: {len(tables)}")

# Search for statements
for idx, tbl in enumerate(tables):
    txt = tbl.get_text()
    if any(k in txt.lower() for k in ["total revenues", "net income", "total assets", "operating activities"]):
        print(f"\n--- Tesla Table {idx} --- (len {len(txt)})")
        for r in tbl.find_all("tr")[:8]:
            row_vals = [td.get_text(strip=True) for td in r.find_all(["td", "th"]) if td.get_text(strip=True)]
            if row_vals:
                print("  ", row_vals[:5])
