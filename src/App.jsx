import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Play, Settings as SettingsIcon, ListChecks, Users, User2,
  ChevronLeft, Plus, Trash2, ArrowLeftRight, Download, FileDown, Shuffle,
  CalendarPlus, RefreshCw, X, Eye
} from "lucide-react";
import { jsPDF } from "jspdf";

// Keep your existing LS keys/utilities
const LS_THEME="lt_theme", LS_MATCHES_FALLBACK="lt_matches_fallback", LS_PLAYERS_DRAFT="lt_players_draft";
const readLS=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f}catch{return f}};
const writeLS=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const buster=()=>'?t='+Date.now();

// Keep images alongside this file (as you had when it worked)
import StartMatchImg from "./StartMatch.jpg";
import ScoreImg from "./Score.jpg";
import SettingsImg from "./Settings.jpg";

// ---- APIs (same as your working file) ----
const apiStatus=async()=>{try{const r=await fetch('/api/status'+buster(),{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json();return!!j.kv}catch{return false}};
const apiPlayersGet=async()=>{const r=await fetch('/api/players'+buster(),{cache:'no-store'});if(!r.ok)throw 0;return await r.json()};
const apiPlayersSet=async(obj)=>{const r=await fetch('/api/players'+buster(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({payload:obj})});if(!r.ok)throw 0};
const apiMatchesList=async()=>{try{const r=await fetch('/api/matches'+buster(),{cache:'no-store'});if(!r.ok)throw 0;return await r.json()}catch{return readLS(LS_MATCHES_FALLBACK,[])}}
const apiMatchesAdd=async(payload)=>{try{const r=await fetch('/api/matches'+buster(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add',payload})});if(!r.ok)throw 0}catch{const list=readLS(LS_MATCHES_FALLBACK,[]);list.unshift(payload);writeLS(LS_MATCHES_FALLBACK,list)}}
const apiMatchesClear=async()=>{try{await fetch('/api/matches'+buster(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'clear'})})}catch{writeLS(LS_MATCHES_FALLBACK,[])}}
const apiFixturesList=async()=>{const r=await fetch('/api/fixtures'+buster(),{cache:'no-store'});if(!r.ok)throw 0;return await r.json()}
const apiFixturesAdd=async(payload)=>{const r=await fetch('/api/fixtures'+buster(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add',payload})});if(!r.ok)throw 0}
const apiFixturesRemove=async(id)=>{const r=await fetch('/api/fixtures'+buster(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',id})});if(!r.ok)throw 0}
const apiFixturesClear=async()=>{const r=await fetch('/api/fixtures'+buster(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'clear'})});if(!r.ok)throw 0}
// NEW: update fixtures (status, scoreline, winner, start time)
const apiFixturesUpdate=async(id,patch)=>{
  const r=await fetch('/api/fixtures'+buster(),{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({action:'update',id,patch})
  });
  if(!r.ok) throw 0;
};

// ---- UI primitives (unchanged) ----
const Card=({className="",children})=>(<div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200/60 dark:border-zinc-800/80 ${className}`}>{children}</div>);
const Button=({children,onClick,variant="primary",className="",disabled,title,type="button"})=>{
  const base="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-base font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const styles={primary:"bg-green-600 hover:bg-green-700 text-white focus:ring-green-400",secondary:"bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 focus:ring-zinc-400",ghost:"bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-300",danger:"bg-red-600 hover:bg-red-700 text-white focus:ring-red-400"}[variant];
  return(<button type={type} title={title} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${disabled?"opacity-50 cursor-not-allowed":""} ${className}`}>{children}</button>)
};
const Radio=({name,value,checked,onChange,label})=>(<label className="flex items-center gap-3 cursor-pointer select-none"><input type="radio" name={name} value={value} checked={checked} onChange={(e)=>onChange(e.target.value)} className="w-4 h-4"/><span className="text-sm text-zinc-800 dark:text-zinc-200">{label}</span></label>);
const Select=({value,onChange,options,placeholder})=>(<select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full mt-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"><option value="" disabled>{placeholder}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>);
const TextInput=({value,onChange,placeholder,type="text",min,max})=>(<input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} min={min} max={max} className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"/>);
const SectionTitle=({children,icon:Icon})=>(<div className="flex items-center gap-2 mb-3">{Icon?<Icon className="w-5 h-5 text-zinc-500"/>:null}<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{children}</h3></div>);
const GlobalBadge=()=>{const [on,setOn]=useState(false);useEffect(()=>{let alive=true;(async()=>{const ok=await apiStatus();if(alive)setOn(ok)})();return()=>{alive=false}},[]);return(<span className={`ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs ${on?'bg-emerald-100 text-emerald-700':'bg-zinc-200 text-zinc-600'}`}>{on?'GLOBAL: ON':'GLOBAL: OFF'}</span>)};
const ThemeToggle=()=>{const [dark,setDark]=useState(()=>readLS(LS_THEME,false));useEffect(()=>{document.documentElement.classList.toggle("dark",dark);writeLS(LS_THEME,dark)},[dark]);return(<Button variant="ghost" onClick={()=>setDark(d=>!d)} className="!px-3 !py-2" title="Toggle theme">{dark?"🌙":"☀️"}</Button>)};

// ---------- Simple Local Login (protects only Admin UI) ----------
function AdminLogin({onOk}){
  const [u,setU]=useState("admin");
  const [p,setP]=useState("");
  const [err,setErr]=useState("");
  const submit=(e)=>{e.preventDefault();
    if(u==="admin" && p==="rnwtennis123$"){ localStorage.setItem("lt_admin","1"); onOk(); }
    else { setErr("Invalid username or password"); }
  };
  return (<div className="app-bg"><div className="max-w-sm mx-auto p-6">
    <div className="mb-6 text-center"><h1 className="text-2xl font-bold">Admin Login</h1><div className="text-sm text-zinc-600">Default: admin / rnwtennis123$</div></div>
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <div><div className="text-sm mb-1">Username</div><TextInput value={u} onChange={setU} placeholder="admin"/></div>
        <div><div className="text-sm mb-1">Password</div><TextInput type="password" value={p} onChange={setP} placeholder="••••••••"/></div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <Button type="submit" className="w-full">Enter Admin</Button>
      </form>
    </Card>
    <div className="mt-6 text-sm text-zinc-600">Viewer is public: <a className="underline" href="/viewer">/viewer</a></div>
  </div></div>);
}

// ---------- Viewer (public) ----------
function Viewer(){
  const [fixtures,setFixtures]=useState([]);
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ let alive=true;(async()=>{
    try{ const fx=await apiFixturesList(); const rs=await apiMatchesList(); if(!alive) return; setFixtures(fx); setResults(rs) }catch{} finally{ if(alive) setLoading(false) }
  })(); const iv=setInterval(async()=>{ try{ const fx=await apiFixturesList(); const rs=await apiMatchesList(); setFixtures(fx); setResults(rs) }catch{} },10000); return()=>{alive=false; clearInterval(iv)} },[]);
  return (<div className="app-bg"><div className="max-w-5xl mx-auto p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3"><Eye className="w-6 h-6 text-green-600"/><h1 className="text-2xl font-bold">RNW Tennis Tournament 2025</h1></div>
      <ThemeToggle/>
    </div>
    {loading? <Card className="p-6 text-center text-zinc-500">Loading…</Card> :
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-5"><SectionTitle icon={CalendarPlus}>Upcoming Fixtures</SectionTitle>
        {fixtures.length===0?<div className="text-zinc-500">No fixtures scheduled.</div>:
          <div className="space-y-3">{fixtures.map(f=>(
            <div key={f.id} className="flex items-center justify-between py-2 border-b border-zinc-200/60 last:border-0">
              <div>
                <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()} • {f.mode}</div>
              </div>
            </div>
          ))}</div>
        }
      </Card>
      <Card className="p-5"><SectionTitle icon={ListChecks}>Recent Results</SectionTitle>
        {results.length===0?<div className="text-zinc-500">No results yet.</div>:
          <div className="space-y-3">{results.map(m=>(
            <div key={m.id} className="py-2 border-b border-zinc-200/60 last:border-0">
              <div className="font-semibold">{m.sides[0]} vs {m.sides[1]}</div>
              <div className="text-sm text-zinc-500">{new Date(m.finishedAt).toLocaleString()}</div>
              <div className="mt-1"><span className="text-xs uppercase text-zinc-400">Winner</span> <span className="font-semibold">{m.winner}</span> <span className="ml-3 font-mono">{m.scoreline}</span></div>
            </div>
          ))}</div>
        }
      </Card>
    </div>}
    <div className="mt-8 text-xs text-zinc-500">This page is read-only. Admins can manage players and matches on the main URL.</div>
  </div></div>);
}

// ---------- Landing ----------
const Landing=({onStart,onResults,onSettings,onFixtures})=>{
  const Tile=({title,subtitle,icon:Icon,action,imgUrl})=>(
    <motion.button onClick={action} whileHover={{y:-2,scale:1.01}} whileTap={{scale:0.99}} className="w-full md:w-80 aspect-[5/3] rounded-2xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left">
      <div className="h-2/3 w-full relative">{imgUrl?<img src={imgUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/>:null}</div>
      <div className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700"><Icon className="w-5 h-5"/></div>
        <div><div className="text-lg font-semibold">{title}</div><div className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</div></div>
      </div>
    </motion.button>
  );
  return (<div className="max-w-5xl mx-auto p-6">
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3"><Trophy className="w-6 h-6 text-green-600"/><h1 className="text-2xl font-bold">RNW Tennis Tournament 2025</h1><GlobalBadge/></div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onFixtures}><CalendarPlus className="w-5 h-5"/> Fixtures</Button>
      </div>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      <Tile title="Start a Match" subtitle="Choose from fixtures" icon={Play} action={onStart} imgUrl={StartMatchImg}/>
      <Tile title="Show Results" subtitle="Winners, scores • Export" icon={ListChecks} action={onResults} imgUrl={ScoreImg}/>
      <Tile title="Manage Players" subtitle="Singles players & Doubles pairs" icon={Users} action={onSettings} imgUrl={SettingsImg}/>
    </div>
  </div>);
};

// ---------- Settings (unchanged) ----------
// (… your Settings component as in the working file …)

// ---------- Fixtures (unchanged except what you already have) ----------
// (… your Fixtures component as in the working file …)

// ================== FAST4 / NO-AD RULES IMPLEMENTATION ==================
// No-Ad game scoring:
//  - points: 0 → 15 → 30 → 40 → Game
//  - at 40–40, next point wins (no "Ad")
const nextPointNoAd = (p) => ({0:15, 15:30, 30:40}[p] ?? (p===40 ? "Game" : p));

// Given current points a,b and who scored (0 or 1), return new [a,b]
function advancePointNoAd(a,b,who){
  if (who===0){
    // if both were at 40, winner takes game immediately
    if (a===40 && b===40) return ["Game", b];
    return [nextPointNoAd(a), b];
  } else {
    if (a===40 && b===40) return [a, "Game"];
    return [a, nextPointNoAd(b)];
  }
}

// A single set structure
function makeEmptySet(){return{gamesA:0,gamesB:0,tie:false,tieA:0,tieB:0,finished:false,tieStart:null}}

// Set is over if:
//  - normal games: first to 4 (unless it became tie at 3–3)
//  - tie-break: first to 5; if 4–4, next point wins (so reaching 5 ends it)
function setOverFast4(s){
  if (s.tie){
    return (s.tieA===5 || s.tieB===5);
  } else {
    // normal games first-to-4; tie triggers at 3–3 instead of continuing
    if (s.gamesA===4 || s.gamesB===4) return true;
    return false;
  }
}

// Winner sets counter helper (for best-of behaviour; unchanged)
function winnerSets(sets){
  let A=0,B=0;
  for(const s of sets){
    if(!s.finished) continue;
    if(s.tie){
      if(s.tieA>s.tieB) A++; else if(s.tieB>s.tieA) B++;
    }else{
      if(s.gamesA>s.gamesB) A++; else if(s.gamesB>s.gamesA) B++;
    }
  }
  return {A,B};
}

// ------------------- Scoring (uses Fast4 + No-Ad) -------------------
function Scoring({config,onAbort,onComplete}){
  const {sides, rule, bestOf, gamesTarget, startingServer, fixtureId} = config;

  // Force Fast4 semantics regardless of incoming flags
  const effectiveRule = 'fast4';
  const effectiveBestOf = 3;   // keep best-of-3 sets (standard Fast4 format)

  const [points,setPoints]=useState([0,0]);
  const [sets,setSets]=useState([makeEmptySet()]);
  const [server,setServer]=useState(startingServer||0);
  const [flipped,setFlipped]=useState(false);

  const currentSet=sets[sets.length-1];
  const {A:setsA,B:setsB}=winnerSets(sets);
  const targetSets=Math.floor(effectiveBestOf/2)+1;

  // Determine if match done
  const matchDone = (setsA===targetSets || setsB===targetSets);

  // (Simple) tiebreak serving alternation – reuse your existing idea
  const tiebreakServer=()=>{if(!currentSet.tie)return server;const tb=currentSet.tieA+currentSet.tieB;const start=currentSet.tieStart??server;if(tb===0)return start;const block=Math.floor((tb-1)/2)%2;return block===0?1-start:start};

  // Record into results + mark fixture completed
  const recordResult=async()=>{
    const scoreline = sets
      .filter(s=>s.finished)
      .map(s => s.tie ? `${s.gamesA}-${s.gamesB}(${Math.max(s.tieA,s.tieB)})` : `${s.gamesA}-${s.gamesB}`)
      .join(" ");
    const winner = setsA>setsB ? sides[0] : setsB>setsA ? sides[1] :
                   (currentSet.gamesA>currentSet.gamesB ? sides[0] : sides[1]);
    const payload={ id:crypto.randomUUID(), sides, rule:effectiveRule, bestOf:effectiveBestOf,
                    gamesTarget:4, finishedAt:Date.now(), scoreline, winner };
    await apiMatchesAdd(payload);
    if (fixtureId){
      await apiFixturesUpdate(fixtureId,{status:'completed',finishedAt:payload.finishedAt,winner:payload.winner,scoreline:payload.scoreline});
    }
    onComplete();
  };

  const startNextGameRotateServer=()=>setServer(p=>1-p);

  const pointTo=(logical)=>{
    if(matchDone) return;
    const who=flipped?1-logical:logical;

    if(currentSet.tie){
      // Fast4 tie-break: first to 5 points; at 4–4 next point wins (i.e., 5 ends it)
      const ns=[...sets];
      const so={...currentSet};
      if(who===0) so.tieA++; else so.tieB++;
      if (setOverFast4(so)) so.finished=true;
      ns[ns.length-1]=so; setSets(ns);
      if(so.finished){
        // next set (if needed)
        const {A,B}=winnerSets(ns);
        if (A<targetSets && B<targetSets) setSets(prev=>[...prev,makeEmptySet()]);
        startNextGameRotateServer();
      }
      return;
    }

    // No-Ad game progression
    const [a,b] = advancePointNoAd(points[0],points[1],who);
    setPoints([a,b]);

    // If someone won the game
    if (a==="Game" || b==="Game"){
      const ns=[...sets];
      const so={...currentSet};
      if (a==="Game") so.gamesA++; if (b==="Game") so.gamesB++;
      setPoints([0,0]);

      // At 3–3 -> tie-break
      if (so.gamesA===3 && so.gamesB===3){
        so.tie=true; so.tieStart=server;
      } else if (setOverFast4(so)){
        so.finished=true;
      }

      ns[ns.length-1]=so; setSets(ns);
      startNextGameRotateServer();

      if(so.finished){
        const {A,B}=winnerSets(ns);
        if (A<targetSets && B<targetSets){
          setSets(prev=>[...prev,makeEmptySet()]);
        }
      }
    }
  };

  const undoPoint=()=>setPoints([0,0]);

  useEffect(()=>{ if(matchDone) recordResult() },[setsA,setsB,currentSet.finished]);

  const leftName=flipped?sides[1]:sides[0];
  const rightName=flipped?sides[0]:sides[1];
  const leftIsServer=(flipped?1-tiebreakServer():tiebreakServer())===0;
  const rightIsServer=!leftIsServer;

  return (<div className="max-w-4xl mx-auto p-6">
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" onClick={onAbort}><ChevronLeft className="w-5 h-5"/> Quit</Button>
      <h2 className="text-xl font-bold">Scoring • {sides[0]} vs {sides[1]}</h2>
      <div className="ml-auto text-sm text-zinc-600 dark:text-zinc-300">
        Fast4 • First to 4 games • TB at 3–3 to 5 (4–4 next point wins) • No-Ad
      </div>
    </div>
    <Card className="p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={()=>setFlipped(f=>!f)} title="Switch Sides"><ArrowLeftRight className="w-4 h-4"/> Switch Sides</Button>
          <Button variant="secondary" onClick={()=>setServer(s=>1-s)} title="Manual Server Toggle"><Shuffle className="w-4 h-4"/> Switch Server</Button>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">Server: <span className="font-semibold">{tiebreakServer()===0?sides[0]:sides[1]}</span>{currentSet.tie&&<span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs">Tie-break</span>}</div>
      </div>

      <div className="grid grid-cols-5 gap-4 items-center mt-4">
        <div className="col-span-2 text-right pr-4">
          <div className="text-lg font-semibold truncate flex items-center justify-end gap-2">{leftName} {leftIsServer&&<span title="Serving now" className="inline-block w-2 h-2 rounded-full bg-emerald-500"/>}</div>
        </div>
        <div className="col-span-1 text-center text-sm text-zinc-500">Points</div>
        <div className="col-span-2 pl-4">
          <div className="text-lg font-semibold truncate flex items-center gap-2">{rightName} {rightIsServer&&<span title="Serving now" className="inline-block w-2 h-2 rounded-full bg-emerald-500"/>}</div>
        </div>
        <div className="col-span-2 text-right pr-4 text-3xl font-bold">{String(points[flipped?1:0])}</div>
        <div className="col-span-1 text-center">—</div>
        <div className="col-span-2 pl-4 text-3xl font-bold">{String(points[flipped?0:1])}</div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="flex items-center justify-end gap-2"><Button onClick={()=>pointTo(0)} className="w-40">Point {leftName}</Button></div>
        <div className="flex items-center justify-center gap-2"><Button variant="secondary" onClick={undoPoint}>Reset Game Points</Button></div>
        <div className="flex items-center justify-start gap-2"><Button onClick={()=>pointTo(1)} className="w-40">Point {rightName}</Button></div>
      </div>

      <div className="mt-8">
        <SectionTitle>Sets & Games</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-zinc-500"><th className="font-medium py-2">Set</th>{sets.map((_,i)=>(<th key={i} className="font-medium py-2 px-2">{i+1}</th>))}</tr></thead>
            <tbody>
              <tr><td className="py-2 pr-2 font-medium text-right">{sides[0]}</td>{sets.map((s,i)=>(<td key={i} className="py-2 px-2 text-center">{s.tie?`${s.tieA}`:s.gamesA}</td>))}</tr>
              <tr><td className="py-2 pr-2 font-medium text-right">{sides[1]}</td>{sets.map((s,i)=>(<td key={i} className="py-2 px-2 text-center">{s.tie?`${s.tieB}`:s.gamesB}</td>))}</tr>
            </tbody>
          </table>
        </div>
        <div className="text-xs text-zinc-500 mt-2">Numbers show games per set (or tie-break points when in tie-break).</div>
      </div>
    </Card>
  </div>);
}

// ---------- Results (unchanged from your working file) ----------
// (… your Results component …)

// ---------- Start from Fixtures (unchanged except it now starts Fast4) ----------
function StartFromFixtures({ onBack, onStartScoring }){
  const [mode,setMode]=useState('singles');
  const [fixtures,setFixtures]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{ let alive=true;(async()=>{
    try{ const fx=await apiFixturesList(); if(alive) setFixtures(fx) }finally{ if(alive) setLoading(false) }
  })(); return()=>{alive=false} },[]);

  const list=fixtures.filter(f=>(f.mode||'singles')===mode && f.status!=='completed');

  const startFixture=async(fx)=>{
    const now=Date.now();
    // demote any other active
    for(const other of fixtures){ if(other.id!==fx.id && other.status==='active'){ await apiFixturesUpdate(other.id,{status:'upcoming'}) } }
    // mark this one active; if in the future, move start time to now
    const patch={status:'active'}; if(fx.start>now) patch.start=now;
    await apiFixturesUpdate(fx.id,patch);
    // Start with Fast4 rules
    onStartScoring({
      mode:fx.mode, sides:fx.sides,
      rule:'fast4', bestOf:3, gamesTarget:4, startingServer:0,
      fixtureId:fx.id
    });
  };

  return (<div className="max-w-3xl mx-auto p-6">
    <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5"/> Back</Button><h2 className="text-xl font-bold">Start a Match</h2></div>
    <Card className="p-5">
      <div className="flex gap-6 mb-4">
        <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode==='singles'} onChange={()=>setMode('singles')}/> Singles</label>
        <label className="flex items-center gap-2"><input type="radio" name="m" checked={mode==='doubles'} onChange={()=>setMode('doubles')}/> Doubles</label>
      </div>
      {loading ? <div className="text-zinc-500">Loading fixtures…</div> :
       list.length===0 ? <div className="text-zinc-500">No fixtures for {mode}.</div> :
       <div className="space-y-3">
         {list.map(f=>(
           <Card key={f.id} className="p-4 flex items-center gap-4">
             <div className="flex-1">
               <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]}</div>
               <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
             </div>
             <Button onClick={()=>startFixture(f)}><Play className="w-4 h-4"/> Start Now</Button>
           </Card>
         ))}
       </div>}
    </Card>
  </div>);
}

