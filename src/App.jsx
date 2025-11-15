import React, { useEffect, useState } from "react";
import { Trophy, ChevronLeft, Plus, Trash2 } from "lucide-react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  App.jsx - focused on Manage Players with categories
  - Saves to /api/players (POST { payload: { singles: [...], doubles: [...] } })
  - If API unavailable, falls back to localStorage key LT_PLAYERS_LOCAL
  - Keeps category structure in localStorage so UI shows categories
*/

/* --- Category keys & order (as requested) --- */
const SINGLES_KEYS = [
  { key: "womensSingles", label: "Women's Singles" },
  { key: "kidsSingles1", label: "Kid's Singles (1)" },
  { key: "kidsSingles2", label: "Kid's Singles (2)" },
  { key: "mensASingles", label: "Men's (A) Singles" },
  { key: "mensBSingles", label: "Men's (B) Singles" },
];

const DOUBLES_KEYS = [
  { key: "womensDoubles", label: "Women's Doubles" },
  { key: "kidsDoubles1", label: "Kid's Doubles (1)" },
  { key: "kidsDoubles2", label: "Kid's Doubles (2)" },
  { key: "mensADoubles", label: "Men's (A) Doubles" },
  { key: "mensBDoubles", label: "Men's (B) Doubles" },
  { key: "mixedDoubles", label: "Mixed Doubles" },
];

const LS_KEY = "LT_PLAYERS_LOCAL_v2";

