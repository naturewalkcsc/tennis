// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";

// Images (as you requested)
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* ----------------- Helpers & API wrappers ----------------- */
const LS_PLAYERS_DRAFT = "lt_players_draft";
const readLS = (k, f) => {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : f;
  } catch {
    return f;
  }
};
const writeLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const buster = () => "?t=" + Date.now();

// API wrappers (unchanged endpoints)
const apiPlayersGet = async () => {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("players GET failed");
  return await r.json();
};
const apiPlayersSet = async (payload) => {
  const r = await fetch("/api/players" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!r.ok) throw new Error("players POST failed");
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
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      {children}
    </button>
  );
};

/* ----------------- Admin login (local-only) ----------------- */
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
        <h1 className="text-2xl font-bold">Lawn Tennis Scoring</h1>
      </div>

      {/* Layout as you confirmed: Start Match | Results | Manage Players */}
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
};

/* ----------------- Manage Players (Categorized) ----------------- */
/*
Categories/order requested by you (I used (1)/(2) suffix for duplicate Kid categories):
Singles order:
  1. Women's Singles
  2. Kid's Singles (1)
  3. Kid's Singles (2)
  4. Men's (A) Singles
  5. Men's (B) Singles

Doubles order:
  1. Women's Doubles
  2. Kid's Doubles (1)
  3. Kid's Doubles (2)
  4. Men's (A) Doubles
  5. Men's (B) Doubles
  6. Mixed Doubles
*/
const SINGLES_CATEGORIES = [
  "Women's Singles",
  "Kid's Singles (1)",
  "Kid's Singles (2)",
  "Men's (A) Singles",
  "Men's (B) Singles",
];
const DOUBLES_CATEGORIES = [
  "Women's Doubles",
  "Kid's Doubles (1)",
  "Kid's Doubles (2)",
  "Men's (A) Doubles",
  "Men's (B) Doubles",
  "Mixed Doubles",
];

