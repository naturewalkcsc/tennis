# Tennis Score App (GLOBAL)

Now uses **@upstash/redis** for serverless key-value storage.

## Set these Environment Variables in Vercel (Project → Settings → Environment Variables)
Use **either** set; both work:
- `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Vercel KV)
- or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (Upstash Redis)

No source edits are needed beyond this.

## API Routes
- `/api/players` → GET/POST entire list `{ singles:[], doubles:[] }`
- `/api/matches` → GET (list), POST {action:'add'| 'clear'}

Both send `Cache-Control: no-store` to avoid caching in browsers/edges.
