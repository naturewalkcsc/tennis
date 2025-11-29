import { Redis } from '@upstash/redis'

export function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.log('Redis credentials not found - running in development mode');
    return null;
  }
  
  return new Redis({ url, token });
}

// Export kv instance
export const kv = getRedis();
