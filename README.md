# Tennis Score App (Vercel) — GLOBAL players + results

This build syncs BOTH **Results** and **Players** across devices via Vercel KV.

## Environment variables (Project → Settings → Environment Variables)
- KV_REST_API_URL
- KV_REST_API_TOKEN

> If these are not set, the app gracefully falls back to device-local storage (no global sync).

## Deploy
1. Import the project into Vercel (or push to GitHub and import).
2. Add the two env vars above.
3. Deploy. Frontend builds with Vite → `dist/`. API routes: `/api/matches` and `/api/players`.

