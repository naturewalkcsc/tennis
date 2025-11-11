// api/fixtures.js  (ESM)
import { Redis } from '@upstash/redis';

// Works with either KV_REST_* or UPSTASH_REDIS_REST_* env names
function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  // CORS + caching headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const redis = getRedis();
  const key = 'tennis:fixtures';
  if (!redis) return res.status(503).json({ error: 'KV not configured' });

  // Be tolerant to how Vercel passes the body (string or object)
  const body = req.method === 'POST'
    ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}))
    : {};

  try {
    if (req.method === 'GET') {
      const list = (await redis.get(key)) || [];
      list.sort((a, b) => (a.start || 0) - (b.start || 0));
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      const action = body.action || 'add';

      if (action === 'add') {
        const f = body.payload || {};
        const list = (await redis.get(key)) || [];
        list.push({ status: f.status || 'upcoming', active: false, ...f });
        await redis.set(key, list);
        return res.status(200).json({ ok: true });
      }

      if (action === 'remove') {
        const id = body.id;
        let list = (await redis.get(key)) || [];
        list = list.filter((x) => x.id !== id);
        await redis.set(key, list);
        return res.status(200).json({ ok: true });
      }

      if (action === 'update') {
        const { id, patch } = body;
        let list = (await redis.get(key)) || [];
        let changed = false;
        list = list.map((x) => {
          if (x.id === id) {
            changed = true;
            return { ...x, ...patch };
          }
          return x;
        });
        if (!changed) return res.status(404).json({ error: 'fixture not found' });
        await redis.set(key, list);
        return res.status(200).json({ ok: true });
      }

      if (action === 'clear') {
        await redis.set(key, []);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'unknown action' });
    }

    if (req.method === 'DELETE') {
      await redis.set(key, []);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'server error' });
  }
}

