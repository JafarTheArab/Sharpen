import { h } from '../util.js';

// Show a question with answer buttons. Resolves with the picked index once tapped.
// Marks the right answer green and a wrong pick red.
export function ask(root, { prompt, options, correct, grid = false, signal }) {
  return new Promise((resolve, reject) => {
    root.replaceChildren();
    const wrap = h('div', { class: 'choices' + (grid ? ' grid' : '') });
    const btns = options.map((text, i) =>
      h('button', { class: 'choice', onclick: () => done(i) }, text));
    wrap.append(...btns);
    root.append(h('div', { class: 'prompt' }, prompt), wrap);
    let answered = false;
    function done(i) {
      if (answered) return;
      answered = true;
      btns.forEach((b) => (b.disabled = true));
      btns[correct].classList.add('right');
      if (i !== correct) btns[i].classList.add('wrong');
      resolve({ picked: i, ok: i === correct });
    }
    signal?.addEventListener('abort', () => reject(new DOMException('quit', 'AbortError')));
  });
}

// A note under the answers plus a Next button; resolves when tapped.
export function explainAndNext(root, { ok, text, label = 'Next', signal }) {
  return new Promise((resolve, reject) => {
    const btn = h('button', { class: 'btn primary wide', onclick: () => resolve() }, label);
    root.append(h('div', { class: 'explain ' + (ok ? 'ok' : 'bad') },
      h('div', { class: 'verdict' }, ok ? 'Right ✓' : 'Not quite'),
      text ? h('div', {}, text) : null), btn);
    btn.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    signal?.addEventListener('abort', () => reject(new DOMException('quit', 'AbortError')));
  });
}
