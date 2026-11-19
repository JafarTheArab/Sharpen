// List Recall: study a list, then tap the words that were on it. Lists grow when you get one fully right.
import { LIST_WORDS } from '../content/listwords.js';
import { shuffle, h, wait, clamp } from '../util.js';

export const TRIALS = 5;
export const startLength = (level) => clamp(level + 2, 3, 12);
export const studyMs = (n) => 1500 + n * 1300;

export async function run(root, ctx) {
  let n = startLength(ctx.level);
  let hits = 0, shown = 0;
  const review = [];
  for (let t = 0; t < TRIALS; t++) {
    ctx.status(`List ${t + 1} / ${TRIALS}`);
    const pool = shuffle(LIST_WORDS);
    const list = pool.slice(0, n);
    const decoys = pool.slice(n, n + Math.min(n, 8));

    // Study
    const ms = studyMs(n);
    const bar = h('div', { class: 'timebar' }, h('div', { class: 'fill' }));
    root.replaceChildren(
      h('div', { class: 'prompt' }, h('div', { class: 'ask' }, `Remember these ${n} words`)),
      h('div', { class: 'tiles study' }, list.map((w) => h('div', { class: 'tile' }, w))),
      bar,
    );
    requestAnimationFrame(() => {
      bar.firstChild.style.transitionDuration = ms + 'ms';
      bar.firstChild.style.width = '0%';
    });
    await wait(ms, ctx.signal);

    // Recall
    const picked = await recall(root, n, shuffle([...list, ...decoys]), list, ctx.signal);
    const got = picked.filter((w) => list.includes(w)).length;
    hits += got; shown += n;
    const all = got === n;
    review.push({ n, ok: all, title: `List of ${n}: ${got} found`, detail: all ? 'All of them ✓' : 'Missed: ' + list.filter((w) => !picked.includes(w)).join(', ') });
    await new Promise((resolve, reject) => {
      root.querySelector('.tiles').before(h('div', { class: 'explain ' + (all ? 'ok' : 'bad') },
        h('div', { class: 'verdict' }, all ? `All ${n} ✓` : `${got} of ${n}`),
        h('div', {}, all ? 'Next list is one word longer.' : n > 3 ? 'Next list is one word shorter.' : 'Same length next time.')));
      root.append(h('button', { class: 'btn primary wide', onclick: resolve }, t === TRIALS - 1 ? 'See results' : 'Next list'));
      ctx.signal.addEventListener('abort', () => reject(new DOMException('quit', 'AbortError')));
    });
    n = clamp(all ? n + 1 : n - 1, 3, 14);
  }
  return {
    pct: Math.round((100 * hits) / shown),
    summary: `${hits} of ${shown} words remembered`,
    extra: review.some((r) => r.ok)
      ? `Longest list you got fully right: ${Math.max(...review.filter((r) => r.ok).map((r) => r.n))} words.`
      : 'Lists will start a little shorter next time.',
    review,
  };
}

function recall(root, n, options, list, signal) {
  return new Promise((resolve, reject) => {
    const chosen = new Set();
    const info = h('div', { class: 'ask' }, `Tap the ${n} words that were on the list`);
    const tiles = options.map((w) => h('button', {
      class: 'tile pick',
      onclick: (e) => {
        if (chosen.size >= n && !chosen.has(w)) return;
        chosen.has(w) ? chosen.delete(w) : chosen.add(w);
        e.currentTarget.classList.toggle('on', chosen.has(w));
        info.textContent = chosen.size < n ? `${n - chosen.size} more to pick` : 'Checking…';
        if (chosen.size === n) finish();
      },
    }, w));
    root.replaceChildren(h('div', { class: 'prompt' }, info), h('div', { class: 'tiles pick-area' }, tiles));
    function finish() {
      tiles.forEach((b) => {
        b.disabled = true;
        b.classList.remove('on');
        const w = b.textContent, on = chosen.has(w), was = list.includes(w);
        if (on && was) b.classList.add('right');
        else if (on) b.classList.add('wrong');
        else if (was) b.classList.add('missed');
      });
      info.textContent = 'Green: right. Red: not on the list. Outlined: ones you missed.';
      resolve([...chosen]);
    }
    signal.addEventListener('abort', () => reject(new DOMException('quit', 'AbortError')));
  });
}
