# Drishti DRP frontend

The frontend is a React and TypeScript single-page application built with Vite. It currently uses the dependencies already included in this project; it does not require Tailwind CSS, Axios, or React Router.

## Run locally

From this directory:

```sh
npm install
npm run dev
```

The Vite development server prints its local URL when it starts. To create and preview a production build, run `npm run build` and `npm run preview`.

## Demo data and API status

Dashboard findings and the Social Monitor, App Monitor, Lookalike Domains, and Brand Profile examples are illustrative UI data. They do not represent live detections, scans, external platform integrations, or saved backend records.

The app checks `http://127.0.0.1:8000/api/health` to display local API availability. At present, this health endpoint is the only backend route used by the frontend. Scan and discovery controls are previews and do not send requests.

## Appearance and typography

Light, Dark, and System appearance modes are available in the top bar. The selected mode is stored in browser local storage; System follows the operating-system color preference. Sidebar collapse preference is also stored locally.

No Calluna Sans or Calluna font files are included in the project. The UI requests those family names first and falls back to system sans-serif fonts for interface text and Georgia for editorial headings. For exact Calluna rendering, provide properly licensed Calluna Sans and Calluna font files and register them with `@font-face` in the frontend styles.
