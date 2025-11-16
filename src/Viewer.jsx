// src/Viewer.jsx
import React, { useEffect, useState, useMemo } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import { ChevronLeft } from "lucide-react";

/*
  This Viewer uses the server endpoints directly:
    - GET /api/players    -> returns { singles: {...}, doubles: {...} }  OR legacy { singles: [], doubles: [] }
    - GET /api/fixtures   -> returns [ { id, mode, sides, start, status, scoreline, winner, ... } ]

  It renders a landing view with three tiles (Rules, Teams, Fixture/Scores).
  Clicking any tile opens a dedicated page for that content (Back button returns to the landing).
  It includes console.log('Viewer mounted') so you can verify the component loads.
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

function safeJson(res) {
  return res.text().then((t) => {
    try { return JSON.parse(t); } catch { return t; }
  });
}

export default function Viewer() {
  const [view, setView] = useState("landing"); // 'landing' | 'rules' | 'teams' | 'fixtures'
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [playersLoading, setPlayersLoading] = useState(true);
  const [fixtures, setFixtures] = useState([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    console.log("Viewer mounted");
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setPlayersLoading(true);
      try {
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error("players fetch failed: " + res.status);
        const p = await safeJson(res);

        // normalize: if legacy arrays -> put into sensible default buckets
        if (Array.isArray(p?.singles)) {
          const s = { "Women's Singles": p.singles || [] };
          const d = { "Women's Doubles": p.doubles || [] };
          if (alive) setPlayers({ singles: s, doubles: d });
        } else {
          if (alive) setPlayers({ singles: p.singles || {}, doubles: p.doubles || {} });
        }
      } catch (e) {
        console.error("Failed loading players", e);
        if (alive) setPlayers({ singles: {}, doubles: {} });
      } finally {
        if (alive) setPlayersLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setFixturesLoading(true);
      try {
        const res = await fetch("/api/fixtures");
        if (!res.ok) throw new Error("fixtures fetch failed: " + res.status);
        const fx = await safeJson(res);
        if (alive) setFixtures(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.error("Failed loading fixtures", e);
        if (alive) setFixtures([]);
      } finally {
        if (alive) setFixturesLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  // helpers
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

  const exportTeamsCSV = () => {
    const rows = [];
    for (const cat of [...SINGLES_ORDER, ...DOUBLES_ORDER]) {
      const isSingles = SINGLES_ORDER.includes(cat);
      const arr = isSingles ? players.singles?.[cat] || [] : players.doubles?.[cat] || [];
      if (arr.length === 0) rows.push([cat, isSingles ? "Singles" : "Doubles", ""]);
      else arr.forEach((n) => rows.push([cat, isSingles ? "Singles" : "Doubles", n]));
    }
    const csv = [["Category", "Type", "Name"], ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "teams.csv"; a.click(); URL.revokeObjectURL(url);
  };

  // tiles
  const Tile = ({ title, subtitle, src, onClick }) => (
    <button onClick={onClick} className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left hover:shadow-lg transition">
      <div className="h-40 relative"><img src={src} className="absolute inset-0 w-full h-full object-cover" alt="" /></div>
      <div className="p-4"><div className="font-semibold">{title}</div><div className="text-sm text-zinc-600">{subtitle}</div></div>
    </button>
  );

  // Panels (each is full-page with back button)
  const RulesPanel = () => (
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
          <li>Tiebreak at 3-3. Tiebreak is first to 5 points; if 4-4 then next point wins.</li>
          <li>No-adv games: the deciding point at deuce; receiver chooses side to receive from. In doubles, the receiving team decides.</li>
        </ol>
      </div>
    </div>
  );

  const TeamsPanel = () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100" onClick={() => setView("landing")}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-xl font-bold">Teams</h2>
        <div className="ml-auto">
          <button onClick={exportTeamsCSV} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Export CSV</button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <input className="flex-1 rounded-xl border px-3 py-2" placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button onClick={() => setSearch("")} className="px-3 py-2 rounded-xl bg-zinc-100">Clear</button>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-lg font-semibold mb-3">Singles</div>
              <div className="grid md:grid-cols-2 gap-4">
                {SINGLES_ORDER.map((cat) => {
                  const arr = players.singles?.[cat] || [];
                  return (
                    <div key={cat} className="bg-white rounded-2xl border p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[cat] || "bg-zinc-100 border-zinc-200 text-zinc-700"}`}>{cat}</div>
                        <div className="text-sm text-zinc-500">{arr.length} {arr.length === 1 ? "player" : "players"}</div>
                      </div>
                      <div>{arr.length === 0 ? <div className="text-zinc-400">No players</div> : <ul className="space-y-2">{arr.map((n, i) => <li key={i} className="px-3 py-2 rounded-lg bg-zinc-50">{n}</li>)}</ul>}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-lg font-semibold mb-3">Doubles</div>
              <div className="grid md:grid-cols-2 gap-4">
                {DOUBLES_ORDER.map((cat) => {
                  const arr = players.doubles?.[cat] || [];
                  return (
                    <div key={cat} className="bg-white rounded-2xl border p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[cat] || "bg-zinc-100 border-zinc-200 text-zinc-700"}`}>{cat}</div>
                        <div className="text-sm text-zinc-500">{arr.length} {arr.length === 1 ? "pair" : "pairs"}</div>
                      </div>
                      <div>{arr.length === 0 ? <div className="text-zinc-400">No pairs</div> : <ul className="space-y-2">{arr.map((n, i) => <li key={i} className="px-3 py-2 rounded-lg bg-zinc-50">{n}</li>)}</ul>}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-2xl border p-4 shadow-sm mb-4">
            <div className="font-semibold mb-2">Quick Summary</div>
            <div className="text-sm text-zinc-600 mb-2">Total Players: {flattenedPlayers.length}</div>
            <div className="space-y-2">
              {[...Object.entries(players.singles || {}), ...Object.entries(players.doubles || {})].map(([cat, arr]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div style={{width:10,height:10,borderRadius:8,background:'#ddd'}}></div><div>{cat}</div></div>
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

  const FixturesPanel = () => {
    const completed = fixtures.filter((f) => f.status === "completed");
    const active = fixtures.filter((f) => f.status === "active");
    const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming").sort((a, b) => (a.start || 0) - (b.start || 0));

    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100" onClick={() => setView("landing")}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold">Fixtures & Scores</h2>
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
  };

  // Landing view with three tiles
  if (view === "landing") {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8"><h1 className="text-2xl font-bold">Viewer</h1></div>
        <div className="grid md:grid-cols-3 gap-6">
          <Tile title="Rules" subtitle="View match rules & scoring" src={imgStart} onClick={() => setView("rules")} />
          <Tile title="Teams" subtitle="View players & pairs" src={imgSettings} onClick={() => setView("teams")} />
          <Tile title="Fixture / Scores" subtitle="Active • Upcoming • Completed" src={imgScore} onClick={() => setView("fixtures")} />
        </div>
      </div>
    );
  }

  if (view === "rules") return <RulesPanel />;
  if (view === "teams") return <TeamsPanel />;
  if (view === "fixtures") return <FixturesPanel />;

  return null;
}

