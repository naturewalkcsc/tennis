// src/App.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Play,
  ChevronLeft,
  Plus,
  Trash2,
  CalendarPlus,
  RefreshCw,
  X,
  BookOpen,
  Users,
  ListChecks,
} from "lucide-react";

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* ------------------------------
   API helpers
   ------------------------------ */
const buster = () => "?t=" + Date.now();

async function apiFetchJson(url, opts = {}) {
  try {
    const res = await fetch(url + buster(), opts);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
    }
    return await res.json();
  } catch (e) {
    throw e;
  }
}

const apiPlayersGet = async () => {
  return await apiFetchJson("/api/players");
};
const apiPlayersSet = async (payload) => {
  return await apiFetchJson("/api/players", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
};
const apiFixturesList = async () => {
  return await apiFetchJson("/api/fixtures");
};
const apiFixturesAdd = async (payload) =>
  await apiFetchJson("/api/fixtures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", payload }),
  });
const apiFixturesUpdate = async (id, patch) =>
  await apiFetchJson("/api/fixtures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, patch }),
  });
const apiFixturesRemove = async (id) =>
  await apiFetchJson("/api/fixtures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "remove", id }),
  });

const apiMatchesList = async () => {
  return await apiFetchJson("/api/matches");
};
const apiMatchesAdd = async (payload) =>
  await apiFetchJson("/api/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "add", payload }),
  });

/* ------------------------------
   Small UI primitives
   ------------------------------ */
const Card = ({ className = "", children }) => (
  <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>
    {children}
  </div>
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

/* ------------------------------
   Viewer (public) — appears when path starts with /viewer
   ------------------------------ */
function ViewerShell() {
  const [panel, setPanel] = useState("home"); // home | rules | teams | fixtures
  return (
    <div className="app-bg min-h-screen py-8">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold">Lawn Tennis — Public Viewer</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <motion.button onClick={() => setPanel("rules")} whileHover={{ y: -2 }} className="w-full rounded-2xl overflow-hidden border shadow bg-white text-left">
            <div className="h-40 relative">
              <img src={imgStart} className="absolute inset-0 w-full h-full object-cover" alt="rules" />
            </div>
            <div className="p-4">
              <div className="font-semibold">Rules</div>
              <div className="text-sm text-zinc-600">View scoring rules & formats</div>
            </div>
          </motion.button>

          <motion.button onClick={() => setPanel("teams")} whileHover={{ y: -2 }} className="w-full rounded-2xl overflow-hidden border shadow bg-white text-left">
            <div className="h-40 relative">
              <img src={imgSettings} className="absolute inset-0 w-full h-full object-cover" alt="teams" />
            </div>
            <div className="p-4">
              <div className="font-semibold">Teams</div>
              <div className="text-sm text-zinc-600">View players and pairs</div>
            </div>
          </motion.button>

          <motion.button onClick={() => setPanel("fixtures")} whileHover={{ y: -2 }} className="w-full rounded-2xl overflow-hidden border shadow bg-white text-left">
            <div className="h-40 relative">
              <img src={imgScore} className="absolute inset-0 w-full h-full object-cover" alt="fixtures" />
            </div>
            <div className="p-4">
              <div className="font-semibold">Fixture / Scores</div>
              <div className="text-sm text-zinc-600">Live, upcoming and recent results</div>
            </div>
          </motion.button>
        </div>

        <div>
          {panel === "home" && (
            <Card className="p-6">
              <div className="text-lg font-semibold">Welcome</div>
              <div className="text-sm text-zinc-600 mt-2">Use the buttons above to navigate rules, teams and fixtures.</div>
            </Card>
          )}

          {panel === "rules" && <ViewerRules />}
          {panel === "teams" && <ViewerTeams />}
          {panel === "fixtures" && <ViewerFixtures />}
        </div>
      </div>
      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Lawn Tennis — Viewer</footer>
    </div>
  );
}

/* ------------------------------
   Viewer panels
   ------------------------------ */
function ViewerRules() {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-3"><BookOpen className="inline w-5 h-5 mr-2" /> Rules</h3>
      <div className="space-y-3 text-sm text-zinc-700">
        <div>
          <strong>1.</strong> <strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.
        </div>
        <div>
          <strong>2.</strong> <strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played. The tiebreak is won by the first player to reach 5 points. If it reaches 4-4, next point wins.
        </div>
        <div>
          <strong>3.</strong> <strong>No-adv (no AD) scoring</strong> — When game hits deuce (40-40) the next point decides the game. Receiver chooses which side the server will serve from. In doubles, receiving team chooses receiving side.
        </div>
        <div>
          <strong>4.</strong> <strong>Match formats</strong> — Matches can be set by number of sets or other criteria; admin config available in scoring screen.
        </div>
      </div>
    </Card>
  );
}

