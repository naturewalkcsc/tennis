// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, ChevronLeft, Plus, Trash2, CalendarPlus, RefreshCw, X } from "lucide-react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* ===========================
   Helpers & Small primitives
   =========================== */
const buster = () => "?t=" + Date.now();
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

/* ===========================
   API wrappers (simple)
   =========================== */
const apiPlayersGet = async () => {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("players get failed");
  return await r.json();
};
const apiPlayersSet = async (payload) => {
  const r = await fetch("/api/players" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!r.ok) throw new Error("players set failed");
  return await r.json();
};
const apiFixturesList = async () => {
  const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("fixtures list failed");
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
const apiFixturesUpdate = async (id, patch) => {
  const r = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, patch }),
  });
  if (!r.ok) throw new Error("fixtures update failed");
};

/* ===========================
   Categories config (order requested)
   =========================== */
const SINGLES_CATEGORIES_ORDER = [
  "Women's Singles",
  "Kid's Singles",
  "Kid's Singles", // you requested duplicates in order — keep them if needed
  "Men's (A) Singles",
  "Men's (B) Singles",
];

const DOUBLES_CATEGORIES_ORDER = [
  "Women's Doubles",
  "Kid's Doubles",
  "Kid's Doubles",
  "Men's (A) Doubles",
  "Men's (B) Doubles",
  "Mixed Doubles",
];

/* ===========================
   Admin Login (local)
   =========================== */
