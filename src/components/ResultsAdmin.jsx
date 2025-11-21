// src/components/ResultsAdmin.jsx
import React, { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

/**
 * ResultsAdmin.jsx
 * Self-contained results/fixtures view for admin.
 *
 * Props:
 *  - onBack: function to call when Back pressed
 *
 * Notes:
 *  - talks to /api/fixtures and /api/matches directly (same endpoints used elsewhere)
 *  - uses simple local Card / Button primitives so you don't need extra imports
 */

const buster = () => `?t=${Date.now()}`;

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", type = "button", disabled }) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium";
  const styles = {
    primary: "bg-green-600 hover:bg-green-700 text-white",
    secondary: "bg-zinc-100 hover:bg-zinc-200",
    ghost: "hover:bg-zinc-100"
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

export default function ResultsAdmin({ onBack }) {
  const [fixtures, setFixtures] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchFixtures() {
    try {
      const res = await fetch("/api/fixtures" + buster(), { cache: "no-store" });
      if (!res.ok) throw new Error("fixtures fetch failed");
      return await res.json();
    } catch (e) {
      console.error("fetchFixtures:", e);
      return [];
    }
  }

  async function fetchMatches() {
    try {
      const res = await fetch("/api/matches" + buster(), { cache: "no-store" });
      if (!res.ok) throw new Error("matches fetch failed");
      return await res.json();
    } catch (e) {
      console.error("fetchMatches:", e);
      return [];
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [fx, ms] = await Promise.all([fetchFixtures(), fetchMatches()]);
        if (!alive) return;
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const iv = setInterval(async () => {
      try {
        const [fx, ms] = await Promise.all([fetchFixtures(), fetchMatches()]);
        setFixtures(Array.isArray(fx) ? fx : []);
        setMatches(Array.isArray(ms) ? ms : []);
      } catch (e) {
        // ignore transient errors
      }
    }, 8000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // derive lists
  const active = fixtures.filter((f) => f.status === "active");
  const upcoming = fixtures.filter((f) => !f.status || f.status === "upcoming");
  const completedFixtures = fixtures.filter((f) => f.status === "completed");
  const completed = [
    ...completedFixtures,
    ...matches.map((m) => ({
      id: m.id,
      sides: m.sides,
      finishedAt: m.finishedAt,
      scoreline: m.scoreline,
      winner: m.winner,
      mode: m.mode || "singles",
    })),
  ].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={() => typeof onBack === "function" ? onBack() : window.history.back()}>
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <h2 className="text-xl font-bold">Results</h2>
      </div>

      {loading ? (
        <Card className="p-6 text-center text-zinc-500">Loading…</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Active</div>

            {active.length ? (
              active.map((f) => (
                <div key={f.id} className="py-2 border-b last:border-0 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="font-medium">{f.sides?.[0]} vs {f.sides?.[1]}</div>
                  <div className="ml-auto text-sm text-zinc-500">{f.start ? new Date(f.start).toLocaleString() : ""}</div>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">No active match.</div>
            )}

            <div className="text-lg font-semibold mt-5 mb-2">Upcoming</div>
            {upcoming.length ? (
              upcoming.map((f) => (
                <div key={f.id} className="py-2 border-b last:border-0">
                  <div className="font-medium">
                    {f.sides?.[0]} vs {f.sides?.[1]}
                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">{f.mode || "singles"}{f.category ? ` • ${f.category}` : ""}{f.type ? ` • ${f.type}` : ""}</span>
                  </div>
                  <div className="text-sm text-zinc-500">{f.start ? new Date(f.start).toLocaleString() : ""}</div>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">No upcoming fixtures.</div>
            )}
          </Card>

          <Card className="p-5">
            <div className="text-lg font-semibold mb-3">Completed</div>
            {completed.length ? (
              completed.map((m) => (
                <div key={(m.id || "") + String(m.finishedAt || "")} className="py-2 border-b last:border-0">
                  <div className="font-medium">{m.sides?.[0]} vs {m.sides?.[1]}</div>
                  <div className="text-sm text-zinc-500">{m.finishedAt ? new Date(m.finishedAt).toLocaleString() : ""}</div>
                  <div className="mt-1 text-sm">
                    <span className="uppercase text-zinc-400 text-xs">Winner</span>{" "}
                    <span className="font-semibold">{m.winner || ""}</span>{" "}
                    <span className="ml-3 font-mono">{m.scoreline || ""}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-zinc-500">No results yet.</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
