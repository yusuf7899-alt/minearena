"""
Moneta Pre-Audit Backend Application Entry Point.
Serves FastAPI REST APIs and mounts built frontend UI.
"""
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.api import health, companies, audit, analyze, auth, ai

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Moneta Pre-Audit API",
    description="Human-in-the-Loop Financial Filing Pre-Audit Agent",
    version=settings.APP_VERSION,
)

# CORS configuration for local React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(health.router)
app.include_router(companies.router)
app.include_router(audit.router)
app.include_router(analyze.router)
app.include_router(auth.router)
app.include_router(ai.router)

# Mount built frontend if available
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "message": "Moneta Pre-Audit Agent API is running.",
            "docs": "/docs",
            "health": "/health",
            "phase": 1
        }
