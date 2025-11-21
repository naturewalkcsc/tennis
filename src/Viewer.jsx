// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/**
 * Viewer.jsx
 * Public viewer:
 *  - Menu with 3 big buttons (images)
 *  - Rules, Teams, Fixtures pages each open as dedicated views with Back
 *  - Teams: categories displayed with colored cards, pool-aware (Pool A / Pool B / No Pool)
 *  - Fixtures: grouped by day (local date), colored rows, active match highlighted
 *
 * Expected endpoints:
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
        boxShadow: "0 2px 8px rgba(16,24,40,0.06)",
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

function normalizePlayersMap(playersMap) {
  // Normalize incoming map so each category -> [{name, pool}]
  const out = {};
  if (!playersMap || typeof playersMap !== "object") return out;
  for (const cat of Object.keys(playersMap)) {
    const arr = playersMap[cat] || [];
    if (!Array.isArray(arr)) continue;
    out[cat] = arr.map((it) => {
      if (!it) return { name: "", pool: "none" };
      if (typeof it === "string") return { name: it, pool: "none" };
      if (typeof it === "object") {
        const name = (it.name || it.label || "").toString();
        const pool = (it.pool || it.group || "none").toString();
        return { name, pool };
      }
      return { name: String(it), pool: "none" };
    });
  }
  return out;
}

/* small color palette for category cards (cycled) */
const CATEGORY_COLORS = [
  { bg: "#f0fdf4", border: "#bbf7d0", accent: "#065f46" }, // green-ish
  { bg: "#fff7ed", border: "#ffedd5", accent: "#92400e" }, // orange
  { bg: "#eff6ff", border: "#dbeafe", accent: "#1e40af" }, // blue
  { bg: "#fff1f2", border: "#fecaca", accent: "#991b1b" }, // red
  { bg: "#f8fafc", border: "#e2e8f0", accent: "#0f172a" }, // neutral
];

function categoryColorForIndex(i) {
  return CATEGORY_COLORS[i % CATEGORY_COLORS.length];
}

