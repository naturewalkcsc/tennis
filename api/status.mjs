import { getRedis } from './_kv.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json')
  try {
    const redis = getRedis()
    return res.status(200).json({ kv: !!redis })
  } catch (e) {
    return res.status(200).json({ kv: false })
  }
}
