// node tests/logic.test.mjs  — plan, streak, levels, word review, math problems.
import assert from 'node:assert/strict';
import { todayPlan, recordResult, streak, levelAfter, workoutDone } from '../js/plan.js';
import { pickWords, updateWord, ROUND as VROUND, kindsFor, pickKind, typedRight, tiersFor } from '../js/games/vocab.js';
import { pickMisspellings } from '../js/content/misspell.js';
import { pickItems } from '../js/games/writing.js';
import { problem, wrongAnswers } from '../js/games/math.js';
import { WORDS } from '../js/content/words.js';
import { SENTENCES } from '../js/content/sentences.js';
import { LIST_WORDS } from '../js/content/listwords.js';
import { addDays, seeded } from '../js/util.js';
import { makeScore, hit, multiplier, speedFrom } from '../js/scoring.js';
import { award, longestStreak, workoutCount } from '../js/badges.js';

const fresh = () => ({ games: {}, words: {}, seen: {}, days: {} });
let n = 0; const ok = (name) => { n++; console.log('✓', name); };

// Content sanity
assert.equal(new Set(WORDS.map((w) => w.word)).size, WORDS.length, 'duplicate word');
for (const w of WORDS) assert.equal(w.sentence.split('___').length, 2, `sentence for ${w.word} needs one blank`);
for (const w of WORDS) assert.match(w.say || '', /[A-Z]/, `${w.word} needs a pronunciation with a stressed (CAPS) part`);
for (const t of [1, 2, 3, 4]) for (const p of ['adj', 'noun', 'verb']) assert.ok(WORDS.filter((w) => w.tier === t && w.pos === p).length >= 3, `tier ${t} ${p}`);
for (const s of SENTENCES) assert.notEqual(s.right, s.wrong);
assert.equal(new Set(LIST_WORDS).size, LIST_WORDS.length, 'duplicate list word');
assert.ok(LIST_WORDS.length >= 30);
ok(`content: ${WORDS.length} words, ${SENTENCES.length} writing items, ${LIST_WORDS.length} list words`);

// Plan: 3 different games, stable for the day, prefers games not played lately
{
  const d = fresh(), day = '2026-11-19';
  const p = todayPlan(d, day).plan;
  assert.equal(p.length, 3); assert.equal(new Set(p).size, 3);
  assert.deepEqual(todayPlan(d, day).plan, p);
  for (const id of p) recordResult(d, id, 80, day);
  assert.ok(workoutDone(d, day));
  const left = ['vocab', 'math', 'memory', 'writing'].find((id) => !p.includes(id));
  assert.ok(todayPlan(d, addDays(day, 1)).plan.includes(left), 'skipped game comes up next day');
  ok('daily plan');
}

// Streak
{
  const d = fresh(); let day = '2026-11-10';
  for (let i = 0; i < 4; i++) { for (const id of todayPlan(d, day).plan) recordResult(d, id, 70, day); day = addDays(day, 1); }
  assert.equal(streak(d, addDays(day, -1)), 4);
  assert.equal(streak(d, day), 4, 'today not done yet keeps yesterday streak');
  assert.equal(streak(d, addDays(day, 1)), 0, 'missed a day resets');
  ok('streak');
}

// Levels
assert.equal(levelAfter(3, 90), 4); assert.equal(levelAfter(3, 100), 5); assert.equal(levelAfter(9, 100), 10); assert.equal(levelAfter(3, 70), 3); assert.equal(levelAfter(3, 40), 2);
assert.equal(levelAfter(1, 0), 1); assert.equal(levelAfter(10, 100), 10);
ok('levels: +2 for perfect, +1 at 85%+, -1 under 55%');

// Words: missed come back first; new words at the level's tier
{
  const words = {}, day = '2026-11-19';
  const first = pickWords(1, words, day, seeded('a'));
  assert.equal(first.length, VROUND);
  assert.ok(first.every((w) => w.tier === 1));
  updateWord(words, first[0].word, false, day);
  updateWord(words, first[1].word, true, day);
  assert.equal(words[first[1].word].due, addDays(day, 2));
  const again = pickWords(1, words, day, seeded('b')).map((w) => w.word);
  assert.ok(again.includes(first[0].word), 'missed word returns the same day');
  assert.ok(!again.includes(first[1].word), 'known word waits');
  // learn everything at level 10 still gives a full round
  for (const w of WORDS) words[w.word] = { box: 5, due: '2099-01-01', seen: 3, wrong: 0 };
  assert.equal(pickWords(10, words, day).length, VROUND);
  ok('word review');
}

