// Screens: home, game intro, playing, result, workout done.
import { store } from './store.js';
import { GAMES, GAME_IDS, RUNNERS } from './games/index.js';
import { todayPlan, recordResult, streak, workoutDone, MAX_LEVEL } from './plan.js';
import { knownCount } from './games/vocab.js';
import { ymd, h } from './util.js';

export const VERSION = 'Stage 1.2 · 2026-11-19';
const app = document.getElementById('app');
let running = null; // AbortController of the game being played
let onHome = false;

const today = () => ymd();
function show(...nodes) {
  onHome = false;
  app.replaceChildren(...nodes);
  window.scrollTo(0, 0);
}
const icon = (id, big) => h('div', { class: 'gicon' + (big ? ' big' : ''), style: { background: GAMES[id].color } }, GAMES[id].icon);

// ---------- Home ----------
function home() {
  const d = today(), data = store.data;
  const day = todayPlan(data, d);
  store.save();
  const done = workoutDone(data, d);
  const s = streak(data, d);
  const next = day.plan.find((id) => day.done[id] == null);
  const started = day.plan.some((id) => day.done[id] != null);

  const tiles = day.plan.map((id) => h('div', { class: 'wtile' + (day.done[id] != null ? ' done' : '') },
    icon(id),
    h('div', { class: 'wtext' }, h('div', { class: 'wname' }, GAMES[id].name), h('div', { class: 'muted small' }, GAMES[id].area)),
    h('div', { class: 'wstate' }, day.done[id] != null ? `✓ ${day.done[id]}%` : '')));

  const workout = h('section', { class: 'card workout' },
    h('div', { class: 'row between' },
      h('div', {}, h('div', { class: 'label' }, "Today's workout"),
        h('div', { class: 'muted small' }, new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))),
      h('div', { class: 'streak' + (s ? ' on' : '') }, '🔥 ', h('b', {}, s), s === 1 ? ' day' : ' days')),
    h('div', { class: 'wlist' }, tiles),
    done
      ? h('div', { class: 'done-note' }, 'Done for today ✓ Come back tomorrow to keep your streak.')
      : h('button', { class: 'btn primary big wide', id: 'startWorkout', onclick: () => intro(next, 'workout') },
          started ? `Continue: ${GAMES[next].name}` : 'Start workout'),
    h('div', { class: 'muted small center' }, 'About 5 minutes · 3 games'));

  const skills = h('section', { class: 'card' },
    h('div', { class: 'label' }, 'Your skills'),
    h('div', { class: 'muted small' }, 'Tap one for extra practice.'),
    GAME_IDS.map((id) => {
      const g = store.game(id);
      const last = g.history.at(-1);
      const sub = id === 'vocab' ? `${knownCount(data.words)} words learned`
        : last ? `Last score ${last.pct}%` : 'Not played yet';
      return h('button', { class: 'skill', onclick: () => intro(id, 'free') },
        icon(id),
        h('div', { class: 'stext' },
          h('div', { class: 'row between' }, h('b', {}, GAMES[id].area), h('span', { class: 'muted small' }, `Level ${g.level}`)),
          h('div', { class: 'meter' }, h('div', { style: { width: (100 * g.level) / MAX_LEVEL + '%', background: GAMES[id].color } })),
          h('div', { class: 'muted small' }, sub)));
    }));

  const foot = h('footer', { class: 'foot muted small' },
    h('div', {}, 'Your progress is saved on this phone only. Nothing is sent anywhere.'),
    h('div', {}, VERSION, ' · ', h('button', { class: 'link', onclick: resetAll }, 'Start over')));

  show(h('header', { class: 'top' }, h('div', { class: 'brand' }, 'Sharpen')), workout, skills, foot);
  onHome = true;
}

function resetAll() {
  if (!confirm('Erase all your progress (levels, words learned, streak) and start over?')) return;
  store.reset();
  home();
}

// ---------- Intro ----------
function intro(id, mode) {
  const g = GAMES[id], lvl = store.game(id).level;
  show(
    h('header', { class: 'top' }, h('button', { class: 'btn ghost', onclick: home }, '‹ Home')),
    h('section', { class: 'card intro' },
      icon(id, true),
      h('div', { class: 'muted' }, g.area),
      h('h1', {}, g.name),
      h('p', {}, g.how),
      h('div', { class: 'pill' }, `Level ${lvl} of ${MAX_LEVEL}`)),
    h('button', { class: 'btn primary big wide dock', id: 'go', onclick: () => play(id, mode) }, 'Start'));
}

