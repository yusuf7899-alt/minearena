"""
Inspect SEC-generated R*.htm files for IBM.
"""
import requests
from bs4 import BeautifulSoup

headers = {'User-Agent': 'MonetaPreAudit team@moneta-audit.local'}
acc = '000005114326000010'

for r_name in ['R1.htm', 'R2.htm', 'R3.htm', 'R4.htm', 'R5.htm', 'R6.htm']:
    url = f'https://www.sec.gov/Archives/edgar/data/51143/{acc}/{r_name}'
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        soup = BeautifulSoup(res.text, 'lxml')
        title = soup.find('th', class_='tl') or soup.find('title')
        title_text = title.get_text(strip=True) if title else "No title"
        print(f"{r_name} (Status 200) -> Title: {title_text}")
        # Print first few rows
        rows = soup.find_all('tr')[:4]
        for r in rows:
            print("   Row:", [c.get_text(strip=True) for c in r.find_all(['td', 'th']) if c.get_text(strip=True)])