// Writing: unseen first
{
  const seen = {}; const a = pickItems(1, seen); a.forEach((s) => (seen[s.id] = '2026-11-19'));
  const b = pickItems(1, seen);
  assert.ok(b.filter((s) => !seen[s.id]).length >= Math.min(8, SENTENCES.filter((s) => s.tier === 1).length - 8));
  ok('writing picks unseen items first');
}

// Math: answers right, distractors distinct and positive, at every level
{
  const r = seeded('m');
  for (let lvl = 1; lvl <= 10; lvl++) for (let i = 0; i < 300; i++) {
    const p = problem(lvl, r);
    assert.ok(Number.isFinite(p.a.value) && p.a.value > 0, `${p.q} -> ${p.a.value}`);
    assert.ok(Number.isInteger(p.a.value), `${p.q} must have a whole answer (cents for money)`);
    const w = wrongAnswers(p.a, r);
    assert.equal(w.length, 3, p.q);
    assert.equal(new Set([p.a.show, ...w.map((x) => x.show)]).size, 4, p.q);
  }
  ok('math problems at all 10 levels');
}

// Points and combos
{
  const s = makeScore();
  assert.equal(hit(s, true, 0), 100);
  assert.equal(hit(s, true, 1), 200);
  assert.equal(hit(s, true, 0), 200, 'x2 from 3 in a row');
  assert.equal(hit(s, false), 0); assert.equal(s.combo, 0); assert.equal(s.bestCombo, 3);
  assert.equal(multiplier(9), 4); assert.equal(multiplier(30), 4);
  assert.equal(speedFrom(1000, 3000, 15000), 1); assert.equal(speedFrom(15000, 3000, 15000), 0);
  ok('points and combos');
}

// Badges, best streak
{
  const d = fresh(); let day = '2026-11-01';
  for (let i = 0; i < 3; i++) { for (const id of todayPlan(d, day).plan) recordResult(d, id, 70, day, 500); day = addDays(day, 1); }
  day = addDays(day, 2); for (const id of todayPlan(d, day).plan) recordResult(d, id, 70, day, 500);
  assert.equal(longestStreak(d), 3); assert.equal(workoutCount(d), 4);
  const got = award(d, day, { id: 'math', pct: 100, points: 2500, bestCombo: 11, right: 21 }).map((b) => b.id);
  for (const b of ['first', 'perfect', 'combo10', 'points2000', 'math20']) assert.ok(got.includes(b), b);
  assert.ok(!got.includes('streak7'));
  assert.equal(award(d, day, null).length, 0, 'badges are only awarded once');
  const r = recordResult(d, 'math', 90, day, 3000);
  assert.ok(r.newBest);
  ok('badges and personal bests');
}

// Top levels: expert words and harder question kinds
{
  assert.deepEqual(tiersFor(10), [4]);
  assert.deepEqual(kindsFor(1), ['meaning', 'blank']);
  assert.ok(kindsFor(10).includes('type') && kindsFor(10).includes('spell'));
  const set = new Set(WORDS.map((w) => w.word));
  for (const w of WORDS.filter((x) => x.tier >= 2)) {
    const m = pickMisspellings(w.word, Math.random, set);
    assert.equal(m.length, 3, w.word);
    assert.ok(m.every((x) => x !== w.word && !set.has(x)), w.word);
  }
  const imply = WORDS.find((w) => w.word === 'imply');
  for (let i = 0; i < 50; i++) assert.notEqual(pickKind(10, { ...imply, word: 'xx' }), 'spell', 'no spelling question without 3 misspellings');
  assert.ok(typedRight('  Sinecure ', 'sinecure')); assert.ok(!typedRight('sinecur', 'sinecure'));
  const picked = pickWords(10, {}, '2026-11-25');
  assert.ok(picked.every((w) => w.tier === 4));
  ok('expert words, spelling and typing questions');
}

console.log(`\nAll ${n} checks passed.`);
