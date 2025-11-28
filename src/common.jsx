import React, { useEffect, useState } from "react";

// Common utility functions
export function normalizePlayersMap(playersMap) {
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

export function dateKey(ts) {
  const d = new Date(Number(ts));
  return d.toLocaleDateString();
}

export function dayLabel(ts) {
  const d = new Date(Number(ts));
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function statusBadge(status) {
  if (status === "active")
    return <span style={{ padding: "4px 8px", borderRadius: 999, background: "#dcfce7", color: "#064e3b", fontWeight: 600, fontSize: 12 }}>LIVE</span>;
  if (status === "completed")
    return <span style={{ padding: "4px 8px", borderRadius: 999, background: "#ecfeff", color: "#065f46", fontWeight: 600, fontSize: 12 }}>Completed</span>;
  return <span style={{ padding: "4px 8px", borderRadius: 999, background: "#eef2ff", color: "#1e3a8a", fontWeight: 600, fontSize: 12 }}>Upcoming</span>;
}

// Common Fixtures & Results component
export function FixturesAndResults({ 
  fixtures = [], 
  players = { singles: {}, doubles: {} }, 
  loading = false, 
  onBack = null,
  title = "Fixtures & Scores" 
}) {
  const [fixtureFilter, setFixtureFilter] = useState("all");

  // Filter fixtures based on selected filter
  const filteredFixtures = fixtures.filter((f) => {
    if (fixtureFilter === "completed") return f.status === "completed";
    if (fixtureFilter === "upcoming") return f.status !== "completed";
    return true;
  });

  // Group fixtures by date
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

  // Standings calculation with qualification logic
  const standingsByCategory = (() => {
    const table = {};

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

    // Helper function to determine qualification status
    const getQualificationStatus = (category, pool, position, totalInPool) => {
      const catLower = category.toLowerCase().replace(/\s+/g, " ").trim();
      
      // Categories with semifinals (top 2 from each pool qualify for semifinals)
      if ((catLower.includes("women") || catLower.includes("woman")) && catLower.includes("single")) {
        return position <= 2 ? "Semifinals" : "";
      }
      if (catLower.includes("nw a") && catLower.includes("single")) {
        return position <= 2 ? "Semifinals" : "";
      }
      if (catLower.includes("champions a") && catLower.includes("single")) {
        return position <= 2 ? "Semifinals" : "";
      }
      if (catLower.includes("combination") && catLower.includes("double")) {
        return position <= 2 ? "Semifinals" : "";
      }
      
      // NW B Singles / Champions B Singles - single pool, top 4 qualify for semifinals
      if ((catLower.includes("nw b") || catLower.includes("champions b")) && catLower.includes("single")) {
        return position <= 4 ? "Semifinals" : "";
      }
      
      // All other categories - top 2 qualify for finals directly
      return position <= 2 ? "Finals" : "";
    };

    // Convert inner maps to sorted arrays and add qualification status
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
        
        // Add qualification status to each player
        arr.forEach((player, index) => {
          player.qualification = getQualificationStatus(cat, pool, index + 1, arr.length);
        });
        
        result[cat][pool] = arr;
      });
    });

    return result;
  })();

  return (
    <div style={{ padding: 24 }}>
      {onBack && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={onBack}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e6edf8",
              background: "white",
              cursor: "pointer"
            }}
          >
            ← Back
          </button>
        </div>
      )}
      
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      
      {/* Filter buttons */}
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

      {loading ? (
        <div style={{ marginTop: 12, padding: 12, background: "white", borderRadius: 8, textAlign: "center", color: "#9ca3af" }}>
          Loading fixtures…
        </div>
      ) : (
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
                      <div key={pool} style={{ minWidth: 280, background: "#f9fafb", borderRadius: 8, padding: 8, border: "1px solid #e5e7eb" }}>
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
                              <th style={{ textAlign: "center", padding: "2px 4px" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standingsByCategory[cat][pool].map((row) => (
                              <tr key={row.name}>
                                <td style={{ padding: "2px 4px" }}>{row.name}</td>
                                <td style={{ textAlign: "right", padding: "2px 4px" }}>{row.played}</td>
                                <td style={{ textAlign: "right", padding: "2px 4px" }}>{row.wins}</td>
                                <td style={{ textAlign: "right", padding: "2px 4px" }}>{row.points}</td>
                                <td style={{ textAlign: "center", padding: "2px 4px" }}>
                                  {row.qualification && (
                                    <span style={{
                                      padding: "2px 6px",
                                      borderRadius: 12,
                                      fontSize: 10,
                                      fontWeight: 600,
                                      background: row.qualification === "Finals" ? "#fef3c7" : "#ecfeff",
                                      color: row.qualification === "Finals" ? "#92400e" : "#0f766e"
                                    }}>
                                      {row.qualification}
                                    </span>
                                  )}
                                </td>
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
          {dayKeys.length === 0 ? (
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
                    <div style={{ color: "#64748b" }}>{dayMatches.length} match{dayMatches.length > 1 ? "es" : ""} scheduled</div>
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
                            {f.status === "active" && (
                              <div style={{ marginLeft: 8 }}>
                                <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: "#16a34a", boxShadow: "0 0 10px #16a34a" }} />
                              </div>
                            )}
                          </div>
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ color: "#6b7280", fontSize: 13 }}>
                              {f.start ? new Date(f.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </div>
                            <div style={{ color: "#475569", fontSize: 13 }}>
                              {f.mode ? f.mode.toUpperCase() : ""}
                            </div>
                            {f.status === "completed" && (
                              <div style={{ marginLeft: "auto", color: "#065f46", fontWeight: 700 }}>
                                {f.winner ? `Winner: ${f.winner}` : ""} {f.scoreline ? ` • ${f.scoreline}` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ minWidth: 110, textAlign: "right", color: "#475569", fontSize: 13 }}>
                          {f.venue ? <div>{f.venue}</div> : null}
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            {f.status === "upcoming" ? "Scheduled" : (f.status === "active" ? "Live" : "Finished")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}