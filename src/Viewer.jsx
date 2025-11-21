import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/**
 * Viewer.jsx
 * - Menu (3 image tiles) -> separate pages with Back button
 * - Teams page: categories with colored cards; supports pool A/B/no-pool
 * - Fixtures page: day-wise grouped table, active/upcoming/completed split
 *
 * Endpoints expected:
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
        boxShadow: "0 6px 16px rgba(16,24,40,0.06)",
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

/* simple color palette for category cards (will cycle if more categories exist) */
const CATEGORY_COLORS = [
  { bg: "#e9f8ef", border: "#d6f0dc" }, // pale green
  { bg: "#eaf6ff", border: "#d9ecff" }, // pale blue
  { bg: "#fff4e9", border: "#feedd8" }, // pale peach
  { bg: "#f6ecff", border: "#f0e3ff" }, // pale purple
  { bg: "#fff7e9", border: "#fff0d6" }, // pale yellow
];

/* normalize players map: accepts string array or object array */
function normalizePlayersMap(playersMap) {
  // playersMap: { category: [item] } ; item may be string or {name, pool}
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

/* group fixtures by date (locale date string) */
function groupFixturesByDay(fixtures) {
  const map = {};
  for (const f of (fixtures || [])) {
    const d = f.start ? new Date(f.start) : null;
    const key = d ? d.toLocaleDateString() : "No Date";
    if (!map[key]) map[key] = [];
    map[key].push(f);
  }
  // return sorted by date ascending
  const entries = Object.entries(map).sort((a, b) => {
    if (a[0] === "No Date") return 1;
    if (b[0] === "No Date") return -1;
    const da = new Date(a[0]);
    const db = new Date(b[0]);
    return da - db;
  });
  return entries;
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

  /* Teams rendering */
  const renderCategory = (catName, entries, index) => {
    // entries: array of {name,pool}
    const groups = { A: [], B: [], none: [] };
    for (const e of entries) {
      const pool = (e.pool || "none").toString().toLowerCase();
      if (pool === "a" || pool === "pool a") groups.A.push(e.name);
      else if (pool === "b" || pool === "pool b") groups.B.push(e.name);
      else groups.none.push(e.name);
    }
    const showPools = groups.A.length > 0 || groups.B.length > 0;
    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    return (
      <div
        key={catName}
        style={{
          background: color.bg,
          borderRadius: 12,
          padding: 14,
          border: `1px solid ${color.border}`,
          minHeight: 110,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>{catName}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{entries.length}</div>
        </div>

        {entries.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No players</div>
        ) : showPools ? (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {groups.A.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool A</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.A.map((n, i) => (
                    <li key={`a-${i}`} style={{ marginBottom: 6 }}>
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {groups.B.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.B.map((n, i) => (
                    <li key={`b-${i}`} style={{ marginBottom: 6 }}>
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {groups.none.length > 0 && (
              <div style={{ flex: groups.A.length + groups.B.length > 0 ? 1 : "auto" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.none.map((n, i) => (
                    <li key={`n-${i}`} style={{ marginBottom: 6 }}>
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {entries.map((e, i) => (
              <li key={`p-${i}`} style={{ marginBottom: 6 }}>
                {e.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  /* Fixtures rendering - group by day and display a table per day */
  const groupedByDay = groupFixturesByDay(fixtures);

  const renderDayTable = (dateLabel, dayFixtures) => {
    // sort dayFixtures by start time
    const sorted = (dayFixtures || []).slice().sort((a, b) => {
      const ta = a.start ? new Date(a.start).getTime() : 0;
      const tb = b.start ? new Date(b.start).getTime() : 0;
      return ta - tb;
    });

    return (
      <div key={dateLabel} style={{ marginBottom: 18 }}>
        <h4 style={{ margin: "8px 0 12px" }}>{dateLabel}</h4>
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #eef4fb", background: "white" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 1fr", gap: 0, padding: "8px 12px", background: "#fafcff", borderBottom: "1px solid #eef4fb", fontWeight: 600 }}>
            <div>Match</div>
            <div>Time</div>
            <div>Result</div>
          </div>
          {sorted.map((f) => (
            <div key={f.id} style={{ display: "grid", gridTemplateColumns: "2fr 120px 1fr", gap: 0, padding: "12px", borderBottom: "1px solid #f3f6fb", alignItems: "center" }}>
              <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
              <div style={{ color: "#6b7280" }}>{f.start ? new Date(f.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
              <div style={{ textAlign: "right", color: f.status === "active" ? "#16a34a" : "#374151" }}>
                {f.status === "active" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width:10,height:10,borderRadius:20,background:"#16a34a",display:"inline-block" }} /> Live</span> : ""}
                {f.status === "completed" ? <span>Winner: {f.winner || "-"} {f.scoreline ? ` • ${f.scoreline}` : ""}</span> : ""}
                {(!f.status || f.status === "upcoming") ? <span style={{ color: "#6b7280" }}>{f.mode || ""}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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

  // RULES PAGE
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
            <li>
              <strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.
            </li>
            <li>
              <strong>Tiebreak at 3–3</strong> — At 3–3 a tiebreak is played. Tiebreak to 5 points; at 4–4 next point wins.
            </li>
            <li>
              <strong>No-adv scoring</strong> — Next point after deuce decides the game. Receiver chooses the receiving side.
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

  // TEAMS PAGE
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
              ) : Object.keys(players.singles || {}).length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No singles categories</div>
              ) : (
                Object.entries(players.singles).map(([cat, arr], idx) => renderCategory(cat, arr, idx))
              )}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Doubles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? (
                <div>Loading players…</div>
              ) : Object.keys(players.doubles || {}).length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No doubles categories</div>
              ) : (
                Object.entries(players.doubles).map(([cat, arr], idx) => renderCategory(cat, arr, idx + 10))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIXTURES PAGE (day-wise)
  if (page === "fixtures") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>
        <h2>Fixtures & Scores</h2>

        <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Grouped by Day</div>
              {loadingFixtures ? (
                <div>Loading fixtures…</div>
              ) : groupedByDay.length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No fixtures</div>
              ) : (
                groupedByDay.map(([dateLabel, dayFixtures]) => renderDayTable(dateLabel, dayFixtures))
              )}
            </div>
          </div>

          <div style={{ width: 420 }}>
            <div style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Summary</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>Active</div>
                <div style={{ color: "#6b7280" }}>{fixtures.filter((f) => f.status === "active").length} active</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>Upcoming</div>
                <div style={{ color: "#6b7280" }}>{fixtures.filter((f) => !f.status || f.status === "upcoming").length} upcoming</div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Completed</div>
                <div style={{ color: "#6b7280" }}>{fixtures.filter((f) => f.status === "completed").length} completed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
