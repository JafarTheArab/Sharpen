// Points and combos (pure, so it can be tested).
import { clamp } from './util.js';

export const makeScore = () => ({ points: 0, combo: 0, bestCombo: 0 });

// x1 for the first two in a row, x2 from 3 in a row, x3 from 6, x4 from 9.
export const multiplier = (combo) => Math.min(4, 1 + Math.floor(combo / 3));

// 0..1: 1 if answered within `fast` ms, 0 at `slow` ms or later.
export const speedFrom = (ms, fast, slow) => clamp((slow - ms) / (slow - fast), 0, 1);

// Returns the points gained. A miss ends the combo.
export function hit(s, ok, speed = 0, base = 100) {
  if (!ok) { s.combo = 0; return 0; }
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  const gained = Math.round(((base + base * speed) * multiplier(s.combo)) / 10) * 10;
  s.points += gained;
  return gained;
}

export const COMBO_WORDS = { 3: 'Nice!', 5: 'Great!', 8: 'On fire!', 12: 'Unstoppable!', 20: 'Legendary!' };
