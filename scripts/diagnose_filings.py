"""
Diagnostic script to inspect 10-K HTML contents for all 5 companies.
"""
from pathlib import Path
import re

cache_dir = Path("backend/data/cache/filings")
for f in cache_dir.glob("*.htm"):
    print(f"\n==================== {f.name} ====================")
    with open(f, "r", encoding="utf-8", errors="ignore") as fp:
        content = fp.read()
    
    print(f"Total size: {len(content):,} chars")
    # Search for nonFraction
    matches_ix = re.findall(r'<ix:nonfraction[^>]+>', content, re.IGNORECASE)
    print(f"ix:nonFraction regex count: {len(matches_ix)}")
    if matches_ix:
        print("Sample ix tag:", matches_ix[0][:150])
    
    # Search for table tags
    table_matches = re.findall(r'<table[^>]*>', content, re.IGNORECASE)
    print(f"HTML table tags count: {len(table_matches)}")
    
    # Search for revenue keywords
    for kw in ["Total revenue", "Revenues", "Net sales", "Revenue from Contract"]:
        m = re.search(re.escape(kw), content, re.IGNORECASE)
        print(f"Keyword '{kw}': {'FOUND at ' + str(m.start()) if m else 'NOT FOUND'}")

