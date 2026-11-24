// Clear Writing: pick the correctly written sentence.
import { SENTENCES } from '../content/sentences.js';
import { shuffle } from '../util.js';
import { ask, explainAndNext } from './ui.js';
import { speedFrom } from '../scoring.js';

export const TIME_LIMIT = 20000;

export const ROUND = 8;

export function tiersFor(level) {
  if (level <= 2) return [1];
  if (level <= 4) return [1, 2];
  if (level <= 7) return [2, 3];
  return [3];
}

// Least recently seen first (never seen = first), shuffled within ties.
export function pickItems(level, seen, rand = Math.random) {
  const tiers = tiersFor(level);
  return shuffle(SENTENCES.filter((s) => tiers.includes(s.tier)), rand)
    .sort((a, b) => (seen[a.id] || '').localeCompare(seen[b.id] || ''))
    .slice(0, ROUND);
}

export async function run(root, ctx) {
  const seen = (ctx.data.seen ||= {});
  const items = pickItems(ctx.level, seen);
  const review = [];
  let right = 0;
  for (let i = 0; i < items.length; i++) {
    const s = items[i];
    ctx.status(`${i + 1} / ${items.length}`);
    const options = shuffle([s.right, s.wrong]);
    const { ok, ms, btn } = await ask(root, {
      prompt: 'Which one is written correctly?', options, correct: options.indexOf(s.right), signal: ctx.signal, timeLimit: TIME_LIMIT,
    });
    ctx.hit(ok, speedFrom(ms, 4000, TIME_LIMIT), btn);
    if (ok) right++;
    seen[s.id] = ctx.day;
    review.push({ ok, title: s.right, detail: s.why });
    await explainAndNext(root, { ok, text: s.why, signal: ctx.signal, label: i === items.length - 1 ? 'See results' : 'Next' });
  }
  return { pct: Math.round((100 * right) / items.length), summary: `${right} of ${items.length} right`, review };
}
