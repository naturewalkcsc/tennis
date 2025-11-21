import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/**
 * Viewer.jsx
 *
 * Changes made:
 * - Removed grouping by day in fixtures view.
 * - Made fixture date/time more prominent (bolder/darker).
 * - Added color palette to Teams category cards.
 * - Fixed cache-buster and fetch error template strings.
 * - Stable keys and no template errors in JSX.
 *
 * Expects API endpoints:
 *  GET /api/players  -> { singles: { "Category": [ ... ] }, doubles: { "Category": [ ... ] } }
 *  GET /api/fixtures -> [ { id, mode, sides, start, status, winner, scoreline }, ... ]
 */

const cacheBuster = () => `?t=${Date.now()}`;

async function fetchJson(url) {
  const res = await fetch(url + cacheBuster(), { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return await res.json();
}

function Tile({ img, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="viewer-tile"
      style={{
        borderRadius: 12,
        border: "1px solid #e6edf8",
        overflow: "hidden",
        background: "white",
        cursor: "pointer",
        textAlign: "left",
        padding: 0,
        width: 360,
      }}
    >
      <div style={{ height: 140, overflow: "hidden" }}>
        <img
          src={img}
          alt={title}
          style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }}
        />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 6 }}>{subtitle}</div>
      </div>
    </button>
  );
}

/** Normalize players map so every entry is { name: string, pool: string } */
function normalizePlayersMap(playersMap) {
  const out = {};
  for (const cat of Object.keys(playersMap || {})) {
    const arr = playersMap[cat] || [];
    out[cat] = arr.map((it) => {
      if (!it) return { name: "", pool: "none" };
      if (typeof it === "string") return { name: it, pool: "none" };
      if (typeof it === "object") {
        const name = it.name ?? it.label ?? String(it);
        const pool = (it.pool || "none").toString();
        return { name, pool };
      }
      return { name: String(it), pool: "none" };
    });
  }
  return out;
}

// small color palette for category cards (cycles)
const CARD_COLORS = [
  { bg: "#e6fff0", border: "#d1f7df" },
  { bg: "#fff6e6", border: "#fdeacb" },
  { bg: "#eef6ff", border: "#d9eaff" },
  { bg: "#fff0f6", border: "#f7d9e9" },
  { bg: "#f0fff5", border: "#dbffea" },
];