function ViewerTeams() {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const categoriesOrder = {
    singles: ["Women's Singles", "Kid's Singles", "Kid's Singles", "Men's (A) Singles", "Men's (B) Singles"],
    doubles: ["Women's Doubles", "Kid's Doubles", "Kid's Doubles", "Men's (A) Doubles", "Men's (B) Doubles", "Mixed Doubles"],
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const obj = await apiPlayersGet();
        // Support both legacy arrays and new categorized object:
        const singles = (obj && obj.singles && !Array.isArray(obj.singles)) ? obj.singles : {};
        const doubles = (obj && obj.doubles && !Array.isArray(obj.doubles)) ? obj.doubles : {};
        if (alive) setPlayers({ singles, doubles });
      } catch (e) {
        // fallback to empty
        if (alive) setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-3"><Users className="inline w-5 h-5 mr-2" /> Teams & Players</h3>
      {loading ? (
        <Card className="p-5 text-zinc-500">Loading teams…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            {categoriesOrder.singles.map((cat, idx) => {
              const list = players.singles && players.singles[cat] ? players.singles[cat] : [];
              return (
                <div key={cat + idx} className="mb-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{cat}</div>
                    <div className="text-sm text-zinc-500">{list.length} player{list.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {list.length === 0 ? (
                      <div className="text-sm text-zinc-400">No players</div>
                    ) : (
                      list.map((p, i) => (
                        <div key={p + i} className="rounded-lg px-3 py-2 border bg-gradient-to-r from-emerald-50 to-white">
                          <div className="text-sm font-medium">{p}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </Card>

          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            {categoriesOrder.doubles.map((cat, idx) => {
              const list = players.doubles && players.doubles[cat] ? players.doubles[cat] : [];
              return (
                <div key={cat + idx} className="mb-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{cat}</div>
                    <div className="text-sm text-zinc-500">{list.length} pair{list.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {list.length === 0 ? (
                      <div className="text-sm text-zinc-400">No pairs</div>
                    ) : (
                      list.map((p, i) => (
                        <div key={p + i} className="rounded-lg px-3 py-2 border bg-gradient-to-r from-pink-50 to-white">
                          <div className="text-sm font-medium">{p}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}

function ViewerFixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const fx = await apiFixturesList();
      setFixtures(fx || []);
    } catch (e) {
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completed = fixtures.filter((f) => f.status === "completed");

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-3"><ListChecks className="inline w-5 h-5 mr-2" /> Fixture & Scores</h3>
      {loading ? (
        <Card className="p-5 text-zinc-500">Loading…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="font-semibold mb-3">Active</div>
            {active.length === 0 ? (
              <div className="text-sm text-zinc-500">No active matches.</div>
            ) : (
              active.map((f) => (
                <div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="ml-auto text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                </div>
              ))
            )}

            <div className="font-semibold mt-6 mb-3">Upcoming</div>
            {upcoming.length === 0 ? (
              <div className="text-sm text-zinc-500">No upcoming fixtures.</div>
            ) : (
              upcoming.map((f) => (
                <div key={f.id} className="py-2 border-b last:border-0">
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div>
                  <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                </div>
              ))
            )}
          </Card>

          <Card className="p-5">
            <div className="font-semibold mb-3">Completed</div>
            {completed.length === 0 ? (
              <div className="text-sm text-zinc-500">No completed fixtures.</div>
            ) : (
              completed.map((f) => (
                <div key={f.id} className="py-2 border-b last:border-0">
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="text-sm text-zinc-500">{f.finishedAt ? new Date(f.finishedAt).toLocaleString() : ""}</div>
                  <div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{f.winner || "-"}</span> <span className="ml-3 font-mono">{f.scoreline || ""}</span></div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------
   Admin Console components
   ------------------------------ */

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
    } else {
      setErr("Invalid username or password");
    }
  };

  return (
    <div className="app-bg min-h-screen py-12">
      <div className="max-w-sm mx-auto p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <div className="text-sm text-zinc-600">Please sign in (default admin / rnwtennis123$)</div>
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

/* ---- Settings / Manage Players (categorized) ----
   Format used for storage:
   {
     singles: { "Women's Singles": ["A","B"], "Kid's Singles": [...], ... },
     doubles: { "Women's Doubles": ["A/B", ...], ... }
   }
   We avoid forcing presence of categories; missing categories are treated as empty arrays.
*/
function Settings({ onBack }) {
  const categoriesSingles = ["Women's Singles", "Kid's Singles", "Kid's Singles", "Men's (A) Singles", "Men's (B) Singles"];
  const categoriesDoubles = ["Women's Doubles", "Kid's Doubles", "Kid's Doubles", "Men's (A) Doubles", "Men's (B) Doubles", "Mixed Doubles"];
  const [data, setData] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const obj = await apiPlayersGet();
      // Accept both legacy (array) and new (map)
      const singles = obj && obj.singles && !Array.isArray(obj.singles) ? obj.singles : {};
      const doubles = obj && obj.doubles && !Array.isArray(obj.doubles) ? obj.doubles : {};
      setData({ singles: { ...singles }, doubles: { ...doubles } });
    } catch (e) {
      // treat as blank but keep user editable
      setData({ singles: {}, doubles: {} });
      setError("Could not load players (KV may be off). You can edit and save locally to retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setCategoryList = (type, category, arr) => {
    setData((prev) => {
      const copy = { singles: { ...(prev.singles || {}) }, doubles: { ...(prev.doubles || {}) } };
      if (type === "singles") copy.singles[category] = arr;
      else copy.doubles[category] = arr;
      return copy;
    });
  };

  const addPlayer = (type, category) => {
    const arr = (data[type][category] || []).slice();
    arr.push(type === "singles" ? "New Player" : "New Pair");
    setCategoryList(type, category, arr);
  };

  const updatePlayer = (type, category, idx, value) => {
    const arr = (data[type][category] || []).slice();
    arr[idx] = value;
    setCategoryList(type, category, arr);
  };

  const removePlayer = (type, category, idx) => {
    const arr = (data[type][category] || []).slice();
    arr.splice(idx, 1);
    setCategoryList(type, category, arr);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      // Save as the new format (objects)
      await apiPlayersSet({ singles: data.singles, doubles: data.doubles });
      // No toast per request — keep it quiet
    } catch (e) {
      setError("Save failed. Make sure KV is configured. Draft kept locally.");
      // keep draft in localStorage
      try {
        localStorage.setItem("lt_players_draft", JSON.stringify(data));
      } catch {}
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Manage Players</h2>
        <div className="ml-auto">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}

      {loading ? (
        <Card className="p-5 text-zinc-500 text-center">Loading…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="font-semibold mb-3">Singles</div>
            <div className="space-y-4">
              {categoriesSingles.map((cat, i) => {
                const list = data.singles[cat] || [];
                return (
                  <div key={cat + i}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{cat}</div>
                      <Button variant="secondary" onClick={() => addPlayer("singles", cat)}><Plus className="w-4 h-4" /> Add</Button>
                    </div>
                    <div className="space-y-2">
                      {list.length === 0 ? (
                        <div className="text-sm text-zinc-400">No players in this category.</div>
                      ) : (
                        list.map((name, idx) => (
                          <div key={name + idx} className="flex items-center gap-2">
                            <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updatePlayer("singles", cat, idx, e.target.value)} />
                            <button onClick={() => removePlayer("singles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="font-semibold mb-3">Doubles</div>
            <div className="space-y-4">
              {categoriesDoubles.map((cat, i) => {
                const list = data.doubles[cat] || [];
                return (
                  <div key={cat + i}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{cat}</div>
                      <Button variant="secondary" onClick={() => addPlayer("doubles", cat)}><Plus className="w-4 h-4" /> Add</Button>
                    </div>
                    <div className="space-y-2">
                      {list.length === 0 ? (
                        <div className="text-sm text-zinc-400">No pairs in this category.</div>
                      ) : (
                        list.map((name, idx) => (
                          <div key={name + idx} className="flex items-center gap-2">
                            <input className="flex-1 rounded-xl border px-3 py-2" value={name} onChange={(e) => updatePlayer("doubles", cat, idx, e.target.value)} />
                            <button onClick={() => removePlayer("doubles", cat, idx)} className="px-3 py-2 rounded-xl hover:bg-zinc-100"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------
   StartFromFixtures (admin)
   ------------------------------ */
function StartFromFixtures({ onBack, onStartScoring }) {
  const [mode, setMode] = useState("singles");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const fx = await apiFixturesList();
      setFixtures(fx || []);
    } catch {
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const list = fixtures.filter((f) => (f.mode || "singles") === mode && f.status !== "completed");

  const startFixture = async (fx) => {
    try {
      const now = Date.now();
      const patch = { status: "active" };
      if ((fx.start || 0) > now) patch.start = now;
      // set others active -> upcoming
      for (const other of fixtures) {
        if (other.id !== fx.id && other.status === "active") {
          await apiFixturesUpdate(other.id, { status: "upcoming" });
        }
      }
      await apiFixturesUpdate(fx.id, patch);
      onStartScoring({ mode: fx.mode, sides: fx.sides, rule: "regular", bestOf: 3, gamesTarget: 4, startingServer: 0, fixtureId: fx.id });
    } catch (e) {
      alert("Start failed: " + (e.message || e));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Start Match (from Fixtures)</h2>
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
            {list.map((f) => (
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

/* ------------------------------
   Simple Scoring implementation (keeps old behavior mostly)
   ------------------------------ */
const nextPoint = (p) => ({ 0: 15, 15: 30, 30: 40 }[p] ?? (p === 40 ? "Ad" : p === "Ad" ? "Game" : p));
function computeGameWin(a, b) {
  if (a === "Game") return "A";
  if (b === "Game") return "B";
  if (a === 40 && b === "Ad") return null;
  if (b === 40 && a === "Ad") return null;
  return null;
}
function advancePoint(a, b, who) {
  let pA = a, pB = b;
  if (who === 0) {
    if (pA === 40 && pB === 40) pA = "Ad";
    else if (pA === "Ad") pA = "Game";
    else if (pB === "Ad") pB = 40;
    else pA = nextPoint(pA);
  } else {
    if (pA === 40 && pB === 40) pB = "Ad";
    else if (pB === "Ad") pB = "Game";
    else if (pA === "Ad") pA = 40;
    else pB = nextPoint(pB);
  }
  return [pA, pB];
}
function makeEmptySet() {
  return { gamesA: 0, gamesB: 0, tie: false, tieA: 0, tieB: 0, finished: false, tieStart: null };
}
function setOver(s) {
  if (s.tie) {
    if ((s.tieA >= 5 || s.tieB >= 5) && Math.abs(s.tieA - s.tieB) >= 1) return true; // tiebreak to 5 (next point if 4-4)
    if ((s.tieA >= 5 || s.tieB >= 5) && (Math.abs(s.tieA - s.tieB) >= 1)) return true;
    return false;
  } else {
    const a = s.gamesA, b = s.gamesB;
    if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 1) return true;
    return false;
  }
}
function winnerSets(sets) {
  let A = 0, B = 0;
  for (const s of sets) {
    if (!s.finished) continue;
    if (s.tie) {
      if (s.tieA > s.tieB) A++; else if (s.tieB > s.tieA) B++;
    } else {
      if (s.gamesA > s.gamesB) A++; else if (s.gamesB > s.gamesA) B++;
    }
  }
  return { A, B };
}

function Scoring({ config, onAbort, onComplete }) {
  const { sides, rule, bestOf, gamesTarget, startingServer, fixtureId } = config;
  // Use configured target: user requested "First to 4 games", tie at 3-3, etc
  const effectiveBestOf = bestOf || 3;
  const [points, setPoints] = useState([0, 0]);
  const [sets, setSets] = useState([makeEmptySet()]);
  const [server, setServer] = useState(startingServer || 0);

  const { A: setsA, B: setsB } = winnerSets(sets);
  const targetSets = Math.floor(effectiveBestOf / 2) + 1;
  const currentSet = sets[sets.length - 1];
  const matchDone = (setsA === targetSets || setsB === targetSets);

  const pointTo = (who) => {
    if (matchDone) return;
    // if tie in set (tie-break playing)
    if (currentSet.tie) {
      const ns = [...sets];
      const so = { ...currentSet };
      if (who === 0) so.tieA++;
      else so.tieB++;
      if (setOver(so)) so.finished = true;
      ns[ns.length - 1] = so;
      setSets(ns);
      return;
    }

    let [a, b] = advancePoint(points[0], points[1], who);
    setPoints([a, b]);
    const gw = computeGameWin(a, b);
    if (!gw) return;
    const ns = [...sets];
    const so = { ...currentSet };
    if (gw === "A") so.gamesA++;
    else so.gamesB++;
    setPoints([0, 0]);

    // rules: first to 4 games wins a set, but if reaches 3-3 -> tiebreak (tie)
    if (so.gamesA === 3 && so.gamesB === 3) {
      so.tie = true;
      so.tieStart = server;
    } else {
      // check if set over
      if (setOver(so)) so.finished = true;
    }

    ns[ns.length - 1] = so;
    setSets(ns);
    setServer((s) => 1 - s);

    if (so.finished) {
      const { A, B } = winnerSets(ns);
      if (A < targetSets && B < targetSets) setSets((prev) => [...prev, makeEmptySet()]);
    }
  };

  const recordResult = async () => {
    const sl = sets
      .filter((s) => s.finished)
      .map((s) => (s.tie ? `${s.gamesA}-${s.gamesB}(${Math.max(s.tieA, s.tieB)})` : `${s.gamesA}-${s.gamesB}`))
      .join(" ");
    const winner = setsA > setsB ? sides[0] : setsB > setsA ? sides[1] : (currentSet.gamesA > currentSet.gamesB ? sides[0] : sides[1]);
    const payload = { id: crypto.randomUUID(), sides, rule, bestOf: effectiveBestOf, gamesTarget, finishedAt: Date.now(), scoreline: sl, winner };
    try {
      await apiMatchesAdd(payload);
      if (fixtureId) {
        await apiFixturesUpdate(fixtureId, { status: "completed", finishedAt: payload.finishedAt, winner: payload.winner, scoreline: payload.scoreline });
      }
    } catch (e) {
      console.warn("Could not record result to server", e);
    } finally {
      onComplete();
    }
  };

  useEffect(() => {
    const { A, B } = winnerSets(sets);
    if ((A === targetSets || B === targetSets) || (sets[sets.length - 1].finished && (A === targetSets || B === targetSets))) {
      recordResult();
    }
  }, [sets]);

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
          <div className="font-semibold mb-2">Sets</div>
          <div className="text-sm font-mono">
            {sets.map((s, i) => (<span key={i} className="inline-block mr-3">{s.tie ? `${s.gamesA}-${s.gamesB} TB ${s.tieA}-${s.tieB}` : `${s.gamesA}-${s.gamesB}`}</span>))}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------
   Results (admin) — shows fixtures & matches
   ------------------------------ */
function ResultsAdmin({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const fx = await apiFixturesList();
      const ms = await apiMatchesList();
      setFixtures(fx || []);
      setMatches(ms || []);
    } catch (e) {
      setFixtures([]);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const iv = setInterval(loadAll, 8000);
    return () => clearInterval(iv);
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter((f) => f.status === "completed");
  const completed = [...completedFixtures, ...(matches || [])].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

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
            {completed.length ? completed.map((m) => (
              <div key={m.id + String(m.finishedAt)} className="py-2 border-b last:border-0">
                <div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div>
                <div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div>
                <div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner || ""}</span> <span className="ml-3 font-mono">{m.scoreline || m.score || ""}</span></div>
              </div>
            )) : <div className="text-zinc-500">No results yet.</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------
   App shell (decides viewer vs admin)
   ------------------------------ */
export default function App() {
  // If path starts with /viewer -> show ViewerShell to support public view
  if (typeof window !== "undefined" && window.location && window.location.pathname && window.location.pathname.startsWith("/viewer")) {
    return <ViewerShell />;
  }

  const [view, setView] = useState("landing"); // landing | settings | fixtures | start | scoring | results
  const [cfg, setCfg] = useState(null);

  const logged = typeof window !== "undefined" && localStorage.getItem("lt_admin") === "1";
  if (!logged) {
    return <AdminLogin onOk={() => window.location.reload()} />;
  }

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
              <Settings onBack={() => setView("landing")} />
            </motion.div>
          )}

          {view === "fixtures" && (
            <motion.div key="fixtures" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <FixturesPage onBack={() => setView("landing")} />
            </motion.div>
          )}

          {view === "start" && (
            <motion.div key="start" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <StartFromFixtures onBack={() => setView("landing")} onStartScoring={(c) => { setCfg(c); setView("scoring"); }} />
            </motion.div>
          )}

          {view === "scoring" && cfg && (
            <motion.div key="scoring" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <Scoring config={cfg} onAbort={() => setView("landing")} onComplete={() => setView("results")} />
            </motion.div>
          )}

          {view === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ResultsAdmin onBack={() => setView("landing")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Lawn Tennis Scoring (Admin)</footer>
    </div>
  );
}

/* ------------------------------
   Landing (admin)
   ------------------------------ */
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

/* ------------------------------
   Fixtures admin page (create, remove, sort by category + date)
   - Adds category selector and match type (Qualifier / Semifinal / Final)
   - On add: create fixture with id, mode, sides, start, category, matchType, status
   - When listing: combined and sorted by category -> date (user requested)
   ------------------------------ */
function FixturesPage({ onBack }) {
  const categoriesAll = [
    // As requested earlier, this order for selection: singles/doubles sets come from here
    "Women's Singles",
    "Kid's Singles",
    "Men's (A) Singles",
    "Men's (B) Singles",
    "Women's Doubles",
    "Kid's Doubles",
    "Men's (A) Doubles",
    "Men's (B) Doubles",
    "Mixed Doubles",
  ];
  const matchTypes = ["Qualifier", "Semifinal", "Final"];

  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [mode, setMode] = useState("singles");
  const [category, setCategory] = useState(categoriesAll[0]);
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [matchType, setMatchType] = useState(matchTypes[0]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const p = await apiPlayersGet();
      const singles = p && p.singles && !Array.isArray(p.singles) ? p.singles : {};
      const doubles = p && p.doubles && !Array.isArray(p.doubles) ? p.doubles : {};
      setPlayers({ singles, doubles });

      const fx = await apiFixturesList();
      // combine by category sort
      setFixtures((fx || []).slice().sort((a, b) => {
        if ((a.category || "") < (b.category || "")) return -1;
        if ((a.category || "") > (b.category || "")) return 1;
        return (a.start || 0) - (b.start || 0);
      }));
    } catch (e) {
      setPlayers({ singles: {}, doubles: {} });
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // options based on current mode
  const options = mode === "singles" ? Object.keys(players.singles || {}) : Object.keys(players.doubles || {});

  const canAdd = sideA && sideB && sideA !== sideB && date && time && category;

  const add = async (e) => {
    e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = {
      id: crypto.randomUUID(),
      mode,
      sides: [sideA, sideB],
      start,
      status: "upcoming",
      category,
      matchType,
    };
    try {
      await apiFixturesAdd(payload);
      // reload
      await load();
      setSideA("");
      setSideB("");
      setDate("");
      setTime("");
    } catch (err) {
      alert("Failed to add fixture: " + (err.message || err));
    }
  };

  const remove = async (id) => {
    if (!confirm("Remove fixture?")) return;
    try {
      await apiFixturesRemove(id);
      await load();
    } catch (err) {
      alert("Failed to remove fixture");
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
            <div className="text-sm text-zinc-600 mb-1">Type</div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === "singles"} onChange={() => setMode("singles")} /> Singles</label>
              <label className="flex items-center gap-2"><input type="radio" name="mode" checked={mode === "doubles"} onChange={() => setMode("doubles")} /> Doubles</label>
            </div>
          </div>

          <div>
            <div className="text-sm text-zinc-600 mb-1">Category</div>
            <select className="w-full rounded-xl border px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoriesAll.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <div className="text-sm text-zinc-600 mb-1">Match Type</div>
            <select className="w-full rounded-xl border px-3 py-2" value={matchType} onChange={(e) => setMatchType(e.target.value)}>
              {matchTypes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-zinc-600 mb-1">Side A</div>
                <select className="w-full rounded-xl border px-3 py-2" value={sideA} onChange={(e) => setSideA(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <div className="text-sm text-zinc-600 mb-1">Side B</div>
                <select className="w-full rounded-xl border px-3 py-2" value={sideB} onChange={(e) => setSideB(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="text-sm text-zinc-600 mb-1">Date</div>
            <input type="date" className="w-full rounded-xl border px-3 py-2" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="md:col-span-1">
            <div className="text-sm text-zinc-600 mb-1">Time</div>
            <input type="time" className="w-full rounded-xl border px-3 py-2" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>

          <div className="md:col-span-4">
            <Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4" /> Add Fixture</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {fixtures.length === 0 ? (
          <Card className="p-5 text-zinc-500">No fixtures yet.</Card>
        ) : (
          fixtures.map((f) => (
            <Card key={f.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.category} • {f.matchType}</span></div>
                <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()} {f.status === "active" && <span className="ml-2 inline-flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live</span>}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => {
                  // set as active and start
                  apiFixturesUpdate(f.id, { status: "active", start: Date.now() }).then(load).catch(() => alert("Failed"));
                }}><Play className="w-4 h-4" /> Start</Button>
                <Button variant="ghost" onClick={() => remove(f.id)}><X className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

