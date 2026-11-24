// Word Power: meanings and fill-in-the-blank, with spaced review (Leitner boxes).
import { WORDS } from '../content/words.js';
import { shuffle, addDays, h } from '../util.js';
import { ask, explainAndNext } from './ui.js';
import { sayRow } from '../speak.js';
import { speedFrom } from '../scoring.js';

export const TIME_LIMIT = 15000;

export const ROUND = 10;
const GAP_DAYS = [0, 1, 2, 4, 8, 16, 30]; // days until a word comes back, by box

export function tiersFor(level) {
  if (level <= 2) return [1];
  if (level <= 4) return [1, 2];
  if (level <= 6) return [2];
  if (level <= 8) return [2, 3];
  return [3];
}

// Missed and due words first, then new words at this level, then anything not yet known.
export function pickWords(level, words, day, rand = Math.random) {
  const tiers = tiersFor(level);
  const rec = (w) => words[w.word];
  const due = WORDS.filter((w) => rec(w) && rec(w).due <= day)
    .sort((a, b) => rec(a).box - rec(b).box || (rec(a).due < rec(b).due ? -1 : 1));
  const picked = due.slice(0, 6);
  const fresh = shuffle(WORDS.filter((w) => !rec(w) && tiers.includes(w.tier)), rand);
  for (const w of fresh) if (picked.length < ROUND) picked.push(w);
  if (picked.length < ROUND) {
    const rest = WORDS.filter((w) => !picked.includes(w))
      .sort((a, b) => (rec(a)?.box ?? 0) - (rec(b)?.box ?? 0) || Math.abs(a.tier - tiers[0]) - Math.abs(b.tier - tiers[0]));
    picked.push(...rest.slice(0, ROUND - picked.length));
  }
  return shuffle(picked, rand);
}

export function updateWord(words, word, ok, day) {
  const r = words[word] || { box: 0, seen: 0, wrong: 0 };
  r.seen++;
  if (ok) r.box = words[word] ? Math.min(GAP_DAYS.length - 1, r.box + 1) : 2;
  else { r.box = 0; r.wrong++; }
  r.due = addDays(day, GAP_DAYS[r.box]);
  words[word] = r;
}

export const knownCount = (words) => Object.values(words).filter((r) => r.box >= 3).length;

function distractors(target, key, n, sameTierFirst) {
  const pool = shuffle(WORDS.filter((w) => w !== target && (key !== 'word' || w.pos === target.pos)));
  if (sameTierFirst) pool.sort((a, b) => (a.tier === target.tier ? 0 : 1) - (b.tier === target.tier ? 0 : 1));
  const out = [];
  for (const w of pool) if (out.length < n && !out.includes(w[key])) out.push(w[key]);
  return out;
}

export async function run(root, ctx) {
  const words = (ctx.data.words ||= {});
  const list = pickWords(ctx.level, words, ctx.day);
  const review = [];
  let right = 0;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    ctx.status(`${i + 1} / ${list.length}`);
    const blank = Math.random() < 0.5;
    const key = blank ? 'word' : 'def';
    const options = shuffle([w[key], ...distractors(w, key, 3, true)]);
    const correct = options.indexOf(w[key]);
    const prompt = blank
      ? h('div', {}, h('div', { class: 'ask' }, 'Which word fits?'),
          h('div', { class: 'sentence' }, ...w.sentence.split('___').flatMap((p, j) => j ? [h('span', { class: 'gap' }, '_____'), p] : [p])))
      : h('div', {}, h('div', { class: 'ask' }, 'What does it mean?'),
          h('div', { class: 'big-word' }, w.word), sayRow(w.word, w.say), h('div', { class: 'pos' }, w.pos));
    const { ok, ms, btn } = await ask(root, { prompt, options, correct, signal: ctx.signal, timeLimit: TIME_LIMIT });
    ctx.hit(ok, speedFrom(ms, 3000, TIME_LIMIT), btn);
    if (ok) right++;
    updateWord(words, w.word, ok, ctx.day);
    review.push({ ok, title: w.word, detail: w.def, word: w.word, say: w.say });
    const filled = w.sentence.replace('___', w.word);
    await explainAndNext(root, {
      ok, signal: ctx.signal,
      text: blank ? h('div', {}, h('b', {}, w.word), sayRow(w.word, w.say, true), `${w.def}.`) : `“${filled}”`,
      label: i === list.length - 1 ? 'See results' : 'Next',
    });
  }
  const pct = Math.round((100 * right) / list.length);
  return {
    pct, summary: `${right} of ${list.length} right`,
    extra: knownCount(words) ? `${knownCount(words)} words learned so far` : '',
    review, reviewNote: 'Words you missed will come back soon.',
  };
}
