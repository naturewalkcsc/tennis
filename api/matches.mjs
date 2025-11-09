export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const key = 'tennis:matches';

  const useLocal = !url || !token;

  const kvFetch = async (cmd, ...args) => {
    const u = `${url}/${cmd}/${args.map(encodeURIComponent).join('/')}`;
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { result: null };
    return r.json();
  };

  try {
    if (req.method === 'GET') {
      if (useLocal) return res.status(200).json([]);
      const r = await kvFetch('GET', key);
      const list = r && r.result ? JSON.parse(r.result) : [];
      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const action = body.action;
      if (useLocal) return res.status(200).json({ ok: true, storage: 'local-only (KV not configured)' });

      if (action === 'add') {
        const curr = await kvFetch('GET', key);
        const list = curr && curr.result ? JSON.parse(curr.result) : [];
        list.unshift(body.payload);
        if (list.length > 500) list.pop();
        await kvFetch('SET', key, JSON.stringify(list));
        return res.status(200).json({ ok: true });
      }
      if (action === 'clear') {
        await kvFetch('SET', key, JSON.stringify([]));
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'unknown action' });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'server error' });
  }
}
