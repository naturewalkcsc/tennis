// src/Viewer.jsx
import React, { useEffect, useState } from "react";
import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";
import imgLive from "./LiveStreaming.png";
import AttivoLogo from "./attivo_logo.png";
import { FixturesAndResults, normalizePlayersMap } from "./common.jsx";

/*
 Viewer.jsx
 - Menu with 3 image tiles (Rules, Teams, Fixture/Scores)
 - Each tile opens a dedicated page with a Back button
 - Teams page understands entries as strings OR { name, pool }
 - Fixtures are grouped by calendar day and shown in an attractive colored layout
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



export default function Viewer() {
  const [page, setPage] = useState("menu"); // menu | rules | teams | fixtures
  const [players, setPlayers] = useState({ singles: {}, doubles: {} });
  const [fixtures, setFixtures] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [error, setError] = useState("");
  
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loadingVideo, setLoadingVideo] = useState(true);

  // Fetch YouTube URL from config
  const fetchYouTubeConfig = async () => {
    try {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let result;
      
      if (isDev) {
        // Mock implementation for development
        const storedUrl = localStorage.getItem('dev_youtube_url');
        result = { url: storedUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0' };
      } else {
        result = await fetchJson('/api/config');
      }
      
      let finalUrl = result.url || 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0';
      
      // Ensure the URL is in embed format
      finalUrl = convertToEmbedUrl(finalUrl);
      
      setYoutubeUrl(finalUrl);
    } catch (error) {
      console.warn('Failed to load YouTube config', error);
      setYoutubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0');
    } finally {
      setLoadingVideo(false);
    }
  };

  // Convert any YouTube URL to embed format
  const convertToEmbedUrl = (url) => {
    if (!url) return 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0';
    
    let videoId = null;
    
    // Extract video ID from different YouTube URL formats
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
      // Already in embed format
      return url;
    }
    
    // If we found a video ID, create embed URL
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    
    // If no valid format found, return default
    return 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0';
  };

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
        // Ensure array
        const arr = Array.isArray(fx) ? fx : [];
        // sort by start ascending
        arr.sort((a, b) => (Number(a.start || 0) - Number(b.start || 0)));
        setFixtures(arr);
      } catch (e) {
        console.warn("Failed loading fixtures", e);
        setError((p) => (p ? p + " • fixtures" : "Failed loading fixtures"));
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();

    // Load YouTube config
    fetchYouTubeConfig();

    // Load YouTube config
    fetchYouTubeConfig();

    // refresh every 12 seconds
    const iv = setInterval(async () => {
      try {
        const [pData, fx] = await Promise.all([fetchJson("/api/players"), fetchJson("/api/fixtures")]);
        if (!alive) return;
        setPlayers({ singles: normalizePlayersMap(pData.singles || {}), doubles: normalizePlayersMap(pData.doubles || {}) });
        const arr = Array.isArray(fx) ? fx : [];
        arr.sort((a, b) => (Number(a.start || 0) - Number(b.start || 0)));
        setFixtures(arr);
        
        // Also refresh YouTube config
        fetchYouTubeConfig();
      } catch {
        // ignore periodic refresh errors
      }
    }, 12000);

    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // Helpers: render category card with colors
  const categoryColors = [
    "#FDE68A", // yellow
    "#BFDBFE", // blue
    "#FBCFE8", // pink
    "#BBF7D0", // green
    "#E9D5FF", // purple
    "#FEF3C7", // soft
  ];
  let catColorIndex = 0;
  function catColorFor(name) {
    // simple deterministic color by hashing category name to index
    let s = 0;
    for (let i = 0; i < name.length; i++) s = (s * 31 + name.charCodeAt(i)) >>> 0;
    return categoryColors[s % categoryColors.length];
  }

  function renderCategory(catName, entries) {
    // entries normalized: [{name,pool}]
    const groups = { A: [], B: [], none: [] };
    for (const e of entries) {
      const pool = (e.pool || "none").toString().toLowerCase();
      if (pool === "a" || pool === "pool a") groups.A.push(e.name);
      else if (pool === "b" || pool === "pool b") groups.B.push(e.name);
      else groups.none.push(e.name);
    }
    const showPools = groups.A.length > 0 || groups.B.length > 0;
    const color = catColorFor(catName);

    return (
      <div key={catName} style={{ background: "white", borderRadius: 12, padding: 12, border: "1px solid rgba(15, 23, 42, 0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 34, borderRadius: 8, background: color }} />
            <div>
              <div style={{ fontWeight: 700 }}>{catName}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</div>
            </div>
          </div>
        </div>

        {entries.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No entries</div>
        ) : showPools ? (
          <div style={{ display: "flex", gap: 12 }}>
            {groups.A.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool A</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.A.map((n, i) => <li key={`a-${i}`} style={{ marginBottom: 6 }}>{n}</li>)}
                </ul>
              </div>
            )}
            {groups.B.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool B</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.B.map((n, i) => <li key={`b-${i}`} style={{ marginBottom: 6 }}>{n}</li>)}
                </ul>
              </div>
            )}
            {groups.none.length > 0 && (
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No Pool</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {groups.none.map((n, i) => <li key={`n-${i}`} style={{ marginBottom: 6 }}>{n}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {entries.map((e, i) => <li key={`p-${i}`} style={{ marginBottom: 6 }}>{e.name}</li>)}
          </ul>
        )}
      </div>
    );
  }


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
        <h1 style={{ margin: 0, textAlign: "center" }}>RNW Tennis Tournament 2025</h1>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ fontSize: 14, color: "#7D1E7E", fontWeight: 600 }}>Sponsored by</div>
          <img src={AttivoLogo} style={{ width: 260, marginTop: 6, display: "block" }} alt="Attivo Logo" />
        </div>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        <div style={{ marginTop: 18, display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
          <Tile img={imgLive} title="Live Stream" subtitle="YouTube live + live score" onClick={() => setPage("live")} />
          <Tile img={imgStart} title="Rules" subtitle="Match rules and formats" onClick={() => setPage("rules")} />
          <Tile img={imgScore} title="Teams" subtitle="View players by category" onClick={() => setPage("teams")} />
          <Tile img={imgSettings} title="Fixture/Scores" subtitle="All fixtures, upcoming & recent results" onClick={() => setPage("fixtures")} />
        </div>
      </div>
    );
  }
// RULES PAGE
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
          Back
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          background: "white",
          padding: 16,
          borderRadius: 10,
          border: "1px solid #e6edf8",
          lineHeight: 1.6,
        }}
      >
        <h3 style={{ fontWeight: 700, marginTop: 12 }}>
          Singles Categories (Champions A, Champions B, Women and Kids)
        </h3>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>
            <b>Champions A:</b> Two pools (A & B). Top two from each pool → semifinals → winners enter finals.
          </li>
          <li>
            <b>Champions B:</b> Single pool, round-robin. Top two qualify for finals.
          </li>
          <li>
            <b>Women Singles:</b> Two pools (A & B). Top two from each pool → semifinals → winners enter finals.
          </li>
          <li>
            <b>Kids Singles:</b> Single pool. Round robin → top two play finals.
          </li>
        </ul>

        <h3 style={{ fontWeight: 700, marginTop: 20 }}>
          Doubles Categories (Champions A, Champions B, Women’s, Combination, Kids)
        </h3>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>
            <b>Champions A Doubles:</b> Round robin. Top two → finals.
          </li>
          <li>
            <b>Champions B Doubles:</b> Round robin. Top two → finals.
          </li>
          <li>
            <b>Women’s Doubles:</b> Round robin. Top two → finals.
          </li>
          <li>
            <b>Combination Doubles:</b> Two pools. Top two from each → semifinals.
          </li>
          <li>
            <b>Kids Doubles:</b> Only 4 players → straight finals.
          </li>
        </ul>

        <h3 style={{ fontWeight: 700, marginTop: 24 }}>General Rules</h3>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>Players must be in proper attire with tennis shoes.</li>
          <li>Players must warm up & report 10 minutes before match.</li>
          <li>Absence beyond 10 minutes = walkover (organizing committee decides).</li>
          <li>Tennis rules apply with modified deuce: One Deuce + Golden Point.</li>
          <li>Finals use standard deuce (win by 2 points).</li>
          <li>Fast-Four format for qualifiers & semifinals.</li>
          <li>Finals are 6-game sets.</li>
          <li>Tie-breaker requires difference of TWO points.</li>
          <li>Winning = 1 point, Losing = 0 points.</li>
          <li>Umpire decisions are final; chair umpire can override line calls.</li>
          <li>Walkovers per Organizing Committee discretion.</li>
          <li>Two new sets of Slazenger/Equivalent balls will be used daily.</li>
          <li>Players should bring water bottles, towels, caps.</li>
          <li>After first 2 games, court change; then 1-minute breaks each side after every match.</li>
          <li>If rain or wet courts: matches postponed as per committee discretion.</li>
        </ul>

        <h3 style={{ fontWeight: 700, marginTop: 24 }}>Tie Resolution</h3>
        <ul style={{ paddingLeft: 22, marginTop: 6 }}>
          <li>Overall set points.</li>
          <li>Net games difference (won − conceded).</li>
          <li>Organizing committee has final authority.</li>
        </ul>
      </div>
    </div>
  );
}

  // LIVE STREAM PAGE
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

        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Live Stream</h2>
        
        {/* Show current stream URL */}
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: 8 
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            Current Stream URL:
          </div>
          <div style={{ 
            fontSize: 13, 
            color: '#6b7280', 
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            marginBottom: 8
          }}>
            {youtubeUrl || 'Loading...'}
          </div>
          {youtubeUrl && !youtubeUrl.includes('/embed/') && (
            <div style={{ 
              fontSize: 12, 
              color: '#dc2626', 
              background: '#fef2f2',
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #fecaca'
            }}>
              ⚠️ URL is not in embed format - this may cause connection issues
            </div>
          )}
        </div>
        
        {loadingVideo ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ 
              display: 'inline-block', 
              width: 24, 
              height: 24, 
              border: '3px solid #e5e7eb', 
              borderTop: '3px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ marginTop: 12, color: '#6b7280' }}>Loading stream...</p>
          </div>
        ) : (
          <>
            <div
              style={{
                position: "fixed",
                top: 140,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000
              }}
            >
              <iframe
                title="YouTube live stream"
                src={youtubeUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
                onError={(e) => {
                  console.error('YouTube iframe failed to load:', e);
                }}
                onLoad={() => {
                  console.log('YouTube iframe loaded successfully');
                }}
              />
            </div>
            
            {/* Fallback link if iframe fails */}
            <div style={{ 
              position: 'fixed', 
              bottom: 20, 
              right: 20, 
              zIndex: 1001,
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 12
            }}>
              <a 
                href={youtubeUrl?.replace('/embed/', '/watch?v=')} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#60a5fa', textDecoration: 'none' }}
              >
                Open in YouTube →
              </a>
            </div>
          </>
        )}
      </div>
    );
  }

  // TEAMS PAGE
  if (page === "teams") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setPage("menu")} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e6edf8", background: "white" }}>← Back</button>
        </div>
        <h2 style={{ marginTop: 0 }}>Teams</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Singles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? <div>Loading players…</div> :
                Object.keys(players.singles).length === 0 ? <div style={{ color: "#9ca3af" }}>No singles categories</div> :
                  Object.entries(players.singles).map(([cat, arr]) => renderCategory(cat, arr))
              }
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>Doubles</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {loadingPlayers ? <div>Loading players…</div> :
                Object.keys(players.doubles).length === 0 ? <div style={{ color: "#9ca3af" }}>No doubles categories</div> :
                  Object.entries(players.doubles).map(([cat, arr]) => renderCategory(cat, arr))
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FIXTURES PAGE
  if (page === "fixtures") {
    return (
      <FixturesAndResults
        fixtures={fixtures}
        players={players}
        loading={loadingFixtures}
        onBack={() => setPage("menu")}
        title="Fixtures & Scores"
      />
    );
  }

  return null;
}
