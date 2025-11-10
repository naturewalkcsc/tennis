import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, Settings as SettingsIcon, ListChecks, Users, User2, ChevronLeft, Plus, Trash2, ArrowLeftRight, Download, FileDown, Shuffle, CalendarPlus, RefreshCw, X, Eye } from "lucide-react";
import { jsPDF } from "jspdf";

/* ---------- Shared helpers ---------- */
const LS_THEME="lt_theme", LS_MATCHES_FALLBACK="lt_matches_fallback", LS_PLAYERS_DRAFT="lt_players_draft";
const readLS=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f}catch{return f}};
const writeLS=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const buster=()=>'?t='+Date.now();

/* API wrappers (KV-backed with local fallback for results) */
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

/* ---------- Small UI primitives ---------- */
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

/* ---------- Viewer (read-only) ---------- */
function Viewer(){
  const [fixtures,setFixtures]=useState([]);
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ let alive=true;(async()=>{
    try{ const fx=await apiFixturesList(); const rs=await apiMatchesList(); if(!alive) return; setFixtures(fx); setResults(rs) }catch{} finally{ if(alive) setLoading(false) }
  })(); const iv=setInterval(async()=>{ try{ const fx=await apiFixturesList(); const rs=await apiMatchesList(); setFixtures(fx); setResults(rs) }catch{} },10000); return()=>{alive=false; clearInterval(iv)} },[]);
  return (<div className="app-bg"><div className="max-w-5xl mx-auto p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3"><Eye className="w-6 h-6 text-green-600"/><h1 className="text-2xl font-bold">Tournament Viewer</h1><GlobalBadge/></div>
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

/* ---------- Admin landing ---------- */
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
      <div className="flex items-center gap-3"><Trophy className="w-6 h-6 text-green-600"/><h1 className="text-2xl font-bold">Lawn Tennis Scoring</h1><GlobalBadge/></div>
      <div className="flex items-center gap-2">
        <a className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900" href="/viewer" title="Open read-only viewer"><Eye className="w-4 h-4"/> Viewer</a>
        <Button variant="ghost" onClick={onFixtures}><CalendarPlus className="w-5 h-5"/> Fixtures</Button>
        <Button variant="ghost" onClick={onSettings}><SettingsIcon className="w-5 h-5"/> Settings</Button>
        <ThemeToggle/>
      </div>
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      <Tile title="Start a Match" subtitle="Singles or Doubles • Quick setup" icon={Play} action={onStart} imgUrl="https://upload.wikimedia.org/wikipedia/commons/3/3e/Tennis_Racket_and_Balls.jpg"/>
      <Tile title="Show Results" subtitle="Winners, scores • Export" icon={ListChecks} action={onResults} imgUrl="https://www.wikihow.com/Keep-Score-for-Tennis%23/Image:Keep-Score-for-Tennis-Step-1-Version-3.jpg"/>
      <Tile title="Manage Players" subtitle="Singles players & Doubles pairs" icon={Users} action={onSettings} imgUrl="https://news.cgtn.com/news/3563444e7a45544f31556a4e306b7a4d786b7a4e31457a6333566d54/img/2f296c0a4b63418486e92f07ff1d7ad1/2f296c0a4b63418486e92f07ff1d7ad1.jpg"/>
    </div>
  </div>);
};

