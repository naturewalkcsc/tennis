// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* ---------------------- Small helpers ---------------------- */
const buster = () => `?t=${Date.now()}`;
const safeJson = async (res) => {
  try { return await res.json(); } catch { return null; }
};

/* ---------------------- API wrappers (admin) ---------------------- */
/* These call your existing endpoints. They throw on non-OK. */
const apiPlayersGet = async () => {
  const res = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!res.ok) throw new Error("players-get-failed");
  return await res.json();
};
const apiPlayersSet = async (payload) => {
  const res = await fetch("/api/players" + buster(), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload })
  });
  if (!res.ok) throw new Error("players-set-failed");
};

const apiFixturesList = async () => {
  const res = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!res.ok) throw new Error("fixtures-list-failed");
  return await res.json();
};
const apiFixturesAdd = async (payload) => {
  const res = await fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "add", payload }) });
  if (!res.ok) throw new Error("fixtures-add-failed");
};
const apiFixturesUpdate = async (id, patch) => {
  const res = await fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "update", id, patch }) });
  if (!res.ok) throw new Error("fixtures-update-failed");
};
const apiFixturesRemove = async (id) => {
  const res = await fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "remove", id }) });
  if (!res.ok) throw new Error("fixtures-remove-failed");
};

const apiMatchesList = async () => {
  const res = await fetch("/api/matches" + buster(), { cache: "no-store" });
  if (!res.ok) throw new Error("matches-list-failed");
  return await res.json();
};
const apiMatchesAdd = async (payload) => {
  const res = await fetch("/api/matches" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "add", payload }) });
  if (!res.ok) throw new Error("matches-add-failed");
};

/* ---------------------- Data normalization utils ---------------------- */
/* We standardize to the new canonical shape:
   { singles: { "Category A": [...names] }, doubles: { "Cat D": [...pairs] } }
   But accept legacy shapes:
   - { singles: ["A","B"], doubles: ["X/Y", ...] }  (legacy arrays)
   - { singles: {...}, doubles: {...} } (new shape)
*/
const normalizePlayers = (raw) => {
  // if raw is null/undefined -> empty
  if (!raw) return { singles: {}, doubles: {} };
  // If raw.singles is an array -> put into default category
  const singles = Array.isArray(raw.singles) ? { "Players": raw.singles } : (raw.singles || {});
  const doubles = Array.isArray(raw.doubles) ? { "Pairs": raw.doubles } : (raw.doubles || {});
  return { singles, doubles };
};

/* ---------------------- UI primitives ---------------------- */
const Card = ({ children, className = "" }) => <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = "primary", className = "", type = "button", disabled }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium";
  const styles = {
    primary: "bg-green-600 hover:bg-green-700 text-white",
    secondary: "bg-zinc-100 hover:bg-zinc-200",
    ghost: "hover:bg-zinc-100"
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      {children}
    </button>
  );
};

