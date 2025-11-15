// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";

// Images (you requested these imports)
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
const Settings = ({ onBack }) => {
  // desired category order (deduplicated for sane UX)
  const singlesOrder = ["Women's Singles", "Kid's Singles", "Men's(A) Singles", "Men's(B) Singles"];
  const doublesOrder = [
    "Women's Doubles",
    "Kid's Doubles",
    "Men's(A) Doubles",
    "Men's(B) Doubles",
    "Mixed Doubles",
  ];

  // categories state: { singles: {catName: [names]}, doubles: {...} }
  const [cats, setCats] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, text: "" });

  const saveDraft = (c) => {
    try { localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify(c)); } catch {}
  };
  const loadDraft = () => {
    try { const r = localStorage.getItem(LS_PLAYERS_DRAFT); return r ? JSON.parse(r) : null; } catch { return null; }
  };
  const clearDraft = () => { try { localStorage.removeItem(LS_PLAYERS_DRAFT); } catch {} };

  // convert flat arrays -> categories (fallback) or keep existing categories if present
  const normalizeServerPayload = (obj) => {
    // If server already has categories, use them (but ensure ordering)
    if (obj && obj.categories && (obj.categories.singles || obj.categories.doubles)) {
      const sCats = {};
      for (const k of singlesOrder) sCats[k] = Array.isArray(obj.categories.singles?.[k]) ? obj.categories.singles[k] : [];
      // also include any extra server categories not in order (appends)
      const extrasS = obj.categories.singles ? Object.keys(obj.categories.singles).filter(k => !singlesOrder.includes(k)) : [];
      for (const k of extrasS) sCats[k] = obj.categories.singles[k] || [];

      const dCats = {};
      for (const k of doublesOrder) dCats[k] = Array.isArray(obj.categories.doubles?.[k]) ? obj.categories.doubles[k] : [];
      const extrasD = obj.categories.doubles ? Object.keys(obj.categories.doubles).filter(k => !doublesOrder.includes(k)) : [];
      for (const k of extrasD) dCats[k] = obj.categories.doubles[k] || [];

      return { singles: sCats, doubles: dCats };
    }

    // If server returned flat arrays, put them into an "Uncategorized" bucket so names aren't lost
    const sFlat = Array.isArray(obj?.singles) ? obj.singles : [];
    const dFlat = Array.isArray(obj?.doubles) ? obj.doubles : [];

    const sCats = {};
    for (const k of singlesOrder) sCats[k] = [];
    if (sFlat.length) {
      // put flat list into first singles category (so not lost) — user can reassign later
      const primary = singlesOrder[0];
      sCats[primary] = sFlat.slice();
    }
    const dCats = {};
    for (const k of doublesOrder) dCats[k] = [];
    if (dFlat.length) {
      const primary = doublesOrder[0];
      dCats[primary] = dFlat.slice();
    }
    return { singles: sCats, doubles: dCats };
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const draft = loadDraft();
      if (draft) {
        setCats(draft);
        setDirty(true);
        setLoading(false);
        return;
      }
      try {
        const obj = await apiPlayersGet();
        if (!alive) return;
        const normalized = normalizeServerPayload(obj || {});
        setCats(normalized);
      } catch (e) {
        // fallback to empty categories
        const emptyS = {}; const emptyD = {};
        for (const k of singlesOrder) emptyS[k] = [];
        for (const k of doublesOrder) emptyD[k] = [];
        setCats({ singles: emptyS, doubles: emptyD });
        setError("Could not load players (KV maybe off). You can edit and Save to retry.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line

  const markDirty = (newCats) => { setDirty(true); saveDraft(newCats); setCats(newCats); };

  // per-category helpers
  const addPlayerToCategory = (type, cat) => {
    const nc = { ...cats, [type]: { ...cats[type] } };
    nc[type][cat] = [...(nc[type][cat] || []), "New Player"];
    markDirty(nc);
  };
  const updatePlayerInCategory = (type, cat, idx, val) => {
    const nc = { ...cats, [type]: { ...cats[type] } };
    const arr = [...(nc[type][cat] || [])];
    arr[idx] = val;
    nc[type][cat] = arr;
    markDirty(nc);
  };
  const removePlayerInCategory = (type, cat, idx) => {
    const nc = { ...cats, [type]: { ...cats[type] } };
    const arr = [...(nc[type][cat] || [])];
    arr.splice(idx, 1);
    nc[type][cat] = arr;
    markDirty(nc);
  };

  // Save: flatten categories into singles/doubles flat arrays for compatibility,
  // and also send categories map so you keep the grouping persisted.
  const doSave = async () => {
    setSaving(true); setError("");
    try {
      const flatSingles = [];
      const flatDoubles = [];
      for (const k of Object.keys(cats.singles || {})) {
        const arr = cats.singles[k] || [];
        for (const name of arr) if (name && String(name).trim()) flatSingles.push(String(name).trim());
      }
      for (const k of Object.keys(cats.doubles || {})) {
        const arr = cats.doubles[k] || [];
        for (const name of arr) if (name && String(name).trim()) flatDoubles.push(String(name).trim());
      }

      const payload = {
        singles: flatSingles,
        doubles: flatDoubles,
        categories: { singles: cats.singles, doubles: cats.doubles },
      };

      await apiPlayersSet(payload);
      setDirty(false);
      clearDraft();
      setToast({ show: true, text: "Players saved" });
      setTimeout(() => setToast({ show: false, text: "" }), 1300);
    } catch (e) {
      console.error(e);
      setError("Save failed. Keep editing and try again.");
      saveDraft(cats);
      setDirty(true);
    } finally {
      setSaving(false);
    }
  };

  // add category (rare) — app-defined ordering retained but allow extras
  const addCategory = (type) => {
    const name = prompt("Enter new category name");
    if (!name) return;
    const nc = { ...cats, [type]: { ...(cats[type] || {}) } };
    if (!nc[type][name]) nc[type][name] = [];
    markDirty(nc);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {toast.show && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-lg">{toast.text}</div>}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={doSave} disabled={!dirty || saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}
      {loading ? (
        <Card className="p-5 text-center text-zinc-500">Loading…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* SINGLES */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Singles</div>
              <div>
                <button className="text-sm text-zinc-500 hover:underline" onClick={() => addCategory("singles")}>+ Add category</button>
              </div>
            </div>
            <div className="space-y-4">
              {Object.keys(cats.singles || {}).map((cat) => (
                <div key={cat} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat}</div>
                    <div className="text-sm text-zinc-500">{(cats.singles[cat] || []).length} players</div>
                  </div>
                  <div className="space-y-2">
                    {(cats.singles[cat] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updatePlayerInCategory("singles", cat, idx, e.target.value)} />
                        <button onClick={() => removePlayerInCategory("singles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div>
                      <Button variant="secondary" onClick={() => addPlayerToCategory("singles", cat)}><Plus className="w-4 h-4" /> Add Player</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* DOUBLES */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Doubles</div>
              <div>
                <button className="text-sm text-zinc-500 hover:underline" onClick={() => addCategory("doubles")}>+ Add category</button>
              </div>
            </div>
            <div className="space-y-4">
              {Object.keys(cats.doubles || {}).map((cat) => (
                <div key={cat} className="border rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat}</div>
                    <div className="text-sm text-zinc-500">{(cats.doubles[cat] || []).length} pairs</div>
                  </div>
                  <div className="space-y-2">
                    {(cats.doubles[cat] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updatePlayerInCategory("doubles", cat, idx, e.target.value)} />
                        <button onClick={() => removePlayerInCategory("doubles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <div>
                      <Button variant="secondary" onClick={() => addPlayerToCategory("doubles", cat)}><Plus className="w-4 h-4" /> Add Pair</Button>
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

/* ----------------- Fixtures, StartFromFixtures, Scoring, Results etc. ----------------- */
/* For brevity these components are unchanged from the app you already have.
   I assume you will keep your existing Fixtures/StartFromFixtures/Scoring/Results
   definitions as they were — they rely on apiPlayersGet to return flat arrays (we keep those).
   If you want me to paste the unchanged versions as well, I can. */

/* --- placeholder stubs (use your existing implementations in your project) --- */
function Fixtures({ onBack }) {
  // you already have this; keep your implementation
  return <div />;
}
function StartFromFixtures({ onBack, onStartScoring }) {
  return <div />;
}
function Scoring({ config, onAbort, onComplete }) {
  return <div />;
}
function Results({ onBack }) {
  return <div />;
}

/* ----------------- App shell ----------------- */
export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  // if you have separate viewer route, handle it (not modifying viewer here)
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

      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} RNW NPL</footer>
    </div>
  );
}