/* ---------- Settings (players) ---------- */
const Settings=({onBack})=>{
  const [singles,setSingles]=useState([]);
  const [doubles,setDoubles]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [error,setError]=useState("");
  const [toast,setToast]=useState({show:false,text:""});

  const saveDraft=(s,d)=>{ try{ localStorage.setItem(LS_PLAYERS_DRAFT, JSON.stringify({singles:s,doubles:d})) }catch{} };
  const loadDraft=()=>{ try{ const r=localStorage.getItem(LS_PLAYERS_DRAFT); return r? JSON.parse(r):null }catch{ return null } };
  const clearDraft=()=>{ try{ localStorage.removeItem(LS_PLAYERS_DRAFT) }catch{} };

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const d=loadDraft();
      if(d){ setSingles(d.singles||[]); setDoubles(d.doubles||[]); setDirty(true); setLoading(false); return; }
      try{ const obj=await apiPlayersGet(); if(!alive) return; setSingles(obj.singles||[]); setDoubles(obj.doubles||[]) }
      catch{ setError("Could not load players (KV off?). You can edit and Save to retry."); }
      finally{ if(alive) setLoading(false) }
    })();
    return()=>{alive=false}
  },[]);

  const markDirty=(ns,nd)=>{ setDirty(true); saveDraft(ns,nd) }
  const onChangeSingles=(i,v)=> setSingles(p=>{ const ns=p.map((x,idx)=>idx===i?v:x); markDirty(ns,doubles); return ns })
  const onChangeDoubles=(i,v)=> setDoubles(p=>{ const nd=p.map((x,idx)=>idx===i?v:x); markDirty(singles,nd); return nd })
  const addSingles=()=>{ const ns=[...singles,"New Player"]; setSingles(ns); markDirty(ns,doubles) }
  const addDoubles=()=>{ const nd=[...doubles,"Team X/Team Y"]; setDoubles(nd); markDirty(singles,nd) }
  const delSingles=(i)=>{ const ns=singles.filter((_,idx)=>idx!==i); setSingles(ns); markDirty(ns,doubles) }
  const delDoubles=(i)=>{ const nd=doubles.filter((_,idx)=>idx!==i); setDoubles(nd); markDirty(singles,nd) }

  const doSave=async()=>{
    setSaving(true); setError("");
    try{ await apiPlayersSet({singles,doubles}); setDirty(false); clearDraft(); setToast({show:true,text:"Players saved"}); setTimeout(()=>setToast({show:false,text:""}),1200) }
    catch{ setError("Save failed. Keep editing and try again."); }
    finally{ setSaving(false) }
  }
  const refresh=async()=>{
    setLoading(true); setError("");
    try{ const obj=await apiPlayersGet(); setSingles(obj.singles||[]); setDoubles(obj.doubles||[]); setDirty(false); clearDraft() }
    catch{ setError("Refresh failed.") }
    finally{ setLoading(false) }
  }

  return (<div className="max-w-3xl mx-auto p-6">
    {toast.show && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-lg">{toast.text}</div>}
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5"/> Back</Button>
      <h2 className="text-xl font-bold">Manage Players</h2>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" onClick={refresh}><RefreshCw className="w-4 h-4"/> Refresh</Button>
        <Button onClick={doSave} disabled={!dirty||saving}>{saving?"Saving…":"Save Changes"}</Button>
      </div>
    </div>
    {error && <Card className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</Card>}
    {loading ? <Card className="p-5 text-zinc-500 text-center">Loading players…</Card> : (
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <SectionTitle icon={User2}>Singles Players</SectionTitle>
          <div className="space-y-3">
            {singles.map((name,idx)=>(
              <div key={idx} className="flex items-center gap-2">
                <TextInput value={name} onChange={(v)=>onChangeSingles(idx,v)} placeholder="Player name"/>
                <Button variant="ghost" onClick={()=>delSingles(idx)}><Trash2 className="w-4 h-4"/></Button>
              </div>
            ))}
            <Button variant="secondary" onClick={addSingles}><Plus className="w-4 h-4"/> Add Player</Button>
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle icon={Users}>Doubles Pairs</SectionTitle>
          <div className="space-y-3">
            {doubles.map((name,idx)=>(
              <div key={idx} className="flex items-center gap-2">
                <TextInput value={name} onChange={(v)=>onChangeDoubles(idx,v)} placeholder="Pair label e.g. Serena/Venus"/>
                <Button variant="ghost" onClick={()=>delDoubles(idx)}><Trash2 className="w-4 h-4"/></Button>
              </div>
            ))}
            <Button variant="secondary" onClick={addDoubles}><Plus className="w-4 h-4"/> Add Pair</Button>
          </div>
        </Card>
      </div>
    )}
    <div className="text-xs text-zinc-500 mt-3">{dirty ? "You have unsaved changes." : "All changes saved."}</div>
  </div>);
};

