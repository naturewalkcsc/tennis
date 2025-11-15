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

/* ----------------- Settings (players) with categories ----------------- */
/*
 Categories and the order used when saving:
  Singles: Women's Singles, Kid's Singles, Men's(A) Singles, Men's(B) Singles
  Doubles: Women's Doubles, Kid's Doubles, Men's(A) Doubles, Men's(B) Doubles, Mixed Doubles
*/
const Settings = ({ onBack }) => {
  const initialPlayers = {
    singles: {
      womens: [],
      kids: [],
      mensA: [],
      mensB: []
    },
    doubles: {
      womens: [],
      kids: [],
      mensA: [],
      mensB: [],
      mixed: []
    }
  };

  const [players, setPlayers] = useState(initialPlayers);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  const saveDraft = (pl) => {
    try { localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify(pl)); } catch {}
  };
  const loadDraft = () => {
    try { const r = localStorage.getItem(LS_PLAYERS_DRAFT); return r ? JSON.parse(r) : null; } catch { return null; }
  };
  const clearDraft = () => { try { localStorage.removeItem(LS_PLAYERS_DRAFT); } catch {} };

  useEffect(() => {
    let alive = true;
    (async () => {
      const draft = loadDraft();
      if (draft) {
        setPlayers(draft);
        setDirty(true);
        setLoading(false);
        return;
      }
      try {
        const obj = await apiPlayersGet(); // obj.singles[], obj.doubles[]
        if (!alive) return;

        // Map flattened arrays into categories:
        // For existing data we don't have category labels, so put them into first category so they are visible.
        const p = { ...initialPlayers };
        if (obj && Array.isArray(obj.singles) && obj.singles.length) {
          p.singles.womens = obj.singles.slice(); // put all loaded singles into women's slot (admin can re-categorize)
        }
        if (obj && Array.isArray(obj.doubles) && obj.doubles.length) {
          p.doubles.womens = obj.doubles.slice(); // put all loaded doubles into women's slot
        }
        setPlayers(p);
      } catch (e) {
        setError("Could not load players");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const markDirty = (newPlayers) => { setDirty(true); saveDraft(newPlayers); setPlayers(newPlayers); };

  // helpers for editing categories
  const updCategory = (type, cat, idx, value) => {
    setPlayers(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[type][cat][idx] = value;
      saveDraft(copy); setDirty(true);
      return copy;
    });
  };
  const addToCategory = (type, cat) => {
    setPlayers(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[type][cat].push(type === "singles" ? "New Player" : "New Pair");
      saveDraft(copy); setDirty(true);
      return copy;
    });
  };
  const delFromCategory = (type, cat, idx) => {
    setPlayers(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[type][cat] = copy[type][cat].filter((_,i)=>i!==idx);
      saveDraft(copy); setDirty(true);
      return copy;
    });
  };

  // Flatten in requested order for saving to backend
  const flattenForSave = () => {
    const singlesOrder = ["womens", "kids", "mensA", "mensB"];
    const doublesOrder = ["womens", "kids", "mensA", "mensB", "mixed"];
    const singlesFlat = singlesOrder.flatMap(k => players.singles[k] || []);
    const doublesFlat = doublesOrder.flatMap(k => players.doubles[k] || []);
    return { singles: singlesFlat, doubles: doublesFlat };
  };

  const onSave = async () => {
    setSaving(true); setError("");
    try {
      const payload = flattenForSave();
      await apiPlayersSet(payload);
      setDirty(false);
      clearDraft();
    } catch (e) {
      console.error(e);
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto">
          <Button onClick={onSave} disabled={!dirty || saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? (
        <Card className="p-5 text-center text-zinc-500">Loading…</Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Singles categories */}
            <Card className="p-5">
              <div className="font-semibold mb-3">Singles</div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Women's Singles</div>
                <div className="space-y-2">
                  {players.singles.womens.map((name, idx) => (
                    <div key={"w-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("singles","womens",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("singles","womens",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("singles","womens")}><Plus className="w-4 h-4"/> Add Player</Button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Kid's Singles</div>
                <div className="space-y-2">
                  {players.singles.kids.map((name, idx) => (
                    <div key={"k-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("singles","kids",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("singles","kids",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("singles","kids")}><Plus className="w-4 h-4"/> Add Player</Button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Men's (A) Singles</div>
                <div className="space-y-2">
                  {players.singles.mensA.map((name, idx) => (
                    <div key={"ma-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("singles","mensA",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("singles","mensA",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("singles","mensA")}><Plus className="w-4 h-4"/> Add Player</Button>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Men's (B) Singles</div>
                <div className="space-y-2">
                  {players.singles.mensB.map((name, idx) => (
                    <div key={"mb-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("singles","mensB",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("singles","mensB",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("singles","mensB")}><Plus className="w-4 h-4"/> Add Player</Button>
                </div>
              </div>
            </Card>

            {/* Doubles categories */}
            <Card className="p-5">
              <div className="font-semibold mb-3">Doubles</div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Women's Doubles</div>
                <div className="space-y-2">
                  {players.doubles.womens.map((name, idx) => (
                    <div key={"dw-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("doubles","womens",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("doubles","womens",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("doubles","womens")}><Plus className="w-4 h-4"/> Add Pair</Button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Kid's Doubles</div>
                <div className="space-y-2">
                  {players.doubles.kids.map((name, idx) => (
                    <div key={"dk-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("doubles","kids",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("doubles","kids",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("doubles","kids")}><Plus className="w-4 h-4"/> Add Pair</Button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Men's (A) Doubles</div>
                <div className="space-y-2">
                  {players.doubles.mensA.map((name, idx) => (
                    <div key={"dma-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("doubles","mensA",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("doubles","mensA",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("doubles","mensA")}><Plus className="w-4 h-4"/> Add Pair</Button>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Men's (B) Doubles</div>
                <div className="space-y-2">
                  {players.doubles.mensB.map((name, idx) => (
                    <div key={"dmb-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("doubles","mensB",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("doubles","mensB",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("doubles","mensB")}><Plus className="w-4 h-4"/> Add Pair</Button>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Mixed Doubles</div>
                <div className="space-y-2">
                  {players.doubles.mixed.map((name, idx) => (
                    <div key={"dmx-"+idx} className="flex items-center gap-2">
                      <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={e => updCategory("doubles","mixed",idx,e.target.value)} />
                      <button onClick={()=>delFromCategory("doubles","mixed",idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={()=>addToCategory("doubles","mixed")}><Plus className="w-4 h-4"/> Add Pair</Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-xs text-zinc-500 mt-3">{dirty ? "You have unsaved changes." : "All changes saved."}</div>
        </>
      )}
    </div>
  );
};

/* ----------------- Fixtures, StartFromFixtures, Scoring, Results, Viewer, App shell ----------------- */
/* The rest of the file keeps the same behavior as your current app:
   - Fixtures component (create/list/remove)
   - StartFromFixtures (select fixture and Start)
   - Scoring (Fast4 rules you already had)
   - Results + Viewer
   I did not change those except to keep saving/loading players compatible.
*/

/* ----------------- For brevity: reuse components you already have below unchanged ----------------- */
/* If you want, I can paste the entire file again with the unchanged components appended.
   But to avoid duplication in this message, please keep the rest of your App.jsx as-is and
   replace only the Settings component with the code above.
*/

/* ----------------- If you want the full file as a single paste (complete), I can provide that too. ----------------- */

export default function App() {
  // Keep the same App shell you have currently in the project.
  // If you want the full, single-file version (Settings replaced), tell me and I'll send the entire App.jsx here.
  return null;
}

