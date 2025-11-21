import React, { useState } from "react";
import AdminLogin from "./components/AdminLogin";
import Landing from "./components/Landing";
import FixturesAdmin from "./components/FixturesAdmin";
import StartFromFixtures from "./components/StartFromFixtures";
import Scoring from "./components/Scoring";
import ResultsAdmin from "./components/ResultsAdmin";
import Viewer from "./components/Viewer";

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  if (path.startsWith("/viewer")) {
    return <Viewer />;
  }

  const logged = localStorage.getItem("lt_admin") === "1";
  if (!logged) return <AdminLogin onOk={() => window.location.reload()} />;

  const [view, setView] = useState("landing");
  const [cfg, setCfg] = useState(null);

  return (
    <div className="app-bg">
      <div className="max-w-6xl mx-auto py-8">
        {view === "landing" && <Landing onStart={() => setView("start")} onResults={() => setView("results")} onSettings={() => setView("settings")} onFixtures={() => setView("fixtures")} />}
        {view === "fixtures" && <FixturesAdmin onBack={() => setView("landing")} />}
        {view === "start" && <StartFromFixtures onBack={() => setView("landing")} onStartScoring={(c) => { setCfg(c); setView("scoring"); }} />}
        {view === "scoring" && cfg && <Scoring config={cfg} onAbort={() => setView("landing")} onComplete={() => setView("results")} />}
        {view === "results" && <ResultsAdmin onBack={() => setView("landing")} />}
      </div>
      <footer className="py-6 text-center text-xs text-zinc-500">© {new Date().getFullYear()} RNW NPL</footer>
    </div>
  );
}