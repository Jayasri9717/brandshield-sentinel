# BrandShield Sentinel

BrandShield Sentinel is a college-project prototype for evidence-led digital risk triage. Its current backend compares data submitted by the caller; it does not crawl social networks, scan APK binaries, query threat-intelligence services, or claim to use a trained machine-learning model.

## Run the backend

Use Python 3.11 or newer:

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

The server listens at `http://127.0.0.1:8000`. Interactive Swagger documentation is at `/docs`; the health checks are `/health` and `/api/health` (the latter stays available for the current frontend).

The default SQLite database is `brandshield.db` in the working directory. Set `DATABASE_URL` to use another SQLAlchemy-compatible database engine (and install its driver). Set `FRONTEND_ORIGINS` to a comma-separated list if the frontend runs on a different origin.

## API routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`, `POST` | `/api/brands` | List or register verified brand profiles |
| `GET`, `PUT` | `/api/brands/{brand_id}` | Read or update a brand profile |
| `POST` | `/api/detections/social` | Compare submitted handles with official handles |
| `POST` | `/api/detections/apps` | Triage submitted app metadata and permission names |
| `POST` | `/api/detections/domains` | Compare a submitted domain with official domains |
| `GET` | `/api/dashboard/stats` | Return brand and detection totals |
| `GET` | `/api/history` | Return newest detections (`kind`, `limit`, and `offset` filters) |

Detection scores are explainable heuristic indicators, not proof that an account, app, or domain is malicious. APK analysis uses only the metadata included in the JSON request; no binary is uploaded or inspected.

## Run tests

```bash
python -m pytest -q
```

GitHub Actions runs this test suite on pushes and pull requests with Python 3.11 and 3.13.
