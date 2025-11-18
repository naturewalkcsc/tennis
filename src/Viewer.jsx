// src/Viewer.jsx
import React, { useEffect, useState } from "react";

/*
Viewer page — standalone and independent.
Shows a main menu of 3 tiles (Rules / Teams / Fixture & Scores).
Clicking a tile opens a dedicated page with Back button.
Uses the same server endpoints as admin app:
  GET /api/players
  GET /api/fixtures
  GET /api/matches
*/

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

const buster = () => "?t=" + Date.now();

async function apiPlayersGet() {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("players fetch failed");
  return await r.json();
}
async function apiFixturesList() {
  const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("fixtures fetch failed");
  return await r.json();
}
async function apiMatchesList() {
  const r = await fetch("/api/matches" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("matches fetch failed");
  return await r.json();
}

/* Category ordering requested by you (use these defaults) */
const SINGLES_CATEGORIES_ORDER = [
  "Women's Singles",
  "Kid's Singles",
  "NW Team (A) Singles",
  "NW Team (B) Singles",
];

const DOUBLES_CATEGORIES_ORDER = [
  "Women's Doubles",
  "Kid's Doubles",
  "NW Team (A) Doubles",
  "NW Team (B) Doubles",
  "Mixed Doubles",
];

const CATEGORY_COLORS = [
  { bg: "#fffbeb", fg: "#92400e" },
  { bg: "#eef2ff", fg: "#1e3a8a" },
  { bg: "#ecfeff", fg: "#065f46" },
  { bg: "#f5f3ff", fg: "#5b21b6" },
  { bg: "#fff1f2", fg: "#be123c" },
  { bg: "#f7fee7", fg: "#365314" },
];

function Tile({ title, subtitle, img, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 260,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #e6edf8",
        background: "white",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ height: 120, position: "relative" }}>
        <img src={img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>{subtitle}</div>
      </div>
    </button>
  );
}

