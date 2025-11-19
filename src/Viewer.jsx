// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/*
 Viewer.jsx - standalone public viewer
 - Menu with three buttons (images)
 - Each button opens a dedicated page with Back button
 - Teams page shows categories with colored cards and pool-aware lists
 - Fixtures & Results show active/upcoming/completed
*/

const CATEGORY_COLORS = [
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#EEF2FF", text: "#1E3A8A" },
  { bg: "#ECFEFF", text: "#065F46" },
  { bg: "#F5F3FF", text: "#5B21B6" },
  { bg: "#FFF1F2", text: "#7F1D1D" },
  { bg: "#F0FDF4", text: "#14532D" },
];

const cacheBuster = () => '?t=${Date.now()}';

async function fetchJson(url) {
  const res = await fetch(url + cacheBuster(), { cache: "no-store" });
  if (!res.ok) throw new Error('${url} failed: ${res.status}');
  return await res.json();
}

function Tile({ image, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 220,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e6edf8",
        background: "white",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ height: 120, overflow: "hidden" }}>
        <img src={image} alt={label} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
      </div>
    </button>
  );
}

function normalizePlayersData(raw) {
  // Accept both legacy arrays and new object format:
  // Legacy: { singles: { "Cat": ["A","B"] }, doubles: { ... } }
  // New: same structure but category arrays can be [{name:'X', pool:'A'},{name:'Y'}]
  const players = { singles: {}, doubles: {} };
  if (!raw) return players;
  const keys = ["singles", "doubles"];
  for (const k of keys) {
    const obj = raw[k] || {};
    for (const [cat, arr] of Object.entries(obj || {})) {
      // If it's an array of simple strings, convert to objects with name and no pool
      if (!Array.isArray(arr)) continue;
      players[k][cat] = arr.map((it) => {
        if (it && typeof it === "object") {
          // assume { name, pool? }
          const name = it.name ?? it.label ?? it.player ?? "";
          return { name, pool: it.pool ?? (it.group ?? null) ?? null };
        }
        return { name: String(it), pool: null };
      });
    }
  }
  return players;
}

