import React, { useState } from "react";
import Card from "./CardFallback"; // explained below — optional

// Simple self-contained AdminLogin component used by App.jsx.
// If you don't want a separate Card component, ignore Card import and
// replace <Card> with a <div className="..."> wrapper in App.
export default function AdminLogin({ onOk }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    // default admin credentials (same as in your main App file)
    if (u === "admin" && p === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      if (typeof onOk === "function") onOk();
    } else {
      setErr("Invalid credentials");
    }
  };

  return (
    <div className="app-bg">
      <div className="max-w-sm mx-auto p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <div className="text-sm text-zinc-600">Default: admin / rnwtennis123$</div>
        </div>

        <div className="bg-white rounded-2xl shadow border border-zinc-200 p-4">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <div className="text-sm mb-1">Username</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={u}
                onChange={(e) => setU(e.target.value)}
              />
            </div>

            <div>
              <div className="text-sm mb-1">Password</div>
              <input
                type="password"
                className="w-full rounded-xl border px-3 py-2"
                value={p}
                onChange={(e) => setP(e.target.value)}
              />
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}

            <button type="submit" className="w-full px-4 py-3 rounded-xl bg-green-600 text-white">
              Enter Admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
