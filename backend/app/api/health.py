"""
Health check endpoint reporting API, database, and SEC configuration state.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.schemas import HealthResponse
from backend.app.config import settings
from backend.app.database import get_db

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
@router.get("/api/health", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)):
    """Check system operational status and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        phase=1,
        sec_user_agent=settings.SEC_USER_AGENT,
        database=db_status
    )

