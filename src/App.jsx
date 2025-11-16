// src/App.jsx
import React, { useState, useEffect } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import Viewer from "./Viewer.jsx"; // keep viewer file as you have it

// Small UI helpers (you can replace with your components)
const Button = ({ children, onClick, className, ...rest }) => (
  <button onClick={onClick} className={className || "btn"} {...rest}>
    {children}
  </button>
);
const Card = ({ children, style }) => (
  <div style={{ background: "white", borderRadius: 12, padding: 12, border: "1px solid #e6edf8", ...style }}>
    {children}
  </div>
);

// ---------------------------
// API helper: try server, fallback to localStorage
// ---------------------------
const API_BASE = ""; // empty => relative API routes like /api/fixtures

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

const STORAGE_KEY_FIXTURES = "tennis:fixtures_local_preview";

async function fixturesListServer() {
  return fetchJson(`${API_BASE}/api/fixtures`);
}
async function fixturesAddServer(payload) {
  // your server might want POST /api/fixtures
  return fetchJson(`${API_BASE}/api/fixtures`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
async function fixturesUpdateServer(id, patch) {
  // server may accept PUT or PATCH; try PUT then PATCH fallback
  try {
    return fetchJson(`${API_BASE}/api/fixtures/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch (e) {
    return fetchJson(`${API_BASE}/api/fixtures/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }
}
async function fixturesRemoveServer(id) {
  return fetchJson(`${API_BASE}/api/fixtures/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// LocalStorage fallback helpers
async function fixturesListLocal() {
  const raw = localStorage.getItem(STORAGE_KEY_FIXTURES);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
async function fixturesSaveLocal(list) {
  localStorage.setItem(STORAGE_KEY_FIXTURES, JSON.stringify(list));
  return { ok: true };
}
async function fixturesAddLocal(payload) {
  const list = await fixturesListLocal();
  list.push(payload);
  await fixturesSaveLocal(list);
  return payload;
}
async function fixturesUpdateLocal(id, patch) {
  const list = await fixturesListLocal();
  const updated = list.map(f => f.id === id ? { ...f, ...patch } : f);
  await fixturesSaveLocal(updated);
  return updated.find(f => f.id === id);
}
async function fixturesRemoveLocal(id) {
  const list = await fixturesListLocal();
  const filtered = list.filter(f => f.id !== id);
  await fixturesSaveLocal(filtered);
  return { ok: true };
}

// choose server if available, else local
async function hasServerFixtures() {
  try {
    const res = await fetch(`${API_BASE}/api/fixtures`, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// Wrapper functions used by the UI
async function apiFixturesList() {
  if (await hasServerFixtures()) {
    return fixturesListServer();
  } else {
    return fixturesListLocal();
  }
}
async function apiFixturesAdd(payload) {
  if (await hasServerFixtures()) return fixturesAddServer(payload);
  return fixturesAddLocal(payload);
}
async function apiFixturesUpdate(id, patch) {
  if (await hasServerFixtures()) return fixturesUpdateServer(id, patch);
  return fixturesUpdateLocal(id, patch);
}
async function apiFixturesRemove(id) {
  if (await hasServerFixtures()) return fixturesRemoveServer(id);
  return fixturesRemoveLocal(id);
}

// UUID helper
function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 9);
}

// ---------------------------
// Fixtures Admin component
// ---------------------------
function FixturesAdmin({ onBack }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Men's (A) Singles");
  const [mode, setMode] = useState("singles"); // singles / doubles
  const [type, setType] = useState("Qualifier"); // Qualifier/Semifinal/Final
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const CATEGORIES = [
    "Men's (A) Singles","Men's (B) Singles","Women's Singles","Kid's Singles",
    "Men's (A) Doubles","Men's (B) Doubles","Women's Doubles","Kid's Doubles","Mixed Doubles"
  ];

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const fx = await apiFixturesList();
        if (!alive) return;
        // sort ascending by start time
        setList(Array.isArray(fx) ? fx.sort((a,b) => (a.start||0) - (b.start||0)) : []);
      } catch (e) {
        console.error(e);
        setError("Could not load fixtures");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function addFixture(e) {
    e && e.preventDefault();
    setError("");
    if (!sideA || !sideB || !date || !time) {
      setError("Please fill sides, date and time");
      return;
    }
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = {
      id: uid(),
      mode, // singles/doubles
      category,
      type, // qualifier / semifinal / final
      sides: [sideA, sideB],
      start,
      status: "upcoming",
      createdAt: Date.now()
    };
    try {
      await apiFixturesAdd(payload);
      setList(prev => [...prev, payload].sort((a,b)=> (a.start||0)-(b.start||0)));
      setSideA(""); setSideB(""); setDate(""); setTime("");
    } catch (e) {
      console.error(e);
      setError("Add failed");
    }
  }

  async function removeFixture(id) {
    if (!confirm("Delete fixture?")) return;
    try {
      await apiFixturesRemove(id);
      setList(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error(e); setError("Delete failed");
    }
  }

  async function startFixture(f) {
    // mark any existing active fixture as completed
    try {
      const current = list.find(x => x.status === "active");
      if (current && current.id !== f.id) {
        await apiFixturesUpdate(current.id, { status: "completed", finishedAt: Date.now() });
      }

      // start chosen fixture: update status=active and start=now if in future
      const now = Date.now();
      const patch = { status: "active", startedAt: now, start: now };
      await apiFixturesUpdate(f.id, patch);

      // update local list state
      const updated = list.map(x => x.id === f.id ? { ...x, ...patch } : (x.id === (current?.id) ? { ...x, status: "completed", finishedAt: Date.now() } : x));
      setList(updated);
      alert(`Started match: ${f.sides?.[0]} vs ${f.sides?.[1]}`);
    } catch (e) {
      console.error(e); setError("Could not start match");
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Button onClick={onBack} className="btn">Back</Button>
        <h2 style={{ margin: 0 }}>Fixtures / Schedule</h2>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <form onSubmit={addFixture} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Mode</div>
            <select value={mode} onChange={e => setMode(e.target.value)} style={{ width: "100%", padding: 8 }}>
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Category</div>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", padding: 8 }}>
              {CATEGORIES.filter(c => mode === "singles" ? c.toLowerCase().includes("singles") : c.toLowerCase().includes("doubles")).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Match Type</div>
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: "100%", padding: 8 }}>
              <option>Qualifier</option>
              <option>Semifinal</option>
              <option>Final</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Player / Team A</div>
            <input placeholder="Player/Team A" value={sideA} onChange={e => setSideA(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Player / Team B</div>
            <input placeholder="Player/Team B" value={sideB} onChange={e => setSideB(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Date</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Time</div>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: "100%", padding: 8 }} />
            </div>
            <div style={{ alignSelf: "end" }}>
              <Button type="submit" className="btn">Add Fixture</Button>
            </div>
          </div>
        </form>
        {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}
      </Card>

      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <div style={{ fontWeight: 600 }}>Scheduled Fixtures ({list.length})</div>
        <div style={{ color: "#6b7280" }}>{loading ? "Loading..." : ""}</div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {list.map(f => (
          <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8", marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")} <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>{f.category} • {f.type}</span></div>
            <div style={{ color: "#6b7280" }}>{new Date(f.start || f.startedAt || f.createdAt || Date.now()).toLocaleString()}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <Button onClick={() => startFixture(f)} className="btn">Start Now</Button>
              <Button onClick={() => removeFixture(f.id)} className="btn">Remove</Button>
              <div style={{ marginLeft: "auto", color: f.status === "active" ? "#065f46" : "#6b7280", fontWeight: 600 }}>{f.status?.toUpperCase() || "UPCOMING"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------
// Start Match view: shows fixtures filtered by mode and lets admin pick one to start scoring
// (This replaces the old Start Match flow that used dropdown players.)
// ---------------------------
function StartFromFixtures({ onBack }) {
  const [mode, setMode] = useState("singles");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const fx = await apiFixturesList();
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx.sort((a,b)=> (a.start||0)-(b.start||0)) : []);
      } catch (e) {
        console.error(e); setError("Could not load fixtures");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // start logic is same as FixturesAdmin.startFixture, but here we also route to scoring screen if you have it
  async function onStart(f) {
    try {
      const now = Date.now();
      // mark previous active as completed
      const current = fixtures.find(x => x.status === "active");
      if (current && current.id !== f.id) {
        await apiFixturesUpdate(current.id, { status: "completed", finishedAt: Date.now() });
      }
      await apiFixturesUpdate(f.id, { status: "active", startedAt: now, start: now });
      alert("Match started: " + (f.sides?.join(" vs ") || ""));
      // TODO: navigate to scoring UI - if you have Scoring component, call it
    } catch (e) {
      console.error(e);
      alert("Could not start match");
    }
  }

  const filtered = fixtures.filter(f => (mode === "singles" ? f.mode === "singles" : f.mode === "doubles"));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Button onClick={onBack} className="btn">Back</Button>
        <h2 style={{ margin: 0 }}>Start Match</h2>
        <div style={{ marginLeft: "auto" }}>
          <select value={mode} onChange={e => setMode(e.target.value)} style={{ padding: 8 }}>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
          </select>
        </div>
      </div>

      {loading ? <div>Loading fixtures…</div> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.length === 0 && <div style={{ color: "#6b7280" }}>No fixtures for selected mode.</div>}
          {filtered.map(f => (
            <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
              <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")} <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>{f.category}</span></div>
              <div style={{ color: "#6b7280" }}>{new Date(f.start || f.createdAt).toLocaleString()}</div>
              <div style={{ marginTop: 8 }}>
                <Button onClick={() => onStart(f)} className="btn">Start Now</Button>
                <span style={{ marginLeft: 12, color: "#6b7280" }}>Status: {f.status || "upcoming"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------
// Results view (reads fixtures and shows Active / Upcoming / Completed)
// ---------------------------
function ResultsAdmin({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const active = fixtures.filter(f => f.status === "active");
  const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming").sort((a,b)=> (a.start||0)-(b.start||0));
  const completed = fixtures.filter(f => f.status === "completed").sort((a,b)=> (b.finishedAt||0)-(a.finishedAt||0));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Button onClick={onBack} className="btn">Back</Button>
        <h2 style={{ margin: 0 }}>Results</h2>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <h3>Active</h3>
          {active.length === 0 ? <div style={{ color: "#6b7280" }}>No active match</div> : active.map(f => (
            <Card key={f.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
              <div style={{ color: "#6b7280" }}>{f.scoreline || "—"}</div>
            </Card>
          ))}
        </div>

        <div>
          <h3>Upcoming</h3>
          {upcoming.length === 0 ? <div style={{ color: "#6b7280" }}>No upcoming</div> : upcoming.map(f => (
            <Card key={f.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
              <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
            </Card>
          ))}
        </div>

        <div>
          <h3>Completed</h3>
          {completed.length === 0 ? <div style={{ color: "#6b7280" }}>No completed</div> : completed.map(f => (
            <Card key={f.id} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
              <div style={{ color: "#6b7280" }}>Winner: {f.winner || "-"}</div>
              <div>{f.scoreline || "-"}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------
// Landing and router within App (simple view switching)
// ---------------------------
export default function App() {
  const [view, setView] = useState("landing"); // landing, fixturesAdmin, start, results, managePlayers, viewer
  const [isViewer, setIsViewer] = useState(false);

  // show viewer as separate page if user clicked the Viewer button
  if (view === "viewer") {
    return <Viewer />;
  }

  if (view === "fixturesAdmin") return <FixturesAdmin onBack={() => setView("landing")} />;
  if (view === "start") return <StartFromFixtures onBack={() => setView("landing")} />;
  if (view === "results") return <ResultsAdmin onBack={() => setView("landing")} />;
  if (view === "managePlayers") {
    // your ManagePlayers component likely already exists elsewhere in your codebase.
    // If you have it inside this file previously, import/call it here. For now call /viewer's ManagePlayers if you had it.
    // To keep this file self-contained, we'll open a simple placeholder that navigates back.
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Button onClick={() => setView("landing")} className="btn">Back</Button>
          <h2>Manage Players</h2>
        </div>
        <div style={{ marginTop: 12 }}>
          {/* If you already have ManagePlayers in another file, replace this with import and component */}
          <div style={{ color: "#6b7280" }}>Please open your ManagePlayers UI here (you likely have this component in another file).</div>
        </div>
      </div>
    );
  }

  // Landing view (admin)
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff,#e0f2fe)", padding: 28 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Lawn Tennis Scoring (Admin)</h1>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 300 }}>
            <div onClick={() => setView("start")} style={{ cursor: "pointer", borderRadius: 16, overflow: "hidden", border: "1px solid #e6edf8" }}>
              <img src={imgStart} alt="Start match" style={{ width: "100%", height: 140, objectFit: "cover" }} />
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Start Match</div>
                <div style={{ color: "#6b7280" }}>Select a fixture and start scoring</div>
              </div>
            </div>
          </div>

          <div style={{ width: 300 }}>
            <div onClick={() => setView("results")} style={{ cursor: "pointer", borderRadius: 16, overflow: "hidden", border: "1px solid #e6edf8" }}>
              <img src={imgScore} alt="Results" style={{ width: "100%", height: 140, objectFit: "cover" }} />
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Results</div>
                <div style={{ color: "#6b7280" }}>View completed, active and upcoming fixtures</div>
              </div>
            </div>
          </div>

          <div style={{ width: 300 }}>
            <div onClick={() => setView("managePlayers")} style={{ cursor: "pointer", borderRadius: 16, overflow: "hidden", border: "1px solid #e6edf8" }}>
              <img src={imgSettings} alt="Manage players" style={{ width: "100%", height: 140, objectFit: "cover" }} />
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Manage Players</div>
                <div style={{ color: "#6b7280" }}>Add and edit players / pairs</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <Button onClick={() => setView("fixturesAdmin")} className="btn">Open Fixtures Admin</Button>
          <Button onClick={() => setView("viewer")} className="btn" style={{ marginLeft: 12 }}>Open Public Viewer</Button>
        </div>
      </div>
    </div>
  );
}

