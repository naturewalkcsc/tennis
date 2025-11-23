// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import imgLive from "./LiveStreaming.png";
import AttivoLogo from "./attivo_logo.png";

/*
 Viewer.jsx
 - Menu with 3 image tiles (Rules, Teams, Fixture/Scores)
 - Each tile opens a dedicated page with a Back button
 - Teams page understands entries as strings OR { name, pool }
 - Fixtures are grouped by calendar day and shown in an attractive colored layout
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
        boxShadow: "0 6px 18px rgba(8, 35, 64, 0.06)",
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
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 6, fontSize: 13 }}>{subtitle}</div>
      </div>
    </button>
  );
}

function normalizePlayersMap(playersMap) {
  // Input: { category: [string | {name,pool} | {name}] }
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

function dateKey(ts) {
  const d = new Date(Number(ts));
  // Use local date string like 2025-11-20
  return d.toLocaleDateString();
}

function dayLabel(ts) {
  const d = new Date(Number(ts));
  // nicer label e.g., "Thu, 20 Nov 2025"
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function statusBadge(status) {
  if (status === "active")
    return <span style={{ padding: "4px 8px", borderRadius: 999, background: "#dcfce7", color: "#064e3b", fontWeight: 600, fontSize: 12 }}>LIVE</span>;
  if (status === "completed")
    return <span style={{ padding: "4px 8px", borderRadius: 999, background: "#ecfeff", color: "#065f46", fontWeight: 600, fontSize: 12 }}>Completed</span>;
  return <span style={{ padding: "4px 8px", borderRadius: 999, background: "#eef2ff", color: "#1e3a8a", fontWeight: 600, fontSize: 12 }}>Upcoming</span>;
}

export default function Viewer() {
  const [page, setPage] = useState("menu"); // menu | rules | teams | fixtures
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [fixtureFilter, setFixtureFilter] = useState("all");
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
        setError((p) => (p ? p + " • players" : "Failed loading players"));
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();

    (async () => {
      setLoadingFixtures(true);
      try {
        const fx = await fetchJson("/api/fixtures");
        if (!alive) return;
        // Ensure array
        const arr = Array.isArray(fx) ? fx : [];
        // sort by start ascending
        arr.sort((a, b) => (Number(a.start || 0) - Number(b.start || 0)));
        setFixtures(arr);
      } catch (e) {
        console.warn("Failed loading fixtures", e);
        setError((p) => (p ? p + " • fixtures" : "Failed loading fixtures"));
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();

    // refresh every 12 seconds
    const iv = setInterval(async () => {
      try {
        const [pData, fx] = await Promise.all([fetchJson("/api/players"), fetchJson("/api/fixtures")]);
        if (!alive) return;
        setPlayers({ singles: normalizePlayersMap(pData.singles || {}), doubles: normalizePlayersMap(pData.doubles || {}) });
        const arr = Array.isArray(fx) ? fx : [];
        arr.sort((a, b) => (Number(a.start || 0) - Number(b.start || 0)));
        setFixtures(arr);
      } catch {
        // ignore periodic refresh errors
      }
    }, 12000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // Helpers: render category card with colors
  const categoryColors = [
    "#FDE68A", // yellow
    "#BFDBFE", // blue
    "#FBCFE8", // pink
    "#BBF7D0", // green
    "#E9D5FF", // purple
    "#FEF3C7", // soft
  ];
  let catColorIndex = 0;
  function catColorFor(name) {
    // simple deterministic color by hashing category name to index
    let s = 0;
    for (let i = 0; i < name.length; i++) s = (s * 31 + name.charCodeAt(i)) >>> 0;
    return categoryColors[s % categoryColors.length];
  }

  function renderCategory(catName, entries) {
    // entries normalized: [{name,pool}]
    const groups = { A: [], B: [], none: [] };
    for (const e of entries) {
      const pool = (e.pool || "none").toString().toLowerCase();
      if (pool === "a" || pool === "pool a") groups.A.push(e.name);
      else if (pool === "b" || pool === "pool b") groups.B.push(e.name);
      else groups.none.push(e.name);
    }
    const showPools = groups.A.length > 0 || groups.B.length > 0;
    const color = catColorFor(catName);

    return (
      <div key={catName} style={{ background: "white", borderRadius: 12, padding: 12, border: "1px solid rgba(15, 23, 42, 0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 34, borderRadius: 8, background: color }} />
            <div>
              <div style={{ fontWeight: 700 }}>{catName}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</div>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No entries</div>
        ) : showPools ? (
          <div style={{ display: "flex", gap: 12 }}>
            {groups.A.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool A</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.A.map((n, i) => <li key={`a-${i}`} style={{ marginBottom: 6 }}>{n}</li>)}
                </ul>
              </div>
            )}
            {groups.B.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.B.map((n, i) => <li key={`b-${i}`} style={{ marginBottom: 6 }}>{n}</li>)}
                </ul>
              </div>
            )}
            {groups.none.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.none.map((n, i) => <li key={`n-${i}`} style={{ marginBottom: 6 }}>{n}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {entries.map((e, i) => <li key={`p-${i}`} style={{ marginBottom: 6 }}>{e.name}</li>)}
          </ul>
        )}
      </div>
    );
  }

  // Fixtures grouped by date with status filter
  const filteredFixtures = fixtures.filter((f) => {
    if (fixtureFilter === "completed") return f.status === "completed";
    if (fixtureFilter === "upcoming") return f.status !== "completed";
    return true;
  });

  const groupedByDay = filteredFixtures.reduce((acc, f) => {
    const key = f.start ? dateKey(f.start) : "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  // Sort day keys (most recent day first)
  const dayKeys = Object.keys(groupedByDay).sort((a, b) => {
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    return db - da;
  });

  
  // Standings: category-wise & pool-wise from completed fixtures
  const standingsByCategory = (() => {
    const table = {};

    // Helper to ensure player record exists
    const ensureEntry = (category, pool, name) => {
      if (!table[category]) table[category] = {};
      if (!table[category][pool]) table[category][pool] = {};
      if (!table[category][pool][name]) {
        table[category][pool][name] = { name, played: 0, wins: 0, points: 0 };
      }
      return table[category][pool][name];
    };

    // Build quick lookup from players map to know pools
    const playerPools = { singles: {}, doubles: {} };
    ["singles", "doubles"].forEach((mode) => {
      const byCat = players[mode] || {};
      Object.keys(byCat).forEach((cat) => {
        const arr = byCat[cat] || [];
        if (!playerPools[mode][cat]) playerPools[mode][cat] = {};
        arr.forEach((p) => {
          if (!p || !p.name) return;
          playerPools[mode][cat][p.name] = (p.pool || "No Pool");
        });
      });
    });

    // Walk through completed fixtures
    (fixtures || []).forEach((f) => {
      if (f.status !== "completed") return;
      const category = f.category || "Uncategorized";
      const mode = f.mode || "singles";
      const sides = Array.isArray(f.sides) ? f.sides : [];
      const poolsByName = (playerPools[mode] && playerPools[mode][category]) || {};

      if (sides.length < 2) return;

      // Ensure entries for both sides
      sides.forEach((name) => {
        if (!name) return;
        const pool = poolsByName[name] || "No Pool";
        const rec = ensureEntry(category, pool, name);
        rec.played += 1;
      });

      // Apply win
      if (f.winner) {
        const pool = poolsByName[f.winner] || "No Pool";
        const rec = ensureEntry(category, pool, f.winner);
        rec.wins += 1;
        rec.points += 2; // 2 points per win
      }
    });

    // Convert inner maps to sorted arrays
    const result = {};
    Object.keys(table).forEach((cat) => {
      result[cat] = {};
      Object.keys(table[cat]).forEach((pool) => {
        const arr = Object.values(table[cat][pool]);
        arr.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.name.localeCompare(b.name);
        });
        result[cat][pool] = arr;
      });
    });

    return result;
  })();
// MENU
  if (page === "menu") {
    return (
      <div
        style={{
          padding: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, textAlign: "center" }}>RNW Tennis Tournament 2025</h1>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ fontSize: 14, color: "#7D1E7E", fontWeight: 600 }}>Sponsored by</div>
          <img src={AttivoLogo} style={{ width: 260, marginTop: 6, display: "block" }} alt="Attivo Logo" />
        </div>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        <div style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
          <Tile img={imgLive} title="Live Stream" subtitle="YouTube live + live score" onClick={() => setPage("live")} />
          <Tile img={imgStart} title="Rules" subtitle="Match rules and formats" onClick={() => setPage("rules")} />
          <Tile img={imgScore} title="Teams" subtitle="View players by category" onClick={() => setPage("teams")} />
          <Tile img={imgSettings} title="Fixture/Scores" subtitle="All fixtures, upcoming & recent results" onClick={() => setPage("fixtures")} />
        </div>
      </div>
    );
  }
// RULES PAGE
if (page === "rules") {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => setPage("menu")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e6edf8",
            background: "white",
          }}
        >
          Back
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          background: "white",
          padding: 16,
          borderRadius: 10,
          border: "1px solid #e6edf8",
          lineHeight: 1.6,
        }}
      >
        <h3 style={{ fontWeight: 700, marginTop: 12 }}>
          Singles Categories (Champions A, Champions B, Women and Kids)
        </h3>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>
            <b>Champions A:</b> Two pools (A & B). Top two from each pool → semifinals → winners enter finals.
          </li>
          <li>
            <b>Champions B:</b> Single pool, round-robin. Top two qualify for finals.
          </li>
          <li>
            <b>Women Singles:</b> Two pools. First-place from each pool → finals.
          </li>
          <li>
            <b>Kids Singles:</b> Single pool. Round robin → top two play finals.
          </li>
        </ul>

        <h3 style={{ fontWeight: 700, marginTop: 20 }}>
          Doubles Categories (Champions A, Champions B, Women’s, Combination, Kids)
        </h3>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>
            <b>Champions A Doubles:</b> Round robin. Top two → finals.
          </li>
          <li>
            <b>Champions B Doubles:</b> Round robin. Top two → finals.
          </li>
          <li>
            <b>Women’s Doubles:</b> Round robin. Top two → finals.
          </li>
          <li>
            <b>Combination Doubles:</b> Two pools. Top two from each → semifinals.
          </li>
          <li>
            <b>Kids Doubles:</b> Only 4 players → straight finals.
          </li>
        </ul>

        <h3 style={{ fontWeight: 700, marginTop: 24 }}>General Rules</h3>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>Players must be in proper attire with tennis shoes.</li>
          <li>Players must warm up & report 10 minutes before match.</li>
          <li>Absence beyond 10 minutes = walkover (organizing committee decides).</li>
          <li>Tennis rules apply with modified deuce: One Deuce + Golden Point.</li>
          <li>Finals use standard deuce (win by 2 points).</li>
          <li>Fast-Four format for qualifiers & semifinals.</li>
          <li>Finals are 6-game sets.</li>
          <li>Tie-breaker requires difference of TWO points.</li>
          <li>Winning = 1 point, Losing = 0 points.</li>
          <li>Umpire decisions are final; chair umpire can override line calls.</li>
          <li>Walkovers per Organizing Committee discretion.</li>
          <li>Two new sets of Slazenger/Equivalent balls will be used daily.</li>
          <li>Players should bring water bottles, towels, caps.</li>
          <li>After first 2 games, court change; then 1-minute breaks each side after every match.</li>
          <li>If rain or wet courts: matches postponed as per committee discretion.</li>
        </ul>

        <h3 style={{ fontWeight: 700, marginTop: 24 }}>Tie Resolution</h3>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>Overall set points.</li>
          <li>Net games difference (won − conceded).</li>
          <li>Organizing committee has final authority.</li>
        </ul>
      </div>
    </div>
  );
}

  // LIVE STREAM PAGE
  if (page === "live") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setPage("menu")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e6edf8",
              background: "white",
            }}
          >
            ← Back
          </button>
        </div>

        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Live Stream</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: "#6b7280", fontSize: 14 }}>
          YouTube live streaming of the current court. Replace the video ID in Viewer.jsx with your actual stream link.
        </p>

        <div
          style={{
            position: "relative",
            paddingBottom: "56.25%",
            height: 0,
            overflow: "hidden",
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(15,23,42,0.35)",
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          <iframe
            title="YouTube live stream"
            src="https://www.youtube.com/embed/VIDEO_ID?autoplay=1&rel=0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </div>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
          Tip: replace <code>VIDEO_ID</code> in Viewer.jsx with the ID of your tournament&apos;s YouTube live stream.
        </div>
      </div>
    );
  }

  // TEAMS PAGE
  if (page === "teams") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>← Back</button>
        </div>
        <h2 style={{ marginTop: 0 }}>Teams</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Singles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? <div>Loading players…</div> :
                Object.keys(players.singles).length === 0 ? <div style={{ color: "#9ca3af" }}>No singles categories</div> :
                  Object.entries(players.singles).map(([cat, arr]) => renderCategory(cat, arr))
              }
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Doubles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? <div>Loading players…</div> :
                Object.keys(players.doubles).length === 0 ? <div style={{ color: "#9ca3af" }}>No doubles categories</div> :
                  Object.entries(players.doubles).map(([cat, arr]) => renderCategory(cat, arr))
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIXTURES PAGE
  if (page === "fixtures") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>← Back</button>
        </div>
        <h2 style={{ marginTop: 0 }}>Fixtures & Scores</h2>
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
          {["all", "upcoming", "completed"].map((key) => {
            const label = key === "all" ? "All" : key === "upcoming" ? "Upcoming" : "Completed";
            return (
              <button
                key={key}
                onClick={() => setFixtureFilter(key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid " + (fixtureFilter === key ? "#0f172a" : "#e5e7eb"),
                  background: fixtureFilter === key ? "#0f172a" : "#ffffff",
                  color: fixtureFilter === key ? "#f9fafb" : "#4b5563",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>


        <div style={{ marginTop: 12 }}>
          {/* Standings table */}
          {Object.keys(standingsByCategory).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>Standings (2 points per win)</h3>
              {Object.keys(standingsByCategory).sort().map((cat) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{cat}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {Object.keys(standingsByCategory[cat]).sort().map((pool) => (
                      <div key={pool} style={{ minWidth: 220, background: "#f9fafb", borderRadius: 8, padding: 8, border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                          {pool === "No Pool" ? "Overall" : `Pool ${pool}`}
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", padding: "2px 4px" }}>Player / Team</th>
                              <th style={{ textAlign: "right", padding: "2px 4px" }}>P</th>
                              <th style={{ textAlign: "right", padding: "2px 4px" }}>W</th>
                              <th style={{ textAlign: "right", padding: "2px 4px" }}>Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standingsByCategory[cat][pool].map((row) => (
                              <tr key={row.name}>
                                <td style={{ padding: "2px 4px" }}>{row.name}</td>
                                <td style={{ textAlign: "right", padding: "2px 4px" }}>{row.played}</td>
                                <td style={{ textAlign: "right", padding: "2px 4px" }}>{row.wins}</td>
                                <td style={{ textAlign: "right", padding: "2px 4px" }}>{row.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fixtures by day */}
          {loadingFixtures ? (
            <div className="card" style={{ padding: 12 }}>Loading fixtures…</div>
          ) : dayKeys.length === 0 ? (
            <div style={{ color: "#9ca3af" }}>No fixtures</div>
          ) : (
            dayKeys.map((dk) => {
              const dayMatches = groupedByDay[dk].sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
              return (
                <div key={dk} style={{ marginBottom: 18 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
                    background: "#0f172a10", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.04)"
                  }}>
                    <div style={{ padding: "6px 10px", borderRadius: 8, background: "#eef2ff", color: "#1e3a8a", fontWeight: 700 }}>
                      {dayLabel(dayMatches[0].start || dk)}
                    </div>
                    <div style={{ color: "#64748b" }}>{dayMatches.length} match{dayMatches.length>1?"es":""} scheduled</div>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {dayMatches.map((f) => (
                      <div key={f.id} style={{
                        background: "white",
                        borderRadius: 12,
                        padding: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        border: "1px solid rgba(2,6,23,0.04)",
                        boxShadow: f.status === "active" ? "0 8px 30px rgba(16,185,129,0.06)" : "0 6px 18px rgba(12, 18, 36, 0.04)"
                      }}>
                        <div style={{ width: 8, height: 40, borderRadius: 8, background: f.status === "active" ? "#dcfce7" : f.status === "completed" ? "#ecfeff" : "#eef2ff" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ fontWeight: 700 }}>{(f.sides || []).join(" vs ")}</div>
                            <div style={{ marginLeft: 8 }}>{statusBadge(f.status)}</div>
                            {f.status === "active" && <div style={{ marginLeft: 8 }}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: "#16a34a", boxShadow: "0 0 10px #16a34a" }} /></div>}
                          </div>
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ color: "#6b7280", fontSize: 13 }}>{f.start ? new Date(f.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</div>
                            <div style={{ color: "#475569", fontSize: 13 }}>{f.mode ? f.mode.toUpperCase() : ""}</div>
                            {f.status === "completed" && <div style={{ marginLeft: "auto", color: "#065f46", fontWeight: 700 }}>{f.winner ? `Winner: ${f.winner}` : ""} {f.scoreline ? ` • ${f.scoreline}` : ""}</div>}
                          </div>
                        </div>
                        <div style={{ minWidth: 110, textAlign: "right", color: "#475569", fontSize: 13 }}>
                          {f.venue ? <div>{f.venue}</div> : null}
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>{f.status === "upcoming" ? "Scheduled" : (f.status === "active" ? "Live" : "Finished")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return null;
}