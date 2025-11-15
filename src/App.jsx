// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* ----------------- Constants & helpers ----------------- */
const LS_PLAYERS_DRAFT = "lt_players_draft";
const LS_MATCHES_FALLBACK = "lt_matches_fallback";
const buster = () => "?t=" + Date.now();

const SINGLES_ORDER = [
  "Women's Singles",
  "Kid's Singles",
  "Men's(A) Singles",
  "Men's(B) Singles"
];

const DOUBLES_ORDER = [
  "Women's Doubles",
  "Kid's Doubles",
  "Men's(A) Doubles",
  "Men's(B) Doubles",
  "Mixed Doubles"
];

const emptyPlayers = () => ({
  singles: SINGLES_ORDER.reduce((acc, k) => { acc[k] = []; return acc; }, {}),
  doubles: DOUBLES_ORDER.reduce((acc, k) => { acc[k] = []; return acc; }, {})
});

const readLS = (k, fallback) => {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : fallback;
  } catch { return fallback; }
};
const writeLS = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

/* ----------------- API wrappers ----------------- */
const apiPlayersGet = async () => {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("players get failed");
  return await r.json();
};
const apiPlayersSet = async (obj) => {
  const r = await fetch("/api/players" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: obj })
  });
  if (!r.ok) throw new Error("players set failed");
};

const apiFixturesList = async () => {
  const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("fixtures get failed");
  return await r.json();
};
const apiFixturesAdd = async (payload) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", payload })
  });
  if (!r.ok) throw new Error("fixtures add failed");
};
const apiFixturesRemove = async (id) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "remove", id })
  });
  if (!r.ok) throw new Error("fixtures remove failed");
};
const apiFixturesUpdate = async (id, patch) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, patch })
  });
  if (!r.ok) throw new Error("fixtures update failed");
};
const apiFixturesClear = async () => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clear" })
  });
  if (!r.ok) throw new Error("fixtures clear failed");
};

const apiMatchesList = async () => {
  try {
    const r = await fetch("/api/matches" + buster(), { cache: "no-store" });
    if (!r.ok) throw new Error("matches get failed");
    return await r.json();
  } catch { return readLS(LS_MATCHES_FALLBACK, []); }
};
const apiMatchesAdd = async (payload) => {
  try {
    const r = await fetch("/api/matches" + buster(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", payload })
    });
    if (!r.ok) throw new Error("matches add failed");
  } catch {
    const list = readLS(LS_MATCHES_FALLBACK, []);
    list.unshift(payload);
    writeLS(LS_MATCHES_FALLBACK, list);
  }
};

/* ----------------- Small UI primitives ----------------- */
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
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${styles} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
};

