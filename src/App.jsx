// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  Players data shape stored in KV via /api/players:
  {
    singles: {
      "Women's Singles": ["Alice", ...],
      "Kid's Singles": [...],
      "Men's(A) Singles": [...],
      "Men's(B) Singles": [...]
      // categories present as keys. We preserve exactly what user saved.
    },
    doubles: {
      "Women's Doubles": [...],
      "Kid's Doubles": [...],
      ...
    }
  }
*/

const DEFAULT_SINGLE_CATS = [
  "Women's Singles",
  "Kid's Singles",
  "Kid's Singles", // included twice per user's request
  "Men's(A) Singles",
  "Men's(B) Singles",
];

const DEFAULT_DOUBLE_CATS = [
  "Women's Doubles",
  "Kid's Doubles",
  "Kid's Doubles", // duplicate as requested
  "Men's(A) Doubles",
  "Men's(B) Doubles",
  "Mixed Doubles",
];

const buster = () => "?t=" + Date.now();

async function apiPlayersGet() {
  // returns object, or fallback default shape
  try {
    const r = await fetch("/api/players" + buster(), { cache: "no-store" });
    if (!r.ok) throw new Error("no-kv");
    const j = await r.json();
    // If kv returned an array (older shape), put into default category
    if (!j || typeof j !== "object") return { singles: {}, doubles: {} };
    return j;
  } catch (e) {
    // fall back to an empty structured object to avoid crashes
    return { singles: {}, doubles: {} };
  }
}

async function apiPlayersSet(obj) {
  const r = await fetch("/api/players" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: obj }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error("Save failed: " + txt);
  }
  return await r.json();
}

/* --- small UI primitives --- */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>{children}</div>
);
const Button = ({ children, variant = "primary", onClick, className = "", ...rest }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium";
  const styles =
    variant === "primary"
      ? "bg-green-600 hover:bg-green-700 text-white"
      : variant === "secondary"
      ? "bg-zinc-100 hover:bg-zinc-200 text-black"
      : "hover:bg-zinc-100";
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
};

