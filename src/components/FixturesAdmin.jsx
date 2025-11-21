import React, { useEffect, useState } from "react";
import { CalendarPlus, ChevronLeft, RefreshCw, X } from "lucide-react";
import { MATCH_TYPES, labelForType } from "./fixtures_helpers";

/*
  Simplified FixturesAdmin — extracts scheduling UI from your big App.jsx
  Adds match type select (qualifier/semifinal/final) when creating/editing fixtures.
  Expects API endpoints: /api/fixtures (GET/POST) same as before.
*/

const buster = () => `?t=${Date.now()}`;

async function apiFixturesList() {
  const res = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!res.ok) throw new Error("fixtures-list-failed");
  return await res.json();
}
async function apiFixturesAdd(payload) {
  const res = await fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "add", payload }) });
  if (!res.ok) throw new Error("fixtures-add-failed");
}
async function apiFixturesUpdate(id, patch) {
  const res = await fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "update", id, patch }) });
  if (!res.ok) throw new Error("fixtures-update-failed");
}
async function apiFixturesRemove(id) {
  const res = await fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "remove", id }) });
  if (!res.ok) throw new Error("fixtures-remove-failed");
}

export default function FixturesAdmin({ onBack }) {
  const [list, setList] = useState([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [matchType, setMatchType] = useState("qualifier");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editState, setEditState] = useState({ a: "", b: "", date: "", time: "", type: "qualifier" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (alive) setList(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.warn(e);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const canAdd = a && b && a !== b && date && time;

  const add = async (e) => {
    e && e.preventDefault();
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = { id: crypto.randomUUID(), sides: [a,b], start, status: "upcoming", type: matchType };
    await apiFixturesAdd(payload);
    setList(prev => [...prev, payload].sort((x,y)=>(x.start||0)-(y.start||0)));
    setA(""); setB(""); setDate(""); setTime(""); setMatchType("qualifier");
  };

  const beginEdit = (fx) => {
    setEditingId(fx.id);
    const dt = fx.start ? new Date(fx.start) : new Date();
    setEditState({ a: fx.sides?.[0]||"", b: fx.sides?.[1]||"", date: dt.toISOString().slice(0,10), time: dt.toTimeString().slice(0,5), type: fx.type || "qualifier" });
  };

  const saveEdit = async (id) => {
    const { a: A, b: B, date: D, time: T, type } = editState;
    if (!A || !B || A===B || !D || !T) { alert("Provide valid fields"); return; }
    const start = new Date(`${D}T${T}:00`).getTime();
    const patch = { sides: [A,B], start, type };
    await apiFixturesUpdate(id, patch);
    setList(prev => prev.map(f => f.id===id ? { ...f, ...patch } : f).sort((x,y)=>(x.start||0)-(y.start||0)));
    setEditingId(null);
  };

  const remove = async (id) => {
    if (!confirm("Remove this fixture?")) return;
    await apiFixturesRemove(id);
    setList(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack}>◀ Back</button>
        <h2 className="text-xl font-bold">Fixtures</h2>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow border mb-6">
        <div className="font-semibold mb-3">Schedule a Match</div>
        <form onSubmit={add} className="grid md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm mb-1">Player/Team A</div>
            <input value={a} onChange={e=>setA(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <div className="text-sm mb-1">Player/Team B</div>
            <input value={b} onChange={e=>setB(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <div className="text-sm mb-1">Date</div>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <div className="text-sm mb-1">Time</div>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
          </div>

          <div className="md:col-span-2">
            <div className="text-sm mb-1">Match Type</div>
            <select className="w-full rounded-xl border px-3 py-2" value={matchType} onChange={e=>setMatchType(e.target.value)}>
              {MATCH_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-4">
            <button type="submit" disabled={!canAdd} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white"> <CalendarPlus /> Add Fixture</button>
          </div>
        </form>
      </div>

      {loading ? <div>Loading…</div> : list.length===0 ? <div className="text-zinc-500">No fixtures yet.</div> : (
        <div className="space-y-3">
          {list.sort((x,y)=> (x.start||0)-(y.start||0)).map(f => (
            <div key={f.id} className="bg-white rounded-2xl p-4 shadow border flex items-center gap-4">
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{(f.sides||[]).join(" vs ")} <span style={{marginLeft:8, fontSize:12, padding:"2px 8px", borderRadius:8, background:"#f1f5f9"}}>{labelForType(f.type)}</span></div>
                <div style={{color:"#6b7280", fontSize:13}}>{f.winner ? `Winner: ${f.winner}` : ""}{f.scoreline ? ` • ${f.scoreline}` : ""}</div>
                <div style={{marginTop:6, color:"#6b7280"}}>{f.start ? new Date(f.start).toLocaleString() : ""}</div>
              </div>

              <div style={{display:'flex', gap:8}}>
                <button onClick={()=>beginEdit(f)} className="px-3 py-1 rounded-xl border">Edit</button>
                <button onClick={()=>remove(f.id)} className="px-3 py-1 rounded-xl border text-red-600">Remove</button>
              </div>

              {editingId === f.id && (
                <div style={{marginTop:12, borderTop:"1px dashed #e6edf3", paddingTop:12, width:"100%"}}>
                  <div className="grid md:grid-cols-4 gap-3">
                    <div><div className="text-sm mb-1">Side A</div><input value={editState.a} onChange={e=>setEditState(s=>({...s,a:e.target.value}))} className="w-full rounded-xl border px-3 py-2" /></div>
                    <div><div className="text-sm mb-1">Side B</div><input value={editState.b} onChange={e=>setEditState(s=>({...s,b:e.target.value}))} className="w-full rounded-xl border px-3 py-2" /></div>
                    <div><div className="text-sm mb-1">Date</div><input type="date" value={editState.date} onChange={e=>setEditState(s=>({...s,date:e.target.value}))} className="w-full rounded-xl border px-3 py-2" /></div>
                    <div><div className="text-sm mb-1">Time</div><input type="time" value={editState.time} onChange={e=>setEditState(s=>({...s,time:e.target.value}))} className="w-full rounded-xl border px-3 py-2" /></div>

                    <div className="md:col-span-2">
                      <div className="text-sm mb-1">Match Type</div>
                      <select className="w-full rounded-xl border px-3 py-2" value={editState.type} onChange={e=>setEditState(s=>({...s,type:e.target.value}))}>
                        {MATCH_TYPES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{marginTop:8, display:'flex', gap:8}}>
                    <button onClick={()=>saveEdit(f.id)} className="px-4 py-2 rounded-xl bg-green-600 text-white">Save</button>
                    <button onClick={()=>setEditingId(null)} className="px-4 py-2 rounded-xl border">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}