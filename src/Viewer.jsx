import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  Viewer.jsx - standalone public viewer.
  - Menu with 3 buttons (Rules, Teams, Fixtures).
  - Each button opens its own dedicated page with a Back button.
  - Loads players and fixtures from /api/players and /api/fixtures.
  - Console logs for debug.
*/

const Tile = ({ title, img, onClick }) => (
  <button
    onClick={onClick}
    style={{
      cursor: "pointer",
      width: 220,
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #e6edf8",
      background: "#fff",
      textAlign: "left",
      padding: 0,
      boxShadow: "0 4px 10px rgba(16,24,40,0.04)",
    }}
  >
    <div style={{ height: 120, position: "relative" }}>
      <img src={img} alt={title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <div style={{ padding: 10 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
    </div>
  </button>
);

function Menu({ onOpen }) {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Viewer</h1>
      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Tile title="Rules" img={imgStart} onClick={() => onOpen("rules")} />
        <Tile title="Teams" img={imgScore} onClick={() => onOpen("teams")} />
        <Tile title="Fixture / Scores" img={imgSettings} onClick={() => onOpen("fixtures")} />
      </div>
    </div>
  );
}

function RulesPage({ onBack }) {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8", background: "#fff" }}>Back</button>
        <h2 style={{ margin: 0 }}>Rules</h2>
      </div>

      <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e6edf8" }}>
        <h3 style={{ marginTop: 0 }}>Qualifiers and Semifinal Matches Format</h3>
        <ol>
          <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
          <li><strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played to 5 points. If tiebreak reaches 4-4, next point wins.</li>
          <li><strong>No-adv scoring</strong> — When game hits deuce (40-40) the next point decides the game. Receiver chooses serve side; in doubles the receiving team chooses.</li>
        </ol>

        <h3>Final Matches format</h3>
        <ol>
          <li>One full set — Standard set rule of 6 games with tiebreak.</li>
          <li>Limited deuce points — Max 3 deuce points allowed; at 4th deuce point the next point decides the game.</li>
        </ol>
      </div>
    </div>
  );
}

function TeamsPage({ onBack, players }) {
  // players: { singles: { category: [names...] }, doubles: { category: [names...] } }
  // render categories with simple colored headers
  const categoryStyle = (idx) => {
    const bg = ["#fdf2f8", "#eef2ff", "#ecfeff", "#fff7ed", "#fefce8", "#f0fdf4"][idx % 6];
    const color = ["#be185d", "#1e3a8a", "#065f46", "#92400e", "#92400e", "#166534"][idx % 6];
    return { background: bg, color, padding: "8px 10px", borderRadius: 8, marginBottom: 8 };
  };

  const singlesEntries = Object.entries(players.singles || {});
  const doublesEntries = Object.entries(players.doubles || {});

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8", background: "#fff" }}>Back</button>
        <h2 style={{ margin: 0 }}>Teams</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Singles</h3>
          {(singlesEntries.length === 0) && <div style={{ color: "#6b7280" }}>No singles data available.</div>}
          {singlesEntries.map(([cat, arr], i) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={categoryStyle(i)}>
                <strong>{cat}</strong> <span style={{ marginLeft: 8, color: "#6b7280" }}>({arr.length})</span>
              </div>
              <ul style={{ marginTop: 8, marginLeft: 18 }}>
                {arr.length === 0 ? <li style={{ color: "#6b7280" }}>No players</li> : arr.map((n, idx) => <li key={idx}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Doubles</h3>
          {(doublesEntries.length === 0) && <div style={{ color: "#6b7280" }}>No doubles data available.</div>}
          {doublesEntries.map(([cat, arr], i) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={categoryStyle(i)}>
                <strong>{cat}</strong> <span style={{ marginLeft: 8, color: "#6b7280" }}>({arr.length})</span>
              </div>
              <ul style={{ marginTop: 8, marginLeft: 18 }}>
                {arr.length === 0 ? <li style={{ color: "#6b7280" }}>No pairs</li> : arr.map((n, idx) => <li key={idx}>{n}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FixturesPage({ onBack, fixtures }) {
  const active = fixtures.filter(f => f.status === "active");
  const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming");
  const completed = fixtures.filter(f => f.status === "completed");

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8", background: "#fff" }}>Back</button>
        <h2 style={{ margin: 0 }}>Fixture / Scores</h2>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ background: "#fff", border: "1px solid #e6edf8", borderRadius: 10, padding: 12 }}>
          <h4 style={{ margin: "0 0 8px 0" }}>Active</h4>
          {active.length === 0 ? <div style={{ color: "#6b7280" }}>No live match.</div> : active.map(f => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 700 }}>{f.sides?.[0]} vs {f.sides?.[1]} <span style={{ marginLeft: 8, fontSize: 12, padding: "2px 6px", borderRadius: 8, background: "#ecfdf5", color: "#065f46" }}>{f.mode}</span></div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e6edf8", borderRadius: 10, padding: 12 }}>
          <h4 style={{ margin: "0 0 8px 0" }}>Upcoming</h4>
          {upcoming.length === 0 ? <div style={{ color: "#6b7280" }}>No upcoming fixtures.</div> : upcoming.map(f => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 700 }}>{f.sides?.[0]} vs {f.sides?.[1]}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", border: "1px solid #e6edf8", borderRadius: 10, padding: 12 }}>
          <h4 style={{ margin: "0 0 8px 0" }}>Completed</h4>
          {completed.length === 0 ? <div style={{ color: "#6b7280" }}>No completed matches yet.</div> : completed.map(f => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 700 }}>{f.sides?.[0]} vs {f.sides?.[1]}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{f.finishedAt ? new Date(f.finishedAt).toLocaleString() : ""}</div>
              <div style={{ marginTop: 6 }}><strong>Winner:</strong> {f.winner || "-"} <span style={{ marginLeft: 12, fontFamily: "monospace" }}>{f.scoreline || ""}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Viewer() {
  const [view, setView] = useState("menu"); // 'menu' | 'rules' | 'teams' | 'fixtures'
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);

  useEffect(() => {
    console.log("Viewer mounted");
    let alive = true;

    (async () => {
      // load players
      try {
        const r = await fetch("/api/players?t=" + Date.now(), { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          if (alive) setPlayers(data || { singles: {}, doubles: {} });
        } else {
          console.warn("players API returned non-ok", r.status);
        }
      } catch (e) {
        console.warn("Failed loading players", e);
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();

    (async () => {
      // load fixtures
      try {
        const r = await fetch("/api/fixtures?t=" + Date.now(), { cache: "no-store" });
        if (r.ok) {
          const fx = await r.json();
          if (alive) setFixtures(Array.isArray(fx) ? fx : []);
        } else {
          console.warn("fixtures API returned non-ok", r.status);
        }
      } catch (e) {
        console.warn("Failed loading fixtures", e);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  // menu -> dedicated page
  if (view === "menu") return <Menu onOpen={setView} />;

  // rules page
  if (view === "rules") return <RulesPage onBack={() => setView("menu")} />;

  // teams page
  if (view === "teams") return <TeamsPage onBack={() => setView("menu")} players={players} />;

  // fixtures page
  if (view === "fixtures") return <FixturesPage onBack={() => setView("menu")} fixtures={fixtures} />;

  // fallback
  return <div style={{ padding: 24 }}>Unknown view</div>;
}
