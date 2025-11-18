// src/Viewer.jsx
import React, { useEffect, useState, useMemo } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import { ChevronLeft } from "lucide-react";

/**
 * Viewer component
 * - Tiles: Rules / Teams / Fixture-Scores
 * - Rules: simple text
 * - Teams: grouped, colored table with search & export CSV
 * - Fixture/Scores: upcoming / active / completed lists
 *
 * Requires:
 * - apiPlayersGet() -> { singles: { category: [names...] }, doubles: { category: [names...] } }
 * - apiFixturesList() -> fixtures array with { id, mode, sides, start, status, winner, scoreline }
 *
 * If your players API still returns the legacy format ({ singles: [], doubles: [] }),
 * adjust apiPlayersGet usage accordingly before using this file.
 */

const CATEGORY_COLORS = {
  "Women's Singles": "bg-pink-100 border-pink-300 text-pink-700",
  "Kid's Singles": "bg-yellow-50 border-yellow-300 text-yellow-700",
  "Men's (A) Singles": "bg-emerald-50 border-emerald-300 text-emerald-700",
  "Men's (B) Singles": "bg-lime-50 border-lime-300 text-lime-700",

  "Women's Doubles": "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700",
  "Kid's Doubles": "bg-amber-50 border-amber-300 text-amber-700",
  "Men's (A) Doubles": "bg-cyan-50 border-cyan-300 text-cyan-700",
  "Men's (B) Doubles": "bg-sky-50 border-sky-300 text-sky-700",
  "Mixed Doubles": "bg-violet-50 border-violet-300 text-violet-700",
};

// Order requested for display
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

