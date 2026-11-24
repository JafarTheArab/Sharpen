// Daily workout, levels and streak. Pure logic on the store's data object.
import { GAME_IDS } from './games/meta.js';
import { addDays, seeded, shuffle, clamp } from './util.js';

export const WORKOUT_SIZE = 3;
export const MAX_LEVEL = 10;

// Pick today's 3 games: the ones played longest ago, ties broken by the date.
export function todayPlan(data, day) {
  if (data.days[day]?.plan) return data.days[day];
  const rand = seeded('plan' + day);
  const order = shuffle(GAME_IDS, rand)
    .map((id, i) => ({ id, i, last: data.games[id]?.last || '' }))
    .sort((a, b) => (a.last < b.last ? -1 : a.last > b.last ? 1 : a.i - b.i))
    .slice(0, WORKOUT_SIZE)
    .map((x) => x.id);
  data.days[day] = { plan: order, done: {} };
  return data.days[day];
}

export function levelAfter(level, pct) {
  if (pct >= 100) return clamp(level + 2, 1, MAX_LEVEL);
  if (pct >= 85) return clamp(level + 1, 1, MAX_LEVEL);
  if (pct < 55) return clamp(level - 1, 1, MAX_LEVEL);
  return level;
}

export function recordResult(data, id, pct, day, points = null) {
  const g = (data.games[id] ||= { level: 1, history: [], last: null });
  const before = g.level;
  const prevBest = g.best || 0;
  if (points != null) g.best = Math.max(prevBest, points);
  g.level = levelAfter(g.level, pct);
  g.last = day;
  g.history.push({ d: day, pct, level: before, pts: points });
  if (g.history.length > 90) g.history.splice(0, g.history.length - 90);
  const today = todayPlan(data, day);
  if (today.plan.includes(id) && today.done[id] == null) today.done[id] = pct;
  return { before, after: g.level, prevBest, newBest: points != null && points > prevBest && prevBest > 0 };
}

export const workoutDone = (data, day) => {
  const d = data.days[day];
  return !!d && d.plan.every((id) => d.done[id] != null);
};

// Days in a row with a finished workout, ending today (or yesterday if today isn't done yet).
export function streak(data, day) {
  let d = workoutDone(data, day) ? day : addDays(day, -1);
  let n = 0;
  while (workoutDone(data, d)) { n++; d = addDays(d, -1); }
  return n;
}
