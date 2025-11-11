// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X, Eye } from "lucide-react";

/* ------------------ API HELPERS ------------------ */
const LS_MATCHES_FALLBACK = "lt_matches_fallback";
const LS_PLAYERS_DRAFT = "lt_players_draft";
const readLS = (k, f) => {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; }
};
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const buster = () => "?t=" + Date.now();

const apiPlayersGet    = async () => { const r = await fetch("/api/players" + buster(), { cache: "no-store" }); if(!r.ok) throw 0; return await r.json(); };
const apiPlayersSet    = async (obj) => { const r = await fetch("/api/players" + buster(), { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ payload: obj })}); if(!r.ok) throw 0; };
const apiMatchesList   = async () => { try { const r = await fetch("/api/matches" + buster(), { cache: "no-store" }); if(!r.ok) throw 0; return await r.json(); } catch { return readLS(LS_MATCHES_FALLBACK, []); } };
const apiMatchesAdd    = async (payload) => { try { const r = await fetch("/api/matches" + buster(), { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action:"add", payload })}); if(!r.ok) throw 0; } catch { const list = readLS(LS_MATCHES_FALLBACK, []); list.unshift(payload); writeLS(LS_MATCHES_FALLBACK, list); } };
const apiFixturesList  = async () => { const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" }); if(!r.ok) throw 0; return await r.json(); };
const apiFixturesAdd   = async (payload) => { const r = await fetch("/api/fixtures" + buster(), { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action:"add", payload })}); if(!r.ok) throw 0; };
const apiFixturesRemove= async (id) => { const r = await fetch("/api/fixtures" + buster(), { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action:"remove", id })}); if(!r.ok) throw 0; };
const apiFixturesClear = async () => { const r = await fetch("/api/fixtures" + buster(), { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action:"clear" })}); if(!r.ok) throw 0; };
const apiFixturesUpdate= async (id, patch) => { const r = await fetch("/api/fixtures" + buster(), { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action:"update", id, patch })}); if(!r.ok) throw 0; };

/* ------------------ SHARED UI ------------------ */
const Card = ({ className = "", children }) => (
  <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>{children}</div>
);
const Button = ({ children, onClick, variant = "primary", className = "", type = "button", disabled }) => {
  const base = "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium";
  const styles = { primary: "bg-green-600 hover:bg-green-700 text-white", secondary: "bg-zinc-100 hover:bg-zinc-200", ghost: "hover:bg-zinc-100" }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
};

