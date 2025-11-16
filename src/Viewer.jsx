// src/Viewer.jsx
import React, { useEffect, useMemo, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import { ChevronLeft } from "lucide-react";

/*
  Viewer.jsx
  - Tiles: Rules / Teams / Fixture-Scores (use images in the src root)
  - When a tile is clicked: open a dedicated page for that tile (Back button returns to main menu)
  - Teams view: pastel color cards, grouped categories in requested order, category counts
  - Fetches players and fixtures from /api/players and /api/fixtures (fallback to localStorage)
*/

const CATEGORY_STYLES = {
  "Women's Singles": { background: "#dcfce7", color: "#065f46" }, // green pastel
  "Kid's Singles": { background: "#e6f6ff", color: "#0b5ed7" }, // blue pastel
  "NW Team (A) Singles": { background: "#fff1e6", color: "#92400e" }, // warm pastel
  "NW Team (B) Singles": { background: "#f3e8ff", color: "#6b21a8" },

  "Women's Doubles": { background: "#fff1e6", color: "#9a3412" },
  "Kid's Doubles": { background: "#f5f3ff", color: "#6b21a8" },
  "NW Team (A) Doubles": { background: "#ecfeff", color: "#064e3b" },
  "NW Team (B) Doubles": { background: "#ecfeff", color: "#055160" },
  "Mixed Doubles": { background: "#dcfce7", color: "#14532d" },
};

// Display order required by you
const SINGLES_ORDER = [
  "Women's Singles",
  "Kid's Singles",
  "NW Team (A) Singles",
  "NW Team (B) Singles",
];
const DOUBLES_ORDER = [
  "Women's Doubles",
  "Kid's Doubles",
  "NW Team (A) Doubles",
  "NW Team (B) Doubles",
  "Mixed Doubles",
];

// helper: load /api/players JSON; fallback to localStorage
async function fetchPlayers() {
  try {
    const res = await fetch("/api/players", { cache: "no-store" });
    if (!res.ok) throw new Error("fetch players failed");
    const json = await res.json();
    // Expecting grouped format { singles: {category: []}, doubles: {category: []} }
    // Support legacy flat arrays: { singles: [], doubles: [] }
    if (Array.isArray(json?.singles)) {
      // convert to grouped fallback (Women's Singles / Women's Doubles)
      return {
        singles: { "Women's Singles": json.singles || [] },
        doubles: { "Women's Doubles": json.doubles || [] },
      };
    }
    return {
      singles: json?.singles || {},
      doubles: json?.doubles || {},
    };
  } catch (e) {
    // fallback to localStorage
    try {
      const raw = localStorage.getItem("tennis:players");
      if (!raw) return { singles: {}, doubles: {} };
      const j = JSON.parse(raw);
      if (Array.isArray(j?.singles)) {
        return {
          singles: { "Women's Singles": j.singles || [] },
          doubles: { "Women's Doubles": j.doubles || [] },
        };
      }
      return { singles: j.singles || {}, doubles: j.doubles || {} };
    } catch {
      return { singles: {}, doubles: {} };
    }
  }
}

async function fetchFixtures() {
  try {
    const res = await fetch("/api/fixtures", { cache: "no-store" });
    if (!res.ok) throw new Error("fetch fixtures failed");
    const json = await res.json();
    return Array.isArray(json) ? json : json?.fixtures || [];
  } catch {
    try {
      const raw = localStorage.getItem("tennis:fixtures");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export default function Viewer() {
  const [view, setView] = useState("landing"); // landing | rules | teams | fixtures
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingPlayers(true);
      const p = await fetchPlayers();
      if (!alive) return;
      setPlayers(p || { singles: {}, doubles: {} });
      setLoadingPlayers(false);
    })();
    return () => (alive = false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingFixtures(true);
      const f = await fetchFixtures();
      if (!alive) return;
      setFixtures(f || []);
      setLoadingFixtures(false);
    })();
    return () => (alive = false);
  }, []);

  // derived lists
  const flattenedPlayers = useMemo(() => {
    const out = [];
    for (const [cat, arr] of Object.entries(players.singles || {})) {
      (arr || []).forEach((name) => out.push({ category: cat, type: "Singles", name }));
    }
    for (const [cat, arr] of Object.entries(players.doubles || {})) {
      (arr || []).forEach((name) => out.push({ category: cat, type: "Doubles", name }));
    }
    return out;
  }, [players]);

  // filter by search
  const filteredPlayers = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return flattenedPlayers;
    return flattenedPlayers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [flattenedPlayers, search]);

  // fixtures partitions
  const active = useMemo(() => fixtures.filter((f) => f.status === "active"), [fixtures]);
  const completed = useMemo(() => fixtures.filter((f) => f.status === "completed"), [fixtures]);
  const upcoming = useMemo(
    () => fixtures.filter((f) => !f.status || f.status === "upcoming").sort((a, b) => (a.start || 0) - (b.start || 0)),
    [fixtures]
  );

  // export simple Teams CSV
  const exportTeamsCSV = () => {
    const rows = [["Category", "Type", "Name"]];
    for (const cat of SINGLES_ORDER) {
      const arr = players.singles?.[cat] || [];
      if (!arr.length) rows.push([cat, "Singles", ""]);
      else arr.forEach((n) => rows.push([cat, "Singles", n]));
    }
    for (const cat of DOUBLES_ORDER) {
      const arr = players.doubles?.[cat] || [];
      if (!arr.length) rows.push([cat, "Doubles", ""]);
      else arr.forEach((n) => rows.push([cat, "Doubles", n]));
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Teams panel rendering (colors + counts)
  const renderTeamsPanel = () => {
    // Only show categories in the given order; if a category doesn't exist we still show it (optionally)
    const singlesCats = SINGLES_ORDER;
    const doublesCats = DOUBLES_ORDER;

    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <button className="btn" onClick={() => setView("landing")}><ChevronLeft className="w-4 h-4" /> Back</button>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Teams</h2>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn" onClick={exportTeamsCSV}>Export CSV</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
          <div>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Singles</div>
              <div style={{ color: "#6b7280" }}>{singlesCats.length} categories</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {singlesCats.map((cat) => {
                const arr = players.singles?.[cat] || [];
                const style = CATEGORY_STYLES[cat] || { background: "#f8fafc", color: "#334155" };
                return (
                  <div key={cat} style={{ background: style.background, borderRadius: 12, padding: 14, minHeight: 120 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, color: style.color }}>{cat}</div>
                      <div style={{ color: "#6b7280" }}>{arr.length} {arr.length === 1 ? "player" : "players"}</div>
                    </div>
                    <div>
                      {arr.length === 0 ? <div style={{ color: "#6b7280" }}>No players</div> : (
                        <ul style={{ marginLeft: 18 }}>
                          {arr.map((n, i) => <li key={i} style={{ marginBottom: 4 }}>{n}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 28, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Doubles</div>
              <div style={{ color: "#6b7280" }}>{doublesCats.length} categories</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {doublesCats.map((cat) => {
                const arr = players.doubles?.[cat] || [];
                const style = CATEGORY_STYLES[cat] || { background: "#f8fafc", color: "#334155" };
                return (
                  <div key={cat} style={{ background: style.background, borderRadius: 12, padding: 14, minHeight: 120 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, color: style.color }}>{cat}</div>
                      <div style={{ color: "#6b7280" }}>{arr.length} {arr.length === 1 ? "pair" : "pairs"}</div>
                    </div>
                    <div>
                      {arr.length === 0 ? <div style={{ color: "#6b7280" }}>No pairs</div> : (
                        <ul style={{ marginLeft: 18 }}>
                          {arr.map((n, i) => <li key={i} style={{ marginBottom: 4 }}>{n}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column summary */}
          <div>
            <div style={{ background: "white", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Summary</div>
              <div style={{ color: "#6b7280", marginBottom: 8 }}>Total (listed): {flattenedPlayers.length}</div>

              <div style={{ display: "grid", gap: 8 }}>
                {SINGLES_ORDER.map((cat) => {
                  const arr = players.singles?.[cat] || [];
                  const style = CATEGORY_STYLES[cat] || { background: "#f8fafc", color: "#334155" };
                  return (
                    <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 12, height: 12, borderRadius: 6, display: "inline-block", background: style.color }} />
                        <div style={{ fontSize: 13 }}>{cat}</div>
                      </div>
                      <div style={{ color: "#6b7280" }}>{arr.length}</div>
                    </div>
                  );
                })}
                {DOUBLES_ORDER.map((cat) => {
                  const arr = players.doubles?.[cat] || [];
                  const style = CATEGORY_STYLES[cat] || { background: "#f8fafc", color: "#334155" };
                  return (
                    <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 12, height: 12, borderRadius: 6, display: "inline-block", background: style.color }} />
                        <div style={{ fontSize: 13 }}>{cat}</div>
                      </div>
                      <div style={{ color: "#6b7280" }}>{arr.length}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Actions</div>
              <button className="btn" style={{ width: "100%" }} onClick={exportTeamsCSV}>Download CSV</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRulesPanel = () => (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button className="btn" onClick={() => setView("landing")}><ChevronLeft className="w-4 h-4" /> Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Rules</h2>
      </div>
      <div style={{ background: "white", borderRadius: 12, padding: 18 }}>
        <h3 style={{ marginBottom: 8 }}>Qualifiers and Semifinal Matches Format</h3>
        <ol style={{ paddingLeft: 18, color: "#374151" }}>
          <li>First to four games wins — First player/team to reach 4 games wins a set.</li>
          <li>Tiebreak at 3-3 — At 3-3 a tiebreak is played (first to 5 points; 4-4 next point wins).</li>
          <li>No-adv scoring — at deuce, next point decides the game (receiver chooses receiving side).</li>
        </ol>

        <h3 style={{ marginTop: 12 }}>Final Matches format</h3>
        <ol style={{ paddingLeft: 18, color: "#374151" }}>
          <li>One full set — standard set to 6 games with tie-break.</li>
          <li>Limited deuce points — maximum 3 deuce points; next point after that decides the game.</li>
        </ol>
      </div>
    </div>
  );

  const renderFixturesPanel = () => (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button className="btn" onClick={() => setView("landing")}><ChevronLeft className="w-4 h-4" /> Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Fixture & Scores</h2>
      </div>

      {loadingFixtures ? <div style={{ padding: 18, color: "#6b7280" }}>Loading fixtures…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div>
            <div style={{ marginBottom: 12, fontWeight: 700 }}>Active</div>
            {active.length === 0 ? <div style={{ color: "#6b7280" }}>No active matches</div> : active.map((f) => (
              <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{f.sides?.[0]} vs {f.sides?.[1]}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
                <div style={{ marginTop: 6 }}>Score: {f.scoreline || "—"}</div>
              </div>
            ))}

            <div style={{ marginTop: 18, fontWeight: 700 }}>Upcoming</div>
            {upcoming.length === 0 ? <div style={{ color: "#6b7280" }}>No upcoming fixtures</div> : upcoming.map((f) => (
              <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{f.sides?.[0]} vs {f.sides?.[1]}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Completed</div>
            {completed.length === 0 ? <div style={{ color: "#6b7280" }}>No completed fixtures</div> : completed.slice(0, 8).map((f) => (
              <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{f.sides?.[0]} vs {f.sides?.[1]}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{f.winner ? `Winner: ${f.winner}` : ""}</div>
                <div style={{ marginTop: 6 }}>{f.scoreline || ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Landing page with image tiles (keeps images on tiles)
  if (view === "landing") {
    return (
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Viewer</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          <Tile title="Rules" subtitle="Match rules & formats" src={imgStart} action={() => setView("rules")} />
          <Tile title="Teams" subtitle="View players by category" src={imgSettings} action={() => setView("teams")} />
          <Tile title="Fixture / Scores" subtitle="Active, Upcoming & Completed" src={imgScore} action={() => setView("fixtures")} />
        </div>
      </div>
    );
  }

  if (view === "rules") return renderRulesPanel();
  if (view === "teams") return renderTeamsPanel();
  if (view === "fixtures") return renderFixturesPanel();

  return null;
}

// small Tile component
function Tile({ title, subtitle, src, action }) {
  return (
    <button onClick={action} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e6e9ef", background: "white", textAlign: "left", display: "block", cursor: "pointer" }}>
      <div style={{ height: 140, position: "relative" }}>
        <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 4 }}>{subtitle}</div>
      </div>
    </button>
  );
}

