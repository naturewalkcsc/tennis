// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Play,
  ChevronLeft,
  Plus,
  Trash2,
  CalendarPlus,
  RefreshCw,
  X,
  BookOpen,
  Users,
  List
} from "lucide-react";

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  Single-file app shell:
  - Admin login (local simple password)
  - Admin UI: Landing, Start (from fixtures), Fixtures, Manage Players (no save toast),
    Scoring, Results (admin)
  - Viewer UI (no admin required) available at /viewer which shows:
      Rules | Teams | Fixture / Scores
    Viewer is rendered when pathname === '/viewer' (works with SPA + vercel rewrite).
*/

// --- API helpers (same endpoints your app uses) ---
const buster = () => "?t=" + Date.now();
const apiPlayersGet = async () => {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("players get failed");
  return r.json();
};
const apiPlayersSet = async (obj) => {
  const r = await fetch("/api/players" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: obj }),
  });
  if (!r.ok) throw new Error("players set failed");
  return r.json();
};
const apiFixturesList = async () => {
  const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("fixtures get failed");
  return r.json();
};
const apiFixturesAdd = async (payload) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", payload }),
  });
  if (!r.ok) throw new Error("fixtures add failed");
  return r.json();
};
const apiFixturesUpdate = async (id, patch) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, patch }),
  });
  if (!r.ok) throw new Error("fixtures update failed");
  return r.json();
};
const apiFixturesRemove = async (id) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "remove", id }),
  });
  if (!r.ok) throw new Error("fixtures remove failed");
  return r.json();
};
const apiMatchesList = async () => {
  const r = await fetch("/api/matches" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("matches get failed");
  return r.json();
};
const apiMatchesAdd = async (payload) => {
  const r = await fetch("/api/matches" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", payload }),
  });
  if (!r.ok) throw new Error("matches add failed");
  return r.json();
};