function usePlayers() {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet();
        // Support both new grouped format and old flat arrays
        // If p.singles is an array -> convert to default categories (put everything under Women's Singles as fallback)
        if (Array.isArray(p?.singles)) {
          // put all singles into Women's Singles fallback to preserve data
          const s = { "Women's Singles": p.singles || [] };
          const d = { "Women's Doubles": p.doubles || [] };
          if (alive) setPlayers({ singles: s, doubles: d });
        } else {
          // assume grouped already
          if (alive)
            setPlayers({
              singles: p?.singles || {},
              doubles: p?.doubles || {},
            });
        }
      } catch (e) {
        // fallback to empty grouped lists
        if (alive) setPlayers({ singles: {}, doubles: {} });
        console.error("Failed loading players", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return { players, setPlayers, loading };
}

export default function Viewer({ onBack }) {
  const [view, setView] = useState("landing"); // 'rules' | 'teams' | 'fixtures'
  const { players, loading: playersLoading } = usePlayers();
  const [fixtures, setFixtures] = useState([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (alive) setFixtures(fx || []);
      } catch (e) {
        if (alive) setFixtures([]);
        console.error("Failed loading fixtures", e);
      } finally {
        if (alive) setFixturesLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const completed = useMemo(
    () => fixtures.filter((f) => f.status === "completed"),
    [fixtures]
  );
  const active = useMemo(() => fixtures.filter((f) => f.status === "active"), [
    fixtures,
  ]);
  const upcoming = useMemo(
    () =>
      fixtures
        .filter((f) => !f.status || f.status === "upcoming")
        .sort((a, b) => (a.start || 0) - (b.start || 0)),
    [fixtures]
  );

  // Flatten players for search/filter
  const flattenedPlayers = useMemo(() => {
    const res = [];
    for (const [cat, arr] of Object.entries(players?.singles || {})) {
      (arr || []).forEach((name) => res.push({ category: cat, type: "Singles", name }));
    }
    for (const [cat, arr] of Object.entries(players?.doubles || {})) {
      (arr || []).forEach((name) => res.push({ category: cat, type: "Doubles", name }));
    }
    return res;
  }, [players]);

  const filteredPlayers = useMemo(() => {
    if (!search?.trim()) return flattenedPlayers;
    const q = search.trim().toLowerCase();
    return flattenedPlayers.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [flattenedPlayers, search]);

  // CSV export for Teams
  const exportTeamsCSV = () => {
    // Build rows: Category, Type, Player
    const rows = [];
    for (const cat of [...SINGLES_ORDER, ...DOUBLES_ORDER]) {
      const type = SINGLES_ORDER.includes(cat) ? "Singles" : "Doubles";
      const arr = (type === "Singles" ? players.singles?.[cat] : players.doubles?.[cat]) || [];
      if ((arr || []).length === 0) {
        rows.push([cat, type, ""]);
      } else {
        arr.forEach((n) => rows.push([cat, type, n]));
      }
    }
    const csv = [["Category", "Type", "Name"], ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teams.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Small UI components
  const Tile = ({ title, subtitle, src, action }) => (
    <button onClick={action} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left hover:shadow-lg transition">
      <div className="h-40 relative"><img src={src} className="absolute inset-0 w-full h-full object-cover" alt="" /></div>
      <div className="p-4"><div className="font-semibold">{title}</div><div className="text-sm text-zinc-600">{subtitle}</div></div>
    </button>
  );

  // Teams rendering grouped by categories (with colors)
  const renderTeamsPanel = () => {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100" onClick={() => setView("landing")}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold">Teams</h2>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportTeamsCSV} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Export CSV</button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <input className="flex-1 rounded-xl border px-3 py-2" placeholder="Search players or categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <button onClick={() => setSearch("")} className="px-3 py-2 rounded-xl bg-zinc-100">Clear</button>
            </div>

            <div className="space-y-4">
              {/* Render singles first in the requested order */}
              <div>
                <div className="text-lg font-semibold mb-3">Singles</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {SINGLES_ORDER.map((cat) => {
                    const arr = players.singles?.[cat] || [];
                    const visible = filteredPlayers.some((p) => p.category === cat) || search.trim() === "";
                    return (
                      <div key={cat} className="bg-white rounded-2xl border p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[cat] || "bg-zinc-100 border-zinc-200 text-zinc-700"}`}>
                            {cat}
                          </div>
                          <div className="text-sm text-zinc-500">{arr.length} {arr.length === 1 ? "player" : "players"}</div>
                        </div>
                        <div>
                          {(!arr || arr.length === 0) ? <div className="text-zinc-400">No players</div> : (
                            <ul className="space-y-2">
                              {arr.map((n, i) => <li key={i} className="px-3 py-2 rounded-lg bg-zinc-50">{n}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Doubles */}
              <div>
                <div className="text-lg font-semibold mb-3">Doubles</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {DOUBLES_ORDER.map((cat) => {
                    const arr = players.doubles?.[cat] || [];
                    return (
                      <div key={cat} className="bg-white rounded-2xl border p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[cat] || "bg-zinc-100 border-zinc-200 text-zinc-700"}`}>
                            {cat}
                          </div>
                          <div className="text-sm text-zinc-500">{arr.length} {arr.length === 1 ? "pair" : "pairs"}</div>
                        </div>
                        <div>
                          {(!arr || arr.length === 0) ? <div className="text-zinc-400">No pairs</div> : (
                            <ul className="space-y-2">
                              {arr.map((n, i) => <li key={i} className="px-3 py-2 rounded-lg bg-zinc-50">{n}</li>)}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right column - a compact summary */}
          <div>
            <div className="bg-white rounded-2xl border p-4 shadow-sm mb-4">
              <div className="font-semibold mb-2">Quick Summary</div>
              <div className="text-sm text-zinc-600 mb-2">Total Players (approx): {flattenedPlayers.length}</div>
              <div className="space-y-2">
                {Object.entries(players.singles || {}).map(([cat, arr]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat].split(" ")[0].replace("bg-", "bg-") : "bg-zinc-300"}`} />
                      <div>{cat}</div>
                    </div>
                    <div className="text-zinc-500">{(arr || []).length}</div>
                  </div>
                ))}
                {Object.entries(players.doubles || {}).map(([cat, arr]) => (
                  <div key={cat} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat] ? CATEGORY_COLORS[cat].split(" ")[0].replace("bg-", "bg-") : "bg-zinc-300"}`} />
                      <div>{cat}</div>
                    </div>
                    <div className="text-zinc-500">{(arr || []).length}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-4 shadow-sm">
              <div className="font-semibold mb-2">Actions</div>
              <button onClick={() => exportTeamsCSV()} className="w-full px-4 py-2 rounded-xl bg-emerald-600 text-white">Export CSV</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRulesPanel = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100" onClick={() => setView("landing")}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold">Rules</h2>
      </div>

      <div className="bg-white rounded-2xl shadow border p-6">
        <h3 className="text-lg font-semibold mb-3">Scoring Summary</h3>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-700">
          <li>First to four games wins the set.</li>
          <li>Tiebreak at 3-3. Tiebreak is first to 5 points, 4-4 = next point wins.</li>
          <li>No-adv games: the deciding point at deuce; receiver chooses side to receive from.</li>
          <li>For doubles, receiving team decides their receiving side.</li>
        </ol>
      </div>
    </div>
  );

  const renderFixturesPanel = () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100" onClick={() => setView("landing")}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold">Fixture & Scores</h2>
      </div>

      {fixturesLoading ? <div className="text-zinc-500 p-6">Loading fixtures…</div> : (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border p-4 shadow-sm">
              <div className="font-semibold mb-2">Active Match</div>
              {active.length === 0 ? <div className="text-zinc-500">No active matches</div> : active.map(f => (
                <div key={f.id} className="p-3 rounded-lg border mb-2">
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                  <div className="mt-1 text-sm">Score: {f.scoreline || "—"}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border p-4 shadow-sm">
              <div className="font-semibold mb-2">Upcoming</div>
              {upcoming.length === 0 ? <div className="text-zinc-500">No upcoming fixtures</div> : upcoming.map(f => (
                <div key={f.id} className="p-3 rounded-lg border mb-2">
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode}</span></div>
                  <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-2xl border p-4 shadow-sm">
              <div className="font-semibold mb-2">Completed</div>
              {completed.length === 0 ? <div className="text-zinc-500">No completed fixtures</div> : completed.slice(0, 10).map(f => (
                <div key={f.id} className="p-3 rounded-lg border mb-2">
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="text-sm text-zinc-500">{f.winner ? `Winner: ${f.winner}` : ""}</div>
                  <div className="mt-1 text-sm">{f.scoreline || ""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Landing view (three tiles)
  if (view === "landing") {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-2xl font-bold">Viewer</h1>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Tile title="Rules" subtitle="View match rules & scoring" src={imgStart} action={() => setView("rules")} />
          <Tile title="Teams" subtitle="View players & pairs" src={imgSettings} action={() => setView("teams")} />
          <Tile title="Fixture / Scores" subtitle="Active • Upcoming • Completed" src={imgScore} action={() => setView("fixtures")} />
        </div>
      </div>
    );
  }

  if (view === "rules") return renderRulesPanel();
  if (view === "teams") return renderTeamsPanel();
  if (view === "fixtures") return renderFixturesPanel();

  return null;
}

