import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import imgLive from "./LiveStreaming.png";
import imgLiveScore from "./live.jpg";
import AttivoLogo from "./attivo_logo.png";

/* Small helper to do fetch + cache buster when needed */
async function fetchJson(url) {
  const res = await fetch(url);
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
            objectFit: "contain",
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
  // ------------------ Top-level hooks (must not be conditional) ------------------
  const [page, setPage] = useState("menu");
  const [fixtures, setFixtures] = useState([]);
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [error, setError] = useState("");

  // YouTube live URL state (top-level)
  const [ytUrl, setYtUrl] = useState(() => {
    try {
      return localStorage.getItem("ytLiveUrl") || "https://www.youtube.com/embed/live_stream?channel=XXXX";
    } catch {
      return "https://www.youtube.com/embed/live_stream?channel=XXXX";
    }
  });
  const [tempUrl, setTempUrl] = useState(ytUrl);

  // ------------------ Helpers ------------------
  const normalizePlayersMap = (m) =>
    Object.fromEntries(
      Object.entries(m || {}).map(([k, v]) => [
        k,
        Array.isArray(v)
          ? v.map((it) =>
              typeof it === "object" && it !== null ? it : { name: it }
            )
          : typeof v === "object" && v !== null
          ? v
          : { Players: v },
      ])
    );

  function dateKey(ts) {
    const d = new Date(Number(ts));
    return d.toLocaleDateString();
  }

  function dayLabel(ts) {
    const d = new Date(Number(ts));
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function statusBadge(status) {
    if (status === "active")
      return (
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            background: "#dcfce7",
            color: "#064e3b",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          LIVE
        </span>
      );
    if (status === "completed")
      return (
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            background: "#ecfeff",
            color: "#065f46",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          Completed
        </span>
      );
    return (
      <span
        style={{
          padding: "4px 8px",
          borderRadius: 999,
          background: "#eef2ff",
          color: "#1e3a8a",
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        Upcoming
      </span>
    );
  }

  // ------------------ Data load / polling ------------------
  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [pData, fx] = await Promise.all([
          (typeof apiPlayersGet === "function" ? apiPlayersGet() : fetchJson("/api/players")),
          (typeof apiFixturesList === "function" ? apiFixturesList() : fetchJson("/api/fixtures")),
        ]);

        if (!alive) return;

        // normalize players
        if (pData) {
          if (Array.isArray(pData)) {
            setPlayers({
              singles: { Players: pData.map((n) => (typeof n === "string" ? { name: n } : n)) },
              doubles: {},
            });
          } else {
            const singles = pData.singles && !Array.isArray(pData.singles) ? pData.singles : (Array.isArray(pData.singles) ? { Players: pData.singles } : {});
            const doubles = pData.doubles && !Array.isArray(pData.doubles) ? pData.doubles : (Array.isArray(pData.doubles) ? { Players: pData.doubles } : {});
            setPlayers({ singles: normalizePlayersMap(singles), doubles: normalizePlayersMap(doubles) });
          }
        }

        const arr = Array.isArray(fx) ? fx : [];
        arr.sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
        setFixtures(arr);
        setLoadingFixtures(false);
      } catch (e) {
        console.warn("Viewer load error:", e);
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

  // ------------------ YouTube URL apply handler (top-level) ------------------
  function applyYtUrl() {
    let finalUrl = (tempUrl || "").trim();
    if (!finalUrl) return;

    try {
      if (finalUrl.includes("youtube.com/watch?v=")) {
        const videoId = finalUrl.split("v=")[1].split("&")[0];
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (finalUrl.includes("youtu.be/")) {
        const videoId = finalUrl.split("youtu.be/")[1].split("?")[0];
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) {
      // fallthrough - use whatever user pasted
    }

    setYtUrl(finalUrl);
    try {
      localStorage.setItem("ytLiveUrl", finalUrl);
    } catch {}
  }

  // ------------------ RENDER: MENU ------------------
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
        <h1 style={{ margin: 0, textAlign: "center" }}>RNW Tennis Tournament 2025</h1>

        <img src={AttivoLogo} style={{ width: 260, marginTop: 8 }} alt="Attivo Logo" />

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
          <Tile img={imgLive} title="Live Stream" subtitle="YouTube live + score" onClick={() => setPage("live")} />

          <Tile img={imgLiveScore} title="Live Score" subtitle="Scoreboard" onClick={() => setPage("liveScore")} />

          <Tile img={imgStart} title="Rules" subtitle="Match rules and formats" onClick={() => setPage("rules")} />
          <Tile img={imgScore} title="Teams" subtitle="View players by category" onClick={() => setPage("teams")} />
          <Tile img={imgSettings} title="Fixture/Scores" subtitle="Upcoming results" onClick={() => setPage("fixtures")} />
        </div>
      </div>
    );
  }

  // ------------------ LIVE STREAM PAGE ------------------
  if (page === "live") {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={() => setPage("menu")} style={{ marginBottom: 12 }}>
          ← Back
        </button>

        <h2 style={{ marginBottom: 12 }}>Live Streaming</h2>

        {/* URL Input Box */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Paste YouTube Live URL here"
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            style={{
              flex: 1,
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
          <button
            onClick={applyYtUrl}
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              color: "white",
              borderRadius: 6,
              cursor: "pointer",
              border: "none",
              fontWeight: 600,
            }}
          >
            Go
          </button>
        </div>

        {/* Live Video */}
        <div style={{ marginTop: 8 }}>
          <iframe
            width="100%"
            height="500"
            src={ytUrl}
            title="YouTube live stream"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // ------------------ LIVE SCORE (BIG) ------------------
  if (page === "liveScore") {
    const liveFixture = fixtures.find((f) => f.status === "active") || fixtures[0] || null;

    if (!liveFixture) {
      return (
        <div style={{ padding: 24 }}>
          <button onClick={() => setPage("menu")}>← Back</button>
          <h2>No live match</h2>
        </div>
      );
    }

    const raw = (liveFixture.scoreline || "0-0").toString();
    const [setScore, gameScore = ""] = raw.split("•").map((s) => s.trim());

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

        <div style={{ fontSize: 70, fontWeight: 900 }}>{liveFixture.sides?.[0] || "Player A"}</div>

        <div style={{ fontSize: 200, fontWeight: 900, lineHeight: 1 }}>{setScore}</div>

        <div style={{ fontSize: 120, fontWeight: 800 }}>{gameScore}</div>

        <div style={{ fontSize: 70, fontWeight: 900, marginTop: 28 }}>{liveFixture.sides?.[1] || "Player B"}</div>
      </div>
    );
  }

  // ------------------ FIXTURES / RULES / TEAMS placeholders (unchanged) ------------------
  if (page === "fixtures") {
    return <div style={{ padding: 24 }}>Fixtures page</div>;
  }
  if (page === "rules") {
    return <div style={{ padding: 24 }}>Rules page</div>;
  }
  if (page === "teams") {
    return <div style={{ padding: 24 }}>Teams page</div>;
  }

  return null;
}

