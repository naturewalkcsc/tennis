// src/App.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import { ChevronLeft } from "lucide-react";

/*
  App.jsx - landing + Add Fixture UI (non-destructive)
  - Keeps existing tiles behavior (Start Match / Results / Manage Players)
  - Adds an Add Fixture button below tiles. Clicking opens a panel with:
      - radio: Singles / Doubles
      - select: category/player lists (loaded from /api/players or localStorage)
      - date, time controls
      - Add Fixture action (POST /api/fixtures or localStorage fallback)
  - Lightweight inline toast for success/error
*/

function Tile({ title, subtitle, src, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl overflow-hidden border shadow bg-white text-left"
      style={{ width: 320 }}
    >
      <div style={{ height: 170, position: "relative" }}>
        <img
          src={src}
          alt={title}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 6 }}>{subtitle}</div>
      </div>
    </button>
  );
}

/* --- Helpers: players + fixtures fetch (uses API if exists else localStorage fallback) --- */

async function fetchPlayers() {
  // Try your server API first
  try {
    const r = await fetch("/api/players");
    if (r.ok) {
      const j = await r.json();
      // Expecting grouped structure: { singles: {cat: [names]}, doubles: {cat: [pairs]} }
      // Or legacy: { singles: [...], doubles: [...] } -> convert to a fallback grouped format
      if (Array.isArray(j?.singles)) {
        return {
          singles: { "Women's Singles": j.singles || [] },
          doubles: { "Women's Doubles": j.doubles || [] },
        };
      }
      return { singles: j.singles || {}, doubles: j.doubles || {} };
    }
    // else fallthrough to localStorage
  } catch (e) {
    console.warn("players API fetch failed, falling back to localStorage", e);
  }

  try {
    const raw = localStorage.getItem("tennis:players");
    if (!raw) return { singles: {}, doubles: {} };
    const p = JSON.parse(raw);
    if (Array.isArray(p?.singles)) {
      return {
        singles: { "Women's Singles": p.singles || [] },
        doubles: { "Women's Doubles": p.doubles || [] },
      };
    }
    return { singles: p.singles || {}, doubles: p.doubles || {} };
  } catch (e) {
    console.error("Failed to load players from localStorage", e);
    return { singles: {}, doubles: {} };
  }
}

