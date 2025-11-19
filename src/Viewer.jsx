// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/**
 * Viewer.jsx
 * - Shows three big image tiles (Rules, Teams, Fixtures/Scores)
 * - Clicking a tile opens a dedicated page with Back button
 * - Fetches /api/players and /api/fixtures (non-blocking; graceful fallback)
 *
 * Place StartMatch.jpg, Score.jpg, Settings.jpg in src/ (same folder as Viewer.jsx).
 */

const Tile = ({ img, title, subtitle, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        width: 360,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.06)",
        background: "#fff",
        boxShadow: "0 6px 12px rgba(16,24,40,0.06)",
        cursor: "pointer",
        padding: 0,
      }}
      aria-label={title}
    >
      <div style={{ height: 150, overflow: "hidden" }}>
        <img
          src={img}
          alt=""
          style={{ width: "100%", height: "150px", objectFit: "cover", display: "block" }}
        />
      </div>
      <div style={{ padding: 18, textAlign: "left" }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div style={{ color: "#6b7280" }}>{subtitle}</div>
      </div>
    </button>
  );
};

export default function Viewer() {
  const [page, setPage] = useState("menu"); // 'menu' | 'rules' | 'teams' | 'fixtures'
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [playersError, setPlayersError] = useState(null);
  const [fixturesError, setFixturesError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingPlayers(true);
        const res = await fetch("/api/players?t=" + Date.now());
        if (!res.ok) throw new Error(`players fetch failed ${res.status}`);
        const data = await res.json();
        if (alive) setPlayers(data || { singles: {}, doubles: {} });
      } catch (e) {
        if (alive) {
          setPlayers({ singles: {}, doubles: {} });
          setPlayersError(e.message || String(e));
          console.warn("Viewer: load players failed", e);
        }
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingFixtures(true);
        const res = await fetch("/api/fixtures?t=" + Date.now());
        if (!res.ok) throw new Error(`fixtures fetch failed ${res.status}`);
        const data = await res.json();
        if (alive) setFixtures(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) {
          setFixtures([]);
          setFixturesError(e.message || String(e));
          console.warn("Viewer: load fixtures failed", e);
        }
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const MenuView = () => (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 28, marginBottom: 18 }}>Viewer</h1>

      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <Tile
          img={imgStart}
          title="Rules"
          subtitle="Match rules and formats"
          onClick={() => setPage("rules")}
        />
        <Tile
          img={imgScore}
          title="Teams"
          subtitle="View players by category"
          onClick={() => setPage("teams")}
        />
        <Tile
          img={imgSettings}
          title="Fixture / Scores"
          subtitle="Live, upcoming & recent results"
          onClick={() => setPage("fixtures")}
        />
      </div>
    </div>
  );

  const BackHeader = ({ title }) => (
    <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
      <button
        onClick={() => setPage("menu")}
        style={{
          borderRadius: 10,
          padding: "8px 12px",
          border: "1px solid rgba(0,0,0,0.08)",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        ← Back
      </button>
      <h2 style={{ margin: 0 }}>{title}</h2>
    </div>
  );

  const RulesPage = () => (
    <div>
      <BackHeader title="Rules" />
      <div style={{ padding: 20, maxWidth: 980 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e6edf8" }}>
          <h3>Qualifiers and Semifinal Matches Format</h3>
          <ol>
            <li>
              <strong>First to four games wins</strong> — First player/team to reach 4 games wins a
              set.
            </li>
            <li>
              <strong>Tiebreak at 3–3</strong> — At 3–3 a tiebreak is played. Tiebreak is won by the
              first player to reach 5 points. If it reaches 4–4, next point wins.
            </li>
            <li>
              <strong>No-adv (no AD) scoring</strong> — When game hits deuce (40–40) the next point
              decides the game. Receiver chooses serving side (in doubles, receiving team chooses).
            </li>
          </ol>

          <h3>Final Matches Format</h3>
          <ol>
            <li>One full set — Standard set rule of 6 games (tie-break at 6–6).</li>
            <li>
              Limited Deuce Points — Max 3 deuce points allowed. At 4th deuce point the next point
              decides the game.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );

  const TeamsPage = () => {
    // Render categories with simple color backgrounds
    const categoryColor = (i) => {
      const palette = ["#dff7dc", "#d8f0ff", "#fbead5", "#f3e7ff", "#fdebd6", "#f7f3ff"];
      return palette[i % palette.length];
    };

    const singlesEntries = players?.singles && typeof players.singles === "object" ? Object.entries(players.singles) : [];
    const doublesEntries = players?.doubles && typeof players.doubles === "object" ? Object.entries(players.doubles) : [];

    return (
      <div>
        <BackHeader title="Teams" />
        <div style={{ padding: 20, maxWidth: 1100 }}>
          {loadingPlayers && <div style={{ marginBottom: 12 }}>Loading teams…</div>}
          {playersError && (
            <div style={{ marginBottom: 12, color: "crimson" }}>Load players error: {playersError}</div>
          )}

          <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e6edf8" }}>
            <h3>Singles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
              {singlesEntries.length === 0 && <div style={{ gridColumn: "1/-1" }}>No singles available</div>}
              {singlesEntries.map(([cat, arr], idx) => (
                <div
                  key={cat}
                  style={{
                    background: categoryColor(idx),
                    padding: 12,
                    borderRadius: 10,
                    minHeight: 80,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{cat} <span style={{ fontWeight: 600, color: "#444", fontSize: 13 }}>({Array.isArray(arr) ? arr.length : 0})</span></div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {(Array.isArray(arr) ? arr : []).map((name, i) => <li key={i}>{name}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 18 }}>Doubles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
              {doublesEntries.length === 0 && <div style={{ gridColumn: "1/-1" }}>No doubles available</div>}
              {doublesEntries.map(([cat, arr], idx) => (
                <div
                  key={cat}
                  style={{
                    background: categoryColor(idx + 3),
                    padding: 12,
                    borderRadius: 10,
                    minHeight: 80,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{cat} <span style={{ fontWeight: 600, color: "#444", fontSize: 13 }}>({Array.isArray(arr) ? arr.length : 0})</span></div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {(Array.isArray(arr) ? arr : []).map((name, i) => <li key={i}>{name}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FixturesPage = () => {
    const byStatus = (st) => fixtures.filter((f) => (f.status || "upcoming") === st);
    const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
    const active = byStatus("active");
    const completed = byStatus("completed");

    return (
      <div>
        <BackHeader title="Fixtures / Scores" />
        <div style={{ padding: 20, maxWidth: 1000 }}>
          {loadingFixtures && <div>Loading fixtures…</div>}
          {fixturesError && <div style={{ color: "crimson" }}>Load fixtures error: {fixturesError}</div>}

          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #e6edf8" }}>
              <h3>Active</h3>
              {active.length === 0 && <div style={{ color: "#6b7280" }}>No active match</div>}
              {active.map((f) => (
                <div key={f.id} style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700 }}>
                      {f.sides?.[0] || "—"} vs {f.sides?.[1] || "—"}
                    </div>
                    <div style={{ color: "#6b7280" }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {f.scoreline ? <span style={{ fontWeight: 700 }}>{f.scoreline}</span> : <span style={{ color: "#6b7280" }}>In progress</span>}
                  </div>
                </div>
              ))}

              <h3 style={{ marginTop: 16 }}>Upcoming</h3>
              {upcoming.length === 0 && <div style={{ color: "#6b7280" }}>No upcoming matches</div>}
              {upcoming.map((f) => (
                <div key={f.id} style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ fontWeight: 700 }}>{(f.sides||[]).join(" vs ") || "vs"}</div>
                  <div style={{ color: "#6b7280" }}>{f.start ? new Date(f.start).toLocaleString() : "TBD"}</div>
                </div>
              ))}
            </div>

            <div style={{ width: 420, background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #e6edf8" }}>
              <h3>Completed</h3>
              {completed.length === 0 && <div style={{ color: "#6b7280" }}>No completed matches</div>}
              {completed.map((f) => (
                <div key={f.id} style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ fontWeight: 700 }}>{(f.sides||[]).join(" vs ")}</div>
                  <div style={{ color: "#6b7280", marginBottom: 6 }}>{f.end ? new Date(f.end).toLocaleString() : (f.start ? new Date(f.start).toLocaleString() : "")}</div>
                  <div>Winner: <strong>{f.winner || "-"}</strong> <span style={{ marginLeft: 8 }}>{f.scoreline || ""}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Router switch
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff,#e6f0ff)" }}>
      {page === "menu" && <MenuView />}
      {page === "rules" && <RulesPage />}
      {page === "teams" && <TeamsPage />}
      {page === "fixtures" && <FixturesPage />}
    </div>
  );
}