/* ----------------- Admin Login ----------------- */
function AdminLogin({ onOk }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e?.preventDefault();
    if (u === "admin" && p === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      onOk();
    } else {
      setErr("Invalid username or password");
    }
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
            <div><div className="text-sm mb-1">Username</div><input className="w-full rounded-xl border px-3 py-2" value={u} onChange={e => setU(e.target.value)} /></div>
            <div><div className="text-sm mb-1">Password</div><input type="password" className="w-full rounded-xl border px-3 py-2" value={p} onChange={e => setP(e.target.value)} /></div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <button type="submit" className="w-full px-4 py-3 rounded-xl bg-green-600 text-white">Enter Admin</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Landing ----------------- */
const Landing = ({ onStart, onResults, onSettings, onFixtures }) => {
  const Tile = ({ title, subtitle, src, action }) => (
    <motion.button onClick={action} whileHover={{ y: -2 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left">
      <div className="h-40 relative"><img src={src} className="absolute inset-0 w-full h-full object-cover" alt="" /></div>
      <div className="p-4"><div className="font-semibold">{title}</div><div className="text-sm text-zinc-600">{subtitle}</div></div>
    </motion.button>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8"><Trophy className="w-6 h-6 text-green-600" /><h1 className="text-2xl font-bold">RNW Tennis Tournament 2025</h1></div>
      <div className="grid md:grid-cols-3 gap-6">
        <Tile title="Start Match" subtitle="Choose from fixtures" src={imgStart} action={onStart} />
        <Tile title="Results" subtitle="Active • Upcoming • Completed" src={imgScore} action={onResults} />
        <Tile title="Manage Players" subtitle="Singles & Doubles" src={imgSettings} action={onSettings} />
      </div>
      <div className="mt-6"><Button variant="secondary" onClick={onFixtures}><CalendarPlus className="w-4 h-4" /> Fixtures</Button></div>
    </div>
  );
};

/* ----------------- Manage Players (CATEGORIZED) ----------------- */
const Settings = ({ onBack }) => {
  // structured by category
  const [players, setPlayers] = useState(emptyPlayers());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(false);

  const draftKey = LS_PLAYERS_DRAFT;

  // Save draft locally
  const saveDraft = (pl) => { try { writeLS(draftKey, pl); } catch {} };

  // Load draft
  const loadDraft = () => readLS(draftKey, null);

  // Load players - prefer server; fallback to draft; else empty
  const loadPlayers = async () => {
    setLoading(true);
    try {
      const obj = await apiPlayersGet();
      // If server returns old flat arrays (legacy), transform them:
      if (obj && (obj.singles && !obj.singles.hasOwnProperty(Object.keys(emptyPlayers().singles)[0]))) {
        // possibly flat arrays - convert into default categories by putting all items into first category
        const server = emptyPlayers();
        const firstSing = Object.keys(server.singles)[0];
        const firstDbl = Object.keys(server.doubles)[0];
        (obj.singles || []).forEach(x => server.singles[firstSing].push(x));
        (obj.doubles || []).forEach(x => server.doubles[firstDbl].push(x));
        setPlayers(server);
      } else if (obj && obj.singles && obj.doubles) {
        // assume structured - ensure all categories exist
        const merged = emptyPlayers();
        // copy singles categories present
        Object.keys(merged.singles).forEach(k => { merged.singles[k] = Array.isArray(obj.singles[k]) ? [...obj.singles[k]] : []; });
        Object.keys(merged.doubles).forEach(k => { merged.doubles[k] = Array.isArray(obj.doubles[k]) ? [...obj.doubles[k]] : []; });
        // also copy any unknown categories (preserve data)
        for (const k in obj.singles) if (!merged.singles[k]) merged.singles[k] = Array.isArray(obj.singles[k]) ? [...obj.singles[k]] : [];
        for (const k in obj.doubles) if (!merged.doubles[k]) merged.doubles[k] = Array.isArray(obj.doubles[k]) ? [...obj.doubles[k]] : [];
        setPlayers(merged);
      } else {
        // fallback to draft or empty
        const d = loadDraft();
        setPlayers(d || emptyPlayers());
      }
      setDirty(false);
    } catch (e) {
      // server unavailable — load draft if any
      const d = loadDraft();
      setPlayers(d || emptyPlayers());
      setError("Could not load players from server (using local draft).");
      setDirty(!!d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlayers(); }, []);

  // Helper to mark dirty and save draft
  const markDirty = (nextPlayers) => {
    setDirty(true);
    saveDraft(nextPlayers);
  };

  // CRUD helpers
  const addToCategory = (type, category) => {
    const next = { singles: { ...players.singles }, doubles: { ...players.doubles } };
    const arr = type === "singles" ? next.singles[category] : next.doubles[category];
    arr.push("New Name");
    setPlayers(next);
    markDirty(next);
  };

  const updateName = (type, category, idx, value) => {
    const next = { singles: { ...players.singles }, doubles: { ...players.doubles } };
    const arr = type === "singles" ? [...next.singles[category]] : [...next.doubles[category]];
    arr[idx] = value;
    if (type === "singles") next.singles[category] = arr; else next.doubles[category] = arr;
    setPlayers(next);
    markDirty(next);
  };

  const removeName = (type, category, idx) => {
    const next = { singles: { ...players.singles }, doubles: { ...players.doubles } };
    const arr = type === "singles" ? [...next.singles[category]] : [...next.doubles[category]];
    arr.splice(idx, 1);
    if (type === "singles") next.singles[category] = arr; else next.doubles[category] = arr;
    setPlayers(next);
    markDirty(next);
  };

  const doSave = async () => {
    setSaving(true);
    setError("");
    try {
      // save full structured data to server
      await apiPlayersSet(players);
      // re-fetch authoritative copy (ensures immediate visibility)
      await loadPlayers();
      writeLS(draftKey, null); // clear draft
      setToast(true);
      setTimeout(() => setToast(false), 1200);
    } catch (e) {
      setError("Save failed. Draft kept locally; please try again.");
      saveDraft(players);
      setDirty(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-lg">Players saved</div>}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={loadPlayers}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button onClick={doSave} disabled={!dirty || saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? (
        <Card className="p-5 text-zinc-500 text-center">Loading players…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Singles */}
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            <div className="space-y-5">
              {SINGLES_ORDER.map(cat => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat}</div>
                    <Button variant="secondary" onClick={() => addToCategory("singles", cat)}><Plus className="w-4 h-4" /> Add</Button>
                  </div>
                  <div className="space-y-2">
                    {(players.singles[cat] || []).length === 0 ? <div className="text-sm text-zinc-500">No players yet</div> : null}
                    {(players.singles[cat] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updateName("singles", cat, idx, e.target.value)} />
                        <button onClick={() => removeName("singles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Doubles */}
          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div className="space-y-5">
              {DOUBLES_ORDER.map(cat => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat}</div>
                    <Button variant="secondary" onClick={() => addToCategory("doubles", cat)}><Plus className="w-4 h-4" /> Add</Button>
                  </div>
                  <div className="space-y-2">
                    {(players.doubles[cat] || []).length === 0 ? <div className="text-sm text-zinc-500">No pairs yet</div> : null}
                    {(players.doubles[cat] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updateName("doubles", cat, idx, e.target.value)} />
                        <button onClick={() => removeName("doubles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="text-xs text-zinc-500 mt-3">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</div>
    </div>
  );
};

/* ----------------- Fixtures (uses players object) ----------------- */
const flattenPlayersForMode = (playersObj, mode) => {
  // mode: 'singles' or 'doubles'
  if (!playersObj) return [];
  const map = mode === "singles" ? playersObj.singles : playersObj.doubles;
  if (!map) return [];
  return Object.values(map).flat().filter(Boolean);
};

const Fixtures = ({ onBack }) => {
  const [playersObj, setPlayersObj] = useState(emptyPlayers());
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
      try {
        const p = await apiPlayersGet().catch(() => null);
        if (alive && p) setPlayersObj(p);
      } catch {}
      try {
        const fx = await apiFixturesList();
        if (alive) setList(fx.sort((x,y) => (x.start||0) - (y.start||0)));
      } catch {}
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const options = flattenPlayersForMode(playersObj, mode);
  const canAdd = a && b && a !== b && date && time;

  const add = async (e) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = { id: crypto.randomUUID(), mode, sides: [a, b], start, status: "upcoming" };
    await apiFixturesAdd(payload);
    // combine by category sorting requirement: keep list sorted by date
    setList(prev => [...prev, payload].sort((x,y) => (x.start||0)-(y.start||0)));
    setA(""); setB(""); setDate(""); setTime("");
  };

  const remove = async (id) => {
    await apiFixturesRemove(id);
    setList(prev => prev.filter(f => f.id !== id));
  };

  const clear = async () => {
    if (!confirm("Clear ALL fixtures?")) return;
    await apiFixturesClear();
    setList([]);
  };

  const refresh = async () => {
    setList(await apiFixturesList());
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Fixtures</h2>
        <div className="ml-auto flex items-center gap-2"><Button variant="secondary" onClick={refresh}><RefreshCw className="w-4 h-4" /> Refresh</Button><Button variant="secondary" onClick={clear}>Clear All</Button></div>
      </div>

      {loading ? <Card className="p-5 text-center text-zinc-500">Loading…</Card> : (
        <>
          <Card className="p-5 mb-6">
            <div className="font-semibold mb-3">Schedule a Match</div>
            <form onSubmit={add} className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-1"><div className="text-sm mb-1">Type</div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
                  <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
                </div>
              </div>

              <div>
                <div className="text-sm mb-1">{mode === "singles" ? "Player 1" : "Team 1"}</div>
                <select className="w-full rounded-xl border px-3 py-2" value={a} onChange={e => setA(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <div className="text-sm mb-1">{mode === "singles" ? "Player 2" : "Team 2"}</div>
                <select className="w-full rounded-xl border px-3 py-2" value={b} onChange={e => setB(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><div className="text-sm mb-1">Date</div><input type="date" className="w-full rounded-xl border px-3 py-2" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div><div className="text-sm mb-1">Time</div><input type="time" className="w-full rounded-xl border px-3 py-2" value={time} onChange={e => setTime(e.target.value)} /></div>
              </div>

              <div className="md:col-span-4"><Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4" /> Add Fixture</Button></div>
            </form>
          </Card>

          {list.length === 0 ? <Card className="p-5 text-center text-zinc-500">No fixtures yet.</Card> : (
            <div className="space-y-3">
              {list.map(f => (
                <Card key={f.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div>
                    <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()} {f.status === "active" && <span className="ml-2 inline-flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live</span>} {f.status === "completed" && <span className="ml-2 text-zinc-500 text-xs">(completed)</span>}</div>
                  </div>
                  <Button variant="ghost" onClick={() => remove(f.id)} title="Remove"><X className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ----------------- Start match (fixtures) ----------------- */
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

  const list = fixtures.filter(f => (f.mode || "singles") === mode && f.status !== "completed");

  const startFixture = async (fx) => {
    const now = Date.now();
    const patch = { status: "active" };
    if (fx.start > now) patch.start = now;
    // Clear previous active
    for (const other of fixtures) {
      if (other.id !== fx.id && other.status === "active") {
        await apiFixturesUpdate(other.id, { status: "upcoming" });
      }
    }
    await apiFixturesUpdate(fx.id, patch);
    onStartScoring({ mode: fx.mode, sides: fx.sides, startingServer: 0, fixtureId: fx.id });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button><h2 className="text-xl font-bold">Start Match</h2></div>
      <Card className="p-5">
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
        </div>

        {loading ? <div className="text-zinc-500">Loading fixtures…</div> : list.length === 0 ? <div className="text-zinc-500">No fixtures for {mode}.</div> : (
          <div className="space-y-3">
            {list.map(f => (
              <Card key={f.id} className="p-4 flex items-center gap-4">
                <div className="flex-1"><div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>
                <Button onClick={() => startFixture(f)}><Play className="w-4 h-4" /> Start Now</Button>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ----------------- Scoring (FAST4 rules) ----------------- */
/* (keeps same logic as previously: first to 4 games, TB at 3-3 to 5, no-ad next point) */

const nextPointNoAd = (p) => ({ 0: 15, 15: 30, 30: 40, 40: "Game" }[p] ?? p);
const advancePointNoAd = (a, b, who) => {
  let pA = a, pB = b;
  if (who === 0) pA = nextPointNoAd(pA); else pB = nextPointNoAd(pB);
  return [pA, pB];
};

function makeEmptySet() { return { gamesA: 0, gamesB: 0, tie: false, tieA: 0, tieB: 0, finished: false }; }

function setOverFast4(s) {
  if (s.tie) {
    // tiebreak to 5; 4-4 => next point wins (so win-by-1 at / after 5)
    if ((s.tieA >= 5 || s.tieB >= 5) && Math.abs(s.tieA - s.tieB) >= 1) return true;
    return false;
  } else {
    if ((s.gamesA >= 4 || s.gamesB >= 4)) return true;
    return false;
  }
}

function Scoring({ config, onAbort, onComplete }) {
  const { sides, startingServer = 0, fixtureId } = config;
  const [points, setPoints] = useState([0, 0]);
  const [sets, setSets] = useState([makeEmptySet()]);
  const current = sets[sets.length - 1];

  const gameWin = (a, b) => (a === "Game" ? "A" : b === "Game" ? "B" : null);

  const pointTo = (who) => {
    if (current.finished) return;

    if (current.tie) {
      const ns = [...sets];
      const s = { ...current };
      if (who === 0) s.tieA++; else s.tieB++;
      if (setOverFast4(s)) {
        s.finished = true;
        if (s.tieA > s.tieB) s.gamesA = 4; else s.gamesB = 4;
      }
      ns[ns.length - 1] = s;
      setSets(ns);
      if (s.finished) recordResult(s);
      return;
    }

    let [a, b] = advancePointNoAd(points[0], points[1], who);
    setPoints([a, b]);
    const gw = gameWin(a, b);
    if (!gw) return;

    const ns = [...sets];
    const s = { ...current };
    if (gw === "A") s.gamesA++; else s.gamesB++;
    setPoints([0, 0]);

    // tiebreak trigger
    if (s.gamesA === 3 && s.gamesB === 3 && !s.tie && !s.finished) {
      s.tie = true;
      s.tieA = 0; s.tieB = 0;
    } else if (setOverFast4(s)) {
      s.finished = true;
    }

    ns[ns.length - 1] = s;
    setSets(ns);

    if (s.finished) recordResult(s);
  };

  const recordResult = async (setObj) => {
    const scoreline = setObj.tie
      ? `4-3(${Math.max(setObj.tieA, setObj.tieB)}-${Math.min(setObj.tieA, setObj.tieB)})`
      : `${setObj.gamesA}-${setObj.gamesB}`;

    const winner = setObj.gamesA > setObj.gamesB ? sides[0] : sides[1];
    const payload = {
      id: crypto.randomUUID(),
      sides,
      finishedAt: Date.now(),
      scoreline,
      winner,
      mode: config.mode || "singles"
    };

    await apiMatchesAdd(payload);
    if (fixtureId) {
      await apiFixturesUpdate(fixtureId, {
        status: "completed",
        finishedAt: payload.finishedAt,
        winner: payload.winner,
        scoreline: payload.scoreline
      });
    }
    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onAbort}><ChevronLeft className="w-5 h-5" /> Quit</Button><h2 className="text-xl font-bold">Scoring • {sides[0]} vs {sides[1]}</h2></div>

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
          <div className="font-semibold mb-2">Set</div>
          {!current.tie ? <div className="text-sm font-mono">{current.gamesA}-{current.gamesB}</div> : <div className="text-sm font-mono">3-3 • TB {current.tieA}-{current.tieB} {Math.max(current.tieA, current.tieB) === 4 && Math.abs(current.tieA - current.tieB) === 0 ? "(next point wins)" : ""}</div> }
          <div className="text-xs text-zinc-500 mt-2">Fast4: first to 4 games; no-ad at deuce; tiebreak to 5 at 3–3 (4–4 next point wins).</div>
        </div>
      </Card>
    </div>
  );
}

/* ----------------- Results ----------------- */
const Results = ({ onBack }) => {
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fx, ms] = await Promise.all([apiFixturesList(), apiMatchesList()]);
        if (alive) { setFixtures(fx); setMatches(ms); setLoading(false); }
      } catch (e) {
        if (alive) setLoading(false);
      }
    })();
    const iv = setInterval(async () => { try { setFixtures(await apiFixturesList()); setMatches(await apiMatchesList()); } catch {} }, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const active = fixtures.filter(f => f.status === "active");
  const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter(f => f.status === "completed");
  const completed = [...completedFixtures, ...matches.map(m => ({ id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner, mode: m.mode || "singles" }))].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button><h2 className="text-xl font-bold">Results</h2></div>

      {loading ? <Card className="p-6 text-center text-zinc-500">Loading…</Card> : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Active</div>
            {active.length ? active.map(f => (<div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No active match.</div>}

            <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
            {upcoming.length ? upcoming.map(f => (<div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No upcoming fixtures.</div>}
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Completed</div>
            {completed.length ? completed.map(m => (<div key={(m.id || '') + String(m.finishedAt || '')} className="py-2 border-b last:border-0"><div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div><div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner || ""}</span><span className="ml-3 font-mono">{m.scoreline || ""}</span></div></div>)) : <div className="text-zinc-500">No results yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
};

/* ----------------- Viewer (public) ----------------- */
function Viewer() {
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fx, ms] = await Promise.all([apiFixturesList(), apiMatchesList()]);
        if (alive) { setFixtures(fx); setResults(ms); setLoading(false); }
      } catch { if (alive) setLoading(false); }
    })();

    const iv = setInterval(async () => {
      try {
        const [fx, ms] = await Promise.all([apiFixturesList(), apiMatchesList()]);
        setFixtures(fx); setResults(ms);
      } catch {}
    }, 10000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const active = fixtures.filter(f => f.status === "active");
  const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter(f => f.status === "completed");
  const completed = [...completedFixtures, ...results.map(m => ({ id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner, mode: m.mode || "singles" }))].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="app-bg">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6"><h1 className="text-2xl font-bold">RNW Tennis Tournament</h1></div>
        {loading ? <Card className="p-6 text-center text-zinc-500">Loading…</Card> : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="text-lg font-semibold mb-3">Active</div>
              {active.length ? active.map(f => (<div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No live match.</div>}
              <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
              {upcoming.length ? upcoming.map(f => (<div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No upcoming fixtures.</div>}
            </Card>

            <Card className="p-5">
              <div className="text-lg font-semibold mb-3">Completed</div>
              {completed.length ? completed.map(m => (<div key={(m.id||'')+String(m.finishedAt||'')} className="py-2 border-b last:border-0"><div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div><div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner||''}</span> <span className="ml-3 font-mono">{m.scoreline||''}</span></div></div>)) : <div className="text-zinc-500">No completed matches yet.</div>}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------- App Shell ----------------- */
export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const isViewer = path.startsWith("/viewer");
  if (isViewer) return <Viewer />;

  const [view, setView] = useState("landing");
  const [cfg, setCfg] = useState(null);
  const logged = localStorage.getItem("lt_admin") === "1";
  if (!logged) return <AdminLogin onOk={() => window.location.reload()} />;

  return (
    <div className="app-bg">
      <div className="max-w-6xl mx-auto py-8">
        <AnimatePresence mode="wait">
          {view === "landing" && <motion.div key="landing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><Landing onStart={() => setView("start")} onResults={() => setView("results")} onSettings={() => setView("settings")} onFixtures={() => setView("fixtures")} /></motion.div>}
          {view === "settings" && <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><Settings onBack={() => setView("landing")} /></motion.div>}
          {view === "fixtures" && <motion.div key="fixtures" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><Fixtures onBack={() => setView("landing")} /></motion.div>}
          {view === "start" && <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><StartFromFixtures onBack={() => setView("landing")} onStartScoring={(c) => { setCfg(c); setView("scoring"); }} /></motion.div>}
          {view === "scoring" && cfg && <motion.div key="scoring" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><Scoring config={cfg} onAbort={() => setView("landing")} onComplete={() => setView("results")} /></motion.div>}
          {view === "results" && <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><Results onBack={() => setView("landing")} /></motion.div>}
        </AnimatePresence>
      </div>

      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} RNW NPL</footer>
    </div>
  );
}

