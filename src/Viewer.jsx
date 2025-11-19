// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

const CATEGORY_COLORS = [
  { background: "#FFFBEB", color: "#92400E" }, // warm
  { background: "#EEF2FF", color: "#1E3A8A" }, // blue
  { background: "#ECFEFF", color: "#065F46" }, // teal
  { background: "#F5F3FF", color: "#5B21B6" }, // purple
  { background: "#FFF1F2", color: "#BE123C" }, // rose
  { background: "#F7FEE7", color: "#365314" }, // lime
];

function cacheBuster() {
  return ?t=${Date.now()};
}

async function fetchJson(url) {
  const res = await fetch(url + cacheBuster(), { cache: "no-store" });
  if (!res.ok) throw new Error(${url} failed: ${res.status});
  return await res.json();
}

function Menu({ onOpen }) {
  const Tile = ({ title, sub, img, onClick }) => (
    <button
      onClick={onClick}
      style={{
        width: 200,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e6edf8",
        background: "white",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div style={{ height: 110, overflow: "hidden" }}>
        <img src={img} alt={title} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>{sub}</div>
      </div>
    </button>
  );

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>RNW Tennis — Viewer</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Tile title="Rules" sub="View tournament rules" img={imgStart} onClick={() => onOpen("rules")} />
        <Tile title="Teams" sub="View teams & players" img={imgScore} onClick={() => onOpen("teams")} />
        <Tile title="Fixtures / Scores" sub="Live, upcoming & completed" img={imgSettings} onClick={() => onOpen("fixtures")} />
      </div>
    </div>
  );
}

export default function Viewer() {
  const [page, setPage] = useState("menu"); // 'menu' | 'rules' | 'teams' | 'fixtures'
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, fx, ms] = await Promise.all([
          fetchJson("/api/players"),
          fetchJson("/api/fixtures"),
          fetchJson("/api/matches"),
        ]);
        if (!alive) return;
        setPlayers(p || { singles: {}, doubles: {} });
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch (e) {
        // if fetch fails, set empty and log
        console.warn("Viewer fetch error", e);
      } finally {
        if (alive) {
          setLoadingPlayers(false);
          setLoadingFixtures(false);
        }
      }
    })();

    const iv = setInterval(async () => {
      try {
        const [fx, ms] = await Promise.all([fetchJson("/api/fixtures"), fetchJson("/api/matches")]);
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch (e) {
        // ignore
      }
    }, 10000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  /* Helpers to normalize players entries.
     - Accept either string "Alice" (legacy)
       or object { name: "Alice", pool: "A" } (new)
     - Return simple name strings for listing.
  */
  const normalizeEntryToName = (entry) => (typeof entry === "string" ? entry : entry && entry.name ? entry.name : String(entry));

  const groupByPool = (arr) => {
    // arr can be array of strings or objects
    const groups = { A: [], B: [], none: [] };
    (arr || []).forEach((it) => {
      if (!it) return;
      if (typeof it === "string") groups.none.push(it);
      else if (typeof it === "object" && it.hasOwnProperty("pool")) {
        const pool = (it.pool || "").toString().trim().toUpperCase();
        if (pool === "A") groups.A.push(it.name || "");
        else if (pool === "B") groups.B.push(it.name || "");
        else groups.none.push(it.name || "");
      } else if (typeof it === "object" && it.name) {
        groups.none.push(it.name);
      } else {
        groups.none.push(String(it));
      }
    });
    return groups;
  };

  /* Render a category card with optional pool split */
  const renderCategory = (cat, arr, idx) => {
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    // If arr elements are objects with pool -> show pools, else show single list
    const hasObjects = Array.isArray(arr) && arr.some((x) => typeof x === "object" && (x.name || x.pool));
    if (hasObjects) {
      const groups = groupByPool(arr);
      return (
        <div key={cat} style={{ padding: 12, borderRadius: 12, background: color.background, color: color.color, border: "1px solid #e6edf8" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{cat} <span style={{ fontWeight: 600, fontSize: 12, marginLeft: 8, color: "#334155" }}>({(arr || []).length})</span></div>
          {(groups.A.length > 0 || groups.B.length > 0) ? (
            <>
              {groups.A.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>Pool A</div>
                  <ul>
                    {groups.A.map((n, i) => <li key={a-${i}}>{normalizeEntryToName(n)}</li>)}
                  </ul>
                </div>
              )}
              {groups.B.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>Pool B</div>
                  <ul>
                    {groups.B.map((n, i) => <li key={b-${i}}>{normalizeEntryToName(n)}</li>)}
                  </ul>
                </div>
              )}
              {groups.none.length > 0 && (
                <div>
                  <div style={{ fontWeight: 600 }}>No Pool</div>
                  <ul>
                    {groups.none.map((n, i) => <li key={n-${i}}>{normalizeEntryToName(n)}</li>)}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#334155" }}>No pool items</div>
          )}
        </div>
      );
    } else {
      // Simple list (strings)
      return (
        <div key={cat} style={{ padding: 12, borderRadius: 12, background: color.background, color: color.color, border: "1px solid #e6edf8" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{cat} <span style={{ fontWeight: 600, fontSize: 12, marginLeft: 8, color: "#334155" }}>({(arr || []).length})</span></div>
          <ul>
            {(arr || []).map((n, i) => <li key={${cat}-${i}}>{normalizeEntryToName(n)}</li>)}
          </ul>
        </div>
      );
    }
  };

  // --- Pages: menu / rules / teams / fixtures ---
  if (page === "menu") {
    return <Menu onOpen={setPage} />;
  }

  // Rules page
  if (page === "rules") {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Rules</h2>
        <div style={{ background: "white", padding: 16, borderRadius: 10, border: "1px solid #e6edf8" }}>
          <h4 style={{ marginTop: 0 }}>Qualifiers and Semifinal Matches Format</h4>
          <ol>
            <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
            <li><strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played to 5 points (4-4 next point wins).</li>
            <li><strong>No-adv (no AD)</strong> — When game hits deuce (40-40) the next point decides the game. Receiver chooses serve side; in doubles receiving team chooses side.</li>
          </ol>

          <h4 style={{ marginTop: 12 }}>Final Matches format</h4>
          <ol>
            <li>One full set — Standard set rule of 6 games with tiebreak.</li>
            <li>Limited Deuce Points — max 3 deuce points allowed; at the 4th deuce point the next point decides the game.</li>
          </ol>
        </div>
      </div>
    );
  }

  // Teams page
  if (page === "teams") {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Teams</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Singles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? (
                <div>Loading players…</div>
              ) : Object.keys(players.singles || {}).length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No singles categories</div>
              ) : (
                Object.entries(players.singles || {}).map(([cat, arr], i) => renderCategory(cat, arr, i))
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
                Object.entries(players.doubles || {}).map(([cat, arr], i) => renderCategory(cat, arr, i + 3))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fixtures / Scores page
  if (page === "fixtures") {
    const active = (fixtures || []).filter((f) => f.status === "active");
    const upcoming = (fixtures || []).filter((f) => !f.status || f.status === "upcoming");
    const completedFixtures = (fixtures || []).filter((f) => f.status === "completed");
    const historical = (matches || []).map((m) => ({
      id: m.id,
      sides: m.sides,
      finishedAt: m.finishedAt,
      scoreline: m.scoreline,
      winner: m.winner,
      mode: m.mode || "singles",
    }));

    const completed = [...completedFixtures, ...historical].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Fixture / Scores</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Active</div>
            {active.length ? active.map((f) => (
              <div key={String(f.id)} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{f.winner ? Winner: ${f.winner} : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}</div>
                <div style={{ marginTop: 6, color: "#6b7280" }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
              </div>
            )) : <div style={{ color: "#9ca3af" }}>No live match.</div>}
            <div style={{ marginTop: 12, fontWeight: 700 }}>Upcoming</div>
            {upcoming.length ? upcoming.map((f) => (
              <div key={String(f.id)} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{f.mode || ""}</div>
                <div style={{ marginTop: 6, color: "#6b7280" }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
              </div>
            )) : <div style={{ color: "#9ca3af" }}>No upcoming fixtures</div>}
          </div>

          <div style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Completed</div>
            {completed.length ? completed.map((f) => (
              <div key={String(f.id) + String(f.finishedAt || "")} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{f.winner ? Winner: ${f.winner} : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}</div>
                <div style={{ marginTop: 6, color: "#6b7280" }}>{f.finishedAt ? new Date(f.finishedAt).toLocaleString() : ""}</div>
              </div>
            )) : <div style={{ color: "#9ca3af" }}>No completed fixtures</div>}
          </div>
        </div>
      </div>
    );
  }

  // default
  return null;
}
