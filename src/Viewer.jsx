import React, { useState, useEffect } from "react";

export default function Viewer() {
  console.log("Viewer mounted");

  const [page, setPage] = useState("menu");
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);

  const openPage = (p) => {
    console.log("Opening viewer page:", p);
    setPage(p);
  };

  useEffect(() => {
    (async () => {
      try {
        const p = await fetch("/api/players?t=" + Date.now());
        const pj = await p.json();
        setPlayers(pj);
      } catch (e) {
        console.error("Failed loading players", e);
      }

      try {
        const f = await fetch("/api/fixtures?t=" + Date.now());
        const fj = await f.json();
        setFixtures(fj);
      } catch (e) {
        console.error("Failed loading fixtures", e);
      }
    })();
  }, []);

  // MENU SCREEN
  if (page === "menu") {
    return (
      <div className="viewer-menu">
        <h1>Viewer</h1>

        <div className="viewer-buttons">
          <button className="viewer-btn" onClick={() => openPage("rules")}>
            <img src="/StartMatch.jpg" className="viewer-icon" />
            <div>Rules</div>
          </button>

          <button className="viewer-btn" onClick={() => openPage("teams")}>
            <img src="/Score.jpg" className="viewer-icon" />
            <div>Teams</div>
          </button>

          <button className="viewer-btn" onClick={() => openPage("fixtures")}>
            <img src="/Settings.jpg" className="viewer-icon" />
            <div>Fixtures</div>
          </button>
        </div>
      </div>
    );
  }

  // RULES PAGE
  if (page === "rules") {
    return (
      <div className="viewer-page">
        <button onClick={() => openPage("menu")}>⬅ Back</button>
        <h2>Rules</h2>
        <ul>
          <li>First to four games wins</li>
          <li>Tiebreak at 3–3</li>
          <li>No-adv scoring</li>
        </ul>
      </div>
    );
  }

  // TEAMS PAGE
  if (page === "teams") {
    return (
      <div className="viewer-page">
        <button onClick={() => openPage("menu")}>⬅ Back</button>
        <h2>Teams</h2>

        <h3>Singles</h3>
        {Object.entries(players.singles).map(([category, list]) => (
          <div key={category}>
            <strong>{category}</strong> ({list.length})
            <ul>{list.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        ))}

        <h3>Doubles</h3>
        {Object.entries(players.doubles).map(([category, list]) => (
          <div key={category}>
            <strong>{category}</strong> ({list.length})
            <ul>{list.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        ))}
      </div>
    );
  }

  // FIXTURES PAGE
  if (page === "fixtures") {
    return (
      <div className="viewer-page">
        <button onClick={() => openPage("menu")}>⬅ Back</button>
        <h2>Fixtures</h2>

        <h3>Active</h3>
        {fixtures.filter((f) => f.status === "active").map((f) => (
          <div key={f.id}>{f.sides.join(" vs ")}</div>
        ))}

        <h3>Upcoming</h3>
        {fixtures.filter((f) => !f.status || f.status === "upcoming").map((f) => (
          <div key={f.id}>{f.sides.join(" vs ")}</div>
        ))}

        <h3>Completed</h3>
        {fixtures.filter((f) => f.status === "completed").map((f) => (
          <div key={f.id}>{f.sides.join(" vs ")} — {f.scoreline}</div>
        ))}
      </div>
    );
  }

  return null;
}
