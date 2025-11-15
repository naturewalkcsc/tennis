// App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";

// ✅ Images live in src/ (same folder as this file or adjust paths accordingly)
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* ----------------- Local helpers ----------------- */
const LS_MATCHES_FALLBACK = "lt_matches_fallback";
const LS_PLAYERS_DRAFT = "lt_players_draft";
const readLS = (k, f) => {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; }
};
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const buster = () => "?t=" + Date.now();

/* ----------------- API wrappers ----------------- */
const apiPlayersGet = async () => {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw 0;
  return await r.json();
};
const apiPlayersSet = async (obj) => {
  const r = await fetch("/api/players" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: obj }),
  });
  if (!r.ok) throw 0;
};
const apiMatchesList = async () => {
  try {
    const r = await fetch("/api/matches" + buster(), { cache: "no-store" });
    if (!r.ok) throw 0;
    return await r.json();
  } catch {
    return readLS(LS_MATCHES_FALLBACK, []);
  }
};
const apiMatchesAdd = async (payload) => {
  try {
    const r = await fetch("/api/matches" + buster(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", payload }),
    });
    if (!r.ok) throw 0;
  } catch {
    const list = readLS(LS_MATCHES_FALLBACK, []);
    list.unshift(payload);
    writeLS(LS_MATCHES_FALLBACK, list);
  }
};

const apiFixturesList = async () => {
  const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!r.ok) throw 0;
  return await r.json();
};
const apiFixturesAdd = async (payload) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", payload }),
  });
  if (!r.ok) throw 0;
};
const apiFixturesRemove = async (id) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "remove", id }),
  });
  if (!r.ok) throw 0;
};
const apiFixturesClear = async () => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clear" }),
  });
  if (!r.ok) throw 0;
};
const apiFixturesUpdate = async (id, patch) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, patch }),
  });
  if (!r.ok) throw 0;
};

/* ----------------- UI primitives ----------------- */
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
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
};

/* ----------------- Admin login (local only) ----------------- */
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
              <input
                type="password"
                className="w-full rounded-xl border px-3 py-2"
                value={p}
                onChange={(e) => setP(e.target.value)}
              />
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

/* ----------------- Landing ----------------- */
const Landing = ({ onStart, onResults, onSettings, onFixtures }) => {
  const Tile = ({ title, subtitle, src, action }) => (
    <motion.button
      onClick={action}
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
      <div className="mt-6">
        <Button variant="secondary" onClick={onFixtures}>
          <CalendarPlus className="w-4 h-4" /> Fixtures
        </Button>
      </div>
    </div>
  );
};

/* ----------------- Player category definitions ----------------- */
const SINGLES_CATS = [
  "Women's Singles",
  "Kid's Singles",
  "Kid's Singles", // duplicate kept per your requested order
  "Men's(A) Singles",
  "Men's(B) Singles",
];

const DOUBLES_CATS = [
  "Women's Doubles",
  "Kid's Doubles",
  "Kid's Doubles", // duplicate kept per your requested order
  "Men's(A) Doubles",
  "Men's(B) Doubles",
  "Mixed Doubles",
];