/* ---------- Fixtures (schedule) ---------- */
const Fixtures=({onBack})=>{
  const [players,setPlayers]=useState({singles:[],doubles:[]});
  const [mode,setMode]=useState('singles');
  const [a,setA]=useState(''); const [b,setB]=useState('');
  const [date,setDate]=useState(''); const [time,setTime]=useState('');
  const [list,setList]=useState([]); const [loading,setLoading]=useState(true);

  useEffect(()=>{ let alive=true;
    (async()=>{
      try{ const p=await apiPlayersGet(); if(alive) setPlayers(p) }catch{}
      try{ const fx=await apiFixturesList(); if(alive) setList(fx) }catch{}
      finally{ if(alive) setLoading(false) }
    })();
    return()=>{alive=false}
  },[]);

  const options = mode==='singles'? players.singles : players.doubles;
  const canAdd = a && b && a!==b && date && time;

  const add=async(e)=>{
    e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = { id: crypto.randomUUID(), mode, sides:[a,b], start };
    await apiFixturesAdd(payload);
    setList(prev=>[...prev,payload].sort((x,y)=>x.start-y.start));
    setA(''); setB(''); setDate(''); setTime('');
  };
  const remove=async(id)=>{ await apiFixturesRemove(id); setList(prev=>prev.filter(f=>f.id!==id)) };
  const clear=async()=>{ if(!confirm('Clear ALL fixtures?')) return; await apiFixturesClear(); setList([]) };
  const refresh=async()=>{ const fx=await apiFixturesList(); setList(fx) };

  return (<div className="max-w-4xl mx-auto p-6">
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5"/> Back</Button>
      <h2 className="text-xl font-bold">Fixtures</h2>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" onClick={refresh}><RefreshCw className="w-4 h-4"/> Refresh</Button>
        <Button variant="secondary" onClick={clear}>Clear All</Button>
      </div>
    </div>

    {loading ? <Card className="p-5 text-center text-zinc-500">Loading…</Card> : (
      <>
        <Card className="p-5 mb-6">
          <SectionTitle icon={CalendarPlus}>Schedule a Match</SectionTitle>
          <form onSubmit={add} className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Type</div>
              <div className="flex gap-4">
                <Radio name="mode" value="singles" checked={mode==='singles'} onChange={setMode} label="Singles"/>
                <Radio name="mode" value="doubles" checked={mode==='doubles'} onChange={setMode} label="Doubles"/>
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{mode==='singles'?'Player 1':'Team 1'}</div>
              <Select value={a} onChange={setA} options={options} placeholder="Choose..."/>
            </div>
            <div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{mode==='singles'?'Player 2':'Team 2'}</div>
              <Select value={b} onChange={setB} options={options} placeholder="Choose..."/>
            </div>
            <div className="md:col-span-1 grid grid-cols-2 gap-2">
              <div><div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Date</div><TextInput type="date" value={date} onChange={setDate}/></div>
              <div><div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Time</div><TextInput type="time" value={time} onChange={setTime}/></div>
            </div>
            <div className="md:col-span-4"><Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4"/> Add Fixture</Button></div>
          </form>
        </Card>

        {list.length===0 ? <Card className="p-5 text-center text-zinc-500">No fixtures yet.</Card> : (
          <div className="space-y-3">
            {list.map(f=>(
              <Card key={f.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]} <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600">{f.mode}</span></div>
                  <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                </div>
                <Button variant="ghost" onClick={()=>remove(f.id)} title="Remove"><X className="w-4 h-4"/></Button>
              </Card>
            ))}
          </div>
        )}
      </>
    )}
  </div>);
};

/* ---------- Scoring helpers ---------- */
const nextPoint=(p)=>({0:15,15:30,30:40}[p]??(p===40?"Ad":p==="Ad"?"Game":p));
function computeGameWin(a,b){if(a==="Game")return"A";if(b==="Game")return"B";if(a===40&&b==="Ad")return null;if(b===40&&a==="Ad")return null;return null}
function advancePoint(a,b,who){let pA=a,pB=b;if(who===0){if(pA===40&&pB===40){pA="Ad"}else if(pA==="Ad"){pA="Game"}else if(pB==="Ad"){pB=40}else{pA=nextPoint(pA)}}else{if(pA===40&&pB===40){pB="Ad"}else if(pB==="Ad"){pB="Game"}else if(pA==="Ad"){pA=40}else{pB=nextPoint(pB)}}return[pA,pB]}
function makeEmptySet(){return{gamesA:0,gamesB:0,tieA:0,tieB:0,tie:false,finished:false,tieStart:null}}
function setOver(s){if(s.tie){if((s.tieA>=7||s.tieB>=7)&&Math.abs(s.tieA-s.tieB)>=2)return true;return false}else{const a=s.gamesA,b=s.gamesB;if((a>=6||b>=6)&&Math.abs(a-b)>=2)return true;if(a===7||b===7)return true;return false}}
function winnerSets(sets){let A=0,B=0;for(const s of sets){if(!s.finished)continue;if(s.tie){if(s.tieA>s.tieB)A++;else if(s.tieB>s.tieA)B++;}else{if(s.gamesA>s.gamesB)A++;else if(s.gamesB>s.gamesA)B++;}}return{A,B}}

