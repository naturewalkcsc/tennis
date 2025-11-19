// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
  Viewer.jsx - standalone public viewer.
  - Shows 3 image buttons (Rules, Teams, Fixtures)
  - Each button opens a dedicated page (with Back)
  - Reads /api/players and /api/fixtures (same DB as admin)
  - Handles player entries that are either strings or objects { name, pool }
  - Displays pool A / pool B / no-pool lists when present
*/

const buster = () => "?t=" + Date.now();

async function fetchJson(url) {
  const res = await fetch(url + buster(), { cache: "no-store" });
  if (!res.ok) throw new Error('${url} failed: ${res.status}');
  return await res.json();
}

function Tile({ onClick, img, title, subtitle }) {
  return (
    <button onClick={onClick} className="tile" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e6edf8", background: "#fff", textAlign: "left", cursor: "pointer" }}>
      <div style={{ height: 120, position: "relative" }}>
        <img src={img} alt={title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>{subtitle}</div>
      </div>
    </button>
  );
}

/* Helpers for player items */
function normalizePlayerEntry(item) {
  // Accept either "Name" or { name: "Name", pool: "A"|"B" }
  if (!item && item !== 0) return null;
  if (typeof item === "string") return { name: item, pool: null };
  if (typeof item === "object" && item.name) return { name: item.name, pool: item.pool ?? null };
  // fallback if some legacy structure
  if (typeof item === "object") {
    const keys = Object.keys(item);
    if (keys.includes("name")) return { name: item.name, pool: item.pool ?? null };
    // if it's plain string-ish object, stringify
    return { name: JSON.stringify(item), pool: null };
  }
  return { name: String(item), pool: null };
}

function CategoryCard({ title, items }) {
  // items array may contain strings or objects
  const normalized = (items || []).map(normalizePlayerEntry).filter(Boolean);

  const poolA = normalized.filter((p) => p.pool === "A");
  const poolB = normalized.filter((p) => p.pool === "B");
  const noPool = normalized.filter((p) => !p.pool);

  // pick a mild color per category using hash (deterministic)
  const colorSeed = Math.abs(title.split("").reduce((s, c) => s * 31 + c.charCodeAt(0), 7));
  const bgColors = ["#fff7ed", "#eef2ff", "#ecfeff", "#f5f3ff", "#fff1f2", "#f7fee7"];
  const textColors = ["#9a3412", "#1e3a8a", "#065f46", "#5b21b6", "#be123c", "#365314"];
  const idx = colorSeed % bgColors.length;
  const headerStyle = { background: bgColors[idx], color: textColors[idx], padding: "8px 10px", borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" };

  return (
    <div className="card" style={{ padding: 12, borderRadius: 12, border: "1px solid #e6edf8", background: "#fff" }}>
      <div style={headerStyle}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>{normalized.length}</div>
      </div>

      {/* If there are pools, show them split */}
      {poolA.length || poolB.length ? (
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Pool A</div>
            {poolA.length ? <ul style={{ marginLeft: 18 }}>{poolA.map((p, i) => <li key={i}>{p.name}</li>)}</ul> : <div style={{ color: "#9ca3af" }}>No players</div>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Pool B</div>
            {poolB.length ? <ul style={{ marginLeft: 18 }}>{poolB.map((p, i) => <li key={i}>{p.name}</li>)}</ul> : <div style={{ color: "#9ca3af" }}>No players</div>}
          </div>
          {noPool.length ? (
            <div style={{ flexBasis: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Other</div>
              <ul style={{ marginLeft: 18 }}>{noPool.map((p, i) => <li key={i}>{p.name}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          {noPool.length ? <ul style={{ marginLeft: 18 }}>{noPool.map((p, i) => <li key={i}>{p.name}</li>)}</ul> : <div style={{ color: "#9ca3af" }}>No players</div>}
        </div>
      )}
    </div>
  );
}

export default function Viewer() {
  const [view, setView] = useState("menu"); // 'menu' | 'rules' | 'teams' | 'fixtures'
  const [players, setPlayers] = useState({ singles: {}, doubles: {} }); // expects { singles: { cat: [...] }, doubles: { cat: [...] } }
  const [fixtures, setFixtures] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.debug("Viewer mounted");
    let alive = true;

    (async () => {
      try {
        const [p, fx] = await Promise.all([fetchJson("/api/players"), fetchJson("/api/fixtures")]);
        if (!alive) return;
        // be forgiving about format:
        // if players come as array legacy -> convert to categories under "Uncategorized"
        const normalizedPlayers = (() => {
          if (!p) return { singles: {}, doubles: {} };
          if (Array.isArray(p.singles) || Array.isArray(p.doubles)) {
            // legacy arrays: put under 'Uncategorized'
            return { singles: { "Uncategorized": p.singles || [] }, doubles: { "Uncategorized": p.doubles || [] } };
          }
          // assume object-of-categories
          return { singles: p.singles || {}, doubles: p.doubles || {} };
        })();
        setPlayers(normalizedPlayers);
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.warn("Viewer load failed", e);
        setError("Failed loading data");
      } finally {
        if (alive) {
          setLoadingPlayers(false);
          setLoadingFixtures(false);
        }
      }
    })();

    const iv = setInterval(async () => {
      try {
        const fx = await fetchJson("/api/fixtures");
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch {}
    }, 10000);

    return () => { alive = false; clearInterval(iv); };
  }, []);

  // small UI helpers
  const Menu = (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 18 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>RNW Tennis — Viewer</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Tile img={imgStart} title="Rules" subtitle="Match formats & rules" onClick={() => { console.debug("Open rules"); setView("rules"); }} />
        <Tile img={imgScore} title="Teams" subtitle="Players & team lists" onClick={() => { console.debug("Open teams"); setView("teams"); }} />
        <Tile img={imgSettings} title="Fixture / Scores" subtitle="Live, upcoming, completed" onClick={() => { console.debug("Open fixtures"); setView("fixtures"); }} />
      </div>
    </div>
  );

  if (view === "menu") return (
    <div className="app-bg">
      <div style={{ padding: 18 }}>
        {Menu}
        <div style={{ maxWidth: 980, margin: "18px auto", color: "#9ca3af", fontSize: 13 }}>
          Tip: this viewer is public — /viewer.
        </div>
      </div>
    </div>
  );

  // Page layout shared header + back
  const PageShell = ({ title, children }) => (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button onClick={() => setView("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "#fff" }}>Back</button>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );

  if (view === "rules") {
    return (
      <div className="app-bg">
        <PageShell title="Rules">
          <div className="card" style={{ padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Qualifiers and Semifinal Matches Format</h3>
            <ol>
              <li><strong>First to four games wins</strong> — first to 4 games wins the set.</li>
              <li><strong>Tiebreak at 3-3</strong> — tiebreak to 5 points; if 4-4 then next point wins.</li>
              <li><strong>No-adv</strong> — at deuce the next point decides the game.</li>
            </ol>
            <h3>Final Matches Format</h3>
            <ol>
              <li>One full set (first to 6 games, tie-break rules apply).</li>
              <li>Limited deuce points: max 3 deuce points then next decides.</li>
            </ol>
          </div>
        </PageShell>
      </div>
    );
  }

  if (view === "teams") {
    return (
      <div className="app-bg" style={{ paddingTop: 18 }}>
        <PageShell title="Teams">
          {loadingPlayers ? (
            <div className="card" style={{ padding: 12 }}>Loading players…</div>
          ) : error ? (
            <div className="card" style={{ padding: 12, color: "#b91c1c" }}>{error}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Singles categories */}
              <div>
                <h4 style={{ marginBottom: 8 }}>Singles</h4>
                <div style={{ display: "grid", gap: 12 }}>
                  {Object.keys(players.singles || {}).length === 0 && <div style={{ color: "#9ca3af" }}>No singles categories</div>}
                  {Object.entries(players.singles || {}).map(([cat, arr]) => <CategoryCard key={cat} title={cat} items={arr} />)}
                </div>
              </div>

              {/* Doubles categories */}
              <div>
                <h4 style={{ marginBottom: 8 }}>Doubles</h4>
                <div style={{ display: "grid", gap: 12 }}>
                  {Object.keys(players.doubles || {}).length === 0 && <div style={{ color: "#9ca3af" }}>No doubles categories</div>}
                  {Object.entries(players.doubles || {}).map(([cat, arr]) => <CategoryCard key={cat} title={cat} items={arr} />)}
                </div>
              </div>
            </div>
          )}
        </PageShell>
      </div>
    );
  }

  if (view === "fixtures") {
    const active = (fixtures || []).filter(f => f.status === "active");
    const upcoming = (fixtures || []).filter(f => !f.status || f.status === "upcoming");
    const completed = (fixtures || []).filter(f => f.status === "completed");

    return (
      <div className="app-bg" style={{ paddingTop: 18 }}>
        <PageShell title="Fixture / Scores">
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Active</div>
              {active.length ? active.map(f => (
                <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>{f.winner ? Winner: ${f.winner} : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
                </div>
              )) : <div style={{ color: "#9ca3af" }}>No live match</div>}
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Upcoming</div>
              {upcoming.length ? upcoming.map(f => (
                <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")} <span style={{ marginLeft: 8, fontSize: 12, color: "#6b7280", background: "#f8fafc", padding: "2px 6px", borderRadius: 6 }}>{f.mode}</span></div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
                </div>
              )) : <div style={{ color: "#9ca3af" }}>No upcoming fixtures</div>}
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Completed</div>
              {completed.length ? completed.map(f => (
                <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                  <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>{f.winner ? Winner: ${f.winner} : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}</div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>{f.finishedAt ? new Date(f.finishedAt).toLocaleString() : ""}</div>
                </div>
              )) : <div style={{ color: "#9ca3af" }}>No completed fixtures</div>}
            </div>
          </div>
        </PageShell>
      </div>
    );
  }

  return null;
}
