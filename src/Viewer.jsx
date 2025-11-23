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
      width: 220,
      borderRadius: 16,
      cursor: "pointer",
      overflow: "hidden",
      boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      background: "white",
    }}
  >
    <img
      src={img}
      alt={title}
      style={{
        width: "100%",
        height: 140,
        objectFit: "cover",
        display: "block",
      }}
    />
    <div style={{ padding: 12 }}>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
        {subtitle}
      </div>
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
  const [error, setError] = useState(null);

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
      } catch (e) {
        if (!alive) return;
        setError("Error loading data");
        setLoadingFixtures(false);
      }
    }

    load();
    const iv = setInterval(load, 2000); // FAST REFRESH ⚡

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
        {error && (
          <div style={{ color: "red", marginTop: 8 }}>{error}</div>
        )}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            gap: 20,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Tile
            img={imgLive}
            title="Live Stream"
            subtitle="Watch YouTube Stream"
            onClick={() => setPage("live")}
          />
          <Tile
            img={imgLiveScore}
            title="Live Score"
            subtitle="Big scoreboard display"
            onClick={() => setPage("liveScore")}
          />
          <Tile
            img={imgStart}
            title="Rules"
            subtitle="Match rules"
            onClick={() => setPage("rules")}
          />
          <Tile
            img={imgScore}
            title="Teams"
            subtitle="Players by category"
            onClick={() => setPage("teams")}
          />
          <Tile
            img={imgSettings}
            title="Fixture/Scores"
            subtitle="Upcoming & results"
            onClick={() => setPage("fixtures")}
          />
        </div>
      </div>
    );
  }

  // ================= LIVE SCORE PAGE =================
  if (page === "liveScore") {
    const liveFixture =
      fixtures.find((f) => f.status === "active") ||
      fixtures[0] ||
      null;

    if (!liveFixture) {
      return (
        <div style={{ padding: 24 }}>
          <button onClick={() => setPage("menu")}>← Back</button>
          <h2 style={{ marginTop: 24 }}>Live Score</h2>
          <div>No live match.</div>
        </div>
      );
    }

    const rawScore =
      (liveFixture.scoreline || liveFixture.liveScore || "0-0").toString();
    const parts = rawScore.split("•");
    const setScore = parts[0].trim();
    const gameScore = (parts[1] || "").trim();
    const isTB = gameScore.toLowerCase().includes("tb");

    return (
      <div
        style={{
          padding: 0,
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                marginBottom: 20,
              }}
            >
              {liveFixture.sides?.[0] || "Player A"}
            </div>

            <div
              style={{
                fontSize: 180,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {setScore}
            </div>

            {gameScore && (
              <div
                style={{
                  marginTop: 16,
                  fontSize: 100,
                  fontWeight: 800,
                }}
              >
                {isTB ? "Tie-break" : gameScore}
              </div>
            )}

            {isTB && (
              <div
                style={{
                  fontSize: 100,
                  fontWeight: 900,
                  marginTop: 12,
                }}
              >
                {gameScore.replace(/TB/i, "").trim()}
              </div>
            )}

            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                marginTop: 26,
              }}
            >
              {liveFixture.sides?.[1] || "Player B"}
            </div>
          </div>
        </div>

        <div style={{ padding: 16, textAlign: "center" }}>
          <button
            onClick={() => setPage("menu")}
            style={{
              padding: "12px 18px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
            }}
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // ================= OTHER PAGES =================
  if (page === "rules") return <div>Rules page coming…</div>;
  if (page === "teams") return <div>Teams page coming…</div>;
  if (page === "fixtures") return <div>Fixtures page coming…</div>;
  if (page === "live") return <div>Live streaming screen…</div>;

  return <div>Unknown</div>;
}

