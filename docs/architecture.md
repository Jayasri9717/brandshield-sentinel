# Backend overview

The FastAPI entry point is `backend.main:app`. Route definitions and shared logic live in the root `app/` package. SQLAlchemy 2.x persists brand profiles and detection history in SQLite by default. Pydantic v2 validates requests and serializes responses.

## Request flow

1. A caller registers a brand profile with identifiers it has verified.
2. A detection endpoint compares caller-submitted information with those identifiers or with a small explicit set of permission rules.
3. The API returns a risk score, a risk band, evidence strings, and the analysis scope.
4. The same result is saved for the dashboard and paginated history.

The similarity functions and sensitive-permission weights are deterministic heuristics. They are not trained models, external intelligence feeds, or proof of malicious activity. Social and domain checks do not make network requests. The app route does not inspect an APK binary.

## Frontend connection

The current Vite frontend calls `GET /api/health`; that route is retained as a compatibility alias. `GET /health` is the canonical health endpoint. The default CORS origins include `localhost:5173` and `127.0.0.1:5173`; set `FRONTEND_ORIGINS` to override them.

## Interactive API docs

FastAPI generates OpenAPI and Swagger UI from the request and response schemas:

- Swagger UI: `/docs`
- OpenAPI JSON: `/openapi.json`
