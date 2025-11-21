// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/**
 * Viewer.jsx
 * - Menu with three big image tiles.
 * - Each tile opens a dedicated page (Back button returns to menu).
 * - Teams page shows categories; entries that include { name, pool } get split into Pool A / Pool B / No Pool.
 *
 * Endpoints expected:
 *   GET /api/players  -> { singles: {category: [...]}, doubles: {category: [...]} }
 *   GET /api/fixtures -> [ { id, mode, sides, start, status, winner, scoreline }, ... ]
 */

// small cache buster
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
        <img src={img} alt={title} style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 20 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 6 }}>{subtitle}</div>
      </div>
    </button>
  );
}

/** Normalize whatever shape the API gives into:
 *  { categoryName: [ { name: "...", pool: "No Pool"|"Pool A"|"Pool B" } ] }
 */
function normalizePlayersMap(playersMap) {
  const out = {};
  for (const cat of Object.keys(playersMap || {})) {
    const arr = playersMap[cat] || [];
    out[cat] = arr.map((it) => {
      if (!it) return { name: "", pool: "No Pool" };
      if (typeof it === "string") return { name: it, pool: "No Pool" };
      if (typeof it === "object") {
        // Accept { name } or { name, pool } or legacy shapes
        const name = it.name ?? it.label ?? String(it);
        const poolRaw = it.pool ?? it.group ?? "No Pool";
        const pool = typeof poolRaw === "string" ? poolRaw : String(poolRaw);
        return { name: String(name), pool };
      }
      return { name: String(it), pool: "No Pool" };
    });
  }
  return out;
}

// small helper to pick a gentle background color for category cards
const CATEGORY_COLORS = ["#fef3f3", "#f0fdf4", "#eef2ff", "#fffbeb", "#fef9c3", "#eff6ff"];
function colorForCategory(name) {
  if (!name) return CATEGORY_COLORS[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum = (sum * 31 + name.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[sum % CATEGORY_COLORS.length];
}

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
        setError((prev) => (prev ? prev + " • Failed loading players" : "Failed loading players"));
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

    // auto refresh fixtures and players every 10s so viewer stays in sync
    const iv = setInterval(async () => {
      try {
        const [data, fx] = await Promise.all([
          fetchJson("/api/players"),
          fetchJson("/api/fixtures"),
        ]);
        if (!alive) return;
        setPlayers({ singles: normalizePlayersMap(data.singles || {}), doubles: normalizePlayersMap(data.doubles || {}) });
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch {
        // ignore transient errors
      }
    }, 10000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // render a category card: if pool info exists, show Pool A / Pool B / No Pool columns
  const renderCategory = (catName, entries = []) => {
    // entries -> array of { name, pool }
    const groups = { A: [], B: [], none: [] };
    for (const e of entries) {
      const pool = (e.pool || "No Pool").toString().toLowerCase();
      if (pool === "a" || pool === "pool a") groups.A.push(e.name);
      else if (pool === "b" || pool === "pool b") groups.B.push(e.name);
      else groups.none.push(e.name);
    }
    const showPools = groups.A.length > 0 || groups.B.length > 0;

    return (
      <div
        key={catName}
        style={{
          background: colorForCategory(catName),
          borderRadius: 10,
          padding: 12,
          border: "1px solid #e9f0fb",
          minHeight: 100,
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
                    <li key={`a-${i}`}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {groups.B.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.B.map((n, i) => (
                    <li key={`b-${i}`}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {groups.none.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.none.map((n, i) => (
                    <li key={`n-${i}`}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {entries.map((e, i) => (
              <li key={`p-${i}`}>{e.name}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // fixture splits
  const activeFixtures = fixtures.filter((f) => f.status === "active");
  const upcomingFixtures = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter((f) => f.status === "completed");

  // Menu
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

  // RULES page
  if (page === "rules") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setPage("menu")}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}
          >
            Back
          </button>
        </div>
        <h2>Match Rules & Formats</h2>
        <div style={{ marginTop: 12, background: "white", padding: 16, borderRadius: 10, border: "1px solid #e6edf8" }}>
          <h3>Qualifiers and Semifinal Matches Format:</h3>
          <ol>
            <li>
              <strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.
            </li>
            <li>
              <strong>Tiebreak at 3–3</strong> — At 3–3 a tiebreak is played. Tiebreak to 5 points; at 4–4 next point wins.
            </li>
            <li>
              <strong>No-adv scoring</strong> — Next point after deuce decides the game.
            </li>
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

  // TEAMS page
  if (page === "teams") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setPage("menu")}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}
          >
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
                Object.entries(players.singles).map(([cat, arr]) => renderCategory(cat, arr))
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
                Object.entries(players.doubles).map(([cat, arr]) => renderCategory(cat, arr))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIXTURES page
  if (page === "fixtures") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setPage("menu")}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}
          >
            Back
          </button>
        </div>
        <h2>Fixtures & Scores</h2>
        <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <div style={{ flex: 1, background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Active</div>
            {activeFixtures.length === 0 ? (
              <div style={{ color: "#9ca3af" }}>No active fixtures</div>
            ) : (
              activeFixtures.map((f) => (
                <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                    <div style={{ color: "#6b7280", fontSize: 13 }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
                  </div>
                  <div style={{ marginTop: 6 }}>{f.mode}</div>
                </div>
              ))
            )}

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Upcoming</div>
              {upcomingFixtures.length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No upcoming fixtures</div>
              ) : (
                upcomingFixtures.map((f) => (
                  <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                    <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                    <div style={{ color: "#6b7280", fontSize: 13 }}>{f.start ? new Date(f.start).toLocaleString() : "Invalid Date"}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ width: 420, background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Completed</div>
            {completedFixtures.length === 0 ? (
              <div style={{ color: "#9ca3af" }}>No completed fixtures</div>
            ) : (
              completedFixtures.map((f) => (
                <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>
                    {f.winner ? `Winner: ${f.winner}` : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}
                  </div>
                  <div style={{ marginTop: 6, color: "#6b7280" }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // fallback
  return null;
}
