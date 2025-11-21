import React from "react";
import Card from "./Card";
import Button from "./Button";
export default function Scoring({ config, onAbort, onComplete }) {
  const sides = (config && config.sides) || ["A","B"];
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onAbort}>◀ Quit</Button>
        <h2 className="text-xl font-bold">Scoring • {sides[0]} vs {sides[1]}</h2>
      </div>
      <Card className="p-6">Scoring UI (stub). Replace with full implementation from original App.jsx.</Card>
    </div>
  );
}