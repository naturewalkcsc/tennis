import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Play, Settings as SettingsIcon, ListChecks, Users, User2,
  ChevronLeft, Plus, Trash2, ArrowLeftRight, Download, FileDown, Shuffle,
  CalendarPlus, RefreshCw, X
} from "lucide-react";
import { jsPDF } from "jspdf";

/** Hardcourt theme is applied via .app-bg in index.css */
const LS_THEME="lt_theme", LS_MATCHES_FALLBACK="lt_matches_fallback", LS_PLAYERS_DRAFT="lt_players_draft";
const readLS=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f}catch{return f}}, writeLS=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const buster=()=>'?t='+Date.now();

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

const Card=({className="",children})=>(<div className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200/60 dark:border-zinc-800/80 ${className}`}>{children}</div>);
const Button=({children,onClick,variant="primary",className="",disabled,title,type="button"})=>{
  const base="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-base font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const styles={
    primary:"bg-green-600 hover:bg-green-700 text-white focus:ring-green-400",
    secondary:"bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 focus:ring-zinc-400",
    ghost:"bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-300",
    danger:"bg-red-600 hover:bg-red-700 text-white focus:ring-red-400"
  }[variant];
  return(<button type={type} title={title} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${disabled?"opacity-50 cursor-not-allowed":""} ${className}`}>{children}</button>)
};
const Radio=({name,value,checked,onChange,label})=>(<label className="flex items-center gap-3 cursor-pointer select-none"><input type="radio" name={name} value={value} checked={checked} onChange={(e)=>onChange(e.target.value)} className="w-4 h-4"/><span className="text-sm text-zinc-800 dark:text-zinc-200">{label}</span></label>);
const Select=({value,onChange,options,placeholder})=>(<select value={value} onChange={(e)=>onChange(e.target.value)} className="w-full mt-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"><option value="" disabled>{placeholder}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>);
const TextInput=({value,onChange,placeholder,type="text",min,max})=>(<input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} min={min} max={max} className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"/>);
const SectionTitle=({children,icon:Icon})=>(<div className="flex items-center gap-2 mb-3">{Icon?<Icon className="w-5 h-5 text-zinc-500"/>:null}<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{children}</h3></div>);

const GlobalBadge=()=>{const [on,setOn]=useState(false);useEffect(()=>{let alive=true;(async()=>{const ok=await apiStatus();if(alive)setOn(ok)})();return()=>{alive=false}},[]);return(<span className={`ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs ${on?'bg-emerald-100 text-emerald-700':'bg-zinc-200 text-zinc-600'}`} title={on?'Global sync: ON':'Global sync: OFF'}>{on?'GLOBAL: ON':'GLOBAL: OFF'}</span>)};
const ThemeToggle=()=>{const [dark,setDark]=useState(()=>readLS(LS_THEME,false));useEffect(()=>{document.documentElement.classList.toggle("dark",dark);writeLS(LS_THEME,dark)},[dark]);return(<Button variant="ghost" onClick={()=>setDark(d=>!d)} className="!px-3 !py-2" title="Toggle theme">{dark?"🌙":"☀️"}</Button>)};