// ---------- Admin App & Root (unchanged) ----------
function AdminApp(){
  const [view,setView]=useState('landing');
  const [cfg,setCfg]=useState(null);
  const to=v=>setView(v);
  const logged=localStorage.getItem("lt_admin")==="1";
  if(!logged) return <AdminLogin onOk={()=>window.location.reload()}/>;
  return(<div className="app-bg"><div className="max-w-6xl mx-auto py-8">
    <AnimatePresence mode="wait">
      {view==='landing'&&(<motion.div key="landing" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
        <Landing onStart={()=>to('start')} onResults={()=>to('results')} onSettings={()=>to('settings')} onFixtures={()=>to('fixtures')}/>
      </motion.div>)}
      {view==='settings'&&(<motion.div key="settings" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><Settings onBack={()=>to('landing')}/></motion.div>)}
      {view==='fixtures'&&(<motion.div key="fixtures" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><Fixtures onBack={()=>to('landing')}/></motion.div>)}
      {view==='start'&&(<motion.div key="start" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><StartFromFixtures onBack={()=>to('landing')} onStartScoring={(c)=>{setCfg(c);to('scoring')}}/></motion.div>)}
      {view==='scoring'&&cfg&&(<motion.div key="scoring" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><Scoring config={cfg} onAbort={()=>to('landing')} onComplete={()=>to('results')}/></motion.div>)}
      {view==='results'&&(<motion.div key="results" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><Results onBack={()=>to('landing')}/></motion.div>)}
    </AnimatePresence>
  </div><footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} RNW CSC </footer></div>)
}

export default function Root(){
  const path = typeof window!=='undefined' ? window.location.pathname : '/';
  if (path.startsWith('/viewer')) return <Viewer/>;
  return <AdminApp/>;
}

