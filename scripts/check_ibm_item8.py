"""
Check Item 8 in IBM 10-K.
"""
from pathlib import Path
import re

with open("backend/data/cache/filings/000005114326000010_ibm-20251231.htm", "r", encoding="utf-8", errors="ignore") as fp:
    content = fp.read()

m = re.search(r'Item\s+8[.:\s]', content, re.IGNORECASE)
if m:
    print("Found Item 8 at:", m.start())
    print("Context around Item 8:")
    print(content[m.start():m.start()+800])
else:
    print("Item 8 not found")