/* ---------- Scoring ---------- */
function Scoring({config,onAbort,onComplete}){
  const {sides,rule,bestOf,gamesTarget,startingServer}=config;
  const effectiveBestOf=rule==='bestOfSets'?bestOf:(rule==='regular'?3:1);
  const [points,setPoints]=useState([0,0]);
  const [sets,setSets]=useState([makeEmptySet()]);
  const [server,setServer]=useState(startingServer||0);
  const [flipped,setFlipped]=useState(false);
  const {A:setsA,B:setsB}=winnerSets(sets);
  const targetSets=Math.floor(effectiveBestOf/2)+1;
  const currentSet=sets[sets.length-1];
  const gameTargetMode=rule==='firstToGames';
  const matchDone=(()=>{if(gameTargetMode)return currentSet.finished&&(currentSet.gamesA===gamesTarget||currentSet.gamesB===gamesTarget);return(setsA===targetSets||setsB===targetSets)})();
  const tiebreakServer=()=>{if(!currentSet.tie)return server;const tb=currentSet.tieA+currentSet.tieB;const start=currentSet.tieStart??server;if(tb===0)return start;const block=Math.floor((tb-1)/2)%2;return block===0?1-start:start};
  const recordResult=async()=>{const scoreline=sets.filter(s=>s.finished).map(s=>s.tie?`${s.gamesA}-${s.gamesB}(${Math.max(s.tieA,s.tieB)})`:`${s.gamesA}-${s.gamesB}`).join(" ");const winner=setsA>setsB?sides[0]:setsB>setsA?sides[1]:(currentSet.gamesA>currentSet.gamesB?sides[0]:sides[1]);const payload={id:crypto.randomUUID(),sides,rule,bestOf:effectiveBestOf,gamesTarget,finishedAt:Date.now(),scoreline,winner};await apiMatchesAdd(payload);onComplete()};
  const startNextGameRotateServer=()=>setServer(p=>1-p);
  const pointTo=(logical)=>{
    if(matchDone)return;
    const who=flipped?1-logical:logical;
    if(currentSet.tie){
      const ns=[...sets];const so={...currentSet};
      if(who===0)so.tieA++;else so.tieB++;
      if(setOver(so))so.finished=true;
      ns[ns.length-1]=so;setSets(ns);
      if(so.finished){ if(!gameTargetMode&&(sets.length<effectiveBestOf))setSets(prev=>[...prev,makeEmptySet()]); startNextGameRotateServer() }
      return;
    }
    let [a,b]=advancePoint(points[0],points[1],who); setPoints([a,b]);
    const gw=computeGameWin(a,b); if(!gw) return;
    const ns=[...sets]; const so={...currentSet};
    if(gw==="A")so.gamesA++; else so.gamesB++;
    setPoints([0,0]);
    if(gameTargetMode){ if(so.gamesA===gamesTarget||so.gamesB===gamesTarget){ so.finished=true } }
    else { if(so.gamesA===6&&so.gamesB===6){ so.tie=true; so.tieStart=server } else if(setOver(so)){ so.finished=true } }
    ns[ns.length-1]=so; setSets(ns); startNextGameRotateServer();
    if(so.finished&&!gameTargetMode){ const {A,B}=winnerSets(ns); if(A<targetSets&&B<targetSets) setSets(prev=>[...prev,makeEmptySet()]) }
  };
  const undoPoint=()=>setPoints([0,0]);
  useEffect(()=>{ if(matchDone) recordResult() },[setsA,setsB,currentSet.finished]);
  const leftName=flipped?sides[1]:sides[0]; const rightName=flipped?sides[0]:sides[1];
  const leftIsServer=(flipped?1-tiebreakServer():tiebreakServer())===0; const rightIsServer=!leftIsServer;
  return (<div className="max-w-4xl mx-auto p-6">
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" onClick={onAbort}><ChevronLeft className="w-5 h-5"/> Quit</Button>
      <h2 className="text-xl font-bold">Scoring • {sides[0]} vs {sides[1]}</h2>
      <div className="ml-auto text-sm text-zinc-600 dark:text-zinc-300"><span>{rule==='firstToGames'?`First to ${gamesTarget} games`:rule==='bestOfSets'?`Best of ${effectiveBestOf} sets`:`Regular (Best of 3)`}</span></div>
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

/* ---------- Results ---------- */
const Results=({onBack})=>{
  const [list,setList]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{ let alive=true; (async()=>{ const data=await apiMatchesList(); if(alive){ setList(data); setLoading(false) } })();
    const iv=setInterval(async()=>{ const data=await apiMatchesList(); if(alive) setList(data) },5000);
    return()=>{ alive=false; clearInterval(iv) } },[]);
  const clearAll=async()=>{ if(!confirm('Clear all results for everyone?')) return; await apiMatchesClear(); setList([]) };
  const exportCSV=()=>{
    if(!list.length) return;
    const headers=['Date','Side A','Side B','Winner','Rule','BestOf','GamesTarget','Scoreline'];
    const rows=list.map(m=>[new Date(m.finishedAt).toLocaleString(),m.sides[0],m.sides[1],m.winner,m.rule,m.bestOf,m.gamesTarget??'',m.scoreline]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`tennis_results_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const exportPDF=()=>{
    if(!list.length)return; const doc=new jsPDF(); doc.setFontSize(14); doc.text('Tennis Match Results',14,16); doc.setFontSize(10);
    let y=24; const lh=6; const addLine=t=>{doc.text(t,14,y); y+=lh; if(y>280){doc.addPage(); y=20}};
    list.forEach((m,i)=>{ addLine(`${i+1}. ${new Date(m.finishedAt).toLocaleString()}`); addLine(`   ${m.sides[0]} vs ${m.sides[1]} — Winner: ${m.winner}`); addLine(`   Rule: ${m.rule}${m.bestOf?`, Best of ${m.bestOf}`:''}${m.gamesTarget?`, First to ${m.gamesTarget} games`:''}`); addLine(`   Score: ${m.scoreline}`); y+=2 });
    doc.save(`tennis_results_${Date.now()}.pdf`);
  };
  return(<div className="max-w-4xl mx-auto p-6">
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5"/> Back</Button>
      <h2 className="text-xl font-bold">Results</h2>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" onClick={exportCSV} title="Export CSV"><Download className="w-4 h-4"/> CSV</Button>
        <Button variant="secondary" onClick={exportPDF} title="Export PDF"><FileDown className="w-4 h-4"/> PDF</Button>
        <Button variant="secondary" onClick={clearAll}>Clear All</Button>
      </div>
    </div>
    {loading?(<Card className="p-6 text-center text-zinc-500">Loading…</Card>):list.length===0?(<Card className="p-6 text-center text-zinc-500">No completed matches yet.</Card>):(<div className="space-y-3">{list.map(m=>(<Card key={m.id} className="p-4 flex items-center gap-4"><div className="flex-1"><div className="font-semibold">{m.sides[0]} vs {m.sides[1]}</div><div className="text-sm text-zinc-500">{new Date(m.finishedAt).toLocaleString()}</div></div><div className="text-center"><div className="text-sm uppercase tracking-wide text-zinc-400">Winner</div><div className="font-semibold">{m.winner}</div></div><div className="ml-6 text-lg font-mono">{m.scoreline}</div></Card>))}</div>)}
  </div>);
};

/* ---------- Match Config ---------- */
function MatchConfig({ onBack, onStartScoring }){
  const [players,setPlayers]=useState({singles:[],doubles:[]})
  useEffect(()=>{ let alive=true; (async()=>{ try{ const p=await apiPlayersGet(); if(alive) setPlayers(p) }catch{} })(); return ()=>{alive=false} },[])
  const [mode,setMode]=useState("singles"); const [p1,setP1]=useState(""); const [p2,setP2]=useState("");
  const [rule,setRule]=useState("regular"); const [gamesTarget,setGamesTarget]=useState("6"); const [bestOf,setBestOf]=useState("3");
  const opts = mode==='singles'? players.singles : players.doubles;
  const canStart = p1&&p2&&p1!==p2&&((rule==="firstToGames"&&Number(gamesTarget)>=1&&Number(gamesTarget)<=6)||(rule==="bestOfSets"&&Number(bestOf)>=1&&Number(bestOf)<=3)||(rule==="regular"));
  const start=()=> onStartScoring({mode,sides:[p1,p2],rule,gamesTarget:Number(gamesTarget),bestOf:Number(bestOf),createdAt:Date.now(),startingServer:0})
  return (<div className="max-w-3xl mx-auto p-6">
    <div className="flex items-center gap-3 mb-6"><Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5"/> Back</Button><h2 className="text-xl font-bold">Start a Match</h2></div>
    <Card className="p-6 space-y-6">
      <div><SectionTitle icon={Users}>Match Type</SectionTitle><div className="flex gap-6"><Radio name="mode" value="singles" checked={mode==='singles'} onChange={setMode} label="Singles"/><Radio name="mode" value="doubles" checked={mode==='doubles'} onChange={setMode} label="Doubles"/></div></div>
      <div><SectionTitle icon={Users}>Select Players</SectionTitle><div className="grid md:grid-cols-2 gap-4">
        <div><div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{mode==='singles'?'Player 1':'Team 1'}</div><Select value={p1} onChange={setP1} options={opts} placeholder="Choose..."/></div>
        <div><div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{mode==='singles'?'Player 2':'Team 2'}</div><Select value={p2} onChange={setP2} options={opts} placeholder="Choose..."/></div>
      </div></div>
      <div><SectionTitle icon={ListChecks}>Winning Criteria</SectionTitle><div className="space-y-4">
        <label className="flex items-start gap-3"><input type="radio" name="rule" value="firstToGames" checked={rule==='firstToGames'} onChange={(e)=>setRule(e.target.value)} className="mt-1"/><div><div className="font-medium">First to N Games</div><div className="text-sm text-zinc-600 dark:text-zinc-400">Any player/team reaching specified number of games (1–6).</div>{rule==='firstToGames'&&(<div className="mt-3 w-40"><TextInput type="number" value={gamesTarget} onChange={setGamesTarget} min={1} max={6} placeholder="Enter 1–6"/></div>)}</div></label>
        <label className="flex items-start gap-3"><input type="radio" name="rule" value="regular" checked={rule==='regular'} onChange={(e)=>setRule(e.target.value)} className="mt-1"/><div><div className="font-medium">Regular Match</div><div className="text-sm text-zinc-600 dark:text-zinc-400">Sets to 6 (win by 2), tie-break to 7 at 6–6, best of 3 default.</div></div></label>
        <label className="flex items-start gap-3"><input type="radio" name="rule" value="bestOfSets" checked={rule==='bestOfSets'} onChange={(e)=>setRule(e.target.value)} className="mt-1"/><div><div className="font-medium">Number of Sets</div><div className="text-sm text-zinc-600 dark:text-zinc-400">Choose best-of-N sets (1–3).</div>{rule==='bestOfSets'&&(<div className="mt-3 w-40"><Select value={bestOf} onChange={setBestOf} options={['1','3']} placeholder="Select 1 or 3"/></div>)}</div></label>
      </div></div>
      <div className="pt-2"><Button onClick={start} disabled={!canStart}><Play className="w-4 h-4"/> Start</Button></div>
    </Card>
  </div>)
}

/* ---------- Admin app shell ---------- */
function AdminApp(){
  const [view,setView]=useState('landing');
  const [cfg,setCfg]=useState(null);
  const to=v=>setView(v);
  return(<div className="app-bg"><div className="max-w-6xl mx-auto py-8">
    <AnimatePresence mode="wait">
      {view==='landing'&&(<motion.div key="landing" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
        <Landing onStart={()=>to('config')} onResults={()=>to('results')} onSettings={()=>to('settings')} onFixtures={()=>to('fixtures')}/>
      </motion.div>)}
      {view==='settings'&&(<motion.div key="settings" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><Settings onBack={()=>to('landing')}/></motion.div>)}
      {view==='fixtures'&&(<motion.div key="fixtures" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><Fixtures onBack={()=>to('landing')}/></motion.div>)}
      {view==='config'&&(<motion.div key="config" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><MatchConfig onBack={()=>to('landing')} onStartScoring={(c)=>{setCfg(c);to('scoring')}}/></motion.div>)}
      {view==='scoring'&&cfg&&(<motion.div key="scoring" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><Scoring config={cfg} onAbort={()=>to('landing')} onComplete={()=>to('results')}/></motion.div>)}
      {view==='results'&&(<motion.div key="results" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}><Results onBack={()=>to('landing')}/></motion.div>)}
    </AnimatePresence>
  </div><footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} Lawn Tennis Scoring</footer></div>)
}

/* ---------- Root router ---------- */
export default function Root(){
  const path = typeof window!=='undefined' ? window.location.pathname : '/';
  if (path.startsWith('/viewer')) return <Viewer/>;
  return <AdminApp/>;
}