/* Utility: normalize whatever api returns into usable players object
   - Accepts old-format arrays or new-category objects.
   - Returns { singlesFlat: [], doublesFlat: [], rawSingles, rawDoubles, byCategorySingles, byCategoryDoubles }
*/
function normalizePlayersApi(obj) {
  const rawSingles = obj?.singles ?? [];
  const rawDoubles = obj?.doubles ?? [];

  // Build by-category objects for UI editing
  const singlesByCat = {};
  SINGLES_CATS.forEach((c) => (singlesByCat[c] = []));
  const doublesByCat = {};
  DOUBLES_CATS.forEach((c) => (doublesByCat[c] = []));

  // If API gave array (old format), place all names into the FIRST category for that type
  if (Array.isArray(rawSingles)) {
    rawSingles.forEach((n) => singlesByCat[SINGLES_CATS[0]].push(n));
  } else if (rawSingles && typeof rawSingles === "object") {
    // new format: object with categories
    for (const [cat, arr] of Object.entries(rawSingles)) {
      if (Array.isArray(arr)) {
        // only add if cat exists in our expected list; otherwise put into first cat
        const key = SINGLES_CATS.includes(cat) ? cat : SINGLES_CATS[0];
        singlesByCat[key].push(...arr);
      }
    }
  }

  if (Array.isArray(rawDoubles)) {
    rawDoubles.forEach((n) => doublesByCat[DOUBLES_CATS[0]].push(n));
  } else if (rawDoubles && typeof rawDoubles === "object") {
    for (const [cat, arr] of Object.entries(rawDoubles)) {
      if (Array.isArray(arr)) {
        const key = DOUBLES_CATS.includes(cat) ? cat : DOUBLES_CATS[0];
        doublesByCat[key].push(...arr);
      }
    }
  }

  // produce flattened arrays for components that expect a flat list
  const singlesFlat = Object.values(singlesByCat).flat();
  const doublesFlat = Object.values(doublesByCat).flat();

  return { singlesFlat, doublesFlat, rawSingles, rawDoubles, singlesByCat, doublesByCat };
}

/* ----------------- Settings (players) with categories ----------------- */
/* ---------- Manage Players (Settings) component ---------- */
/* Requires: React hooks, Button, Card, ChevronLeft, Plus, Trash2, RefreshCw available in file scope.
   Also uses apiPlayersGet() and apiPlayersSet() defined elsewhere in your app. */

