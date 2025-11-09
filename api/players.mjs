import { getRedis } from './_kv.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const redis = getRedis()
  const key = 'tennis:players' // { singles:[], doubles:[] }

  try {
    if (req.method === 'GET') {
      if (!redis) return res.status(503).json({ error: 'KV not configured' })
      const obj = await redis.get(key) || { singles: [], doubles: [] }
      return res.status(200).json(obj)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      if (!redis) return res.status(503).json({ error: 'KV not configured' })
      const payload = body.payload || { singles: [], doubles: [] }
      const singles = Array.isArray(payload.singles) ? payload.singles.slice(0, 500) : []
      const doubles = Array.isArray(payload.doubles) ? payload.doubles.slice(0, 500) : []
      await redis.set(key, { singles, doubles })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'method not allowed' })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'server error' })
  }
}
