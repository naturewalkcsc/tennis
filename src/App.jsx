import React, { useEffect, useState } from "react";
import { Trophy, ChevronLeft, Plus, Trash2 } from "lucide-react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* -------------------------
   Helper & API wrappers
   ------------------------- */
const buster = () => "?t=" + Date.now();

async function apiPlayersGet() {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("failed");
  return await r.json();
}
async function apiPlayersSet(payload) {
  const r = await fetch("/api/players" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!r.ok) throw new Error("failed");
  return await r.json();
}

/* -------------------------
   Category lists / order
   ------------------------- */
const SINGLES_ORDER = [
  "Women's Singles",
  "Kid's Singles",
  "Kid's Singles (B)",
  "Men's(A) Singles",
  "Men's(B) Singles",
];

const DOUBLES_ORDER = [
  "Women's Doubles",
  "Kid's Doubles",
  "Kid's Doubles (B)",
  "Men's(A) Doubles",
  "Men's(B) Doubles",
  "Mixed Doubles",
];

/* -------------------------
   Utilities
   ------------------------- */
const emptyPlayersShape = () => {
  const singles = {};
  for (const k of SINGLES_ORDER) singles[k] = [];
  const doubles = {};
  for (const k of DOUBLES_ORDER) doubles[k] = [];
  return { singles, doubles };
};

const LS_DRAFT = "lt_players_categories_draft";

/* -------------------------
   Primitives (small UI)
   ------------------------- */
const Card = ({ children, className = "" }) => (
  <div className={"bg-white rounded-2xl shadow border border-zinc-200 " + className}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", ...rest }) => {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium";
  const classes =
    variant === "primary"
      ? "bg-green-600 text-white hover:bg-green-700"
      : variant === "secondary"
      ? "bg-zinc-100 hover:bg-zinc-200"
      : "hover:bg-zinc-100";
  return (
    <button onClick={onClick} className={`${base} ${classes}`} {...rest}>
      {children}
    </button>
  );
};

/* -------------------------
   Admin Login (local)
   ------------------------- */
