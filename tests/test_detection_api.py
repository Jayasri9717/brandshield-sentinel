from fastapi.testclient import TestClient

from backend.main import app


def test_profile_detection_endpoints_and_dashboard_stats(tmp_path, monkeypatch):
    monkeypatch.setenv("BRANDSHIELD_DB_PATH", str(tmp_path / "brandshield.sqlite3"))

    with TestClient(app) as client:
        created = client.post(
            "/api/brand-profile",
            json={
                "brand_name": "Acme Financial",
                "industry": "Fintech",
                "region": "Global",
                "description": "Digital banking",
                "verified_domains": ["acme.example"],
                "social_accounts": ["@acmeofficial"],
                "app_ids": ["com.acme.official"],
            },
        )
        assert created.status_code == 201
        profile = created.json()
        profile_id = profile["id"]
        assert client.get(f"/api/brand-profile/{profile_id}").json() == profile

        social = client.post(
            "/api/social/detect",
            json={
                "brand_profile_id": profile_id,
                "profiles": [
                    {"platform": "X", "handle": "@acmeofficial", "display_name": "Acme Financial"},
                    {"platform": "Instagram", "handle": "@acme_support", "display_name": "Acme Financial Support"},
                ],
            },
        )
        assert social.status_code == 200
        assert social.json()["total"] == 2
        assert social.json()["detections"][0]["is_official"] is True
        assert social.json()["detections"][1]["risk_score"] >= 0.7

        apps = client.post(
            "/api/app/detect",
            json={
                "brand_profile_id": profile_id,
                "apps": [
                    {
                        "app_name": "Acme Financial",
                        "publisher": "Acme",
                        "package_id": "com.acme.official",
                        "source": "Play Store",
                        "description": "Official app",
                    },
                    {
                        "app_name": "Acme Financial Support",
                        "publisher": "Unknown",
                        "package_id": "com.unknown.acme",
                        "source": "APK",
                        "description": "Acme Financial support",
                    },
                ],
            },
        )
        assert apps.status_code == 200
        assert apps.json()["detections"][0]["is_official"] is True
        assert apps.json()["detections"][1]["app_name"] == "Acme Financial Support"

        domains = client.post(
            "/api/lookalike/detect",
            json={"brand_profile_id": profile_id, "candidates": ["acme.example", "acme-secure.example"]},
        )
        assert domains.status_code == 200
        assert domains.json()["detections"][0]["is_official"] is True
        assert domains.json()["detections"][1]["domain"] == "acme-secure.example"
        assert domains.json()["detections"][1]["dns_resolves"] is None
        assert domains.json()["detections"][1]["http_status"] is None

        stats = client.get("/api/dashboard/stats")
        assert stats.status_code == 200
        assert stats.json()["total_threats"] == 6
        assert stats.json()["high_risk"] >= 1
        assert {item["platform"] for item in stats.json()["platforms"]} == {"social", "apps", "domains"}


def test_detection_api_returns_clear_not_found_for_unsaved_profile(tmp_path, monkeypatch):
    monkeypatch.setenv("BRANDSHIELD_DB_PATH", str(tmp_path / "brandshield.sqlite3"))

    with TestClient(app) as client:
        response = client.post(
            "/api/social/detect",
            json={"brand_profile_id": "missing", "profiles": [{"platform": "X", "handle": "@example"}]},
        )
        assert response.status_code == 404
        assert "Save a profile" in response.json()["detail"]
