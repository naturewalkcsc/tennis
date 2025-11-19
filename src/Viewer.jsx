import React, { useEffect, useState } from "react";
import imgRules from "./StartMatch.jpg";   // keep these files in src/
import imgTeams from "./Score.jpg";
import imgFixtures from "./Settings.jpg";

/*
 Viewer.jsx - Public viewer (standalone)
 - /api/players should return JSON like:
    {
      singles: {
        "Women's Singles": ["Alice","Bob"]             // legacy strings
        // or
        "Women's Singles": [{name:"Alice", pool: "A"}, {name:"Bob", pool: "B"}]
      },
      doubles: {
        "Mixed Doubles": ["A/B", "C/D"]
        // or objects with { name: "A/B", pool: "A" }
      }
    }
 - /api/fixtures should return list of fixtures with fields used below (status, id, sides[], start, winner, scoreline, mode, category)
*/

function MenuCard({ img, title, subtitle, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 320,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #e6edf8",
      background: "white",
      textAlign: "left",
      cursor: "pointer",
      padding: 0
    }}>
      <div style={{ height: 140, width: "100%", overflow: "hidden" }}>
        <img src={img} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display:"block" }} />
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
        {subtitle && <div style={{ marginTop: 6, color: "#6b7280" }}>{subtitle}</div>}
      </div>
    </button>
  );
}

function BackHeader({ label = "Back", onBack, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
      <button onClick={onBack} style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid #e6edf8",
        background: "white",
        cursor: "pointer"
      }}>{label}</button>
      <h2 style={{ margin: 0 }}>{title}</h2>
    </div>
  );
}

function groupByPool(items) {
  // items can be strings (legacy) OR objects { name, pool }
  const result = { A: [], B: [], none: [] };
  for (const it of items || []) {
    if (!it) continue;
    if (typeof it === "string") {
      result.none.push(it);
    } else if (typeof it === "object" && it.name) {
      const p = (it.pool || "").toString().toLowerCase();
      if (p === "a" || p === "pool a" || p === "1" ) result.A.push(it.name);
      else if (p === "b" || p === "pool b" || p === "2") result.B.push(it.name);
      else result.none.push(it.name);
    } else {
      // fallback to stringify
      result.none.push(String(it));
    }
  }
  return result;
}

