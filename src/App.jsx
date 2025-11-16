// Replace your existing Fixtures component with this code
const Fixtures = ({ onBack }) => {
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [mode, setMode] = useState("singles"); // 'singles' | 'doubles'
  const [category, setCategory] = useState(""); // e.g. "Men's (A) Singles"
  const [matchType, setMatchType] = useState("Qualifier"); // Qualifier / Semifinal / Final
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [fixtures, setFixtures] = useState([]);
  const [loadingFixtures, setLoadingFixtures] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await apiPlayersGet(); // must exist in your project
        if (!alive) return;
        setPlayers(p || { singles: {}, doubles: {} });
      } catch (e) {
        console.warn("players load failed", e);
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
        const fx = await apiFixturesList();
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.warn("fixtures load failed", e);
        setFixtures([]);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const getCategoryOptions = () => {
    // players.singles and players.doubles are objects keyed by category name -> array
    const src = mode === "singles" ? (players.singles || {}) : (players.doubles || {});
    // return array of categories; keep order if your app has an order
    return Object.keys(src);
  };

  const getSideOptions = (cat) => {
    if (!cat) return [];
    const src = (mode === "singles" ? (players.singles || {}) : (players.doubles || {}));
    const arr = src[cat] || [];
    // return array of strings (player names or pair labels)
    return arr;
  };

  const canAdd = () => {
    return category && sideA && sideB && sideA !== sideB && date && time;
  };

  const addFixture = async (e) => {
    e && e.preventDefault();
    if (!canAdd()) return alert("Please fill category, both sides and date/time (and sides must be different).");
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = {
      id: crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2),
      mode,
      category,
      matchType,
      sides: [sideA, sideB],
      start,
      status: "upcoming"
    };
    try {
      await apiFixturesAdd(payload); // must be your implementation (localStorage/Upstash)
      setFixtures(prev => [...prev, payload].sort((a,b)=> (a.start||0)-(b.start||0)));
      // reset simple fields
      setSideA("");
      setSideB("");
      setDate("");
      setTime("");
      alert("Fixture added");
    } catch (err) {
      console.error("fixture add failed", err);
      alert("Failed to add fixture: " + (err?.message || err));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button className="btn" onClick={onBack}><ChevronLeft className="w-5 h-5"/> Back</button>
        <h2 className="text-xl font-bold">Fixtures</h2>
      </div>

      <div className="card p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">Schedule a Match</h3>

        <form onSubmit={addFixture} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-1">
            <div className="text-sm text-zinc-600 mb-1">Type</div>
            <div className="flex gap-4">
              <label><input type="radio" name="mode" value="singles" checked={mode==='singles'} onChange={()=>{ setMode('singles'); setCategory(''); setSideA(''); setSideB(''); }} /> Singles</label>
              <label><input type="radio" name="mode" value="doubles" checked={mode==='doubles'} onChange={()=>{ setMode('doubles'); setCategory(''); setSideA(''); setSideB(''); }} /> Doubles</label>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-zinc-600 mb-1">Category</div>
            <select className="w-full p-3 rounded border" value={category} onChange={e=>{ setCategory(e.target.value); setSideA(''); setSideB(''); }}>
              <option value="">Choose category...</option>
              {getCategoryOptions().map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="md:col-span-1">
            <div className="text-sm text-zinc-600 mb-1">Match Type</div>
            <select className="w-full p-3 rounded border" value={matchType} onChange={e=>setMatchType(e.target.value)}>
              <option>Qualifier</option>
              <option>Semifinal</option>
              <option>Final</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <div className="text-sm text-zinc-600 mb-1">Date</div>
            <input className="w-full p-3 rounded border" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          </div>

          <div className="md:col-span-1">
            <div className="text-sm text-zinc-600 mb-1">Time</div>
            <input className="w-full p-3 rounded border" type="time" value={time} onChange={e=>setTime(e.target.value)}/>
          </div>

          <div className="md:col-span-3">
            <div className="text-sm text-zinc-600 mb-1">Side A</div>
            <select className="w-full p-3 rounded border" value={sideA} onChange={e=>setSideA(e.target.value)}>
              <option value="">Choose...</option>
              {category && getSideOptions(category).map((s,idx)=> <option key={idx} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="md:col-span-3">
            <div className="text-sm text-zinc-600 mb-1">Side B</div>
            <select className="w-full p-3 rounded border" value={sideB} onChange={e=>setSideB(e.target.value)}>
              <option value="">Choose...</option>
              {category && getSideOptions(category).map((s,idx)=> <option key={idx} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="md:col-span-6">
            <button type="submit" className="btn" disabled={!canAdd()}><CalendarPlus className="inline-block mr-2"/> Add Fixture</button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Upcoming fixtures</h3>
        {loadingFixtures ? <div>Loading…</div> : (
          fixtures.length === 0 ? <div className="card p-4">No fixtures yet.</div> :
          fixtures.map(f => (
            <div key={f.id} style={{ background: "white", padding: 12, borderRadius: 10, border: "1px solid #e6edf8", marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{(f.sides||[]).join(" vs ")}</div>
              <div style={{ color: "#6b7280" }}>{f.matchType} • {new Date(f.start).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

