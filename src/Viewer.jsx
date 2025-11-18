// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

/* small helpers */
const buster = () => `?t=${Date.now()}`;

/* API calls used by viewer (independent) */
const apiPlayersGet = async () => {
  const r = await fetch("/api/players" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("players-get");
  return await r.json();
};
const apiFixturesList = async () => {
  const r = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!r.ok) throw new Error("fixtures-get");
  return await r.json();
};
const apiMatchesList = async () => {
  try { const r = await fetch("/api/matches" + buster(), { cache: "no-store" }); if (!r.ok) throw 0; return await r.json(); } catch { return []; }
};

/* normalize players same as App.jsx expects */
const normalizePlayers = (raw) => {
  if (!raw) return { singles: {}, doubles: {} };
  const singles = Array.isArray(raw.singles) ? { "Players": raw.singles } : (raw.singles || {});
  const doubles = Array.isArray(raw.doubles) ? { "Pairs": raw.doubles } : (raw.doubles || {});
  return { singles, doubles };
};

export default function Viewer() {
  const [page, setPage] = useState("menu"); // menu | rules | teams | fixtures
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [pl, fx, ms] = await Promise.all([apiPlayersGet(), apiFixturesList(), apiMatchesList()]);
        if (!alive) return;
        setPlayers(normalizePlayers(pl));
        setFixtures(fx || []);
        setMatches(ms || []);
      } catch (e) {
        console.error("viewer load error", e);
        setErr("Failed loading viewer data");
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const Card = ({ children, className = "" }) => <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>{children}</div>;

  if (page === "menu") {
    return (
      <div className="app-bg">
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Viewer</h1>
          <div className="grid md:grid-cols-3 gap-4">
            <button className="rounded-2xl overflow-hidden border bg-white text-left" onClick={() => setPage("rules")}>
              <div className="h-40 relative"><img src={imgStart} alt="" className="absolute inset-0 w-full h-full object-cover" /></div>
              <div className="p-3"><div className="font-semibold">Rules</div><div className="text-sm text-zinc-500">Tournament rules</div></div>
            </button>

            <button className="rounded-2xl overflow-hidden border bg-white text-left" onClick={() => setPage("teams")}>
              <div className="h-40 relative"><img src={imgSettings} alt="" className="absolute inset-0 w-full h-full object-cover" /></div>
              <div className="p-3"><div className="font-semibold">Teams</div><div className="text-sm text-zinc-500">Registered players / pairs</div></div>
            </button>

            <button className="rounded-2xl overflow-hidden border bg-white text-left" onClick={() => setPage("fixtures")}>
              <div className="h-40 relative"><img src={imgScore} alt="" className="absolute inset-0 w-full h-full object-cover" /></div>
              <div className="p-3"><div className="font-semibold">Fixture / Scores</div><div className="text-sm text-zinc-500">Live, upcoming, completed</div></div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "rules") {
    return (
      <div className="app-bg">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-4"><button className="btn" onClick={() => setPage("menu")}>Back</button><h2 className="text-xl font-bold">Rules</h2></div>
          <Card className="p-5">
            <h3 className="font-semibold">Qualifiers & Semifinal</h3>
            <ol className="pl-5 list-decimal">
              <li>First to four games wins (first to 4 games wins the set).</li>
              <li>Tiebreak at 3-3: tiebreak to 5 points; 4-4 => next point wins.</li>
              <li>No-adv: at deuce (40-40) next point decides the game.</li>
            </ol>
            <h3 className="font-semibold mt-3">Final Matches</h3>
            <ol className="pl-5 list-decimal">
              <li>One full set (6 games) with normal tiebreak rules.</li>
              <li>Limited Deuce Points: max 3 deuce points; next decides after that.</li>
            </ol>
          </Card>
        </div>
      </div>
    );
  }

  if (page === "teams") {
    const singlesCats = Object.entries(players.singles || {});
    const doublesCats = Object.entries(players.doubles || {});
    return (
      <div className="app-bg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-4"><button className="btn" onClick={() => setPage("menu")}>Back</button><h2 className="text-xl font-bold">Teams</h2></div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="font-semibold mb-3">Singles</div>
              {singlesCats.length === 0 ? <div className="text-zinc-500">No singles</div> : singlesCats.map(([cat, arr]) => (
                <div key={cat} className="mb-3 p-3 rounded-xl" style={{ background: "#fff", border: "1px solid #eef2ff" }}>
                  <div className="flex justify-between items-center mb-2"><div className="font-medium">{cat}</div><div className="text-sm text-zinc-500">{arr.length} players</div></div>
                  <ul className="ml-5">{(arr || []).map((n, i) => <li key={i}>{n}</li>)}</ul>
                </div>
              ))}
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-3">Doubles</div>
              {doublesCats.length === 0 ? <div className="text-zinc-500">No pairs</div> : doublesCats.map(([cat, arr]) => (
                <div key={cat} className="mb-3 p-3 rounded-xl" style={{ background: "#fff", border: "1px solid #fff1f2" }}>
                  <div className="flex justify-between items-center mb-2"><div className="font-medium">{cat}</div><div className="text-sm text-zinc-500">{arr.length} pairs</div></div>
                  <ul className="ml-5">{(arr || []).map((n,i) => <li key={i}>{n}</li>)}</ul>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (page === "fixtures") {
    const active = fixtures.filter(f => f.status === "active");
    const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming").sort((a,b)=>a.start - b.start);
    const completed = [...fixtures.filter(f => f.status === "completed"), ...matches].sort((a,b) => (b.finishedAt||0)-(a.finishedAt||0));

    return (
      <div className="app-bg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-4"><button className="btn" onClick={() => setPage("menu")}>Back</button><h2 className="text-xl font-bold">Fixture / Scores</h2></div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="font-semibold mb-2">Active</div>
              {active.length ? active.map(f => (<div key={f.id} className="mb-3"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Live</span></div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No live match.</div>}

              <div className="font-semibold mt-4 mb-2">Upcoming</div>
              {upcoming.length ? upcoming.map(f => (<div key={f.id} className="mb-3"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>)) : <div className="text-zinc-500">No upcoming fixtures.</div>}
            </Card>

            <Card className="p-4">
              <div className="font-semibold mb-2">Completed</div>
              {completed.length ? completed.map(m => (<div key={(m.id||'')+String(m.finishedAt||'')} className="mb-3"><div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div><div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner||''}</span> <span className="ml-3 font-mono">{m.scoreline||''}</span></div></div>)) : <div className="text-zinc-500">No completed matches yet.</div>}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

