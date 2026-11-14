"""
Check accession directory files for IBM.
"""
import requests
import re

headers = {'User-Agent': 'MonetaPreAudit team@moneta-audit.local'}
acc = '000005114326000010'
url = f'https://www.sec.gov/Archives/edgar/data/51143/{acc}/'
res = requests.get(url, headers=headers)
print("Directory listing status:", res.status_code)
files = re.findall(r'href=[\'"]([^\'"]+)[\'"]', res.text)
matching_files = [f for f in files if f.endswith('.htm') or f.endswith('.txt') or 'ex' in f.lower()]
print("Matching files:", matching_files)

