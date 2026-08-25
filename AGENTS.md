# Base44 Dev Environment

## App overview
AWS Mastery — a Vite + React 19 + TypeScript single-page app for AWS exam practice.
State is stored locally in IndexedDB via Dexie (`src/db`). Supabase is **optional**:
when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent, `supabaseClient`
is `null` and the app runs in local-only mode (no auth, no cloud sync). Auth and
sync layers (`src/auth`, `src/sync`) all no-op when the client is null.

## Running
```
docker compose -f docker-compose.base44.yml up -d
```
- Web entry point on host port **3000** (mapped to Vite's 5173).
- `node:22` base image, repo bind-mounted at `/app`; `npm install` + `npm run dev`
  run at startup. Edits hot-reload (polling enabled via `CHOKIDAR_USEPOLLING`).
- Vite is configured with `server.host: true` and `allowedHosts: true` so the
  external preview hostname is accepted.

## Secrets (optional)
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are only needed to enable
Supabase auth + cloud sync. The app boots and is fully usable without them.
When provided, they're delivered via `/run/base44/app.env` (last `env_file:`
entry, overrides the repo `.env.base44-defaults` placeholders).

## Verify
- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/`
  returns the Vite-served `index.html` (live source, not a prebuilt bundle).
- `curl ... /src/main.tsx` returns 200 (modules compile).

## Tests
`npm test` (vitest), `npm run e2e` (playwright-based, `scripts/e2e.mjs`).
