// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

import Viewer from "./Viewer.jsx"; // your existing viewer implementation

// Small reusable tile used on landing pages
function Tile({ title, subtitle, img, onClick }) {
  return (
    <button
      onClick={onClick}
      className="tile"
      style={{
        display: "block",
        width: "100%",
        maxWidth: 360,
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid #e6e6e6",
        background: "#fff",
        textAlign: "left",
        cursor: "pointer",
        boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ height: 140, position: "relative" }}>
        <img src={img} alt={title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 4, fontSize: 13 }}>{subtitle}</div>
      </div>
    </button>
  );
}

/* ---------------------------
   Helper: API wrappers with robust fallbacks
   - Prefer window.apiPlayersGet / window.apiPlayersSet if present (some code used these)
   - Else try /api/players endpoint (fetch)
   - Else use localStorage
   --------------------------- */
async function loadPlayers() {
  // developer debug
  console.log("[App] loadPlayers()");
  // 1) global function
  if (typeof window !== "undefined" && typeof window.apiPlayersGet === "function") {
    try {
      return await window.apiPlayersGet();
    } catch (e) {
      console.warn("window.apiPlayersGet failed", e);
    }
  }

  // 2) serverless endpoint
  try {
    const resp = await fetch("/api/players");
    if (resp.ok) {
      const body = await resp.json();
      return body;
    } else {
      console.warn("/api/players returned", resp.status);
    }
  } catch (e) {
    console.warn("/api/players fetch failed", e);
  }

  // 3) localStorage fallback for preview
  try {
    const raw = localStorage.getItem("tennis:players");
    if (!raw) return { singles: {}, doubles: {} };
    return JSON.parse(raw);
  } catch (e) {
    console.warn("localStorage load failed", e);
    return { singles: {}, doubles: {} };
  }
}

async function savePlayers(obj) {
  console.log("[App] savePlayers()", obj);
  if (typeof window !== "undefined" && typeof window.apiPlayersSet === "function") {
    try {
      return await window.apiPlayersSet(obj);
    } catch (e) {
      console.warn("window.apiPlayersSet failed", e);
    }
  }

  try {
    const resp = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obj),
    });
    if (resp.ok) {
      return await resp.json();
    } else {
      console.warn("/api/players POST returned", resp.status);
    }
  } catch (e) {
    console.warn("/api/players POST failed", e);
  }

  // localStorage fallback
  try {
    localStorage.setItem("tennis:players", JSON.stringify(obj));
    return { ok: true, fallback: "localStorage" };
  } catch (e) {
    console.error("Failed to localStorage save", e);
    throw e;
  }
}

/* ---------------------------
   Admin components
   --------------------------- */

function AdminLanding() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Admin Console — Lawn Tennis Scoring</h1>
        <div style={{ marginLeft: "auto" }}>
          <Link to="/viewer" style={{ textDecoration: "none" }}>
            <button style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6e6e6" }}>Open Viewer</button>
          </Link>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <Tile title="Start Match" subtitle="Start a match (fixtures-based)" img={imgStart} onClick={() => navigate("/admin/start")} />
        <Tile title="Results" subtitle="Completed & Live results" img={imgScore} onClick={() => navigate("/admin/results")} />
        <Tile title="Manage Players" subtitle="Add / Edit players & pairs" img={imgSettings} onClick={() => navigate("/admin/manage")} />
      </div>
    </div>
  );
}

function StartMatchAdmin() {
  // Minimal starting UI so it's never blank. You can extend this with your existing logic.
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button style={{ padding: 8, borderRadius: 10 }} onClick={() => navigate(-1)}>Back</button>
        <h2 style={{ margin: 0 }}>Start Match (admin)</h2>
      </div>

      <div style={{ borderRadius: 12, padding: 16, border: "1px solid #e6e6e6", background: "#fff" }}>
        <p style={{ marginTop: 0 }}>This admin area will let you select fixtures and start a scoring session. The UI below is intentionally minimal but functional so the page won't be blank.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn" onClick={() => alert("Start now (placeholder) — connect with your scoring logic")}>Start Now</button>
          <button className="btn" onClick={() => alert("Select fixture (placeholder)")}>Select Fixture</button>
        </div>
      </div>
    </div>
  );
}