export default function Viewer() {
  const [page, setPage] = useState("menu"); // "menu" | "rules" | "teams" | "fixtures"
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadPlayers() {
      setLoadingPlayers(true);
      try {
        const res = await fetch("/api/players?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("Failed loading players");
        const data = await res.json();
        if (!alive) return;
        // normalize: ensure singles and doubles keys exist and are objects
        const singles = (data && data.singles && typeof data.singles === "object") ? data.singles : {};
        const doubles = (data && data.doubles && typeof data.doubles === "object") ? data.doubles : {};
        setPlayers({ singles, doubles });
      } catch (e) {
        console.warn("Failed loading players", e);
        if (alive) setError("Failed loading players");
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    }

    async function loadFixtures() {
      setLoadingFixtures(true);
      try {
        const r = await fetch("/api/fixtures?t=" + Date.now(), { cache: "no-store" });
        if (!r.ok) throw new Error("Failed loading fixtures");
        const fx = await r.json();
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.warn("Failed loading fixtures", e);
        if (alive) setError("Failed loading fixtures");
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    }

    loadPlayers();
    loadFixtures();
    return () => { alive = false; };
  }, []);

  // render functions
  const renderMenu = () => (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>RNW Tennis Tournament</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <MenuCard img={imgRules} title="Rules" subtitle="Match rules and formats" onClick={() => setPage("rules")} />
        <MenuCard img={imgTeams} title="Teams" subtitle="View players by category" onClick={() => setPage("teams")} />
        <MenuCard img={imgFixtures} title="Fixture/Scores" subtitle="Live, upcoming & recent results" onClick={() => setPage("fixtures")} />
      </div>
    </div>
  );

  const renderRules = () => (
    <div style={{ padding: 24 }}>
      <BackHeader onBack={() => setPage("menu")} title="Match Rules" />
      <div style={{ background: "white", border: "1px solid #e6edf8", padding: 20, borderRadius: 12 }}>
        <h3>Qualifiers and Semifinal Matches Format</h3>
        <ol>
          <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
          <li><strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played to 5 points. If 4-4, next point wins.</li>
          <li><strong>No-adv scoring</strong> — At deuce the next point decides the game. Receiver chooses serve side; in doubles receiving team chooses.</li>
        </ol>
        <h3>Final Matches format</h3>
        <ol>
          <li><strong>One full set</strong> — Standard set to 6 with tiebreak.</li>
          <li><strong>Limited Deuce Points</strong> — Max 3 deuce points allowed; at 4th deuce the next point decides the game.</li>
        </ol>
      </div>
    </div>
  );

  const renderTeams = () => {
    // For display order you asked earlier, but here we render available categories in players.singles/doubles
    const SINGLES_ORDER = [
      "Women's Singles",
      "Kid's Singles",
      "NW Team (A) Singles",
      "NW Team (B) Singles"
    ];
    const DOUBLES_ORDER = [
      "Women's Doubles",
      "Kid's Doubles",
      "NW Team (A) Doubles",
      "NW Team (B) Doubles",
      "Mixed Doubles"
    ];

    const singlesKeys = Array.from(new Set([...SINGLES_ORDER.filter(k => players.singles && players.singles[k]), ...Object.keys(players.singles || {})]));
    const doublesKeys = Array.from(new Set([...DOUBLES_ORDER.filter(k => players.doubles && players.doubles[k]), ...Object.keys(players.doubles || {})]));

    return (
      <div style={{ padding: 24 }}>
        <BackHeader onBack={() => setPage("menu")} title="Teams" />
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: "white", border: "1px solid #e6edf8", padding: 18, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0 }}>Singles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
              {singlesKeys.length === 0 && <div style={{ color: "#9ca3af" }}>No singles categories</div>}
              {singlesKeys.map(cat => {
                const arr = players.singles && players.singles[cat] ? players.singles[cat] : [];
                // detect if items are objects with pool
                const hasObjects = arr.some(it => it && typeof it === "object" && "name" in it);
                if (!hasObjects) {
                  // legacy: array of strings
                  return (
                    <div key={cat} style={{ background: "#f8fafc", padding: 12, borderRadius: 10 }}>
                      <div style={{ fontWeight: 700 }}>{cat} <span style={{ float: "right", color: "#6b7280" }}>{arr.length}</span></div>
                      {arr.length === 0 ? <div style={{ color: "#9ca3af", marginTop: 8 }}>No players</div> :
                        <ul style={{ marginTop: 8 }}>{arr.map((n,i)=>(<li key={i}>{n}</li>))}</ul>}
                    </div>
                  );
                } else {
                  // grouped by pool
                  const groups = groupByPool(arr);
                  return (
                    <div key={cat} style={{ background: "#f8fafc", padding: 12, borderRadius: 10 }}>
                      <div style={{ fontWeight: 700 }}>{cat} <span style={{ float: "right", color: "#6b7280" }}>{arr.length}</span></div>
                      <div style={{ marginTop: 8 }}>
                        {(groups.A.length > 0 || groups.B.length > 0) ? (
                          <>
                            {groups.A.length > 0 && (<div style={{ marginBottom: 6 }}><div style={{ fontWeight: 600 }}>Pool A</div><ul>{groups.A.map((n, i) => <li key={'a-${i}'}>{n}</li>)}</ul></div>)}
                            {groups.B.length > 0 && (<div style={{ marginBottom: 6 }}><div style={{ fontWeight: 600 }}>Pool B</div><ul>{groups.B.map((n, i) => <li key={'b-${i}'}>{n}</li>)}</ul></div>)}
                            {groups.none.length > 0 && (<div><div style={{ fontWeight: 600 }}>No Pool</div><ul>{groups.none.map((n,i)=>(<li key={'none-${i}'}>{n}</li>))}</ul></div>)}
                          </>
                        ) : (
                          <div style={{ color: "#9ca3af" }}>No players</div>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #e6edf8", padding: 18, borderRadius: 12 }}>
            <h3 style={{ marginTop: 0 }}>Doubles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
              {doublesKeys.length === 0 && <div style={{ color: "#9ca3af" }}>No doubles categories</div>}
              {doublesKeys.map(cat => {
                const arr = players.doubles && players.doubles[cat] ? players.doubles[cat] : [];
                const hasObjects = arr.some(it => it && typeof it === "object" && "name" in it);
                if (!hasObjects) {
                  return (
                    <div key={cat} style={{ background: "#f8fafc", padding: 12, borderRadius: 10 }}>
                      <div style={{ fontWeight: 700 }}>{cat} <span style={{ float: "right", color: "#6b7280" }}>{arr.length}</span></div>
                      {arr.length === 0 ? <div style={{ color: "#9ca3af", marginTop: 8 }}>No pairs</div> :
                        <ul style={{ marginTop: 8 }}>{arr.map((n,i)=>(<li key={i}>{n}</li>))}</ul>}
                    </div>
                  );
                } else {
                  const groups = groupByPool(arr);
                  return (
                    <div key={cat} style={{ background: "#f8fafc", padding: 12, borderRadius: 10 }}>
                      <div style={{ fontWeight: 700 }}>{cat} <span style={{ float: "right", color: "#6b7280" }}>{arr.length}</span></div>
                      <div style={{ marginTop: 8 }}>
                        {(groups.A.length > 0 || groups.B.length > 0) ? (
                          <>
                            {groups.A.length > 0 && (<div style={{ marginBottom: 6 }}><div style={{ fontWeight: 600 }}>Pool A</div><ul>{groups.A.map((n, i) => <li key={'a-${i}'}>{n}</li>)}</ul></div>)}
                            {groups.B.length > 0 && (<div style={{ marginBottom: 6 }}><div style={{ fontWeight: 600 }}>Pool B</div><ul>{groups.B.map((n, i) => <li key={'b-${i}'}>{n}</li>)}</ul></div>)}
                            {groups.none.length > 0 && (<div><div style={{ fontWeight: 600 }}>No Pool</div><ul>{groups.none.map((n,i)=>(<li key={'none-${i}'}>{n}</li>))}</ul></div>)}
                          </>
                        ) : (
                          <div style={{ color: "#9ca3af" }}>No pairs</div>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFixtures = () => {
    const active = fixtures.filter(f => f.status === "active");
    const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming");
    const completed = fixtures.filter(f => f.status === "completed");
    return (
      <div style={{ padding: 24 }}>
        <BackHeader onBack={() => setPage("menu")} title="Fixture / Scores" />
        <div style={{ display: "flex", gap: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ background: "white", border: "1px solid #e6edf8", padding: 12, borderRadius: 10 }}>
              <h3 style={{ marginTop: 0 }}>Active</h3>
              {active.length === 0 ? <div style={{ color: "#9ca3af" }}>No active match</div> : active.map(f => (
                <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
                </div>
              ))}
              <h4 style={{ marginTop: 12 }}>Upcoming</h4>
              {upcoming.length === 0 ? <div style={{ color: "#9ca3af" }}>No upcoming fixtures</div> : upcoming.map(f => (
                <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>{f.start ? new Date(f.start).toLocaleString() : "Invalid Date"}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ background: "white", border: "1px solid #e6edf8", padding: 12, borderRadius: 10 }}>
              <h3 style={{ marginTop: 0 }}>Completed</h3>
              {completed.length === 0 ? <div style={{ color: "#9ca3af" }}>No completed fixtures</div> : completed.map(f => (
                <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>
                    {f.winner ? Winner: ${f.winner} : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#eef2ff,#e6f0ff)" }}>
      {error && (
        <div style={{ padding: 12, background: "#fee2e2", color: "#721c24", textAlign: "center" }}>{error}</div>
      )}
      {page === "menu" && renderMenu()}
      {page === "rules" && renderRules()}
      {page === "teams" && renderTeams()}
      {page === "fixtures" && renderFixtures()}
    </div>
  );
}
