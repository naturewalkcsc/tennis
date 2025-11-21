import React from "react";
import Card from "./Card";
import Button from "./Button";
export default function StartFromFixtures({ onBack, onStartScoring }) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack}>◀ Back</Button>
        <h2 className="text-xl font-bold">Start Match</h2>
      </div>
      <Card className="p-5">StartFromFixtures (stub). Use admin fixtures to start matches.</Card>
    </div>
  );
}