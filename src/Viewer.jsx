import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import imgLive from "./LiveStreaming.png";
import imgLiveScore from "./live.jpg";
import AttivoLogo from "./attivo_logo.png";

const Tile = ({ img, title, subtitle, onClick }) => (
  <div
    onClick={onClick}
    style={{
      width: 200,
      borderRadius: 16,
      cursor: "pointer",
      overflow: "hidden",
      background: "white",
      boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
    }}
  >
    <img
      src={img}
      alt={title}
      style={{
        width: "100%",
        height: 100,
        objectFit: "contain",
        background: "#000",
        display: "block",
      }}
    />
    <div style={{ padding: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#475569" }}>{subtitle}</div>
    </div>
  </div>
);

async function fetchJson(url) {
  const r = await fetch(url);
  return r.json();
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

  // ================= MENU =================
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

        <img
          src={AttivoLogo}
          style={{ width: 200, marginTop: 8 }}
          alt="Attivo Logo"
        />

        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}

        <div
          style={{
            marginTop: 30,
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Tile
            img={imgLive}
            title="Live Stream"
            subtitle="Watch YouTube"
            onClick={() => setPage("live")}
          />
          <Tile
            img={imgLiveScore}
            title="Live Score"
            subtitle="Scoreboard"
            onClick={() => setPage("liveScore")}
          />
          <Tile
            img={imgStart}
            title="Rules"
            subtitle="Formats & rules"
            onClick={() => setPage("rules")}
          />
          <Tile
            img={imgScore}
            title="Teams"
            subtitle="Player list"
            onClick={() => setPage("teams")}
          />
          <Tile
            img={imgSettings}
            title="Fixture/Scores"
            subtitle="All matches"
            onClick={() => setPage("fixtures")}
          />
        </div>
      </div>
    );
  }

  // ================= LIVE SCORE PAGE =================
  if (page === "liveScore") {
    return (
      <div style={{ padding: 24 }}>
        <button onClick={() => setPage("menu")}>← Back</button>
        <h2>Live Score (coming next)</h2>
      </div>
    );
  }

  // ================= OTHERS (unchanged placeholders) =================
  if (page === "live") return <div style={{ padding: 24 }}>Live stream</div>;
  if (page === "rules") return <div style={{ padding: 24 }}>Rules page</div>;
  if (page === "teams") return <div style={{ padding: 24 }}>Teams page</div>;
  if (page === "fixtures") return <div style={{ padding: 24 }}>Fixtures page</div>;

  return <div>Unknown Page</div>;
}

