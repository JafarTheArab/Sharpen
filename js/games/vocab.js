// Word Power: meanings and fill-in-the-blank, with spaced review (Leitner boxes).
import { WORDS } from '../content/words.js';
import { shuffle, addDays, h } from '../util.js';
import { ask, explainAndNext } from './ui.js';
import { sayRow } from '../speak.js';
import { speedFrom } from '../scoring.js';
import { pickMisspellings } from '../content/misspell.js';

export const timeLimit = (level) => (level >= 9 ? 10000 : level >= 7 ? 12000 : 15000);
const WORD_SET = new Set(WORDS.map((w) => w.word));

export const ROUND = 10;
const GAP_DAYS = [0, 1, 2, 4, 8, 16, 30]; // days until a word comes back, by box

export function tiersFor(level) {
  if (level <= 2) return [1];
  if (level <= 4) return [1, 2];
  if (level <= 6) return [2];
  if (level <= 7) return [2, 3];
  if (level <= 8) return [3];
  if (level <= 9) return [3, 4];
  return [4];
}

// Question kinds unlock as you climb: meaning, fill the blank, then reverse (meaning -> word),
// spelling, and finally typing the word with no choices.
export function kindsFor(level) {
  const k = ['meaning', 'blank'];
  if (level >= 5) k.push('reverse');
  if (level >= 7) k.push('spell');
  if (level >= 9) k.push('type');
  return k;
}

export function pickKind(level, w, rand = Math.random) {
  const kinds = kindsFor(level).filter((k) => k !== 'spell' || pickMisspellings(w.word, rand, WORD_SET).length === 3);
  return kinds[Math.floor(rand() * kinds.length)];
}

// Accepts the word typed any case, ignoring stray spaces.
export const typedRight = (typed, word) => typed.trim().toLowerCase() === word.toLowerCase();

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

const sentenceWithGap = (w) => h('div', { class: 'sentence' },
  ...w.sentence.split('___').flatMap((p, j) => (j ? [h('span', { class: 'gap' }, '_____'), p] : [p])));

const ASKS = {
  meaning: 'What does it mean?', blank: 'Which word fits?', reverse: 'Which word means this?',
  spell: 'Which spelling is correct?', type: 'Type the word that means this',
};

function multipleChoice(w, kind) {
  if (kind === 'meaning') return {
    prompt: [h('div', { class: 'big-word' }, w.word), sayRow(w.word, w.say), h('div', { class: 'pos' }, w.pos)],
    answer: w.def, others: distractors(w, 'def', 3, true),
  };
  if (kind === 'blank') return { prompt: [sentenceWithGap(w)], answer: w.word, others: distractors(w, 'word', 3, true) };
  if (kind === 'reverse') return {
    prompt: [h('div', { class: 'def-q' }, `“${w.def}”`), h('div', { class: 'pos' }, w.pos)],
    answer: w.word, others: distractors(w, 'word', 3, true),
  };
  return { // spell
    prompt: [h('div', { class: 'def-q' }, `“${w.def}”`), h('div', { class: 'pos' }, w.pos)],
    answer: w.word, others: pickMisspellings(w.word, Math.random, WORD_SET),
  };
}

// Typed answer: meaning + first letter + length. Resolves like ask().
function typeIt(root, w, signal, limit) {
  return new Promise((resolve, reject) => {
    const input = h('input', {
      class: 'type-in', type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'none', spellcheck: 'false',
      placeholder: `${w.word[0]}${'_'.repeat(w.word.length - 1)}`, 'aria-label': 'Type the word', enterkeyhint: 'done',
    });
    const check = h('button', { class: 'btn primary wide', type: 'submit' }, 'Check');
    const skip = h('button', { class: 'btn wide', type: 'button', onclick: () => done(true) }, "I don't know");
    const form = h('form', { class: 'choices typed', onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) done(false); } }, input, check, skip);
    const bar = h('div', { class: 'timebar q' }, h('div', { class: 'fill' }));
    root.replaceChildren(h('div', { class: 'prompt' },
      h('div', { class: 'ask' }, ASKS.type),
      h('div', { class: 'def-q' }, `“${w.def}”`),
      h('div', { class: 'pos' }, `${w.pos} · starts with “${w.word[0]}” · ${w.word.length} letters`)), bar, form);
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.firstChild.style.transitionDuration = limit + 'ms'; bar.firstChild.style.width = '0%'; }));
    try { input.focus({ preventScroll: true }); } catch { /* iPhone may wait for a tap */ }
    const t0 = performance.now();
    let answered = false;
    function done(gaveUp) {
      if (answered) return;
      answered = true;
      const ms = performance.now() - t0;
      const ok = !gaveUp && typedRight(input.value, w.word);
      const f = bar.firstChild; f.style.width = getComputedStyle(f).width; f.style.transitionDuration = '0ms';
      input.blur(); skip.remove();
      const mine = h('div', { class: 'choice ' + (ok ? 'right pop' : 'wrong shake') }, ok ? `✓ ${w.word}` : `✗ ${input.value.trim() || '(skipped)'}`);
      form.replaceChildren(mine, ok ? '' : h('div', { class: 'choice right' }, `✓ ${w.word}`));
      resolve({ ok, ms, btn: mine });
    }
    signal?.addEventListener('abort', () => reject(new DOMException('quit', 'AbortError')));
  });
}

export async function run(root, ctx) {
  const words = (ctx.data.words ||= {});
  const list = pickWords(ctx.level, words, ctx.day);
  const limit = timeLimit(ctx.level);
  const review = [];
  let right = 0;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    ctx.status(`${i + 1} / ${list.length}`);
    const kind = pickKind(ctx.level, w);
    let res;
    if (kind === 'type') {
      res = await typeIt(root, w, ctx.signal, limit + 10000);
      ctx.hit(res.ok, speedFrom(res.ms, 6000, limit + 10000), res.btn, 150);
    } else {
      const q = multipleChoice(w, kind);
      const options = shuffle([q.answer, ...q.others]);
      res = await ask(root, {
        prompt: h('div', {}, h('div', { class: 'ask' }, ASKS[kind]), ...q.prompt),
        options, correct: options.indexOf(q.answer), signal: ctx.signal, timeLimit: limit,
      });
      ctx.hit(res.ok, speedFrom(res.ms, 3000, limit), res.btn, kind === 'spell' || kind === 'reverse' ? 120 : 100);
    }
    const { ok } = res;
    if (ok) right++;
    updateWord(words, w.word, ok, ctx.day);
    review.push({ ok, title: w.word, detail: w.def, word: w.word, say: w.say });
    const filled = w.sentence.replace('___', w.word);
    await explainAndNext(root, {
      ok, signal: ctx.signal,
      text: kind === 'meaning' ? `“${filled}”`
        : h('div', {}, h('b', {}, w.word), sayRow(w.word, w.say, true), kind === 'blank' ? `${w.def}.` : `“${filled}”`),
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
