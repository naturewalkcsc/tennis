// api/players.js
// Supports both Vercel KV (if available at runtime) and Upstash REST (via @upstash/redis).
// Sets CORS headers and returns helpful messages on errors.

async function tryImportVercelKV() {
  try {
    // dynamic import avoids build-time failure if package not present
    const mod = await import('@vercel/kv');
    if (mod && mod.kv) return mod.kv;
  } catch (e) {
    // ignore
  }
  return null;
}

async function tryUpstashClient() {
  // Use environment variables commonly provided by Upstash
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    return new Redis({ url, token });
  } catch (e) {
    console.error('Upstash client import failed', e?.message || e);
    return null;
  }
}

const DEFAULT_PLAYERS = {
  singles: {
    "Women's Singles": [],
    "Kid's Singles": [],
    "NW Team (A) Singles": [],
    "NW Team (B) Singles": []
  },
  doubles: {
    "Women's Doubles": [],
    "Kid's Doubles": [],
    "NW Team (A) Doubles": [],
    "NW Team (B) Doubles": [],
    "Mixed Doubles": []
  }
};

export default async function handler(req, res) {
  // common CORS + no-store headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // attempt to connect to a KV provider
  let kv = null;
  try {
    kv = await tryImportVercelKV(); // prefer Vercel KV if available
  } catch (e) {
    console.error('Error importing vercel kv', e);
  }
  if (!kv) {
    kv = await tryUpstashClient();
  }

  if (!kv) {
    // helpful error - tells you to set env vars
    return res.status(500).json({
      error: 'No KV client available. Configure Vercel KV or Upstash and set env vars: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL / KV_REST_API_TOKEN.'
    });
  }

  try {
    if (req.method === 'GET') {
      // read from KV
      // kv.get should work for both @vercel/kv and @upstash/redis clients
      const data = await kv.get('players');
      // return default structure if not present (so UI always sees new shape)
      return res.status(200).json(data ?? DEFAULT_PLAYERS);
    }

    if (req.method === 'POST') {
      // Body expected shape: { payload: { singles: {...}, doubles: {...} } } OR direct payload
      let body = req.body;
      // some platforms stringify JSON. handle that.
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { /* ignore */ }
      }
      const payload = (body && (body.payload || body)) || null;

      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'missing or invalid payload' });
      }

      // Save EXACT structure sent by frontend
      await kv.set('players', payload);

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error('KV ERROR:', e && (e.stack || e.message || e));
    return res.status(500).json({ error: 'server error', detail: String(e && (e.message || e)) });
  }
}

