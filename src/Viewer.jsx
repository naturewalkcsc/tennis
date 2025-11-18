/ src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  Viewer.jsx - public viewer (standalone)
  - Menu: Rules | Teams | Fixture/Scores (three image tiles)
  - Each tile opens a dedicated page with a Back button
  - Fetches /api/players and /api/fixtures safely
*/

const Tile = ({ title, subtitle, img, onClick }) => (
  <button
    onClick={onClick}
    className="tile"
    style={{
      width: 260,
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      background: "#fff",
      textAlign: "left",
      cursor: "pointer",
      padding: 0,
    }}
  >
    <div style={{ height: 140, position: "relative" }}>
      <img
        src={img}
        alt={title}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={{ color: "#6b7280", marginTop: 4, fontSize: 13 }}>{subtitle}</div>
    </div>
  </button>
);

export default function Viewer() {
  const [page, setPage] = useState("menu"); // 'menu' | 'rules' | 'teams' | 'fixtures'
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]); // historical matches (if you store separately)
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);

  // helper to fetch JSON safely
  const safeFetchJson = async (url) => {
    try {
      const res = await fetch(url + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch failed " + res.status);
      return await res.json();
    } catch (e) {
      // don't throw — caller should handle null
      console.warn("Viewer fetch error", url, e);
      return null;
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingPlayers(true);
      try {
        const p = await safeFetchJson("/api/players");
        if (!alive) return;
        if (p) setPlayers(p);
        else setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingFixtures(true);
      try {
        const fx = await safeFetchJson("/api/fixtures") || [];
        const ms = await safeFetchJson("/api/matches") || [];
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();

    // refresh occasionally so viewer stays somewhat live
    const iv = setInterval(async () => {
      try {
        const [fx, ms] = await Promise.all([
          safeFetchJson("/api/fixtures") || [],
          safeFetchJson("/api/matches") || [],
        ]);
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch (e) { /* ignore */ }
    }, 10000);

    return () => { clearInterval(iv); };
  }, []);

  // Helpers for rendering players/teams in categories (keeps order as stored)
  const renderTeamsList = () => {
    if (loadingPlayers) return <div className="card">Loading teams…</div>;

    const singles = players?.singles || {};
    const doubles = players?.doubles || {};

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h3 style={{ marginBottom: 8 }}>Singles</h3>
            {Object.keys(singles).length === 0 && <div className="card">No singles players configured.</div>}
            {Object.entries(singles).map(([cat, arr]) => (
              <div key={cat} style={{ marginBottom: 12 }} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600 }}>{cat}</div>
                  <div style={{ color: "#6b7280" }}>{(arr || []).length}</div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <ul style={{ marginLeft: 16 }}>
                    {(arr || []).map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 style={{ marginBottom: 8 }}>Doubles</h3>
            {Object.keys(doubles).length === 0 && <div className="card">No doubles pairs configured.</div>}
            {Object.entries(doubles).map(([cat, arr]) => (
              <div key={cat} style={{ marginBottom: 12 }} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600 }}>{cat}</div>
                  <div style={{ color: "#6b7280" }}>{(arr || []).length}</div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <ul style={{ marginLeft: 16 }}>
                    {(arr || []).map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFixturesList = () => {
    if (loadingFixtures) return <div className="card">Loading fixtures…</div>;

    const active = fixtures.filter((f) => f.status === "active");
    const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
    const completedF = fixtures.filter((f) => f.status === "completed");

    // combine completed fixtures + historical matches if needed
    const completed = [
      ...completedF,
      ...matches.map((m) => ({
        id: m.id,
        sides: m.sides,
        finishedAt: m.finishedAt,
        scoreline: m.scoreline,
        winner: m.winner,
        mode: m.mode || "singles",
      })),
    ].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

    return (
      <div>
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Active</div>
          {active.length ? active.map((f) => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 600 }}>{f.sides?.[0]} vs {f.sides?.[1]}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
            </div>
          )) : <div className="text-muted">No active match.</div>}
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Upcoming</div>
          {upcoming.length ? upcoming.map((f) => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 600 }}>{f.sides?.[0]} vs {f.sides?.[1]} <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280" }}>{f.mode}</span></div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
            </div>
          )) : <div className="text-muted">No upcoming fixtures.</div>}
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Completed</div>
          {completed.length ? completed.map((m) => (
            <div key={(m.id || "") + String(m.finishedAt || "")} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 600 }}>{m.sides?.[0]} vs {m.sides?.[1]}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                <span style={{ color: "#9CA3AF", textTransform: "uppercase", fontSize: 11 }}>Winner</span>{" "}
                <span style={{ fontWeight: 700 }}>{m.winner || ""}</span>{" "}
                <span style={{ marginLeft: 10, fontFamily: "monospace" }}>{m.scoreline || ""}</span>
              </div>
            </div>
          )) : <div className="text-muted">No completed matches yet.</div>}
        </div>
      </div>
    );
  };

  // Page renderer
  if (page === "menu") {
    return (
      <div className="app-bg">
        <div className="max-w-5xl mx-auto p-6">
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Viewer</h1>
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <Tile title="Rules" subtitle="Match formats & rules" img={imgStart} action={() => setPage("rules")} />
            <Tile title="Teams" subtitle="Players & pairs" img={imgScore} action={() => setPage("teams")} />
            <Tile title="Fixture / Scores" subtitle="Live • Upcoming • Results" img={imgSettings} action={() => setPage("fixtures")} />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>This is the public viewer page: share <code>/viewer</code> with people to view matches.</div>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated page view (rules / teams / fixtures) with Back button
  return (
    <div className="app-bg">
      <div className="max-w-5xl mx-auto p-6">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}>Back</button>
          <h2 style={{ fontWeight: 700, margin: 0 }}>{page === "rules" ? "Rules" : page === "teams" ? "Teams" : "Fixtures & Scores"}</h2>
        </div>

        <div>
          {page === "rules" && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Rules</h3>
              <h4 style={{ marginBottom: 6 }}>Qualifiers and Semifinal Matches Format</h4>
              <ol>
                <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
                <li><strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played to 5 points; 4-4 is next-point wins.</li>
                <li><strong>No-adv scoring</strong> — When game hits deuce (40-40) the next point decides the game. Receiver chooses receiving side; in doubles receiving team chooses side.</li>
              </ol>

              <h4 style={{ marginTop: 10 }}>Final Matches Format</h4>
              <ol>
                <li>One full set - standard 6-game set with tiebreak.</li>
                <li>Limited Deuce Points — maximum 3 deuce points; after that the next point decides the game.</li>
              </ol>
            </div>
          )}

          {page === "teams" && (
            <div>
              <h3 style={{ marginTop: 0 }}>Teams</h3>
              {renderTeamsList()}
            </div>
          )}

          {page === "fixtures" && (
            <div>
              <h3 style={{ marginTop: 0 }}>Fixtures & Scores</h3>
              {renderFixturesList()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
