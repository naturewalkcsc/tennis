import { Redis } from '@upstash/redis'

export function getRedis() {
  // Support both Vercel KV (KV_* vars) and Upstash Redis (UPSTASH_* vars)
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}
