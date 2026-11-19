// Mental Math: 60 seconds, four answer buttons, difficulty nudges up on a streak and down on a miss.
import { randInt as ri, pick, shuffle, h, clamp } from '../util.js';
import { ask } from './ui.js';

export const SECONDS = 60;
export const target = (level) => Math.max(8, 16 - level); // answers in 60 s that count as a full score

const money = (cents) => '$' + (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100));
const num = (n) => ({ show: String(n), value: n, kind: 'n' });
const cash = (c) => ({ show: money(c), value: c, kind: '$' });
const pc = (n) => ({ show: n + '%', value: n, kind: '%' });

// Each type returns { q, a } where a is num/cash/pc.
const T = {
  add1: (r) => { const a = ri(11, 49, r), b = ri(3, 9, r); return { q: `${a} + ${b}`, a: num(a + b) }; },
  sub1: (r) => { const a = ri(12, 59, r), b = ri(3, 9, r); return { q: `${a} − ${b}`, a: num(a - b) }; },
  add2: (r) => { const a = ri(14, 79, r), b = ri(12, 59, r); return { q: `${a} + ${b}`, a: num(a + b) }; },
  sub2: (r) => { const a = ri(41, 99, r), b = ri(12, a - 11, r); return { q: `${a} − ${b}`, a: num(a - b) }; },
  mul9: (r) => { const a = ri(3, 9, r), b = ri(3, 9, r); return { q: `${a} × ${b}`, a: num(a * b) }; },
  mul12: (r) => { const a = ri(6, 12, r), b = ri(6, 12, r); return { q: `${a} × ${b}`, a: num(a * b) }; },
  div: (r) => { const b = ri(3, 12, r), c = ri(3, 12, r); return { q: `${b * c} ÷ ${b}`, a: num(c) }; },
  pct10: (r) => { const base = ri(3, 60, r) * 10; return { q: `10% of ${base}`, a: num(base / 10) }; },
  pct50: (r) => { const base = ri(7, 99, r) * 2; return { q: `Half of ${base}`, a: num(base / 2) }; },
  pct25: (r) => { const base = ri(3, 40, r) * 4; return { q: `25% of ${base}`, a: num(base / 4) }; },
  mul2x1: (r) => { const a = ri(13, 49, r), b = ri(3, 9, r); return { q: `${a} × ${b}`, a: num(a * b) }; },
  tip: (r) => {
    const bill = ri(12, 96, r), rate = pick([10, 15, 20], r);
    return { q: `${rate}% tip on a ${money(bill * 100)} bill`, a: cash(bill * rate) }; // bill*100 cents * rate/100
  },
  sale: (r) => {
    const price = ri(2, 24, r) * 10, off = pick([10, 20, 25, 50], r);
    return { q: `${money(price * 100)} item, ${off}% off. New price?`, a: cash(price * (100 - off)) };
  },
  pctAny: (r) => {
    const rate = pick([5, 15, 30, 40, 60, 75], r), base = ri(2, 20, r) * 20;
    return { q: `${rate}% of ${base}`, a: num((rate * base) / 100) };
  },
  x11: (r) => { const a = ri(12, 89, r); return { q: `${a} × 11`, a: num(a * 11) }; },
  pctChange: (r) => {
    const from = pick([20, 40, 50, 80, 200], r), chg = pick([10, 25, 50, 75], r), up = r() < 0.6;
    const to = from + (up ? 1 : -1) * (from * chg) / 100;
    return { q: `From ${from} to ${to} is what % ${up ? 'increase' : 'decrease'}?`, a: pc(chg) };
  },
  split: (r) => {
    const people = pick([2, 3, 4, 5], r), each = ri(8, 40, r);
    return { q: `${money(each * people * 100)} split ${people} ways`, a: cash(each * 100) };
  },
};

