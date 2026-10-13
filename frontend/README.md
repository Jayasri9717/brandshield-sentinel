# Drishti DRP frontend

The frontend is a React and strict TypeScript single-page application built with Vite, Axios, React Router, and Recharts.

## Run locally

Start the API from the repository root:

```sh
python -m uvicorn backend.main:app --reload --host localhost --port 8000
```

Then start the frontend from this directory:

```sh
npm install
npm run dev
```

The Vite development server prints its local URL when it starts. To create and preview a production build, run `npm run build` and `npm run preview`.

## Demo data and API status

Dashboard queue items and the Social Monitor, App Monitor, and Lookalike Domains examples are illustrative candidate data. The backend can analyze submitted examples, but they are not live discoveries or external platform integrations.

The API client uses `VITE_API_URL` (default `http://localhost:8000`) and appends `/api` to reach the API. Copy `.env.example` to `.env.local` to configure a different API origin. The API health indicator checks `/api/health`.

Detection is available to guest users; sign-in is not required for the profile or monitor screens. Saving a profile creates a profile through `POST /api/brand-profile`, and its ID is remembered in browser local storage and loaded with `GET /api/brand-profile/{id}`. The backend currently exposes profile creation and retrieval, but not profile updates: saving edits creates a new profile ID and makes it the active profile in this browser. Official domains, social handles, app package IDs, and an optional PNG, JPEG, or WebP logo are included in the profile payload.

The Social, App, and Lookalike Domains pages send the bundled candidate examples to `/api/social/detect`, `/api/app/detect`, and `/api/lookalike/detect`. These endpoints perform local heuristic analysis of the submitted candidates; they do not connect to external platforms or perform DNS/registrar lookups. Dashboard counts and the channel chart load from `/api/dashboard/stats`. A sign-in/register screen and session handling remain available separately; these auth APIs are not used by the detection features. Backend profiles and detection runs persist in SQLite at `data/brandshield.sqlite3` by default. Set `BRANDSHIELD_DB_PATH` to change the database location.

## Appearance and typography

Light, Dark, and System appearance modes are available in the top bar. The selected mode is stored in browser local storage; System follows the operating-system color preference. Sidebar collapse preference is also stored locally.

No Calluna Sans or Calluna font files are included in the project. The UI requests those family names first and falls back to system sans-serif fonts for interface text and Georgia for editorial headings. For exact Calluna rendering, provide properly licensed Calluna Sans and Calluna font files and register them with `@font-face` in the frontend styles.

## Source layout

`src/components` contains shared UI, `src/pages` contains routed screens, `src/services` contains API access, `src/hooks` contains reusable React hooks, `src/context` contains shared app context, `src/types` contains shared TypeScript types, and `src/utils` contains route and sample-data helpers. Routes are `/`, `/profile`, `/social`, `/apps`, and `/domains`; unknown paths render a 404 screen.
