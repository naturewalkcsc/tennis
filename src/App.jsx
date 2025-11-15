// App.jsx -- patched version with category-based Manage Players and robust save/load
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";

// images (you told me to use these imports)
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* ----------------- constants: categories & helpers ----------------- */
const SINGLES_CATEGORIES = [
  "Women's Singles",
  "Kid's Singles",
  "Kid's Singles",
  "Men's(A) Singles",
  "Men's(B) Singles",
];

const DOUBLES_CATEGORIES = [
  "Women's Doubles",
  "Kid's Doubles",
  "Kid's Doubles",
  "Men's(A) Doubles",
  "Men's(B) Doubles",
  "Mixed Doubles",
];

const LS_MATCHES_FALLBACK = "lt_matches_fallback";
const LS_PLAYERS_DRAFT = "lt_players_draft";
const buster = () => "?t=" + Date.now();

const readLS = (k, fallback) => {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : fallback;
  } catch {
    return fallback;
  }
};
const writeLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

/* ----------------- API wrappers (same endpoints as you already use) ----------------- */
const apiPlayersGet = async () => {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("players GET failed");
  return await r.json();
};
const apiPlayersSet = async (obj) => {
  const r = await fetch("/api/players" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: obj }),
  });
  if (!r.ok) throw new Error("players POST failed");
};

const apiFixturesList = async () => {
  const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("fixtures GET failed");
  return await r.json();
};
const apiFixturesAdd = async (payload) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", payload }),
  });
  if (!r.ok) throw new Error("fixtures add failed");
};
const apiFixturesRemove = async (id) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "remove", id }),
  });
  if (!r.ok) throw new Error("fixtures remove failed");
};
const apiFixturesClear = async () => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clear" }),
  });
  if (!r.ok) throw new Error("fixtures clear failed");
};
const apiFixturesUpdate = async (id, patch) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, patch }),
  });
  if (!r.ok) throw new Error("fixtures update failed");
};

const apiMatchesList = async () => {
  try {
    const r = await fetch("/api/matches" + buster(), { cache: "no-store" });
    if (!r.ok) throw new Error("matches GET failed");
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
    if (!r.ok) throw new Error("matches POST failed");
  } catch {
    const list = readLS(LS_MATCHES_FALLBACK, []);
    list.unshift(payload);
    writeLS(LS_MATCHES_FALLBACK, list);
  }
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

/* ----------------- AdminLogin (same local admin) ----------------- */
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
        <h1 className="text-2xl font-bold">RNW Tennis Tournament 2025</h1>
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
};

