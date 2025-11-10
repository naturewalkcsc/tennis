# Tennis Score App — Admin + Read-only Viewer

- Admin (manage players, fixtures, scoring): `/`
- Viewer (read-only fixtures + results): `/viewer`

Vercel:
- Build Command: `vercel-build`
- Output Directory: `dist`
- Env Vars: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
