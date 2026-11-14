"""
Moneta Configuration Module
Handles environment variables, integration readiness reporting, SEC compliance
settings, and database paths.
"""
import json
import os
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, SecretStr
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

load_dotenv(dotenv_path=BASE_DIR / ".env", override=False)


def _secret_from_env(name: str) -> Optional[SecretStr]:
    value = os.getenv(name)
    return SecretStr(value) if value else None


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
    SEC_BASE_URL: str = os.getenv("SEC_BASE_URL", "https://data.sec.gov")
    SEC_ARCHIVES_URL: str = os.getenv(
        "SEC_ARCHIVES_URL", "https://www.sec.gov/Archives/edgar"
    )
    SEC_MAX_RPS: float = float(os.getenv("SEC_MAX_RPS", "5.0"))

    # Database
    DATABASE_URL: str = (
        os.getenv("DATABASE_URL") or f"sqlite:///{DATA_DIR / 'moneta.db'}"
    )

    # External integrations. SecretStr masks values in model representations.
    GEMINI_API_KEY: Optional[SecretStr] = Field(
        default_factory=lambda: _secret_from_env("GEMINI_API_KEY"), repr=False
    )
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_PUBLISHABLE_KEY: Optional[SecretStr] = Field(
        default_factory=lambda: _secret_from_env("SUPABASE_PUBLISHABLE_KEY"),
        repr=False,
    )
    SUPABASE_SECRET_KEY: Optional[SecretStr] = Field(
        default_factory=lambda: _secret_from_env("SUPABASE_SECRET_KEY"), repr=False
    )
    SUPABASE_ANON_KEY: Optional[SecretStr] = Field(
        default_factory=lambda: _secret_from_env("SUPABASE_ANON_KEY"), repr=False
    )
    FRED_API_KEY: Optional[SecretStr] = Field(
        default_factory=lambda: _secret_from_env("FRED_API_KEY"), repr=False
    )
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: Optional[SecretStr] = Field(
        default_factory=lambda: _secret_from_env("GOOGLE_CLIENT_SECRET"), repr=False
    )
    GROQ_API_KEY: Optional[SecretStr] = Field(
        default_factory=lambda: _secret_from_env("GROQ_API_KEY"), repr=False
    )
    GOOGLE_CLOUD_PROJECT_ID: str = os.getenv("GOOGLE_CLOUD_PROJECT_ID", "")
    GOOGLE_DOCUMENT_AI_PROCESSOR_ID: str = os.getenv(
        "GOOGLE_DOCUMENT_AI_PROCESSOR_ID", ""
    )
    GOOGLE_DOCUMENT_AI_LOCATION: str = os.getenv("GOOGLE_DOCUMENT_AI_LOCATION", "")

    # Accounting Defaults
    DEFAULT_PLANNING_MATERIALITY_PCT: float = 0.05  # 5% of Pre-Tax Income
    DEFAULT_TOLERABLE_MISSTATEMENT_PCT: float = 0.50  # 50% of PM
    DEFAULT_YOY_VARIANCE_THRESHOLD_PCT: float = 30.0  # 30% YoY swing
    CONFIDENCE_AUTO_APPROVE_THRESHOLD: float = 0.80


settings = Settings()


def get_configuration_report(config: Settings = settings) -> dict:
    """Return integration readiness without including credential values."""
    integrations = [
        {
            "integration": "Gemini",
            "required": True,
            "values": {
                "GEMINI_API_KEY": config.GEMINI_API_KEY,
                "GEMINI_MODEL": config.GEMINI_MODEL,
            },
            "action": (
                "Set GEMINI_API_KEY, then verify the exact GEMINI_MODEL ID "
                "is available to this account using Google's API."
            ),
            "model": config.GEMINI_MODEL,
        },
        {
            "integration": "SEC EDGAR",
            "required": True,
            "values": {
                "SEC_USER_AGENT": config.SEC_USER_AGENT,
                "SEC_BASE_URL": config.SEC_BASE_URL,
                "SEC_ARCHIVES_URL": config.SEC_ARCHIVES_URL,
            },
            "action": (
                "Confirm SEC_USER_AGENT contains a monitored team contact and "
                "verify SEC access from this environment."
            ),
        },
        {
            "integration": "Supabase",
            "required": True,
            "values": {
                "SUPABASE_URL": config.SUPABASE_URL,
                "SUPABASE_PUBLISHABLE_KEY": config.SUPABASE_PUBLISHABLE_KEY,
                "SUPABASE_SECRET_KEY": config.SUPABASE_SECRET_KEY,
            },
            "action": (
                "Set the Supabase project URL, publishable key, and backend-only "
                "secret key. Configure and verify Row Level Security policies."
            ),
        },
        {
            "integration": "Google OAuth",
            "required": True,
            "values": {
                "GOOGLE_CLIENT_ID": config.GOOGLE_CLIENT_ID,
                "GOOGLE_CLIENT_SECRET": config.GOOGLE_CLIENT_SECRET,
            },
            "action": (
                "Set both OAuth client values in the backend, set the audience "
                "to EXTERNAL, add the exact callback URL shown by Supabase, and "
                "complete production publishing and verification requirements."
            ),
        },
        {
            "integration": "Groq",
            "required": False,
            "values": {"GROQ_API_KEY": config.GROQ_API_KEY},
            "action": (
                "Optional: leave GROQ_API_KEY empty to keep this integration "
                "unconfigured; set it only when intentionally enabling Groq."
            ),
        },
        {
            "integration": "Google Document AI",
            "required": False,
            "values": {
                "GOOGLE_CLOUD_PROJECT_ID": config.GOOGLE_CLOUD_PROJECT_ID,
                "GOOGLE_DOCUMENT_AI_PROCESSOR_ID": (
                    config.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
                ),
                "GOOGLE_DOCUMENT_AI_LOCATION": config.GOOGLE_DOCUMENT_AI_LOCATION,
            },
            "action": (
                "Optional: leave these values empty for text-based PDFs. Before "
                "using OCR, configure the processor and secure service-account "
                "authentication on the backend."
            ),
        },
    ]

    report = []
    for integration in integrations:
        values = integration["values"]
        missing = [name for name, value in values.items() if not _has_value(value)]
        configured = not missing
        if configured:
            status = "Configured"
        elif integration["required"]:
            status = "Missing configuration"
        elif len(missing) == len(values):
            status = "Not configured (optional)"
        else:
            status = "Partially configured (optional)"

        entry = {
            "integration": integration["integration"],
            "required": integration["required"],
            "status": status,
            "credentials_available": (
                "No API key required; request settings are present"
                if integration["integration"] == "SEC EDGAR" and configured
                else ("Available" if configured else "Missing or incomplete")
            ),
            "missing_configuration": missing,
            "connection_test": "Not tested",
            "developer_action": integration["action"],
        }
        if "model" in integration:
            entry["model"] = integration["model"]
        report.append(entry)

    return {
        "connection_test_note": (
            "Configuration presence is not a connection test. This report does "
            "not send network requests or verify provider credentials/model access."
        ),
        "integrations": report,
    }


def _has_value(value: object) -> bool:
    if isinstance(value, SecretStr):
        return bool(value.get_secret_value().strip())
    return isinstance(value, str) and bool(value.strip())


if __name__ == "__main__":
    print(json.dumps(get_configuration_report(), indent=2))
