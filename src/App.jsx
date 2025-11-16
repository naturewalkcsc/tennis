// src/App.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/**
 * Admin App.jsx — landing + admin pages
 *
 * This file:
 * - Renders landing with 3 image tiles (Start Match / Results / Manage Players)
 * - Clicking each tile changes `view` (no navigation), rendering a full-page admin UI
 * - Uses your serverless endpoints:
 *     GET  /api/players    -> loads players
 *     POST /api/players    -> saves players (payload JSON)
 *     GET  /api/fixtures   -> loads fixtures
 *     POST /api/fixtures   -> create fixture (if you have)
 *     PUT  /api/fixtures/:id or POST /api/fixtures with updated object (fallback)
 *     GET  /api/matches    -> historical matches (optional)
 *
 * If your server functions use slightly different endpoints or expect other HTTP methods,
 * modify the fetch URLs/methods in the functions below to match your deployed endpoints.
 */

// --- Small UI helpers
const Tile = ({ title, subtitle, img, onClick }) => (
  <button
    onClick={onClick}
    className="tile"
    style={{
      width: 300,
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid #e6e6e6",
      background: "#fff",
      textAlign: "left",
      boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
    }}
  >
    <div style={{ height: 140, position: "relative" }}>
      <img
        src={img}
        alt={title}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
    <div style={{ padding: 14 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={{ color: "#6b7280", marginTop: 6 }}>{subtitle}</div>
    </div>
  </button>
);

// --- Manage Players admin component
function ManagePlayers({ onBack }) {
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
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error(`GET /api/players failed: ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        // If legacy array shape received, convert to grouped with fallback categories
        if (Array.isArray(data?.singles)) {
          setPlayers({
            singles: { [CATS_SINGLES[0]]: data.singles || [] },
            doubles: { [CATS_DOUBLES[0]]: data.doubles || [] },
          });
        } else {
          setPlayers({
            singles: data.singles || {},
            doubles: data.doubles || {},
          });
        }
      } catch (e) {
        console.error("Failed loading players", e);
        setError("Could not load players (check server logs).");
        setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function updateCategory(type, category, newArr) {
    setPlayers((prev) => {
      const next = {
        singles: { ...(prev.singles || {}) },
        doubles: { ...(prev.doubles || {}) },
      };
      next[type][category] = newArr;
      return next;
    });
  }

  function addEmptyItem(type, category) {
    const arr = [...(players[type]?.[category] || [])];
    arr.push("New Player");
    updateCategory(type, category, arr);
  }

  async function savePlayers() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(players),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Save failed: ${res.status} ${txt}`);
      }
      // success
      setSaving(false);
      // Remove the success message box — user asked to remove this; we'll instead console.log
      console.log("Players saved");
    } catch (e) {
      console.error("Save players error", e);
      setError("Save failed. Check server or console.");
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} className="btn" style={{ padding: "8px 12px", borderRadius: 10 }}>
          Back
        </button>
        <h2 style={{ margin: 0 }}>Manage Players</h2>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={savePlayers} className="btn" disabled={saving} style={{ background: "#10b981", color: "#fff" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && <div style={{ marginBottom: 12, color: "crimson" }}>{error}</div>}

      {loading ? (
        <div>Loading players…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <h3>Singles</h3>
            {CATS_SINGLES.map((cat) => {
              const arr = players?.singles?.[cat] || [];
              return (
                <div key={cat} style={{ marginBottom: 14, padding: 12, borderRadius: 12, border: "1px solid #eaeaea" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{arr.length} players</div>
                  </div>

                  <div>
                    {arr.map((nm, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input
                          value={nm}
                          onChange={(e) => {
                            const copy = [...arr];
                            copy[idx] = e.target.value;
                            updateCategory("singles", cat, copy);
                          }}
                          style={{ flex: 1, padding: 8, borderRadius: 8 }}
                        />
                        <button
                          className="btn"
                          onClick={() => {
                            const copy = arr.filter((_, i) => i !== idx);
                            updateCategory("singles", cat, copy);
                          }}
                        >
                          Del
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button className="btn" onClick={() => addEmptyItem("singles", cat)}>
                      Add Player
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3>Doubles</h3>
            {CATS_DOUBLES.map((cat) => {
              const arr = players?.doubles?.[cat] || [];
              return (
                <div key={cat} style={{ marginBottom: 14, padding: 12, borderRadius: 12, border: "1px solid #eaeaea" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{arr.length} pairs</div>
                  </div>

                  <div>
                    {arr.map((nm, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input
                          value={nm}
                          onChange={(e) => {
                            const copy = [...arr];
                            copy[idx] = e.target.value;
                            updateCategory("doubles", cat, copy);
                          }}
                          style={{ flex: 1, padding: 8, borderRadius: 8 }}
                        />
                        <button
                          className="btn"
                          onClick={() => {
                            const copy = arr.filter((_, i) => i !== idx);
                            updateCategory("doubles", cat, copy);
                          }}
                        >
                          Del
                        </button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button className="btn" onClick={() => addEmptyItem("doubles", cat)}>
                      Add Pair
                    </button>
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

// --- Results admin component
function ResultsAdmin({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [r1, r2] = await Promise.all([fetch("/api/fixtures"), fetch("/api/matches")]);
        const fx = r1.ok ? await r1.json() : [];
        const ms = r2.ok ? await r2.json() : [];
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch (e) {
        console.error("Failed loading results", e);
        setFixtures([]);
        setMatches([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming").sort((a, b) => (a.start || 0) - (b.start || 0));
  const completed = fixtures.filter((f) => f.status === "completed");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} className="btn" style={{ padding: "8px 12px", borderRadius: 10 }}>
          Back
        </button>
        <h2 style={{ margin: 0 }}>Results</h2>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <section style={{ marginBottom: 16 }}>
            <h3>Active</h3>
            {active.length === 0 ? (
              <div style={{ color: "#6b7280" }}>No active matches</div>
            ) : (
              active.map((f) => (
                <div key={f.id} style={{ padding: 12, borderRadius: 10, marginBottom: 8, border: "1px solid #e6e6e6" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
                  <div style={{ marginTop: 6 }}>Score: {f.scoreline || f.score || "—"}</div>
                </div>
              ))
            )}
          </section>

          <section style={{ marginBottom: 16 }}>
            <h3>Upcoming</h3>
            {upcoming.length === 0 ? (
              <div style={{ color: "#6b7280" }}>No upcoming</div>
            ) : (
              upcoming.map((f) => (
                <div key={f.id} style={{ padding: 12, borderRadius: 10, marginBottom: 8, border: "1px solid #e6e6e6" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
                </div>
              ))
            )}
          </section>

          <section>
            <h3>Completed</h3>
            {completed.length === 0 ? (
              <div style={{ color: "#6b7280" }}>No completed matches</div>
            ) : (
              completed.map((f) => (
                <div key={f.id} style={{ padding: 12, borderRadius: 10, marginBottom: 8, border: "1px solid #e6e6e6" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{f.winner ? `Winner: ${f.winner}` : ""}</div>
                  <div style={{ marginTop: 6 }}>{f.scoreline || f.score || "-"}</div>
                </div>
              ))
            )}
          </section>
        </>
      )}

      <hr style={{ margin: "18px 0" }} />

      <section>
        <h3>Historical Matches (Matches API)</h3>
        {matches.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No matches history.</div>
        ) : (
          matches.map((m) => (
            <div key={m.id || Math.random()} style={{ padding: 10, borderRadius: 8, marginBottom: 8, border: "1px solid #eee" }}>
              <div style={{ fontWeight: 600 }}>{m.title || (m.sides || []).join(" vs ")}</div>
              <div style={{ color: "#6b7280" }}>{m.winner ? `Winner: ${m.winner}` : ""} • {m.score || m.scoreline || "-"}</div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

// --- Start Match admin component (simple fixtures chooser)
function StartMatchFromFixtures({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/fixtures");
        if (!res.ok) throw new Error(`GET /api/fixtures failed ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setFixtures(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed loading fixtures", e);
        setError("Could not load fixtures.");
        setFixtures([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  async function markActive(fixture) {
    setError("");
    try {
      // Try PUT /api/fixtures/:id if available — if not, attempt POST fallback
      const putUrl = `/api/fixtures/${encodeURIComponent(fixture.id)}`;
      const res = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fixture, status: "active", start: Date.now() }),
      });
      if (res.ok) {
        alert("Fixture marked active");
        // reload
        const r2 = await fetch("/api/fixtures");
        const data = r2.ok ? await r2.json() : [];
        setFixtures(Array.isArray(data) ? data : []);
        return;
      }
      // fallback: try POST to /api/fixtures to update (some deployments use POST update)
      const fallback = await fetch("/api/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fixture, status: "active", start: Date.now() }),
      });
      if (!fallback.ok) throw new Error("Update failed");
      alert("Fixture updated");
      const r3 = await fetch("/api/fixtures");
      const data3 = r3.ok ? await r3.json() : [];
      setFixtures(Array.isArray(data3) ? data3 : []);
    } catch (e) {
      console.error("Failed marking fixture active", e);
      setError("Could not mark fixture active (check server).");
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} className="btn" style={{ padding: "8px 12px", borderRadius: 10 }}>
          Back
        </button>
        <h2 style={{ margin: 0 }}>Start Match (From Fixtures)</h2>
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div>}

      {loading ? (
        <div>Loading fixtures…</div>
      ) : fixtures.length === 0 ? (
        <div style={{ color: "#6b7280" }}>No fixtures available.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {fixtures.map((f) => (
            <div key={f.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280" }}>{new Date(f.start || Date.now()).toLocaleString()}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => markActive(f)}>
                  Start Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- main App component + view switcher
export default function App() {
  const [view, setView] = useState("landing");
  // views: landing, manage, results, startFixtures

  function renderView() {
    switch (view) {
      case "manage":
        return <ManagePlayers onBack={() => setView("landing")} />;
      case "results":
        return <ResultsAdmin onBack={() => setView("landing")} />;
      case "start":
        return <StartMatchFromFixtures onBack={() => setView("landing")} />;
      case "landing":
      default:
        return (
          <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
            <h1 style={{ marginBottom: 18 }}>Lawn Tennis Scoring</h1>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Tile title="Start Match" subtitle="Choose fixtures" img={imgStart} onClick={() => setView("start")} />
              <Tile title="Results" subtitle="View results" img={imgScore} onClick={() => setView("results")} />
              <Tile title="Manage Players" subtitle="Singles & Doubles" img={imgSettings} onClick={() => setView("manage")} />
            </div>

            <div style={{ marginTop: 18 }}>
              <small style={{ color: "#6b7280" }}>Open viewer (public) at <code>/viewer</code> — viewer is separate and not the admin UI.</small>
            </div>
          </div>
        );
    }
  }

  return <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff,#e0f2fe)", paddingTop: 18 }}>{renderView()}</div>;
}

