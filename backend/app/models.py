"""
SQLAlchemy ORM models for Moneta pre-audit domain.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), unique=True, index=True, nullable=False)
    cik = Column(String(10), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    sic = Column(String(10), nullable=True)
    fiscal_year_end = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    filings = relationship("Filing", back_populates="company", cascade="all, delete-orphan")


class Filing(Base):
    __tablename__ = "filings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    accession_number = Column(String(25), unique=True, index=True, nullable=False)
    form = Column(String(10), nullable=False)  # '10-K', '10-K/A', 'UPLOAD'
    filing_date = Column(String(10), nullable=False)
    report_date = Column(String(10), nullable=False)
    primary_document = Column(String(255), nullable=False)
    document_url = Column(String(500), nullable=False)
    local_cache_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    company = relationship("Company", back_populates="filings")
    metrics = relationship("ExtractedMetric", back_populates="filing", cascade="all, delete-orphan")
    tie_outs = relationship("TieOutResult", back_populates="filing", cascade="all, delete-orphan")
    materiality = relationship("MaterialityThreshold", back_populates="filing", uselist=False, cascade="all, delete-orphan")
    queries = relationship("AuditorQuery", back_populates="filing", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="filing", cascade="all, delete-orphan")


class ExtractedMetric(Base):
    __tablename__ = "extracted_metrics"

    id = Column(Integer, primary_key=True, index=True)
    filing_id = Column(Integer, ForeignKey("filings.id", ondelete="CASCADE"), nullable=False, index=True)
    concept = Column(String(100), nullable=False, index=True)
    extracted_value = Column(Float, nullable=False)
    raw_text = Column(String(100), nullable=True)
    unit = Column(String(10), default="USD", nullable=False)
    scale = Column(String(20), default="exact", nullable=False)
    period_start = Column(String(10), nullable=True)
    period_end = Column(String(10), nullable=False)
    method = Column(String(50), nullable=False)
    is_derived = Column(Boolean, default=False, nullable=False)
    evidence_snippet = Column(Text, nullable=False)
    evidence_page = Column(Integer, nullable=True)
    xbrl_tag = Column(String(100), nullable=True)
    xbrl_ground_truth = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=False)
    status = Column(String(50), default="AUTO_APPROVED", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    filing = relationship("Filing", back_populates="metrics")


class TieOutResult(Base):
    __tablename__ = "tie_out_results"

    id = Column(Integer, primary_key=True, index=True)
    filing_id = Column(Integer, ForeignKey("filings.id", ondelete="CASCADE"), nullable=False, index=True)
    tie_out_name = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False)  # 'PASS', 'FAIL', 'WARN', 'INCONCLUSIVE_DERIVED'
    expected_value = Column(Float, nullable=True)
    actual_value = Column(Float, nullable=True)
    delta = Column(Float, nullable=True)
    formula = Column(String(255), nullable=False)
    contributing_items = Column(Text, nullable=True)
    materiality_assessment = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    filing = relationship("Filing", back_populates="tie_outs")


class MaterialityThreshold(Base):
    __tablename__ = "materiality_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    filing_id = Column(Integer, ForeignKey("filings.id", ondelete="CASCADE"), unique=True, nullable=False)
    pre_tax_income = Column(Float, nullable=True)
    total_revenue = Column(Float, nullable=True)
    total_assets = Column(Float, nullable=True)
    planning_materiality = Column(Float, nullable=False)
    tolerable_misstatement = Column(Float, nullable=False)
    variance_percentage_threshold = Column(Float, default=30.0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    filing = relationship("Filing", back_populates="materiality")


class AuditorQuery(Base):
    __tablename__ = "auditor_queries"

    id = Column(Integer, primary_key=True, index=True)
    filing_id = Column(Integer, ForeignKey("filings.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_concept = Column(String(100), nullable=True)
    reviewer_id = Column(String(100), nullable=False)
    query_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    tools_invoked = Column(Text, nullable=True)
    citations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    filing = relationship("Filing", back_populates="queries")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    filing_id = Column(Integer, ForeignKey("filings.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    metric_concept = Column(String(100), nullable=True)
    original_value = Column(Float, nullable=True)
    new_value = Column(Float, nullable=True)
    reviewer_id = Column(String(100), nullable=False)
    justification = Column(Text, nullable=True)
    state_hash = Column(String(64), nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)

    filing = relationship("Filing", back_populates="audit_logs")
