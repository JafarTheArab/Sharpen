// Badges to earn. Pure checks on saved data + the round just played.
import { GAME_IDS } from './games/meta.js';
import { workoutDone, streak } from './plan.js';
import { knownCount } from './games/vocab.js';
import { addDays } from './util.js';

export const workoutCount = (data) => Object.keys(data.days).filter((d) => workoutDone(data, d)).length;

export function longestStreak(data) {
  const days = Object.keys(data.days).filter((d) => workoutDone(data, d)).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}

const maxLevel = (data) => Math.max(0, ...GAME_IDS.map((id) => data.games[id]?.level || 0));

// check(data, day, round) -> true when earned. round = { id, pct, points, bestCombo, right, longest } or null.
export const BADGES = [
  { id: 'first', icon: '🌱', name: 'First Steps', how: 'Finish your first workout', check: (d) => workoutCount(d) >= 1 },
  { id: 'streak3', icon: '🔥', name: 'On a Roll', how: '3-day streak', check: (d, day) => streak(d, day) >= 3 },
  { id: 'streak7', icon: '📅', name: 'Week Warrior', how: '7-day streak', check: (d, day) => streak(d, day) >= 7 },
  { id: 'streak30', icon: '🏔️', name: 'Habit Formed', how: '30-day streak', check: (d, day) => streak(d, day) >= 30 },
  { id: 'workouts10', icon: '💪', name: 'Regular', how: '10 workouts', check: (d) => workoutCount(d) >= 10 },
  { id: 'workouts50', icon: '🏋️', name: 'Dedicated', how: '50 workouts', check: (d) => workoutCount(d) >= 50 },
  { id: 'words25', icon: '📖', name: 'Word Collector', how: 'Learn 25 words', check: (d) => knownCount(d.words) >= 25 },
  { id: 'words100', icon: '📚', name: 'Wordsmith', how: 'Learn 100 words', check: (d) => knownCount(d.words) >= 100 },
  { id: 'words200', icon: '🎓', name: 'Walking Dictionary', how: 'Learn 200 words', check: (d) => knownCount(d.words) >= 200 },
  { id: 'perfect', icon: '💯', name: 'Flawless', how: 'Score 100% in any game', check: (d, day, r) => r?.pct >= 100 },
  { id: 'combo10', icon: '⚡', name: 'Combo King', how: '10 right in a row', check: (d, day, r) => r?.bestCombo >= 10 },
  { id: 'points2000', icon: '⭐', name: 'High Scorer', how: '2,000 points in one game', check: (d, day, r) => r?.points >= 2000 },
  { id: 'math20', icon: '🧮', name: 'Human Calculator', how: '20 right in one Mental Math round', check: (d, day, r) => r?.id === 'math' && r.right >= 20 },
  { id: 'memory8', icon: '🪤', name: 'Steel Trap', how: 'Remember an 8-word list perfectly', check: (d, day, r) => r?.id === 'memory' && r.longest >= 8 },
  { id: 'level5', icon: '🥈', name: 'Halfway There', how: 'Reach level 5 in any game', check: (d) => maxLevel(d) >= 5 },
  { id: 'level10', icon: '🥇', name: 'Top Level', how: 'Reach level 10 in any game', check: (d) => maxLevel(d) >= 10 },
  { id: 'allround', icon: '🌟', name: 'All-Rounder', how: 'Level 5 or higher in every game', check: (d) => GAME_IDS.every((id) => (d.games[id]?.level || 0) >= 5) },
];

// Marks newly earned badges as earned and returns them.
export function award(data, day, round) {
  data.badges ||= {};
  const fresh = [];
  for (const b of BADGES) if (!data.badges[b.id] && b.check(data, day, round)) { data.badges[b.id] = day; fresh.push(b); }
  return fresh;
}
