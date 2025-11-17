import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      // Read from KV
      const data = await kv.get("players");

      // If empty, return the NEW structure (NOT the old empty arrays)
      return res.status(200).json(
        data || {
          singles: {
            "Women's Singles": [],
            "Kid's Singles": [],
            "Men's (A) Singles": [],
            "Men's (B) Singles": []
          },
          doubles: {
            "Women's Doubles": [],
            "Kid's Doubles": [],
            "Men's (A) Doubles": [],
            "Men's (B) Doubles": [],
            "Mixed Doubles": []
          }
        }
      );
    }

    if (req.method === "POST") {
      const { payload } = req.body;

      if (!payload) {
        return res.status(400).json({ error: "missing payload" });
      }

      // Save EXACT structure sent by frontend
      await kv.set("players", payload);

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    console.error("KV ERROR:", e);
    return res.status(500).json({ error: "server error" });
  }
}