async function postFixture(payload) {
  // Try calling serverless route first
  try {
    const r = await fetch("/api/fixtures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.ok) {
      try {
        const j = await r.json();
        // Some APIs return {ok:true} others return the object; just return true for success
        return { ok: true, resp: j };
      } catch {
        return { ok: true };
      }
    }
    // if server responded not ok -> treat as error and fallback to localStorage
    console.warn("POST /api/fixtures returned non-OK, saving locally as fallback");
  } catch (e) {
    console.warn("POST /api/fixtures failed, saving locally as fallback", e);
  }

  // LocalStorage fallback: append to 'tennis:fixtures'
  try {
    const raw = localStorage.getItem("tennis:fixtures");
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(payload);
    localStorage.setItem("tennis:fixtures", JSON.stringify(arr));
    return { ok: true, resp: payload };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

/* --- AddFixturePanel component --- */
function AddFixturePanel({ onClose, onAdded }) {
  const [mode, setMode] = useState("singles"); // 'singles' | 'doubles'
  const [playersByCat, setPlayersByCat] = useState({ singles: {}, doubles: {} });
  const [loading, setLoading] = useState(true);
  const [catA, setCatA] = useState("");
  const [catB, setCatB] = useState("");
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState({ show: false, text: "", error: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const p = await fetchPlayers();
      if (!alive) return;
      setPlayersByCat(p);
      setLoading(false);
      // set default categories if available
      const sCats = Object.keys(p.singles || {});
      const dCats = Object.keys(p.doubles || {});
      if (sCats.length) {
        setCatA(sCats[0]);
        setCatB(sCats.length > 1 ? sCats[1] || sCats[0] : sCats[0]);
      }
      if (dCats.length && !sCats.length) {
        setCatA(dCats[0]);
        setCatB(dCats.length > 1 ? dCats[1] || dCats[0] : dCats[0]);
      }
    })();
    return () => (alive = false);
  }, []);

  useEffect(() => {
    // whenever mode or category changes, reset side selections
    setSideA("");
    setSideB("");
    const cats = mode === "singles" ? Object.keys(playersByCat.singles || {}) : Object.keys(playersByCat.doubles || {});
    if (cats.length) {
      setCatA(cats[0]);
      setCatB(cats.length > 1 ? cats[1] || cats[0] : cats[0]);
    }
  }, [mode, playersByCat]);

  const canAdd =
    !working &&
    date &&
    time &&
    sideA &&
    sideB &&
    // Ensure sides not identical
    sideA !== sideB;

  const handleAdd = async () => {
    if (!canAdd) {
      setToast({ show: true, text: "Please complete all fields and pick different sides.", error: true });
      setTimeout(() => setToast({ show: false, text: "", error: false }), 2400);
      return;
    }
    setWorking(true);
    const start = new Date(`${date}T${time}:00`).getTime();
    const payload = {
      id: crypto && crypto.randomUUID ? crypto.randomUUID() : "fx-" + Date.now(),
      mode,
      sides: [sideA, sideB],
      start,
      status: "upcoming",
      createdAt: Date.now(),
    };
    const res = await postFixture(payload);
    setWorking(false);
    if (res.ok) {
      setToast({ show: true, text: "Fixture added", error: false });
      setTimeout(() => setToast({ show: false, text: "", error: false }), 1800);
      if (onAdded) onAdded(payload);
      // optionally clear form
      setSideA("");
      setSideB("");
      setDate("");
      setTime("");
    } else {
      setToast({ show: true, text: "Failed to add fixture: " + (res.error || "unknown"), error: true });
      setTimeout(() => setToast({ show: false, text: "", error: false }), 3000);
    }
  };

  const cats = mode === "singles" ? Object.keys(playersByCat.singles || {}) : Object.keys(playersByCat.doubles || {});
  const optionsA = cats.flatMap((c) => (mode === "singles" ? (playersByCat.singles?.[c] || []).map((n) => ({ cat: c, name: n })) : (playersByCat.doubles?.[c] || []).map((n) => ({ cat: c, name: n }))));
  // We'll display grouped selects instead: first choose a category, then a player within that category
  const playersInCat = (category) => (mode === "singles" ? playersByCat.singles?.[category] || [] : playersByCat.doubles?.[category] || []);

  return (
    <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#ffffff", border: "1px solid #e6edf8", maxWidth: 960 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>Add Fixture</div>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={onClose} className="btn">Close</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Match Type</div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="radio" name="mode" value="singles" checked={mode === "singles"} onChange={() => setMode("singles")} />
              Singles
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="radio" name="mode" value="doubles" checked={mode === "doubles"} onChange={() => setMode("doubles")} />
              Doubles
            </label>
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Schedule</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: 8, borderRadius: 8, flex: 1 }} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ padding: 8, borderRadius: 8, width: 130 }} />
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Side A</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={catA} onChange={(e) => { setCatA(e.target.value); setSideA(""); }} style={{ flex: 1, padding: 8, borderRadius: 8 }}>
              {(Object.keys(mode === "singles" ? playersByCat.singles : playersByCat.doubles) || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sideA} onChange={(e) => setSideA(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8 }}>
              <option value="">Choose...</option>
              {(playersInCat(catA) || []).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Side B</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={catB} onChange={(e) => { setCatB(e.target.value); setSideB(""); }} style={{ flex: 1, padding: 8, borderRadius: 8 }}>
              {(Object.keys(mode === "singles" ? playersByCat.singles : playersByCat.doubles) || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sideB} onChange={(e) => setSideB(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8 }}>
              <option value="">Choose...</option>
              {(playersInCat(catB) || []).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => { setMode("singles"); setDate(""); setTime(""); setSideA(""); setSideB(""); }} className="btn">Reset</button>
          <button onClick={handleAdd} disabled={!canAdd || working} className="btn" style={{ background: "#10b981", color: "white" }}>
            {working ? "Adding..." : "Add Fixture"}
          </button>
        </div>
      </div>

      {toast.show && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: toast.error ? "#fee2e2" : "#ecfdf5", color: toast.error ? "#991b1b" : "#065f46" }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

/* --- Main Landing / App wrapper (keeps Start/Results/Manage tiles) --- */

export default function App() {
  const [showAddFixture, setShowAddFixture] = useState(false);
  // keep placeholders safe: these should navigate to your existing admin pages; for minimal change we keep console logs
  // If you have route/navigation logic in your app, replace these onClick handlers with the proper navigation calls.
  const handleStart = () => {
    // If you have a Start match admin view function, call it here. For minimal change we log.
    // Example: setView('start') or navigate('/start')
    console.log("Start Match clicked - integrate with your StartFromFixtures flow / routing");
    // TODO: if your app has a StartFromFixtures component, call that navigation here instead of this console.log
    alert("Start Match clicked (admin). Navigate to StartFlow in your app.");
  };
  const handleResults = () => {
    console.log("Results clicked - integrate with your Results view");
    alert("Results clicked (admin). Navigate to Results view in your app.");
  };
  const handleManage = () => {
    console.log("Manage Players clicked - integrate with your Manage view");
    alert("Manage Players clicked (admin). Navigate to Manage Players in your app.");
  };

  return (
    <div className="app-bg" style={{ minHeight: "100vh", padding: 28 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>RNW Tennis Tournament 2025</h1>
        </header>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Tile title="Start Match" subtitle="Choose from fixtures" src={imgStart} onClick={handleStart} />
          <Tile title="Results" subtitle="Active • Upcoming • Completed" src={imgScore} onClick={handleResults} />
          <Tile title="Manage Players" subtitle="Singles & Doubles" src={imgSettings} onClick={handleManage} />
        </div>

        <div style={{ marginTop: 18 }}>
          <button onClick={() => setShowAddFixture((s) => !s)} className="btn" style={{ padding: "12px 18px", display: "inline-flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <span>Fixtures</span>
          </button>

          {/* Add Fixture small button near bottom (as requested) */}
          <button
            onClick={() => setShowAddFixture((s) => !s)}
            className="btn"
            style={{ marginLeft: 12, padding: "10px 14px" }}
            title="Add Fixture"
          >
            Add Fixture
          </button>
        </div>

        {showAddFixture && (
          <div style={{ marginTop: 16 }}>
            <AddFixturePanel onClose={() => setShowAddFixture(false)} onAdded={() => { /* you can trigger refresh if needed */ }} />
          </div>
        )}
      </div>
    </div>
  );
}

