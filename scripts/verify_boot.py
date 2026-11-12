"""
Script to verify server boot, health checks, and API responses.
"""
from pathlib import Path
import sys

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import uvicorn
import threading
import time
import httpx

TEST_PORT = 8088

def run_server():
    from backend.app.main import app
    uvicorn.run(app, host="127.0.0.1", port=TEST_PORT, log_level="warning")

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(2)

try:
    with httpx.Client(base_url=f"http://127.0.0.1:{TEST_PORT}") as client:
        # Test 1: Health endpoint
        res = client.get("/health")
        print(f"GET /health: {res.status_code}")
        print("Health Response:", res.json())
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
        assert res.json()["database"] == "connected"

        # Test 2: Companies registry
        res_comp = client.get("/api/companies")
        print(f"GET /api/companies: {res_comp.status_code}")
        companies = res_comp.json()
        print(f"Loaded {len(companies)} benchmark companies: {[c['ticker'] for c in companies]}")
        assert len(companies) >= 5

        # Test 3: Root (serves frontend style guide)
        res_root = client.get("/")
        print(f"GET / (Frontend SPA): {res_root.status_code}")
        assert res_root.status_code == 200
        assert "html" in res_root.headers.get("content-type", "")
        print("Frontend UI bundle served successfully!")

    print("\nALL BOOT CHECKS PASSED SUCCESSFULLY!")
except Exception as e:
    print(f"Verification failed: {e}", file=sys.stderr)
    sys.exit(1)
