// src/Viewer.jsx
import React, { useEffect, useState, useMemo } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import { ChevronLeft } from "lucide-react";

/*
  Self-contained Viewer:
  - Uses fetch('/api/players') and fetch('/api/fixtures')
  - Shows a menu (Rules / Teams / Fixtures)
  - Each menu item renders a dedicated page with Back button
  - No external api helper required (removes apiPlayersGet undefined error)
*/

const CATEGORY_COLORS = {
  "Women's Singles": "background:#fff1f2;color:#9f1239",
  "Kid's Singles": "background:#fffbeb;color:#92400e",
  "NW Team (A) Singles": "background:#ecfeff;color:#065f46",
  "NW Team (B) Singles": "background:#f5f3ff;color:#5b21b6",

  "Women's Doubles": "background:#fdf2f8;color:#be185d",
  "Kid's Doubles": "background:#fffbeb;color:#92400e",
  "NW Team (A) Doubles": "background:#ecfeff;color:#0f766e",
  "NW Team (B) Doubles": "background:#eff6ff;color:#1e40af",
  "Mixed Doubles": "background:#f5f3ff;color:#7c3aed",
};

const SINGLES_ORDER = [
  "Women's Singles",
  "Kid's Singles",
  "Men's (A) Singles",
  "Men's (B) Singles",
];

const DOUBLES_ORDER = [
  "Women's Doubles",
  "Kid's Doubles",
  "Men's (A) Doubles",
  "Men's (B) Doubles",
  "Mixed Doubles",
];

async function fetchPlayersFromApi() {
  try {
    const r = await fetch("/api/players");
    if (!r.ok) throw new Error("players fetch failed");
    const j = await r.json();
    return j;
  } catch (e) {
    console.error("fetchPlayersFromApi error", e);
    // return empty grouped structure on failure
    return { singles: {}, doubles: {} };
  }
}

async function fetchFixturesFromApi() {
  try {
    const r = await fetch("/api/fixtures");
    if (!r.ok) throw new Error("fixtures fetch failed");
    const j = await r.json();
    return Array.isArray(j) ? j : (j?.fixtures || []);
  } catch (e) {
    console.error("fetchFixturesFromApi error", e);
    return [];
  }
}

