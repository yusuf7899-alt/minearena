"""
Tests for SEC EDGAR Client, Rate Limiter, and CIK Mapping.
"""
from backend.app.services.sec_client import SECClient, RateLimiter
import time

def test_rate_limiter():
    limiter = RateLimiter(max_rps=10.0)  # 100ms interval
    start = time.time()
    for _ in range(3):
        limiter.wait()
    elapsed = time.time() - start
    assert elapsed >= 0.15  # At least 2 intervals

def test_get_cik_from_ticker():
    client = SECClient()
    # Test ticker resolution
    aapl_cik = client.get_cik_from_ticker("AAPL")
    assert aapl_cik is not None
    assert aapl_cik.endswith("320193")
    assert len(aapl_cik) == 10

    msft_cik = client.get_cik_from_ticker("MSFT")
    assert msft_cik is not None
    assert msft_cik.endswith("789019")

    tsla_cik = client.get_cik_from_ticker("TSLA")
    assert tsla_cik is not None
    assert tsla_cik.endswith("1318605")

