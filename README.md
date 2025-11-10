# Tennis Score App — FIX for 404/blank and GLOBAL: OFF

What changed
- `vercel.json` is now strict JSON and only contains SPA rewrites:
  - `/viewer` -> `/index.html`
  - `/(.*)` -> `/index.html`
- API functions are kept in `/api/*.js` so Vercel auto-detects them. This restores `/api/status` and GLOBAL: ON.
- `vercel-build` runs `vite build` (no custom copy step).

Deploy steps
1) On Vercel, set env vars (Project → Settings → Environment Variables):
   - KV_REST_API_URL
   - KV_REST_API_TOKEN
2) Redeploy.
3) Visit `/` for admin; `/viewer` for read-only page.
