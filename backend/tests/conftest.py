import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend .env
    try:
        from pathlib import Path
        for line in Path("/app/frontend/.env").read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip()
                break
    except Exception:
        pass
BASE_URL = (BASE_URL or "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api_url():
    return API


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def admin_auth():
    return _login("admin@smartcity.gov", "Admin@12345")


@pytest.fixture(scope="session")
def officer_auth():
    return _login("officer1@smartcity.gov", "Officer@123")


@pytest.fixture(scope="session")
def citizen_auth():
    return _login("citizen@smartcity.gov", "Citizen@123")


def _headers(auth):
    return {"Authorization": f"Bearer {auth['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_headers(admin_auth):
    return _headers(admin_auth)


@pytest.fixture(scope="session")
def officer_headers(officer_auth):
    return _headers(officer_auth)


@pytest.fixture(scope="session")
def citizen_headers(citizen_auth):
    return _headers(citizen_auth)
