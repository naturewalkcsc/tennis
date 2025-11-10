# Tennis Score App (Vercel-ready)

## Deploy
1) Create a new Vercel project from this folder.
2) Add **Environment Variables** (Project → Settings → Environment Variables):
   - KV_REST_API_URL
   - KV_REST_API_TOKEN
   (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
3) Build Command: **vercel-build** (auto from package.json)
4) Output Directory: **dist**

## Notes
- Home shows three big buttons (Start a Match, Show Results, Manage Players) + Fixtures.
- Manage Players writes to Upstash KV so all devices see the same list.
- Results are global via KV.