/* ----------------- Manage Players (CATEGORY aware) ----------------- */
const Settings = ({ onBack }) => {
  // players stored as object: { singles: {cat:[]}, doubles: {cat:[]} }
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const clearDraft = () => {
    try { localStorage.removeItem(LS_PLAYERS_DRAFT); } catch {}
  };
  const loadDraft = () => {
    try { const r = localStorage.getItem(LS_PLAYERS_DRAFT); return r ? JSON.parse(r) : null; } catch { return null; }
  };
  const saveDraft = (obj) => {
    try { localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify(obj)); } catch {}
  };

  // helpers to create empty category maps
  const emptySinglesObj = () => {
    const o = {};
    SINGLES_CATEGORIES.forEach((c) => (o[c] = []));
    return o;
  };
  const emptyDoublesObj = () => {
    const o = {};
    DOUBLES_CATEGORIES.forEach((c) => (o[c] = []));
    return o;
  };

  // On mount: fetch server first. Only use draft if server is empty/errored.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const draft = loadDraft();
      try {
        const server = await apiPlayersGet().catch(() => null);
        if (!alive) return;
        if (server) {
          // server may be either:
          //  - legacy: { singles: [...], doubles: [...] } (flat arrays)
          //  - new: { singles: { cat: [] }, doubles: { cat: [] } }
          let singlesObj = emptySinglesObj();
          let doublesObj = emptyDoublesObj();

          if (Array.isArray(server.singles) || Array.isArray(server.doubles)) {
            // legacy flat arrays: put the server arrays into the first category to preserve existing data
            const sFlat = Array.isArray(server.singles) ? server.singles : [];
            const dFlat = Array.isArray(server.doubles) ? server.doubles : [];
            const sCopy = sFlat.slice();
            const dCopy = dFlat.slice();
            const sObj = emptySinglesObj();
            const dObj = emptyDoublesObj();
            const firstSinglesKey = SINGLES_CATEGORIES[0];
            const firstDoublesKey = DOUBLES_CATEGORIES[0];
            sObj[firstSinglesKey] = sCopy;
            dObj[firstDoublesKey] = dCopy;
            singlesObj = sObj;
            doublesObj = dObj;
          } else {
            // server already provides category maps (or partially)
            SINGLES_CATEGORIES.forEach((c) => {
              singlesObj[c] = (server.singles && server.singles[c]) ? server.singles[c].slice() : [];
            });
            DOUBLES_CATEGORIES.forEach((c) => {
              doublesObj[c] = (server.doubles && server.doubles[c]) ? server.doubles[c].slice() : [];
            });
          }

          setPlayers({ singles: singlesObj, doubles: doublesObj });
          clearDraft(); // server wins: clear any draft
          setDirty(false);
        } else if (draft) {
          // server empty/unreachable but we have a draft
          setPlayers(draft);
          setDirty(true);
        } else {
          // no server, no draft: just empty categories
          setPlayers({ singles: emptySinglesObj(), doubles: emptyDoublesObj() });
        }
      } catch (e) {
        // fallback: show draft if available
        if (draft) setPlayers(draft);
        else setPlayers({ singles: emptySinglesObj(), doubles: emptyDoublesObj() });
        setError("Could not load players (KV?). You can edit and Save to retry.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mutate helpers (clone on write)
  const markDirty = (newObj) => {
    setDirty(true);
    saveDraft(newObj);
  };

  const addPlayer = (type, category) => {
    setPlayers((p) => {
      const next = { singles: { ...p.singles }, doubles: { ...p.doubles } };
      const arr = [...(type === "singles" ? next.singles[category] : next.doubles[category])];
      arr.push("New Player");
      if (type === "singles") next.singles[category] = arr;
      else next.doubles[category] = arr;
      markDirty(next);
      return next;
    });
  };

  const updatePlayer = (type, category, idx, value) => {
    setPlayers((p) => {
      const next = { singles: { ...p.singles }, doubles: { ...p.doubles } };
      const arr = [...(type === "singles" ? next.singles[category] : next.doubles[category])];
      arr[idx] = value;
      if (type === "singles") next.singles[category] = arr;
      else next.doubles[category] = arr;
      markDirty(next);
      return next;
    });
  };

  const delPlayer = (type, category, idx) => {
    setPlayers((p) => {
      const next = { singles: { ...p.singles }, doubles: { ...p.doubles } };
      const arr = (type === "singles" ? next.singles[category] : next.doubles[category]).filter((_, i) => i !== idx);
      if (type === "singles") next.singles[category] = arr;
      else next.doubles[category] = arr;
      markDirty(next);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      // send the players object as-is to the server. server will store it.
      await apiPlayersSet(players);
      // refresh from server to be sure
      const server = await apiPlayersGet();
      // server might return legacy or new structure — normalize just like on load
      let singlesObj = {};
      let doublesObj = {};
      if (server) {
        if (Array.isArray(server.singles) || Array.isArray(server.doubles)) {
          const sFlat = Array.isArray(server.singles) ? server.singles : [];
          const dFlat = Array.isArray(server.doubles) ? server.doubles : [];
          singlesObj = emptySinglesObj();
          doublesObj = emptyDoublesObj();
          singlesObj[SINGLES_CATEGORIES[0]] = sFlat.slice();
          doublesObj[DOUBLES_CATEGORIES[0]] = dFlat.slice();
        } else {
          SINGLES_CATEGORIES.forEach((c) => (singlesObj[c] = (server.singles && server.singles[c]) ? server.singles[c].slice() : []));
          DOUBLES_CATEGORIES.forEach((c) => (doublesObj[c] = (server.doubles && server.doubles[c]) ? server.doubles[c].slice() : []));
        }
      } else {
        // If server didn't return, keep local players as saved
        singlesObj = players.singles;
        doublesObj = players.doubles;
      }
      const normalized = { singles: singlesObj, doubles: doublesObj };
      setPlayers(normalized);
      clearDraft();
      setDirty(false);
      setToast("Players saved");
      setTimeout(() => setToast(""), 1200);
    } catch (e) {
      console.error(e);
      setError("Save failed. Keep editing and try again.");
      saveDraft(players);
      setDirty(true);
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
          <Button variant="secondary" onClick={async () => {
            setLoading(true);
            try { const obj = await apiPlayersGet(); /* handled by effect normally */ setPlayers(obj || { singles: emptySinglesObj(), doubles: emptyDoublesObj() }); setDirty(false); clearDraft(); } catch (e) { setError("Refresh failed"); } finally { setLoading(false); } }}> <RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {toast && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-lg">{toast}</div>}
      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? (
        <Card className="p-5 text-center text-zinc-500">Loading players…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Singles column */}
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            <div className="space-y-6">
              {SINGLES_CATEGORIES.map((cat) => (
                <div key={cat} className="mb-2">
                  <div className="text-sm font-medium mb-2">{cat}</div>
                  <div className="space-y-2">
                    {(players.singles && players.singles[cat] ? players.singles[cat] : []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updatePlayer("singles", cat, idx, e.target.value)} />
                        <button onClick={() => delPlayer("singles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div>
                      <Button variant="secondary" onClick={() => addPlayer("singles", cat)}><Plus className="w-4 h-4" /> Add</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Doubles column */}
          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div className="space-y-6">
              {DOUBLES_CATEGORIES.map((cat) => (
                <div key={cat} className="mb-2">
                  <div className="text-sm font-medium mb-2">{cat}</div>
                  <div className="space-y-2">
                    {(players.doubles && players.doubles[cat] ? players.doubles[cat] : []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updatePlayer("doubles", cat, idx, e.target.value)} />
                        <button onClick={() => delPlayer("doubles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div>
                      <Button variant="secondary" onClick={() => addPlayer("doubles", cat)}><Plus className="w-4 h-4" /> Add</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="text-xs text-zinc-500 mt-3">{dirty ? "You have unsaved changes." : "All changes saved."}</div>
    </div>
  );
};

/* ----------------- Fixtures & Start & Scoring & Results (unchanged logic) ----------------- */
/* For brevity this file reuses the previously-working implementations for Fixtures, StartFromFixtures,
   Scoring, Results, Viewer, etc. If you need the full complete file with those sections included again
   I can paste them — but your current project already has those and we've only replaced Settings logic above.
*/

/* ----------------- For completeness, append the rest of your existing components below (copy from your working file) ----------------- */

/* --- StartFromFixtures (use existing from your app) --- */
// (If you don't have them inline here, use the previous implementations present in your project file.)
// ... <keep the rest of the previously working code: Fixtures, StartFromFixtures, Scoring, Results, Viewer, App shell> ...

export default function App() {
  // Keep your existing app shell logic — this patched Settings component will be used when the user clicks Manage Players.
  // If your current App shell/other components expect certain function names, ensure they are present.
  // For quick testing locally you can render the landing -> settings flow manually:
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
              <Landing onStart={() => to("start")} onResults={() => to("results")} onSettings={() => to("settings")} onFixtures={() => to("fixtures")} />
            </motion.div>
          )}
          {view === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Settings onBack={() => to("landing")} />
            </motion.div>
          )}

          {/* keep existing other views: fixtures, start, scoring, results */}
        </AnimatePresence>
      </div>
      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} RNW Tennis</footer>
    </div>
  );
}