/* ---- helper API wrappers ---- */
const buster = () => `?t=${Date.now()}`;
async function apiPlayersGet() {
  const res = await fetch(`/api/players${buster()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("API players GET failed");
  return res.json();
}
async function apiPlayersSet(payload) {
  const res = await fetch(`/api/players${buster()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!res.ok) throw new Error("API players POST failed");
  return res.json();
}

/* ---- helper conversions ----
   The API expects a flat { singles: [], doubles: [] } structure in our earlier implementation.
   Internally we keep categories (object with arrays). When sending to API we flatten according to
   the user-requested order. When reading from localStorage we keep category structure.
*/
function buildDefaultCategories() {
  const obj = { singles: {}, doubles: {} };
  SINGLES_KEYS.forEach(k => (obj.singles[k.key] = []));
  DOUBLES_KEYS.forEach(k => (obj.doubles[k.key] = []));
  return obj;
}
function flattenForApi(categories) {
  // categories: { singles: {key: [names]}, doubles: {...} }
  const singles = SINGLES_KEYS.flatMap(k => categories.singles[k.key] || []);
  const doubles = DOUBLES_KEYS.flatMap(k => categories.doubles[k.key] || []);
  return { singles, doubles };
}
/* When API returns only flat arrays, map them back into categories by appending in order.
   This prevents data loss: we put everything into the first matching buckets in order.
*/
function mapApiToCategories(apiObj) {
  const categories = buildDefaultCategories();
  if (!apiObj) return categories;
  // if it's already category-shaped (we stored previously), detect and return
  const hasSinglesObject = apiObj.singles && typeof apiObj.singles === "object" && !Array.isArray(apiObj.singles);
  if (hasSinglesObject) {
    // already in category shape
    const s = apiObj.singles || {};
    const d = apiObj.doubles || {};
    // ensure keys exist
    SINGLES_KEYS.forEach(k => (categories.singles[k.key] = s[k.key] || []));
    DOUBLES_KEYS.forEach(k => (categories.doubles[k.key] = d[k.key] || []));
    return categories;
  }

  // fallback: apiObj.singles is array, distribute
  const singlesArr = Array.isArray(apiObj.singles) ? apiObj.singles.slice() : [];
  const doublesArr = Array.isArray(apiObj.doubles) ? apiObj.doubles.slice() : [];

  // distribute singles in order (append all to first category if user didn't supply mapping)
  let idx = 0;
  for (const name of singlesArr) {
    const k = SINGLES_KEYS[idx % SINGLES_KEYS.length].key;
    categories.singles[k].push(name);
    idx++;
  }
  idx = 0;
  for (const name of doublesArr) {
    const k = DOUBLES_KEYS[idx % DOUBLES_KEYS.length].key;
    categories.doubles[k].push(name);
    idx++;
  }
  return categories;
}

/* ---- UI primitives ---- */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border shadow-sm p-4 ${className}`}>{children}</div>
);
const Button = ({ children, onClick, className = "", variant = "primary", ...rest }) => {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium";
  const styles = {
    primary: "bg-green-600 text-white hover:bg-green-700",
    secondary: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200",
    ghost: "bg-transparent text-zinc-700 hover:bg-zinc-50",
  }[variant];
  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
};

/* ---- Manage Players component (category-based) ---- */
function ManagePlayers({ onBack }) {
  const [categories, setCategories] = useState(buildDefaultCategories());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // load: prefer localStorage if present, else API; keep categories in localStorage always
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // try localStorage first (so UI remains category-aware)
        const localRaw = localStorage.getItem(LS_KEY);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (alive) {
            setCategories(parsed);
            setLoading(false);
            setMsg("Loaded from local draft");
            return;
          }
        }

        // otherwise, try server
        try {
          const apiRes = await apiPlayersGet();
          const cats = mapApiToCategories(apiRes);
          if (alive) {
            setCategories(cats);
            localStorage.setItem(LS_KEY, JSON.stringify(cats)); // keep a local copy
            setMsg("Loaded from server");
          }
        } catch (e) {
          // server not available: start with default categories
          if (alive) {
            setCategories(buildDefaultCategories());
            setMsg("Server unavailable — using local categories");
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const setCategoryArray = (section, key, newArr) => {
    setCategories(prev => {
      const clone = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      clone[section][key] = newArr;
      // persist draft locally immediately
      try { localStorage.setItem(LS_KEY, JSON.stringify(clone)); } catch {}
      return clone;
    });
  };

  const addName = (section, key) => {
    setCategories(prev => {
      const clone = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      clone[section][key] = [...(clone[section][key] || []), "New Player"];
      try { localStorage.setItem(LS_KEY, JSON.stringify(clone)); } catch {}
      return clone;
    });
  };

  const removeAt = (section, key, idx) => {
    setCategoryArray(section, key, (categories[section][key] || []).filter((_, i) => i !== idx));
  };

  const updateAt = (section, key, idx, val) => {
    const arr = [...(categories[section][key] || [])];
    arr[idx] = val;
    setCategoryArray(section, key, arr);
  };

  const doSave = async () => {
    setSaving(true);
    setMsg("");
    const payload = flattenForApi(categories);
    // First save to server; if fails, save to localStorage and alert user
    try {
      await apiPlayersSet({ singles: payload.singles, doubles: payload.doubles });
      // also store the category shape locally so UI remains grouped
      localStorage.setItem(LS_KEY, JSON.stringify(categories));
      setMsg("Saved to server ✅");
    } catch (e) {
      // fallback save locally
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(categories));
        setMsg("Server save failed — saved locally (draft) ⚠️");
      } catch {
        setMsg("Save failed (server and local storage)");
      }
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  const doRefresh = async () => {
    setLoading(true);
    setMsg("");
    try {
      const apiRes = await apiPlayersGet();
      const cats = mapApiToCategories(apiRes);
      setCategories(cats);
      localStorage.setItem(LS_KEY, JSON.stringify(cats));
      setMsg("Refreshed from server");
    } catch (e) {
      // if server fails, keep current categories (which could be local)
      setMsg("Refresh failed — server unreachable");
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const doClearLocal = () => {
    if (!confirm("Clear all local category data? This will remove all names locally.")) return;
    const def = buildDefaultCategories();
    setCategories(def);
    localStorage.setItem(LS_KEY, JSON.stringify(def));
    setMsg("Local categories cleared");
    setTimeout(() => setMsg(""), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players (Categories)</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={doRefresh}>Refresh</Button>
          <Button onClick={doSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {msg && <div className="mb-4 text-sm text-zinc-700">{msg}</div>}
      {loading ? (
        <Card className="text-center">Loading players…</Card>
      ) : (
        <>
          <Card className="mb-5">
            <div className="font-semibold mb-3">Singles</div>
            <div className="grid md:grid-cols-2 gap-4">
              {SINGLES_KEYS.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{label}</div>
                    <Button variant="ghost" onClick={() => addName("singles", key)}><Plus className="w-4 h-4" /> Add</Button>
                  </div>
                  <div className="space-y-2">
                    {(categories.singles[key] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-xl border px-3 py-2"
                          value={name}
                          onChange={(e) => updateAt("singles", key, idx, e.target.value)}
                        />
                        <button className="px-3 py-2 rounded-xl hover:bg-zinc-100" onClick={() => removeAt("singles", key, idx)}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {(categories.singles[key] || []).length === 0 && <div className="text-sm text-zinc-400">No players yet.</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="font-semibold mb-3">Doubles</div>
            <div className="grid md:grid-cols-2 gap-4">
              {DOUBLES_KEYS.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{label}</div>
                    <Button variant="ghost" onClick={() => addName("doubles", key)}><Plus className="w-4 h-4" /> Add</Button>
                  </div>
                  <div className="space-y-2">
                    {(categories.doubles[key] || []).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          className="flex-1 rounded-xl border px-3 py-2"
                          value={name}
                          onChange={(e) => updateAt("doubles", key, idx, e.target.value)}
                        />
                        <button className="px-3 py-2 rounded-xl hover:bg-zinc-100" onClick={() => removeAt("doubles", key, idx)}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {(categories.doubles[key] || []).length === 0 && <div className="text-sm text-zinc-400">No pairs yet.</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-4 text-sm text-zinc-500">
            <button className="underline" onClick={doClearLocal}>Clear local categories</button>
            <div className="mt-2">Note: If your deployment uses Upstash KV and it's available, changes will be saved to server. If server is unavailable, your changes are saved locally (draft).</div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- simple landing that links to ManagePlayers so user can test quickly ---- */
export default function App() {
  const [view, setView] = useState("landing");
  const logged = localStorage.getItem("lt_admin") === "1";

  // simple admin login helper shown if not logged in:
  if (!logged) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border shadow">
          <h2 className="text-xl font-bold mb-3">Admin Login</h2>
          <p className="text-sm text-zinc-600 mb-4">Enter <strong>admin</strong> and your password. (Default password not prefilled.)</p>
          <Login onSuccess={() => window.location.reload()} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {view === "landing" && (
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6"><Trophy className="w-6 h-6 text-green-600"/><h1 className="text-2xl font-bold">Lawn Tennis Scoring</h1></div>
          <div className="grid md:grid-cols-3 gap-6">
            <div onClick={() => setView("manage")} className="rounded-2xl overflow-hidden border shadow bg-white cursor-pointer">
              <div className="h-40 relative"><img src={imgStart} alt="Start" className="w-full h-full object-cover" /></div>
              <div className="p-4"><div className="font-semibold">Manage Players</div><div className="text-sm text-zinc-600">Add players grouped by category</div></div>
            </div>
            <div className="rounded-2xl overflow-hidden border shadow bg-white">
              <div className="h-40 relative"><img src={imgScore} alt="Score" className="w-full h-full object-cover" /></div>
              <div className="p-4"><div className="font-semibold">Results</div><div className="text-sm text-zinc-600">View matches & export</div></div>
            </div>
            <div className="rounded-2xl overflow-hidden border shadow bg-white">
              <div className="h-40 relative"><img src={imgSettings} alt="Settings" className="w-full h-full object-cover" /></div>
              <div className="p-4"><div className="font-semibold">Fixtures</div><div className="text-sm text-zinc-600">Create scheduled matches</div></div>
            </div>
          </div>
        </div>
      )}

      {view === "manage" && <ManagePlayers onBack={() => setView("landing")} />}
    </div>
  );
}

/* ---- simple local login component ---- */
function Login({ onSuccess }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    // default credential check is optional; don't prefill password.
    // If user wants to enforce default, they said earlier admin/rnwtennis123$, but they also asked not to prefill.
    if (u === "admin" && p === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      onSuccess();
    } else {
      setErr("Invalid credentials.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <div className="text-sm mb-1">Username</div>
        <input className="w-full rounded-xl border px-3 py-2" value={u} onChange={(e) => setU(e.target.value)} />
      </div>
      <div>
        <div className="text-sm mb-1">Password</div>
        <input type="password" className="w-full rounded-xl border px-3 py-2" value={p} onChange={(e) => setP(e.target.value)} />
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex gap-2">
        <Button type="submit">Login</Button>
        <Button variant="secondary" onClick={() => { setU("admin"); setP(""); }}>Reset</Button>
      </div>
    </form>
  );
}

