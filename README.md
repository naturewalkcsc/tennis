# Tennis Score App — Admin + Read-only Viewer

- **Admin** (manage players, schedule fixtures, scoring): `/`
- **Viewer** (read-only fixtures + results): `/viewer`

Vercel setup:
- Build Command: `vercel-build`
- Output Directory: `dist`
- Env Vars: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or Upstash equivalents)
