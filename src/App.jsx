import React, { useEffect, useState } from "react";

/* NOTE: put these three jpg files inside src/ so Vite will bundle them:
   - StartMatch.jpg
   - Score.jpg
   - Settings.jpg
*/
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  App.jsx: Landing (admin) + Fixtures admin + Viewer (public)
  - Admin landing keeps your tiles (Start Match, Results, Manage Players)
  - Fixtures button below tiles opens a dedicated Fixtures page (full page with Back)
  - Viewer section uses a menu; clicking a viewer button opens a full-page view with Back
*/

/* --- Utility: try server API first, fallback to localStorage --- */
const TRY_API = async (path, opts) => {
  try {
    const url = typeof path === "string" ? path : "";
    const resp = await fetch(url, opts);
    if (!resp.ok) throw new Error("api error");
    const json = await resp.json();
    return json;
  } catch (e) {
    // bubble up error to allow fallback
    throw e;
  }
};

const playersStorageKey = "tennis:players";
const fixturesStorageKey = "tennis:fixtures";
const matchesStorageKey = "tennis:matches";

/* API helpers used by components (they attempt fetch('/api/...') and fallback to localStorage) */
async function apiPlayersGet() {
  try {
    const json = await TRY_API("/api/players");
    // expect object { singles: {...}, doubles: {...} } or legacy arrays
    if (json && typeof json === "object") return json;
  } catch (e) {
    // fallback to localStorage
    try {
      const raw = localStorage.getItem(playersStorageKey);
      if (!raw) return { singles: {}, doubles: {} };
      return JSON.parse(raw);
    } catch {
      return { singles: {}, doubles: {} };
    }
  }
  return { singles: {}, doubles: {} };
}

async function apiPlayersSet(obj) {
  try {
    // prefer POST/PUT to your server endpoint if present
    const resp = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });
    if (!resp.ok) throw new Error("server save failed");
    return await resp.json();
  } catch (e) {
    // fallback to localStorage
    localStorage.setItem(playersStorageKey, JSON.stringify(obj));
    return { ok: true };
  }
}

