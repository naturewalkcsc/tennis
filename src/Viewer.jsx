import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
 Viewer.jsx
 - Menu with 3 image buttons: Rules, Teams, Fixtures
 - Each button opens a dedicated page (Back returns to menu)
 - Teams page supports pool display:
    * Accepts legacy strings or objects { name, pool } for each category entry
    * If any entry has pool 'A' or 'B', show Pool A & Pool B sub-tables (and No Pool list)
*/

const buster = () => ?t=${Date.now()};

async function fetchJson(url) {
  const res = await fetch(url + buster(), { cache: "no-store" });
  if (!res.ok) throw new Error(${url} failed: ${res.status});
  return await res.json();
}

/* Utility to normalize entries into objects with name + optional pool */
function normalizeEntries(arr = []) {
  if (!Array.isArray(arr)) return [];
  return arr.map((it) => {
    if (it == null) return null;
    if (typeof it === "string") return { name: it, pool: null };
    // if object already, try to extract fields (support {name, pool} or {player, pool})
    if (typeof it === "object") {
      const name = it.name ?? it.player ?? it.label ?? String(it);
      const poolRaw = (it.pool ?? it.pool_group ?? it.poolGroup ?? null);
      const pool =
        typeof poolRaw === "string" ? (poolRaw.trim().toUpperCase() === "A" ? "A" : poolRaw.trim().toUpperCase() === "B" ? "B" : null) :
        null;
      return { name, pool };
    }
    return { name: String(it), pool: null };
  }).filter(Boolean);
}

/* Small presentational primitives (inline styles so they don't rely on other css) */
const containerStyle = { maxWidth: 1000, margin: "0 auto", padding: 20 };
const cardStyle = { background: "white", borderRadius: 12, padding: 14, border: "1px solid #e6edf8" };
const tileStyle = { width: 220, borderRadius: 12, overflow: "hidden", cursor: "pointer", border: "1px solid #e6edf8", background: "white", textAlign: "left" };
const tileImgStyle = { width: "100%", height: 120, objectFit: "cover", display: "block" };
const tileBodyStyle = { padding: 10 };