function AdminLogin({ onOk }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (u === "admin" && p === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      onOk();
    } else {
      setErr("Invalid username or password");
    }
  };

  return (
    <div className="app-bg min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <div className="text-sm text-zinc-600">Default: admin / (enter password)</div>
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

/* ===========================
   Viewer (public path: /viewer)
   - Shows three buttons: Rules, Teams, Fixture/Scores
   =========================== */
function Viewer() {
  const [panel, setPanel] = useState("home");
  const [fixtures, setFixtures] = useState([]);
  const [playersData, setPlayersData] = useState({ singles: {}, doubles: {} });
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const f = await apiFixturesList();
        if (alive) setFixtures(f || []);
      } catch (_) {
        if (alive) setFixtures([]);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    (async () => {
      try {
        const p = await apiPlayersGet();
        if (alive) {
          // normalize – if legacy array -> convert to category-less format
          if (Array.isArray(p.singles)) {
            // convert to a default single category
            setPlayersData({ singles: { "General Singles": p.singles }, doubles: { "General Doubles": p.doubles || [] } });
          } else {
            setPlayersData({ singles: p.singles || {}, doubles: p.doubles || {} });
          }
        }
      } catch (_) {
        if (alive) setPlayersData({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen app-bg py-8">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold">Public Viewer</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <motion.button onClick={() => setPanel("rules")} whileHover={{ y: -2 }} className="w-full rounded-2xl overflow-hidden border shadow bg-white text-left">
            <div className="h-40 relative">
              <img src={imgStart} className="absolute inset-0 w-full h-full object-cover" alt="rules" />
            </div>
            <div className="p-4">
              <div className="font-semibold">Rules</div>
              <div className="text-sm text-zinc-600">Match rules and formats</div>
            </div>
          </motion.button>

          <motion.button onClick={() => setPanel("teams")} whileHover={{ y: -2 }} className="w-full rounded-2xl overflow-hidden border shadow bg-white text-left">
            <div className="h-40 relative">
              <img src={imgScore} className="absolute inset-0 w-full h-full object-cover" alt="teams" />
            </div>
            <div className="p-4">
              <div className="font-semibold">Teams</div>
              <div className="text-sm text-zinc-600">View players by category</div>
            </div>
          </motion.button>

          <motion.button onClick={() => setPanel("fixtures")} whileHover={{ y: -2 }} className="w-full rounded-2xl overflow-hidden border shadow bg-white text-left">
            <div className="h-40 relative">
              <img src={imgSettings} className="absolute inset-0 w-full h-full object-cover" alt="fixtures" />
            </div>
            <div className="p-4">
              <div className="font-semibold">Fixture/Scores</div>
              <div className="text-sm text-zinc-600">Live, upcoming & recent results</div>
            </div>
          </motion.button>
        </div>

        <div>
          {panel === "rules" && <RulesPanel />}
          {panel === "teams" && <TeamsPanel loading={loadingPlayers} playersData={playersData} />}
          {panel === "fixtures" && <FixturesPanel loading={loadingFixtures} fixtures={fixtures} />}
          {panel === "home" && (
            <div className="text-zinc-500">Select a panel above to view rules, teams or fixtures.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Rules Panel (uses updated wording)
   =========================== */
function RulesPanel() {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Match Formats & Rules</h2>

      <div className="mb-4">
        <h3 className="font-semibold">Qualifiers and Semifinal Matches Format: Fast4(chrome-extension://efaidnbmnnnibpcajpcglclefindmkaj/https://www.tennis.com.au/wp-content/uploads/2016/12/FAST4-Tennis-Information-Sheet.pdf) will be followed.</h3>
        <ol className="list-decimal ml-6 mt-2 space-y-2 text-sm">
          <li>
            <strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.
          </li>
          <li>
            <strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played. The tiebreak is won by the first player to reach 5 points. If it reaches 4-4, next point wins.
          </li>
          <li>
            <strong>No-adv (no AD) scoring</strong> — When game hits deuce (40-40) the next point decides the game. Receiver chooses which side the server will serve from. In doubles, receiving team chooses receiving side.
          </li>
        </ol>
      </div>

      <div>
        <h3 className="font-semibold">Final Matches format:</h3>
        <ol className="list-decimal ml-6 mt-2 space-y-2 text-sm">
          <li>
            <strong>One full set</strong> — Standard set rule of 6 games and Tie break will be followed.
          </li>
          <li>
            <strong>Limited Deuce Points</strong> — As a deviation max 3 deuce points will be allowed. At 4th deuce the next point decides the game.
          </li>
        </ol>
      </div>
      <div>
        <h3 className="font-semibold">Other Rules</h3>
        <ol className="list-decimal ml-6 mt-2 space-y-2 text-sm">
          <li>
            <strong>Water break between games</strong> — Each team/player can take maximum of 1 break of 1 minute (so maximum 2 breaks) each whenever they prefer.
          </li>
          <li>
            <strong>Warmn up break</strong> — Each team/player will be given maximum 3 minutes of warm up time before the match.
          </li>
          <li>
            <strong>Warmn up break</strong> — During tournament if anhy player is not available the opponent will be given walk-over, but organizing committee's decision will be final.
          </li>
        </ol>
      </div>
    </Card>
  );
}

/* ===========================
   Teams Panel - Colored, nicer table
   - playersData: { singles: {category: [names...]}, doubles: {category: [names...]} }
   =========================== */
function TeamsPanel({ loading, playersData }) {
  // nice palette to pick colors from
  const colorPalette = ["#c7f9cc", "#cff4ff", "#ffedd5", "#f0e6ff", "#ffe4e6", "#e6f7ff"];

  const catKeysSingles = Object.keys(playersData.singles || {});
  const catKeysDoubles = Object.keys(playersData.doubles || {});

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Singles</h3>
          <div className="text-sm text-zinc-500">{loading ? "Loading..." : `${catKeysSingles.length} categories`}</div>
        </div>

        {catKeysSingles.length === 0 ? (
          <div className="text-zinc-500">No players yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {catKeysSingles.map((cat, idx) => (
              <div key={cat} className="p-3 rounded-xl" style={{ background: colorPalette[idx % colorPalette.length] }}>
                <div className="font-semibold">{cat}</div>
                <ul className="mt-2 list-disc ml-5">
                  {(playersData.singles[cat] || []).map((p, i) => <li key={i} className="text-sm">{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Doubles</h3>
          <div className="text-sm text-zinc-500">{loading ? "Loading..." : `${catKeysDoubles.length} categories`}</div>
        </div>

        {catKeysDoubles.length === 0 ? (
          <div className="text-zinc-500">No pairs yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {catKeysDoubles.map((cat, idx) => (
              <div key={cat} className="p-3 rounded-xl" style={{ background: colorPalette[(idx + 2) % colorPalette.length] }}>
                <div className="font-semibold">{cat}</div>
                <ul className="mt-2 list-disc ml-5">
                  {(playersData.doubles[cat] || []).map((p, i) => <li key={i} className="text-sm">{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ===========================
   Fixtures Panel (public)
   =========================== */
function FixturesPanel({ loading, fixtures = [] }) {
  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completed = fixtures.filter((f) => f.status === "completed").sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5">
        <div className="text-lg font-semibold mb-3">Active</div>
        {active.length ? active.map((f) => (
          <div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
            <div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
          </div>
        )) : <div className="text-zinc-500">No active match.</div>}

        <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
        {upcoming.length ? upcoming.map((f) => (
          <div key={f.id} className="py-2 border-b last:border-0">
            <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div>
            <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
          </div>
        )) : <div className="text-zinc-500">No upcoming fixtures.</div>}
      </Card>

      <Card className="p-5">
        <div className="text-lg font-semibold mb-3">Completed</div>
        {completed.length ? completed.map((f) => (
          <div key={f.id} className="py-2 border-b last:border-0">
            <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
            <div className="text-sm text-zinc-500">{f.finishedAt ? new Date(f.finishedAt).toLocaleString() : ""}</div>
            <div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{f.winner || ""}</span> <span className="ml-3 font-mono">{f.scoreline || ""}</span></div>
          </div>
        )) : <div className="text-zinc-500">No completed fixtures.</div>}
      </Card>
    </div>
  );
}

/* ===========================
   Manage Players (admin) - categories view
   - Saves structured data to /api/players as:
     { singles: {category: [names]}, doubles: {category: [names]} }
   - No toast on save; show error message inline if save fails
   =========================== */
function ManagePlayers({ onBack }) {
  const [data, setData] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // initialize categories with order (ensure keys exist)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet();
        // normalize: if legacy arrays -> convert to default categories
        let singles = {};
        let doubles = {};
        if (Array.isArray(p.singles)) {
          singles = { "Women's Singles": p.singles || [] };
        } else {
          singles = { ...p.singles };
        }
        if (Array.isArray(p.doubles)) {
          doubles = { "Women's Doubles": p.doubles || [] };
        } else {
          doubles = { ...p.doubles };
        }
        // ensure all configured categories exist (but do not wipe user data)
        SINGLES_CATEGORIES_ORDER.forEach((c) => { if (!singles[c]) singles[c] = []; });
        DOUBLES_CATEGORIES_ORDER.forEach((c) => { if (!doubles[c]) doubles[c] = []; });
        if (alive) setData({ singles, doubles });
      } catch (e) {
        // start with empty categories
        const singles = {};
        const doubles = {};
        SINGLES_CATEGORIES_ORDER.forEach((c) => (singles[c] = []));
        DOUBLES_CATEGORIES_ORDER.forEach((c) => (doubles[c] = []));
        if (alive) setData({ singles, doubles });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setPlayerName = (type, category, idx, val) => {
    setData((prev) => {
      const copy = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      const arr = Array.isArray(type === "singles" ? copy.singles[category] : copy.doubles[category])
        ? (type === "singles" ? copy.singles[category] : copy.doubles[category]).slice()
        : [];
      arr[idx] = val;
      if (type === "singles") copy.singles[category] = arr;
      else copy.doubles[category] = arr;
      return copy;
    });
  };

  const addPlayer = (type, category) => {
    setData((prev) => {
      const copy = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      const arr = (type === "singles" ? copy.singles[category] : copy.doubles[category]) || [];
      const newArr = [...arr, "New Player"];
      if (type === "singles") copy.singles[category] = newArr;
      else copy.doubles[category] = newArr;
      return copy;
    });
  };

  const removePlayer = (type, category, idx) => {
    setData((prev) => {
      const copy = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      const arr = (type === "singles" ? copy.singles[category] : copy.doubles[category]) || [];
      const newArr = arr.filter((_, i) => i !== idx);
      if (type === "singles") copy.singles[category] = newArr;
      else copy.doubles[category] = newArr;
      return copy;
    });
  };

  const doSave = async () => {
    setSaving(true);
    setError("");
    try {
      // send data as structured object
      await apiPlayersSet({ singles: data.singles, doubles: data.doubles });
      // do not show toast - per user request
    } catch (e) {
      setError("Save failed. Make sure KV is configured.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto">
          <Button onClick={doSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? (
        <Card className="p-5 text-zinc-500 text-center">Loading…</Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="font-semibold mb-3">Singles</div>
              <div className="space-y-4">
                {SINGLES_CATEGORIES_ORDER.map((cat) => (
                  <div key={cat} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{cat}</div>
                      <div className="text-xs text-zinc-500">({(data.singles[cat] || []).length})</div>
                    </div>
                    <div className="space-y-2">
                      {(data.singles[cat] || []).map((name, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => setPlayerName("singles", cat, idx, e.target.value)} />
                          <button onClick={() => removePlayer("singles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <div>
                        <Button variant="secondary" onClick={() => addPlayer("singles", cat)}><Plus className="w-4 h-4" /> Add Player</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="font-semibold mb-3">Doubles</div>
              <div className="space-y-4">
                {DOUBLES_CATEGORIES_ORDER.map((cat) => (
                  <div key={cat} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{cat}</div>
                      <div className="text-xs text-zinc-500">({(data.doubles[cat] || []).length})</div>
                    </div>
                    <div className="space-y-2">
                      {(data.doubles[cat] || []).map((name, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => setPlayerName("doubles", cat, idx, e.target.value)} />
                          <button onClick={() => removePlayer("doubles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <div>
                        <Button variant="secondary" onClick={() => addPlayer("doubles", cat)}><Plus className="w-4 h-4" /> Add Pair</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ===========================
   Landing (admin) and Main App Shell
   - preserves original layout: Start Match | Results | Manage Players
   - fixtures button below (admin only)
   =========================== */
function Landing({ onStart, onResults, onSettings, onFixtures }) {
  const Tile = ({ title, subtitle, src, action }) => (
    <motion.button onClick={action} whileHover={{ y: -2 }} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left">
      <div className="h-40 relative"><img src={src} className="absolute inset-0 w-full h-full object-cover" alt={title} /></div>
      <div className="p-4"><div className="font-semibold">{title}</div><div className="text-sm text-zinc-600">{subtitle}</div></div>
    </motion.button>
  );
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8"><Trophy className="w-6 h-6 text-green-600" /><h1 className="text-2xl font-bold">Lawn Tennis Scoring (Admin)</h1></div>
      <div className="grid md:grid-cols-3 gap-6">
        <Tile title="Start Match" subtitle="Choose from fixtures" src={imgStart} action={onStart} />
        <Tile title="Results" subtitle="Active • Upcoming • Completed" src={imgScore} action={onResults} />
        <Tile title="Manage Players" subtitle="Singles & Doubles" src={imgSettings} action={onSettings} />
      </div>
      <div className="mt-6"><Button variant="secondary" onClick={onFixtures}><CalendarPlus className="w-4 h-4" /> Fixtures</Button></div>
    </div>
  );
}

/* ===========================
   MAIN APP export
   - If path starts with /viewer -> render public Viewer
   - else require admin login for admin console
   =========================== */
export default function App() {
  // If path is /viewer (public), show Viewer
  const isViewer = typeof window !== "undefined" && window.location && window.location.pathname && window.location.pathname.startsWith("/viewer");

  if (isViewer) {
    return <Viewer />;
  }

  // Admin console:
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem("lt_admin") === "1";
    } catch {
      return false;
    }
  });
  const [view, setView] = useState("landing"); // landing, start, results, settings, fixtures
  const [fixtureList, setFixtureList] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (alive) setFixtureList(fx || []);
      } catch (e) {
        if (alive) setFixtureList([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!isLoggedIn) return <AdminLogin onOk={() => setIsLoggedIn(true)} />;

  return (
    <div className="app-bg min-h-screen">
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
              <ManagePlayers onBack={() => setView("landing")} />
            </motion.div>
          )}

          {view === "fixtures" && (
            <motion.div key="fixtures" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <FixturesAdmin onBack={() => setView("landing")} />
            </motion.div>
          )}

          {view === "start" && (
            <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <StartFromFixtures onBack={() => setView("landing")} onStartScoring={() => setView("scoring")} />
            </motion.div>
          )}

          {view === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ResultsAdmin onBack={() => setView("landing")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Lawn Tennis Scoring</footer>
    </div>
  );
}

/* ===========================
   Minimal FixturesAdmin, Start, ResultsAdmin, Scoring placeholders
   (I retain the fixture-based start/results logic you already had previously.)
   These are simplified to fit into one file — adapt if your full scoring logic differs.
   =========================== */

// FixturesAdmin: small admin UI to add/remove fixtures (category picker and qualifier/semi/final option)
function FixturesAdmin({ onBack }) {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [mode, setMode] = useState("singles");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [category, setCategory] = useState("");
  const [matchType, setMatchType] = useState("Qualifier");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet();
        if (alive) {
          const singles = Array.isArray(p.singles) ? { "General Singles": p.singles } : { ...(p.singles || {}) };
          const doubles = Array.isArray(p.doubles) ? { "General Doubles": p.doubles } : { ...(p.doubles || {}) };
          setPlayers({ singles, doubles });
        }
      } catch (_) {
        if (alive) setPlayers({ singles: {}, doubles: {} });
      }
      try {
        const fx = await apiFixturesList();
        if (alive) setList(fx || []);
      } catch (_) {
        if (alive) setList([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const options = mode === "singles" ? Object.keys(players.singles || {}) : Object.keys(players.doubles || {});

  const canAdd = a && b && a !== b && date && time && category;
  const add = async (e) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = {
      id: crypto.randomUUID(),
      mode,
      sides: [a, b],
      start,
      status: "upcoming",
      category,
      matchType,
    };
    try {
      await apiFixturesAdd(payload);
      // combine matches per category and sort
      setList((prev) => {
        const combined = [...prev, payload];
        combined.sort((x, y) => {
          if ((x.category || "") < (y.category || "")) return -1;
          if ((x.category || "") > (y.category || "")) return 1;
          return (x.start || 0) - (y.start || 0);
        });
        return combined;
      });
      setA(""); setB(""); setDate(""); setTime("");
    } catch (e) {
      alert("Failed to add fixture");
    }
  };

  const remove = async (id) => {
    try {
      await fetch("/api/fixtures" + buster(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", id }),
      });
      setList((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      alert("Remove failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Fixtures</h2>
      </div>

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
            <div className="text-sm mb-1">Category</div>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="e.g. Men's (A) Singles" />
          </div>

          <div>
            <div className="text-sm mb-1">Match Type</div>
            <select className="w-full rounded-xl border px-3 py-2" value={matchType} onChange={(e) => setMatchType(e.target.value)}>
              <option>Qualifier</option>
              <option>Semifinal</option>
              <option>Final</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-sm mb-1">Date</div>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <div className="text-sm mb-1">Time</div>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm mb-1">Side A</div>
                <select className="w-full rounded-xl border px-3 py-2" value={a} onChange={(e) => setA(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm mb-1">Side B</div>
                <select className="w-full rounded-xl border px-3 py-2" value={b} onChange={(e) => setB(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="md:col-span-4">
            <Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4" /> Add Fixture</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {list.map((f) => (
          <Card key={f.id} className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.category} • {f.matchType}</span></div>
              <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
            </div>
            <Button variant="ghost" onClick={() => remove(f.id)} title="Remove"><X className="w-4 h-4" /></Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// StartFromFixtures (admin) - presents fixtures for start
function StartFromFixtures({ onBack, onStartScoring }) {
  const [mode, setMode] = useState("singles");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (alive) setFixtures(fx || []);
      } catch (_) {
        if (alive) setFixtures([]);
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
    const now = Date.now();
    const patch = { status: "active" };
    if (fx.start > now) patch.start = now;
    try {
      // demote other active
      for (const other of fixtures) {
        if (other.id !== fx.id && other.status === "active") {
          await apiFixturesUpdate(other.id, { status: "upcoming" });
        }
      }
      await apiFixturesUpdate(fx.id, patch);
      onStartScoring({ mode: fx.mode, sides: fx.sides, rule: "regular", bestOf: 3, gamesTarget: 6, startingServer: 0, fixtureId: fx.id });
    } catch (e) {
      alert("Start failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button><h2 className="text-xl font-bold">Start Match</h2></div>
      <Card className="p-5">
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
          <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
        </div>

        {loading ? <div className="text-zinc-500">Loading fixtures…</div> : (list.length === 0 ? <div className="text-zinc-500">No fixtures for {mode}.</div> : <div className="space-y-3">{list.map((f) => (
          <Card key={f.id} className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]}</div>
              <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
            </div>
            <Button onClick={() => startFixture(f)}><Play className="w-4 h-4" /> Start Now</Button>
          </Card>
        ))}</div>)}
      </Card>
    </div>
  );
}

// ResultsAdmin: uses fixtures endpoint to show status
function ResultsAdmin({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (alive) setFixtures(fx || []);
      } catch (_) {
        if (alive) setFixtures([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completed = fixtures.filter((f) => f.status === "completed").sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button><h2 className="text-xl font-bold">Results</h2></div>
      {loading ? <Card className="p-6 text-center text-zinc-500">Loading…</Card> : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Active</div>
            {active.length ? active.map(f => <div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>) : <div className="text-zinc-500">No active match.</div>}
            <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
            {upcoming.length ? upcoming.map(f => <div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.category}</span></div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>) : <div className="text-zinc-500">No upcoming fixtures.</div>}
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Completed</div>
            {completed.length ? completed.map(f => <div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="text-sm text-zinc-500">{f.finishedAt ? new Date(f.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{f.winner || ""}</span> <span className="ml-3 font-mono">{f.scoreline || ""}</span></div></div>) : <div className="text-zinc-500">No completed fixtures.</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