export default function Viewer() {
  const [view, setView] = useState("menu"); // 'menu' | 'rules' | 'teams' | 'fixtures'
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [playersLoading, setPlayersLoading] = useState(true);
  const [fixtures, setFixtures] = useState([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setPlayersLoading(true);
      const p = await fetchPlayersFromApi();
      if (!alive) return;
      // normalize legacy (flat arrays) -> grouped fallback
      if (Array.isArray(p?.singles)) {
        setPlayers({ singles: { "Women's Singles": p.singles || [] }, doubles: { "Women's Doubles": p.doubles || [] } });
      } else {
        setPlayers({ singles: p.singles || {}, doubles: p.doubles || {} });
      }
      setPlayersLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setFixturesLoading(true);
      const f = await fetchFixturesFromApi();
      if (!alive) return;
      setFixtures(f || []);
      setFixturesLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const flattenedPlayers = useMemo(() => {
    const arr = [];
    for (const [cat, list] of Object.entries(players.singles || {})) {
      (list || []).forEach((name) => arr.push({ category: cat, type: "Singles", name }));
    }
    for (const [cat, list] of Object.entries(players.doubles || {})) {
      (list || []).forEach((name) => arr.push({ category: cat, type: "Doubles", name }));
    }
    return arr;
  }, [players]);

  const filteredPlayers = useMemo(() => {
    if (!search?.trim()) return flattenedPlayers;
    const q = search.trim().toLowerCase();
    return flattenedPlayers.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [flattenedPlayers, search]);

  const exportTeamsCSV = () => {
    const rows = [["Category", "Type", "Name"]];
    for (const cat of [...SINGLES_ORDER, ...DOUBLES_ORDER]) {
      const type = SINGLES_ORDER.includes(cat) ? "Singles" : "Doubles";
      const list = (type === "Singles" ? players.singles?.[cat] : players.doubles?.[cat]) || [];
      if (!list.length) rows.push([cat, type, ""]);
      else list.forEach((n) => rows.push([cat, type, n]));
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "teams.csv"; a.click(); URL.revokeObjectURL(url);
  };

  // tiles
  const Tile = ({ title, subtitle, src, onClick }) => (
    <button onClick={onClick} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left" style={{ cursor: "pointer" }}>
      <div className="h-40 relative" style={{ height: 160 }}>
        <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div style={{ color: "#6b7280" }}>{subtitle}</div>
      </div>
    </button>
  );

  const renderLanding = () => (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Viewer</h1>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Tile title="Rules" subtitle="Match formats & rules" src={imgStart} onClick={() => setView("rules")} />
        <Tile title="Teams" subtitle="See players by category" src={imgSettings} onClick={() => setView("teams")} />
        <Tile title="Fixture / Scores" subtitle="Live & upcoming matches" src={imgScore} onClick={() => setView("fixtures")} />
      </div>
    </div>
  );

  const renderRules = () => (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button className="btn" onClick={() => setView("menu")}>Back</button>
        <h2 style={{ fontWeight: 700 }}>Rules</h2>
      </div>
      <div style={{ background: "white", padding: 16, borderRadius: 12 }}>
        <h3 style={{ fontWeight: 600 }}>Qualifiers & Semifinals</h3>
        <ol>
          <li>First to four games wins the set.</li>
          <li>Tiebreak at 3-3 — first to 5 points, 4-4 next point wins.</li>
          <li>No-adv scoring — deciding point at deuce. Receiver chooses side.</li>
        </ol>
        <h3 style={{ fontWeight: 600 }}>Final</h3>
        <ol>
          <li>One full set (6 games) with tie-break.</li>
          <li>Limited deuce points: max 3 deuce points; on 4th deuce next point decides.</li>
        </ol>
      </div>
    </div>
  );

  const renderTeams = () => {
    // orderly display of categories; if a category missing use empty array
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button className="btn" onClick={() => setView("menu")}>Back</button>
          <h2 style={{ fontWeight: 700 }}>Teams</h2>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn" onClick={exportTeamsCSV}>Export CSV</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
          <div>
            <div style={{ marginBottom: 10 }}>
              <input placeholder="Search players or categories..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }} />
            </div>

            <div>
              <h3 style={{ fontWeight: 600 }}>Singles</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {SINGLES_ORDER.map((cat) => {
                  const list = players.singles?.[cat] || [];
                  const visible = !search.trim() || list.some((n) => n.toLowerCase().includes(search.toLowerCase())) || cat.toLowerCase().includes(search.toLowerCase());
                  return (
                    <div key={cat} style={{ background: "white", borderRadius: 12, padding: 12, border: "1px solid #e5e7eb" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ padding: "6px 10px", borderRadius: 999, fontSize: 12, ...(CATEGORY_COLORS[cat] ? {} : {}) }}>{cat}</span>
                        </div>
                        <div style={{ color: "#6b7280" }}>{list.length} {(list.length === 1) ? "player" : "players"}</div>
                      </div>
                      <div>
                        {list.length === 0 ? <div style={{ color: "#9ca3af" }}>No players</div> :
                          <ul style={{ marginLeft: 18 }}>{list.filter(n => !search.trim() || n.toLowerCase().includes(search.toLowerCase())).map((n, i) => <li key={i} style={{ padding: "6px 8px", borderRadius: 8, background: "#f8fafc", marginBottom: 6 }}>{n}</li>)}</ul>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={{ fontWeight: 600 }}>Doubles</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {DOUBLES_ORDER.map((cat) => {
                  const list = players.doubles?.[cat] || [];
                  return (
                    <div key={cat} style={{ background: "white", borderRadius: 12, padding: 12, border: "1px solid #e5e7eb" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600 }}>{cat}</div>
                        <div style={{ color: "#6b7280" }}>{list.length} {(list.length === 1) ? "pair" : "pairs"}</div>
                      </div>
                      <div>
                        {list.length === 0 ? <div style={{ color: "#9ca3af" }}>No pairs</div> :
                          <ul style={{ marginLeft: 18 }}>{list.map((n, i) => <li key={i} style={{ padding: "6px 8px", borderRadius: 8, background: "#f8fafc", marginBottom: 6 }}>{n}</li>)}</ul>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside>
            <div style={{ background: "white", borderRadius: 12, padding: 12, border: "1px solid #e5e7eb" }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Summary</div>
              <div style={{ color: "#6b7280", marginBottom: 8 }}>Total items: {flattenedPlayers.length}</div>
              <div style={{ fontSize: 13 }}>
                {Object.entries(players.singles || {}).map(([cat, list]) => (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{(list || []).length}</div>
                  </div>
                ))}
                {Object.entries(players.doubles || {}).map(([cat, list]) => (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>{cat}</div>
                    <div style={{ color: "#6b7280" }}>{(list || []).length}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  };

  const renderFixtures = () => {
    const active = fixtures.filter((f) => f.status === "active");
    const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming").sort((a, b) => (a.start || 0) - (b.start || 0));
    const completed = fixtures.filter((f) => f.status === "completed").sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button className="btn" onClick={() => setView("menu")}>Back</button>
          <h2 style={{ fontWeight: 700 }}>Fixtures & Scores</h2>
        </div>

        {fixturesLoading ? <div style={{ color: "#6b7280" }}>Loading fixtures…</div> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
            <div>
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontWeight: 600 }}>Active</h4>
                {active.length === 0 ? <div style={{ color: "#9ca3af" }}>No active matches</div> : active.map((f) => (<div key={f.id} style={{ background: "#ecfdf5", padding: 10, borderRadius: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
                  <div style={{ marginTop: 6 }}>Score: {f.scoreline || f.score || "—"}</div>
                </div>))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontWeight: 600 }}>Upcoming</h4>
                {upcoming.length === 0 ? <div style={{ color: "#9ca3af" }}>No upcoming</div> : upcoming.map((f) => (<div key={f.id} style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{new Date(f.start).toLocaleString()}</div>
                </div>))}
              </div>
            </div>

            <div>
              <div style={{ background: "white", padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Completed</div>
                {completed.length === 0 ? <div style={{ color: "#9ca3af" }}>No completed</div> : completed.slice(0, 10).map((f) => (<div key={f.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280" }}>{f.winner ? `Winner: ${f.winner}` : ""}</div>
                  <div style={{ marginTop: 6 }}>{f.scoreline || f.score || ""}</div>
                </div>))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (view === "menu") return renderLanding();
  if (view === "rules") return renderRules();
  if (view === "teams") return renderTeams();
  if (view === "fixtures") return renderFixtures();

  return null;
}

