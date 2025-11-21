export const buster = () => `?t=${Date.now()}`;

async function fetchJson(url, opts) {
  const res = await fetch(url + buster(), opts || { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} failed ${res.status}`);
  return await res.json();
}

export const api = {
  playersGet: () => fetchJson("/api/players"),
  playersSet: (payload) => fetch("/api/players" + buster(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }) }),
  fixturesList: () => fetchJson("/api/fixtures"),
  fixturesAdd: (payload) => fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "add", payload }) }),
  fixturesUpdate: (id, patch) => fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "update", id, patch }) }),
  fixturesRemove: (id) => fetch("/api/fixtures" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "remove", id }) }),
  matchesList: () => fetchJson("/api/matches"),
  matchesAdd: (payload) => fetch("/api/matches" + buster(), { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ action: "add", payload }) }),
};