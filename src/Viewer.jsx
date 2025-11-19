// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  Viewer.jsx - public viewer page.
  - Shows three tiles (Rules, Teams, Fixture/Scores)
  - Clicking a tile opens a dedicated page with a Back button
  - Loads data from /api/players and /api/fixtures
*/

const buster = () => "?t=" + Date.now();

async function fetchJsonNoThrow(url) {
  try {
    const res = await fetch(url + buster(), { cache: "no-store" });
    if (!res.ok) {
      // return null to indicate failure; caller handles it
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn("fetch failed", url, e);
    return null;
  }
}

function Tile({ title, subtitle, img, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 220,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #e6edf8",
        background: "#fff",
        textAlign: "left",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <div style={{ height: 120, position: "relative" }}>
        <img
          src={img}
          alt={title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 6, fontSize: 13 }}>{subtitle}</div>
      </div>
    </button>
  );
}

function Menu({ onOpen }) {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Viewer</h1>

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <Tile title="Rules" subtitle="Match formats & tie-breaks" img={imgStart} onClick={() => onOpen("rules")} />
        <Tile title="Teams" subtitle="Players / Pairs by category" img={imgScore} onClick={() => onOpen("teams")} />
        <Tile title="Fixture / Scores" subtitle="Live, upcoming, completed" img={imgSettings} onClick={() => onOpen("fixtures")} />
      </div>

      <div style={{ marginTop: 18 }}>
        <small style={{ color: "#6b7280" }}>Viewer shows public rules, team lists, and fixtures. Use Back button to return.</small>
      </div>
    </div>
  );
}

function RulesPage({ onBack }) {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8" }}>Back</button>
        <h2 style={{ margin: 0 }}>Rules</h2>
      </div>

      <div style={{ marginTop: 14, background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e6edf8" }}>
        <h3 style={{ marginTop: 0 }}>Qualifiers and Semifinal Matches Format</h3>
        <ol>
          <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
          <li><strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played to 5 points (4-4 → next point wins).</li>
          <li><strong>No-adv (no AD) scoring</strong> — At deuce (40-40) the next point decides the game.</li>
        </ol>

        <h3>Final Matches Format</h3>
        <ol>
          <li>One full set — standard set rule of 6 games and tie break applies.</li>
          <li>Limited Deuce Points — maximum 3 deuce points allowed; at the 4th deuce point the next point decides the game.</li>
        </ol>
      </div>
    </div>
  );
}

function TeamsPage({ onBack, players }) {
  // players may be null or { singles: {...}, doubles: {...} }
  const singles = (players && players.singles) || {};
  const doubles = (players && players.doubles) || {};

  const renderCategory = (category, data) => {
    // data can be:
    //  - array => no pools
    //  - object like { poolA: [...], poolB: [...], noPool: [...] } or similar
    if (Array.isArray(data)) {
      return (
        <div key={category} style={{ marginBottom: 12, padding: 12, borderRadius: 10, border: "1px solid #eef2f7", background: "#fff" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{category} <span style={{ color: "#6b7280", fontSize: 13, marginLeft: 8 }}>({data.length})</span></div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>{data.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </div>
      );
    } else if (data && typeof data === "object") {
      // check for pool keys (poolA / poolB / noPool)
      const poolA = data.poolA || data["Pool A"] || data.pool_a || [];
      const poolB = data.poolB || data["Pool B"] || data.pool_b || [];
      const noPool = data.noPool || data.none || data.no_pool || [];
      const hasPools = (poolA && poolA.length) || (poolB && poolB.length);
      if (!hasPools && noPool.length) {
        return renderCategory(category, noPool);
      }
      return (
        <div key={category} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{category}</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #eef2f7", background: "#fff" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool A <span style={{ color: "#6b7280" }}>({poolA.length})</span></div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>{(poolA || []).map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
            <div style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #eef2f7", background: "#fff" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B <span style={{ color: "#6b7280" }}>({poolB.length})</span></div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>{(poolB || []).map((n, i) => <li key={i}>{n}</li>)}</ul>
            </div>
            {noPool && noPool.length ? (
              <div style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #eef2f7", background: "#fff" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool <span style={{ color: "#6b7280" }}>({noPool.length})</span></div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>{noPool.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            ) : null}
          </div>
        </div>
      );
    } else {
      return null;
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8" }}>Back</button>
        <h2 style={{ margin: 0 }}>Teams</h2>
      </div>

      <div style={{ marginTop: 12 }}>
        <h3>Singles</h3>
        {Object.keys(singles).length === 0 ? <div style={{ color: "#9ca3af" }}>No players found</div> : Object.entries(singles).map(([cat, arr]) => renderCategory(cat, arr))}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Doubles</h3>
        {Object.keys(doubles).length === 0 ? <div style={{ color: "#9ca3af" }}>No pairs found</div> : Object.entries(doubles).map(([cat, arr]) => renderCategory(cat, arr))}
      </div>
    </div>
  );
}

function FixturesPage({ onBack, fixtures }) {
  const active = (fixtures || []).filter(f => f.status === "active");
  const upcoming = (fixtures || []).filter(f => !f.status || f.status === "upcoming");
  const completed = (fixtures || []).filter(f => f.status === "completed");

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8" }}>Back</button>
        <h2 style={{ margin: 0 }}>Fixtures & Scores</h2>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 12 }}>
          <h4>Active</h4>
          {active.length === 0 ? <div style={{ color: "#9ca3af" }}>No live match.</div> : active.map(f => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
              <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <h4>Upcoming</h4>
          {upcoming.length === 0 ? <div style={{ color: "#9ca3af" }}>No upcoming fixtures.</div> : upcoming.map(f => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
              <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")} <span style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>{f.mode}</span></div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div>
          <h4>Completed</h4>
          {completed.length === 0 ? <div style={{ color: "#9ca3af" }}>No completed fixtures</div> : completed.map(f => (
            <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
              <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                {f.winner ? "Winner: " + f.winner : ""}
                {f.scoreline ? " • " + f.scoreline : ""}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Viewer() {
  const [page, setPage] = useState("menu"); // 'menu' | 'rules' | 'teams' | 'fixtures'
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [p, fx] = await Promise.all([
        fetchJsonNoThrow("/api/players"),
        fetchJsonNoThrow("/api/fixtures"),
      ]);
      if (!alive) return;
      if (p) setPlayers(p);
      if (fx) setFixtures(fx);
      setLoading(false);
    })();

    // refresh periodically so viewer stays live
    const iv = setInterval(async () => {
      try {
        const [p, fx] = await Promise.all([
          fetchJsonNoThrow("/api/players"),
          fetchJsonNoThrow("/api/fixtures"),
        ]);
        if (p) setPlayers(p);
        if (fx) setFixtures(fx);
      } catch (e) { /* ignore */ }
    }, 10000);

    return () => { alive = false; clearInterval(iv); };
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #eef2f7", background: "#fff" }}>Loading…</div>
      </div>
    );
  }

  if (page === "menu") return <Menu onOpen={setPage} />;
  if (page === "rules") return <RulesPage onBack={() => setPage("menu")} />;
  if (page === "teams") return <TeamsPage onBack={() => setPage("menu")} players={players} />;
  if (page === "fixtures") return <FixturesPage onBack={() => setPage("menu")} fixtures={fixtures} />;

  return null;
}