/* --- Admin login gate (simple local login) --- */
function AdminLogin({ onOk }) {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    // default credential is admin / rnwtennis123$ — but do not prefill password
    if (user === "admin" && pass === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      onOk();
    } else {
      setErr("Invalid username or password");
    }
  }
  return (
    <div className="app-bg min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">Admin Login</h2>
          <div className="text-sm text-zinc-500 mb-4">Enter admin credentials to manage the app</div>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <div className="text-sm mb-1">Username</div>
              <input value={user} onChange={(e) => setUser(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <div className="text-sm mb-1">Password</div>
              <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" className="w-full rounded-xl border px-3 py-2" />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <div>
              <Button type="submit" variant="primary">Sign in</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

/* --- Landing with images --- */
function Landing({ onStart, onResults, onSettings, onFixtures }) {
  const Tile = ({ title, subtitle, src, action }) => (
    <motion.button onClick={action} whileHover={{ y: -2 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left">
      <div className="h-40 relative">
        <img src={src} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-zinc-600">{subtitle}</div>
      </div>
    </motion.button>
  );
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-6 h-6 text-green-600" />
        <h1 className="text-2xl font-bold">Lawn Tennis Scoring (Admin)</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Tile title="Start Match" subtitle="Choose from fixtures" src={imgStart} action={onStart} />
        <Tile title="Results" subtitle="Active • Upcoming • Completed" src={imgScore} action={onResults} />
        <Tile title="Manage Players" subtitle="Singles & Doubles" src={imgSettings} action={onSettings} />
      </div>

      <div className="mt-6">
        <Button variant="secondary" onClick={onFixtures}><CalendarPlus className="w-4 h-4" /> Fixtures</Button>
      </div>
    </div>
  );
}

/* --- Manage Players (category based) --- */
function ManagePlayers({ onBack }) {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Ensure the categories exist in state (in the desired order)
  function ensureCategories(obj, order) {
    const out = { ...obj };
    order.forEach((k) => {
      if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = [];
    });
    // keep other user categories too if present
    return out;
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await apiPlayersGet();
      if (!alive) return;
      // If data.singles is an array (old shape), migrate into Men's(A) Singles fallback
      let singles = {};
      let doubles = {};
      if (Array.isArray(data.singles)) {
        singles = {};
        // put all into Men's(A) Singles if empty
        singles["Men's(A) Singles"] = data.singles.slice();
      } else if (data.singles && typeof data.singles === "object") {
        singles = { ...data.singles };
      } else singles = {};

      if (Array.isArray(data.doubles)) {
        doubles = {};
        doubles["Men's(A) Doubles"] = data.doubles.slice();
      } else if (data.doubles && typeof data.doubles === "object") {
        doubles = { ...data.doubles };
      } else doubles = {};

      // ensure orders & categories exist
      singles = ensureCategories(singles, DEFAULT_SINGLE_CATS);
      doubles = ensureCategories(doubles, DEFAULT_DOUBLE_CATS);

      setPlayers({ singles, doubles });
      setLoading(false);
    })();
    return () => (alive = false);
  }, []);

  function updateSingle(cat, idx, value) {
    setPlayers((p) => {
      const ns = { ...p.singles, [cat]: p.singles[cat].map((v, i) => (i === idx ? value : v)) };
      return { ...p, singles: ns };
    });
  }
  function addSingle(cat) {
    setPlayers((p) => {
      const arr = [...(p.singles[cat] || []), ""];
      return { ...p, singles: { ...p.singles, [cat]: arr } };
    });
  }
  function delSingle(cat, idx) {
    setPlayers((p) => {
      const arr = p.singles[cat].filter((_, i) => i !== idx);
      return { ...p, singles: { ...p.singles, [cat]: arr } };
    });
  }

  function updateDouble(cat, idx, value) {
    setPlayers((p) => {
      const ns = { ...p.doubles, [cat]: p.doubles[cat].map((v, i) => (i === idx ? value : v)) };
      return { ...p, doubles: ns };
    });
  }
  function addDouble(cat) {
    setPlayers((p) => {
      const arr = [...(p.doubles[cat] || []), ""];
      return { ...p, doubles: { ...p.doubles, [cat]: arr } };
    });
  }
  function delDouble(cat, idx) {
    setPlayers((p) => {
      const arr = p.doubles[cat].filter((_, i) => i !== idx);
      return { ...p, doubles: { ...p.doubles, [cat]: arr } };
    });
  }

  async function saveAll() {
    setSaving(true);
    setMessage("");
    // sanitize: trim empty strings and remove duplicates
    const cleanedSingles = {};
    Object.entries(players.singles).forEach(([cat, arr]) => {
      const filtered = (arr || []).map((s) => (s || "").trim()).filter((s) => s.length);
      cleanedSingles[cat] = Array.from(new Set(filtered));
    });
    const cleanedDoubles = {};
    Object.entries(players.doubles).forEach(([cat, arr]) => {
      const filtered = (arr || []).map((s) => (s || "").trim()).filter((s) => s.length);
      cleanedDoubles[cat] = Array.from(new Set(filtered));
    });

    try {
      await apiPlayersSet({ singles: cleanedSingles, doubles: cleanedDoubles });
      setPlayers({ singles: cleanedSingles, doubles: cleanedDoubles });
      setMessage("Players saved");
      setTimeout(() => setMessage(""), 1800);
    } catch (e) {
      console.error(e);
      setMessage("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players (by category)</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={saveAll} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {message && <div className="mb-4 text-sm text-emerald-700">{message}</div>}

      {loading ? (
        <Card className="p-4">Loading players…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            <div className="space-y-4">
              {DEFAULT_SINGLE_CATS.map((cat) => (
                <div key={cat} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat}</div>
                    <div className="text-xs text-zinc-500">{(players.singles[cat] || []).length} players</div>
                  </div>
                  <div className="space-y-2">
                    {(players.singles[cat] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input value={name} onChange={(e) => updateSingle(cat, idx, e.target.value)} className="flex-1 rounded-xl border px-3 py-2" />
                        <button className="px-3 py-2 rounded-xl hover:bg-zinc-100" onClick={() => delSingle(cat, idx)}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div>
                      <Button variant="secondary" onClick={() => addSingle(cat)}><Plus className="w-4 h-4" /> Add Player</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div className="space-y-4">
              {DEFAULT_DOUBLE_CATS.map((cat) => (
                <div key={cat} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat}</div>
                    <div className="text-xs text-zinc-500">{(players.doubles[cat] || []).length} pairs</div>
                  </div>
                  <div className="space-y-2">
                    {(players.doubles[cat] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input value={name} onChange={(e) => updateDouble(cat, idx, e.target.value)} className="flex-1 rounded-xl border px-3 py-2" placeholder="Pair label e.g. Serena/Venus" />
                        <button className="px-3 py-2 rounded-xl hover:bg-zinc-100" onClick={() => delDouble(cat, idx)}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div>
                      <Button variant="secondary" onClick={() => addDouble(cat)}><Plus className="w-4 h-4" /> Add Pair</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      <div className="text-xs text-zinc-500 mt-3">You can add players/pairs to any category independently. Save to persist.</div>
    </div>
  );
}

/* --- Small helper to flatten categories into lists for existing fixtures / start match UI --- */
function flattenSingles(obj) {
  // obj can be { singles: { cat1: [...], cat2: [...] } } or older array
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object" && obj.singles && Array.isArray(obj.singles)) return obj.singles;
  // if obj is a structured singles map
  const out = [];
  const map = obj.singles || obj;
  Object.keys(map || {}).forEach((k) => {
    (map[k] || []).forEach((v) => out.push(v));
  });
  // unique
  return Array.from(new Set(out));
}
function flattenDoubles(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object" && obj.doubles && Array.isArray(obj.doubles)) return obj.doubles;
  const out = [];
  const map = obj.doubles || obj;
  Object.keys(map || {}).forEach((k) => {
    (map[k] || []).forEach((v) => out.push(v));
  });
  return Array.from(new Set(out));
}

/* --- Fixtures, StartFromFixtures, Scoring, Results - minimal versions or references --- */
/* For brevity, include a simple Fixtures + StartFromFixtures + Scoring + Results shell that uses the flatten helpers.
   Your full app already has these components; ensure they call flattenSingles(flatPlayers) and flattenDoubles(flatPlayers)
   to populate dropdowns. If your app uses a different implementation, integrate these helpers there. */

function Fixtures({ onBack }) {
  // lightweight fixtures UI that uses players when scheduling
  const [playersObj, setPlayersObj] = useState({ singles: {}, doubles: {} });
  const [mode, setMode] = useState("singles");
  const [list, setList] = useState([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState(""); // new category selection
  const [matchType, setMatchType] = useState("Qualifier"); // Qualifier/Semifinal/Final

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await apiPlayersGet();
      if (!alive) return;
      setPlayersObj(p);
      // load fixtures from API
      try {
        const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setList(Array.isArray(j) ? j.sort((x, y) => (x.start || 0) - (y.start || 0)) : []);
        }
      } catch (e) {}
    })();
    return () => (alive = false);
  }, []);

  const singlesOptions = flattenSingles(playersObj);
  const doublesOptions = flattenDoubles(playersObj);

  const canAdd = a && b && a !== b && date && time;

  async function addFixture(e) {
    e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = {
      id: crypto.randomUUID(),
      mode,
      sides: [a, b],
      start,
      status: "upcoming",
      category: category || (mode === "singles" ? "Unspecified Singles" : "Unspecified Doubles"),
      matchType,
    };
    // send to API
    await fetch("/api/fixtures" + buster(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", payload }),
    });
    // combine matches by category and sort by date/time per your request:
    const newList = [...list, payload].sort((x, y) => {
      if (x.category === y.category) return (x.start || 0) - (y.start || 0);
      return x.category.localeCompare(y.category);
    });
    setList(newList);
    setA(""); setB(""); setDate(""); setTime(""); setCategory("");
  }

  async function removeFixture(id) {
    await fetch("/api/fixtures" + buster(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", id }),
    });
    setList(list.filter((f) => f.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Fixtures</h2>
      </div>

      <Card className="p-5 mb-6">
        <div className="font-semibold mb-3">Schedule a Match</div>
        <form onSubmit={addFixture} className="grid md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm mb-1">Type</div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2"><input type="radio" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
              <label className="flex items-center gap-2"><input type="radio" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
            </div>
          </div>

          <div>
            <div className="text-sm mb-1">{mode === "singles" ? "Player 1" : "Team 1"}</div>
            <select value={a} onChange={(e) => setA(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              <option value="">Choose…</option>
              {(mode === "singles" ? singlesOptions : doublesOptions).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <div className="text-sm mb-1">{mode === "singles" ? "Player 2" : "Team 2"}</div>
            <select value={b} onChange={(e) => setB(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              <option value="">Choose…</option>
              {(mode === "singles" ? singlesOptions : doublesOptions).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-sm mb-1">Date</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <div className="text-sm mb-1">Time</div>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
          </div>

          <div className="md:col-span-4 grid grid-cols-3 gap-2">
            <div>
              <div className="text-sm mb-1">Category</div>
              <input className="w-full rounded-xl border px-3 py-2" placeholder="Category (e.g. Men's(A) Singles)" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <div className="text-sm mb-1">Match Type</div>
              <select value={matchType} onChange={(e) => setMatchType(e.target.value)} className="w-full rounded-xl border px-3 py-2">
                <option>Qualifier</option>
                <option>Semifinal</option>
                <option>Final</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4" /> Add Fixture</Button>
            </div>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {list.map((f) => (
          <Card key={f.id} className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.category}</span></div>
              <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()} • {f.matchType}</div>
            </div>
            <Button variant="ghost" onClick={() => removeFixture(f.id)}><X className="w-4 h-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* --- StartFromFixtures (select fixture and start match) --- */
function StartFromFixtures({ onBack, onStartScoring }) {
  const [fixtures, setFixtures] = useState([]);
  const [mode, setMode] = useState("singles");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (!alive) return;
          setFixtures(Array.isArray(j) ? j : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const list = fixtures.filter((f) => (f.mode || "singles") === mode && f.status !== "completed");

  async function startFixture(fx) {
    const now = Date.now();
    const patch = { status: "active" };
    if ((fx.start || 0) > now) patch.start = now;
    // mark others active->upcoming
    for (const other of fixtures) {
      if (other.id !== fx.id && other.status === "active") {
        await fetch("/api/fixtures" + buster(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", id: other.id, patch: { status: "upcoming" } }),
        });
      }
    }
    await fetch("/api/fixtures" + buster(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: fx.id, patch }),
    });
    onStartScoring({ mode: fx.mode, sides: fx.sides, fixtureId: fx.id, rule: "regular", bestOf: 3, gamesTarget: 6, startingServer: 0 });
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button><h2 className="text-xl font-bold">Start Match</h2></div>
      <Card className="p-5">
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
        </div>
        {loading ? <div className="text-zinc-500">Loading fixtures…</div> : (list.length === 0 ? <div className="text-zinc-500">No fixtures for {mode}.</div> : <div className="space-y-3">{list.map((f) => (<Card key={f.id} className="p-4 flex items-center gap-4"><div className="flex-1"><div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()} • {f.category} • {f.matchType}</div></div><Button onClick={() => startFixture(f)}><Play className="w-4 h-4" /> Start Now</Button></Card>))}</div>)}
      </Card>
    </div>
  );
}

/* --- Minimal Scoring component to fit in flow (your app already has a full one) --- */
function Scoring({ config, onAbort, onComplete }) {
  // This keeps previous behaviour; finalizing match will update fixtures and store result in /api/matches (if you use that)
  const { sides = ["A", "B"], fixtureId } = config || {};
  const [points, setPoints] = useState([0, 0]);
  const [games, setGames] = useState([0, 0]);

  function pointTo(who) {
    // very simple scoring for demo - increment point -> when 4 points (0,1,2,3 are tennis mapping) mark a game
    setPoints((p) => {
      const np = [...p];
      np[who] = np[who] + 1;
      if (np[who] >= 4) {
        // win game
        setGames((g) => {
          const ng = [...g];
          ng[who] = ng[who] + 1;
          return ng;
        });
        np[0] = 0; np[1] = 0;
      }
      return np;
    });
  }

  async function finishMatch() {
    // compute simple scoreline from games
    const scoreline = `${games[0]}-${games[1]}`;
    const winner = games[0] > games[1] ? sides[0] : sides[1];
    // store in matches (legacy) and update fixture to completed
    const payload = { id: crypto.randomUUID(), sides, finishedAt: Date.now(), scoreline, winner };
    // save to matches
    try {
      await fetch("/api/matches" + buster(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", payload }),
      });
    } catch (e) {}
    if (fixtureId) {
      try {
        await fetch("/api/fixtures" + buster(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", id: fixtureId, patch: { status: "completed", finishedAt: Date.now(), winner, scoreline } }),
        });
      } catch (e) {}
    }
    onComplete();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onAbort}><ChevronLeft className="w-5 h-5" /> Quit</Button><h2 className="text-xl font-bold">Scoring • {sides[0]} vs {sides[1]}</h2></div>
      <Card className="p-6">
        <div className="text-center text-3xl font-bold">{points[0]} - {points[1]}</div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Button onClick={() => pointTo(0)}>{sides[0]} Point</Button>
          <Button onClick={() => pointTo(1)}>{sides[1]} Point</Button>
        </div>
        <div className="mt-4">
          <Button variant="secondary" onClick={finishMatch}>Finish Match (record result)</Button>
        </div>
      </Card>
    </div>
  );
}

/* --- Results: reads fixtures and shows completed/upcoming/active --- */
function Results({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
        if (!r.ok) throw new Error("no-fixtures");
        const j = await r.json();
        if (!alive) return;
        setFixtures(Array.isArray(j) ? j : []);
      } catch (e) {
        setFixtures([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completed = fixtures.filter((f) => f.status === "completed").sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button><h2 className="text-xl font-bold">Results</h2></div>
      {loading ? <Card className="p-5 text-center text-zinc-500">Loading…</Card> : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Active</div>
            {active.length ? active.map((f) => (<div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No active match.</div>}
            <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
            {upcoming.length ? upcoming.map((f) => (<div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.category}</span></div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No upcoming fixtures.</div>}
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Completed</div>
            {completed.length ? completed.map((f) => (<div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="text-sm text-zinc-500">{f.finishedAt ? new Date(f.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{f.winner || "-"}</span> <span className="ml-3 font-mono">{f.scoreline || ""}</span></div></div>)) : <div className="text-zinc-500">No results yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

/* --- App shell --- */

export default function App() {
  const [view, setView] = useState("landing");
  const [cfg, setCfg] = useState(null);

  // admin gate
  const isLogged = typeof window !== "undefined" && localStorage.getItem("lt_admin") === "1";
  if (!isLogged) {
    return <AdminLogin onOk={() => window.location.reload()} />;
  }

  function to(v) {
    setView(v);
  }

  return (
    <div className="app-bg min-h-screen">
      <div className="max-w-6xl mx-auto py-8">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Landing onStart={() => to("start")} onResults={() => to("results")} onSettings={() => to("settings")} onFixtures={() => to("fixtures")} />
            </motion.div>
          )}

          {view === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ManagePlayers onBack={() => to("landing")} />
            </motion.div>
          )}

          {view === "fixtures" && (
            <motion.div key="fixtures" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Fixtures onBack={() => to("landing")} />
            </motion.div>
          )}

          {view === "start" && (
            <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <StartFromFixtures onBack={() => to("landing")} onStartScoring={(c) => { setCfg(c); to("scoring"); }} />
            </motion.div>
          )}

          {view === "scoring" && cfg && (
            <motion.div key="scoring" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Scoring config={cfg} onAbort={() => to("landing")} onComplete={() => to("results")} />
            </motion.div>
          )}

          {view === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Results onBack={() => to("landing")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Lawn Tennis Scoring (Admin)</footer>
    </div>
  );
}

