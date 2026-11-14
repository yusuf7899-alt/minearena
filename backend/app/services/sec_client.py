"""
SEC EDGAR API Client with Rate Limiting, User-Agent Compliance, and Local Disk Caching.
"""
import time
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import requests
from backend.app.config import settings

logger = logging.getLogger(__name__)

class RateLimiter:
    """Enforces maximum requests per second with polite throttling."""
    def __init__(self, max_rps: float = 5.0):
        self.interval = 1.0 / max(max_rps, 1.0)
        self.last_request_time = 0.0

    def wait(self):
        elapsed = time.time() - self.last_request_time
        if elapsed < self.interval:
            time.sleep(self.interval - elapsed)
        self.last_request_time = time.time()


class SECClient:
    """
    Client for SEC EDGAR Submissions, CompanyFacts, and Archives document access.
    Adheres strictly to SEC guidelines: User-Agent, max 5-8 RPS, and disk caching.
    """
    def __init__(
        self,
        user_agent: Optional[str] = None,
        max_rps: Optional[float] = None,
        cache_dir: Optional[Path] = None
    ):
        self.user_agent = user_agent or settings.SEC_USER_AGENT
        self.rate_limiter = RateLimiter(max_rps or settings.SEC_MAX_RPS)
        self.cache_dir = cache_dir or (settings.DATA_DIR / "cache")
        
        # Subdirectories for caching
        self.submissions_dir = self.cache_dir / "submissions"
        self.xbrl_dir = self.cache_dir / "xbrl"
        self.filings_dir = self.cache_dir / "filings"
        
        for d in [self.cache_dir, self.submissions_dir, self.xbrl_dir, self.filings_dir]:
            d.mkdir(parents=True, exist_ok=True)
            
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": self.user_agent,
            "Accept-Encoding": "gzip, deflate",
        })

    def _get(self, url: str, max_retries: int = 3) -> requests.Response:
        """Internal GET request wrapper with rate limiting and exponential backoff."""
        for attempt in range(max_retries):
            self.rate_limiter.wait()
            try:
                response = self.session.get(url, timeout=30)
                if response.status_code == 429:
                    wait_time = (2 ** attempt) + 1
                    logger.warning(f"SEC 429 Rate Limited on {url}. Backing off for {wait_time}s.")
                    time.sleep(wait_time)
                    continue
                if response.status_code == 404:
                    return response
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed to fetch {url} after {max_retries} attempts: {e}")
                    raise
                time.sleep(1 + attempt)
        raise RuntimeError(f"Unexpected termination fetching {url}")

    def get_company_tickers(self) -> Dict[str, Dict[str, Any]]:
        """
        Retrieves company ticker to CIK mapping from SEC or local cache.
        Returns dictionary keyed by uppercase ticker.
        """
        cache_file = self.cache_dir / "company_tickers.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading tickers cache, refetching: {e}")

        url = "https://www.sec.gov/files/company_tickers.json"
        res = self._get(url)
        raw_data = res.json()
        
        # Structure of SEC company_tickers: {"0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."}}
        ticker_map = {}
        for entry in raw_data.values():
            ticker = entry["ticker"].upper()
            cik = str(entry["cik_str"]).zfill(10)
            ticker_map[ticker] = {
                "ticker": ticker,
                "cik": cik,
                "title": entry.get("title", ticker)
            }

        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(ticker_map, f, indent=2)

        return ticker_map

    def get_cik_from_ticker(self, ticker: str) -> Optional[str]:
        """Resolves a ticker symbol to a 10-digit zero-padded CIK string."""
        ticker_upper = ticker.upper().strip()
        tickers = self.get_company_tickers()
        match = tickers.get(ticker_upper)
        return match["cik"] if match else None

    def get_submissions(self, cik: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetches entity submissions from data.sec.gov or local cache.
        """
        cik_padded = cik.zfill(10)
        cache_file = self.submissions_dir / f"{cik_padded}.json"
        
        if not force_refresh and cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)

        url = (
            f"{settings.SEC_BASE_URL.rstrip('/')}/submissions/CIK"
            f"{cik_padded}.json"
        )
        res = self._get(url)
        data = res.json()

        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        return data

    def find_latest_10k_filing(
        self, cik: str, fiscal_year: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Finds the definitive Form 10-K or 10-K/A for the requested company and fiscal year.
        Builds the direct primary document archive URL.
        """
        submissions = self.get_submissions(cik)
        recent = submissions.get("filings", {}).get("recent", {})
        
        forms = recent.get("form", [])
        accessions = recent.get("accessionNumber", [])
        filing_dates = recent.get("filingDate", [])
        report_dates = recent.get("reportDate", [])
        primary_docs = recent.get("primaryDocument", [])
        primary_descs = recent.get("primaryDocDescription", [])

        # Collect all eligible 10-K and 10-K/A candidates
        candidates = []
        sizes = recent.get("size", [0] * len(forms))

        for i in range(len(forms)):
            form_type = forms[i]
            if form_type not in ["10-K", "10-K/A"]:
                continue

            report_date = report_dates[i]
            rep_year = int(report_date.split("-")[0]) if report_date else None
            
            # If target fiscal_year is specified, verify match
            if fiscal_year is not None:
                if rep_year != fiscal_year and rep_year != (fiscal_year + 1):
                    continue

            acc_num = accessions[i]
            primary_doc = primary_docs[i]
            raw_cik = str(int(cik))
            acc_nodash = acc_num.replace("-", "")
            doc_url = (
                f"{settings.SEC_ARCHIVES_URL.rstrip('/')}/data/{raw_cik}/"
                f"{acc_nodash}/{primary_doc}"
            )
            doc_size = sizes[i] if i < len(sizes) else 0

            candidates.append({
                "cik": cik.zfill(10),
                "company_name": submissions.get("name", ""),
                "form": form_type,
                "accession_number": acc_num,
                "filing_date": filing_dates[i],
                "report_date": report_date,
                "primary_document": primary_doc,
                "primary_doc_description": primary_descs[i] if i < len(primary_descs) else "",
                "document_url": doc_url,
                "fiscal_year": rep_year or fiscal_year,
                "size": doc_size
            })

        if not candidates:
            return None

        # Sort candidates: prefer full 10-K with substantial size over small proxy 10-K/A wrap-ups
        def rank_filing(c):
            # If 10-K/A is under 500KB and a full 10-K exists, prefer the 10-K
            is_full_10k = 2 if c["form"] == "10-K" else (1 if c.get("size", 0) > 500_000 else 0)
            return (is_full_10k, c["filing_date"])

        candidates.sort(key=rank_filing, reverse=True)
        return candidates[0]

    def fetch_primary_document(
        self, cik: str, accession_number: str, primary_document: str, force_refresh: bool = False
    ) -> Path:
        """
        Downloads and caches the primary filing HTML/HTM document.
        Returns the absolute local file Path.
        """
        raw_cik = str(int(cik))
        acc_nodash = accession_number.replace("-", "")
        safe_name = f"{acc_nodash}_{Path(primary_document).name}"
        cache_path = self.filings_dir / safe_name

        if not force_refresh and cache_path.exists() and cache_path.stat().st_size > 0:
            return cache_path

        doc_url = (
            f"{settings.SEC_ARCHIVES_URL.rstrip('/')}/data/{raw_cik}/"
            f"{acc_nodash}/{primary_document}"
        )
        logger.info(f"Downloading primary 10-K document from {doc_url}")
        res = self._get(doc_url)

        with open(cache_path, "wb") as f:
            f.write(res.content)

        return cache_path

    def get_company_facts(self, cik: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Retrieves all XBRL facts for an entity in a single cached call.
        """
        cik_padded = cik.zfill(10)
        cache_file = self.xbrl_dir / f"{cik_padded}_facts.json"

        if not force_refresh and cache_file.exists():
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)

        url = (
            f"{settings.SEC_BASE_URL.rstrip('/')}/api/xbrl/companyfacts/"
            f"CIK{cik_padded}.json"
        )
        res = self._get(url)
        data = res.json()

        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f)

        return data

# Singleton default instance
sec_client = SECClient()