const Settings = ({ onBack }) => {
  // store as { singles: {category: [names]}, doubles: {category: [pairs]} }
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(false);

  // initialize default structure
  const makeDefault = () => ({
    singles: SINGLES_CATEGORIES.reduce((acc, c) => { acc[c] = []; return acc; }, {}),
    doubles: DOUBLES_CATEGORIES.reduce((acc, c) => { acc[c] = []; return acc; }, {}),
  });

  // local draft helpers
  const saveDraft = (obj) => { try { localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify(obj)); } catch {} };
  const loadDraft = () => { try { const r = localStorage.getItem(LS_PLAYERS_DRAFT); return r ? JSON.parse(r) : null; } catch { return null; } };
  const clearDraft = () => { try { localStorage.removeItem(LS_PLAYERS_DRAFT); } catch {} };

  // normalize API response -> our category object
  const normalizePlayersResponse = (resp) => {
    // if resp has nested categories already, trust it (best case)
    if (resp && typeof resp === "object") {
      // two supported shapes:
      // - legacy: { singles: [ 'A', 'B'], doubles: [ ... ] }
      // - new: { singles: { 'cat': [...] }, doubles: { 'cat':[...] } }
      const res = makeDefault();
      // singles
      if (Array.isArray(resp.singles)) {
        // legacy flat array -> put into first singles category
        res.singles[SINGLES_CATEGORIES[0]] = resp.singles.slice();
      } else if (resp.singles && typeof resp.singles === "object") {
        // new shape: copy entries for known categories
        for (const k of Object.keys(res.singles)) {
          if (Array.isArray(resp.singles[k])) res.singles[k] = resp.singles[k].slice();
        }
      }
      // doubles
      if (Array.isArray(resp.doubles)) {
        res.doubles[DOUBLES_CATEGORIES[0]] = resp.doubles.slice();
      } else if (resp.doubles && typeof resp.doubles === "object") {
        for (const k of Object.keys(res.doubles)) {
          if (Array.isArray(resp.doubles[k])) res.doubles[k] = resp.doubles[k].slice();
        }
      }
      return res;
    }
    return makeDefault();
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      // draft preference
      const d = loadDraft();
      if (d) {
        setPlayers(d);
        setDirty(true);
        setLoading(false);
        return;
      }
      try {
        const resp = await apiPlayersGet();
        if (!alive) return;
        const normalized = normalizePlayersResponse(resp || {});
        setPlayers(normalized);
      } catch (e) {
        // if KV not configured or error, keep default empty categories
        setPlayers(makeDefault());
        setError("Could not load players from KV (falling back to local).");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const markDirty = (newPlayers) => { setPlayers(newPlayers); setDirty(true); saveDraft(newPlayers); };

  // helpers to edit a specific category array
  const updateCategory = (type, category, updater) => {
  setPlayers(prev => {
  const copy = {
    singles: { ...prev.singles },
    doubles: { ...prev.doubles }
  };

  const current = type === "singles"
    ? (copy.singles[category] || [])
    : (copy.doubles[category] || []);

  const updated = updater([...current]); // updater receives an array copy

  if (type === "singles") {
    copy.singles[category] = updated;
  } else {
    copy.doubles[category] = updated;
  }

  markDirty(copy);
  return copy;
  });
  };

  const addEntry = (type, category) => updateCategory(type, category, arr => { arr.push(type === "singles" ? "New Player" : "Team X/Team Y"); return arr; });
  const updateEntry = (type, category, idx, val) => updateCategory(type, category, arr => { arr[idx] = val; return arr; });
  const removeEntry = (type, category, idx) => updateCategory(type, category, arr => { arr.splice(idx, 1); return arr; });

  const doSave = async () => {
    setSaving(true); setError("");
    try {
      // Persist the structured object directly to KV
      await apiPlayersSet(players);
      setDirty(false);
      clearDraft();
      setToast(true);
      setTimeout(() => setToast(false), 1200);
    } catch (e) {
      setError("Save failed. Make sure KV is configured. Draft saved locally.");
      saveDraft(players);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={() => { setPlayers(makeDefault()); setDirty(true); }}>Reset UI</Button>
          <Button onClick={doSave} disabled={!dirty || saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-lg">Players saved</div>}
      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? <Card className="p-5 text-center text-zinc-500">Loading…</Card> : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Singles */}
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            <div className="space-y-4">
              {SINGLES_CATEGORIES.map(cat => (
                <div key={cat} className="mb-2">
                  <div className="text-sm font-medium mb-2">{cat}</div>
                  <div className="space-y-2">
                    {(players.singles[cat] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="flex-1 rounded-xl border px-3 py-2" value={name}
                               onChange={e => updateEntry("singles", cat, idx, e.target.value)} />
                        <button onClick={() => removeEntry("singles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div>
                      <Button variant="secondary" onClick={() => addEntry("singles", cat)}><Plus className="w-4 h-4" /> Add</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Doubles */}
          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div className="space-y-4">
              {DOUBLES_CATEGORIES.map(cat => (
                <div key={cat} className="mb-2">
                  <div className="text-sm font-medium mb-2">{cat}</div>
                  <div className="space-y-2">
                    {(players.doubles[cat] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="flex-1 rounded-xl border px-3 py-2" value={name}
                               onChange={e => updateEntry("doubles", cat, idx, e.target.value)} />
                        <button onClick={() => removeEntry("doubles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div>
                      <Button variant="secondary" onClick={() => addEntry("doubles", cat)}><Plus className="w-4 h-4" /> Add</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      <div className="text-xs text-zinc-500 mt-3">
        {dirty ? "You have unsaved changes (draft saved locally)." : "All changes saved."}
      </div>
    </div>
  );
};

/* ----------------- NOTE -----------------
The rest of the app (Fixtures, StartFromFixtures, Scoring, Results, Viewer, etc.) are left unchanged.
If you want, I can paste the full App.jsx including everything else (Fixtures, Scoring rules, Results, Viewer) — but since you asked specifically to fix Manage Players with categories and fix the saving, I focused on the Settings component and its integration.
*/

/* ----------------- Minimal App shell that uses Settings ----------------- */
export default function App() {
  const [view, setView] = useState("landing");
  const logged = localStorage.getItem("lt_admin") === "1";
  if (!logged) return <AdminLogin onOk={() => window.location.reload()} />;

  return (
    <div className="app-bg">
      <div className="max-w-6xl mx-auto py-8">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Landing
                onStart={() => setView("start")}
                onResults={() => setView("results")}
                onSettings={() => setView("settings")}
                onFixtures={() => setView("fixtures")}
              />
            </motion.div>
          )}
          {view === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Settings onBack={() => setView("landing")} />
            </motion.div>
          )}
          {/* placeholders for other views - you likely have these already in your full file */}
          {view === "fixtures" && <motion.div key="fixtures"><div className="p-6"><Button onClick={() => setView("landing")}>Fixtures placeholder - go back</Button></div></motion.div>}
          {view === "start" && <motion.div key="start"><div className="p-6">Start placeholder</div></motion.div>}
          {view === "results" && <motion.div key="results"><div className="p-6">Results placeholder</div></motion.div>}
        </AnimatePresence>
      </div>

      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Lawn Tennis Scoring</footer>
    </div>
  );
}