export default function Viewer() {
  const [view, setView] = useState("menu"); // menu | rules | teams | fixtures
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [errorPlayers, setErrorPlayers] = useState("");
  const [errorFixtures, setErrorFixtures] = useState("");

  useEffect(() => {
    // load data on mount
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet();
        if (!alive) return;
        // backend may return legacy arrays or new object format
        // Normalise to expected object { singles: {cat:[]}, doubles: {cat:[]} } if needed
        if (Array.isArray(p)) {
          // legacy: p is list of singles only -> put into "Women's Singles" fallback
          setPlayers({ singles: { "All Singles": p }, doubles: {} });
        } else {
          setPlayers({ singles: p.singles || {}, doubles: p.doubles || {} });
        }
      } catch (e) {
        console.warn("Failed loading players", e);
        setErrorPlayers("Could not load teams");
        setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();

    (async () => {
      try {
        const [fx, ms] = await Promise.all([apiFixturesList(), apiMatchesList()]);
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch (e) {
        console.warn("Failed loading fixtures/matches", e);
        setErrorFixtures("Could not load fixtures/results");
        setFixtures([]);
        setMatches([]);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();

    // Periodic refresh so viewer stays live
    const iv = setInterval(async () => {
      try {
        const [fx, ms] = await Promise.all([apiFixturesList(), apiMatchesList()]);
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch {}
    }, 10000);

    return () => { alive = false; clearInterval(iv); };
  }, []);

  function filterKnown(obj, kind) {
    const order = kind === "singles" ? SINGLES_CATEGORIES_ORDER : DOUBLES_CATEGORIES_ORDER;
    const filtered = {};
    for (const cat of order) {
      if (obj && obj[cat] && Array.isArray(obj[cat]) && obj[cat].length > 0) filtered[cat] = obj[cat];
    }
    // if nothing matched the known list, show everything present (fallback)
    if (Object.keys(filtered).length === 0 && obj) {
      for (const k of Object.keys(obj)) filtered[k] = obj[k];
    }
    return filtered;
  }

  // Menu
  if (view === "menu") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff,#e0f2fe)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>Viewer</h1>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Tile title="Rules" subtitle="Match formats & rules" img={imgStart} onClick={() => setView("rules")} />
            <Tile title="Teams" subtitle="Teams & players" img={imgSettings} onClick={() => setView("teams")} />
            <Tile title="Fixtures / Scores" subtitle="Live, upcoming, completed" img={imgScore} onClick={() => setView("fixtures")} />
          </div>

          <div style={{ marginTop: 18 }}>
            <button onClick={() => window.history.back()} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8", background: "white" }}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  // Rules page
  if (view === "rules") {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setView("menu")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8", background: "white" }}>Back</button>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Rules</h2>
        </div>

        <div style={{ lineHeight: 1.6 }}>
          <h3 style={{ fontWeight: 700 }}>Qualifiers and Semifinal Matches Format</h3>
          <ol>
            <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
            <li><strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played. The tiebreak is won by the first player to reach 5 points. If it reaches 4-4, next point wins.</li>
            <li><strong>No-adv (no AD) scoring</strong> — When game hits deuce (40-40) the next point decides the game. Receiver chooses which side the server will serve from. In doubles, receiving team chooses receiving side.</li>
          </ol>

          <h3 style={{ fontWeight: 700, marginTop: 12 }}>Final Matches format</h3>
          <ol>
            <li><strong>One full set</strong> — Standard set rule of 6 games and Tie break will be followed.</li>
            <li><strong>Limited Deuce Points</strong> — Max 3 deuce points will be allowed. At 4th deuce point the next point decides the game.</li>
          </ol>
        </div>
      </div>
    );
  }

  // Teams page — separate page
  if (view === "teams") {
    const singles = filterKnown(players.singles || {}, "singles");
    const doubles = filterKnown(players.doubles || {}, "doubles");

    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setView("menu")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8", background: "white" }}>Back</button>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Teams</h2>
        </div>

        {loadingPlayers ? <div>Loading teams…</div> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <h3 style={{ fontWeight: 700 }}>Singles</h3>
              {Object.keys(singles).length === 0 ? <div style={{ color: "#6b7280" }}>No singles registered.</div> : Object.entries(singles).map(([cat, arr], i) => (
                <div key={cat} style={{ borderRadius: 12, padding: 12, marginBottom: 10, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length].bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{arr.length} {arr.length === 1 ? "player" : "players"}</div>
                  </div>
                  <ul style={{ marginLeft: 18 }}>{arr.map((n, idx) => <li key={idx}>{n}</li>)}</ul>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ fontWeight: 700 }}>Doubles</h3>
              {Object.keys(doubles).length === 0 ? <div style={{ color: "#6b7280" }}>No pairs registered.</div> : Object.entries(doubles).map(([cat, arr], i) => (
                <div key={cat} style={{ borderRadius: 12, padding: 12, marginBottom: 10, background: CATEGORY_COLORS[(i+2) % CATEGORY_COLORS.length].bg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600 }}>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{arr.length} {arr.length === 1 ? "pair" : "pairs"}</div>
                  </div>
                  <ul style={{ marginLeft: 18 }}>{arr.map((n, idx) => <li key={idx}>{n}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fixtures page — separate page
  if (view === "fixtures") {
    const active = fixtures.filter(f => f.status === "active");
    const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming").sort((a,b) => (a.start||0) - (b.start||0));
    const completedFixtures = fixtures.filter(f => f.status === "completed");

    // Also show historical match results recorded separately
    const completed = [
      ...completedFixtures,
      ...matches.map(m => ({
        id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner, mode: m.mode || "singles"
      }))
    ].sort((a,b) => (b.finishedAt||0) - (a.finishedAt||0));

    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <button onClick={() => setView("menu")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e6edf8", background: "white" }}>Back</button>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Fixtures & Scores</h2>
        </div>

        {loadingFixtures ? <div>Loading fixtures…</div> : (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <h3 style={{ fontWeight: 700 }}>Active</h3>
              {active.length ? active.map(f => (
                <div key={f.id} style={{ padding: 10, borderRadius: 10, background: "#ecfdf5", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
                </div>
              )) : <div style={{ color: "#6b7280" }}>No active match.</div>}
            </div>

            <div>
              <h3 style={{ fontWeight: 700 }}>Upcoming</h3>
              {upcoming.length ? upcoming.map(f => (
                <div key={f.id} style={{ padding: 10, borderRadius: 10, border: "1px solid #e6edf8", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")} <span style={{ marginLeft: 8, fontSize: 12, padding: "2px 6px", borderRadius: 6, background: "#f1f5f9" }}>{f.mode}</span></div>
                  <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
                </div>
              )) : <div style={{ color: "#6b7280" }}>No upcoming matches.</div>}
            </div>

            <div>
              <h3 style={{ fontWeight: 700 }}>Completed</h3>
              {completed.length ? completed.map(f => (
                <div key={(f.id||"") + String(f.finishedAt||"")} style={{ padding: 10, borderRadius: 10, background: "#f8fafc", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{f.finishedAt ? new Date(f.finishedAt).toLocaleString() : ""}</div>
                  <div style={{ marginTop: 6 }}>Winner: <strong>{f.winner||"-"}</strong> • Score: {f.scoreline||"-"}</div>
                </div>
              )) : <div style={{ color: "#6b7280" }}>No results yet.</div>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

