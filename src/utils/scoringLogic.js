/*
 Scoring logic exported for use in Scoring component.
 The project originally used custom Fast4 rules; you can edit rules here.
*/
export const nextPointNoAd = (p) => ({ 0: 15, 15: 30, 30: 40, 40: "Game" }[p] ?? p);

export function advancePointNoAd(a, b, who) {
  let pA = a, pB = b;
  if (who === 0) pA = nextPointNoAd(pA); else pB = nextPointNoAd(pB);
  return [pA, pB];
}

export function makeEmptySet() { return { gamesA: 0, gamesB: 0, tie: false, tieA: 0, tieB: 0, finished: false }; }

/* setOverFast4 implements qualifier/semifinal rules (first to 4) — adjust for Finals if needed by passing different rule set. */
export function setOverFast4(s) {
  if (s.tie) {
    if ((s.tieA >= 5 || s.tieB >= 5) && Math.abs(s.tieA - s.tieB) >= 1) return true;
    return false;
  } else {
    if (s.gamesA === 3 && s.gamesB === 3) return false;
    if (s.gamesA >= 4 || s.gamesB >= 4) return true;
    return false;
  }
}