async function apiFixturesList() {
  try {
    const json = await TRY_API("/api/fixtures");
    if (Array.isArray(json)) return json;
  } catch (e) {
    try {
      const raw = localStorage.getItem(fixturesStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function apiFixturesAdd(payload) {
  try {
    const resp = await fetch("/api/fixtures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error("server add failed");
    return await resp.json();
  } catch (e) {
    const fx = await apiFixturesList();
    fx.push(payload);
    localStorage.setItem(fixturesStorageKey, JSON.stringify(fx));
    return { ok: true };
  }
}

async function apiMatchesList() {
  try {
    const json = await TRY_API("/api/matches");
    if (Array.isArray(json)) return json;
  } catch (e) {
    try {
      const raw = localStorage.getItem(matchesStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/* --- Small UI primitives --- */
const Button = ({ children, onClick, style = {}, className = "", disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={className}
    style={{
      padding: "10px 16px",
      borderRadius: 12,
      border: "1px solid #e6e6e6",
      background: "#fff",
      cursor: "pointer",
      ...style,
    }}
  >
    {children}
  </button>
);

const CardTile = ({ title, subtitle, img, onClick }) => (
  <div style={{ width: 360 }}>
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        background: "#fff",
        boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ height: 150, position: "relative" }}>
        <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 6 }}>{subtitle}</div>
      </div>
    </button>
  </div>
);

/* --- Fixtures Admin full-page --- */
function FixturesAdmin({ onBack }) {
  const CATS_SINGLES = ["Women's Singles", "Kid's Singles", "Men's (A) Singles", "Men's (B) Singles"];
  const CATS_DOUBLES = ["Women's Doubles", "Kid's Doubles", "Men's (A) Doubles", "Men's (B) Doubles", "Mixed Doubles"];
  const [type, setType] = useState("singles"); // singles | doubles
  const [category, setCategory] = useState("");
  const [matchType, setMatchType] = useState("Qualifier"); // Qualifier/Semifinal/Final
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [list, setList] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const p = await apiPlayersGet();
        if (!mounted) return;
        setPlayers(p || { singles: {}, doubles: {} });
      } catch (e) {
        setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (mounted) setLoading(false);
      }
      // load fixtures list
      const fx = await apiFixturesList();
      if (mounted) setList(fx || []);
    })();
    return () => (mounted = false);
  }, []);

  const options = type === "singles" ? Object.keys(players.singles || {}) : Object.keys(players.doubles || {});

  // derive sides lists from selected category:
  const sideOptions = () => {
    const bucket = type === "singles" ? players.singles || {} : players.doubles || {};
    return (bucket[category] && Array.isArray(bucket[category]) ? bucket[category] : []);
  };

  const canAdd = category && sideA && sideB && sideA !== sideB && date && time;

  const addFixture = async () => {
    if (!canAdd) return alert("Please fill all fields (and ensure side A != side B)");
    const start = new Date(`${date}T${time}`).getTime();
    const payload = {
      id: crypto && crypto.randomUUID ? crypto.randomUUID() : "fx_" + Date.now(),
      mode: type,
      category,
      matchType,
      sides: [sideA, sideB],
      start,
      status: "upcoming",
    };
    setAdding(true);
    try {
      await apiFixturesAdd(payload);
      const updated = [...list, payload].sort((a, b) => (a.start || 0) - (b.start || 0));
      setList(updated);
      // reset fields
      setSideA("");
      setSideB("");
      setCategory("");
      setDate("");
      setTime("");
      alert("Fixture added");
    } catch (e) {
      console.error(e);
      alert("Add failed");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
        <Button onClick={onBack}>◀ Back</Button>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Fixtures</h2>
      </div>

      <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e6edf8", boxShadow: "none" }}>
        <h3 style={{ marginBottom: 12 }}>Schedule a Match</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 12, alignItems: "center" }}>
          <div style={{ gridColumn: "span 3" }}>
            <div style={{ color: "#374151", marginBottom: 6 }}>Type</div>
            <div>
              <label style={{ marginRight: 12 }}>
                <input type="radio" checked={type === "singles"} onChange={() => setType("singles")} /> Singles
              </label>
              <label>
                <input type="radio" checked={type === "doubles"} onChange={() => setType("doubles")} /> Doubles
              </label>
            </div>
          </div>

          <div style={{ gridColumn: "span 3" }}>
            <div style={{ color: "#374151", marginBottom: 6 }}>Category</div>
            <select style={{ width: "100%", padding: 10, borderRadius: 10 }} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Choose category...</option>
              {(type === "singles" ? CATS_SINGLES : CATS_DOUBLES).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ color: "#374151", marginBottom: 6 }}>Match Type</div>
            <select style={{ width: "100%", padding: 10, borderRadius: 10 }} value={matchType} onChange={(e) => setMatchType(e.target.value)}>
              <option>Qualifier</option>
              <option>Semifinal</option>
              <option>Final</option>
            </select>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ color: "#374151", marginBottom: 6 }}>Date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ color: "#374151", marginBottom: 6 }}>Time</div>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </div>

          <div style={{ gridColumn: "span 6", marginTop: 12 }}>
            <div style={{ color: "#374151", marginBottom: 6 }}>Side A</div>
            <select style={{ width: "100%", padding: 10, borderRadius: 10 }} value={sideA} onChange={(e) => setSideA(e.target.value)}>
              <option value="">Choose...</option>
              {sideOptions().map((s, i) => (
                <option key={i} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "span 6", marginTop: 12 }}>
            <div style={{ color: "#374151", marginBottom: 6 }}>Side B</div>
            <select style={{ width: "100%", padding: 10, borderRadius: 10 }} value={sideB} onChange={(e) => setSideB(e.target.value)}>
              <option value="">Choose...</option>
              {sideOptions().map((s, i) => (
                <option key={i} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: "span 12", marginTop: 18 }}>
            <Button onClick={addFixture} style={{ background: "#bde7c6", border: "1px solid #9ed5a8" }} disabled={!canAdd || adding}>
              📅 Add Fixture
            </Button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Scheduled Fixtures</h3>
        {list.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No fixtures yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {list.map((f) => (
              <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8", marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280" }}>{f.matchType ? `${f.matchType} • ${f.category || ""}` : f.category}</div>
                <div>Start: {new Date(f.start).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Viewer component (public) — clicking Rules/Teams/Fixtures opens a dedicated page with Back button --- */
function ViewerStandalone() {
  const [view, setView] = useState("menu"); // menu | rules | teams | fixtures
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingPlayers(true);
      try {
        const p = await apiPlayersGet();
        if (!alive) return;
        setPlayers(p || { singles: {}, doubles: {} });
      } catch {
        setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();
    (async () => {
      setLoadingFixtures(true);
      try {
        const fx = await apiFixturesList();
        if (!alive) return;
        setFixtures(fx || []);
      } catch {
        setFixtures([]);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    return () => (alive = false);
  }, []);

  // Helper: present the teams nicely with colors
  const orderedSingles = (players.singles && Object.keys(players.singles).length) ? players.singles : {};
  const orderedDoubles = (players.doubles && Object.keys(players.doubles).length) ? players.doubles : {};

  if (view === "menu") {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>Viewer</h2>
        <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
          <CardTile img={imgStart} title="Rules" subtitle="Match rules and formats" onClick={() => setView("rules")} />
          <CardTile img={imgScore} title="Teams" subtitle="View players by category" onClick={() => setView("teams")} />
          <CardTile img={imgSettings} title="Fixture/Scores" subtitle="Live, upcoming & recent results" onClick={() => setView("fixtures")} />
        </div>
      </div>
    );
  }

  if (view === "rules") {
    return (
      <div style={{ maxWidth: 920, margin: "0 auto", padding: 24 }}>
        <Button onClick={() => setView("menu")}>◀ Back</Button>
        <h2 style={{ marginTop: 8 }}>Rules</h2>
        <section style={{ marginTop: 12 }}>
          <h3>Qualifiers and Semifinal Matches Format</h3>
          <ol>
            <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
            <li><strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played. Tiebreak won by first to 5 points; if 4-4 then next point wins.</li>
            <li><strong>No-adv (no AD) scoring</strong> — At deuce (40-40) the next point decides the game. Receiver chooses which side server will serve from. In doubles, the receiving team chooses receiving side.</li>
          </ol>
          <h3>Final Matches format</h3>
          <ol>
            <li><strong>One full set</strong> — Standard set rule of 6 games and tie-break will be followed.</li>
            <li><strong>Limited Deuce Points</strong> — Max 3 deuce points allowed. At 4th deuce point the next point decides the game.</li>
          </ol>
        </section>
      </div>
    );
  }

  if (view === "teams") {
    // display categories with colors
    const colorPalette = ["#dcfce7", "#e0f2fe", "#fff7ed", "#f5f3ff", "#fff1f2", "#f0f9ff"];
    const singlesCats = Object.keys(orderedSingles);
    const doublesCats = Object.keys(orderedDoubles);

    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <Button onClick={() => setView("menu")}>◀ Back</Button>
        <h2 style={{ marginTop: 8 }}>Teams</h2>

        <div style={{ marginTop: 12 }}>
          <h3>Singles</h3>
          <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e6edf8" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {singlesCats.length === 0 && <div style={{ color: "#6b7280" }}>No singles registered.</div>}
              {singlesCats.map((cat, idx) => {
                const arr = orderedSingles[cat] || [];
                return (
                  <div key={cat} style={{ borderRadius: 10, padding: 10, background: colorPalette[idx % colorPalette.length] }}>
                    <div style={{ fontWeight: 700 }}>{cat}</div>
                    <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>{arr.length} {arr.length===1?"player":"players"}</div>
                    <ul>{arr.map((n, i) => (<li key={i}>{n}</li>))}</ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Doubles</h3>
          <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e6edf8" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {doublesCats.length === 0 && <div style={{ color: "#6b7280" }}>No doubles registered.</div>}
              {doublesCats.map((cat, idx) => {
                const arr = orderedDoubles[cat] || [];
                return (
                  <div key={cat} style={{ borderRadius: 10, padding: 10, background: colorPalette[idx % colorPalette.length] }}>
                    <div style={{ fontWeight: 700 }}>{cat}</div>
                    <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>{arr.length} {arr.length===1?"pair":"pairs"}</div>
                    <ul>{arr.map((n, i) => (<li key={i}>{n}</li>))}</ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "fixtures") {
    const active = fixtures.filter((f) => f.status === "active");
    const upcoming = (fixtures.filter((f) => !f.status || f.status === "upcoming") || []).sort((a, b) => (a.start || 0) - (b.start || 0));
    const completed = fixtures.filter((f) => f.status === "completed");

    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <Button onClick={() => setView("menu")}>◀ Back</Button>
        <h2 style={{ marginTop: 8 }}>Fixtures & Scores</h2>

        <div style={{ marginTop: 12 }}>
          <h4>Active</h4>
          {active.length === 0 ? <div style={{ color: "#6b7280" }}>No active match.</div> : active.map((f) => (<div key={f.id} className="card" style={{ marginBottom: 8 }}>{(f.sides || []).join(" vs ")} • Live</div>))}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Upcoming</h4>
          {upcoming.length === 0 ? <div style={{ color: "#6b7280" }}>No upcoming matches.</div> : upcoming.map((f) => (<div key={f.id} className="card" style={{ marginBottom: 8 }}>{(f.sides || []).join(" vs ")} • {new Date(f.start).toLocaleString()}</div>))}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Completed</h4>
          {completed.length === 0 ? <div style={{ color: "#6b7280" }}>No results yet.</div> : completed.map((f) => (<div key={f.id} className="card" style={{ marginBottom: 8 }}>{(f.sides || []).join(" vs ")} • Winner: {f.winner || "-"} • Score: {f.scoreline || f.score || "-"}</div>))}
        </div>
      </div>
    );
  }

  return null;
}

/* --- Small ManagePlayers admin page (keeps existing behavior intact) --- */
function ManagePlayers({ onBack }) {
  const singlesCats = ["Women's Singles", "Kid's Singles", "Men's (A) Singles", "Men's (B) Singles"];
  const doublesCats = ["Women's Doubles", "Kid's Doubles", "Men's (A) Doubles", "Men's (B) Doubles", "Mixed Doubles"];

  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet();
        if (!alive) return;
        // ensure top-level keys exist
        setPlayers({
          singles: p && p.singles ? p.singles : singlesCats.reduce((a, c) => ({ ...a, [c]: [] }), {}),
          doubles: p && p.doubles ? p.doubles : doublesCats.reduce((a, c) => ({ ...a, [c]: [] }), {}),
        });
      } catch (e) {
        setPlayers({
          singles: singlesCats.reduce((a, c) => ({ ...a, [c]: [] }), {}),
          doubles: doublesCats.reduce((a, c) => ({ ...a, [c]: [] }), {}),
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const update = (type, cat, idx, value) => {
    setPlayers((prev) => {
      const copy = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      const arr = copy[type][cat] ? [...copy[type][cat]] : [];
      arr[idx] = value;
      copy[type][cat] = arr;
      return copy;
    });
  };

  const add = (type, cat) => {
    setPlayers((prev) => {
      const copy = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      const arr = copy[type][cat] ? [...copy[type][cat]] : [];
      arr.push("New Player");
      copy[type][cat] = arr;
      return copy;
    });
  };

  const remove = (type, cat, idx) => {
    setPlayers((prev) => {
      const copy = { singles: { ...prev.singles }, doubles: { ...prev.doubles } };
      const arr = copy[type][cat] ? [...copy[type][cat]] : [];
      arr.splice(idx, 1);
      copy[type][cat] = arr;
      return copy;
    });
  };

  const saveAll = async () => {
    try {
      await apiPlayersSet(players);
      alert("Players saved");
    } catch (e) {
      alert("Save failed: " + e.message);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button onClick={onBack}>◀ Back</Button>
        <h2 style={{ margin: 0 }}>Manage Players</h2>
        <div style={{ marginLeft: "auto" }}>
          <Button onClick={saveAll}>Save Changes</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 18 }}>
        <div>
          <h3>Singles</h3>
          {singlesCats.map((cat) => (
            <div key={cat} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700 }}>{cat}</div>
                <div style={{ color: "#6b7280" }}>{(players.singles && players.singles[cat] ? players.singles[cat].length : 0)} players</div>
              </div>
              <div style={{ marginTop: 8 }}>
                {(players.singles && players.singles[cat] ? players.singles[cat] : []).map((name, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input value={name} onChange={(e) => update("singles", cat, idx, e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8 }} />
                    <Button onClick={() => remove("singles", cat, idx)}>Del</Button>
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <Button onClick={() => add("singles", cat)}>Add Player</Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h3>Pairs / Doubles</h3>
          {doublesCats.map((cat) => (
            <div key={cat} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700 }}>{cat}</div>
                <div style={{ color: "#6b7280" }}>{(players.doubles && players.doubles[cat] ? players.doubles[cat].length : 0)} pairs</div>
              </div>
              <div style={{ marginTop: 8 }}>
                {(players.doubles && players.doubles[cat] ? players.doubles[cat] : []).map((name, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input value={name} onChange={(e) => update("doubles", cat, idx, e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8 }} />
                    <Button onClick={() => remove("doubles", cat, idx)}>Del</Button>
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <Button onClick={() => add("doubles", cat)}>Add Pair</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- Admin Landing page (keeps images and layout) --- */
export default function App() {
  const [page, setPage] = useState("landing"); // landing | fixtures | manage | start | results | viewer
  // keep Start / Results / Manage behavior as-is (you told me not to change them)
  // We'll route to local components for fixtures & manage; viewer is independent page

  if (page === "fixtures") return <FixturesAdmin onBack={() => setPage("landing")} />;
  if (page === "manage") return <ManagePlayers onBack={() => setPage("landing")} />;
  if (page === "viewer") return <ViewerStandalone />;

  return (
    <div style={{ minHeight: "100vh", padding: 28, background: "linear-gradient(135deg,#eef2ff,#e0f2fe)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 18 }}>RNW Tennis Tournament 2025</h1>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <CardTile img={imgStart} title="Start Match" subtitle="Choose from fixtures" onClick={() => setPage("start")} />
          <CardTile img={imgScore} title="Results" subtitle="Active · Upcoming · Completed" onClick={() => setPage("results")} />
          <CardTile img={imgSettings} title="Manage Players" subtitle="Singles & Doubles" onClick={() => setPage("manage")} />
        </div>

        <div style={{ marginTop: 22 }}>
          <Button onClick={() => setPage("fixtures")} style={{ padding: "10px 18px" }}>
            📅 Fixtures
          </Button>

          <Button onClick={() => setPage("viewer")} style={{ marginLeft: 12 }}>
            Open Public Viewer
          </Button>
        </div>
      </div>
    </div>
  );
}

