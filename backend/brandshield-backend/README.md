# BrandShield Sentinel backend

This is the FastAPI backend for the Digital Risk Protection Platform. It uses
SQLite through SQLAlchemy. Detection scores are produced by transparent,
rule-based checks; they are not predictions from a trained machine-learning
model and are not proof that a submitted item is malicious.

> This MVP has no authentication. Use it for local demonstrations only.

## Run locally

Use Python 3.11 or newer. Run these commands inside this folder.

Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for Swagger UI or
`http://127.0.0.1:8000/health` for the health check. The SQLite database file
`brandshield.db` is created automatically in the folder you start the server
from. It is listed in `.gitignore`, so it is never committed.

To let other devices on your network reach the API, add
`--host 0.0.0.0 --port 8000` to the `uvicorn` command.

## Configuration

Settings are read from environment variables. Both are optional.

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./brandshield.db` | Database to use |
| `FRONTEND_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated frontend addresses allowed to call the API (CORS) |

For example, on macOS or Linux:
`FRONTEND_ORIGINS=http://localhost:3000 uvicorn backend.main:app --reload`.

## Run automated tests

From this folder, with the dependencies installed:

```bash
pytest -q
```

The API tests use a temporary in-memory database, so they never change
`brandshield.db`.

## Main API routes

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Liveness and database check |
| POST | `/api/brands` | Create a brand profile |
| GET | `/api/brands` | List brand profiles |
| GET | `/api/brands/{brand_id}` | Read one brand profile |
| PUT | `/api/brands/{brand_id}` | Replace a brand profile |
| POST | `/api/detections/social` | Compare submitted handles with a brand's official handles |
| POST | `/api/detections/apps` | Score submitted app permission names |
| POST | `/api/detections/domains` | Compare a domain with a brand's official domains |
| GET | `/api/dashboard/stats` | Dashboard totals and risk counts |
| GET | `/api/history` | Saved detections, newest first (`kind`, `limit`, `offset`) |

Example requests:

```json
POST /api/brands
{"name": "Example Bank", "official_handles": ["examplebank"], "official_domains": ["examplebank.com"]}

POST /api/detections/social
{"brand_profile_id": 1, "profiles": [{"handle": "examplebank_support", "platform": "instagram"}]}

POST /api/detections/apps
{"app_name": "Unknown Wallet", "package_name": "com.example.wallet", "permissions": ["android.permission.SEND_SMS"]}

POST /api/detections/domains
{"brand_profile_id": 1, "domain": "examp1ebank.com"}
```

Rules to know about:

- `official_domains` must be valid domain names (or URLs). A bad value is rejected with a 422 error when the brand is saved.
- Risk levels: a score below 40 is `low`, 40 to 74 is `medium`, and 75 or more is `high`.
- Nothing is looked up online. Social checks compare only the submitted handles, domain checks compare only the submitted text, and app checks score only the submitted permission names. No APK file is scanned, so an app result is never a malware verdict.

## Replit

On Replit, start the existing **API Server** workflow. The preview serves the
API under an `/api` prefix, so the interactive documentation is at `/api/docs`,
the health check at `/api/health`, and the OpenAPI schema at
`/api/openapi.json`. These extra routes also work locally.

## Project layout

```
app/
  main.py            application, CORS, health and docs routes
  database.py        engine, sessions, tables created on startup
  models.py          database tables
  schemas.py         request and response formats
  services.py        domain and app-permission risk rules
  routers/           brands, detections, dashboard and history routes
  agents/            social handle comparison
  detection/         string similarity functions
backend/main.py      entry point used by uvicorn
tests/               pytest tests
```