// --- primitives / small components ---
const Card = ({ className = "", children }) => (
  <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>{children}</div>
);
const Button = ({ children, onClick, variant = "primary", className = "", type = "button", disabled }) => {
  const base = "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium";
  const styles = {
    primary: "bg-green-600 hover:bg-green-700 text-white",
    secondary: "bg-zinc-100 hover:bg-zinc-200",
    ghost: "hover:bg-zinc-100",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
};

// --- Admin Login (simple local auth). password NOT prefilled by UI ---
function AdminLogin({ onOk }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (u === "admin" && p === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      onOk();
    } else {
      setErr("Invalid username or password");
    }
  };
  return (
    <div className="app-bg min-h-screen flex items-center">
      <div className="max-w-sm mx-auto p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <div className="text-sm text-zinc-600">Default: admin / rnwtennis123$</div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 shadow p-5">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <div className="text-sm mb-1">Username</div>
              <input className="w-full rounded-xl border px-3 py-2" value={u} onChange={(e) => setU(e.target.value)} />
            </div>
            <div>
              <div className="text-sm mb-1">Password</div>
              <input type="password" className="w-full rounded-xl border px-3 py-2" value={p} onChange={(e) => setP(e.target.value)} />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <button type="submit" className="w-full px-4 py-3 rounded-xl bg-green-600 text-white">
              Enter Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- Landing (Admin) with desired layout order ---
// Confirmed layout: Start Match | Results | Manage Players, Fixtures button below
const Landing = ({ onStart, onResults, onSettings, onFixtures }) => {
  const Tile = ({ title, subtitle, src, action }) => (
    <motion.button onClick={action} whileHover={{ y: -2 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left">
      <div className="h-40 relative">
        <img src={src} className="absolute inset-0 w-full h-full object-cover" alt="" />
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
        <Button variant="secondary" onClick={onFixtures}>
          <CalendarPlus className="w-4 h-4" /> Fixtures
        </Button>
      </div>
    </div>
  );
};

// --- Manage Players (grouped by categories) ---
// Important: no toast shown when saved per your request.
const MANAGE_ORDER = {
  singles: ["Women's Singles", "Kid's Singles", "Kid's Singles", "Men's (A) Singles", "Men's (B) Singles"],
  doubles: ["Women's Doubles", "Kid's Doubles", "Kid's Doubles", "Men's (A) Doubles", "Men's (B) Doubles", "Mixed Doubles"],
};

function Settings({ onBack }) {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Initialize structure if missing
  const ensureStructure = (raw) => {
    const out = { singles: {}, doubles: {} };
    MANAGE_ORDER.singles.forEach((c) => (out.singles[c] = raw?.singles?.[c] || raw?.singles?.[c] === [] ? raw.singles[c] || [] : []));
    MANAGE_ORDER.doubles.forEach((c) => (out.doubles[c] = raw?.doubles?.[c] || raw?.doubles?.[c] === [] ? raw.doubles[c] || [] : []));
    // Allow older legacy format: if raw.singles is an array, map them to default women's singles
    if (Array.isArray(raw?.singles)) {
      out.singles[MANAGE_ORDER.singles[0]] = raw.singles.slice();
    }
    if (Array.isArray(raw?.doubles)) {
      out.doubles[MANAGE_ORDER.doubles[0]] = raw.doubles.slice();
    }
    return out;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const obj = await apiPlayersGet();
        if (!alive) return;
        setPlayers(ensureStructure(obj || { singles: {}, doubles: {} }));
      } catch (e) {
        // if KV not configured or server error, start with empty structure
        setPlayers(ensureStructure({ singles: {}, doubles: {} }));
        setError("Could not load players (KV?). Editing locally will still work.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const setCategoryList = (type, category, list) => {
    setPlayers((prev) => {
      const copy = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      copy[type][category] = list;
      return copy;
    });
  };

  const addEntry = (type, category) => {
    const list = [...(players[type][category] || []), "New Player"];
    setCategoryList(type, category, list);
  };
  const removeEntry = (type, category, idx) => {
    const list = (players[type][category] || []).filter((_, i) => i !== idx);
    setCategoryList(type, category, list);
  };
  const updateEntry = (type, category, idx, value) => {
    const list = (players[type][category] || []).map((v, i) => (i === idx ? value : v));
    setCategoryList(type, category, list);
  };

  const saveAll = async () => {
    setSaving(true);
    setError("");
    try {
      // Save in new structured format { singles: {cat:[]}, doubles:{cat:[]} }
      await apiPlayersSet(players);
      // don't show toast per request
    } catch (e) {
      setError("Save failed. Make sure KV is configured.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto">
          <Button onClick={saveAll} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? (
        <Card className="p-5 text-center text-zinc-500">Loading…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            <div className="space-y-3">
              {MANAGE_ORDER.singles.map((cat) => (
                <div key={cat}>
                  <div className="text-sm text-zinc-600 mb-2 font-medium">{cat}</div>
                  {(players.singles[cat] || []).map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updateEntry("singles", cat, idx, e.target.value)} />
                      <button onClick={() => removeEntry("singles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div>
                    <Button variant="secondary" onClick={() => addEntry("singles", cat)}>
                      <Plus className="w-4 h-4" /> Add Player
                    </Button>
                  </div>
                  <hr className="my-3" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div className="space-y-3">
              {MANAGE_ORDER.doubles.map((cat) => (
                <div key={cat}>
                  <div className="text-sm text-zinc-600 mb-2 font-medium">{cat}</div>
                  {(players.doubles[cat] || []).map((name, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updateEntry("doubles", cat, idx, e.target.value)} />
                      <button onClick={() => removeEntry("doubles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div>
                    <Button variant="secondary" onClick={() => addEntry("doubles", cat)}>
                      <Plus className="w-4 h-4" /> Add Pair
                    </Button>
                  </div>
                  <hr className="my-3" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Fixtures page (simple scheduling, with category + match type selection) ---
const CATEGORY_OPTIONS = [
  "Men's (A) Singles",
  "Men's (B) Singles",
  "Women's Singles",
  "Kid's Singles",
  "Men's (A) Doubles",
  "Men's (B) Doubles",
  "Women's Doubles",
  "Kid's Doubles",
  "Mixed Doubles",
];

const MATCH_TYPE_OPTIONS = ["Qualifier", "Semifinal", "Final"];

function Fixtures({ onBack }) {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [mode, setMode] = useState("singles");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [matchType, setMatchType] = useState(MATCH_TYPE_OPTIONS[0]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet();
        if (!alive) return;
        // Ensure structure for pick lists (re-use ensureStructure logic)
        const ensure = (raw) => {
          const out = { singles: {}, doubles: {} };
          // Fill categories with arrays (if missing)
          MANAGE_ORDER.singles.forEach((c) => (out.singles[c] = raw?.singles?.[c] || []));
          MANAGE_ORDER.doubles.forEach((c) => (out.doubles[c] = raw?.doubles?.[c] || []));
          if (Array.isArray(raw?.singles)) out.singles[MANAGE_ORDER.singles[0]] = raw.singles.slice();
          if (Array.isArray(raw?.doubles)) out.doubles[MANAGE_ORDER.doubles[0]] = raw.doubles.slice();
          return out;
        };
        setPlayers(ensure(p || { singles: {}, doubles: {} }));
      } catch (e) {
        setPlayers({ singles: {}, doubles: {} });
      }
      try {
        const fx = await apiFixturesList();
        if (!alive) return;
        // combine matches by category and sort by start
        fx.sort((x, y) => (x.start || 0) - (y.start || 0));
        setList(fx);
      } catch (e) {
        setList([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const options = (() => {
    // choose options from players structure based on mode + category
    const catKey = category;
    if (!catKey) {
      // fallback to flattened arrays
      const flat = mode === "singles" ? Object.values(players.singles || {}).flat() : Object.values(players.doubles || {}).flat();
      return [...new Set(flat || [])];
    }
    if (mode === "singles") return players.singles[catKey] || [];
    return players.doubles[catKey] || [];
  })();

  const canAdd = a && b && a !== b && date && time && category;
  const add = async (e) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = {
      id: crypto.randomUUID(),
      mode,
      category,
      matchType,
      sides: [a, b],
      start,
      status: "upcoming",
    };
    await apiFixturesAdd(payload);
    // keep list grouped by category and sorted by date
    setList((prev) => {
      const next = [...prev, payload];
      next.sort((x, y) => (x.start || 0) - (y.start || 0));
      return next;
    });
    setA("");
    setB("");
    setDate("");
    setTime("");
  };

  const remove = async (id) => {
    await apiFixturesRemove(id);
    setList((prev) => prev.filter((f) => f.id !== id));
  };

  const makeActive = async (fx) => {
    // set selected fixture active; unset other active
    for (const other of list) {
      if (other.id !== fx.id && other.status === "active") {
        await apiFixturesUpdate(other.id, { status: "upcoming" });
      }
    }
    const now = Date.now();
    const patch = { status: "active", start: fx.start > now ? now : fx.start };
    await apiFixturesUpdate(fx.id, patch);
    setList((prev) => prev.map((p) => (p.id === fx.id ? { ...p, ...patch } : p)));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Fixtures</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={async () => setList(await apiFixturesList())}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-5 mb-6">
        <div className="font-semibold mb-3">Schedule a Match</div>
        <form onSubmit={add} className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <div className="text-sm text-zinc-600 mb-1">Type</div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="mode" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="mode" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles
              </label>
            </div>
          </div>

          <div>
            <div className="text-sm text-zinc-600 mb-1">Category</div>
            <select className="w-full rounded-xl border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-sm text-zinc-600 mb-1">Match Type</div>
            <select className="w-full rounded-xl border px-3 py-2" value={matchType} onChange={(e) => setMatchType(e.target.value)}>
              {MATCH_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1 grid grid-cols-2 gap-2">
            <div>
              <div className="text-sm text-zinc-600 mb-1">Date</div>
              <input type="date" className="w-full rounded-xl border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <div className="text-sm text-zinc-600 mb-1">Time</div>
              <input type="time" className="w-full rounded-xl border px-3 py-2" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="md:col-span-4 grid md:grid-cols-3 gap-3">
            <div>
              <div className="text-sm text-zinc-600 mb-1">{mode === "singles" ? "Player 1" : "Team 1"}</div>
              <select className="w-full rounded-xl border px-3 py-2" value={a} onChange={(e) => setA(e.target.value)}>
                <option value="">Choose…</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-sm text-zinc-600 mb-1">{mode === "singles" ? "Player 2" : "Team 2"}</div>
              <select className="w-full rounded-xl border px-3 py-2" value={b} onChange={(e) => setB(e.target.value)}>
                <option value="">Choose…</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={!canAdd}>
                <CalendarPlus className="w-4 h-4" /> Add Fixture
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {loading ? (
        <Card className="p-5 text-center text-zinc-500">Loading…</Card>
      ) : list.length === 0 ? (
        <Card className="p-5 text-center text-zinc-500">No fixtures yet.</Card>
      ) : (
        <div className="space-y-3">
          {list.map((f) => (
            <Card key={f.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-semibold">
                  {f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.category} • {f.matchType}</span>
                </div>
                <div className="text-sm text-zinc-500">
                  {new Date(f.start).toLocaleString()}{" "}
                  {f.status === "active" && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
                    </span>
                  )}{" "}
                  {f.status === "completed" && <span className="ml-2 text-zinc-500 text-xs">(completed)</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => makeActive(f)} title="Start now">
                  <Play className="w-5 h-5" />
                </Button>
                <Button variant="ghost" onClick={() => remove(f.id)} title="Remove">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// --- StartFromFixtures (small wrapper to pick and start a fixture) ---
function StartFromFixtures({ onBack, onStartScoring }) {
  const [mode, setMode] = useState("singles");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (!alive) return;
        // only show upcoming/active, sorted by start
        fx.sort((a, b) => (a.start || 0) - (b.start || 0));
        setFixtures(fx);
      } catch (e) {
        setFixtures([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const list = fixtures.filter((f) => (f.mode || "singles") === mode && f.status !== "completed");

  const startFixture = async (fx) => {
    const now = Date.now();
    const patch = { status: "active" };
    if (fx.start > now) patch.start = now;
    // set others to upcoming
    for (const other of fixtures) {
      if (other.id !== fx.id && other.status === "active") {
        await apiFixturesUpdate(other.id, { status: "upcoming" });
      }
    }
    await apiFixturesUpdate(fx.id, patch);
    onStartScoring({ mode: fx.mode, sides: fx.sides, rule: "regular", bestOf: 3, gamesTarget: 6, startingServer: 0, fixtureId: fx.id });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Start Match</h2>
      </div>

      <Card className="p-5">
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="m" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="m" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles
          </label>
        </div>

        {loading ? (
          <div className="text-zinc-500">Loading fixtures…</div>
        ) : list.length === 0 ? (
          <div className="text-zinc-500">No fixtures for {mode}.</div>
        ) : (
          <div className="space-y-3">
            {list.map((f) => (
              <Card key={f.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                </div>
                <Button onClick={() => startFixture(f)}><Play className="w-4 h-4" /> Start Now</Button>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// --- Simple scoring (keeps previous simpler scoring to avoid changing core) ---
const nextPoint = (p) => ({ 0: 15, 15: 30, 30: 40 }[p] ?? (p === 40 ? "Game" : p));
function computeGameWin(a, b) {
  if (a === "Game") return "A";
  if (b === "Game") return "B";
  return null;
}
function advancePoint(a, b, who) {
  let pA = a, pB = b;
  if (who === 0) {
    if (pA === 40 && pB === 40) {
      // No-AD rules requested earlier were more specific; keep simple "next point wins"
      pA = "Game";
    } else if (pA === "Ad") {
      pA = "Game";
    } else if (pB === "Ad") {
      pB = 40;
    } else {
      pA = nextPoint(pA);
    }
  } else {
    if (pA === 40 && pB === 40) {
      pB = "Game";
    } else if (pB === "Ad") {
      pB = "Game";
    } else if (pA === "Ad") {
      pA = 40;
    } else {
      pB = nextPoint(pB);
    }
  }
  return [pA, pB];
}

function makeEmptySet() {
  return { gamesA: 0, gamesB: 0, tie: false, tieA: 0, tieB: 0, finished: false };
}
function setOver(s) {
  // simplified: first-to-6 with 2 diff or 7
  const a = s.gamesA, b = s.gamesB;
  if ((a >= 6 || b >= 6) && Math.abs(a - b) >= 2) return true;
  if (a === 7 || b === 7) return true;
  return false;
}
function winnerSets(sets) {
  let A = 0, B = 0;
  for (const s of sets) {
    if (!s.finished) continue;
    if (s.gamesA > s.gamesB) A++;
    else if (s.gamesB > s.gamesA) B++;
  }
  return { A, B };
}

function Scoring({ config, onAbort, onComplete }) {
  const { sides, fixtureId } = config;
  const [points, setPoints] = useState([0, 0]);
  const [sets, setSets] = useState([makeEmptySet()]);

  const currentSet = sets[sets.length - 1];
  const { A: setsA, B: setsB } = winnerSets(sets);

  const pointTo = (who) => {
    let [a, b] = advancePoint(points[0], points[1], who);
    setPoints([a, b]);
    const gw = computeGameWin(a, b);
    if (!gw) return;
    const ns = [...sets];
    const so = { ...currentSet };
    if (gw === "A") so.gamesA++;
    else so.gamesB++;
    setPoints([0, 0]);
    if (setOver(so)) {
      so.finished = true;
    } else if (so.gamesA === 6 && so.gamesB === 6) {
      // simplified tie handling: next game decides set
      so.tie = true;
    }
    ns[ns.length - 1] = so;
    setSets(ns);
    if (so.finished) {
      // push new set
      setSets((prev) => [...prev, makeEmptySet()]);
    }
  };

  const recordResult = async () => {
    const sl = sets.filter((s) => s.finished).map((s) => `${s.gamesA}-${s.gamesB}`).join(" ");
    const winner = setsA > setsB ? sides[0] : sides[1];
    const payload = { id: crypto.randomUUID(), sides, finishedAt: Date.now(), scoreline: sl, winner };
    await apiMatchesAdd(payload);
    if (fixtureId) await apiFixturesUpdate(fixtureId, { status: "completed", finishedAt: payload.finishedAt, winner: payload.winner, scoreline: payload.scoreline });
    onComplete();
  };

  useEffect(() => {
    const { A, B } = winnerSets(sets);
    // best of 3 default
    if (A === 2 || B === 2) {
      recordResult();
    }
  }, [sets]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onAbort}>
          <ChevronLeft className="w-5 h-5" /> Quit
        </Button>
        <h2 className="text-xl font-bold">Scoring • {sides[0]} vs {sides[1]}</h2>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-right text-3xl font-bold">{String(points[0])}</div>
          <div className="text-center">—</div>
          <div className="text-3xl font-bold">{String(points[1])}</div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Button onClick={() => pointTo(0)} className="w-full">Point {sides[0]}</Button>
          <Button onClick={() => pointTo(1)} className="w-full">Point {sides[1]}</Button>
        </div>
        <div className="mt-6">
          <div className="font-semibold mb-2">Sets</div>
          <div className="text-sm font-mono">{sets.map((s, i) => (<span key={i} className="inline-block mr-3">{`${s.gamesA}-${s.gamesB}`}</span>))}</div>
        </div>
      </Card>
    </div>
  );
}

// --- Results (admin) ---
function Results({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        const ms = await apiMatchesList();
        if (!alive) return;
        setFixtures(fx || []);
        setMatches(ms || []);
      } catch (e) {
        setFixtures([]);
        setMatches([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    const iv = setInterval(async () => {
      try {
        setFixtures(await apiFixturesList());
        setMatches(await apiMatchesList());
      } catch {}
    }, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // show active, upcoming: use fixtures; completed: combine fixtures.completed and matches
  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter((f) => f.status === "completed");
  const completed = [...completedFixtures, ...matches.map((m) => ({ id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner }))].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Results</h2>
      </div>

      {loading ? <Card className="p-6 text-center text-zinc-500">Loading…</Card> : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Active</div>
            {active.length ? active.map((f) => (<div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No active match.</div>}
            <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
            {upcoming.length ? upcoming.map((f) => (<div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.category}</span></div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No upcoming fixtures.</div>}
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Completed</div>
            {completed.length ? completed.map((m) => (<div key={m.id + String(m.finishedAt)} className="py-2 border-b last:border-0"><div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div><div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner || ""}</span> <span className="ml-3 font-mono">{m.scoreline || ""}</span></div></div>)) : <div className="text-zinc-500">No results yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

// --- VIEWER UI (public) ---
function Viewer() {
  // this is a public read-only view (no login)
  const [mode, setMode] = useState("landing"); // landing/rules/teams/fixtures
  return (
    <div className="app-bg min-h-screen py-8">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold">Lawn Tennis — Viewer</h1>
        </div>

        {mode === "landing" && (
          <div className="grid md:grid-cols-3 gap-6">
            <motion.button onClick={() => setMode("rules")} whileHover={{ y: -2 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left p-4">
              <div className="font-semibold">Rules</div>
              <div className="text-sm text-zinc-600 mt-1">See scoring & match rules</div>
            </motion.button>

            <motion.button onClick={() => setMode("teams")} whileHover={{ y: -2 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left p-4">
              <div className="font-semibold">Teams</div>
              <div className="text-sm text-zinc-600 mt-1">View players by category</div>
            </motion.button>

            <motion.button onClick={() => setMode("fixtures")} whileHover={{ y: -2 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left p-4">
              <div className="font-semibold">Fixtures / Scores</div>
              <div className="text-sm text-zinc-600 mt-1">Live, upcoming, completed</div>
            </motion.button>
          </div>
        )}

        {mode === "rules" && <ViewerRules onBack={() => setMode("landing")} />}
        {mode === "teams" && <ViewerTeams onBack={() => setMode("landing")} />}
        {mode === "fixtures" && <ViewerFixtures onBack={() => setMode("landing")} />}
      </div>
    </div>
  );
}

function ViewerRules({ onBack }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Rules</h2>
      </div>
      <Card className="p-6">
        <h3 className="font-semibold mb-3">Scoring rules (viewer)</h3>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-700">
          <li>First to four games wins the set (4-0, 4-1, 4-2 or 4-3 with tiebreak rules).</li>
          <li>If the game score reaches 3-3 a tiebreak is played. The tiebreak is first to 5 points. If 4-4 then next-point-wins.</li>
          <li>No advantage AD scoring: at deuce (40-40) next point decides the game. The receiver chooses serve side (in doubles receiving team decides).</li>
          <li>Standard match formats apply (Qualifier/Semifinal/Final labels shown where used).</li>
        </ol>
      </Card>
    </div>
  );
}

function ViewerTeams({ onBack }) {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet();
        if (!alive) return;
        // ensure default structure
        const ensure = (raw) => {
          const out = { singles: {}, doubles: {} };
          MANAGE_ORDER.singles.forEach((c) => (out.singles[c] = raw?.singles?.[c] || []));
          MANAGE_ORDER.doubles.forEach((c) => (out.doubles[c] = raw?.doubles?.[c] || []));
          if (Array.isArray(raw?.singles)) out.singles[MANAGE_ORDER.singles[0]] = raw.singles.slice();
          if (Array.isArray(raw?.doubles)) out.doubles[MANAGE_ORDER.doubles[0]] = raw.doubles.slice();
          return out;
        };
        setPlayers(ensure(p || { singles: {}, doubles: {} }));
      } catch (e) {
        setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Teams</h2>
      </div>
      {loading ? <Card className="p-5 text-center text-zinc-500">Loading…</Card> : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            {MANAGE_ORDER.singles.map((cat) => (
              <div key={cat} className="mb-4">
                <div className="text-sm font-medium mb-1">{cat}</div>
                {(players.singles[cat] || []).length === 0 ? <div className="text-zinc-500 text-sm">No players</div> : <ul className="list-disc pl-5 text-sm">{(players.singles[cat] || []).map((p, i) => <li key={i}>{p}</li>)}</ul>}
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            {MANAGE_ORDER.doubles.map((cat) => (
              <div key={cat} className="mb-4">
                <div className="text-sm font-medium mb-1">{cat}</div>
                {(players.doubles[cat] || []).length === 0 ? <div className="text-zinc-500 text-sm">No pairs</div> : <ul className="list-disc pl-5 text-sm">{(players.doubles[cat] || []).map((p, i) => <li key={i}>{p}</li>)}</ul>}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function ViewerFixtures({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        const ms = await apiMatchesList();
        if (!alive) return;
        setFixtures(fx || []);
        setMatches(ms || []);
      } catch (e) {
        setFixtures([]);
        setMatches([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    const iv = setInterval(async () => {
      try {
        setFixtures(await apiFixturesList());
        setMatches(await apiMatchesList());
      } catch {}
    }, 8000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter((f) => f.status === "completed");
  const completed = [...completedFixtures, ...matches.map((m) => ({ id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner }))].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Fixture / Scores</h2>
      </div>

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
            {completed.length ? completed.map((m) => (<div key={m.id + String(m.finishedAt)} className="py-2 border-b last:border-0"><div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div><div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner || ""}</span> <span className="ml-3 font-mono">{m.scoreline || ""}</span></div></div>)) : <div className="text-zinc-500">No results yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

// --- App shell: choose admin vs viewer by pathname ---
export default function App() {
  // If path is /viewer -> show public Viewer UI (no login)
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  if (pathname === "/viewer" || pathname === "/viewer/") {
    return <Viewer />;
  }

  // Admin side
  const [view, setView] = useState("landing");
  const [cfg, setCfg] = useState(null);

  const logged = typeof window !== "undefined" && localStorage.getItem("lt_admin") === "1";
  if (!logged) return <AdminLogin onOk={() => window.location.reload()} />;

  return (
    <div className="app-bg">
      <div className="max-w-6xl mx-auto py-8">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Landing onStart={() => setView("start")} onResults={() => setView("results")} onSettings={() => setView("settings")} onFixtures={() => setView("fixtures")} />
            </motion.div>
          )}

          {view === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Settings onBack={() => setView("landing")} />
            </motion.div>
          )}

          {view === "fixtures" && (
            <motion.div key="fixtures" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Fixtures onBack={() => setView("landing")} />
            </motion.div>
          )}

          {view === "start" && (
            <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <StartFromFixtures onBack={() => setView("landing")} onStartScoring={(c) => { setCfg(c); setView("scoring"); }} />
            </motion.div>
          )}

          {view === "scoring" && cfg && (
            <motion.div key="scoring" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Scoring config={cfg} onAbort={() => setView("landing")} onComplete={() => setView("results")} />
            </motion.div>
          )}

          {view === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Results onBack={() => setView("landing")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Lawn Tennis Scoring</footer>
    </div>
  );
}

