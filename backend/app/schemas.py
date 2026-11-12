"""
Pydantic v2 schemas for Moneta pre-audit API contracts.
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# Health Check Schemas
class HealthResponse(BaseModel):
    status: str = "ok"
    app: str = "Moneta"
    version: str = "1.0.0"
    phase: int = 1
    sec_user_agent: str
    database: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Company Schemas
class CompanyBase(BaseModel):
    ticker: str
    cik: str
    name: str
    sic: Optional[str] = None
    fiscal_year_end: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Filing Schemas
class FilingBase(BaseModel):
    company_id: int
    accession_number: str
    form: str
    filing_date: str
    report_date: str
    primary_document: str
    document_url: str

class FilingResponse(FilingBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Metric Schemas
class MetricResponse(BaseModel):
    id: int
    concept: str
    extracted_value: float
    raw_text: Optional[str] = None
    unit: str
    scale: str
    period_end: str
    method: str
    is_derived: bool
    evidence_snippet: str
    xbrl_tag: Optional[str] = None
    xbrl_ground_truth: Optional[float] = None
    confidence_score: float
    status: str
    model_config = ConfigDict(from_attributes=True)

# Tie-Out Schemas
class TieOutResponse(BaseModel):
    id: int
    tie_out_name: str
    status: str
    expected_value: Optional[float] = None
    actual_value: Optional[float] = None
    delta: Optional[float] = None
    formula: str
    contributing_items: Optional[str] = None
    materiality_assessment: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Auditor Q&A Schemas
class AuditorQueryRequest(BaseModel):
    flag_id: str
    query: str
    reviewer_id: str = "Sarah Jenkins, CPA"

class AuditorQueryResponse(BaseModel):
    id: int
    metric_concept: Optional[str] = None
    reviewer_id: str
    query_text: str
    response_text: str
    tools_invoked: Optional[List[Dict[str, Any]]] = None
    citations: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

# Audit Decision Schemas
class AuditDecisionRequest(BaseModel):
    metric_id: int
    decision: str  # 'approve', 'edit', 'reject'
    new_value: Optional[float] = None
    justification: Optional[str] = None
    reviewer_id: str = "Sarah Jenkins, CPA"

class AuditLogResponse(BaseModel):
    id: int
    filing_id: int
    event_type: str
    metric_concept: Optional[str] = None
    original_value: Optional[float] = None
    new_value: Optional[float] = None
    reviewer_id: str
    justification: Optional[str] = None
    state_hash: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
