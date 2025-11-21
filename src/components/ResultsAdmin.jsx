import React from "react";
import Card from "./Card";
export default function ResultsAdmin({ onBack }) {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6"><button onClick={onBack}>◀ Back</button><h2 className="text-xl font-bold">Results</h2></div>
      <Card className="p-6">Results UI (stub).</Card>
    </div>
  );
}