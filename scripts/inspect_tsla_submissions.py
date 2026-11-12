"""
Inspect Tesla 10-Ks in submissions.
"""
import json

with open("backend/data/cache/submissions/0001318605.json") as fp:
    data = json.load(fp)

recent = data["filings"]["recent"]
for i, f in enumerate(recent["form"]):
    if "10-K" in f:
        print(f"{f} | {recent['filingDate'][i]} | {recent['reportDate'][i]} | {recent['accessionNumber'][i]} | {recent['primaryDocument'][i]} | {recent['primaryDocDescription'][i]}")
