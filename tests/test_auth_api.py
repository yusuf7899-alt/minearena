import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_auth_flow():
    # 1. Signup new user
    signup_payload = {
        "email": "auditor@moneta-audit.com",
        "password": "StrongPassword123!",
        "full_name": "Lead Audit Partner"
    }
    res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code in [200, 400]  # 400 if already exists from prior run
    
    # 2. Login
    login_payload = {
        "email": "auditor@moneta-audit.com",
        "password": "StrongPassword123!"
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "auditor@moneta-audit.com"
    assert "moneta_session" in res.cookies
    
    # 3. Check /me with cookie
    res_me = client.get("/api/auth/me", cookies=res.cookies)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == "auditor@moneta-audit.com"
    
    # 4. Logout
    res_logout = client.post("/api/auth/logout")
    assert res_logout.status_code == 200
