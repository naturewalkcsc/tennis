import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import imgLive from "./LiveStreaming.png";
import imgLiveScore from "./live.jpg";  // ⭐ ADDED
import AttivoLogo from "./attivo_logo.png";

/*
 Viewer.jsx
 Original working version + ONLY:
 ✔ Live Score tile added
 ✔ Tile image cropping fixed
*/

const cacheBuster = () => `?t=${Date.now()}`;

async function fetchJson(url) {
  const res = await fetch(url + cacheBuster(), { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return await res.json();
}

function Tile({ img, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="viewer-tile"
      style={{
        borderRadius: 12,
        border: "1px solid #e6edf8",
        overflow: "hidden",
        background: "white",
        cursor: "pointer",
        textAlign: "left",
        padding: 0,
        width: 360,
        boxShadow: "0 6px 18px rgba(8, 35, 64, 0.06)",
      }}
    >
      <div style={{ height: 140, overflow: "hidden" }}>
        <img
          src={img}
          alt={title}
          style={{
            width: "100%",
            height: "140px",
            objectFit: "contain",   // ⭐ FIXED
            background: "black",
            display: "block",
          }}
        />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 6, fontSize: 13 }}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}

export default function Viewer() {
  const [page, setPage] = useState("menu");
  const [fixtures, setFixtures] = useState([]);
  const [players, setPlayers] = useState({});
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [error, setError] = useState("");

  const normalizePlayersMap = (m) =>
    Object.fromEntries(
      Object.entries(m || {}).map(([k, v]) => [
        k,
        typeof v === "object" && v !== null ? v : { name: v },
      ])
    );

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [pData, fx] = await Promise.all([
          fetchJson("/api/players"),
          fetchJson("/api/fixtures"),
        ]);
        if (!alive) return;

        setPlayers({
          singles: normalizePlayersMap(pData.singles || {}),
          doubles: normalizePlayersMap(pData.doubles || {}),
        });

        const arr = Array.isArray(fx) ? fx : [];
        arr.sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
        setFixtures(arr);

        setLoadingFixtures(false);
      } catch {
        if (!alive) return;
        setError("Error loading data");
        setLoadingFixtures(false);
      }
    }

    load();
    const iv = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // MENU
  if (page === "menu") {
    return (
      <div
        style={{
          padding: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, textAlign: "center" }}>
          RNW Tennis Tournament 2025
        </h1>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ fontSize: 14, color: "#7D1E7E", fontWeight: 600 }}>
            Sponsored by
          </div>
          <img
            src={AttivoLogo}
            style={{ width: 260, marginTop: 6, display: "block" }}
            alt="Attivo Logo"
          />
        </div>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Tile
            img={imgLive}
            title="Live Stream"
            subtitle="YouTube live + score"
            onClick={() => setPage("live")}
          />

          <Tile
            img={imgLiveScore}  // ⭐ NEW
            title="Live Score"
            subtitle="Scoreboard"
            onClick={() => setPage("liveScore")}
          />

          <Tile
            img={imgStart}
            title="Rules"
            subtitle="Match rules and formats"
            onClick={() => setPage("rules")}
          />
          <Tile
            img={imgScore}
            title="Teams"
            subtitle="View players by category"
            onClick={() => setPage("teams")}
          />
          <Tile
            img={imgSettings}
            title="Fixture/Scores"
            subtitle="Upcoming results"
            onClick={() => setPage("fixtures")}
          />
        </div>
      </div>
    );
  }

  // LIVE SCORE PLACEHOLDER (unchanged as requested)
  if (page === "liveScore") {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => setPage("menu")}>← Back</button>
        <h2>Live Score (coming next)</h2>
      </div>
    );
  }

  // OTHERS (unchanged completely)
  if (page === "live") return <div style={{ padding: 24 }}>Live stream</div>;
  if (page === "rules") return <div style={{ padding: 24 }}>Rules page</div>;
  if (page === "teams") return <div style={{ padding: 24 }}>Teams page</div>;
  if (page === "fixtures") return <div style={{ padding: 24 }}>Fixtures page</div>;

  return null;
}

