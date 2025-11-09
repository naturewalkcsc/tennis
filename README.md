# Tennis Score App (Vercel)

A lightweight Lawn Tennis scoring app with global Results using a serverless API.
- React + Vite + Tailwind
- Animated UI (framer-motion)
- Exports CSV/PDF
- Global results backed by **Vercel KV** (optional). If KV isn't set, the app falls back to device-local storage.

## Deploy to Vercel
1. Create a new Vercel project from this folder (or push to GitHub and import).
2. In **Project → Settings → Environment Variables**, add (optional for global sync):
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. Deploy. The frontend builds to `/dist`; the API route is `/api/matches`.

### Rename your Vercel URL
- **Settings → General → Project Name** (changes the default `*.vercel.app` subdomain).
- **Settings → Domains → Add** to attach a custom domain.

## Local Dev
```bash
npm install
npm run dev
```

## Build / Preview
```bash
npm run build
npm run preview
```
