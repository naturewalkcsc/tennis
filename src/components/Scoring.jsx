import React, { useState } from "react";

/*
  Scoring component with configurable rules based on match type:
  - qualifier / semifinal: Fast4: first to 4 games, tiebreak at 3-3 to 5 (4-4 next wins), max 1 deuce?
  - final: set to 6 games; tiebreak: first to 7 with min 2 diff, but cap at 10-10 -> next point wins.
*/

function nextPointNoAd(p) { return { 0: 15, 15: 30, 30: 40, 40: "Game" }[p] ?? p; }
function advancePointNoAd(a,b,who){ let pA=a,pB=b; if (who===0) pA=nextPointNoAd(pA); else pB=nextPointNoAd(pB); return [pA,pB]; }

function makeEmptySet(isFinal=false){ return { gamesA:0, gamesB:0, tie:false, tieA:0, tieB:0, finished:false, isFinal }; }

export default function Scoring({ config, onAbort, onComplete }) {
  const { sides = ["A","B"], fixtureId, matchType = "qualifier" } = config;
  const isFinal = matchType === "final";

  const [points, setPoints] = useState([0,0]);
  const [sets, setSets] = useState([makeEmptySet(isFinal)]);
  const current = sets[sets.length - 1];

  const gameWin = (a,b) => (a === "Game" ? "A" : b === "Game" ? "B" : null);

  // tiebreak logic varies by matchType
  function tiebreakWinner(s) {
    if (!isFinal) {
      // qualifiers/semis: first to 5 (4-4 next wins)
      if ((s.tieA >= 5 || s.tieB >=5) || (Math.max(s.tieA,s.tieB) >=4 && Math.abs(s.tieA - s.tieB) >=1)) {
        return s.tieA > s.tieB ? "A" : "B";
      }
      return null;
    } else {
      // final: first to 7 with min 2 diff, but cap at 10-10 next point wins
      const maxReached = (s.tieA === 11 || s.tieB === 11); // we won't normally go to 11, but cap handling
      if (maxReached) return s.tieA > s.tieB ? "A" : "B";
      // normal win-by-2 up to cap 10
      if ((s.tieA >= 7 || s.tieB >=7) && Math.abs(s.tieA - s.tieB) >= 2) {
        return s.tieA > s.tieB ? "A" : "B";
      }
      // cap at 10-10: next point wins
      if ((s.tieA === 10 && s.tieB === 10) && (s.tieA !== s.tieB)) {
        return s.tieA > s.tieB ? "A" : "B";
      }
      // handled externally: when 10-10, the next increment will make one 11 and we treat that as winner
      if (s.tieA >= 11 || s.tieB >= 11) return s.tieA > s.tieB ? "A" : "B";
      return null;
    }
  }

  const pointTo = (who) => {
    if (current.finished) return;
    if (current.tie) {
      const ns = [...sets]; const s = {...current};
      if (who === 0) s.tieA++; else s.tieB++;
      const winner = tiebreakWinner(s);
      if (winner) {
        s.finished = true;
        if (winner === "A") s.gamesA = isFinal ? 7 : 4;
        else s.gamesB = isFinal ? 7 : 4;
      }
      ns[ns.length - 1] = s; setSets(ns);
      if (s.finished) recordResult(s);
      return;
    }

    let [a,b] = advancePointNoAd(points[0], points[1], who);
    setPoints([a,b]);
    const gw = gameWin(a,b);
    if (!gw) return;
    const ns = [...sets]; const s = {...current};
    if (gw === "A") s.gamesA++; else s.gamesB++;
    setPoints([0,0]);

    if (!isFinal) {
      // Fast4: tiebreak at 3-3
      if (s.gamesA === 3 && s.gamesB === 3 && !s.tie && !s.finished) {
        s.tie = true; s.tieA = 0; s.tieB = 0;
      } else if (s.gamesA >=4 || s.gamesB >=4) {
        s.finished = true;
      }
    } else {
      // final: standard 6-game set with tie at 6-6
      if (s.gamesA === 6 && s.gamesB === 6 && !s.tie && !s.finished) {
        s.tie = true; s.tieA = 0; s.tieB = 0;
      } else if (s.gamesA >= 6 && s.gamesA - s.gamesB >= 2) {
        s.finished = true;
      } else if (s.gamesB >= 6 && s.gamesB - s.gamesA >= 2) {
        s.finished = true;
      }
    }

    ns[ns.length - 1] = s; setSets(ns);
    if (s.finished) recordResult(s);
  };

  const recordResult = async (setObj) => {
    const scoreline = setObj.tie ? `${setObj.gamesA}-${setObj.gamesB} (${Math.max(setObj.tieA,setObj.tieB)}-${Math.min(setObj.tieA,setObj.tieB)})` : `${setObj.gamesA}-${setObj.gamesB}`;
    const winnerName = setObj.gamesA > setObj.gamesB ? sides[0] : sides[1];
    // send to server (keeps same shape)
    try {
      await fetch("/api/matches" + `?t=${Date.now()}`, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action:"add", payload: { id: crypto.randomUUID(), sides, finishedAt: Date.now(), scoreline, winner: winnerName, mode: isFinal ? "final" : "fast4", matchType: matchType } }) });
      if (fixtureId) {
        await fetch("/api/fixtures" + `?t=${Date.now()}`, { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action:"update", id: fixtureId, patch: { status: "completed", finishedAt: Date.now(), winner: winnerName, scoreline } }) });
      }
    } catch (e) { console.error(e); }
    onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><button onClick={onAbort}>◀ Quit</button><h2 className="text-xl font-bold">Scoring • {sides[0]} vs {sides[1]} • {matchType}</h2></div>
      <div className="bg-white rounded-2xl p-6 shadow border">
        <div className="grid grid-cols-3 gap-4 items-center"><div className="text-right text-3xl font-bold">{String(points[0])}</div><div className="text-center">—</div><div className="text-3xl font-bold">{String(points[1])}</div></div>
        <div className="mt-6 grid grid-cols-2 gap-4"><button onClick={()=>pointTo(0)} className="w-full rounded-xl bg-green-600 text-white py-2">Point {sides[0]}</button><button onClick={()=>pointTo(1)} className="w-full rounded-xl bg-green-600 text-white py-2">Point {sides[1]}</button></div>
        <div className="mt-6"><div className="font-semibold mb-2">Set</div>{!current.tie ? <div className="text-sm font-mono">{current.gamesA}-{current.gamesB}</div> : <div className="text-sm font-mono">TB {current.tieA}-{current.tieB}</div>}<div className="text-xs text-zinc-500 mt-2">Scoring rules: {isFinal ? "Final rules — set to 6, TB to 7 (win by 2), cap at 10-10 next point wins." : "Fast4 — first to 4 games; TB at 3–3 to 5 (4–4 next point wins). No-ad scoring."}</div></div>
      </div>
    </div>
  );
}