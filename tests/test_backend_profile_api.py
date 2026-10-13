from fastapi.testclient import TestClient

from backend.main import app


def create_test_user(client, email="analyst@example.com", display_name="Test Analyst"):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "display_name": display_name, "password": "a-strong-password-123"},
    )
    assert response.status_code == 201
    session = response.json()
    return {"Authorization": f"Bearer {session['access_token']}"}


def test_authentication_registration_login_and_logout(tmp_path, monkeypatch):
    monkeypatch.setenv("BRANDSHIELD_DB_PATH", str(tmp_path / "brandshield.sqlite3"))

    with TestClient(app) as client:
        assert client.get("/api/auth/me").status_code == 401
        headers = create_test_user(client)
        assert client.get("/api/auth/me", headers=headers).json()["email"] == "analyst@example.com"

        duplicate = client.post(
            "/api/auth/register",
            json={"email": "ANALYST@example.com", "display_name": "Duplicate", "password": "a-strong-password-123"},
        )
        assert duplicate.status_code == 409

        login = client.post("/api/auth/login", json={"email": "ANALYST@example.com", "password": "a-strong-password-123"})
        assert login.status_code == 200
        login_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        assert client.get("/api/auth/me", headers=login_headers).status_code == 200

        wrong_password = client.post("/api/auth/login", json={"email": "analyst@example.com", "password": "incorrect"})
        assert wrong_password.status_code == 401

        logout = client.post("/api/auth/logout", headers=login_headers)
        assert logout.status_code == 204
        assert client.get("/api/auth/me", headers=login_headers).status_code == 401


def test_brand_profile_is_persisted_per_authenticated_user(tmp_path, monkeypatch):
    monkeypatch.setenv("BRANDSHIELD_DB_PATH", str(tmp_path / "brandshield.sqlite3"))
    payload = {
        "name": "Acme Financial",
        "industry": "Fintech",
        "region": "North America",
        "description": "Digital banking",
        "domains": [{"domain": "acme.example", "note": "Primary", "verified": False}],
        "accounts": [{"platform": "X", "identifier": "@AcmeFinancial", "verified": False}],
        "logoAsset": {"name": "logo.png", "dataUrl": "data:image/png;base64,dGVzdA=="},
    }

    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}
        assert client.get("/api/brand-profile").status_code == 401
        headers = create_test_user(client)
        assert client.get("/api/brand-profile", headers=headers).json() is None
        saved = client.put("/api/brand-profile", json=payload, headers=headers)
        assert saved.status_code == 200
        assert saved.json() == payload

        other_user_headers = create_test_user(client, "other@example.com", "Other Analyst")
        assert client.get("/api/brand-profile", headers=other_user_headers).json() is None

    with TestClient(app) as client:
        headers = client.post(
            "/api/auth/login",
            json={"email": "analyst@example.com", "password": "a-strong-password-123"},
        ).json()
        loaded = client.get("/api/brand-profile", headers={"Authorization": f"Bearer {headers['access_token']}"})
        assert loaded.status_code == 200
        assert loaded.json() == payload


def test_brand_profile_rejects_invalid_domains_and_logos(tmp_path, monkeypatch):
    monkeypatch.setenv("BRANDSHIELD_DB_PATH", str(tmp_path / "brandshield.sqlite3"))
    payload = {
        "name": "Acme Financial",
        "industry": "Fintech",
        "region": "North America",
        "description": "",
        "domains": [{"domain": "not a domain", "note": "Invalid", "verified": False}],
        "accounts": [],
        "logoAsset": None,
    }

    with TestClient(app) as client:
        headers = create_test_user(client)
        invalid_domain = client.put("/api/brand-profile", json=payload, headers=headers)
        assert invalid_domain.status_code == 422
        payload["domains"] = [{"domain": "acme.example", "note": "Primary", "verified": False}]
        payload["logoAsset"] = {"name": "logo.svg", "dataUrl": "data:image/svg+xml;base64,PHN2Zz4="}
        invalid_logo = client.put("/api/brand-profile", json=payload, headers=headers)
        assert invalid_logo.status_code == 422
