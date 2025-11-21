import React from "react";
import { motion } from "framer-motion";
import { Trophy, CalendarPlus } from "lucide-react";

import imgStart from "./StartMatch.jpg";
import imgScore from "./Score.jpg";
import imgSettings from "./Settings.jpg";

export default function Landing({ onStart, onResults, onSettings, onFixtures }) {
  const Tile = ({ title, subtitle, src, action }) => (
    <motion.button
      onClick={action}
      whileHover={{ y: -3 }}
      className="w-full md:w-80 rounded-2xl overflow-hidden border shadow bg-white text-left"
      style={{ cursor: "pointer" }}
    >
      <div className="h-40 relative">
        <img src={src} className="absolute inset-0 w-full h-full object-cover" alt={title} />
      </div>
      <div className="p-4">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-zinc-600">{subtitle}</div>
      </div>
    </motion.button>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-6 h-6 text-green-600" />
        <h1 className="text-2xl font-bold">RNW Tennis Tournament 2025</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Tile title="Start Match" subtitle="Choose from fixtures" src={imgStart} action={onStart} />
        <Tile title="Results" subtitle="Active • Upcoming • Completed" src={imgScore} action={onResults} />
        <Tile title="Manage Players" subtitle="Singles & Doubles" src={imgSettings} action={onSettings} />
      </div>

      <div className="mt-6">
        <button
          onClick={onFixtures}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200"
        >
          <CalendarPlus className="w-4 h-4" />
          Fixtures
        </button>
      </div>
    </div>
  );
}

