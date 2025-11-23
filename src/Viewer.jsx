import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import imgLive from "./LiveStreaming.png";
import imgLiveScore from "./live.jpg"; // ⭐ Added for live score tile
import AttivoLogo from "./attivo_logo.png";

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

function Tile({ img, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 360,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e6edf8",
        cursor: "pointer",
        background: "white",
        boxShadow: "0 6px 18px rgba(8, 35, 64, 0.06)",
        textAlign: "left",
        padding: 0,
      }}
    >
      <img
        src={img}
        alt={title}
        style={{
          width: "100%",
          height: 140,
          objectFit: "contain", // ⭐ keeps text visible
          background: "black",
          display: "block",
        }}
      />
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>{subtitle}</div>
      </div>
    </button>
  );
}

export default function Viewer() {
  const [page, setPage] = useState("menu");
  const [fixtures, setFixtures] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const fx = await fetchJson("/api/fixtures");
        setFixtures(Array.isArray(fx) ? fx : []);
      } catch {}
    };
    load();
    const iv = setInterval(load, 2000); // LIVE refresh
    return () => clearInterval(iv);
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
        <h1 style={{ margin: 0 }}>RNW Tennis Tournament 2025</h1>
        <img
          src={AttivoLogo}
          alt="logo"
          style={{ width: 260, marginTop: 8 }}
        />
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
            subtitle="Watch stream"
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
            subtitle="Match rules"
            onClick={() => setPage("rules")}
          />
          <Tile
            img={imgScore}
            title="Teams"
            subtitle="Players"
            onClick={() => setPage("teams")}
          />
          <Tile
            img={imgSettings}
            title="Fixture/Scores"
            subtitle="Matches & results"
            onClick={() => setPage("fixtures")}
          />
        </div>
      </div>
    );
  }

  // LIVE SCORE PAGE — BIG VERTICAL DISPLAY
  if (page === "liveScore") {
    const liveFixture =
      fixtures.find((f) => f.status === "active") ||
      fixtures[0] ||
      null;

    if (!liveFixture) {
      return (
        <div style={{ padding: 24 }}>
          <button onClick={() => setPage("menu")}>← Back</button>
          <h2>No live match</h2>
        </div>
      );
    }

    const raw = (liveFixture.scoreline || "0-0").toString();
    const [setScore, gameScore = ""] = raw.split("•").map(s => s.trim());

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "black",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textAlign: "center",
        }}
      >
        <button
          onClick={() => setPage("menu")}
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            padding: "10px 16px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <div style={{ fontSize: 70, fontWeight: 900 }}>
          {liveFixture.sides?.[0] || "Player A"}
        </div>

        <div style={{ fontSize: 200, fontWeight: 900, lineHeight: 1 }}>
          {setScore}
        </div>

        <div style={{ fontSize: 120, fontWeight: 800 }}>
          {gameScore}
        </div>

        <div
          style={{
            fontSize: 70,
            fontWeight: 900,
            marginTop: 28,
          }}
        >
          {liveFixture.sides?.[1] || "Player B"}
        </div>
      </div>
    );
  }

  // OTHER PAGES UNCHANGED
  if (page === "live") return <div style={{ padding: 24 }}>Live stream</div>;
  if (page === "rules") return <div style={{ padding: 24 }}>Rules page</div>;
  if (page === "teams") return <div style={{ padding: 24 }}>Teams page</div>;
  if (page === "fixtures") return <div style={{ padding: 24 }}>Fixtures page</div>;

  return null;
}