/* ---------------------- Admin login ---------------------- */
function AdminLogin({ onOk }) {
  const [u, setU] = useState("admin"), [p, setP] = useState(""), [err, setErr] = useState("");
  const submit = (e) => { e.preventDefault(); if (u === "admin" && p === "rnwtennis123$") { localStorage.setItem("lt_admin", "1"); onOk(); } else setErr("Invalid credentials"); };
  return (
    <div className="app-bg">
      <div className="max-w-sm mx-auto p-6">
        <div className="mb-6 text-center"><h1 className="text-2xl font-bold">Admin Login</h1><div className="text-sm text-zinc-600">Default: admin / rnwtennis123$</div></div>
        <Card className="p-4">
          <form onSubmit={submit} className="space-y-3">
            <div><div className="text-sm mb-1">Username</div><input className="w-full rounded-xl border px-3 py-2" value={u} onChange={e => setU(e.target.value)} /></div>
            <div><div className="text-sm mb-1">Password</div><input type="password" className="w-full rounded-xl border px-3 py-2" value={p} onChange={e => setP(e.target.value)} /></div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <button type="submit" className="w-full px-4 py-3 rounded-xl bg-green-600 text-white">Enter Admin</button>
          </form>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------- Landing ---------------------- */
const Landing = ({ onStart, onResults, onSettings, onFixtures }) => {
  const Tile = ({ title, subtitle, src, action }) => (
    <motion.button onClick={action} whileHover={{ y: -3 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left">
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
        <h1 className="text-2xl font-bold">RNW Tennis Tournament 2025</h1>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <Tile title="Start Match" subtitle="Choose from fixtures" src={imgStart} action={onStart} />
        <Tile title="Results" subtitle="Active • Upcoming • Completed" src={imgScore} action={onResults} />
        <Tile title="Manage Players" subtitle="Singles & Doubles" src={imgSettings} action={onSettings} />
      </div>
      <div className="mt-6"><Button variant="secondary" onClick={onFixtures}><CalendarPlus className="w-4 h-4" /> Fixtures</Button></div>
    </div>
  );
};

/* ---------------------- Manage Players (admin) ---------------------- */
function ManagePlayers({ onBack }) {
  const SINGLES_CATEGORIES_ORDER = [
    "Women's Singles",
    "Kid's Singles",
    "NW Team (A) Singles",
    "NW Team (B) Singles"
  ];
  const DOUBLES_CATEGORIES_ORDER = [
    "Women's Doubles",
    "Kid's Doubles",
    "NW Team (A) Doubles",
    "NW Team (B) Doubles",
    "Mixed Doubles"
  ];

  const POOLS = ["No Pool", "Pool A", "Pool B"];

  const LS_PLAYERS_DRAFT = "LS_PLAYERS_DRAFT_v2";

  const [players, setPlayers] = React.useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState("");
  const [toast, setToast] = React.useState(false);

  // Helpers to migrate legacy arrays to new object format
  const migrateIfNeeded = (raw) => {
    // Expecting raw = { singles: {...} or [] , doubles: {...} or [] }
    const out = { singles: {}, doubles: {} };

    // helper to convert to object mapping category -> [{name,pool}]
    const toMap = (val) => {
      if (!val) return {};
      // if val is array -> legacy global list? we will put into "Women's Singles" default bucket
      if (Array.isArray(val)) {
        // fallback: put everything into "Women's Singles" as legacy fallback
        return { [SINGLES_CATEGORIES_ORDER[0]]: val.map((n) => ({ name: n, pool: "No Pool" })) };
      }
      // if object mapping categories -> array of strings or array of objects
      const map = {};
      for (const [k, arr] of Object.entries(val)) {
        if (!arr) continue;
        if (!Array.isArray(arr)) {
          // unexpected, skip
          continue;
        }
        map[k] = arr.map((el) => {
          if (typeof el === "string") return { name: el, pool: "No Pool" };
          if (typeof el === "object" && el !== null) {
            // if already object with name & pool, honor it; if only name property exists that's fine
            return { name: String(el.name || el.label || ""), pool: String(el.pool || "No Pool") };
          }
          return { name: String(el), pool: "No Pool" };
        });
      }
      return map;
    };

    out.singles = toMap(raw.singles);
    out.doubles = toMap(raw.doubles);
    return out;
  };

  // Local draft helpers
  const saveDraft = (obj) => {
    try {
      localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify(obj));
    } catch (e) {}
  };
  const loadDraft = () => {
    try {
      const s = localStorage.getItem(LS_PLAYERS_DRAFT);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  };
  const clearDraft = () => {
    try { localStorage.removeItem(LS_PLAYERS_DRAFT); } catch (e) {}
  };

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // prefer draft if present
      const draft = loadDraft();
      if (draft) {
        if (!alive) return;
        setPlayers(draft);
        setDirty(true);
        setLoading(false);
        return;
      }
      try {
        const obj = await apiPlayersGet();
        if (!alive) return;
        const migrated = migrateIfNeeded(obj || { singles: {}, doubles: {} });
        // Ensure categories present (so UI shows empty boxes)
        SINGLES_CATEGORIES_ORDER.forEach((c) => { if (!migrated.singles[c]) migrated.singles[c] = []; });
        DOUBLES_CATEGORIES_ORDER.forEach((c) => { if (!migrated.doubles[c]) migrated.doubles[c] = []; });
        setPlayers(migrated);
      } catch (e) {
        console.warn("Could not load players", e);
        setError("Could not load players (KV off?). You can edit and Save to retry.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const markDirty = (newPlayers) => {
    setDirty(true);
    saveDraft(newPlayers);
    setPlayers(newPlayers);
  };

  // Generic updater for a particular category (type = 'singles' or 'doubles', category = string)
  const updateCategory = (type, category, updater) => {
    setPlayers((prev) => {
      const copy = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      const arr = (type === "singles" ? copy.singles[category] : copy.doubles[category]) || [];
      const updated = updater(arr.slice());
      if (type === "singles") copy.singles[category] = updated;
      else copy.doubles[category] = updated;
      markDirty(copy);
      return copy;
    });
  };

  // add player/pair
  const addItem = (type, category, name = "New Player", pool = "No Pool") => {
    updateCategory(type, category, (arr) => {
      arr.push({ name, pool });
      return arr;
    });
  };
  const updateItem = (type, category, idx, patch) => {
    updateCategory(type, category, (arr) => {
      arr[idx] = { ...arr[idx], ...patch };
      return arr;
    });
  };
  const deleteItem = (type, category, idx) => {
    updateCategory(type, category, (arr) => {
      arr.splice(idx, 1);
      return arr;
    });
  };

  const doSave = async () => {
    setSaving(true);
    setError("");
    try {
      // The server expects JSON. We will send object mapping category->array of objects {name,pool}
      await apiPlayersSet({ singles: players.singles, doubles: players.doubles });
      setDirty(false);
      clearDraft();
      setToast(true);
      setTimeout(() => setToast(false), 1100);
    } catch (e) {
      console.error(e);
      setError("Save failed. Make sure KV is configured. Draft saved locally.");
      saveDraft(players);
      setDirty(true);
    } finally {
      setSaving(false);
    }
  };

  const doRefresh = async () => {
    setLoading(true);
    setError("");
    try {
      const obj = await apiPlayersGet();
      const migrated = migrateIfNeeded(obj || { singles: {}, doubles: {} });
      SINGLES_CATEGORIES_ORDER.forEach((c) => { if (!migrated.singles[c]) migrated.singles[c] = []; });
      DOUBLES_CATEGORIES_ORDER.forEach((c) => { if (!migrated.doubles[c]) migrated.doubles[c] = []; });
      setPlayers(migrated);
      setDirty(false);
      clearDraft();
    } catch (e) {
      console.error(e);
      setError("Refresh failed.");
    } finally {
      setLoading(false);
    }
  };

  // UI render helpers
  const CategoryCard = ({ type, category, arr }) => {
    // Group by pool for display
    const pooled = {};
    (arr || []).forEach((it) => {
      const pool = it.pool || "No Pool";
      if (!pooled[pool]) pooled[pool] = [];
      pooled[pool].push(it);
    });
    return (
      <div className="card category-card" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>{category} <span style={{ fontWeight: 400, fontSize: 12, color: "#6b7280", marginLeft: 8 }}>({arr.length})</span></div>
          <div>
            <button className="btn ghost" onClick={() => addItem(type, category, "New Player", "No Pool")}>+ Add</button>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          {POOLS.map((pool) => {
            const list = pooled[pool] || [];
            if (list.length === 0 && pool !== "No Pool") return null; // hide empty pools except "No Pool" maybe show counts
            return (
              <div key={pool} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{pool === "No Pool" ? "" : pool}</div>
                <ul style={{ marginLeft: 18 }}>
                  {list.map((it, idx) => {
                    // Need to compute original index within arr for update/delete.
                    // Find index of this exact element by name+pool (there may be duplicates but ok).
                    const originalIndex = arr.findIndex((x) => x === it);
                    return (
                      <li key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <input
                          value={it.name}
                          onChange={(e) => updateItem(type, category, originalIndex, { name: e.target.value })}
                          style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #e6edf3" }}
                        />
                        <select
                          value={it.pool || "No Pool"}
                          onChange={(e) => updateItem(type, category, originalIndex, { pool: e.target.value })}
                          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e6edf3" }}
                        >
                          {POOLS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <button className="btn ghost" title="Delete" onClick={() => deleteItem(type, category, originalIndex)}>🗑️</button>
                      </li>
                    );
                  })}
                  {list.length === 0 && <div style={{ color: "#6b7280", fontSize: 13 }}>No entries</div>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-lg">Players saved</div>}
      <div className="flex items-center gap-3 mb-6">
        <button className="btn ghost" onClick={onBack}>◀ Back</button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn secondary" onClick={doRefresh}><span>⟳</span> Refresh</button>
          <button className="btn" onClick={doSave} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>

      {error && <div className="card" style={{ background: "#fff1f2", color: "#991b1b", borderColor: "#fecaca" }}>{error}</div>}

      {loading ? <div className="card">Loading players…</div> : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 style={{ margin: "8px 0 10px" }}>Singles</h3>
              {SINGLES_CATEGORIES_ORDER.map((cat) => (
                <CategoryCard key={cat} type="singles" category={cat} arr={(players.singles && players.singles[cat]) || []} />
              ))}
            </div>
            <div>
              <h3 style={{ margin: "8px 0 10px" }}>Doubles</h3>
              {DOUBLES_CATEGORIES_ORDER.map((cat) => (
                <CategoryCard key={cat} type="doubles" category={cat} arr={(players.doubles && players.doubles[cat]) || []} />
              ))}
            </div>
          </div>
          <div className="text-xs text-zinc-500 mt-3">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</div>
        </>
      )}
    </div>
  );
}

/* ---------------------- Fixtures admin (simplified) ---------------------- */
function FixturesAdmin({ onBack }) {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [mode, setMode] = useState("singles");
  const [category, setCategory] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const SINGLES_ORDER = ["Women's Singles","Kid's Singles","NW Team (A) Singles","NW Team (B) Singles"];
  const DOUBLES_ORDER = ["Women's Doubles","Kid's Doubles","NW Team (A) Doubles","NW Team (B) Doubles","Mixed Doubles"];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rawPlayers = await apiPlayersGet();
        const norm = normalizePlayers(rawPlayers);
        if (!alive) return;
        setPlayers(norm);
        // pick first category by default if available
        const defaults = mode === "singles" ? (SINGLES_ORDER.find(k => (norm.singles[k]||[]).length>0) || Object.keys(norm.singles)[0]) : (DOUBLES_ORDER.find(k => (norm.doubles[k]||[]).length>0) || Object.keys(norm.doubles)[0]);
        setCategory(defaults || "");
      } catch (e) {
        console.error(e);
      }
      try { const fx = await apiFixturesList(); if (alive) setList(fx || []); } catch { }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [mode]);

  const optionsForCategory = (mode === "singles") ? (players.singles[category] || []) : (players.doubles[category] || []);
  const canAdd = category && a && b && a !== b && date && time;

  const add = async (e) => {
    e.preventDefault();
    const payload = { id: crypto.randomUUID(), mode, category, sides: [a, b], start: new Date(`${date}T${time}:00`).getTime(), status: "upcoming" };
    await apiFixturesAdd(payload);
    setList(prev => [...prev, payload].sort((x,y) => x.start - y.start));
    setA(""); setB(""); setDate(""); setTime("");
  };

  const remove = async (id) => { await apiFixturesRemove(id); setList(prev => prev.filter(f => f.id !== id)); };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Fixtures</h2>
      </div>

      {loading ? <Card className="p-5 text-center text-zinc-500">Loading…</Card> : (
        <>
          <Card className="p-5 mb-6">
            <div className="font-semibold mb-3">Schedule a Match</div>
            <form onSubmit={add} className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <div className="text-sm mb-1">Type</div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode==="singles"} onChange={() => { setMode("singles"); setCategory(""); }} /> Singles</label>
                  <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode==="doubles"} onChange={() => { setMode("doubles"); setCategory(""); }} /> Doubles</label>
                </div>
              </div>

              <div>
                <div className="text-sm mb-1">Category</div>
                <select className="w-full rounded-xl border px-3 py-2" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Choose…</option>
                  { (mode === "singles" ? SINGLES_ORDER : DOUBLES_ORDER).map(k => <option key={k} value={k}>{k}</option>) }
                </select>
              </div>

              <div>
                <div className="text-sm mb-1">{mode === "singles" ? "Player 2" : "Team 2"}</div>
                <select className="w-full rounded-xl border px-3 py-2" value={b} onChange={e => setB(e.target.value)}>
                  <option value="">Choose…</option>
                  {optionsForCategory.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-sm mb-1">Date</div>
                  <input type="date" className="w-full rounded-xl border px-3 py-2" value={date} onChange={e=>setDate(e.target.value)} />
                </div>
                <div>
                  <div className="text-sm mb-1">Time</div>
                  <input type="time" className="w-full rounded-xl border px-3 py-2" value={time} onChange={e=>setTime(e.target.value)} />
                </div>
              </div>

              <div className="md:col-span-4">
                <Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4" /> Add Fixture</Button>
              </div>
            </form>
          </Card>

          {list.length === 0 ? <Card className="p-5 text-center text-zinc-500">No fixtures yet.</Card> : (
            <div className="space-y-3">
              {list.map(f => (
                <Card key={f.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode || f.category || "—"}</span></div>
                    <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()} {f.status === "active" && (<span className="ml-2 text-emerald-600">Live</span>)}</div>
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
}

/* ---------------------- StartFromFixtures (admin start) ---------------------- */
function StartFromFixtures({ onBack, onStartScoring }) {
  const [mode, setMode] = useState("singles");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const fx = await apiFixturesList(); if (alive) setFixtures(fx || []); }
      catch (e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const list = fixtures.filter(f => (f.mode || "singles") === mode && f.status !== "completed");

  const startFixture = async (fx) => {
    // mark active (serverside)
    try {
      const now = Date.now();
      const patch = { status: "active" };
      if (fx.start > now) patch.start = now;
      // demote other active
      for (const other of fixtures) {
        if (other.id !== fx.id && other.status === "active") {
          await apiFixturesUpdate(other.id, { status: "upcoming" });
        }
      }
      await apiFixturesUpdate(fx.id, patch);
      if (typeof onStartScoring === "function") {
        onStartScoring({ mode: fx.mode, sides: fx.sides, startingServer: 0, fixtureId: fx.id });
      } else {
        alert("Started: " + (fx.sides?.join(" vs ") || ""));
      }
    } catch (e) {
      console.error(e);
      alert("Start failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button><h2 className="text-xl font-bold">Start Match</h2></div>
      <Card className="p-5">
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode==="singles"} onChange={()=>setMode("singles")} /> Singles</label>
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode==="doubles"} onChange={()=>setMode("doubles")} /> Doubles</label>
        </div>
        {loading ? <div className="text-zinc-500">Loading fixtures…</div> : list.length === 0 ? <div className="text-zinc-500">No fixtures for {mode}.</div> : (
          <div className="space-y-3">
            {list.map(f => (
              <Card key={f.id} className="p-4 flex items-center gap-4">
                <div className="flex-1"><div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>
                <Button onClick={()=>startFixture(f)}><Play className="w-4 h-4" /> Start Now</Button>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------------- FAST4 Scoring (no-ad / tiebreak at 3-3) ---------------------- */
/* Implementation purposely compact — same behavior as earlier Fast4 rules provided */
const nextPointNoAd = (p) => ({ 0: 15, 15: 30, 30: 40, 40: "Game" }[p] ?? p);
function advancePointNoAd(a, b, who) { let pA = a, pB = b; if (who === 0) pA = nextPointNoAd(pA); else pB = nextPointNoAd(pB); return [pA, pB]; }
//function makeEmptySet() { return { gamesA: 0, gamesB: 0, tie: false, tieA: 0, tieB: 0, finished: false }; }
function setOverFast4(s) {
  if (s.tie) {
    if ((s.tieA >= 5 || s.tieB >= 5) && Math.abs(s.tieA - s.tieB) >= 1) return true;
    // next-point-wins handled by tie scoring logic where 4-4 => next
    return false;
  } else {
    if (s.gamesA === 3 && s.gamesB === 3) return false;
    if (s.gamesA >= 4 || s.gamesB >= 4) return true;
    return false;
  }
}

/* ---------------------- Scoring Logic (Qualifiers/Semis vs Final) ---------------------- */

/**
 * We support two match types inside the same Scoring component:
 *
 *  - Qualifiers / Semifinals (default if config.matchType is not "final")
 *      • Set: Fast4 (first to 4 games)
 *      • Tie-break at 3–3:
 *          - To 5 points, win by 2
 *          - If it reaches 5–5, next point wins (max 6–5)
 *      • Limited deuce:
 *          - Max 1 deuce (1st time at 40–40)
 *          - From 2nd deuce onward, next point wins (golden point)
 *
 *  - Final (if config.matchType === "final")
 *      • Set: first to 6 games, win by 2
 *      • Tie-break at 6–6:
 *          - To 7 points, win by 2
 *          - If it reaches 10–10, next point wins (max 11–10)
 *      • Limited deuce:
 *          - Max 3 deuces (up to 3 times at 40–40)
 *          - From 4th deuce onward, next point wins (golden point)
 */

/** Convert internal integer points to tennis style 0/15/30/40 for display */
const mapPointToTennis = (p) => {
  if (p <= 0) return 0;
  if (p === 1) return 15;
  if (p === 2) return 30;
  return 40;
};

function makeEmptySet(matchType) {
  return {
    matchType,       // "regular" | "final"
    gamesA: 0,
    gamesB: 0,
    tie: false,
    tieA: 0,
    tieB: 0,
    finished: false,
  };
}

function Scoring({ config, onAbort, onComplete }) {
  const { sides = ["A", "B"], fixtureId, matchType: cfgMatchType } = config || {};
  const matchType = cfgMatchType === "final" ? "final" : "regular"; // default: qualifiers/semis

  const [points, setPoints] = useState([0, 0]);   // raw integer points in the current game
  const [deuceCount, setDeuceCount] = useState(0); // how many times we've reached deuce (>=3-3)
  const [sets, setSets] = useState(() => [makeEmptySet(matchType)]);

  const current = sets[sets.length - 1];

  /** Async result recorder – called when the single set finishes */
  const recordResult = async (setObj) => {
    // Build scoreline: e.g. "4-3(6-5)" or "7-6(7-5)" or "6-4"
    let scoreline;
    if (setObj.tie) {
      const main = `${setObj.gamesA}-${setObj.gamesB}`;
      const hi = Math.max(setObj.tieA, setObj.tieB);
      const lo = Math.min(setObj.tieA, setObj.tieB);
      scoreline = `${main}(${hi}-${lo})`;
    } else {
      scoreline = `${setObj.gamesA}-${setObj.gamesB}`;
    }

    const winnerName = setObj.gamesA > setObj.gamesB ? sides[0] : sides[1];
    const payload = {
      id: crypto.randomUUID(),
      sides,
      finishedAt: Date.now(),
      scoreline,
      winner: winnerName,
      mode: config.mode || "singles",
      matchType, // optional: persisted for reference
    };

    try {
      await apiMatchesAdd(payload);
      if (fixtureId) {
        await apiFixturesUpdate(fixtureId, {
          status: "completed",
          finishedAt: payload.finishedAt,
          winner: payload.winner,
          scoreline: payload.scoreline,
        });
      }
    } catch (e) {
      console.error(e);
    }

    onComplete();
  };

  const pointTo = (who) => {
    if (!current || current.finished) return;

    const isFinal = matchType === "final";

    // ----- Tie-break mode -----
    if (current.tie) {
      const ns = [...sets];
      const s = { ...current };

      if (who === 0) s.tieA += 1;
      else s.tieB += 1;

      const a = s.tieA;
      const b = s.tieB;
      let finished = false;

      if (!isFinal) {
        // QUALIFIER/SEMI TIE-BREAK:
        // To 5 points, win by 2; if 5–5, next point wins (max 6–5).
        if ((a >= 5 || b >= 5) && Math.abs(a - b) >= 2) {
          finished = true;
        } else if ((a >= 6 || b >= 6) && Math.abs(a - b) >= 1) {
          // 6–5 or 5–6 after 5–5 ⇒ winner
          finished = true;
        }

        if (finished) {
          s.finished = true;
          if (a > b) {
            s.gamesA = 4;
            s.gamesB = 3;
          } else {
            s.gamesA = 3;
            s.gamesB = 4;
          }
        }
      } else {
        // FINAL TIE-BREAK:
        // To 7 points, win by 2; if 10–10, next point wins (max 11–10).
        if ((a >= 7 || b >= 7) && Math.abs(a - b) >= 2) {
          finished = true;
        } else if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 1) {
          // After 10–10, 11–10 or 10–11 wins
          finished = true;
        }

        if (finished) {
          s.finished = true;
          if (a > b) {
            s.gamesA = 7;
            s.gamesB = 6;
          } else {
            s.gamesA = 6;
            s.gamesB = 7;
          }
        }
      }

      ns[ns.length - 1] = s;
      setSets(ns);
      if (s.finished) recordResult(s);
      return;
    }

    // ----- Normal game mode -----
    const limitDeuces = isFinal ? 3 : 1; // # of deuces allowed before golden point

    let [pA, pB] = points;
    if (who === 0) pA += 1;
    else pB += 1;

    let newDeuceCount = deuceCount;
    if (pA >= 3 && pB >= 3 && pA === pB) {
      // reached a deuce (>= 40-40)
      newDeuceCount += 1;
    }

    let winnerGame = null;
    if (pA >= 4 || pB >= 4) {
      const diff = Math.abs(pA - pB);
      // Before (limitDeuces + 1)th deuce → need 2-point margin
      // From (limitDeuces + 1)th deuce onward → golden point (1-point margin)
      const threshold = newDeuceCount >= (limitDeuces + 1) ? 1 : 2;
      if (diff >= threshold) {
        winnerGame = pA > pB ? "A" : "B";
      }
    }

    if (!winnerGame) {
      // Game continues
      setPoints([pA, pB]);
      setDeuceCount(newDeuceCount);
      return;
    }

    // Someone won the game -> reset points & deuce counter
    setPoints([0, 0]);
    setDeuceCount(0);

    // Update set score
    const ns = [...sets];
    const s = { ...current };

    if (winnerGame === "A") s.gamesA += 1;
    else s.gamesB += 1;

    // Decide if we enter tie-break or finish the set
    if (!s.tie) {
      if (!isFinal) {
        // QUALIFIERS / SEMIS (Fast4)
        if (s.gamesA === 3 && s.gamesB === 3) {
          // Tie-break at 3–3
          s.tie = true;
          s.tieA = 0;
          s.tieB = 0;
        } else if (s.gamesA >= 4 || s.gamesB >= 4) {
          // First to 4 games wins (no win-by-2 once not at 3–3)
          s.finished = true;
        }
      } else {
        // FINAL (full set)
        if ((s.gamesA >= 6 || s.gamesB >= 6) && Math.abs(s.gamesA - s.gamesB) >= 2) {
          // Normal 6+ games, win by 2 (e.g. 6–4, 7–5, 8–6)
          s.finished = true;
        } else if (s.gamesA === 6 && s.gamesB === 6) {
          // Tie-break at 6–6
          s.tie = true;
          s.tieA = 0;
          s.tieB = 0;
        }
      }
    }

    ns[ns.length - 1] = s;
    setSets(ns);
    if (s.finished) recordResult(s);
  };

  const displayPointsA = mapPointToTennis(points[0]);
  const displayPointsB = mapPointToTennis(points[1]);

  const description =
    matchType === "final"
      ? "Final: one full set to 6 (win by 2). Tie-break to 7 at 6–6 (win by 2; at 10–10 next point wins). Limited deuces: max 3; from 4th deuce onward, golden point."
      : "Qualifiers / Semis: Fast4 to 4 games. Tie-break to 5 at 3–3 (win by 2; at 5–5 next point wins). Limited deuces: max 1; from 2nd deuce onward, golden point.";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onAbort}>
          <ChevronLeft className="w-5 h-5" /> Quit
        </Button>
        <h2 className="text-xl font-bold">
          Scoring • {sides[0]} vs {sides[1]}
          {matchType === "final" && <span className="ml-3 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">Final</span>}
        </h2>
      </div>
      <Card className="p-6">
        {/* Points */}
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-right text-3xl font-bold">{String(displayPointsA)}</div>
          <div className="text-center">—</div>
          <div className="text-3xl font-bold">{String(displayPointsB)}</div>
        </div>

        {/* Buttons */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Button onClick={() => pointTo(0)} className="w-full">
            Point {sides[0]}
          </Button>
          <Button onClick={() => pointTo(1)} className="w-full">
            Point {sides[1]}
          </Button>
        </div>

        {/* Set & tie-break info */}
        <div className="mt-6">
          <div className="font-semibold mb-2">Set</div>
          {!current.tie ? (
            <div className="text-sm font-mono">
              {current.gamesA}-{current.gamesB}
            </div>
          ) : (
            <div className="text-sm font-mono">
              {matchType === "final" ? "6-6" : "3-3"} • TB {current.tieA}-{current.tieB}
            </div>
          )}
          <div className="text-xs text-zinc-500 mt-2">{description}</div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------- Results admin ---------------------- */
function ResultsAdmin({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try { const fx = await apiFixturesList(); const ms = await apiMatchesList(); if (!alive) return; setFixtures(fx || []); setMatches(ms || []); }
      catch (e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    const iv = setInterval(async () => {
      try { setFixtures(await apiFixturesList()); setMatches(await apiMatchesList()); } catch {}
    }, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const active = fixtures.filter(f => f.status === "active");
  const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter(f => f.status === "completed");
  const completed = [...completedFixtures, ...matches.map(m => ({ id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner, mode: m.mode || "singles" }))].sort((a,b) => (b.finishedAt||0)-(a.finishedAt||0));

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
            {completed.length ? completed.map(m => (<div key={(m.id||'')+String(m.finishedAt||'')} className="py-2 border-b last:border-0"><div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div><div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner||''}</span> <span className="ml-3 font-mono">{m.scoreline||''}</span></div></div>)) : <div className="text-zinc-500">No results yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------- App shell ---------------------- */
export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  // If path begins with /viewer, load the public viewer (decoupled).
  if (path.startsWith("/viewer")) {
    return <ViewerPageStandalone />; // defined at bottom
  }

  const logged = localStorage.getItem("lt_admin") === "1";
  if (!logged) return <AdminLogin onOk={() => window.location.reload()} />;

  const [view, setView] = useState("landing");
  const [cfg, setCfg] = useState(null);

  return (
    <div className="app-bg">
      <div className="max-w-6xl mx-auto py-8">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Landing onStart={() => setView("start")} onResults={() => setView("results")} onSettings={() => setView("settings")} onFixtures={() => setView("fixtures")} />
            </motion.div>
          )}
          {view === "settings" && <motion.div key="settings" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}><ManagePlayers onBack={() => setView("landing")} /></motion.div>}
          {view === "fixtures" && <motion.div key="fixtures" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}><FixturesAdmin onBack={() => setView("landing")} /></motion.div>}
          {view === "start" && <motion.div key="start" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}><StartFromFixtures onBack={() => setView("landing")} onStartScoring={(c) => { setCfg(c); setView("scoring"); }} /></motion.div>}
          {view === "scoring" && cfg && <motion.div key="scoring" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}><Scoring config={cfg} onAbort={() => setView("landing")} onComplete={() => setView("results")} /></motion.div>}
          {view === "results" && <motion.div key="results" initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }}><ResultsAdmin onBack={() => setView("landing")} /></motion.div>}
        </AnimatePresence>
      </div>
      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} RNW NPL</footer>
    </div>
  );
}

/* ---------------------- Viewer standalone (public) ---------------------- */
function ViewerPageStandalone() {
  // simple wrapper to mount the Viewer from earlier (decoupled)
  return <Viewer />;
}

/* ---------------------- Public Viewer component ---------------------- */
// Viewer component — replace the existing function Viewer() in App.jsx with this
function Viewer() {
  console.log("Viewer mounted"); // debug: confirms this component ran
  const [view, setView] = React.useState("landing"); // landing | rules | teams | fixtures
  const [fixtures, setFixtures] = React.useState([]);
  const [matches, setMatches] = React.useState([]);
  const [playersObj, setPlayersObj] = React.useState({ singles: [], doubles: [] });
  const [loading, setLoading] = React.useState(true);

  const busterLocal = () => `?t=${Date.now()}`;

  // minimal api wrappers here (independent, so Viewer doesn't import other local helpers)
  const apiFixturesListLocal = async () => {
    const r = await fetch("/api/fixtures" + busterLocal(), { cache: "no-store" });
    if (!r.ok) throw new Error("fixtures fetch failed");
    return await r.json();
  };
  const apiMatchesListLocal = async () => {
    const r = await fetch("/api/matches" + busterLocal(), { cache: "no-store" });
    if (!r.ok) throw new Error("matches fetch failed");
    return await r.json();
  };
  const apiPlayersGetLocal = async () => {
    const r = await fetch("/api/players" + busterLocal(), { cache: "no-store" });
    if (!r.ok) throw new Error("players fetch failed");
    return await r.json();
  };

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fx, ms, pl] = await Promise.allSettled([
          apiFixturesListLocal(),
          apiMatchesListLocal(),
          apiPlayersGetLocal(),
        ]);
        if (!alive) return;

        if (fx.status === "fulfilled") setFixtures(Array.isArray(fx.value) ? fx.value : []);
        else setFixtures([]);

        if (ms.status === "fulfilled") setMatches(Array.isArray(ms.value) ? ms.value : []);
        else setMatches([]);

        if (pl.status === "fulfilled") {
          // player data can be legacy (array) or new object {singles:..., doubles:...}
          const p = pl.value;
          if (Array.isArray(p)) {
            // legacy: treat as singles array
            setPlayersObj({ singles: p, doubles: [] });
          } else if (p && typeof p === "object") {
            setPlayersObj({
              singles: Array.isArray(p.singles) ? p.singles : [],
              doubles: Array.isArray(p.doubles) ? p.doubles : [],
            });
          } else {
            setPlayersObj({ singles: [], doubles: [] });
          }
        } else {
          setPlayersObj({ singles: [], doubles: [] });
        }
      } catch (e) {
        console.error("Viewer load error", e);
        setFixtures([]);
        setMatches([]);
        setPlayersObj({ singles: [], doubles: [] });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // live refresh every 10s for fixtures/matches so viewer stays live
    const iv = setInterval(async () => {
      try {
        const [fx, ms] = await Promise.all([apiFixturesListLocal(), apiMatchesListLocal()]);
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch (e) {
        // ignore transient errors
      }
    }, 10000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // Helpers to compute views
  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter((f) => f.status === "completed");
  const completed = [
    ...completedFixtures,
    ...matches.map((m) => ({
      id: m.id,
      sides: m.sides,
      finishedAt: m.finishedAt,
      scoreline: m.scoreline,
      winner: m.winner,
      mode: m.mode || "singles",
    })),
  ].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  // Simple card tile used in landing
  const Tile = ({ title, subtitle, src, onClick }) => (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left"
    >
      <div className="h-40 relative">
        <img src={src} className="absolute inset-0 w-full h-full object-cover" alt="" />
      </div>
      <div className="p-4">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-zinc-600">{subtitle}</div>
      </div>
    </motion.button>
  );

  // Renders each dedicated page
  if (view === "rules") {
    return (
      <div className="app-bg">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" onClick={() => setView("landing")}>
              <ChevronLeft className="w-5 h-5" /> Back
            </Button>
            <h2 className="text-xl font-bold">Rules</h2>
          </div>
          <Card className="p-5">
            <h3 className="font-semibold mb-2">Qualifiers and Semifinal Matches Format</h3>
            <ol className="list-decimal pl-6 mb-4">
              <li>First to four games wins — First player/team to reach 4 games wins a set.</li>
              <li>
                Tiebreak at 3-3 — At 3-3 a tiebreak is played. The tiebreak is won by the first player to reach 5
                points. If it reaches 4-4, next point wins.
              </li>
              <li>No-adv scoring — at deuce (40-40) next point decides the game. Receiver chooses receiving side.</li>
            </ol>

            <h3 className="font-semibold mb-2">Final Matches format</h3>
            <ol className="list-decimal pl-6">
              <li>One full set - standard set rule of 6 games and tie-break followed.</li>
              <li>
                Limited Deuce Points: Max 3 deuce points allowed. At 4th deuce point the next point decides the game.
              </li>
            </ol>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "teams") {
    // Render teams page (colored boxes by category) — attempt to preserve your styling
    const SINGLES_CATEGORIES_ORDER = [
      "Women's Singles",
      "Kid's Singles",
      "NW Team (A) Singles",
      "NW Team (B) Singles",
    ];
    const DOUBLES_CATEGORIES_ORDER = [
      "Women's Doubles",
      "Kid's Doubles",
      "NW Team (A) Doubles",
      "NW Team (B) Doubles",
      "Mixed Doubles",
    ];

    const singlesByCategory = playersObj.singles && !Array.isArray(playersObj.singles)
      ? playersObj.singles
      : (() => {
          // if singles is array (legacy), put it in "Women's Singles" as fallback
          const map = {};
          SINGLES_CATEGORIES_ORDER.forEach((c) => (map[c] = []));
          if (Array.isArray(playersObj.singles)) map["Women's Singles"] = playersObj.singles.slice();
          return map;
        })();

    const doublesByCategory = playersObj.doubles && !Array.isArray(playersObj.doubles)
      ? playersObj.doubles
      : (() => {
          const map = {};
          DOUBLES_CATEGORIES_ORDER.forEach((c) => (map[c] = []));
          if (Array.isArray(playersObj.doubles)) map["Women's Doubles"] = playersObj.doubles.slice();
          return map;
        })();

    const colored = [
      "bg-emerald-100",
      "bg-sky-100",
      "bg-amber-100",
      "bg-violet-100",
      "bg-rose-100",
      "bg-lime-100",
    ];

    return (
      <div className="app-bg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" onClick={() => setView("landing")}>
              <ChevronLeft className="w-5 h-5" /> Back
            </Button>
            <h2 className="text-xl font-bold">Teams</h2>
          </div>

          <Card className="p-5 mb-6">
            <div className="text-lg font-semibold mb-3">Singles</div>
            <div className="grid md:grid-cols-2 gap-4">
              {SINGLES_CATEGORIES_ORDER.map((cat, idx) => {
                const list = (singlesByCategory && singlesByCategory[cat]) || [];
                return (
                  <div key={cat} className={`p-4 rounded-lg ${colored[idx % colored.length]}`}>
                    <div className="font-semibold mb-2">{cat} <span className="text-sm text-zinc-600 float-right">{list.length} players</span></div>
                    <ul className="list-disc pl-5">
                      {list.map((n, i) => <li key={i}>{n}</li>)}
                      {list.length === 0 && <li className="text-zinc-500">—</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Doubles</div>
            <div className="grid md:grid-cols-2 gap-4">
              {DOUBLES_CATEGORIES_ORDER.map((cat, idx) => {
                const list = (doublesByCategory && doublesByCategory[cat]) || [];
                return (
                  <div key={cat} className={`p-4 rounded-lg ${colored[(idx+2) % colored.length]}`}>
                    <div className="font-semibold mb-2">{cat} <span className="text-sm text-zinc-600 float-right">{list.length} teams</span></div>
                    <ul className="list-disc pl-5">
                      {list.map((n, i) => <li key={i}>{n}</li>)}
                      {list.length === 0 && <li className="text-zinc-500">—</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "fixtures") {
    return (
      <div className="app-bg">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" onClick={() => setView("landing")}>
              <ChevronLeft className="w-5 h-5" /> Back
            </Button>
            <h2 className="text-xl font-bold">Fixture / Scores</h2>
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
                )) : <div className="text-zinc-500">No live match.</div>}

                <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
                {upcoming.length ? upcoming.map((f) => (
                  <div key={f.id} className="py-2 border-b last:border-0">
                    <div className="font-medium">
                      {f.sides?.[0]} vs {f.sides?.[1]}
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span>
                    </div>
                    <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                  </div>
                )) : <div className="text-zinc-500">No upcoming fixtures.</div>}
              </Card>

              <Card className="p-5">
                <div className="text-lg font-semibold mb-3">Completed</div>
                {completed.length ? completed.map((m) => (
                  <div key={(m.id||"") + String(m.finishedAt||"")} className="py-2 border-b last:border-0">
                    <div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div>
                    <div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div>
                    <div className="mt-1 text-sm">
                      <span className="uppercase text-zinc-400 text-xs">Winner</span>{" "}
                      <span className="font-semibold">{m.winner||''}</span>{" "}
                      <span className="ml-3 font-mono">{m.scoreline||''}</span>
                    </div>
                  </div>
                )) : <div className="text-zinc-500">No completed matches yet.</div>}
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // default landing with tiles
  return (
    <div className="app-bg">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-2xl font-bold">RNW Tennis Tournament</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Tile title="Rules" subtitle="Match rules and formats" src={imgStart} action={() => setView("rules")} />
          <Tile title="Teams" subtitle="View players by category" src={imgScore} action={() => setView("teams")} />
          <Tile title="Fixture/Scores" subtitle="Live, upcoming & recent results" src={imgSettings} action={() => setView("fixtures")} />
        </div>
      </div>
    </div>
  );
}