function groupFixturesByDay(fixtures = []) {
  // returns { "YYYY-MM-DD": [ fixtures... ], order: [dates...] }
  const map = {};
  const order = [];
  for (const f of fixtures) {
    // if invalid start use today
    let key;
    try {
      const dt = f.start ? new Date(Number(f.start)) : new Date();
      // key in local date format yyyy-mm-dd
      key = dt.toISOString().slice(0, 10);
    } catch {
      key = new Date().toISOString().slice(0, 10);
    }
    if (!map[key]) {
      map[key] = [];
      order.push(key);
    }
    map[key].push(f);
  }
  // sort each day's fixtures by start time
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => (Number(a.start || 0) - Number(b.start || 0)));
  }
  // sort dates ascending
  order.sort();
  return { map, order };
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
        setPlayers({
          singles: normalizePlayersMap(data.singles || {}),
          doubles: normalizePlayersMap(data.doubles || {}),
        });
      } catch (e) {
        console.warn("Failed loading players", e);
        if (alive) setError((p) => (p ? p + " • Failed players" : "Failed players"));
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
        if (alive) setError((p) => (p ? p + " • Failed fixtures" : "Failed fixtures"));
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();

    // poll periodically for fixtures so viewer stays live
    const iv = setInterval(async () => {
      try {
        const fx = await fetchJson("/api/fixtures");
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch {}
    }, 10_000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  /* ---------------- Teams rendering ---------------- */
  function renderCategoryCard(catName, entries = [], idx = 0) {
    // entries: [{name, pool}]
    const groups = { A: [], B: [], none: [] };
    for (const e of entries) {
      const p = (e.pool || "none").toString().toLowerCase();
      if (p === "a" || p === "pool a") groups.A.push(e.name);
      else if (p === "b" || p === "pool b") groups.B.push(e.name);
      else groups.none.push(e.name);
    }
    const showPools = groups.A.length > 0 || groups.B.length > 0;
    const color = categoryColorForIndex(idx);
    return (
      <div
        key={catName}
        style={{
          background: color.bg,
          borderRadius: 12,
          padding: 12,
          border: `1px solid ${color.border}`,
          minHeight: 110,
          boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, color: color.accent }}>{catName}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{entries.length}</div>
        </div>

        {entries.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No entries</div>
        ) : showPools ? (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              {groups.A.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool A</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>{groups.A.map((n, i) => <li key={`pa-${i}`}>{n}</li>)}</ul>
                </>
              )}
            </div>
            <div style={{ flex: 1 }}>
              {groups.B.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>{groups.B.map((n, i) => <li key={`pb-${i}`}>{n}</li>)}</ul>
                </>
              )}
            </div>
            <div style={{ flex: 1 }}>
              {groups.none.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>{groups.none.map((n, i) => <li key={`pn-${i}`}>{n}</li>)}</ul>
                </>
              )}
            </div>
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>{entries.map((e, i) => <li key={`p-${i}`}>{e.name}</li>)}</ul>
        )}
      </div>
    );
  }

  /* ---------------- Fixtures rendering ---------------- */
  const { map: fixturesByDay, order: fixturesDates } = groupFixturesByDay(fixtures);
  function renderFixturesDay(dateKey) {
    const list = fixturesByDay[dateKey] || [];
    // nice formatted date
    const pretty = new Date(dateKey + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "short", day: "numeric" });
    return (
      <div key={dateKey} style={{ marginBottom: 18 }}>
        <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 16 }}>{pretty}</div>
        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e6edf8" }}>
          {/* table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 80px 120px", gap: 8, background: "#f8fafc", padding: "8px 12px", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
            <div>Match</div>
            <div>Time</div>
            <div style={{ textAlign: "center" }}>Status</div>
            <div>Info</div>
          </div>

          {/* rows */}
          {list.map((f, idx) => {
            const isActive = f.status === "active";
            const rowBg = isActive ? "linear-gradient(90deg,#ecfdf5,#ecfeee)" : idx % 2 === 0 ? "white" : "#fbfdff";
            const timeLabel = f.start ? new Date(Number(f.start)).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
            return (
              <div key={f.id || `${dateKey}-${idx}`} style={{ display: "grid", gridTemplateColumns: "1fr 220px 80px 120px", gap: 8, padding: "10px 12px", background: rowBg, alignItems: "center", borderTop: "1px solid #f1f7fb" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#0f172a" }}>{timeLabel}</div>
                <div style={{ textAlign: "center" }}>
                  {isActive ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#065f46", fontWeight: 700 }}><span style={{ width: 8, height: 8, borderRadius: 8, background: "#10b981", boxShadow: "0 0 8px rgba(16,185,129,0.5)" }}></span>LIVE</span> : (f.status === "completed" ? <span style={{ color: "#374151", fontWeight: 600 }}>Done</span> : <span style={{ color: "#6b7280" }}>Upcoming</span>)}
                </div>
                <div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>{f.mode || ""}{f.scoreline ? <span style={{ marginLeft: 8, fontFamily: "monospace" }}>{f.scoreline}</span> : null}</div>
                  {f.winner && <div style={{ fontSize: 13, marginTop: 6 }}><strong>Winner:</strong> {f.winner}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------------- Main render switch ---------------- */
  if (page === "menu") {
    return (
      <div style={{ padding: 28 }}>
        <h1 style={{ margin: 0 }}>RNW Tennis Tournament 2025</h1>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        <div style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap" }}>
          <Tile img={imgStart} title="Rules" subtitle="Match rules & formats" onClick={() => setPage("rules")} />
          <Tile img={imgScore} title="Teams" subtitle="View players by category" onClick={() => setPage("teams")} />
          <Tile img={imgSettings} title="Fixture / Scores" subtitle="Live, upcoming & recent results" onClick={() => setPage("fixtures")} />
        </div>
      </div>
    );
  }

  if (page === "rules") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            ← Back
          </button>
        </div>
        <h2>Match Rules & Formats</h2>
        <div style={{ marginTop: 12, background: "white", padding: 16, borderRadius: 10, border: "1px solid #e6edf8" }}>
          <h3 style={{ marginTop: 0 }}>Qualifiers and Semifinal Matches:</h3>
          <ol>
            <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
            <li><strong>Tiebreak at 3–3</strong> — At 3–3 a tiebreak is played (to 5 points; 4–4 next point wins).</li>
            <li><strong>No-adv scoring</strong> — Next point after deuce decides the game.</li>
          </ol>
          <h3>Final Matches:</h3>
          <ol>
            <li>One full set — Standard set rule of 6 games and tie-break will be followed.</li>
            <li>Limited Deuce Points — Max 3 deuce points; at the 4th deuce point next point decides the game.</li>
          </ol>
        </div>
      </div>
    );
  }

  if (page === "teams") {
    // Build ordered category lists - maintain alphabetical order or use categories present
    const singlesCats = Object.keys(players.singles || {});
    const doublesCats = Object.keys(players.doubles || {});

    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            ← Back
          </button>
        </div>
        <h2>Teams</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Singles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? <div>Loading players…</div> : (singlesCats.length === 0 ? <div style={{ color: "#9ca3af" }}>No singles categories</div> : singlesCats.map((cat, i) => renderCategoryCard(cat, players.singles[cat] || [], i)))}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Doubles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? <div>Loading players…</div> : (doublesCats.length === 0 ? <div style={{ color: "#9ca3af" }}>No doubles categories</div> : doublesCats.map((cat, i) => renderCategoryCard(cat, players.doubles[cat] || [], i)))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === "fixtures") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            ← Back
          </button>
        </div>
        <h2>Fixtures & Scores</h2>

        {loadingFixtures ? (
          <div style={{ marginTop: 12 }}>Loading fixtures…</div>
        ) : fixtures.length === 0 ? (
          <div style={{ marginTop: 12, color: "#9ca3af" }}>No fixtures</div>
        ) : (
          <div style={{ marginTop: 12 }}>
            {fixturesDates.map((dKey) => renderFixturesDay(dKey))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
