import React from "react";
import Card from "./Card";
export default function ManagePlayers({ onBack }) {
  return (
    <div style={{ padding: 24 }}>
      <button onClick={onBack}>◀ Back</button>
      <h2>Manage Players</h2>
      <Card className="p-4">Use admin to manage players. (Component stub)</Card>
    </div>
  );
}