function Settings({ onBack }) {
  const CATEGORY_ORDER_SINGLES = [
    "Women's Singles",
    "Kid's Singles",
    "Men's(A) Singles",
    "Men's(B) Singles"
  ];
  const CATEGORY_ORDER_DOUBLES = [
    "Women's Doubles",
    "Kid's Doubles",
    "Men's(A) Doubles",
    "Men's(B) Doubles",
    "Mixed Doubles"
  ];

  // Local storage keys for fallback & drafts
  const LS_PLAYERS = "lt_players_v2";
  const LS_PLAYERS_DRAFT = "lt_players_draft_v2";

  // state
  const [players, setPlayers] = React.useState({
    singles: {}, // { category: [names] }
    doubles: {}  // { category: [pair labels] }
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState("");
  const [toast, setToast] = React.useState({ show: false, text: "" });

  // Helpers: draft localStorage
  const saveDraft = (obj) => {
    try { localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify(obj)); } catch {}
  };
  const loadDraft = () => {
    try {
      const s = localStorage.getItem(LS_PLAYERS_DRAFT);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  };
  const clearDraft = () => { try { localStorage.removeItem(LS_PLAYERS_DRAFT); } catch {} };

  // Normalize ensure categories exist in state (preserve any existing players)
  const ensureCategories = (p) => {
    const out = { singles: {}, doubles: {} };
    for (const c of CATEGORY_ORDER_SINGLES) out.singles[c] = (p.singles && p.singles[c]) ? [...p.singles[c]] : [];
    for (const c of CATEGORY_ORDER_DOUBLES) out.doubles[c] = (p.doubles && p.doubles[c]) ? [...p.doubles[c]] : [];
    return out;
  };

  // Load players from API or fallback to LS
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // if draft exists, load draft to allow editing unsaved changes
      const draft = loadDraft();
      if (draft) {
        setPlayers(ensureCategories(draft));
        setDirty(true);
        setLoading(false);
        return;
      }
      try {
        const remote = await apiPlayersGet(); // should return an object
        if (!alive) return;
        // If remote is flat arrays, try to detect old format (previous app versions)
        // If remote.singles is an array -> convert to category "Unassigned"
        let normalized = { singles: {}, doubles: {} };
        if (remote && Array.isArray(remote.singles)) {
          // Put them into Men's(A) Singles by default if empty – but safer: "Unassigned"
          normalized.singles = { ...ensureCategories({ singles: {}, doubles: {} }).singles, "Unassigned": remote.singles };
        } else {
          normalized.singles = remote.singles ? { ...ensureCategories(remote).singles, ...remote.singles } : ensureCategories(remote).singles;
        }
        if (remote && Array.isArray(remote.doubles)) {
          normalized.doubles = { ...ensureCategories({ singles: {}, doubles: {} }).doubles, "Unassigned": remote.doubles };
        } else {
          normalized.doubles = remote.doubles ? { ...ensureCategories(remote).doubles, ...remote.doubles } : ensureCategories(remote).doubles;
        }
        // Finally ensure categories order and presence
        const finalState = ensureCategories(normalized);
        // merge in any "Unassigned" if present
        if (normalized.singles["Unassigned"] && normalized.singles["Unassigned"].length) {
          finalState.singles["Women's Singles"] = [...normalized.singles["Unassigned"], ...finalState.singles["Women's Singles"]];
        }
        if (normalized.doubles["Unassigned"] && normalized.doubles["Unassigned"].length) {
          finalState.doubles["Mixed Doubles"] = [...normalized.doubles["Unassigned"], ...finalState.doubles["Mixed Doubles"]];
        }
        setPlayers(finalState);
      } catch (e) {
        // API failed — fall back to LS saved players
        try {
          const stored = localStorage.getItem(LS_PLAYERS);
          if (stored) {
            const parsed = JSON.parse(stored);
            setPlayers(ensureCategories(parsed));
          } else {
            setPlayers(ensureCategories({}));
          }
        } catch (ex) {
          setPlayers(ensureCategories({}));
        }
        setError("Could not load players from remote (KV). Working locally.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // mark dirty and save draft
  const markDirty = (newPlayers) => {
    setDirty(true);
    saveDraft(newPlayers);
    setPlayers(newPlayers);
  };

  // per-category helpers to add/update/delete
  const addPlayerTo = (group, category) => {
    const newPlayers = JSON.parse(JSON.stringify(players));
    newPlayers[group][category] = [...(newPlayers[group][category] || []), (group === "singles" ? "New Player" : "Team X/Team Y")];
    markDirty(newPlayers);
  };
  const updatePlayerAt = (group, category, idx, value) => {
    const newPlayers = JSON.parse(JSON.stringify(players));
    newPlayers[group][category][idx] = value;
    markDirty(newPlayers);
  };
  const deletePlayerAt = (group, category, idx) => {
    const newPlayers = JSON.parse(JSON.stringify(players));
    newPlayers[group][category] = newPlayers[group][category].filter((_, i) => i !== idx);
    markDirty(newPlayers);
  };

  // Save to remote (apiPlayersSet) and fallback to localStorage
  const saveAll = async () => {
    setSaving(true);
    setError("");
    try {
      // Send entire structured object to API
      await apiPlayersSet(players);
      // store locally too as fallback
      try { localStorage.setItem(LS_PLAYERS, JSON.stringify(players)); } catch {}
      setDirty(false);
      clearDraft();
      setToast({ show: true, text: "Players saved" });
      setTimeout(() => setToast({ show: false, text: "" }), 1500);
    } catch (e) {
      // fallback: save to localStorage and keep dirty true
      try {
        localStorage.setItem(LS_PLAYERS, JSON.stringify(players));
        setError("Remote save failed — saved locally. Will retry when KV is available.");
        setToast({ show: true, text: "Saved locally (remote failed)" });
        setTimeout(() => setToast({ show: false, text: "" }), 2500);
      } catch (ex) {
        setError("Save failed (remote and local storage failed).");
      }
    } finally {
      setSaving(false);
    }
  };

  // Refresh: re-fetch remote and discard draft (confirm if dirty)
  const refresh = async () => {
    if (dirty && !confirm("You have unsaved changes. Refresh will discard them. Continue?")) return;
    setLoading(true);
    setError("");
    try {
      const remote = await apiPlayersGet();
      if (remote && (remote.singles || remote.doubles)) {
        setPlayers(ensureCategories(remote));
        localStorage.setItem(LS_PLAYERS, JSON.stringify(ensureCategories(remote)));
        clearDraft();
        setDirty(false);
      } else {
        // if returned arrays handle gracefully
        setPlayers(ensureCategories(remote || {}));
      }
    } catch (e) {
      setError("Refresh failed (KV unreachable).");
      // try local store
      try {
        const st = localStorage.getItem(LS_PLAYERS);
        if (st) setPlayers(JSON.parse(st));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  // UI render helpers for grouped lists
  const renderCategoryList = (group, category) => {
    const list = (players[group] && players[group][category]) || [];
    return (
      <div key={category} className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">{category}</div>
          <button className="text-sm text-zinc-500" onClick={() => addPlayerTo(group, category)}>+ Add</button>
        </div>
        <div className="space-y-2">
          {list.map((name, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="flex-1 rounded-xl border px-3 py-2"
                value={name}
                onChange={(e) => updatePlayerAt(group, category, idx, e.target.value)}
              />
              <button
                title="Delete"
                onClick={() => deletePlayerAt(group, category, idx)}
                className="px-3 py-2 rounded-xl hover:bg-zinc-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {toast.show && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-lg">
          {toast.text}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={refresh}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button onClick={saveAll} disabled={!dirty || saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? (
        <Card className="p-5 text-center text-zinc-500">Loading players…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            <div>
              {CATEGORY_ORDER_SINGLES.map(cat => renderCategoryList("singles", cat))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div>
              {CATEGORY_ORDER_DOUBLES.map(cat => renderCategoryList("doubles", cat))}
            </div>
          </Card>
        </div>
      )}

      <div className="text-xs text-zinc-500 mt-3">{dirty ? "You have unsaved changes." : "All changes saved."}</div>
    </div>
  );
}


/* ----------------- Fixtures (create/list/remove) ----------------- */
const Fixtures = ({ onBack }) => {
  const [playersFlat, setPlayersFlat] = useState({ singles: [], doubles: [] });
  const [mode, setMode] = useState("singles");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  // On load, normalize players into flat arrays (works with old format OR new category format)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet();
        if (!alive) return;
        const np = normalizePlayersApi(p);
        setPlayersFlat({ singles: np.singlesFlat, doubles: np.doublesFlat });
      } catch { /* ignore */ }
      try {
        const fx = await apiFixturesList();
        if (!alive) setList([]);
        else setList(fx);
      } catch { /* ignore */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const options = mode === "singles" ? playersFlat.singles : playersFlat.doubles;
  const canAdd = a && b && a !== b && date && time;

  const add = async (e) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = { id: crypto.randomUUID(), mode, sides: [a, b], start, status: "upcoming" };
    await apiFixturesAdd(payload);
    // Always keep list sorted by start and grouped by category (we sort by start; grouping by category is interpreted as "combine matches as per category" on display)
    setList(prev => [...prev, payload].sort((x, y) => x.start - y.start));
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
              <div className="md:col-span-4">
                <Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4" /> Add Fixture</Button>
              </div>
            </form>
          </Card>

          {list.length === 0 ? (
            <Card className="p-5 text-center text-zinc-500">No fixtures yet.</Card>
          ) : (
            <div className="space-y-3">
              {list.map(f => (
                <Card key={f.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">
                      {f.sides?.[0]} vs {f.sides?.[1]}{" "}
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {new Date(f.start).toLocaleString()}{" "}
                      {f.status === "active" && (
                        <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
                        </span>
                      )}
                      {f.status === "completed" && <span className="ml-2 text-zinc-500 text-xs">(completed)</span>}
                    </div>
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


/* ----------------- Start Match (from fixtures) ----------------- */
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

    // ensure only one "active"
    for (const other of fixtures) {
      if (other.id !== fx.id && other.status === "active") {
        await apiFixturesUpdate(other.id, { status: "upcoming" });
      }
    }
    await apiFixturesUpdate(fx.id, patch); // <-- needs backend action 'update'

    onStartScoring({
      mode: fx.mode,
      sides: fx.sides,
      startingServer: 0,
      fixtureId: fx.id,
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
            {list.map(f => (
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

/* ----------------- Scoring (Fast4 rules) ----------------- */
// No-advantage: next point after 40-40 wins the GAME
const nextPointNoAd = (p) => ({ 0: 15, 15: 30, 30: 40, 40: "Game" }[p] ?? p);
function advancePointNoAd(a, b, who) {
  let pA = a, pB = b;
  if (who === 0) pA = nextPointNoAd(pA);
  else pB = nextPointNoAd(pB);
  return [pA, pB];
}
function makeEmptySet() {
  return { gamesA: 0, gamesB: 0, tie: false, tieA: 0, tieB: 0, finished: false };
}
// Set is done when a side reaches 4 games, except at 3-3 → tiebreak to 5 (4-4 next point wins)
function setOverFast4(s) {
  if (s.tie) {
    // first to 5, next-point-wins on 4-4
    if ((s.tieA >= 5 || s.tieB >= 5) && Math.abs(s.tieA - s.tieB) >= 1) return true;
    return false;
  } else {
    if (s.gamesA === 3 && s.gamesB === 3) return false; // trigger tiebreak in flow, not over yet
    if (s.gamesA >= 4 || s.gamesB >= 4) return true;
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
      if (who === 0) s.tieA++;
      else s.tieB++;
      if (setOverFast4(s)) {
        s.finished = true;
        // winner gets the set 4-3 (with TB)
        if (s.tieA > s.tieB) s.gamesA = 4;
        else s.gamesB = 4;
      }
      ns[ns.length - 1] = s;
      setSets(ns);
      return;
    }

    // normal game (no-advantage)
    let [a, b] = advancePointNoAd(points[0], points[1], who);
    setPoints([a, b]);
    const gw = gameWin(a, b);
    if (!gw) return;

    const ns = [...sets];
    const s = { ...current };
    if (gw === "A") s.gamesA++;
    else s.gamesB++;
    // reset points for next game
    setPoints([0, 0]);

    // tiebreak trigger at 3-3
    if (s.gamesA === 3 && s.gamesB === 3 && !s.tie && !s.finished) {
      s.tie = true;
      s.tieA = 0; s.tieB = 0;
    } else if (setOverFast4(s)) {
      s.finished = true;
    }

    ns[ns.length - 1] = s;
    setSets(ns);

    // Fast4 is a single-set match; finish immediately when set finishes
    if (s.finished) {
      recordResult(ns[0]);
    }
  };

  const recordResult = async (setObj) => {
    // score like 4-2 or 4-3(5-3)
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
      mode: config.mode || "singles",
    };
    await apiMatchesAdd(payload);
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
          {!current.tie ? (
            <div className="text-sm font-mono">{current.gamesA}-{current.gamesB}</div>
          ) : (
            <div className="text-sm font-mono">
              3-3 • TB {current.tieA}-{current.tieB} {Math.max(current.tieA, current.tieB) === 4 && Math.abs(current.tieA - current.tieB) === 0 ? "(next point wins)" : ""}
            </div>
          )}
          <div className="text-xs text-zinc-500 mt-2">
            Fast4: first to 4 games; no-ad at deuce; tiebreak to 5 at 3–3 (4–4 next point wins).
          </div>
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
      const fx = await apiFixturesList();
      const ms = await apiMatchesList();
      if (alive) { setFixtures(fx); setMatches(ms); setLoading(false); }
    })();
    const iv = setInterval(async () => {
      try { setFixtures(await apiFixturesList()); setMatches(await apiMatchesList()); } catch {}
    }, 8000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const active = fixtures.filter(f => f.status === "active");
  const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter(f => f.status === "completed");
  const completed = [...completedFixtures, ...matches.map(m => ({
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
            {active.length ? active.map(f => (
              <div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                <div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
              </div>
            )) : <div className="text-zinc-500">No active match.</div>}

            <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
            {upcoming.length ? upcoming.map(f => (
              <div key={f.id} className="py-2 border-b last:border-0">
                <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div>
                <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
              </div>
            )) : <div className="text-zinc-500">No upcoming fixtures.</div>}
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Completed</div>
            {completed.length ? completed.map(m => (
              <div key={m.id + String(m.finishedAt)} className="py-2 border-b last:border-0">
                <div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div>
                <div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div>
                <div className="mt-1 text-sm">
                  <span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner || ""}</span>
                  <span className="ml-3 font-mono">{m.scoreline || ""}</span>
                </div>
              </div>
            )) : <div className="text-zinc-500">No results yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
};

/* ----------------- App shell ----------------- */
export default function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  // If you still use /viewer public route, keep Viewer() function present; otherwise it is shown only when path matches.
  if (path.startsWith('/viewer')) {
    return <Viewer />; // public viewer, no login
  }
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
              <Scoring
                config={cfg}
                onAbort={() => to("landing")}
                onComplete={() => to("results")}
              />
            </motion.div>
          )}
          {view === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Results onBack={() => to("landing")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <footer className="py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} RNW NPL
      </footer>
    </div>
  );
}

/* ----------------- Viewer (public) ----------------- */
function Viewer(){
  const [fixtures,setFixtures]=React.useState([]);
  const [results,setResults]=React.useState([]);
  const [loading,setLoading]=React.useState(true);
  const busterLocal = () => `?t=${Date.now()}`;

  const apiFixturesListLocal = async () => {
    const r = await fetch('/api/fixtures'+busterLocal(), { cache:'no-store' });
    if(!r.ok) throw 0;
    return await r.json();
  };
  const apiMatchesListLocal = async () => {
    try{
      const r = await fetch('/api/matches'+busterLocal(), { cache:'no-store' });
      if(!r.ok) throw 0;
      return await r.json();
    }catch{
      return [];
    }
  };

  React.useEffect(()=>{
    let alive = true;
    (async ()=>{
      try{
        const [fx,ms] = await Promise.all([apiFixturesListLocal(), apiMatchesListLocal()]);
        if(!alive) return;
        setFixtures(fx);
        setResults(ms);
      } finally {
        if(alive) setLoading(false);
      }
    })();

    const iv = setInterval(async ()=>{
      try{
        const [fx,ms] = await Promise.all([apiFixturesListLocal(), apiMatchesListLocal()]);
        setFixtures(fx);
        setResults(ms);
      }catch{}
    }, 10000);

    return ()=>{ alive=false; clearInterval(iv); };
  },[]);

  const active    = fixtures.filter(f => f.status === 'active');
  const upcoming  = fixtures.filter(f => !f.status || f.status === 'upcoming');
  const completedFixtures = fixtures.filter(f => f.status === 'completed');
  const completed = [
    ...completedFixtures,
    ...results.map(m => ({
      id: m.id,
      sides: m.sides,
      finishedAt: m.finishedAt,
      scoreline: m.scoreline,
      winner: m.winner,
      mode: m.mode || 'singles'
    }))
  ].sort((a,b) => (b.finishedAt||0)-(a.finishedAt||0));

  const CardLocal = ({className="", children}) =>
    <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>{children}</div>;

  return (
    <div className="app-bg">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">RNW Tennis Tournament</h1>
        </div>

        {loading ? (
          <CardLocal className="p-6 text-center text-zinc-500">Loading…</CardLocal>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <CardLocal className="p-5">
              <div className="text-lg font-semibold mb-3">Active</div>
              {active.length ? active.map(f=>(
                <div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="ml-auto text-sm text-zinc-500">
                    {new Date(f.start).toLocaleString()}
                  </div>
                </div>
              )) : <div className="text-zinc-500">No live match.</div>}

              <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
              {upcoming.length ? upcoming.map(f=>(
                <div key={f.id} className="py-2 border-b last:border-0">
                  <div className="font-medium">
                    {f.sides?.[0]} vs {f.sides?.[1]}
                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span>
                  </div>
                  <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                </div>
              )) : <div className="text-zinc-500">No upcoming fixtures.</div>}
            </CardLocal>

            <CardLocal className="p-5">
              <div className="text-lg font-semibold mb-3">Completed</div>
              {completed.length ? completed.map(m=>(
                <div key={(m.id||'')+String(m.finishedAt||'')} className="py-2 border-b last:border-0">
                  <div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div>
                  <div className="text-sm text-zinc-500">
                    {m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="uppercase text-zinc-400 text-xs">Winner</span>{" "}
                    <span className="font-semibold">{m.winner||''}</span>{" "}
                    <span className="ml-3 font-mono">{m.scoreline||''}</span>
                  </div>
                </div>
              )) : <div className="text-zinc-500">No completed matches yet.</div>}
            </CardLocal>
          </div>
        )}
      </div>
    </div>
  );
}

