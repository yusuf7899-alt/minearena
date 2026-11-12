"""
Service for parsing user-uploaded financial statements (CSV and PDF formats).
Normalizes extracted statements into the standard Moneta data model.
"""
import io
import re
import csv
from typing import Dict, Any, List, Optional
import pdfplumber
import logging

logger = logging.getLogger(__name__)

# Heuristics for standard concept keyword matching
CONCEPT_KEYWORDS: Dict[str, List[str]] = {
    "REVENUES": [
        "total revenue", "total net sales", "revenues", "revenue", "sales and services", "net sales"
    ],
    "NET_INCOME": [
        "net income", "net earnings", "net profit", "net income (loss)", "net loss"
    ],
    "TOTAL_ASSETS": [
        "total assets", "assets"
    ],
    "TOTAL_LIABILITIES": [
        "total liabilities", "liabilities"
    ],
    "STOCKHOLDERS_EQUITY": [
        "total stockholders' equity", "total shareholders' equity", "total equity",
        "stockholders' equity", "shareholders' equity"
    ],
    "OPERATING_CASH_FLOW": [
        "cash provided by operating activities", "operating activities",
        "net cash from operating activities", "net cash provided by operating activities"
    ],
    "GROSS_PROFIT": [
        "gross profit", "gross margin"
    ],
    "OPERATING_INCOME": [
        "operating income", "operating profit", "operating income (loss)", "operating profit (loss)"
    ],
    "CASH_AND_EQUIVALENTS": [
        "cash and cash equivalents", "cash & cash equivalents", "cash and equivalents"
    ]
}

def clean_financial_number(raw_str: str) -> Optional[float]:
    """
    Parses a string financial quantity into float.
    Handles accounting parentheses (1,234.56), currency symbols, commas, and negative signs.
    """
    if not raw_str or not isinstance(raw_str, str):
        return None
        
    s = raw_str.strip().replace("$", "").replace(",", "").strip()
    if not s or s in ["—", "-", "N/A", "null"]:
        return 0.0

    is_negative = False
    if s.startswith("(") and s.endswith(")"):
        is_negative = True
        s = s[1:-1].strip()
    elif s.startswith("-"):
        is_negative = True
        s = s[1:].strip()

    try:
        val = float(s)
        return -val if is_negative else val
    except ValueError:
        return None

def detect_statement_scale(header_text: str) -> float:
    """Detects multiplier scale ('in millions', 'in thousands', 'in billions') from text."""
    lower = header_text.lower()
    if "in billions" in lower or "(in billions)" in lower:
        return 1_000_000_000.0
    if "in millions" in lower or "(in millions)" in lower or "$ in millions" in lower:
        return 1_000_000.0
    if "in thousands" in lower or "(in thousands)" in lower or "$ in thousands" in lower:
        return 1_000.0
    return 1.0


class UploadService:
    def parse_csv(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Parses a CSV financial statement into normalized metrics."""
        text = file_bytes.decode("utf-8", errors="replace")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)

        scale = 1.0
        header_sample = " ".join(" ".join(r) for r in rows[:5])
        scale = detect_statement_scale(header_sample)

        metrics: Dict[str, Any] = {}
        for row_idx, row in enumerate(rows):
            if not row or len(row) < 2:
                continue
            
            line_label = row[0].strip().lower()
            # Search if line label matches any concept keyword
            for concept, keywords in CONCEPT_KEYWORDS.items():
                if concept in metrics:
                    continue
                for kw in keywords:
                    if kw == line_label or (kw in line_label and len(line_label) < len(kw) + 15):
                        # Attempt to parse numeric value from subsequent columns
                        for col_val in row[1:]:
                            parsed_num = clean_financial_number(col_val)
                            if parsed_num is not None:
                                final_val = parsed_num * scale
                                metrics[concept] = {
                                    "concept": concept,
                                    "value": final_val,
                                    "raw_text": col_val,
                                    "unit": "USD",
                                    "scale": "millions" if scale == 1_000_000 else "exact",
                                    "period_end": "2024-12-31",
                                    "method": "csv_table",
                                    "is_derived": False,
                                    "evidence_snippet": f"CSV line {row_idx+1}: {', '.join(row)}"
                                }
                                break
                        break

        return {
            "source": "upload_csv",
            "filename": filename,
            "scale_multiplier": scale,
            "metrics": metrics
        }

    def parse_pdf(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Extracts text and table rows from PDF financial statements."""
        metrics: Dict[str, Any] = {}
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            full_text = ""
            for page_num, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                full_text += f"\n--- Page {page_num+1} ---\n" + page_text
                
                scale = detect_statement_scale(page_text)
                
                # Check tables first
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if not row or not row[0]:
                            continue
                        label = str(row[0]).strip().lower()
                        for concept, keywords in CONCEPT_KEYWORDS.items():
                            if concept in metrics:
                                continue
                            for kw in keywords:
                                if kw == label or (kw in label and len(label) < len(kw) + 15):
                                    for col in row[1:]:
                                        if not col:
                                            continue
                                        num = clean_financial_number(str(col))
                                        if num is not None:
                                            metrics[concept] = {
                                                "concept": concept,
                                                "value": num * scale,
                                                "raw_text": str(col),
                                                "unit": "USD",
                                                "scale": "millions" if scale == 1_000_000 else "exact",
                                                "period_end": "2024-12-31",
                                                "method": "pdf_table",
                                                "is_derived": False,
                                                "evidence_snippet": f"Page {page_num+1} Table: {' | '.join(str(c) for c in row if c)}"
                                            }
                                            break
                                    break

        return {
            "source": "upload_pdf",
            "filename": filename,
            "metrics": metrics
        }

upload_service = UploadService()