/* ------------------ LOCAL ADMIN LOGIN ------------------ */
function AdminLogin({ onOk }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (u === "admin" && p === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      onOk();
    } else setErr("Invalid username or password");
  };
  return (
    <div className="app-bg">
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

/* ------------------ LANDING (keep your images as-is) ------------------ */
// NOTE: keep your existing image imports/usage exactly as you have them now so buttons continue to show images.
// The component below assumes you already render three tiles that call onStart/onResults/onSettings, plus a "Fixtures" button.
const Landing = ({ onStart, onResults, onSettings, onFixtures, TileComponent }) => {
  // If you already have a custom Tile that renders your imported JPGs, pass it via TileComponent and keep using it.
  const Tile = TileComponent || (({ title, subtitle, src, action }) => (
    <motion.button onClick={action} whileHover={{ y: -2 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left">
      <div className="h-40 relative">
        <img src={src} className="absolute inset-0 w-full h-full object-cover" alt="" />
      </div>
      <div className="p-4">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-zinc-600">{subtitle}</div>
      </div>
    </motion.button>
  ));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-6 h-6 text-green-600" />
        <h1 className="text-2xl font-bold">Lawn Tennis Scoring (Admin)</h1>
      </div>

      {/* Keep your three image tiles exactly as you had them before */}
      {/* Example (replace src props with your working image variables/paths): */}
      {/* <Tile title="Start Match" src={imgStart} subtitle="Choose from fixtures" action={onStart}/> */}
      {/* <Tile title="Results" src={imgScore} subtitle="Active • Upcoming • Completed" action={onResults}/> */}
      {/* <Tile title="Manage Players" src={imgSettings} subtitle="Singles & Doubles" action={onSettings}/> */}

      <div className="mt-6">
        <Button variant="secondary" onClick={onFixtures}>
          <CalendarPlus className="w-4 h-4" /> Fixtures
        </Button>
      </div>
    </div>
  );
};

/* ------------------ SETTINGS ------------------ */
const Settings = ({ onBack }) => {
  const [singles, setSingles] = useState([]);
  const [doubles, setDoubles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const saveDraft = (s, d) => { try { localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify({ singles: s, doubles: d })); } catch {} };
  const loadDraft = () => { try { const r = localStorage.getItem(LS_PLAYERS_DRAFT); return r ? JSON.parse(r) : null; } catch { return null; } };
  const clearDraft = () => { try { localStorage.removeItem(LS_PLAYERS_DRAFT); } catch {} };

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = loadDraft();
      if (d) {
        setSingles(d.singles || []);
        setDoubles(d.doubles || []);
        setDirty(true);
        setLoading(false);
        return;
      }
      try {
        const obj = await apiPlayersGet();
        if (alive) {
          setSingles(obj.singles || []);
          setDoubles(obj.doubles || []);
        }
      } catch {
        setError("Could not load players");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const mark = (s, d) => { setDirty(true); saveDraft(s, d); };
  const addSingles = () => { const s = [...singles, "New Player"]; setSingles(s); mark(s, doubles); };
  const addDoubles = () => { const d = [...doubles, "Team X/Team Y"]; setDoubles(d); mark(singles, d); };
  const updSingles = (i, v) => setSingles((p) => { const s = p.map((x, idx) => (idx === i ? v : x)); mark(s, doubles); return s; });
  const updDoubles = (i, v) => setDoubles((p) => { const d = p.map((x, idx) => (idx === i ? v : x)); mark(singles, d); return d; });
  const delSingles = (i) => { const s = singles.filter((_, idx) => idx !== i); setSingles(s); mark(s, doubles); };
  const delDoubles = (i) => { const d = doubles.filter((_, idx) => idx !== i); setDoubles(d); mark(singles, d); };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await apiPlayersSet({ singles, doubles });
      setDirty(false);
      clearDraft();
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto">
          <Button onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save Changes"}</Button>
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
              {singles.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updSingles(idx, e.target.value)} />
                  <button onClick={() => delSingles(idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <Button variant="secondary" onClick={addSingles}><Plus className="w-4 h-4" /> Add Player</Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div className="space-y-3">
              {doubles.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updDoubles(idx, e.target.value)} />
                  <button onClick={() => delDoubles(idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <Button variant="secondary" onClick={addDoubles}><Plus className="w-4 h-4" /> Add Pair</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

/* ------------------ FIXTURES (create/list) ------------------ */
const Fixtures = ({ onBack }) => {
  const [players, setPlayers] = useState({ singles: [], doubles: [] });
  const [mode, setMode] = useState("singles");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const p = await apiPlayersGet(); if (alive) setPlayers(p); } catch {}
      try { const fx = await apiFixturesList(); if (alive) setList(fx); } catch {}
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const options = mode === "singles" ? players.singles : players.doubles;
  const canAdd = a && b && a !== b && date && time;

  const add = async (e) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = { id: crypto.randomUUID(), mode, sides: [a, b], start, status: "upcoming" };
    await apiFixturesAdd(payload);
    setList((prev) => [...prev, payload].sort((x, y) => x.start - y.start));
    setA(""); setB(""); setDate(""); setTime("");
  };
  const remove = async (id) => { await apiFixturesRemove(id); setList((prev) => prev.filter((f) => f.id !== id)); };
  const clear = async () => { if (!confirm("Clear ALL fixtures?")) return; await apiFixturesClear(); setList([]); };
  const refresh = async () => { setList(await apiFixturesList()); };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Fixtures</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={refresh}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button variant="secondary" onClick={clear}>Clear All</Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-5 text-center text-zinc-500">Loading…</Card>
      ) : (
        <>
          <Card className="p-5 mb-6">
            <div className="font-semibold mb-3">Schedule a Match</div>
            <form onSubmit={add} className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <div className="text-sm mb-1">Type</div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
                  <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
                </div>
              </div>
              <div>
                <div className="text-sm mb-1">{mode === "singles" ? "Player 1" : "Team 1"}</div>
                <select className="w-full rounded-xl border px-3 py-2" value={a} onChange={(e) => setA(e.target.value)}>
                  <option value="">Choose…</option>{options.map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
              <div>
                <div className="text-sm mb-1">{mode === "singles" ? "Player 2" : "Team 2"}</div>
                <select className="w-full rounded-xl border px-3 py-2" value={b} onChange={(e) => setB(e.target.value)}>
                  <option value="">Choose…</option>{options.map((o) => (<option key={o} value={o}>{o}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-sm mb-1">Date</div><input type="date" className="w-full rounded-xl border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><div className="text-sm mb-1">Time</div><input type="time" className="w-full rounded-xl border px-3 py-2" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              </div>
              <div className="md:col-span-4">
                <Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4" /> Add Fixture</Button>
              </div>
            </form>
          </Card>

          {list.length === 0 ? (
            <Card className="p-5 text-center text-zinc-500">No fixtures yet.</Card>
          ) : (
            <div className="space-y-3">
              {list.map((f) => (
                <Card key={f.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div>
                    <div className="text-sm text-zinc-500">
                      {new Date(f.start).toLocaleString()}
                      {f.status === "active" && <span className="ml-2 inline-flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live</span>}
                      {f.status === "completed" && <span className="ml-2 text-zinc-500 text-xs">(completed)</span>}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => apiFixturesRemove(f.id).then(() => setList((prev) => prev.filter((x) => x.id !== f.id)))} title="Remove"><X className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ------------------ START FROM FIXTURES ------------------ */
function StartFromFixtures({ onBack, onStartScoring }) {
  const [mode, setMode] = useState("singles");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const fx = await apiFixturesList(); if (alive) setFixtures(fx); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const list = fixtures.filter((f) => (f.mode || "singles") === mode && f.status !== "completed");

  const startFixture = async (fx) => {
    const now = Date.now();
    const patch = { status: "active" };
    if (fx.start > now) patch.start = now;

    for (const other of fixtures) {
      if (other.id !== fx.id && other.status === "active") {
        await apiFixturesUpdate(other.id, { status: "upcoming" });
      }
    }
    await apiFixturesUpdate(fx.id, patch);

    onStartScoring({
      mode: fx.mode,
      sides: fx.sides,
      // scoring config default; we’ll apply your custom rules in Scoring below
      rule: "firstToFour",     // custom rule id
      bestOf: 1,
      gamesTarget: 4,
      startingServer: 0,
      fixtureId: fx.id
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Start Match</h2>
      </div>

      <Card className="p-5">
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
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

/* ------------------ SCORING (your new rules) ------------------
Rules required:
1) First to 4 games wins the set.
2) Tiebreak at 3–3. TB is first to 5; at 4–4 next point wins.
3) No-AD: at 40–40 next point wins game.
--------------------------------------------------------------- */
const nextPointNoAd = (p) => ({ 0: 15, 15: 30, 30: 40 }[p] ?? (p === 40 ? "Game" : p));
function advancePointNoAd(a, b, who) {
  // No-AD: if 40-40, next point wins (no Ad state).
  let pA = a, pB = b;
  if (pA === 40 && pB === 40) return who === 0 ? ["Game", 40] : [40, "Game"];
  if (who === 0) pA = nextPointNoAd(pA); else pB = nextPointNoAd(pB);
  return [pA, pB];
}

function Scoring({ config, onAbort, onComplete }) {
  const { sides, startingServer, fixtureId } = config;

  // State
  const [points, setPoints] = useState([0, 0]);        // current game points
  const [games, setGames] = useState([0, 0]);          // games in set
  const [tie, setTie] = useState(false);               // tie-break mode at 3–3
  const [tbPoints, setTbPoints] = useState([0, 0]);    // tie-break points
  const [server, setServer] = useState(startingServer || 0);

  // Helpers
  const gameOver = (g) => g[0] === "Game" || g[1] === "Game";
  const setDone = (gA, gB, t, tA, tB) => {
    if (!t) return (gA >= 4 || gB >= 4);                        // first to 4
    // TB: first to 5, but at 4–4 next point wins
    if (tA >= 5 || tB >= 5) return true;
    if (tA === 5 && tB === 4) return true;
    if (tB === 5 && tA === 4) return true;
    if (tA === 5 && tB === 5) return true; // just in case
    return false;
  };

  const pointTo = (who) => {
    // Tie-break scoring
    if (tie) {
      setTbPoints((p) => {
        const np = [...p];
        np[who] += 1;
        const over =
          np[0] >= 5 || np[1] >= 5 ||
          (np[0] === 5 && np[1] === 4) || (np[1] === 5 && np[0] === 4);
        if (over) {
          const winner = np[0] > np[1] ? 0 : 1;
          const g = [...games];
          g[winner] += 1;
          setGames(g);
          setTie(false);
          setTbPoints([0, 0]);
          finalizeIfNeeded(g, true, np);
        }
        return np;
      });
      return;
    }

    // Regular no-AD game
    const [na, nb] = advancePointNoAd(points[0], points[1], who);
    setPoints([na, nb]);

    if (gameOver([na, nb])) {
      const winner = na === "Game" ? 0 : 1;
      const g = [...games];
      g[winner] += 1;
      setGames(g);
      setPoints([0, 0]);

      // Enter tie-break at 3–3
      if (g[0] === 3 && g[1] === 3) {
        setTie(true);
        setTbPoints([0, 0]);
      } else {
        finalizeIfNeeded(g, false, [0, 0]);
      }

      setServer((s) => 1 - s);
    }
  };

  const finalizeIfNeeded = async (g, inTB, tb) => {
    if (!setDone(g[0], g[1], inTB, tb[0], tb[1])) return;
    // Build scoreline (single-set format)
    const scoreline = inTB
      ? `${g[0]}-${g[1]}(${Math.max(tb[0], tb[1])})`
      : `${g[0]}-${g[1]}`;
    const winner = g[0] > g[1] ? sides[0] : sides[1];

    // Persist result
    const payload = {
      id: crypto.randomUUID(),
      sides,
      rule: "firstToFour_NoAd_TB3-3",
      bestOf: 1,
      gamesTarget: 4,
      finishedAt: Date.now(),
      scoreline,
      winner,
    };
    await apiMatchesAdd(payload);

    // Update fixture -> completed
    if (fixtureId) {
      await apiFixturesUpdate(fixtureId, {
        status: "completed",
        finishedAt: payload.finishedAt,
        winner: payload.winner,
        scoreline: payload.scoreline,
      });
    }

    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onAbort}><ChevronLeft className="w-5 h-5" /> Quit</Button>
        <h2 className="text-xl font-bold">Scoring • {sides[0]} vs {sides[1]}</h2>
      </div>

      <Card className="p-6">
        {!tie ? (
          <>
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
              <div className="font-semibold mb-2">Games</div>
              <div className="text-sm font-mono">{games[0]} - {games[1]}</div>
              <div className="text-xs text-zinc-500 mt-1">Rule: First to 4 games • No-AD • TB at 3–3 (to 5; 4–4 next point wins)</div>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-zinc-600 mb-2">Tie-break (to 5; 4–4 next point wins)</div>
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-right text-3xl font-bold">{tbPoints[0]}</div>
              <div className="text-center">TB</div>
              <div className="text-3xl font-bold">{tbPoints[1]}</div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button onClick={() => pointTo(0)} className="w-full">Point {sides[0]}</Button>
              <Button onClick={() => pointTo(1)} className="w-full">Point {sides[1]}</Button>
            </div>
            <div className="mt-6">
              <div className="font-semibold mb-2">Games</div>
              <div className="text-sm font-mono">{games[0]} - {games[1]} • TB {tbPoints[0]} - {tbPoints[1]}</div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ------------------ RESULTS ------------------ */
const Results = ({ onBack }) => {
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const fx = await apiFixturesList();
      const ms = await apiMatchesList();
      if (alive) { setFixtures(fx); setMatches(ms); setLoading(false); }
    })();
    const iv = setInterval(async () => {
      try { setFixtures(await apiFixturesList()); setMatches(await apiMatchesList()); } catch {}
    }, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter((f) => f.status === "completed");
  const completed = [...completedFixtures, ...matches.map((m) => ({
    id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner, mode: m.mode || "singles"
  }))].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Results</h2>
      </div>

      {loading ? (
        <Card className="p-6 text-center text-zinc-500">Loading…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Active</div>
            {active.length ? active.map((f) => (
              <div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                <div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
              </div>
            )) : <div className="text-zinc-500">No active match.</div>}

            <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
            {upcoming.length ? upcoming.map((f) => (
              <div key={f.id} className="py-2 border-b last:border-0">
                <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div>
                <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
              </div>
            )) : <div className="text-zinc-500">No upcoming fixtures.</div>}
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Completed</div>
            {completed.length ? completed.map((m) => (
              <div key={m.id + String(m.finishedAt)} className="py-2 border-b last:border-0">
                <div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div>
                <div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div>
                <div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner || ""}</span> <span className="ml-3 font-mono">{m.scoreline || ""}</span></div>
              </div>
            )) : <div className="text-zinc-500">No results yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
};

/* ------------------ VIEWER (PUBLIC, READ-ONLY) ------------------ */
function Viewer() {
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        const rs = await apiMatchesList();
        if (!alive) return;
        setFixtures(fx);
        setResults(rs);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    const iv = setInterval(async () => {
      try {
        setFixtures(await apiFixturesList());
        setResults(await apiMatchesList());
      } catch {}
    }, 10000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completed = [
    ...fixtures.filter((f) => f.status === "completed"),
    ...results.map((m) => ({ id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner }))
  ].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="app-bg">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><Eye className="w-6 h-6 text-green-600" /><h1 className="text-2xl font-bold">Tournament Viewer</h1></div>
        </div>
        {loading ? (
          <Card className="p-6 text-center text-zinc-500">Loading…</Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="text-lg font-semibold mb-3">Active Match</div>
              {active.length ? active.map((f) => (
                <div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                </div>
              )) : <div className="text-zinc-500">No live match.</div>}

              <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
              {upcoming.length ? upcoming.map((f) => (
                <div key={f.id} className="py-2 border-b last:border-0">
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div>
                  <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                </div>
              )) : <div className="text-zinc-500">No upcoming fixtures.</div>}
            </Card>

            <Card className="p-5">
              <div className="text-lg font-semibold mb-3">Completed</div>
              {completed.length ? completed.map((m) => (
                <div key={m.id + String(m.finishedAt)} className="py-2 border-b last:border-0">
                  <div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div>
                  <div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div>
                  <div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner || ""}</span> <span className="ml-3 font-mono">{m.scoreline || ""}</span></div>
                </div>
              )) : <div className="text-zinc-500">No completed matches yet.</div>}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------ ADMIN APP (requires login) ------------------ */
function AdminApp({ TileComponent }) {
  const [view, setView] = useState("landing");
  const [cfg, setCfg] = useState(null);
  const logged = localStorage.getItem("lt_admin") === "1";
  if (!logged) return <AdminLogin onOk={() => window.location.reload()} />;

  const to = (v) => setView(v);
  return (
    <div className="app-bg">
      <div className="max-w-6xl mx-auto py-8">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Landing
                TileComponent={TileComponent}
                onStart={() => to("start")}
                onResults={() => to("results")}
                onSettings={() => to("settings")}
                onFixtures={() => to("fixtures")}
              />
            </motion.div>
          )}
          {view === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Settings onBack={() => to("landing")} />
            </motion.div>
          )}
          {view === "fixtures" && (
            <motion.div key="fixtures" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Fixtures onBack={() => to("landing")} />
            </motion.div>
          )}
          {view === "start" && (
            <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <StartFromFixtures
                onBack={() => to("landing")}
                onStartScoring={(c) => { setCfg(c); to("scoring"); }}
              />
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

/* ------------------ ROUTER (Viewer vs Admin) ------------------ */
export default function Root() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (path.startsWith("/viewer")) return <Viewer />;   // public, no login
  return <AdminApp />;                                 // admin, requires login
}