// ---------- Play ----------
async function play(id, mode) {
  running?.abort();
  const ac = new AbortController();
  running = ac;
  const status = h('div', { class: 'status' });
  const body = h('main', { class: 'play' });
  const quit = () => {
    if (!confirm("Quit this game? It won't count.")) return;
    ac.abort();
    home();
  };
  show(h('header', { class: 'top play-top' },
    h('button', { class: 'btn ghost close', 'aria-label': 'Quit', onclick: quit }, '✕'),
    h('div', { class: 'ptitle' }, GAMES[id].name), status), body);

  const d = today();
  let res;
  try {
    res = await RUNNERS[id].run(body, {
      level: store.game(id).level, data: store.data, day: d, signal: ac.signal,
      status: (t) => (status.textContent = t),
    });
  } catch (e) {
    if (e.name === 'AbortError') return;
    throw e;
  }
  if (ac.signal.aborted) return;
  running = null;
  const wasDone = workoutDone(store.data, d);
  const change = recordResult(store.data, id, res.pct, d);
  store.save();
  result(id, mode, res, change, !wasDone && workoutDone(store.data, d));
}

// ---------- Result ----------
function result(id, mode, res, { before, after }, justFinished) {
  const d = today(), day = store.data.days[d];
  const next = day.plan.find((x) => day.done[x] == null);
  const levelLine = after - before >= 2 ? `Perfect! Jumped up to level ${after}.`
    : after > before ? `Level up! You're now on level ${after}.`
    : after < before ? `Eased back to level ${after}. It adjusts as you go.`
    : `Staying on level ${after}.`;
  let btn;
  if (justFinished) btn = h('button', { class: 'btn primary big wide dock', id: 'next', onclick: finished }, 'Finish workout');
  else if (mode === 'workout' && next) btn = h('button', { class: 'btn primary big wide dock', id: 'next', onclick: () => intro(next, 'workout') }, `Next: ${GAMES[next].name}`);
  else btn = h('button', { class: 'btn primary big wide dock', id: 'next', onclick: home }, 'Back home');

  const items = res.review || [];
  show(
    h('section', { class: 'card result' },
      icon(id, true),
      h('div', { class: 'muted' }, GAMES[id].name),
      h('div', { class: 'score', style: { color: GAMES[id].color } }, res.pct + '%'),
      h('div', { class: 'summary' }, res.summary),
      res.extra ? h('div', { class: 'muted' }, res.extra) : null,
      h('div', { class: 'pill' + (after > before ? ' up' : '') }, levelLine)),
    items.length || res.reviewNote ? h('section', { class: 'card' },
      h('div', { class: 'label' }, 'Review'),
      res.reviewNote ? h('div', { class: 'muted small' }, res.reviewNote) : null,
      items.map((r) => h('div', { class: 'rev ' + (r.ok ? 'ok' : 'bad') },
        h('span', { class: 'mark' }, r.ok ? '✓' : '✗'),
        h('div', {}, h('b', {}, r.title), h('div', { class: 'muted small' }, r.detail))))) : null,
    btn);
}

function finished() {
  const d = today(), data = store.data, day = data.days[d], s = streak(data, d);
  show(h('section', { class: 'card result done-card' },
    h('div', { class: 'confetti' }, '🎉'),
    h('h1', {}, 'Workout complete!'),
    h('div', { class: 'streak on huge' }, '🔥 ', h('b', {}, s), s === 1 ? ' day streak' : ' days in a row'),
    h('div', { class: 'wlist' }, day.plan.map((id) => h('div', { class: 'wtile done' }, icon(id),
      h('div', { class: 'wtext' }, h('div', { class: 'wname' }, GAMES[id].name)), h('div', { class: 'wstate' }, `${day.done[id]}%`))))),
    h('button', { class: 'btn primary big wide dock', id: 'home', onclick: home }, 'Back home'));
}

// A new day while the app sits open on Home: refresh the plan.
document.addEventListener('visibilitychange', () => { if (!document.hidden && onHome) home(); });

home();
