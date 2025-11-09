\
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const key = 'tennis:players'; // stores { singles:[], doubles:[] }
  const useLocal = !url || !token;

  const kvFetch = async (cmd, ...args) => {
    const u = `${url}/${cmd}/${args.map(encodeURIComponent).join('/')}`;
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { result: null };
    return r.json();
  };

  try {
    if (req.method === 'GET') {
      if (useLocal) return res.status(200).json({ singles: [], doubles: [] });
      const r = await kvFetch('GET', key);
      const obj = r && r.result ? JSON.parse(r.result) : { singles: [], doubles: [] };
      return res.status(200).json(obj);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (useLocal) return res.status(200).json({ ok: true, storage: 'local-only (KV not configured)' });

      const payload = body.payload || { singles: [], doubles: [] };
      // sanitize
      const singles = Array.isArray(payload.singles) ? payload.singles.slice(0, 500) : [];
      const doubles = Array.isArray(payload.doubles) ? payload.doubles.slice(0, 500) : [];
      await kvFetch('SET', key, JSON.stringify({ singles, doubles }));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'server error' });
  }
}
