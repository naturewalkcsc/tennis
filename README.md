# Tennis Score App — Fixtures-First Start + Local Admin Gate

- Start Match shows fixtures; picking a future fixture moves its start time to now and marks it active.
- On finish, fixture is updated to completed with winner/scoreline, and match is also added to history.
- Results: sections for Active (glow), Upcoming, Completed.
- Viewer (`/viewer`): read-only.
- Images from site root: `/StartMatch.jpg`, `/Score.jpg`, `/Settings.jpg`.

Vercel env: `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).