function ViewerMenu({ onOpen }) {
  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Viewer</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={tileStyle} onClick={() => onOpen("rules")}>
          <img src={imgStart} alt="Rules" style={tileImgStyle} />
          <div style={tileBodyStyle}>
            <div style={{ fontWeight: 700 }}>Rules</div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Match formats and rules</div>
          </div>
        </div>

        <div style={tileStyle} onClick={() => onOpen("teams")}>
          <img src={imgScore} alt="Teams" style={tileImgStyle} />
          <div style={tileBodyStyle}>
            <div style={{ fontWeight: 700 }}>Teams</div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Players & pairs by category</div>
          </div>
        </div>

        <div style={tileStyle} onClick={() => onOpen("fixtures")}>
          <img src={imgSettings} alt="Fixtures" style={tileImgStyle} />
          <div style={tileBodyStyle}>
            <div style={{ fontWeight: 700 }}>Fixture / Scores</div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Live, upcoming and completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Viewer() {
  const [page, setPage] = useState("menu");
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState({ players: true, fixtures: true, matches: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      // fetch players
      try {
        const p = await fetchJson("/api/players");
        if (!alive) return;
        // tolerate legacy where players might be [] or { singles:[], doubles:[] } or new shape
        const singles = p?.singles ?? p?.singles_list ?? p ?? {};
        const doubles = p?.doubles ?? p?.doubles_list ?? {};
        setPlayers({ singles, doubles });
      } catch (e) {
        console.warn("Failed loading players", e);
        setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoading(s => ({ ...s, players: false }));
      }

      // fetch fixtures + matches in parallel
      try {
        const [fx, ms] = await Promise.allSettled([fetchJson("/api/fixtures"), fetchJson("/api/matches")]);
        if (!alive) return;
        if (fx.status === "fulfilled") setFixtures(Array.isArray(fx.value) ? fx.value : []);
        else setFixtures([]);
        if (ms.status === "fulfilled") setMatches(Array.isArray(ms.value) ? ms.value : []);
        else setMatches([]);
      } catch (e) {
        console.warn("Failed fixtures/matches", e);
        setFixtures([]);
        setMatches([]);
      } finally {
        if (alive) setLoading(s => ({ ...s, fixtures: false, matches: false }));
      }
    })();

    // auto-refresh every 12s
    const iv = setInterval(async () => {
      try {
        const [fx, ms] = await Promise.all([fetchJson("/api/fixtures"), fetchJson("/api/matches")]);
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch {}
    }, 12000);

    return () => { alive = false; clearInterval(iv); };
  }, []);

  function renderBackHeader(title) {
    return (
      <div style={{ ...containerStyle, display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn" onClick={() => setPage("menu")} style={{ padding: "8px 10px", borderRadius: 10 }}>Back</button>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
    );
  }

  /* ----------------- TEAMS VIEW ----------------- */
  function TeamsView() {
    // players.singles and players.doubles are objects keyed by category -> array
    const singles = players.singles ?? {};
    const doubles = players.doubles ?? {};

    // helper to decide whether a category needs pool split
    const categoryHasPools = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return false;
      // if any entry is object with pool A/B -> treat as pool-based
      return arr.some(item => (typeof item === "object" && (item.pool === "A" || item.pool === "B" || (item.pool && String(item.pool).toUpperCase() === "A") || (item.pool && String(item.pool).toUpperCase() === "B"))));
    };

    const renderCategory = (cat, rawArr) => {
      const arr = normalizeEntries(rawArr);
      const hasPools = arr.some(e => e.pool === "A" || e.pool === "B");
      if (!hasPools) {
        // plain list
        return (
          <div key={cat} style={{ ...cardStyle, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>{cat}</div>
              <div style={{ color: "#6b7280" }}>{arr.length}</div>
            </div>
            <ul style={{ marginTop: 8, marginLeft: 16 }}>
              {arr.map((p, i) => <li key={i}>{p.name}</li>)}
            </ul>
          </div>
        );
      } else {
        // poolified display: pool A / pool B / no-pool
        const poolA = arr.filter(x => x.pool === "A").map(x => x.name);
        const poolB = arr.filter(x => x.pool === "B").map(x => x.name);
        const noPool = arr.filter(x => !x.pool).map(x => x.name);

        return (
          <div key={cat} style={{ ...cardStyle, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{cat}</div>
              <div style={{ color: "#6b7280" }}>{arr.length} total</div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool A <span style={{ color: "#6b7280" }}>({poolA.length})</span></div>
                {poolA.length ? <ul style={{ marginLeft: 16 }}>{poolA.map((n,i)=>(<li key={i}>{n}</li>))}</ul> : <div style={{ color: "#9ca3af" }}>No players</div>}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B <span style={{ color: "#6b7280" }}>({poolB.length})</span></div>
                {poolB.length ? <ul style={{ marginLeft: 16 }}>{poolB.map((n,i)=>(<li key={i}>{n}</li>))}</ul> : <div style={{ color: "#9ca3af" }}>No players</div>}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool <span style={{ color: "#6b7280" }}>({noPool.length})</span></div>
                {noPool.length ? <ul style={{ marginLeft: 16 }}>{noPool.map((n,i)=>(<li key={i}>{n}</li>))}</ul> : <div style={{ color: "#9ca3af" }}>No players</div>}
              </div>
            </div>
          </div>
        );
      }
    };

    const singlesCats = Object.keys(singles || {});
    const doublesCats = Object.keys(doubles || {});

    return (
      <div style={containerStyle}>
        <h3 style={{ marginTop: 0 }}>Teams</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Singles</div>
            {singlesCats.length === 0 ? <div style={{ color: "#9ca3af" }}>No singles categories</div> : singlesCats.map(cat => renderCategory(cat, singles[cat]))}
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 8, marginTop: 12 }}>Doubles</div>
            {doublesCats.length === 0 ? <div style={{ color: "#9ca3af" }}>No doubles categories</div> : doublesCats.map(cat => renderCategory(cat, doubles[cat]))}
          </div>
        </div>
      </div>
    );
  }

  /* ----------------- FIXTURES VIEW ----------------- */
  function FixturesView() {
    const active = fixtures.filter(f => f.status === "active");
    const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming");
    const completed = fixtures.filter(f => f.status === "completed");

    return (
      <div style={containerStyle}>
        <h3 style={{ marginTop: 0 }}>Fixture / Scores</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Active</div>
            {active.length ? active.map(f => (
              <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
              </div>
            )) : <div style={{ color: "#9ca3af" }}>No live match</div>}
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Upcoming</div>
            {upcoming.length ? upcoming.map(f => (
              <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
              </div>
            )) : <div style={{ color: "#9ca3af" }}>No upcoming fixtures</div>}
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Completed</div>
            {completed.length ? completed.map(f => (
              <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{f.winner ? Winner: ${f.winner} : ""} {f.scoreline ? ` • ${f.scoreline}` : ""}</div>
              </div>
            )) : <div style={{ color: "#9ca3af" }}>No completed fixtures</div>}
          </div>
        </div>
      </div>
    );
  }

  /* ----------------- RULES VIEW ----------------- */
  function RulesView() {
    return (
      <div style={containerStyle}>
        <h3 style={{ marginTop: 0 }}>Rules</h3>
        <div style={cardStyle}>
          <h4 style={{ marginTop: 0 }}>Qualifiers and Semifinal Matches Format</h4>
          <ol>
            <li><strong>First to four games wins</strong> — First player/team to reach 4 games wins a set.</li>
            <li><strong>Tiebreak at 3-3</strong> — At 3-3 a tiebreak is played to 5 points; 4-4 is next-point-wins.</li>
            <li><strong>No-adv scoring</strong> — At deuce the next point decides the game.</li>
          </ol>

          <h4>Final Matches format</h4>
          <ol>
            <li>One full set — standard 6-games with tie-break.</li>
            <li>Limited deuce points — at most 3 deuce points; thereafter next point decides the game.</li>
          </ol>
        </div>
      </div>
    );
  }

  /* ---------- MAIN render ---------- */
  if (page === "menu") {
    return <ViewerMenu onOpen={setPage} />;
  }

  // dedicated pages
  if (page === "rules") return (<div>{renderBackHeader("Rules")}<RulesView/></div>);
  if (page === "teams") return (<div>{renderBackHeader("Teams")}<TeamsView/></div>);
  if (page === "fixtures") return (<div>{renderBackHeader("Fixture / Scores")}<FixturesView/></div>);

  return null;
}
