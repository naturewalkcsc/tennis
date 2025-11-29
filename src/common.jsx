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
        table[category][pool][name] = { name, played: 0, wins: 0, points: 0, gamesWon: 0, gamesLost: 0 };
      }
      return table[category][pool][name];
    };

    // Helper function to parse scoreline and extract games won/lost
    const parseScoreline = (scoreline, playerName, sides, winner) => {
      if (!scoreline || sides.length !== 2) return { gamesWon: 0, gamesLost: 0 };
      
      // Find player's position (0 or 1)
      const playerIndex = sides.indexOf(playerName);
      if (playerIndex === -1) return { gamesWon: 0, gamesLost: 0 };
      
      // Parse common scoreline formats like "4-1", "3-4", "4-2, 4-3", etc.
      const scores = scoreline.split(',').map(s => s.trim());
      let totalGamesWon = 0;
      let totalGamesLost = 0;
      
      for (const score of scores) {
        const match = score.match(/(\d+)-(\d+)/);
        if (match) {
          const [, score1, score2] = match;
          const games1 = parseInt(score1);
          const games2 = parseInt(score2);
          
          if (playerIndex === 0) {
            totalGamesWon += games1;
            totalGamesLost += games2;
          } else {
            totalGamesWon += games2;
            totalGamesLost += games1;
          }
        }
      }
      
      return { gamesWon: totalGamesWon, gamesLost: totalGamesLost };
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

      // Process each player/team
      sides.forEach((name) => {
        if (!name) return;
        const pool = poolsByName[name] || "No Pool";
        const rec = ensureEntry(category, pool, name);
        rec.played += 1;

        // Calculate games won/lost from scoreline
        const gameStats = parseScoreline(f.scoreline, name, sides, f.winner);
        rec.gamesWon += gameStats.gamesWon;
        rec.gamesLost += gameStats.gamesLost;

        // Apply win points
        if (f.winner === name) {
          rec.wins += 1;
          rec.points += 2; // 2 points per win
        }
      });
    });

    // Helper function to determine qualification status
    const getQualificationStatus = (category, pool, position, totalInPool) => {
      const catLower = category.toLowerCase().replace(/\s+/g, " ").trim();
      
      // Categories with semifinals (top 2 from each pool qualify for semifinals)
      if ((catLower.includes("women") || catLower.includes("woman")) && catLower.includes("single")) {
        return position <= 2 ? "Semifinals" : "";
      }
      if ((catLower.includes("nw a") || catLower.includes("nw team (a)") || catLower.includes("nw team a")) && catLower.includes("single")) {
        return position <= 2 ? "Semifinals" : "";
      }
      if (catLower.includes("champions a") && catLower.includes("single")) {
        return position <= 2 ? "Semifinals" : "";
      }
      if (catLower.includes("combination") && catLower.includes("double")) {
        return position <= 2 ? "Semifinals" : "";
      }
      
      // NW B Singles / Champions B Singles - single pool, top 4 qualify for semifinals
      if ((catLower.includes("nw b") || catLower.includes("nw team (b)") || catLower.includes("nw team b") || catLower.includes("champions b")) && catLower.includes("single")) {
        return position <= 4 ? "Semifinals" : "";
      }
      
      // Kid's Doubles - only 4 players, straight to finals (top 2)
      if ((catLower.includes("kid") || catLower.includes("child")) && catLower.includes("double")) {
        return position <= 2 ? "Finals" : "";
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
          if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
          const aGamesDiff = a.gamesWon - a.gamesLost;
          const bGamesDiff = b.gamesWon - b.gamesLost;
          if (bGamesDiff !== aGamesDiff) return bGamesDiff - aGamesDiff;
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
          {/* Semifinals & Finals Tables - Show First */}
          {(() => {
            const knockoutMatches = fixtures.filter(f => 
              f.matchType && (f.matchType.toLowerCase() === 'semifinal' || f.matchType.toLowerCase() === 'final')
            );
            
            if (knockoutMatches.length === 0) return null;

            const categoriesWithKnockout = [...new Set(knockoutMatches.map(f => f.category || 'Uncategorized'))];

            return (
              <div style={{ marginBottom: 24 }}>
                <style>{`
                  @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                  }
                  @keyframes bounce {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-4px) scale(1.1); }
                  }
                  @keyframes pulse {
                    0%, 100% { box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4); }
                    50% { box-shadow: 0 8px 20px rgba(251, 191, 36, 0.6); }
                  }
                `}</style>
                <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
                  Knockout Rounds
                </h3>
                {categoriesWithKnockout.map(category => {
                  const categoryMatches = knockoutMatches.filter(f => (f.category || 'Uncategorized') === category);
                  const semifinals = categoryMatches.filter(f => f.matchType && f.matchType.toLowerCase() === 'semifinal');
                  const finals = categoryMatches.filter(f => f.matchType && f.matchType.toLowerCase() === 'final');

                  return (
                    <div key={category} style={{ 
                      marginBottom: 20, 
                      background: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: 12, 
                      padding: 16,
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}>
                      <h4 style={{ 
                        fontWeight: 700, 
                        marginBottom: 16, 
                        color: '#1f2937',
                        fontSize: 16,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '2px solid #f3f4f6',
                        paddingBottom: 8
                      }}>{category}</h4>
                      
                      {/* Semifinals Section */}
                      {semifinals.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 12
                          }}>
                            <span style={{ 
                              background: '#dbeafe', 
                              color: '#1e40af', 
                              padding: '4px 8px', 
                              borderRadius: 6, 
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}>
                              Semifinals
                            </span>
                          </div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {semifinals.map(match => (
                              <div key={match.id} style={{
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                                    {(match.sides || []).join(' vs ')}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    {match.start ? new Date(match.start).toLocaleString() : 'TBD'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  {statusBadge(match.status)}
                                  {match.status === 'completed' && match.winner && (
                                    <div style={{ marginTop: 6 }}>
                                      <div style={{ 
                                        color: '#059669', 
                                        fontWeight: 700, 
                                        fontSize: 13,
                                        background: '#dcfce7',
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        border: '1px solid #16a34a'
                                      }}>
                                        🎯 Winner: {match.winner}
                                      </div>
                                      {match.scoreline && (
                                        <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                                          {match.scoreline}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Finals Section - Highlighted */}
                      {finals.length > 0 && (
                        <div>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 12
                          }}>
                            <span style={{ 
                              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                              color: 'white', 
                              padding: '4px 8px', 
                              borderRadius: 6, 
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              boxShadow: '0 2px 4px rgba(251, 191, 36, 0.3)'
                            }}>
                              🏆 Finals
                            </span>
                          </div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {finals.map(match => (
                              <div key={match.id} style={{
                                background: match.status === 'completed' 
                                  ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' 
                                  : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                border: match.status === 'completed' 
                                  ? '3px solid #fbbf24' 
                                  : '2px solid #cbd5e1',
                                borderRadius: 12,
                                padding: 16,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: match.status === 'completed' 
                                  ? '0 8px 25px rgba(251, 191, 36, 0.3)' 
                                  : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                position: 'relative',
                                overflow: 'hidden',
                                animation: match.status === 'completed' && match.winner ? 'pulse 3s ease-in-out infinite' : 'none',
                                transform: match.status === 'completed' ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.3s ease'
                              }}>
                                {match.status === 'completed' && (
                                  <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 3,
                                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)'
                                  }} />
                                )}
                                <div style={{ flex: 1 }}>
                                  <div style={{ 
                                    fontWeight: 700, 
                                    marginBottom: 4, 
                                    fontSize: 16,
                                    color: match.status === 'completed' ? '#92400e' : '#374151'
                                  }}>
                                    {(match.sides || []).join(' vs ')}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                                    {match.start ? new Date(match.start).toLocaleString() : 'TBD'}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  {statusBadge(match.status)}
                                  {match.status === 'completed' && match.winner && (
                                    <div style={{ marginTop: 8 }}>
                                      <div style={{ 
                                        color: '#b45309', 
                                        fontWeight: 800, 
                                        fontSize: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        background: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #fef3c7 100%)',
                                        backgroundSize: '200% 200%',
                                        animation: 'shimmer 2s ease-in-out infinite',
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        border: '2px solid #f59e0b',
                                        boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                                      }}>
                                        <span style={{ 
                                          fontSize: 18,
                                          animation: 'bounce 2s ease-in-out infinite',
                                          display: 'inline-block'
                                        }}>🏆</span>
                                        <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                          CHAMPION: {match.winner.toUpperCase()}
                                        </span>
                                      </div>
                                      {match.scoreline && (
                                        <div style={{ 
                                          color: '#92400e', 
                                          fontSize: 13, 
                                          marginTop: 4,
                                          fontWeight: 600,
                                          textAlign: 'center'
                                        }}>
                                          Final Score: {match.scoreline}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Standings table */}
          {Object.keys(standingsByCategory).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>Standings (2 points per win)</h3>
              {Object.keys(standingsByCategory).sort().map((cat) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{cat}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {Object.keys(standingsByCategory[cat]).sort().map((pool) => (
                      <div key={pool} style={{ minWidth: 320, background: "#f9fafb", borderRadius: 8, padding: 8, border: "1px solid #e5e7eb" }}>
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
                              <th style={{ textAlign: "right", padding: "2px 4px" }}>GW</th>
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
                                <td style={{ textAlign: "right", padding: "2px 4px" }}>{row.gamesWon}</td>
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
                                {f.winner ? `Winner: ${f.winner}` : ""} 
                                {f.statusType === "walkover" ? (
                                  <span style={{ 
                                    marginLeft: 8, 
                                    padding: "2px 6px", 
                                    borderRadius: 12, 
                                    fontSize: 10, 
                                    fontWeight: 600, 
                                    background: "#fef3c7", 
                                    color: "#92400e" 
                                  }}>
                                    WALKOVER
                                  </span>
                                ) : f.scoreline ? ` • ${f.scoreline}` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ minWidth: 110, textAlign: "right", color: "#475569", fontSize: 13 }}>
                          {f.venue ? <div>{f.venue}</div> : null}
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            {f.status === "upcoming" ? "Scheduled" : (f.status === "active" ? "Live" : (f.statusType === "walkover" ? "Walkover" : "Finished"))}
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