function renderCategoryCard(category, items, idx) {
  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
  // group by pool if any item has pool
  const hasPool = items.some((it) => it && it.pool);
  if (!hasPool) {
    // simple list
    return (
      <div key={category} style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, fontWeight: 700 }}>{category}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{items.length}</div>
        </div>
        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
          {items.map((p, i) => (
            <li key={'${category}-${i}'} style={{ marginBottom: 6 }}>
              {p.name}
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    // pool-aware
    const groups = { A: [], B: [], none: [] };
    for (const it of items) {
      const pool = (it.pool || "").toString().toUpperCase();
      if (pool === "A") groups.A.push(it.name);
      else if (pool === "B") groups.B.push(it.name);
      else groups.none.push(it.name);
    }
    return (
      <div key={category} style={{ background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, fontWeight: 700 }}>{category}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>{items.length}</div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: groups.A.length && groups.B.length ? "1fr 1fr" : "1fr", gap: 12 }}>
          {groups.A.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool A</div>
              <ul style={{ paddingLeft: 18 }}>
                {groups.A.map((n, i) => (
                  <li key={'a-${i}'} style={{ marginBottom: 6 }}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {groups.B.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B</div>
              <ul style={{ paddingLeft: 18 }}>
                {groups.B.map((n, i) => (
                  <li key={'b-${i}'} style={{ marginBottom: 6 }}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {groups.none.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool</div>
              <ul style={{ paddingLeft: 18 }}>
                {groups.none.map((n, i) => (
                  <li key={'n-${i}'} style={{ marginBottom: 6 }}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default function Viewer() {
  const [page, setPage] = useState("menu"); // menu | rules | teams | fixtures
  const [playersRaw, setPlayersRaw] = useState(null);
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await fetchJson("/api/players");
        if (!alive) return;
        setPlayersRaw(p);
        setPlayers(normalizePlayersData(p));
      } catch (e) {
        console.warn("Failed loading players", e);
        setPlayersRaw({ singles: {}, doubles: {} });
        setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await fetchJson("/api/fixtures");
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.warn("Failed loading fixtures", e);
        setFixtures([]);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    // refresh periodically
    const iv = setInterval(async () => {
      try {
        const fx = await fetchJson("/api/fixtures");
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch {}
    }, 10000);
    return () => { clearInterval(iv); alive = false; };
  }, []);

  useEffect(() => {
    // historical matches optional
    let alive = true;
    (async () => {
      try {
        const m = await fetchJson("/api/matches");
        if (!alive) return;
        setMatches(Array.isArray(m) ? m : []);
      } catch (e) {
        setMatches([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  // helpers for rendering
  const singlesCats = Object.keys(players.singles || {});
  const doublesCats = Object.keys(players.doubles || {});

  const renderMenu = () => (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>RNW Tennis Tournament</h1>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Tile image={imgStart} label="Rules" onClick={() => setPage("rules")} />
        <Tile image={imgScore} label="Teams" onClick={() => setPage("teams")} />
        <Tile image={imgSettings} label="Fixture / Scores" onClick={() => setPage("fixtures")} />
      </div>
    </div>
  );

  // Rules page (dedicated)
  if (page === "rules") {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Rules</h2>
        <div style={{ marginTop: 12, background: "white", padding: 14, borderRadius: 10, border: "1px solid #e6edf8" }}>
          <h4 style={{ marginBottom: 6 }}>Qualifiers and Semifinal Matches Format</h4>
          <ol>
            <li>First to four games wins — First player/team to reach 4 games wins a set.</li>
            <li>Tiebreak at 3-3 — At 3-3 a tiebreak is played. The tiebreak is won by the first player to reach 5 points. If it reaches 4-4, next point wins.</li>
            <li>No-adv (no AD) scoring — When game hits deuce (40-40) the next point decides the game. Receiver chooses serving side; in doubles receiving team chooses receiving side.</li>
          </ol>

          <h4 style={{ marginTop: 10 }}>Final Matches format</h4>
          <ol>
            <li>One full set - Standard set rule of 6 games and Tie break will be followed.</li>
            <li>Limited Deuce Points: Max 3 deuce points; at 4th deuce point the next point decides the game.</li>
          </ol>
        </div>
      </div>
    );
  }

  // Teams page (dedicated) — colored category cards and pool support
  if (page === "teams") {
    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Teams</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Singles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? (
                <div>Loading players…</div>
              ) : singlesCats.length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No singles categories</div>
              ) : (
                singlesCats.map((cat, idx) => renderCategoryCard(cat, players.singles[cat] || [], idx))
              )}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Doubles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? (
                <div>Loading players…</div>
              ) : doublesCats.length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No doubles categories</div>
              ) : (
                doublesCats.map((cat, idx) => renderCategoryCard(cat, players.doubles[cat] || [], idx))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fixtures/Scores page (dedicated)
  if (page === "fixtures") {
    const active = fixtures.filter((f) => f.status === "active");
    const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
    const completedFixtures = fixtures.filter((f) => f.status === "completed");
    const completed = [
      ...completedFixtures,
      ...matches.map((m) => ({ id: m.id, sides: m.sides, finishedAt: m.finishedAt, scoreline: m.scoreline, winner: m.winner, mode: m.mode || "singles" })),
    ].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

    return (
      <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>
            Back
          </button>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Fixture & Scores</h2>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Active</div>
            {active.length ? active.map((f) => (
              <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{f.winner ? Winner: ${f.winner} : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}</div>
                <div style={{ marginTop: 6, color: "#6b7280" }}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
              </div>
            )) : <div style={{ color: "#9ca3af" }}>No live match.</div>}
          </div>

          <div style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Upcoming</div>
            {upcoming.length ? upcoming.map((f) => (
              <div key={f.id} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontWeight: 600 }}>{(f.sides || []).join(" vs ")}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{new Date(f.start).toLocaleString()}</div>
              </div>
            )) : <div style={{ color: "#9ca3af" }}>No upcoming fixtures</div>}

            <div style={{ fontWeight: 700, marginTop: 12 }}>Completed</div>
            {completed.length ? completed.map((f) => (
              <div key={(f.id || "") + String(f.finishedAt || "")} style={{ padding: 8, borderBottom: "1px solid #eef2f7" }}>
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

  // default menu
  return renderMenu();
}