export default function Viewer() {
  const [page, setPage] = useState("menu"); // menu | rules | teams | fixtures
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingPlayers(true);
      try {
        const data = await fetchJson("/api/players");
        if (!alive) return;
        const s = normalizePlayersMap(data.singles || {});
        const d = normalizePlayersMap(data.doubles || {});
        setPlayers({ singles: s, doubles: d });
      } catch (e) {
        console.warn("Failed loading players", e);
        setError("Failed loading players");
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();
    (async () => {
      setLoadingFixtures(true);
      try {
        const fx = await fetchJson("/api/fixtures");
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.warn("Failed loading fixtures", e);
        setError((prev) => (prev ? prev + " • Failed loading fixtures" : "Failed loading fixtures"));
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Teams helpers
  const renderCategory = (catName, entries, idx) => {
    // entries: array of {name, pool}
    const groups = { A: [], B: [], none: [] };
    for (const e of entries) {
      const pool = (e.pool || "none").toString().toLowerCase();
      if (pool === "a" || pool === "pool a") groups.A.push(e.name);
      else if (pool === "b" || pool === "pool b") groups.B.push(e.name);
      else groups.none.push(e.name);
    }

    const showPools = groups.A.length > 0 || groups.B.length > 0;
    const color = CARD_COLORS[idx % CARD_COLORS.length];

    return (
      <div
        key={catName}
        style={{
          background: color.bg,
          borderRadius: 10,
          padding: 14,
          border: `1px solid ${color.border}`,
          minHeight: 90,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>{catName}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{entries.length}</div>
        </div>

        {entries.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No players</div>
        ) : showPools ? (
          <div style={{ display: "flex", gap: 12 }}>
            {groups.A.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool A</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.A.map((n, i) => (
                    <li key={`a-${catName}-${i}`}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {groups.B.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.B.map((n, i) => (
                    <li key={`b-${catName}-${i}`}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {groups.none.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.none.map((n, i) => (
                    <li key={`n-${catName}-${i}`}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {entries.map((e, i) => (
              <li key={`p-${catName}-${i}`}>{e.name}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Fixtures (no grouping by day)
  const activeFixtures = fixtures.filter((f) => f.status === "active");
  const upcomingFixtures = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter((f) => f.status === "completed");

  // MENU
  if (page === "menu") {
    return (
      <div style={{ padding: 28 }}>
        <h1 style={{ margin: 0 }}>RNW Tennis Tournament 2025</h1>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        <div style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Tile img={imgStart} title="Rules" subtitle="Match rules and formats" onClick={() => setPage("rules")} />
          <Tile img={imgScore} title="Teams" subtitle="View players by category" onClick={() => setPage("teams")} />
          <Tile img={imgSettings} title="Fixture/Scores" subtitle="Live, upcoming & recent results" onClick={() => setPage("fixtures")} />
        </div>
      </div>
    );
  }

  // RULES
  if (page === "rules") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>

        <h2>Match Rules & Formats</h2>
        <div style={{ marginTop: 12, background: "white", padding: 16, borderRadius: 10, border: "1px solid #e6edf8" }}>
          <h3>Qualifiers and Semifinal Matches Format:</h3>
          <ol>
            <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
            <li><strong>Tiebreak at 3–3</strong> — At 3–3 a tiebreak is played. Tiebreak to 5 points; at 4–4 next point wins.</li>
            <li><strong>No-adv scoring</strong> — Next point after deuce decides the game.</li>
          </ol>

          <h3>Final Matches format:</h3>
          <ol>
            <li>One full set — Standard set rule of 6 games and tie-break will be followed.</li>
            <li>Limited Deuce Points — Max 3 deuce points allowed; at the 4th deuce point next point decides the game.</li>
          </ol>
        </div>
      </div>
    );
  }

  // TEAMS
  if (page === "teams") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>

        <h2>Teams</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Singles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? (
                <div>Loading players…</div>
              ) : Object.keys(players.singles).length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No singles categories</div>
              ) : (
                Object.entries(players.singles).map(([cat, arr], i) => renderCategory(cat, arr, i))
              )}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Doubles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? (
                <div>Loading players…</div>
              ) : Object.keys(players.doubles).length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No doubles categories</div>
              ) : (
                Object.entries(players.doubles).map(([cat, arr], i) => renderCategory(cat, arr, i + 5))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIXTURES (no grouped by day)
  if (page === "fixtures") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>

        <h2>Fixtures & Scores</h2>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <div style={{ flex: 1, background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Active</div>
            {activeFixtures.length === 0 ? <div style={{ color: "#9ca3af" }}>No active fixtures</div> :
              activeFixtures.map((f) => (
                <div key={f.id} style={{ padding: 12, borderBottom: "1px solid #eef2f7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{(f.sides || []).join(" vs ")}</div>
                    <div style={{ color: "#374151", fontSize: 14, marginTop: 4 }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
                    <div style={{ marginTop: 6, color: "#6b7280" }}>{f.mode}</div>
                  </div>
                </div>
              ))
            }

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Upcoming</div>
              {upcomingFixtures.length === 0 ? <div style={{ color: "#9ca3af" }}>No upcoming fixtures</div> : upcomingFixtures.map((f) => (
                <div key={f.id} style={{ padding: 12, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ fontWeight: 700 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#374151", fontSize: 14, marginTop: 4 }}>{f.start ? new Date(f.start).toLocaleString() : "Invalid Date"}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: 420, background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Completed</div>
            {completedFixtures.length === 0 ? <div style={{ color: "#9ca3af" }}>No completed fixtures</div> : completedFixtures.map((f) => (
              <div key={f.id} style={{ padding: 12, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 700 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#374151", fontSize: 14, marginTop: 4 }}>
                  {f.winner ? `Winner: ${f.winner}` : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}
                </div>
                <div style={{ marginTop: 6, color: "#6b7280" }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
