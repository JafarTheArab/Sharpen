import { h } from '../util.js';

// Show a question with answer buttons. Resolves once tapped with { picked, ok, ms, btn }.
// Marks the right answer green (with a pop) and a wrong pick red (with a shake).
// timeLimit (ms) shows a draining bar: it only affects bonus points, it never ends the question.
export function ask(root, { prompt, options, correct, grid = false, signal, timeLimit = 0 }) {
  return new Promise((resolve, reject) => {
    root.replaceChildren();
    const wrap = h('div', { class: 'choices' + (grid ? ' grid' : '') });
    const btns = options.map((text, i) =>
      h('button', { class: 'choice', onclick: () => done(i) }, text));
    wrap.append(...btns);
    const bar = timeLimit ? h('div', { class: 'timebar q' }, h('div', { class: 'fill' })) : null;
    root.append(...[h('div', { class: 'prompt' }, prompt), bar, wrap].filter(Boolean));
    if (bar) requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.firstChild.style.transitionDuration = timeLimit + 'ms';
      bar.firstChild.style.width = '0%';
    }));
    const t0 = performance.now();
    let answered = false;
    function done(i) {
      if (answered) return;
      answered = true;
      const ms = performance.now() - t0;
      if (bar) { const f = bar.firstChild; f.style.width = getComputedStyle(f).width; f.style.transitionDuration = '0ms'; }
      btns.forEach((b) => (b.disabled = true));
      btns[correct].classList.add('right');
      if (i === correct) btns[i].classList.add('pop');
      else btns[i].classList.add('wrong', 'shake');
      resolve({ picked: i, ok: i === correct, ms, btn: btns[i] });
    }
    signal?.addEventListener('abort', () => reject(new DOMException('quit', 'AbortError')));
  });
}

// A note above the answers plus a Next button at the bottom; resolves when tapped.
export function explainAndNext(root, { ok, text, label = 'Next', signal }) {
  return new Promise((resolve, reject) => {
    const btn = h('button', { class: 'btn primary wide', onclick: () => resolve() }, label);
    const note = h('div', { class: 'explain ' + (ok ? 'ok' : 'bad') },
      h('div', { class: 'verdict' }, ok ? 'Right ✓' : 'Not quite'),
      text ? h('div', {}, text) : null);
    const answers = root.querySelector('.choices');
    answers ? answers.before(note) : root.append(note);
    root.append(btn);
    btn.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    signal?.addEventListener('abort', () => reject(new DOMException('quit', 'AbortError')));
  });
}
