// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  App.jsx (router-based)
  - Admin UI at "/"
  - Viewer UI at "/viewer" and its subroutes
  - Minimal admin pages included (ManagePlayers simple implementation)
  - Viewer routes mount a ViewerLanding + dedicated pages (Rules / Teams / Fixtures)
*/

/* ---------------------------
   Basic tile component
   --------------------------- */
const Tile = ({ title, subtitle, img, to }) => {
  // if to is a URL path, render a Link for client-side navigation
  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          width: 340,
          borderRadius: 14,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
          border: "1px solid #e6edf8",
          cursor: "pointer",
          display: "block",
        }}
      >
        <div style={{ height: 160, position: "relative" }}>
          <img
            src={img}
            alt={title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ color: "#6b7280", marginTop: 6 }}>{subtitle}</div>}
        </div>
      </div>
    </Link>
  );
};

/* ---------------------------
   Admin: ManagePlayers
   - grouped categories for singles/doubles (editable)
   - save/load from /api/players (POST/GET)
   - minimal UI
   --------------------------- */
function ManagePlayersPage() {
  const CATS_SINGLES = [
    "Women's Singles",
    "Kid's Singles",
    "Men's (A) Singles",
    "Men's (B) Singles",
  ];
  const CATS_DOUBLES = [
    "Women's Doubles",
    "Kid's Doubles",
    "Men's (A) Doubles",
    "Men's (B) Doubles",
    "Mixed Doubles",
  ];

  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/players");
        if (!r.ok) throw new Error("players fetch failed");
        const data = await r.json();
        // Accept both legacy and grouped formats
        if (Array.isArray(data?.singles)) {
          // legacy: arrays -> put into default categories (Women's Singles/Women's Doubles fallback)
          setPlayers({
            singles: { "Women's Singles": data.singles || [] },
            doubles: { "Women's Doubles": data.doubles || [] },
          });
        } else {
          setPlayers({
            singles: data.singles || {},
            doubles: data.doubles || {},
          });
        }
      } catch (e) {
        console.warn("Load players failed", e);
        setPlayers({ singles: {}, doubles: {} });
        setError("Could not load players (server may be offline). You can still edit locally.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const updateCategory = (type, cat, arr) => {
    setPlayers((p) => {
      const copy = { singles: { ...p.singles }, doubles: { ...p.doubles } };
      copy[type][cat] = arr;
      return copy;
    });
  };

  const addItem = (type, cat) => {
    setPlayers((p) => {
      const arr = [...(p[type][cat] || [])];
      arr.push("New Player");
      const copy = { singles: { ...p.singles }, doubles: { ...p.doubles } };
      copy[type][cat] = arr;
      return copy;
    });
  };

  const deleteItem = (type, cat, idx) => {
    setPlayers((p) => {
      const arr = (p[type][cat] || []).filter((_, i) => i !== idx);
      const copy = { singles: { ...p.singles }, doubles: { ...p.doubles } };
      copy[type][cat] = arr;
      return copy;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      // Attempt to save grouped format; your server should accept this format
      const r = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(players),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error("Save failed: " + text);
      }
      setSaving(false);
      // No persistent toast - you asked to remove messagebox
    } catch (e) {
      console.error(e);
      setError("Save failed. Draft stored locally.");
      // Save draft locally as fallback
      try {
        localStorage.setItem("tennis:players:draft", JSON.stringify(players));
      } catch {}
      setSaving(false);
    }
  };

  // Detect draft on mount and show silently (no message)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tennis:players:draft");
      if (raw) {
        const draft = JSON.parse(raw);
        // load only if current players empty (avoid clobbering)
        if (!loading && (!players || (!Object.keys(players.singles || {}).length && !Object.keys(players.doubles || {}).length))) {
          setPlayers(draft);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Link to="/" className="btn" style={{ textDecoration: "none" }}>
          Back
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Manage Players</h2>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "#6b7280" }}>Loading players…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <h3 style={{ fontWeight: 700 }}>Singles</h3>
            {["Women's Singles", "Kid's Singles", "Men's (A) Singles", "Men's (B) Singles"].map((cat) => {
              const arr = players.singles?.[cat] || [];
              return (
                <div key={cat} style={{ marginBottom: 12, background: "white", borderRadius: 12, padding: 12, border: "1px solid #e6edf8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{arr.length} players</div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {(arr || []).map((n, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <input
                          value={n}
                          onChange={(e) => {
                            const copy = [...(players.singles?.[cat] || [])];
                            copy[i] = e.target.value;
                            updateCategory("singles", cat, copy);
                          }}
                          style={{ flex: 1, borderRadius: 8, padding: 8, border: "1px solid #e6edf8" }}
                        />
                        <button className="btn" onClick={() => deleteItem("singles", cat, i)}>
                          Del
                        </button>
                      </div>
                    ))}
                    <div>
                      <button className="btn" onClick={() => addItem("singles", cat)}>
                        Add Player
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3 style={{ fontWeight: 700 }}>Doubles</h3>
            {["Women's Doubles", "Kid's Doubles", "Men's (A) Doubles", "Men's (B) Doubles", "Mixed Doubles"].map((cat) => {
              const arr = players.doubles?.[cat] || [];
              return (
                <div key={cat} style={{ marginBottom: 12, background: "white", borderRadius: 12, padding: 12, border: "1px solid #e6edf8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{arr.length} pairs</div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {(arr || []).map((n, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <input
                          value={n}
                          onChange={(e) => {
                            const copy = [...(players.doubles?.[cat] || [])];
                            copy[i] = e.target.value;
                            updateCategory("doubles", cat, copy);
                          }}
                          style={{ flex: 1, borderRadius: 8, padding: 8, border: "1px solid #e6edf8" }}
                        />
                        <button className="btn" onClick={() => deleteItem("doubles", cat, i)}>
                          Del
                        </button>
                      </div>
                    ))}
                    <div>
                      <button className="btn" onClick={() => addItem("doubles", cat)}>
                        Add Pair
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------
 Admin: StartMatch (simple placeholder that will not break anything)
 Keep the original admin StartMatch if you prefer; this is a safe placeholder
 --------------------------- */
function StartMatchAdmin() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <Link to="/" className="btn" style={{ textDecoration: "none" }}>
          Back
        </Link>
        <h2 style={{ fontWeight: 700 }}>Start a Match (Admin)</h2>
      </div>

      <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e6edf8" }}>
        <div style={{ marginBottom: 10 }}>This admin view will let you pick a fixture and start scoring.</div>
        <div>
          <button className="btn" onClick={() => alert("Start scoring - use the Scoring admin UI you had previously.")}>
            Start Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
 Admin: Results placeholder (safe)
 --------------------------- */
function ResultsAdmin() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <Link to="/" className="btn" style={{ textDecoration: "none" }}>
          Back
        </Link>
        <h2 style={{ fontWeight: 700 }}>Results (Admin)</h2>
      </div>

      <div style={{ background: "white", padding: 20, borderRadius: 12, border: "1px solid #e6edf8" }}>
        <div>This is your admin results dashboard. Your existing results UI can be plugged here.</div>
      </div>
    </div>
  );
}

/* ---------------------------
 Viewer pages (mounted at /viewer)
 - ViewerLanding shows tiles (Rules / Teams / Fixture)
 - Dedicated pages: /viewer/rules, /viewer/teams, /viewer/fixtures
 --------------------------- */
function ViewerLanding() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Viewer</h1>
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Tile title="Rules" subtitle="Match rules & formats" img={imgStart} to="/viewer/rules" />
        <Tile title="Teams" subtitle="View players by category" img={imgSettings} to="/viewer/teams" />
        <Tile title="Fixture / Scores" subtitle="Active • Upcoming • Completed" img={imgScore} to="/viewer/fixtures" />
      </div>
    </div>
  );
}

function ViewerRules() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <button className="btn" onClick={() => navigate("/viewer")}>
          Back
        </button>
        <h2 style={{ fontWeight: 700 }}>Rules</h2>
      </div>
      <div style={{ background: "white", padding: 18, borderRadius: 12, border: "1px solid #e6edf8" }}>
        <h3>Qualifiers and Semifinal Matches Format</h3>
        <ol>
          <li>
            <strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.
          </li>
          <li>
            <strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played. Tiebreak won by first player to reach 5
            points. If it reaches 4-4, next point wins.
          </li>
          <li>
            <strong>No-adv (no AD) scoring</strong> — When game hits deuce (40-40) the next point decides the game. Receiver
            chooses which side the server will serve from. In doubles, the receiving team chooses.
          </li>
        </ol>

        <h3>Final Matches format</h3>
        <ol>
          <li>One full set - standard set rule of 6 games with tie-break.</li>
          <li>Limited deuce points: max 3 deuce points then next point decides.</li>
        </ol>
      </div>
    </div>
  );
}

function ViewerTeams() {
  // ViewerTeams will GET /api/players and render colored grouping (non-editable)
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/players");
        if (!r.ok) throw new Error("players fetch failed");
        const data = await r.json();
        if (Array.isArray(data?.singles)) {
          setPlayers({ singles: { "Women's Singles": data.singles || [] }, doubles: { "Women's Doubles": data.doubles || [] } });
        } else {
          setPlayers({ singles: data.singles || {}, doubles: data.doubles || {} });
        }
      } catch (e) {
        console.warn("Viewer teams load failed", e);
        setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // color map to match your design
  const COLOR_BG = {
    "Women's Singles": "#dcfce7",
    "Kid's Singles": "#e0f2fe",
    "Men's (A) Singles": "#fff4e6",
    "Men's (B) Singles": "#f3e8ff",
    "Women's Doubles": "#fff1f2",
    "Kid's Doubles": "#f3e8ff",
    "Men's (A) Doubles": "#fee2e2",
    "Men's (B) Doubles": "#ecfeff",
    "Mixed Doubles": "#dcfce7",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <button className="btn" onClick={() => navigate("/viewer")}>Back</button>
        <h2 style={{ fontWeight: 700 }}>Teams</h2>
      </div>

      {loading ? (
        <div style={{ color: "#6b7280" }}>Loading teams…</div>
      ) : (
        <div>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 8 }}>Singles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["Women's Singles", "Kid's Singles", "Men's (A) Singles", "Men's (B) Singles"].map((cat) => {
                const arr = players.singles?.[cat] || [];
                return (
                  <div key={cat} style={{ borderRadius: 12, background: "#fff", padding: 14, border: "1px solid #e6edf8" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>{cat}</div>
                      <div style={{ color: "#6b7280" }}>{arr.length}</div>
                    </div>
                    <div style={{ background: COLOR_BG[cat] || "#f8fafc", borderRadius: 10, padding: 12 }}>
                      {arr.length === 0 ? <div style={{ color: "#6b7280" }}>No players</div> :
                        <ul style={{ marginLeft: 18 }}>{arr.map((n, i) => <li key={i}>{n}</li>)}</ul>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: 8 }}>Doubles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["Women's Doubles", "Kid's Doubles", "Men's (A) Doubles", "Men's (B) Doubles", "Mixed Doubles"].map((cat) => {
                const arr = players.doubles?.[cat] || [];
                return (
                  <div key={cat} style={{ borderRadius: 12, background: "#fff", padding: 14, border: "1px solid #e6edf8" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700 }}>{cat}</div>
                      <div style={{ color: "#6b7280" }}>{arr.length}</div>
                    </div>
                    <div style={{ background: COLOR_BG[cat] || "#f8fafc", borderRadius: 10, padding: 12 }}>
                      {arr.length === 0 ? <div style={{ color: "#6b7280" }}>No pairs</div> :
                        <ul style={{ marginLeft: 18 }}>{arr.map((n, i) => <li key={i}>{n}</li>)}</ul>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewerFixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/fixtures");
        if (!r.ok) throw new Error("fixtures fetch failed");
        const data = await r.json();
        if (alive) setFixtures(Array.isArray(data) ? data : []);
      } catch (e) {
        console.warn("fixtures load failed", e);
        if (alive) setFixtures([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming").sort((a,b) => (a.start||0)-(b.start||0));
  const completed = fixtures.filter((f) => f.status === "completed").sort((a,b) => (b.finishedAt||0)-(a.finishedAt||0));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
        <button className="btn" onClick={() => navigate("/viewer")}>Back</button>
        <h2 style={{ fontWeight: 700 }}>Fixture & Scores</h2>
      </div>

      {loading ? <div style={{ color: "#6b7280" }}>Loading fixtures…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <h3>Active</h3>
              {active.length === 0 ? <div style={{ color: "#6b7280" }}>No active match.</div> : active.map(f => (
                <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
                  <div>Score: {f.scoreline || "-"}</div>
                </div>
              ))}
            </div>

            <div>
              <h3>Upcoming</h3>
              {upcoming.length === 0 ? <div style={{ color: "#6b7280" }}>No upcoming fixtures.</div> : upcoming.map(f => (
                <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Completed</h3>
            {completed.length === 0 ? <div style={{ color: "#6b7280" }}>No completed fixtures.</div> : completed.map(f => (
              <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8", marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
                <div style={{ color: "#6b7280" }}>{f.winner ? Winner: ${f.winner} : ""}</div>
                <div>Score: {f.scoreline || "-"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------
   Admin landing (root "/")
   Keep layout exactly: Start Match, Results, Manage Players in that order and Fixture button below
   --------------------------- */
function AdminLanding() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff,#e6f0ff)", padding: 28 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 18 }}>RNW Tennis Tournament</h1>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
          <Tile title="Start Match" subtitle="Choose from fixtures" img={imgStart} to="/start" />
          <Tile title="Results" subtitle="Active • Upcoming • Completed" img={imgScore} to="/results" />
          <Tile title="Manage Players" subtitle="Singles & Doubles" img={imgSettings} to="/manage" />
        </div>

        <div style={{ marginTop: 18 }}>
          <Link to="/fixtures-admin" className="btn" style={{ textDecoration: "none" }}>
            Fixtures
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   Top-level App with Router
   --------------------------- */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin pages */}
        <Route path="/" element={<AdminLanding />} />
        <Route path="/start" element={<StartMatchAdmin />} />
        <Route path="/results" element={<ResultsAdmin />} />
        <Route path="/manage" element={<ManagePlayersPage />} />
        <Route path="/fixtures-admin" element={<StartMatchAdmin />} />

        {/* Viewer pages (completely separate path-space) */}
        <Route path="/viewer" element={<ViewerLanding />} />
        <Route path="/viewer/rules" element={<ViewerRules />} />
        <Route path="/viewer/teams" element={<ViewerTeams />} />
        <Route path="/viewer/fixtures" element={<ViewerFixtures />} />

        {/* Fallback: admin landing */}
        <Route path="*" element={<AdminLanding />} />
      </Routes>
    </BrowserRouter>
  );
}