const BY_LEVEL = [
  null,
  ['add1', 'sub1'],
  ['add1', 'sub1', 'add2', 'mul9'],
  ['add2', 'sub2', 'mul9', 'pct50'],
  ['sub2', 'mul9', 'div', 'pct10', 'pct50'],
  ['mul12', 'div', 'pct10', 'pct25', 'split'],
  ['mul12', 'pct25', 'tip', 'mul2x1', 'sale', 'split'],
  ['tip', 'mul2x1', 'pctAny', 'sale', 'split'],
  ['tip', 'pctAny', 'x11', 'pctChange', 'mul2x1', 'sale'],
  ['tip', 'pctAny', 'x11', 'pctChange', 'sale'],
  ['pctAny', 'x11', 'pctChange', 'tip', 'mul2x1'],
];

export function problem(level, r = Math.random) {
  return T[pick(BY_LEVEL[clamp(level, 1, 10)], r)](r);
}

// Three wrong answers that look plausible.
export function wrongAnswers(a, r = Math.random) {
  const v = a.value;
  let cands;
  if (a.kind === '$') cands = [v + 100, v - 100, v + 50, v - 50, v + 10, v - 10, Math.round(v * 1.5), Math.round(v / 2)];
  else if (a.kind === '%') cands = [v + 5, v - 5, v + 10, v - 10, v * 2, Math.round(v / 2)];
  else cands = [v + 1, v - 1, v + 2, v - 2, v + 10, v - 10, v + 11, v - 9];
  const out = [];
  for (const c of shuffle(cands, r)) if (c > 0 && c !== v && !out.includes(c) && out.length < 3) out.push(c);
  return out.map((c) => (a.kind === '$' ? cash(c) : a.kind === '%' ? pc(c) : num(c)));
}

export async function run(root, ctx) {
  let eff = ctx.level, streak = 0, right = 0, answered = 0;
  const missed = [];
  const end = performance.now() + SECONDS * 1000;
  let timeUp = false;
  const tick = () => {
    const left = Math.max(0, Math.ceil((end - performance.now()) / 1000));
    ctx.status(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
    if (left <= 0) timeUp = true;
  };
  tick();
  const timer = setInterval(tick, 250);
  ctx.signal.addEventListener('abort', () => clearInterval(timer));
  const timeout = until(() => timeUp, ctx.signal); // ends the wait if time runs out mid-question
  try {
    while (!timeUp) {
      const p = problem(eff);
      const options = shuffle([p.a, ...wrongAnswers(p.a)]);
      const correct = options.indexOf(p.a);
      const asked = ask(root, {
        prompt: h('div', { class: 'math-q' }, p.q), options: options.map((o) => o.show), correct, grid: true, signal: ctx.signal,
      });
      const res = await Promise.race([asked, timeout]);
      if (!res) break; // time ran out before an answer
      answered++;
      if (res.ok) {
        right++; streak++;
        if (streak >= 4) { eff = Math.min(ctx.level + 2, 10, eff + 1); streak = 0; }
      } else {
        streak = 0; eff = Math.max(1, ctx.level - 1, eff - 1);
        missed.push({ ok: false, title: `${p.q} = ${p.a.show}`, detail: `You picked ${options[res.picked].show}` });
      }
      await new Promise((r) => setTimeout(r, res.ok ? 250 : 900));
    }
  } finally { clearInterval(timer); }
  const acc = answered ? right / answered : 0;
  // Speed counts most; wrong answers only cost you once accuracy drops under 90% (so guessing doesn't pay).
  const pct = Math.round(100 * Math.min(1, right / target(ctx.level)) * Math.min(1, acc / 0.9));
  return {
    pct, summary: `${right} right in ${SECONDS} seconds`,
    extra: answered ? `${Math.round(acc * 100)}% of your answers were right. Goal at this level: ${target(ctx.level)}.` : '',
    review: missed, reviewNote: missed.length ? '' : 'No misses. Nice.',
  };
}

function until(test, signal) {
  return new Promise((resolve) => {
    const t = setInterval(() => { if (test()) { clearInterval(t); resolve(null); } }, 100);
    signal.addEventListener('abort', () => clearInterval(t));
  });
}