// ---- Landing (gated for viewer) ----
const Landing=({onStart,onResults,onSettings,onFixtures,isViewer})=>{
  const Tile=({title,subtitle,icon:Icon,action,imgUrl})=>(
    <motion.button onClick={action} whileHover={{y:-2,scale:1.01}} whileTap={{scale:0.99}}
      className="w-full md:w-80 aspect-[5/3] rounded-2xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left">
      <div className="h-2/3 w-full relative">{imgUrl?<img src={imgUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/>:null}</div>
      <div className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700"><Icon className="w-5 h-5"/></div>
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</div>
        </div>
      </div>
    </motion.button>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-green-600"/>
          <h1 className="text-2xl font-bold">RNW Tennis Tournament 2025</h1>
          {isViewer && <span className="ml-2 text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-600">Viewer</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onFixtures}><CalendarPlus className="w-5 h-5"/> Fixtures</Button>
          {!isViewer && <Button variant="ghost" onClick={onSettings}><SettingsIcon className="w-5 h-5"/> Settings</Button>}
          <ThemeToggle/>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {!isViewer && (
          <Tile
            title="Start a Match"
            subtitle="Singles or Doubles • Quick setup"
            icon={Play}
            action={onStart}
            imgUrl="https://upload.wikimedia.org/wikipedia/commons/3/3e/Tennis_Racket_and_Balls.jpg"
          />
        )}
        <Tile
          title="Show Results"
          subtitle="Winners, scores • Export"
          icon={ListChecks}
          action={onResults}
          imgUrl="https://www.wikihow.com/Keep-Score-for-Tennis%23/Image:Keep-Score-for-Tennis-Step-1-Version-3.jpg"
        />
        {!isViewer && (
          <Tile
            title="Manage Players"
            subtitle="Singles players & Doubles pairs"
            icon={Users}
            action={onSettings}
            imgUrl="https://news.cgtn.com/news/3563444e7a45544f31556a4e306b7a4d786b7a4e31457a6333566d54/img/2f296c0a4b63418486e92f07ff1d7ad1/2f296c0a4b63418486e92f07ff1d7ad1.jpg"
          />
        )}
      </div>
    </div>
  );
};

// ---- Settings (unchanged) ----
const Settings=({onBack})=>{ /* ... your existing Settings code from last working version ... */ };

// ---- Fixtures: add readOnly mode ----
const Fixtures=({onBack, readOnly=false})=>{
  const [players,setPlayers]=useState({singles:[],doubles:[]});
  const [mode,setMode]=useState('singles');
  const [a,setA]=useState('');const [b,setB]=useState('');
  const [date,setDate]=useState('');const [time,setTime]=useState('');
  const [list,setList]=useState([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true;(async()=>{
    try{const p=await apiPlayersGet();if(alive)setPlayers(p)}catch{}
    try{const fx=await apiFixturesList();if(alive)setList(fx)}catch{}finally{if(alive)setLoading(false)}
  })();return()=>{alive=false}},[]);
  const options=mode==='singles'?players.singles:players.doubles;
  const canAdd=a&&b&&a!==b&&date&&time;
  const add=async(e)=>{e.preventDefault();const start=new Date(`${date}T${time}:00`).getTime();const payload={id:crypto.randomUUID(),mode,sides:[a,b],start};await apiFixturesAdd(payload);setList(prev=>[...prev,payload].sort((x,y)=>x.start-y.start));setA('');setB('');setDate('');setTime('')};
  const remove=async(id)=>{await apiFixturesRemove(id);setList(prev=>prev.filter(f=>f.id!==id))};
  const clear=async()=>{if(!confirm('Clear ALL fixtures?'))return;await apiFixturesClear();setList([])};
  const refresh=async()=>{const fx=await apiFixturesList();setList(fx)};
  return(
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5"/> Back</Button>
        <h2 className="text-xl font-bold">Fixtures</h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" onClick={refresh}><RefreshCw className="w-4 h-4"/> Refresh</Button>
          {!readOnly && <Button variant="secondary" onClick={clear}>Clear All</Button>}
        </div>
      </div>

      {loading ? <Card className="p-5 text-center text-zinc-500">Loading…</Card> : (
        <>
          {!readOnly && (
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
                <div className="md:col-span-4">
                  <Button type="submit" disabled={!canAdd}><CalendarPlus className="w-4 h-4"/> Add Fixture</Button>
                </div>
              </form>
            </Card>
          )}

          {list.length===0
            ? <Card className="p-5 text-center text-zinc-500">No fixtures yet.</Card>
            : <div className="space-y-3">
                {list.map(f=>(
                  <Card key={f.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="font-semibold">
                        {f.sides?.[0]} vs {f.sides?.[1]}
                        <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600">{f.mode}</span>
                      </div>
                      <div className="text-sm text-zinc-500">{new Date(f.start).toLocaleString()}</div>
                    </div>
                    {!readOnly && (
                      <Button variant="ghost" onClick={()=>remove(f.id)} title="Remove"><X className="w-4 h-4"/></Button>
                    )}
                  </Card>
                ))}
              </div>
          }
        </>
      )}
    </div>
  );
};

// ---- Scoring / Results (unchanged) ----
/* keep your existing Scoring and Results exactly as in your last working code */

export default function App(){
  const [view,setView]=useState('landing');
  const [cfg,setCfg]=useState(null);
  const isViewer = typeof window !== 'undefined' && window.location.pathname.startsWith('/viewer');
  const to=v=>setView(v);

  return(
    <div className="app-bg">
      <div className="max-w-6xl mx-auto py-8">
        <AnimatePresence mode="wait">
          {view==='landing'&&(
            <motion.div key="landing" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Landing
                isViewer={isViewer}
                onStart={()=>to('config')}
                onResults={()=>to('results')}
                onSettings={()=>to('settings')}
                onFixtures={()=>to('fixtures')}
              />
            </motion.div>
          )}

          {!isViewer && view==='settings'&&(
            <motion.div key="settings" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Settings onBack={()=>to('landing')}/>
            </motion.div>
          )}

          {view==='fixtures'&&(
            <motion.div key="fixtures" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Fixtures readOnly={isViewer} onBack={()=>to('landing')}/>
            </motion.div>
          )}

          {!isViewer && view==='config'&&(
            <motion.div key="config" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <MatchConfig onBack={()=>to('landing')} onStartScoring={(c)=>{setCfg(c);to('scoring')}}/>
            </motion.div>
          )}

          {!isViewer && view==='scoring'&& cfg &&(
            <motion.div key="scoring" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Scoring config={cfg} onAbort={()=>to('landing')} onComplete={()=>to('results')}/>
            </motion.div>
          )}

          {view==='results'&&(
            <motion.div key="results" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              <Results onBack={()=>to('landing')}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} RNW CSC
      </footer>
    </div>
  );
}

// ---- Keep your existing MatchConfig, Scoring, Results, Settings implementations here ----

