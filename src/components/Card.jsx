import React from "react";
export default function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-2xl shadow border border-zinc-200 ${className}`}>{children}</div>;
}