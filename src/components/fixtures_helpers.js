// Shared helpers for fixtures: match type constants and helpers
export const MATCH_TYPES = [
  { key: "qualifier", label: "Qualifier" },
  { key: "semifinal", label: "Semifinal" },
  { key: "final", label: "Final" },
];

export function labelForType(key) {
  const it = MATCH_TYPES.find(m => m.key === key);
  return it ? it.label : key;
}