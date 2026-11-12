"""
Benchmark companies registry endpoint.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Company
from backend.app.schemas import CompanyResponse

router = APIRouter(prefix="/api/companies", tags=["Companies"])

BENCHMARK_COMPANIES = [
    {"ticker": "AAPL", "cik": "0000320193", "name": "Apple Inc.", "sic": "3571", "fiscal_year_end": "0930"},
    {"ticker": "MSFT", "cik": "0000789019", "name": "Microsoft Corporation", "sic": "7372", "fiscal_year_end": "0630"},
    {"ticker": "TSLA", "cik": "0001318605", "name": "Tesla, Inc.", "sic": "3711", "fiscal_year_end": "1231"},
    {"ticker": "IBM",  "cik": "0000051143", "name": "International Business Machines Corp", "sic": "3570", "fiscal_year_end": "1231"},
    {"ticker": "GOOGL","cik": "0001652044", "name": "Alphabet Inc.", "sic": "7370", "fiscal_year_end": "1231"},
]

@router.get("", response_model=List[CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    """List all registered benchmark companies, seeding them if table is empty."""
    existing = db.query(Company).all()
    if not existing:
        for comp_data in BENCHMARK_COMPANIES:
            comp = Company(**comp_data)
            db.add(comp)
        db.commit()
        existing = db.query(Company).all()
    return existing

