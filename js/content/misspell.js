// Makes believable misspellings for the spelling questions (pure, tested).
// Common real-life mistakes first (double letters, -ant/-ent, -able/-ible, ie/ei, c/s), then vowel swaps.
const COMMON = [
  (w) => w.replace(/([bcdfglmnprst])\1/, '$1'),
  (w) => w.replace(/([aeiou])([bcdfglmnprt])([aeiouy])/, '$1$2$2$3'),
  (w) => w.replace(/ie/, 'ei'), (w) => w.replace(/ei/, 'ie'),
  (w) => w.replace(/ant$/, 'ent'), (w) => w.replace(/ent$/, 'ant'),
  (w) => w.replace(/ance$/, 'ence'), (w) => w.replace(/ence$/, 'ance'),
  (w) => w.replace(/able$/, 'ible'), (w) => w.replace(/ible$/, 'able'),
  (w) => w.replace(/ious$/, 'eous'), (w) => w.replace(/eous$/, 'ious'), (w) => w.replace(/([^i])ous$/, '$1ious'),
  (w) => w.replace(/c([ei])/, 's$1'), (w) => w.replace(/s([ei])/, 'c$1'), (w) => w.replace(/sc/, 's'),
  (w) => w.replace(/ph/, 'f'), (w) => w.replace(/y/, 'i'), (w) => w.replace(/ize$/, 'ise'),
  (w) => w.replace(/ary$/, 'ery'), (w) => w.replace(/ery$/, 'ary'), (w) => w.replace(/ate$/, 'ite'),
  (w) => w.replace(/qu/, 'kw'), (w) => w.replace(/ch/, 'sh'), (w) => w.replace(/x/, 'cks'),
];

export function misspellings(word, avoid = new Set()) {
  const ok = (c) => c && c !== word && !avoid.has(c) && /^[a-z]+$/.test(c);
  const common = [...new Set(COMMON.map((f) => f(word)))].filter(ok);
  const vowels = 'aeiou', swaps = [];
  for (let i = 1; i < word.length - 1; i++) {
    if (!vowels.includes(word[i])) continue;
    for (const v of vowels) if (v !== word[i]) swaps.push(word.slice(0, i) + v + word.slice(i + 1));
  }
  // drop a middle vowel too ("mellifluous" -> "mellifluos")
  for (let i = 2; i < word.length - 1; i++) if (vowels.includes(word[i]) && vowels.includes(word[i - 1]) || (vowels.includes(word[i]) && vowels.includes(word[i + 1]))) swaps.push(word.slice(0, i) + word.slice(i + 1));
  return { common, swaps: [...new Set(swaps)].filter((c) => ok(c) && !common.includes(c)) };
}

// Three wrong spellings, preferring the common-mistake kind.
export function pickMisspellings(word, rand = Math.random, avoid) {
  const { common, swaps } = misspellings(word, avoid);
  const take = (arr, n) => { const a = arr.slice(), out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(rand() * a.length), 1)[0]); return out; };
  const out = take(common, 2);
  return [...out, ...take(swaps, 3 - out.length)];
}
