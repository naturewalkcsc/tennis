import React, { useState } from "react";
import Card from "./Card";     // <-- This exists
import Button from "./Button"; // <-- This exists

export default function AdminLogin({ onOk }) {
  const [u, setU] = useState("admin");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (u === "admin" && p === "rnwtennis123$") {
      localStorage.setItem("lt_admin", "1");
      onOk();
    } else {
      setErr("Invalid credentials");
    }
  };

  return (
    <div className="app-bg min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <div className="text-sm text-zinc-600">
            Default: <b>admin / rnwtennis123$</b>
          </div>
        </div>

        <Card className="p-5">
          <form onSubmit={submit} className="space-y-4">
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

            <Button type="submit" className="w-full">
              Enter Admin
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
