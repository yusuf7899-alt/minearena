"""
Moneta Configuration Module
Handles environment variables, SEC compliance settings, and database paths.
"""
from pathlib import Path
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

class Settings(BaseModel):
    APP_NAME: str = "Moneta"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    
    # SEC EDGAR Compliance Settings
    SEC_USER_AGENT: str = os.getenv(
        "SEC_USER_AGENT", "MonetaPreAudit team@moneta-audit.local"
    )
    SEC_MAX_RPS: float = float(os.getenv("SEC_MAX_RPS", "5.0"))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{DATA_DIR / 'moneta.db'}"
    )
    
    # Accounting Defaults
    DEFAULT_PLANNING_MATERIALITY_PCT: float = 0.05  # 5% of Pre-Tax Income
    DEFAULT_TOLERABLE_MISSTATEMENT_PCT: float = 0.50  # 50% of PM
    DEFAULT_YOY_VARIANCE_THRESHOLD_PCT: float = 30.0  # 30% YoY swing
    CONFIDENCE_AUTO_APPROVE_THRESHOLD: float = 0.80

settings = Settings()
