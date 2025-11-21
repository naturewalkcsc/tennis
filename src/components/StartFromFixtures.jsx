// src/components/StartFromFixtures.jsx
import React, { useEffect, useState } from "react";
import { Play, ChevronLeft } from "lucide-react";

/**
 * StartFromFixtures.jsx
 * Standalone component to start fixtures (admin).
 *
 * Props:
 *  - onBack: () => void
 *  - onStartScoring: (config) => void  // called when user starts a fixture
 *
 * Notes:
 *  - This file includes lightweight local API wrappers (same endpoints used in App.jsx)
 *  - If you already have central api helpers, replace the local wrappers with imports.
 */

/* ---------- small helpers ---------- */
const buster = () => `?t=${Date.now()}`;

/* ---------- minimal API wrappers (uses same endpoints as App.jsx) ---------- */
const apiFixturesList = async () => {
  const res = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
  if (!res.ok) throw new Error("fixtures-list-failed");
  return await res.json();
};

const apiFixturesUpdate = async (id, patch) => {
  const res = await fetch("/api/fixtures" + buster(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, patch }),
  });
  if (!res.ok) throw new Error("fixtures-update-failed");
  return await res.json();
};

/* ---------- tiny UI primitives (local) ---------- */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = "primary", className = "", type = "button", disabled }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium";
  const styles = {
    primary: "bg-green-600 hover:bg-green-700 text-white",
    secondary: "bg-zinc-100 hover:bg-zinc-200",
    ghost: "hover:bg-zinc-100",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className} ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
};

/* ------------------ Component ------------------ */
export default function StartFromFixtures({ onBack, onStartScoring }) {
  const [mode, setMode] = useState("singles");
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fx = await apiFixturesList();
        if (alive) setFixtures(Array.isArray(fx) ? fx : []);
      } catch (e) {
        console.error("Could not load fixtures", e);
        if (alive) setFixtures([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // keep a filtered list for display
  const list = fixtures.filter((f) => (f.mode || "singles") === mode && f.status !== "completed");

  const startFixture = async (fx) => {
    try {
      const now = Date.now();
      const patch = { status: "active" };
      // If fixture start is in future, update it to now so UI shows it as active
      if (fx.start > now) patch.start = now;

      // demote other actives (we do this at server but keep client in sync too)
      for (const other of fixtures) {
        if (other.id !== fx.id && other.status === "active") {
          try {
            await apiFixturesUpdate(other.id, { status: "upcoming" });
          } catch (err) {
            // ignore any per-other errors; continue
            console.warn("Failed to demote other fixture", other.id, err);
          }
        }
      }

      // mark chosen fixture active
      await apiFixturesUpdate(fx.id, patch);

      // update local copy for immediate feedback
      setFixtures((prev) => prev.map((p) => (p.id === fx.id ? { ...p, ...patch } : p)));

      if (typeof onStartScoring === "function") {
        onStartScoring({ mode: fx.mode, sides: fx.sides, startingServer: 0, fixtureId: fx.id });
      } else {
        alert("Started: " + (fx.sides?.join(" vs ") || ""));
      }
    } catch (e) {
      console.error("Start fixture failed", e);
      alert("Start failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}><ChevronLeft className="w-5 h-5" /> Back</Button>
        <h2 className="text-xl font-bold">Start Match</h2>
      </div>

      <Card className="p-5">
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="m" checked={mode === "singles"} onChange={() => setMode("singles")} />
            <span className="ml-1">Singles</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="m" checked={mode === "doubles"} onChange={() => setMode("doubles")} />
            <span className="ml-1">Doubles</span>
          </label>
        </div>

        {loading ? (
          <div className="text-zinc-500">Loading fixtures…</div>
        ) : list.length === 0 ? (
          <div className="text-zinc-500">No fixtures for {mode}.</div>
        ) : (
          <div className="space-y-3">
            {list.map((f) => (
              <Card key={f.id} className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-semibold">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="text-sm text-zinc-500">{f.start ? new Date(f.start).toLocaleString() : ""}</div>
                  {f.type && <div className="mt-1 text-xs px-2 py-0.5 inline-block rounded bg-zinc-100 text-zinc-600">Type: {f.type}</div>}
                </div>

                <Button onClick={() => startFixture(f)}><Play className="w-4 h-4" /> Start Now</Button>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
