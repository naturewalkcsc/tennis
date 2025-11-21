import React, { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import imgStart from "../StartMatch.jpg";
import imgScore from "../Score.jpg";
import imgSettings from "../Settings.jpg";

/*
  Simplified public Viewer that uses fixtures/matches endpoints.
  Kept small and focused on display.
*/

const busterLocal = () => `?t=${Date.now()}`;

export default function Viewer() {
  const [view, setView] = useState("landing");
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [fxR, msR] = await Promise.all([
        fetch("/api/fixtures" + busterLocal(), { cache: "no-store" }),
        fetch("/api/matches" + busterLocal(), { cache: "no-store" })
      ]);
      const fx = fxR.ok ? await fxR.json() : [];
      const ms = msR.ok ? await msR.json() : [];
      setFixtures(Array.isArray(fx) ? fx : []);
      setMatches(Array.isArray(ms) ? ms : []);
    } catch (e) {
      console.error(e);
      setFixtures([]); setMatches([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); const iv = setInterval(load, 10000); return ()=>clearInterval(iv); }, []);

  const active = fixtures.filter(f => f.status === "active");
  const upcoming = fixtures.filter(f => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter(f => f.status === "completed");
  const completed = [...completedFixtures, ...matches.map(m => ({ ...m }))].sort((a,b)=> (b.finishedAt||0)-(a.finishedAt||0));

  if (view === "rules") {
    return (
      <div className="app-bg">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-6"><button onClick={()=>setView("landing")}><ChevronLeft className="w-5 h-5" /> Back</button><h2 className="text-xl font-bold">Rules</h2></div>
          <div className="bg-white p-5 rounded-2xl shadow border">
            <h3 className="font-semibold mb-2">Format</h3>
            <h4 className="font-semibold">Singles Categories (Champions A, Champions B, Women and Kids)</h4>
            <ul className="list-disc pl-6 mb-3">
              <li>Champions A Two Pools have been created – A and B. Top Two winners in each pool will enter Semi-finals, the winners in Semi-final will qualify for the Finals.</li>
              <li>Champions B will be a single pool and played in Round Robin league, the top 2 will qualify for the finals.</li>
              <li>Women Singles will have two pools, player at the first position from each pool will qualify for the finals.</li>
              <li>Kids Singles will be a single pool and will play against each other, top two will play Finals.</li>
            </ul>

            <h4 className="font-semibold">Doubles CCategories (Champions A, Champions B, Women’s, Combination and Kids Doubles)</h4>
            <ul className="list-disc pl-6 mb-3">
              <li>Champions A, Round Robin league - pairs will play with each other, top two pairs will reach finals</li>
              <li>Champions B, Round Robin league - pairs will play with each other, top two pairs will reach finals</li>
              <li>Women’s Team, Round Robin league - pairs will play with each other, top two pairs will reach finals</li>
              <li>Combination Team, Two Pools Created, Top two from each pool will qualify for SF</li>
              <li>Kids (Since Only 4 Players), will play Finals</li>
            </ul>

            <h4 className="font-semibold">Very Important Rules</h4>
            <ul className="list-disc pl-6">
              <li>Players must be in proper attire with tennis shoes.</li>
              <li>Players must warm up & report 10 minutes before match.</li>
              <li>Absence beyond 10 minutes = walkover (organizing committee decides).</li>
              <li>Tennis rules apply except modified deuce: One Deuce + Golden Point (Finals: win by 2).</li>
              <li>Fast-Four format for qualifiers & SF. Finals are 6-game sets. Tie-breaker requires difference of TWO points.</li>
              <li>Win = 1 point; Loss = 0 points.</li>
              <li>Chair umpire may override line umpire calls. Final decision by referee.</li>
              <li>Walkovers only per Organizing Committee discretion.</li>
              <li>Two new sets of Slazenger Championship/Equivalent balls per day.</li>
              <li>Players should bring own water, towels, caps.</li>
              <li>Court switch after first 2 games; then 1 minute break each side after every match.</li>
              <li>Rain / wet court may delay schedule.</li>
            </ul>

            <h4 className="font-semibold">Tie Resolution</h4>
            <ul className="list-disc pl-6">
              <li>Tie in points will be resolved using overall set points.</li>
              <li>Net Games difference between won and conceded.</li>
              <li>Organisers will have the final say for any conflicts.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (view === "teams") {
    return (
      <div className="app-bg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-6"><button onClick={()=>setView("landing")}><ChevronLeft className="w-5 h-5" /> Back</button><h2 className="text-xl font-bold">Teams</h2></div>
          <div className="bg-white p-5 rounded-2xl shadow border">Teams listing (public viewer)</div>
        </div>
      </div>
    );
  }

  if (view === "fixtures") {
    return (
      <div className="app-bg">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-6"><button onClick={()=>setView("landing")}><ChevronLeft className="w-5 h-5" /> Back</button><h2 className="text-xl font-bold">Fixture / Scores</h2></div>
          {loading ? <div>Loading…</div> : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl shadow border">
                <div className="text-lg font-semibold mb-3">Active</div>
                {active.length ? active.map(f => <div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.type}</span></div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>) : <div className="text-zinc-500">No live match.</div>}
                <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
                {upcoming.length ? upcoming.map(f => <div key={f.id} className="py-2 border-b last:border-0"><div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.type}</span></div><div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div></div>) : <div className="text-zinc-500">No upcoming fixtures.</div>}
              </div>

              <div className="bg-white p-5 rounded-2xl shadow border">
                <div className="text-lg font-semibold mb-3">Completed</div>
                {completed.length ? completed.map(m => <div key={(m.id||"")+String(m.finishedAt||"")} className="py-2 border-b last:border-0"><div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div><div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div><div className="mt-1 text-sm"><span className="uppercase text-zinc-400 text-xs">Winner</span> <span className="font-semibold">{m.winner||''}</span> <span className="ml-3 font-mono">{m.scoreline||''}</span></div></div>) : <div className="text-zinc-500">No completed matches yet.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // landing
  return (
    <div className="app-bg">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-8"><h1 className="text-2xl font-bold">RNW Tennis Tournament</h1></div>
        <div className="grid md:grid-cols-3 gap-6">
          <div onClick={()=>setView("rules")} className="cursor-pointer"><img src={imgStart} alt="" className="rounded-2xl w-full h-40 object-cover" /><div className="p-4"><div className="font-semibold">Rules</div><div className="text-sm text-zinc-600">Match rules and formats</div></div></div>
          <div onClick={()=>setView("teams")} className="cursor-pointer"><img src={imgScore} alt="" className="rounded-2xl w-full h-40 object-cover" /><div className="p-4"><div className="font-semibold">Teams</div><div className="text-sm text-zinc-600">View players by category</div></div></div>
          <div onClick={()=>setView("fixtures")} className="cursor-pointer"><img src={imgSettings} alt="" className="rounded-2xl w-full h-40 object-cover" /><div className="p-4"><div className="font-semibold">Fixture/Scores</div><div className="text-sm text-zinc-600">Live, upcoming & recent results</div></div></div>
        </div>
      </div>
    </div>
  );
}