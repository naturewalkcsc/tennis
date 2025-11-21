import React from "react";
import Card from "./Card";
export default function FixturesAdmin({ onBack }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack}>◀ Back</button>
        <h2 className="text-xl font-bold">Fixtures (Admin)</h2>
      </div>
      <Card className="p-5">Fixtures admin UI (stub). Use the original App.jsx for full implementation.</Card>
    </div>
  );
}