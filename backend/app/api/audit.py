"""
API routes for starting audit sessions, SEC EDGAR 10-K retrieval, XBRL ground truth, and statement uploads.
"""
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.database import get_db
from backend.app.models import Company, Filing, ExtractedMetric
from backend.app.services.sec_client import sec_client
from backend.app.services.xbrl_service import xbrl_service, XBRLFact
from backend.app.services.upload_service import upload_service

router = APIRouter(prefix="/api/audit", tags=["Audit Ingestion & Ground Truth"])

class StartSessionRequest(BaseModel):
    ticker: str
    fiscal_year: Optional[int] = None
    force_refresh: bool = False

class GroundTruthResponse(BaseModel):
    company_name: str
    ticker: str
    cik: str
    fiscal_year: int
    form: str
    accession_number: str
    filing_date: str
    report_date: str
    primary_document_url: str
    local_document_cache: str
    ground_truth_metrics: Dict[str, XBRLFact]

@router.post("/session", response_model=GroundTruthResponse)
def start_audit_session(req: StartSessionRequest, db: Session = Depends(get_db)):
    """
    Initializes a pre-audit session:
    1. Resolves Ticker to CIK.
    2. Fetches SEC Submissions and identifies Form 10-K.
    3. Downloads & caches primary 10-K HTML document.
    4. Fetches CompanyFacts and parses XBRL Ground Truth for 9 core metrics.
    """
    ticker = req.ticker.upper().strip()
    
    # 1. Resolve CIK
    cik = sec_client.get_cik_from_ticker(ticker)
    if not cik:
        # Fallback check against database
        comp = db.query(Company).filter(Company.ticker == ticker).first()
        if comp:
            cik = comp.cik
        else:
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found in SEC EDGAR directory.")

    # 2. Locate latest 10-K filing
    filing_meta = sec_client.find_latest_10k_filing(cik, fiscal_year=req.fiscal_year)
    if not filing_meta:
        raise HTTPException(
            status_code=404,
            detail=f"Form 10-K filing for {ticker} (CIK: {cik}) not found in SEC Submissions."
        )

    # 3. Download & cache primary document
    try:
        cache_path = sec_client.fetch_primary_document(
            cik=cik,
            accession_number=filing_meta["accession_number"],
            primary_document=filing_meta["primary_document"],
            force_refresh=req.force_refresh
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to retrieve primary document from SEC Archives: {str(e)}"
        )

    # 4. Ingest CompanyFacts XBRL Ground Truth
    target_fy = filing_meta["fiscal_year"]
    try:
        ground_truth = xbrl_service.extract_ground_truth(
            cik=cik,
            fiscal_year=target_fy,
            report_date=filing_meta["report_date"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse XBRL CompanyFacts for {ticker}: {str(e)}"
        )

    # 5. Persist into SQLite DB
    company = db.query(Company).filter(Company.ticker == ticker).first()
    if not company:
        company = Company(
            ticker=ticker,
            cik=cik,
            name=filing_meta["company_name"]
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    filing = db.query(Filing).filter(Filing.accession_number == filing_meta["accession_number"]).first()
    if not filing:
        filing = Filing(
            company_id=company.id,
            accession_number=filing_meta["accession_number"],
            form=filing_meta["form"],
            filing_date=filing_meta["filing_date"],
            report_date=filing_meta["report_date"],
            primary_document=filing_meta["primary_document"],
            document_url=filing_meta["document_url"],
            local_cache_path=str(cache_path)
        )
        db.add(filing)
        db.commit()
        db.refresh(filing)

    return GroundTruthResponse(
        company_name=company.name,
        ticker=ticker,
        cik=cik,
        fiscal_year=target_fy,
        form=filing.form,
        accession_number=filing.accession_number,
        filing_date=filing.filing_date,
        report_date=filing.report_date,
        primary_document_url=filing.document_url,
        local_document_cache=str(cache_path),
        ground_truth_metrics=ground_truth
    )

@router.post("/upload")
async def upload_financial_statement(
    file: UploadFile = File(...),
    company_name: str = Form("Client Entity"),
    db: Session = Depends(get_db)
):
    """
    Parses an uploaded CSV or PDF financial statement and extracts core line items.
    """
    content = await file.read()
    filename = file.filename or "statement"
    
    if filename.endswith(".csv"):
        parsed = upload_service.parse_csv(content, filename)
    elif filename.endswith(".pdf"):
        parsed = upload_service.parse_pdf(content, filename)
    else:
        raise HTTPException(status_code=400, detail="Only .csv and .pdf files are supported.")

    parsed["company_name"] = company_name
    return parsed