function AdminLogin({ onOk }) {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    // default credential known to admin: admin / rnwtennis123$
    if (user === "admin" && pass === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      onOk();
    } else {
      setErr("Invalid credentials");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-2">Admin Login</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <div className="text-sm mb-1">Username</div>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <div className="text-sm mb-1">Password</div>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="flex gap-2">
            <Button type="submit">Login</Button>
            <Button variant="secondary" onClick={() => { setUser("admin"); setPass(""); }}>
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/* -------------------------
   Landing (buttons with images)
   ------------------------- */
const Landing = ({ onStart, onResults, onSettings }) => {
  const Tile = ({ title, subtitle, src, onClick }) => (
    <button onClick={onClick} className="rounded-2xl overflow-hidden border shadow bg-white text-left w-full md:w-80">
      <div className="h-40 relative">
        <img src={src} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-zinc-600">{subtitle}</div>
      </div>
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-6 h-6 text-green-600" />
        <h1 className="text-2xl font-bold">Lawn Tennis Scoring (Admin)</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Tile title="Start Match" subtitle="Choose fixture & start scoring" src={imgStart} onClick={onStart} />
        <Tile title="Results" subtitle="Active • Upcoming • Completed" src={imgScore} onClick={onResults} />
        <Tile title="Manage Players" subtitle="Organize players by category" src={imgSettings} onClick={onSettings} />
      </div>
    </div>
  );
};

/* -------------------------
   Manage Players (categories)
   ------------------------- */
function ManagePlayers({ onBack }) {
  const [data, setData] = useState(emptyPlayersShape());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  // draft load/save (localStorage) so edits aren't lost if save fails
  useEffect(() => {
    let alive = true;
    (async () => {
      // load draft first
      try {
        const draft = localStorage.getItem(LS_DRAFT);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (alive) {
            setData((prev) => ({ ...prev, ...parsed }));
            setDirty(true);
            setLoading(false);
            return;
          }
        }
      } catch (e) {}
      // else fetch from API
      try {
        const obj = await apiPlayersGet();
        // normalize shape: ensure categories exist
        const normalized = emptyPlayersShape();
        if (obj && obj.singles) {
          for (const k of Object.keys(obj.singles)) {
            if (k in normalized.singles) normalized.singles[k] = Array.isArray(obj.singles[k]) ? obj.singles[k] : [];
            else normalized.singles[k] = Array.isArray(obj.singles[k]) ? obj.singles[k] : [];
          }
        }
        if (obj && obj.doubles) {
          for (const k of Object.keys(obj.doubles)) {
            if (k in normalized.doubles) normalized.doubles[k] = Array.isArray(obj.doubles[k]) ? obj.doubles[k] : [];
            else normalized.doubles[k] = Array.isArray(obj.doubles[k]) ? obj.doubles[k] : [];
          }
        }
        if (alive) setData(normalized);
      } catch (e) {
        // if backend not available, keep empty shape
        console.warn("players load failed", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  function saveDraft(curr) {
    try {
      localStorage.setItem(LS_DRAFT, JSON.stringify(curr));
    } catch {}
  }

  function setCategoryValue(kind, cat, arr) {
    setData((prev) => {
      const next = { ...prev, [kind]: { ...prev[kind], [cat]: arr } };
      setDirty(true);
      saveDraft(next);
      return next;
    });
  }

  function addToCategory(kind, cat) {
    setData((prev) => {
      const arr = [...(prev[kind][cat] || []), ""];
      const next = { ...prev, [kind]: { ...prev[kind], [cat]: arr } };
      setDirty(true);
      saveDraft(next);
      return next;
    });
  }

  function updateName(kind, cat, idx, value) {
    setData((prev) => {
      const arr = [...(prev[kind][cat] || [])];
      arr[idx] = value;
      const next = { ...prev, [kind]: { ...prev[kind], [cat]: arr } };
      setDirty(true);
      saveDraft(next);
      return next;
    });
  }

  function deleteName(kind, cat, idx) {
    setData((prev) => {
      const arr = [...(prev[kind][cat] || [])];
      arr.splice(idx, 1);
      const next = { ...prev, [kind]: { ...prev[kind], [cat]: arr } };
      setDirty(true);
      saveDraft(next);
      return next;
    });
  }

  async function doSave() {
    setSaving(true);
    setError("");
    try {
      // POST shape expected by the API
      await apiPlayersSet({ singles: data.singles, doubles: data.doubles });
      setDirty(false);
      localStorage.removeItem(LS_DRAFT);
      // small confirmation (you can change to toast)
      alert("Saved players successfully.");
    } catch (e) {
      console.error(e);
      setError("Save failed — will keep a local draft. Try again.");
      saveDraft(data); // keep draft
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Manage Players (by Category)</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Refresh
          </Button>
          <Button onClick={doSave} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-700 bg-red-50 p-3 rounded">{error}</div>}

      {loading ? (
        <Card className="p-6 text-zinc-500">Loading players…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Singles */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Singles</div>
              <div className="text-sm text-zinc-500">Add single players to relevant categories</div>
            </div>

            <div className="space-y-4">
              {SINGLES_ORDER.map((cat) => (
                <div key={cat} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={() => addToCategory("singles", cat)}>
                        <Plus className="w-4 h-4" /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(data.singles[cat] || []).map((nm, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-xl border px-3 py-2"
                          value={nm}
                          placeholder="Player name"
                          onChange={(e) => updateName("singles", cat, idx, e.target.value)}
                        />
                        <button
                          onClick={() => deleteName("singles", cat, idx)}
                          className="p-2 rounded hover:bg-zinc-100"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!data.singles[cat] || data.singles[cat].length === 0) && (
                      <div className="text-sm text-zinc-500">No players yet.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Doubles */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold">Doubles</div>
              <div className="text-sm text-zinc-500">Add pairs to relevant categories</div>
            </div>

            <div className="space-y-4">
              {DOUBLES_ORDER.map((cat) => (
                <div key={cat} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{cat}</div>
                    <div>
                      <Button variant="secondary" onClick={() => addToCategory("doubles", cat)}>
                        <Plus className="w-4 h-4" /> Add
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(data.doubles[cat] || []).map((nm, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-xl border px-3 py-2"
                          value={nm}
                          placeholder="Pair label e.g. Serena/Venus"
                          onChange={(e) => updateName("doubles", cat, idx, e.target.value)}
                        />
                        <button onClick={() => deleteName("doubles", cat, idx)} className="p-2 rounded hover:bg-zinc-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!data.doubles[cat] || data.doubles[cat].length === 0) && (
                      <div className="text-sm text-zinc-500">No pairs yet.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      <div className="text-xs text-zinc-500 mt-4">{dirty ? "You have unsaved changes." : "All changes saved."}</div>
    </div>
  );
}

/* -------------------------
   App shell with Landing & ManagePlayers
   ------------------------- */
export default function App() {
  const [view, setView] = useState("landing");
  const logged = typeof window !== "undefined" && localStorage.getItem("lt_admin") === "1";

  if (!logged) {
    return <AdminLogin onOk={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto py-8">
        {view === "landing" && <Landing onStart={() => setView("start")} onResults={() => setView("results")} onSettings={() => setView("settings")} />}
        {view === "settings" && <ManagePlayers onBack={() => setView("landing")} />}
        {/* placeholders for other screens */}
        {view === "start" && (
          <div className="p-6">
            <Button onClick={() => setView("landing")}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Card className="p-6 mt-6">Start Match - placeholder</Card>
          </div>
        )}
        {view === "results" && (
          <div className="p-6">
            <Button onClick={() => setView("landing")}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Card className="p-6 mt-6">Results - placeholder</Card>
          </div>
        )}
      </div>
    </div>
  );
}

