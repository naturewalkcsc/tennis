import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";
import imgStart from "./assets/StartMatch.jpg";
import imgScore from "./assets/Score.jpg";
import imgSettings from "./assets/Settings.jpg";

// ------------------ Constants ------------------
// The categories you gave, in the order to combine/sort by:
const CATEGORIES = [
  "Men's (A) Singles",
  "Men's (A) Doubles",
  "Women's Singles",
  "Women's Doubles",
  "Mixed Doubles",
  "Kid's Singles",
  "Kid's Doubles",
  "Men's (B) Doubles",
];

const LS_MATCHES_FALLBACK = "lt_matches_fallback",
  LS_PLAYERS_DRAFT = "lt_players_draft";
const readLS = (k, f) => {
  try {
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : f;
  } catch {
    return f;
  }
};
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const buster = () => "?t=" + Date.now();

// ------------------ API wrappers ------------------
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
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error("API add failed: " + text);
  }
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

// ------------------ UI primitives ------------------
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

// ------------------ Admin Login ------------------
function AdminLogin({ onOk }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    // default credential: admin / rnwtennis123$
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

// ------------------ Landing ------------------
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
        <h1 className="text-2xl font-bold">Lawn Tennis Scoring (Admin)</h1>
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

// ------------------ Settings ------------------
const Settings = ({ onBack }) => {
  const [singles, setSingles] = useState([]);
  const [doubles, setDoubles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const saveDraft = (s, d) => {
    try {
      localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify({ singles: s, doubles: d }));
    } catch {}
  };
  const loadDraft = () => {
    try {
      const r = localStorage.getItem(LS_PLAYERS_DRAFT);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  };
  const clearDraft = () => {
    try {
      localStorage.removeItem(LS_PLAYERS_DRAFT);
    } catch {}
  };

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
    return () => {
      alive = false;
    };
  }, []);

  const mark = (s, d) => {
    setDirty(true);
    saveDraft(s, d);
  };
  const addSingles = () => {
    const s = [...singles, "New Player"];
    setSingles(s);
    mark(s, doubles);
  };
  const addDoubles = () => {
    const d = [...doubles, "Team X/Team Y"];
    setDoubles(d);
    mark(singles, d);
  };
  const updSingles = (i, v) =>
    setSingles((p) => {
      const s = p.map((x, idx) => (idx === i ? v : x));
      mark(s, doubles);
      return s;
    });
  const updDoubles = (i, v) =>
    setDoubles((p) => {
      const d = p.map((x, idx) => (idx === i ? v : x));
      mark(singles, d);
      return d;
    });
  const delSingles = (i) => {
    const s = singles.filter((_, idx) => idx !== i);
    setSingles(s);
    mark(s, doubles);
  };
  const delDoubles = (i) => {
    const d = doubles.filter((_, idx) => idx !== i);
    setDoubles(d);
    mark(singles, d);
  };
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
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto">
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
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
                  <button onClick={() => delSingles(idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button variant="secondary" onClick={addSingles}>
                <Plus className="w-4 h-4" /> Add Player
              </Button>
            </div>
          </Card>
          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div className="space-y-3">
              {doubles.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updDoubles(idx, e.target.value)} />
                  <button onClick={() => delDoubles(idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button variant="secondary" onClick={addDoubles}>
                <Plus className="w-4 h-4" /> Add Pair
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ------------------ Helper: combine & sort fixtures by category then start date ------------------
function combineAndSortFixtures(list) {
  if (!Array.isArray(list)) return [];
  // Ensure every fixture has category and start (number)
  const normalized = list.map((f) => ({
    ...f,
    category: f.category || "Unspecified",
    start: typeof f.start === "string" ? Date.parse(f.start) : f.start || 0,
  }));
  // Create ordering map from CATEGORIES array; unknown categories go to the end
  const orderMap = new Map(CATEGORIES.map((c, i) => [c, i]));
  const defaultIndex = CATEGORIES.length + 1000;
  // Sort by category index then by start time
  normalized.sort((a, b) => {
    const ai = orderMap.has(a.category) ? orderMap.get(a.category) : defaultIndex;
    const bi = orderMap.has(b.category) ? orderMap.get(b.category) : defaultIndex;
    if (ai !== bi) return ai - bi;
    return (a.start || 0) - (b.start || 0);
  });
  return normalized;
}

// ------------------ Fixtures ------------------
const Fixtures = ({ onBack }) => {
  const [players, setPlayers] = useState({ singles: [], doubles: [] });
  const [mode, setMode] = useState("singles");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet().catch(() => ({ singles: [], doubles: [] }));
        if (alive) setPlayers(p);
      } catch {}
      try {
        const fx = await apiFixturesList().catch(() => []);
        if (alive) setList(combineAndSortFixtures(fx));
      } catch (e) {
        if (alive) setError("Could not load fixtures");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const options = mode === "singles" ? players.singles : players.doubles;
  const canAdd = a && b && a !== b && date && time && category;

  const add = async (e) => {
    e.preventDefault();
    try {
      const start = new Date(`${date}T${time}:00`).getTime();
      const payload = {
        id: crypto.randomUUID(),
        mode,
        sides: [a, b],
        start,
        status: "upcoming",
        category,
      };
      await apiFixturesAdd(payload);
      // fetch fresh list to ensure server state used, but also optimistic update
      const fx = await apiFixturesList().catch(() => []);
      const merged = combineAndSortFixtures(fx.concat(payload));
      setList(merged);
      setA("");
      setB("");
      setDate("");
      setTime("");
      setCategory(CATEGORIES[0]);
    } catch (err) {
      console.error("Failed adding fixture", err);
      setError("Failed to add fixture (check server).");
    }
  };

  const remove = async (id) => {
    try {
      await apiFixturesRemove(id);
      setList((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError("Remove failed");
    }
  };

  const clear = async () => {
    if (!confirm("Clear ALL fixtures?")) return;
    try {
      await apiFixturesClear();
      setList([]);
    } catch {
      setError("Clear failed");
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const fx = await apiFixturesList();
      setList(combineAndSortFixtures(fx));
    } catch {
      setError("Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Fixtures</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={refresh}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button variant="secondary" onClick={clear}>
            Clear All
          </Button>
        </div>
      </div>

      {error && <Card className="p-3 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? (
        <Card className="p-5 text-center text-zinc-500">Loading…</Card>
      ) : (
        <>
          <Card className="p-5 mb-6">
            <div className="font-semibold mb-3">Schedule a Match</div>
            <form onSubmit={add} className="grid md:grid-cols-5 gap-3">
              <div className="md:col-span-1">
                <div className="text-sm mb-1">Type</div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="mode" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="mode" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles
                  </label>
                </div>
              </div>

              <div>
                <div className="text-sm mb-1">{mode === "singles" ? "Player 1" : "Team 1"}</div>
                <select className="w-full rounded-xl border px-3 py-2" value={a} onChange={(e) => setA(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm mb-1">{mode === "singles" ? "Player 2" : "Team 2"}</div>
                <select className="w-full rounded-xl border px-3 py-2" value={b} onChange={(e) => setB(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-sm mb-1">Date</div>
                  <input type="date" className="w-full rounded-xl border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <div className="text-sm mb-1">Time</div>
                  <input type="time" className="w-full rounded-xl border px-3 py-2" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>

              <div>
                <div className="text-sm mb-1">Category</div>
                <select className="w-full rounded-xl border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5">
                <Button type="submit" disabled={!canAdd}>
                  <CalendarPlus className="w-4 h-4" /> Add Fixture
                </Button>
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
                    <div className="font-semibold">
                      <span className="text-sm px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 mr-2">{f.category}</span>
                      {f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span>
                    </div>
                    <div className="text-sm text-zinc-500">
                      {new Date(f.start).toLocaleString()} {f.status === "active" && <span className="ml-2 inline-flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live</span>} {f.status === "completed" && <span className="ml-2 text-zinc-500 text-xs">(completed)</span>}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => remove(f.id)} title="Remove">
                    <X className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ------------------ StartFromFixtures ------------------
function StartFromFixtures({ onBack, onStartScoring }) {
  const [mode, setMode] = useState("singles");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (alive) setFixtures(combineAndSortFixtures(fx));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const list = fixtures.filter((f) => (f.mode || "singles") === mode && f.status !== "completed");

  const startFixture = async (fx) => {
    try {
      const now = Date.now();
      const patch = { status: "active" };
      if (fx.start > now) patch.start = now;
      // deactivate others
      for (const other of fixtures) {
        if (other.id !== fx.id && other.status === "active") {
          await apiFixturesUpdate(other.id, { status: "upcoming" }).catch(() => {});
        }
      }
      await apiFixturesUpdate(fx.id, patch);
      onStartScoring({ mode: fx.mode, sides: fx.sides, rule: "regular", bestOf: 3, gamesTarget: 6, startingServer: 0, fixtureId: fx.id });
    } catch (err) {
      console.error("Start fixture failed", err);
      alert("Could not start match — try refresh.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Start Match</h2>
      </div>
      <Card className="p-5">
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="m" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="m" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles
          </label>
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
                  <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.category}</span></div>
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

// ------------------ Scoring, Results, AdminApp, App Root ------------------
// For brevity this file assumes the rest of your existing code (Scoring, Results, AdminApp, App) remain unchanged.
// If you need I can paste the full file including Scoring/Results unchanged here as well.

export {
  Fixtures,
  StartFromFixtures,
  combineAndSortFixtures,
  CATEGORIES,
};

// If your current App.jsx has definitions for Scoring, Results, AdminApp and the default export,
// simply replace the Fixtures implementation above and add the CATEGORIES + helper function.