function ResultsAdmin() {
  const navigate = useNavigate();
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // try to load fixtures from server endpoint /api/fixtures, fallback to localStorage
      try {
        const resp = await fetch("/api/fixtures");
        if (resp.ok) {
          const j = await resp.json();
          if (alive) setFixtures(Array.isArray(j) ? j : []);
        } else {
          const local = localStorage.getItem("tennis:fixtures");
          if (local && alive) setFixtures(JSON.parse(local));
        }
      } catch (e) {
        const local = localStorage.getItem("tennis:fixtures");
        if (local && alive) setFixtures(JSON.parse(local));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} style={{ padding: 8, borderRadius: 10 }}>Back</button>
        <h2 style={{ margin: 0 }}>Results (admin)</h2>
      </div>

      {loading ? <div>Loading fixtures...</div> : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ borderRadius: 12, padding: 12, border: "1px solid #e6e6e6", background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Completed / Recent</h3>
            {fixtures.length === 0 ? <div>No fixtures found</div> : fixtures.filter(f => f.status === "completed").map(f => (
              <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontWeight: 700 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{f.winner ? `Winner: ${f.winner}` : "—"} • {f.scoreline || f.score || "—"}</div>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 12, padding: 12, border: "1px solid #e6e6e6", background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Upcoming</h3>
            {fixtures.filter(f => !f.status || f.status === "upcoming").map(f => (
              <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontWeight: 700 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start || Date.now()).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ManagePlayersAdmin() {
  const navigate = useNavigate();
  const SINGLE_CATS = ["Women's Singles", "Kid's Singles", "Men's (A) Singles", "Men's (B) Singles"];
  const DOUBLES_CATS = ["Women's Doubles", "Kid's Doubles", "Men's (A) Doubles", "Men's (B) Doubles", "Mixed Doubles"];

  const [players, setPlayersState] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSavingState] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadPlayers();
      if (!alive) return;
      // Normalize: ensure object structure
      setPlayersState({
        singles: p?.singles || {},
        doubles: p?.doubles || {},
      });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // update helper
  function updateCategory(type, category, arr) {
    setPlayersState(prev => {
      const copy = { singles: { ...(prev.singles || {}) }, doubles: { ...(prev.doubles || {}) } };
      copy[type] = copy[type] || {};
      copy[type][category] = arr;
      return copy;
    });
  }

  async function doSave() {
    setSavingState(true);
    try {
      await savePlayers(players);
      alert("Saved players");
    } catch (e) {
      alert("Save failed: " + (e?.message || e));
      console.error(e);
    } finally {
      setSavingState(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} style={{ padding: 8, borderRadius: 10 }}>Back</button>
        <h2 style={{ margin: 0 }}>Manage Players</h2>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={doSave} className="btn">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>

      {loading ? <div>Loading players...</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <h3>Singles</h3>
            {SINGLE_CATS.map(cat => {
              const arr = players.singles?.[cat] || [];
              return (
                <div key={cat} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{arr.length} players</div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {arr.map((name, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input value={name} onChange={(e) => { const copy = [...arr]; copy[i] = e.target.value; updateCategory("singles", cat, copy); }} style={{ flex: 1, padding: 8, borderRadius: 8 }} />
                        <button onClick={() => { const copy = arr.filter((_, idx) => idx !== i); updateCategory("singles", cat, copy); }} className="btn">Del</button>
                      </div>
                    ))}
                    <div>
                      <button onClick={() => updateCategory("singles", cat, [...arr, "New Player"])} className="btn">Add Player</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h3>Doubles</h3>
            {DOUBLES_CATS.map(cat => {
              const arr = players.doubles?.[cat] || [];
              return (
                <div key={cat} style={{ marginBottom: 12, padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{arr.length} pairs</div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {arr.map((name, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input value={name} onChange={(e) => { const copy = [...arr]; copy[i] = e.target.value; updateCategory("doubles", cat, copy); }} style={{ flex: 1, padding: 8, borderRadius: 8 }} />
                        <button onClick={() => { const copy = arr.filter((_, idx) => idx !== i); updateCategory("doubles", cat, copy); }} className="btn">Del</button>
                      </div>
                    ))}
                    <div><button onClick={() => updateCategory("doubles", cat, [...arr, "New Pair"])} className="btn">Add Pair</button></div>
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
   Root App with Router
   --------------------------- */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin UI */}
        <Route path="/" element={<AdminLanding />} />
        <Route path="/admin/start" element={<StartMatchAdmin />} />
        <Route path="/admin/results" element={<ResultsAdmin />} />
        <Route path="/admin/manage" element={<ManagePlayersAdmin />} />

        {/* Viewer (public) is a distinct route and uses your Viewer.jsx */}
        <Route path="/viewer/*" element={<Viewer />} />
      </Routes>
    </BrowserRouter>
  );
}

