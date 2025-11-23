// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import imgLive from "./LiveStreaming.png";
import imgLiveScore from "./live.jpg";
import AttivoLogo from "./attivo_logo.png";

/*
 Viewer.jsx
 - Menu with tiles (Live Stream, Rules, Teams, Fixture/Scores, Live Scoreboard)
 - Live Scoreboard page shows BIG names + BIG score for the active match
 - Scoreboard polls /api/fixtures every 1s so it tracks admin scoring updates
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
          style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }}
        />
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{title}</div>
        <div style={{ color: "#6b7280", marginTop: 6, fontSize: 13 }}>{subtitle}</div>
      </div>
    </button>
  );
}

function normalizePlayersMap(playersMap) {
  // Input: { category: [string | {name,pool} | {name}] }
  const out = {};
  for (const cat of Object.keys(playersMap || {})) {
    const arr = playersMap[cat] || [];
    out[cat] = arr.map((it) => {
      if (!it) return { name: "", pool: "none" };
      if (typeof it === "string") return { name: it, pool: "none" };
      if (typeof it === "object") {
        const name = it.name ?? it.label ?? String(it);
        const pool = (it.pool || "none").toString();
        return { name, pool };
      }
      return { name: String(it), pool: "none" };
    });
  }
  return out;
}

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

export default function Viewer() {
  const [page, setPage] = useState("menu"); // menu | rules | teams | fixtures | live | scoreboard
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [fixtureFilter, setFixtureFilter] = useState("all");
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [error, setError] = useState("");

  // Initial load + periodic refresh (global)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingPlayers(true);
      try {
        const data = await fetchJson("/api/players");
        if (!alive) return;
        const s = normalizePlayersMap(data.singles || {});
        const d = normalizePlayersMap(data.doubles || {});
        setPlayers({ singles: s, doubles: d });
      } catch (e) {
        console.warn("Failed loading players", e);
        setError((p) => (p ? p + " • players" : "Failed loading players"));
      } finally {
        if (alive) setLoadingPlayers(false);
      }
    })();

    (async () => {
      setLoadingFixtures(true);
      try {
        const fx = await fetchJson("/api/fixtures");
        if (!alive) return;
        const arr = Array.isArray(fx) ? fx : [];
        arr.sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
        setFixtures(arr);
      } catch (e) {
        console.warn("Failed loading fixtures", e);
        setError((p) => (p ? p + " • fixtures" : "Failed loading fixtures"));
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();

    // refresh every 12 seconds (general)
    const iv = setInterval(async () => {
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
      } catch {
        // ignore periodic refresh errors
      }
    }, 12000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // Extra-fast fixtures refresh while viewing the Live Scoreboard
  useEffect(() => {
    if (page !== "scoreboard") return;
    let alive = true;

    const tick = async () => {
      try {
        const fx = await fetchJson("/api/fixtures");
        if (!alive) return;
        const arr = Array.isArray(fx) ? fx : [];
        arr.sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
        setFixtures(arr);
      } catch (e) {
        console.warn("Scoreboard refresh failed", e);
      }
    };

    tick(); // initial
    const iv = setInterval(tick, 1000); // 1s polling

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [page]);

  // Helper for Teams page
  const categoryColors = [
    "#FDE68A",
    "#BFDBFE",
    "#FBCFE8",
    "#BBF7D0",
    "#E9D5FF",
    "#FEF3C7",
  ];
  function catColorFor(name) {
    let s = 0;
    for (let i = 0; i < name.length; i++)
      s = (s * 31 + name.charCodeAt(i)) >>> 0;
    return categoryColors[s % categoryColors.length];
  }

  function renderCategory(cat, list) {
    const color = catColorFor(cat);
    return (
      <div
        key={cat}
        style={{
          borderRadius: 12,
          padding: 12,
          background: color,
          minHeight: 80,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{cat}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 13 }}>
          {list.map((p, idx) => (
            <span
              key={idx}
              style={{
                background: "rgba(255,255,255,0.7)",
                borderRadius: 999,
                padding: "2px 8px",
              }}
            >
              {p.name}
              {p.pool && p.pool !== "none" ? ` (${p.pool})` : ""}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ---------------- MENU ----------------
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
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div
            style={{
              fontSize: 14,
              color: "#7D1E7E",
              fontWeight: 600,
            }}
          >
            Sponsored by
          </div>
          <img
            src={AttivoLogo}
            style={{ width: 260, marginTop: 6, display: "block" }}
            alt="Attivo Logo"
          />
        </div>
        {error && (
          <div style={{ color: "red", marginTop: 8, fontSize: 13 }}>{error}</div>
        )}
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
            subtitle="YouTube live"
            onClick={() => setPage("live")}
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
            subtitle="All fixtures, upcoming & recent results"
            onClick={() => setPage("fixtures")}
          />
          {/* NEW: Live Scoreboard button using live.jpg */}
          <Tile
            img={imgLiveScore}
            title="Live Scoreboard"
            subtitle="Big on-screen live score"
            onClick={() => setPage("scoreboard")}
          />
        </div>
      </div>
    );
  }

  // ---------------- RULES PAGE ----------------
  if (page === "rules") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setPage("menu")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e6edf8",
              background: "white",
            }}
          >
            ← Back
          </button>
        </div>
        <h2 style={{ marginTop: 0 }}>Tournament Rules</h2>
        <div
          style={{
            marginTop: 12,
            maxWidth: 800,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <p>
            General tennis rules apply with some modifications for Fast-Four format, golden
            point and tie-breakers. Finals follow a full 6-game set format.
          </p>
          <h3 style={{ fontWeight: 700, marginTop: 16 }}>Key Points</h3>
          <ul style={{ paddingLeft: 22, marginTop: 6 }}>
            <li>Players must report 10 minutes before their scheduled match time.</li>
            <li>One deuce + golden point for qualifiers and semifinals.</li>
            <li>Finals use standard deuce (win by 2 points).</li>
            <li>Fast-Four for qualifiers & semifinals; finals are 6-game sets.</li>
            <li>Tie-breakers require a 2-point difference to win.</li>
            <li>Umpire and organizing committee decisions are final.</li>
          </ul>
        </div>
      </div>
    );
  }

  // ---------------- LIVE STREAM PAGE ----------------
  if (page === "live") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setPage("menu")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e6edf8",
              background: "white",
            }}
          >
            ← Back
          </button>
        </div>

        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Live Stream</h2>
        <p
          style={{
            marginTop: 0,
            marginBottom: 16,
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          YouTube live streaming of the current court. Replace the video ID in Viewer.jsx
          with your actual stream link.
        </p>

        <div
          style={{
            position: "relative",
            paddingBottom: "56.25%",
            height: 0,
            overflow: "hidden",
            borderRadius: 12,
            boxShadow: "0 12px 30px rgba(15,23,42,0.35)",
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          <iframe
            title="YouTube live stream"
            src="https://www.youtube.com/embed/QNPpdtUsC60?autoplay=1&rel=0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
          />
        </div>
      </div>
    );
  }

  // ---------------- SCOREBOARD PAGE (BIG LIVE SCORE) ----------------
  if (page === "scoreboard") {
    // Pick live fixture:
    // 1) first with status === "active"
    // 2) else first non-completed
    const liveFixtures = fixtures.filter((f) => f.status === "active");
    const live =
      liveFixtures[0] || fixtures.find((f) => f.status !== "completed") || null;

    return (
      <div
        style={{
          padding: 24,
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #e0f2fe 0, #f8fafc 45%, #0f172a 100%)",
          color: "#0f172a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 1080, marginBottom: 16 }}>
          <button
            onClick={() => setPage("menu")}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              background: "white",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ← Back to menu
          </button>
        </div>

        <h2
          style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: 26,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#0f172a",
          }}
        >
          Live Scoreboard
        </h2>

        {!live ? (
          <div
            style={{
              marginTop: 40,
              padding: 24,
              borderRadius: 16,
              background: "rgba(15,23,42,0.7)",
              color: "#e5e7eb",
              fontSize: 20,
              fontWeight: 600,
              textAlign: "center",
              maxWidth: 720,
            }}
          >
            No live match found.
            <div
              style={{
                fontSize: 14,
                marginTop: 8,
                color: "#9ca3af",
              }}
            >
              Start a match in the admin app (status <code>active</code>) and update the
              score from there.
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 24,
              width: "100%",
              maxWidth: 1080,
              padding: 28,
              borderRadius: 32,
              background: "rgba(15,23,42,0.94)",
              color: "#f9fafb",
              boxShadow: "0 24px 80px rgba(15,23,42,0.8)",
            }}
          >
            {/* Top meta: category / mode / court */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {live.category || "Match"}
              </div>
              <div style={{ fontSize: 14, color: "#9ca3af" }}>
                {live.mode ? live.mode.toUpperCase() : ""}
                {live.venue ? ` • Court ${live.venue}` : ""}
              </div>
            </div>

            {/* Players & score */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 0.6fr 1.3fr",
                alignItems: "center",
                gap: 24,
              }}
            >
              {/* Player A */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {(live.sides && live.sides[0]) || "Player A"}
                </div>
              </div>

              {/* Score */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 80,
                    fontWeight: 900,
                    lineHeight: 1.0,
                    letterSpacing: "0.08em",
                  }}
                >
                  {live.scoreline || live.liveScore || "--"}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "#9ca3af",
                  }}
                >
                  Games • Points
                </div>
              </div>

              {/* Player B */}
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {(live.sides && live.sides[1]) || "Player B"}
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 14,
                color: "#9ca3af",
              }}
            >
              <div>
                {live.start &&
                  `Start: ${new Date(live.start).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "#22c55e",
                    boxShadow: "0 0 10px #22c55e",
                  }}
                />
                LIVE
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- TEAMS PAGE ----------------
  if (page === "teams") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setPage("menu")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e6edf8",
              background: "white",
            }}
          >
            ← Back
          </button>
        </div>
        <h2 style={{ marginTop: 0 }}>Teams</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 12,
          }}
        >
          <div>
            <div
              style={{
                marginBottom: 8,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Singles
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {loadingPlayers ? (
                <div>Loading players…</div>
              ) : Object.keys(players.singles).length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No singles categories</div>
              ) : (
                Object.entries(players.singles).map(([cat, arr]) =>
                  renderCategory(cat, arr)
                )
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                marginBottom: 8,
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Doubles
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {loadingPlayers ? (
                <div>Loading players…</div>
              ) : Object.keys(players.doubles).length === 0 ? (
                <div style={{ color: "#9ca3af" }}>No doubles categories</div>
              ) : (
                Object.entries(players.doubles).map(([cat, arr]) =>
                  renderCategory(cat, arr)
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- FIXTURES PAGE ----------------
  if (page === "fixtures") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setPage("menu")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e6edf8",
              background: "white",
            }}
          >
            ← Back
          </button>
        </div>
        <h2 style={{ marginTop: 0 }}>Fixtures & Scores</h2>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 13,
          }}
        >
          {["all", "upcoming", "completed"].map((key) => {
            const label =
              key === "all"
                ? "All"
                : key === "upcoming"
                ? "Upcoming"
                : "Completed";
            return (
              <button
                key={key}
                onClick={() => setFixtureFilter(key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border:
                    "1px solid " +
                    (fixtureFilter === key ? "#1d4ed8" : "#e5e7eb"),
                  background: fixtureFilter === key ? "#eff6ff" : "white",
                  color: fixtureFilter === key ? "#1d4ed8" : "#374151",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loadingFixtures ? (
          <div style={{ marginTop: 16 }}>Loading fixtures…</div>
        ) : fixtures.length === 0 ? (
          <div style={{ marginTop: 16, color: "#9ca3af" }}>
            No fixtures found.
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(
              fixtures.reduce((acc, fx) => {
                const k = dateKey(fx.start || 0);
                acc[k] = acc[k] || [];
                acc[k].push(fx);
                return acc;
              }, {})
            ).map(([key, list]) => (
              <div key={key}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 16,
                    marginBottom: 6,
                  }}
                >
                  {dayLabel(list[0].start || 0)}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {list
                    .filter((fx) => {
                      if (fixtureFilter === "all") return true;
                      if (fixtureFilter === "upcoming")
                        return !fx.status || fx.status === "upcoming";
                      if (fixtureFilter === "completed")
                        return fx.status === "completed";
                      return true;
                    })
                    .map((fx) => (
                      <div
                        key={fx.id}
                        style={{
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          padding: 10,
                          background: "white",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 13,
                          gap: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {(fx.sides || []).join(" vs ")}
                          </div>
                          <div
                            style={{
                              color: "#6b7280",
                              marginTop: 2,
                            }}
                          >
                            {fx.category || ""}{" "}
                            {fx.mode ? `• ${fx.mode.toUpperCase()}` : ""}{" "}
                            {fx.venue ? `• Court ${fx.venue}` : ""}
                          </div>
                        </div>
                        <div
                          style={{
                            textAlign: "right",
                            minWidth: 120,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {fx.scoreline || fx.liveScore || "—"}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                            }}
                          >
                            {statusBadge(fx.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // fallback (shouldn't hit normally)
  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => setPage("menu")}>Back to menu</button>
      <div style={{ marginTop: 16 }}>Unknown view.</div>
    </div>
  );
}

